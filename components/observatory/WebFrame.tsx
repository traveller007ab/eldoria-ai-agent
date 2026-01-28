import React, { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from 'react';
import { Loader2, AlertCircle, ExternalLink, RefreshCw } from 'lucide-react';
import { getBrowserProxyUrl } from '../../config';

interface EldoriaMessage {
  type: 'ELDORIA_PAGE_METADATA' | 'ELDORIA_SCROLL' | 'ELDORIA_SELECTION' | 'ELDORIA_RESPONSE';
  data: any;
}

export interface PageMetadata {
  title: string;
  description?: string;
  keywords?: string;
  author?: string;
  canonical?: string;
  ogImage?: string;
}

interface WebFrameProps {
  url: string;
  isActive?: boolean;
  onLoadStart?: () => void;
  onLoadStop?: () => void;
  onTitleChange?: (title: string) => void;
  onMetadataChange?: (metadata: PageMetadata) => void;
  onScrollChange?: (percent: number) => void;
  onSelectionChange?: (text: string) => void;
  onError?: (error: Error) => void;
  isElectron?: boolean;
}

export interface WebFrameHandle {
  reload: () => void;
  goBack: () => void;
  goForward: () => void;
  extractText: () => Promise<string>;
  getSelection: () => Promise<string>;
  getScrollPercent: () => Promise<number>;
}

function getUserId(): string {
  let userId = localStorage.getItem('eldoria_browser_user_id');
  if (!userId) {
    userId = `user_${Math.random().toString(36).substring(2, 15)}`;
    localStorage.setItem('eldoria_browser_user_id', userId);
  }
  return userId;
}

export const WebFrame = forwardRef<WebFrameHandle, WebFrameProps>(({
  url,
  isActive = true,
  onLoadStart,
  onLoadStop,
  onTitleChange,
  onMetadataChange,
  onScrollChange,
  onSelectionChange,
  onError,
  isElectron = false
}, ref) => {
  const webviewRef = useRef<any>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [proxyUrl, setProxyUrl] = useState<string>('');
  const [retryCount, setRetryCount] = useState(0);

  const normalizedUrl = useCallback(() => {
    if (!url || url.trim() === '') return '';
    let u = url.trim();
    if (!u.startsWith('http')) u = 'https://' + u;
    return u;
  }, [url]);

  const computeProxyUrl = useCallback((inputUrl: string): string => {
    if (!inputUrl) return '';
    return getBrowserProxyUrl(inputUrl, getUserId());
  }, []);

  useEffect(() => {
    const norm = normalizedUrl();
    if (norm) {
      const proxy = computeProxyUrl(norm);
      console.log('[WebFrame] URL:', norm);
      console.log('[WebFrame] Proxy URL:', proxy);
      setProxyUrl(proxy);
      setError(null);
      setRetryCount(0);
    } else {
      console.log('[WebFrame] Empty URL, not setting proxy');
      setProxyUrl('');
    }
  }, [normalizedUrl, computeProxyUrl]);

  const isLoadingRef = useRef(false);

  useEffect(() => {
    isLoadingRef.current = isLoading;
  }, [isLoading]);

  useEffect(() => {
    if (!proxyUrl || isElectron) return;

    setIsLoading(true);
    setError(null);
    onLoadStart?.();

    // Timeout after 30 seconds
    const timeout = setTimeout(() => {
      if (isLoadingRef.current) {
        console.log('[WebFrame] Load timeout - forcing stop');
        setIsLoading(false);
        setError('Page load timed out after 30 seconds. The target site may be blocking recursive framing or the proxy might be overloaded.');
        onLoadStop?.();
      }
    }, 30000);

    return () => clearTimeout(timeout);
  }, [proxyUrl, isElectron, onLoadStart, onLoadStop]);

  useEffect(() => {
    const handleMessage = (event: MessageEvent<EldoriaMessage>) => {
      if (event.origin !== window.location.origin) return;
      const { type, data } = event.data;

      switch (type) {
        case 'ELDORIA_PAGE_METADATA':
          onTitleChange?.(data.title);
          onMetadataChange?.(data);
          break;
        case 'ELDORIA_SCROLL':
          onScrollChange?.(data.scrollPercent);
          break;
        case 'ELDORIA_SELECTION':
          onSelectionChange?.(data.selection);
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onTitleChange, onMetadataChange, onScrollChange, onSelectionChange]);

  const handleLoad = () => {
    console.log('[WebFrame] onLoad fired');
    setIsLoading(false);
    setError(null);
    onLoadStop?.();
  };

  const handleIframeError = (e: React.SyntheticEvent<HTMLIFrameElement>) => {
    console.log('[WebFrame] iframe error:', e);
    setIsLoading(false);
    setError('Failed to load page - check console for details');
    onLoadStop?.();
    onError?.(new Error('Load failed'));
  };

  useImperativeHandle(ref, () => ({
    reload: () => {
      if (isElectron && webviewRef.current) {
        webviewRef.current.reload();
      } else if (iframeRef.current) {
        const cacheBuster = Date.now();
        iframeRef.current.src = `${proxyUrl}&_cb=${cacheBuster}`;
      }
    },
    goBack: () => {
      if (isElectron && webviewRef.current && webviewRef.current.canGoBack()) {
        webviewRef.current.goBack();
      } else {
        try {
          iframeRef.current?.contentWindow?.history.back();
        } catch (e) {
          console.warn('Cannot access iframe history');
        }
      }
    },
    goForward: () => {
      if (isElectron && webviewRef.current && webviewRef.current.canGoForward()) {
        webviewRef.current.goForward();
      } else {
        try {
          iframeRef.current?.contentWindow?.history.forward();
        } catch (e) {
          console.warn('Cannot access iframe history');
        }
      }
    },
    extractText: async (): Promise<string> => {
      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'ELDORIA_RESPONSE' && event.data.data.text) {
            window.removeEventListener('message', handler);
            resolve(event.data.data.text);
          }
        };
        window.addEventListener('message', handler);
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ELDORIA_COMMAND',
          command: 'EXTRACT_TEXT'
        }, '*');
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve('');
        }, 2000);
      });
    },
    getSelection: async (): Promise<string> => {
      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'ELDORIA_RESPONSE' && event.data.data.selection !== undefined) {
            window.removeEventListener('message', handler);
            resolve(event.data.data.selection);
          }
        };
        window.addEventListener('message', handler);
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ELDORIA_COMMAND',
          command: 'GET_SELECTION'
        }, '*');
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve('');
        }, 2000);
      });
    },
    getScrollPercent: async (): Promise<number> => {
      return new Promise((resolve) => {
        const handler = (event: MessageEvent) => {
          if (event.data.type === 'ELDORIA_RESPONSE' && event.data.data.scrollPercent !== undefined) {
            window.removeEventListener('message', handler);
            resolve(event.data.data.scrollPercent);
          }
        };
        window.addEventListener('message', handler);
        iframeRef.current?.contentWindow?.postMessage({
          type: 'ELDORIA_COMMAND',
          command: 'SCROLL_PERCENT'
        }, '*');
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve(0);
        }, 2000);
      });
    },
  }));

  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    setError(null);
    const norm = normalizedUrl();
    if (norm) {
      setProxyUrl(`${computeProxyUrl(norm)}&retry=${retryCount + 1}`);
    }
  };

  if (!url || url.trim() === '') {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-purple-900/20 to-blue-900/20">
        <div className="text-center text-gray-400">
          <p className="text-lg">Enter a URL to browse</p>
          <p className="text-sm mt-2">Try: wikipedia.org, github.com, arxiv.org</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gradient-to-br from-slate-900 to-slate-800">
        <div className="text-center max-w-md p-8 bg-slate-800/50 rounded-lg backdrop-blur border border-slate-700">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">Browser Proxy Unavailable</h3>
          <p className="text-gray-300 mb-4">
            The browser proxy is not responding. This may be because the Netlify Edge Function hasn't been deployed yet.
          </p>
          <p className="text-sm text-gray-400 mb-4">
            URL: <span className="text-cyan-400">{url}</span>
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <button
              onClick={handleRetry}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-lg transition"
            >
              <RefreshCw className="w-4 h-4" />
              Retry
            </button>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg transition"
            >
              <ExternalLink className="w-4 h-4" />
              Open Directly
            </a>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            For the browser to work, either deploy to Netlify or run the Python bridge locally.
          </p>
        </div>
      </div>
    );
  }

  if (isElectron) {
    return (
      <div className="w-full h-full relative">
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur z-10">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin" />
          </div>
        )}
        <webview
          ref={webviewRef}
          src={normalizedUrl()}
          className="w-full h-full"
          style={{ display: isActive ? 'flex' : 'none' }}
          allowpopups={true}
          useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36"
          webpreferences="contextIsolation=yes, sandbox=yes"
        />
      </div>
    );
  }

  return (
    <div className="relative w-full h-full bg-gray-900">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900/80 backdrop-blur z-10">
          <div className="text-center">
            <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto mb-4" />
            <p className="text-white">Loading page...</p>
            <p className="text-gray-400 text-sm mt-2">{url}</p>
            <p className="text-gray-500 text-xs mt-4 font-mono break-all max-w-md">Proxy: {proxyUrl?.substring(0, 80)}...</p>
          </div>
        </div>
      )}

      {proxyUrl && (proxyUrl.startsWith('/api/') || proxyUrl.startsWith('http')) ? (
        <iframe
          ref={iframeRef}
          src={proxyUrl}
          className="w-full h-full border-0"
          sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox allow-downloads"
          allow="accelerometer; autoplay; clipboard-read; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          loading="eager"
          onLoad={handleLoad}
          onError={handleIframeError}
          style={{
            opacity: isLoading ? 0 : 1,
            transition: 'opacity 0.3s ease',
          }}
        />
      ) : (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
          <div className="text-center max-w-md p-8">
            <AlertCircle className="w-16 h-16 text-yellow-400 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-white mb-2">Browser Not Ready</h3>
            <p className="text-gray-400 mb-4">
              Proxy URL: {proxyUrl || 'not set'}
            </p>
            <p className="text-sm text-gray-500">
              URL to load: {url}
            </p>
          </div>
        </div>
      )}

      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="absolute bottom-4 right-4 flex items-center gap-2 px-3 py-2 bg-gray-800/90 hover:bg-gray-700/90 rounded-lg text-white text-sm opacity-0 hover:opacity-100 transition-opacity backdrop-blur"
        title="Open in new tab"
      >
        <ExternalLink className="w-4 h-4" />
        Open Externally
      </a>
    </div>
  );
});

WebFrame.displayName = 'WebFrame';

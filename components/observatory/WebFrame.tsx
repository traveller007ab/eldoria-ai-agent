import React, { useRef, useEffect, forwardRef, useImperativeHandle, useMemo, useCallback, useState } from 'react';

interface WebFrameProps {
    url: string;
    isActive: boolean;
    onLoadingStateChange?: (isLoading: boolean) => void;
    onUpdatePageInfo?: (info: { title?: string; favicon?: string }) => void;
    isElectron?: boolean;
    // Legacy support (to be removed if refactored everywhere)
    onLoadStart?: () => void;
    onLoadStop?: () => void;
    onTitleChange?: (title: string) => void;
}

export interface WebFrameHandle {
    reload: () => void;
    goBack: () => void;
    goForward: () => void;
}

import { getBridgeUrl } from '../../services/bridgeClient';
import { ProgressBar } from './ProgressBar';
import { Globe } from 'lucide-react';

export const WebFrame = forwardRef<WebFrameHandle, WebFrameProps>(({
    url,
    isActive,
    onLoadStart,
    onLoadStop,
    onTitleChange,
    onLoadingStateChange,
    onUpdatePageInfo,
    isElectron = false
}, ref) => {
    const webviewRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [proxyUrl, setProxyUrl] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const bridgeUrlRef = useRef<string | null>(null);
    const isPausedRef = useRef(false);

    // Memoize normalized URL computation
    const normalizedUrl = useMemo(() => {
        let u = url.trim();
        if (!u.startsWith('http')) u = 'https://' + u;
        return u;
    }, [url]);

    // Pre-connect to bridge server on mount
    useEffect(() => {
        const preconnect = async () => {
            try {
                const baseUrl = await getBridgeUrl();
                bridgeUrlRef.current = baseUrl;
                // DNS + TCP + TLS preconnect
                const link = document.createElement('link');
                link.rel = 'preconnect';
                link.href = baseUrl;
                document.head.appendChild(link);
                // DNS prefetch as fallback
                const dnsPrefetch = document.createElement('link');
                dnsPrefetch.rel = 'dns-prefetch';
                dnsPrefetch.href = baseUrl;
                document.head.appendChild(dnsPrefetch);
                console.log('[WebFrame] Pre-connected to bridge:', baseUrl);
            } catch (err) {
                console.warn('[WebFrame] Preconnect failed:', err);
            }
        };
        preconnect();
    }, []);

    // Memoize proxy URL computation
    const computedProxyUrl = useMemo(() => {
        if (isElectron || !bridgeUrlRef.current) return null;
        const encodedUrl = encodeURIComponent(normalizedUrl);
        return `${bridgeUrlRef.current}/browser/proxy?url=${encodedUrl}`;
    }, [normalizedUrl, isElectron]);

    // Update proxy URL only when it changes
    useEffect(() => {
        if (computedProxyUrl !== proxyUrl) {
            setProxyUrl(computedProxyUrl);
        }
    }, [computedProxyUrl, proxyUrl]);

    // Better reload implementation
    const performReload = useCallback(() => {
        if (isElectron && webviewRef.current) {
            webviewRef.current.reload();
        } else if (iframeRef.current) {
            const iframe = iframeRef.current;
            // Use POST with cache-buster for faster reload than src swap
            const cacheBuster = Date.now();
            const reloadUrl = proxyUrl ? `${proxyUrl}&_cb=${cacheBuster}` : null;
            if (reloadUrl) {
                iframe.src = reloadUrl;
            }
        }
    }, [isElectron, proxyUrl]);

    // Better back/forward for iframe
    const performGoBack = useCallback(() => {
        if (isElectron && webviewRef.current && webviewRef.current.canGoBack()) {
            webviewRef.current.goBack();
        }
        // Note: iframe history navigation limited in cross-origin context
    }, [isElectron]);

    const performGoForward = useCallback(() => {
        if (isElectron && webviewRef.current && webviewRef.current.canGoForward()) {
            webviewRef.current.goForward();
        }
    }, [isElectron]);

    useImperativeHandle(ref, () => ({
        reload: performReload,
        goBack: performGoBack,
        goForward: performGoForward
    }), [performReload, performGoBack, performGoForward]);

    // Visibility-based pausing for iframe
    useEffect(() => {
        if (!isElectron && iframeRef.current) {
            const handleVisibilityChange = () => {
                if (document.hidden && !isPausedRef.current) {
                    iframeRef.current.contentWindow?.postMessage('ELDORIA_PAUSE', '*');
                    isPausedRef.current = true;
                } else if (!document.hidden && isPausedRef.current) {
                    iframeRef.current.contentWindow?.postMessage('ELDORIA_RESUME', '*');
                    isPausedRef.current = false;
                }
            };
            document.addEventListener('visibilitychange', handleVisibilityChange);
            return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
        }
    }, [isElectron]);

    // Electron webview event listeners
    useEffect(() => {
        const wv = webviewRef.current;
        if (isElectron && wv) {
            const handleStart = () => {
                setIsLoading(true);
                onLoadStart?.();
                onLoadingStateChange?.(true);
            };
            const handleStop = () => {
                setIsLoading(false);
                onLoadStop?.();
                onLoadingStateChange?.(false);
            };
            const handleTitle = (e: any) => {
                onTitleChange?.(e.title);
                onUpdatePageInfo?.({ title: e.title });
            };

            wv.addEventListener('did-start-loading', handleStart);
            wv.addEventListener('did-stop-loading', handleStop);
            wv.addEventListener('page-title-updated', handleTitle);
            // Try to get favicon (Electron <webview> often needs more work for this, ignoring for now or using page-favicon-updated)
            wv.addEventListener('page-favicon-updated', (e: any) => {
                if (e.favicons && e.favicons.length > 0) {
                    onUpdatePageInfo?.({ favicon: e.favicons[0] });
                }
            });

            return () => {
                wv.removeEventListener('did-start-loading', handleStart);
                wv.removeEventListener('did-stop-loading', handleStop);
                wv.removeEventListener('page-title-updated', handleTitle);
            };
        }
    }, [isElectron, onLoadStart, onLoadStop, onTitleChange, onLoadingStateChange, onUpdatePageInfo]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        onLoadStop?.();
        onLoadingStateChange?.(false);
    };

    // Only trigger load start when proxy URL changes in PWA mode
    useEffect(() => {
        if (!isElectron && proxyUrl) {
            setIsLoading(true);
            onLoadStart?.();
            onLoadingStateChange?.(true);
        }
    }, [proxyUrl, isElectron, onLoadStart, onLoadingStateChange]);

    if (isElectron) {
        return (
            <div className="w-full h-full relative">
                <ProgressBar isLoading={isLoading} />
                <webview
                    ref={webviewRef}
                    src={normalizedUrl}
                    className="w-full h-full"
                    style={{
                        display: isActive ? 'flex' : 'none'
                    }}
                    allowpopups={true}
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    webpreferences="contextIsolation=yes, sandbox=yes"
                />
            </div>
        );
    } else {
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-900 border-none relative ${isActive ? 'flex' : 'hidden'}`}>
                <ProgressBar isLoading={isLoading} color="bg-emerald-400" />

                {isActive && proxyUrl ? (
                    <div className="w-full h-full relative group">
                        <iframe
                            ref={iframeRef}
                            src={proxyUrl}
                            className="w-full h-full border-none bg-white font-sans"
                            title="Web View"
                            sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                            onLoad={handleIframeLoad}
                            loading="eager"
                        />
                        <div className="absolute bottom-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <a
                                href={url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="px-3 py-1.5 bg-slate-800/80 backdrop-blur-md text-cyan-400 text-xs rounded-lg border border-cyan-500/30 hover:bg-cyan-500 hover:text-white transition-all shadow-xl flex items-center gap-2"
                            >
                                <Globe className="w-3 h-3" />
                                Open in External Tab
                            </a>
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4 text-cyan-500/50">
                        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        <span className="text-xs uppercase tracking-widest animate-pulse">
                            Establishing Neural Link to {new URL(normalizedUrl).hostname}...
                        </span>
                        <p className="text-[10px] text-slate-500 max-w-[200px] text-center mt-2 font-mono">
                            Using secure bridge proxy to bypass site restrictions.
                        </p>
                    </div>
                )}
            </div>
        );
    }
});

WebFrame.displayName = 'WebFrame';

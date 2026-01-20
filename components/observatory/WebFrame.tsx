import React, { useRef, useEffect, forwardRef, useImperativeHandle } from 'react';

interface WebFrameProps {
    url: string;
    isActive: boolean;
    onLoadStart?: () => void;
    onLoadStop?: () => void;
    onTitleChange?: (title: string) => void;
    isElectron?: boolean;
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
    isElectron = false
}, ref) => {
    const webviewRef = useRef<any>(null);
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [proxyUrl, setProxyUrl] = React.useState<string | null>(null);
    const [isLoading, setIsLoading] = React.useState(false);


    useImperativeHandle(ref, () => ({
        reload: () => {
            if (isElectron && webviewRef.current) {
                webviewRef.current.reload();
            } else if (iframeRef.current) {
                const currentUrl = iframeRef.current.src;
                iframeRef.current.src = '';
                setTimeout(() => {
                    if (iframeRef.current) iframeRef.current.src = currentUrl;
                }, 10);
            }
        },
        goBack: () => {
            if (isElectron && webviewRef.current && webviewRef.current.canGoBack()) {
                webviewRef.current.goBack();
            }
        },
        goForward: () => {
            if (isElectron && webviewRef.current && webviewRef.current.canGoForward()) {
                webviewRef.current.goForward();
            }
        }
    }));

    useEffect(() => {
        const wv = webviewRef.current;
        if (isElectron && wv) {
            const handleStart = () => {
                setIsLoading(true);
                onLoadStart?.();
            };
            const handleStop = () => {
                setIsLoading(false);
                onLoadStop?.();
            };
            const handleTitle = (e: any) => onTitleChange?.(e.title);

            wv.addEventListener('did-start-loading', handleStart);
            wv.addEventListener('did-stop-loading', handleStop);
            wv.addEventListener('page-title-updated', handleTitle);

            return () => {
                wv.removeEventListener('did-start-loading', handleStart);
                wv.removeEventListener('did-stop-loading', handleStop);
                wv.removeEventListener('page-title-updated', handleTitle);
            };
        }
    }, [isElectron, onLoadStart, onLoadStop, onTitleChange]);

    const normalizedUrl = React.useMemo(() => {
        let u = url.trim();
        if (!u.startsWith('http')) u = 'https://' + u;
        return u;
    }, [url]);

    // Resolve Bridge URL for Proxy
    useEffect(() => {
        if (!isElectron) {
            getBridgeUrl().then(baseUrl => {
                const encodedUrl = encodeURIComponent(normalizedUrl);
                const fullProxyUrl = `${baseUrl}/browser/proxy?url=${encodedUrl}`;
                console.log(`[WebFrame] PWA Mode: Proxying via ${fullProxyUrl}`);
                setProxyUrl(fullProxyUrl);
            }).catch(err => {
                console.error('[WebFrame] Bridge Resolution Error:', err);
            });
        } else {
            console.log(`[WebFrame] Electron Mode: Native Webview for ${normalizedUrl}`);
        }
    }, [normalizedUrl, isElectron]);

    // For PWA/Iframe mode, we trigger loading when the proxy URL changes
    useEffect(() => {
        if (!isElectron && proxyUrl) {
            setIsLoading(true);
            onLoadStart?.();
        }
    }, [proxyUrl, isElectron]);

    const handleIframeLoad = () => {
        setIsLoading(false);
        onLoadStop?.();
    };

    if (isElectron) {
        // Electron Webview (Native Chromium)
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
                    allowpopups="true"
                    useragent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
                    webpreferences="contextIsolation=yes, sandbox=yes"
                />
            </div>
        );
    } else {
        // PWA/Web Fallback (Proxy Iframe)
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
                        />
                        {/* Emergency Fallback Button (visible on hover or if stuck) */}
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

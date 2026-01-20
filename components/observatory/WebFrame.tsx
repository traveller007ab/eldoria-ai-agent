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

    // Resolve Bridge URL for Proxy
    useEffect(() => {
        if (!isElectron) {
            getBridgeUrl().then(baseUrl => {
                const encodedUrl = encodeURIComponent(url);
                setProxyUrl(`${baseUrl}/browser/proxy?url=${encodedUrl}`);
            });
        }
    }, [url, isElectron]);

    useImperativeHandle(ref, () => ({
        reload: () => {
            if (isElectron && webviewRef.current) {
                webviewRef.current.reload();
            } else if (iframeRef.current) {
                // To reload the proxy, we just re-trigger the URL update
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
            // Iframe history is harder to control from parent due to CORS 
            // even with proxy, we'd need a more complex state.
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
            const handleStart = () => onLoadStart?.();
            const handleStop = () => onLoadStop?.();
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

    if (isElectron) {
        // Electron Webview (Native Chromium)
        return (
            <webview
                ref={webviewRef}
                src={url}
                className="w-full h-full"
                style={{
                    display: isActive ? 'flex' : 'none'
                }}
                allowpopups="true"
                webpreferences="contextIsolation=yes, sandbox=yes"
            />
        );
    } else {
        // PWA/Web Fallback (Proxy Iframe)
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-slate-900 border-none ${isActive ? 'flex' : 'hidden'}`}>
                {isActive && proxyUrl ? (
                    <iframe
                        ref={iframeRef}
                        src={proxyUrl}
                        className="w-full h-full border-none bg-white"
                        title="Web View"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                        onLoad={() => onLoadStop?.()}
                    />
                ) : (
                    <div className="flex flex-col items-center gap-4 text-cyan-500/50">
                        <div className="w-8 h-8 border-2 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin" />
                        <span className="text-xs uppercase tracking-widest">Warping to {new URL(url).hostname}...</span>
                    </div>
                )}
            </div>
        );
    }
});

WebFrame.displayName = 'WebFrame';

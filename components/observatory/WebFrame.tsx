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

    useImperativeHandle(ref, () => ({
        reload: () => {
            if (isElectron && webviewRef.current) {
                webviewRef.current.reload();
            } else if (iframeRef.current) {
                iframeRef.current.src = iframeRef.current.src;
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
            const handleStart = () => onLoadStart?.();
            const handleStop = () => onLoadStop?.();
            const handleTitle = (e: any) => onTitleChange?.(e.title);

            wv.addEventListener('did-start-loading', handleStart);
            wv.addEventListener('did-stop-loading', handleStop);
            wv.addEventListener('page-title-updated', handleTitle);

            // Allow interactions
            // wv.contentWindow is not directly accessible usually, but webview methods are.

            return () => {
                wv.removeEventListener('did-start-loading', handleStart);
                wv.removeEventListener('did-stop-loading', handleStop);
                wv.removeEventListener('page-title-updated', handleTitle);
            };
        }
    }, [isElectron, onLoadStart, onLoadStop, onTitleChange]);

    if (isElectron) {
        // Electron Webview
        // Note: webview tag needs to be typed as any or ignored in strict TS if types aren't available
        return (
            <webview
                ref={webviewRef}
                src={url}
                className={`w-full h-full ${isActive ? 'flex' : 'hidden'}`}
                allowpopups="true"
                webpreferences="contextIsolation=yes, sandbox=yes"
            />
        );
    } else {
        // Web Iframe Handling
        // We use a proxy service or direct if allowed. 
        // For this demo, we assume direct but many sites will block X-Frame-Options.
        // A robust solution would use a proxy like 'cors-anywhere' or a dedicated backend service.
        return (
            <div className={`w-full h-full flex flex-col items-center justify-center bg-stone-50 text-stone-400 ${isActive ? 'flex' : 'hidden'}`}>
                {isActive ? (
                    <iframe
                        ref={iframeRef}
                        src={url}
                        className="w-full h-full border-none"
                        title="Web View"
                        sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
                    />
                ) : null}
            </div>
        );
    }
});

WebFrame.displayName = 'WebFrame';

import React, { useState, useRef, useEffect } from 'react';
import { useNexusStore } from '../../../stores/useNexusStore';
import { BrowserOmnibox } from '../../observatory/BrowserOmnibox';
import { WebFrame, WebFrameHandle } from '../../observatory/WebFrame';
import { contextService } from '../../../services/ContextService';
import { BookMarked, Share2, Globe, Sparkles } from 'lucide-react';

interface ObservatoryProps {
    nodeId: string;
}

export const Observatory: React.FC<ObservatoryProps> = ({ nodeId }) => {
    const { isDarkMode } = useNexusStore();
    const frameRef = useRef<WebFrameHandle>(null);
    const [url, setUrl] = useState('https://www.google.com');
    const [title, setTitle] = useState('New Tab');
    const [isLoading, setIsLoading] = useState(false);

    // Determine environment
    const isElectron = !!(window as any).eldoriaDesktop?.isElectron;

    const handleNavigate = (newUrl: string) => {
        setUrl(newUrl);
    };

    const handleTitleChange = (newTitle: string) => {
        setTitle(newTitle);
        // Push to AI Context
        contextService.updateBrowserState({ url, title: newTitle });
    };

    useEffect(() => {
        // Initial context push
        contextService.updateBrowserState({ url, title });
        return () => {
            // Clear context on unmount
            contextService.updateBrowserState(null);
        };
    }, []);

    // Theme logic
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]'
        : 'bg-gradient-to-br from-slate-50 to-stone-100';

    return (
        <div className={`h-full w-full flex flex-col ${bgClass} transition-colors duration-500`}>
            {/* Header: Omnibox & Controls */}
            <div className="shrink-0 p-2 z-10">
                <BrowserOmnibox
                    url={url}
                    onNavigate={handleNavigate}
                    onBack={() => frameRef.current?.goBack()}
                    onForward={() => frameRef.current?.goForward()}
                    onReload={() => frameRef.current?.reload()}
                    isLoading={isLoading}
                    isDark={isDarkMode}
                />
            </div>

            {/* Main Content: WebFrame */}
            <div className="flex-1 relative overflow-hidden bg-white/5 mx-2 mb-2 rounded-xl border border-white/10 shadow-inner">
                <WebFrame
                    ref={frameRef}
                    url={url}
                    isActive={true}
                    onLoadStart={() => setIsLoading(true)}
                    onLoadStop={() => setIsLoading(false)}
                    onTitleChange={handleTitleChange}
                    isElectron={isElectron}
                />

                {/* Loading Overlay */}
                {isLoading && (
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent animate-shimmer opacity-50" />
                )}
            </div>

            {/* Footer / Status Bar */}
            <div className={`shrink-0 px-4 py-1 flex items-center justify-between text-[10px] uppercase tracking-wider
                ${isDarkMode ? 'text-zinc-600 bg-[#0a0a0c]' : 'text-stone-400 bg-stone-100'}`}>
                <div className="flex items-center gap-2">
                    <Globe className="w-3 h-3" />
                    <span>{isElectron ? 'Quantum Engine (Electron)' : 'Web Proxy (Iframe)'}</span>
                </div>
                <div className="flex items-center gap-2">
                    <span>{title}</span>
                </div>
            </div>
        </div>
    );
};

import React, { useState, useRef, useEffect } from 'react';
import { useWorkspace } from '../context/WorkspaceContext';
import { ChatThread } from './ChatThread';
import { MessageSquare, Globe, Sparkles } from 'lucide-react';
import { BrowserOmnibox } from './observatory/BrowserOmnibox';
import { WebFrame, WebFrameHandle } from './observatory/WebFrame';
import { contextService } from '../services/ContextService';

export const ChatPanel: React.FC = () => {
    const {
        activeCanvas,
        isChatLoading,
        sendChatMessage
    } = useWorkspace();

    // Tab State
    const [activeTab, setActiveTab] = useState<'chat' | 'browser'>('chat');

    // Browser State
    const frameRef = useRef<WebFrameHandle>(null);
    const [browserUrl, setBrowserUrl] = useState('https://www.google.com');
    const [browserTitle, setBrowserTitle] = useState('Minibrowser');
    const [isBrowserLoading, setIsBrowserLoading] = useState(false);

    // Detect Electron
    const isElectron = !!(window as any).eldoriaDesktop?.isElectron;

    // Sync browser context when active
    useEffect(() => {
        if (activeTab === 'browser') {
            contextService.updateBrowserState({ url: browserUrl, title: browserTitle });
        } else {
            // Optional: Clear or keep context? 
            // Keeping it might be useful if user flips back and forth.
            // But for strict context, maybe clear if not visible?
            // Let's keep it for now as "background" tab.
        }
    }, [activeTab, browserUrl, browserTitle]);

    const handleBrowserNavigate = (url: string) => {
        setBrowserUrl(url);
    };

    if (!activeCanvas) {
        return (
            <div className="flex items-center justify-center h-full text-cyan-400/70">
                Select or create a canvas to start a conversation.
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-slate-900/50">
            {/* Tab Bar */}
            <div className="flex items-center gap-1 p-2 border-b border-cyan-500/20 bg-slate-900/80">
                <button
                    onClick={() => setActiveTab('chat')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all
                        ${activeTab === 'chat'
                            ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_10px_rgba(34,211,238,0.2)]'
                            : 'text-cyan-500/50 hover:bg-cyan-500/5 hover:text-cyan-400'
                        }`}
                >
                    <MessageSquare className="w-3.5 h-3.5" />
                    CHAT
                </button>
                <div className="w-px h-4 bg-cyan-500/20"></div>
                <button
                    onClick={() => setActiveTab('browser')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-xs font-medium transition-all
                        ${activeTab === 'browser'
                            ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_10px_rgba(16,185,129,0.2)]'
                            : 'text-emerald-500/50 hover:bg-emerald-500/5 hover:text-emerald-400'
                        }`}
                >
                    <Globe className="w-3.5 h-3.5" />
                    RESEARCH
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-hidden relative">

                {/* Chat Tab */}
                <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'chat' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    <ChatThread
                        messages={activeCanvas.chat_history || []}
                        isLoading={isChatLoading}
                        onSendMessage={sendChatMessage}
                    />
                </div>

                {/* Browser Tab */}
                <div className={`absolute inset-0 flex flex-col bg-slate-950 transition-opacity duration-300 ${activeTab === 'browser' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
                    {/* Minibrowser Header */}
                    <div className="bg-slate-900 p-2">
                        <BrowserOmnibox
                            url={browserUrl}
                            onNavigate={handleBrowserNavigate}
                            onBack={() => frameRef.current?.goBack()}
                            onForward={() => frameRef.current?.goForward()}
                            onReload={() => frameRef.current?.reload()}
                            isLoading={isBrowserLoading}
                            isDark={true}
                        />
                    </div>

                    {/* Frame */}
                    <div className="flex-1 relative">
                        <WebFrame
                            ref={frameRef}
                            url={browserUrl}
                            isActive={activeTab === 'browser'}
                            isElectron={isElectron}
                            onLoadStart={() => setIsBrowserLoading(true)}
                            onLoadStop={() => setIsBrowserLoading(false)}
                            onTitleChange={setBrowserTitle}
                        />
                    </div>
                </div>

            </div>
        </div>
    );
};
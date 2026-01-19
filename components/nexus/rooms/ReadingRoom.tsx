/**
 * ReadingRoom - Focus Mode for Research References
 * 
 * A distraction-free reading environment with:
 * - Full-screen PDF/document viewer
 * - AI chat sidebar with real Gemini integration
 * - Note-taking integration
 */

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, MessageSquare, StickyNote, X, Send, Sparkles,
    ChevronRight, Link, Highlighter, BookmarkPlus, Loader2, RefreshCw,
    Plus, Upload, Globe, Share2, Info, Eye, EyeOff
} from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';
import { useNexusAI } from '../hooks/useNexusAI';

interface ReadingRoomProps {
    nodeId: string;
}

export const ReadingRoom: React.FC<ReadingRoomProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [chatInput, setChatInput] = useState('');
    const [sourceInput, setSourceInput] = useState('');
    const [isAttaching, setIsAttaching] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const { updateNode, addNode, isZenMode, toggleZenMode } = useNexusStore();

    const data = node?.data as any;
    const isPDF = data?.source?.endsWith('.pdf') || data?.source?.startsWith('blob:');

    // Use the real AI hook
    const { messages, sendMessage, clearMessages, isLoading, error } = useNexusAI({
        documentTitle: data?.title,
        documentContent: data?.abstract,
        documentSource: data?.source
    });

    // Auto-scroll to bottom on new messages
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSendMessage = async () => {
        if (!chatInput.trim() || isLoading) return;
        const message = chatInput;
        setChatInput('');
        await sendMessage(message);
    };

    const handleAttachSource = () => {
        if (!sourceInput.trim()) return;
        updateNode(nodeId, { source: sourceInput });
        setSourceInput('');
        setIsAttaching(false);
    };

    const handleCreateNote = () => {
        const id = crypto.randomUUID();
        addNode({
            id,
            type: 'noteNode',
            position: { x: (node?.position.x || 0) + 250, y: node?.position.y || 0 },
            data: {
                type: 'note',
                title: `Note for ${data?.title || 'Research'}`,
                content: '# Research Note\n\nDirectly drafted from Reading Room...',
            }
        });
    };

    return (
        <div className="h-full w-full bg-slate-950 flex relative overflow-hidden">
            {/* Ambient Background Effects */}
            <div className="absolute inset-0 pointer-events-none opacity-40">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(34,211,238,0.1),transparent_70%)]" />
                <NeuralRain />
            </div>
            {/* Main Reading Area */}
            <div className="flex-1 flex flex-col">
                {/* Document Viewer */}
                <div className="flex-1 overflow-auto p-6">
                    {data?.source ? (
                        <motion.div
                            className="max-w-4xl mx-auto"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.2 }}
                        >
                            {isPDF ? (
                                <div className="bg-white rounded-lg shadow-2xl overflow-hidden">
                                    <iframe
                                        src={data.source}
                                        className="w-full h-[calc(100vh-200px)]"
                                        title={data.title}
                                    />
                                </div>
                            ) : (
                                <div className="bg-slate-800/50 backdrop-blur-md rounded-2xl border border-slate-700 p-8">
                                    <h1 className="text-2xl font-bold text-white mb-4">{data.title}</h1>
                                    {data.authors && (
                                        <p className="text-sm text-slate-400 mb-6">
                                            {data.authors.join(', ')}
                                        </p>
                                    )}
                                    {data.abstract && (
                                        <div className="prose prose-invert max-w-none">
                                            <h2 className="text-lg font-semibold text-cyan-400 mb-2">Abstract</h2>
                                            <p className="text-slate-300 leading-relaxed">{data.abstract}</p>
                                        </div>
                                    )}
                                    <a
                                        href={data.source}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="inline-flex items-center gap-2 mt-6 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm hover:bg-cyan-500/30 transition-colors"
                                    >
                                        <Link className="w-4 h-4" />
                                        Open Original Source
                                    </a>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <div className="max-w-4xl mx-auto h-full flex items-center justify-center">
                            <motion.div
                                className="relative group w-full max-w-lg"
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                            >
                                {/* Glow backdrop */}
                                <div className="absolute -inset-1 bg-gradient-to-r from-cyan-500/20 to-purple-500/20 rounded-[2rem] blur-2xl group-hover:opacity-100 transition duration-1000 group-hover:duration-200" />

                                <div className="relative bg-slate-900/40 backdrop-blur-2xl border border-white/10 rounded-[2rem] p-12 overflow-hidden">
                                    <div className="flex flex-col items-center text-center">
                                        <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-cyan-500/10 to-purple-500/10 flex items-center justify-center mb-8 border border-white/5 relative">
                                            <BookOpen className="w-10 h-10 text-cyan-400" />
                                            <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-slate-900" />
                                        </div>

                                        <h2 className="text-3xl font-black text-white mb-4 tracking-tight">
                                            Reference <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-purple-400 uppercase italic">Hub</span>
                                        </h2>

                                        <p className="text-slate-400 text-sm mb-10 max-w-xs leading-relaxed">
                                            Attach research papers or URLs to begin cognitive analysis and neural mapping.
                                        </p>

                                        {!isAttaching ? (
                                            <button
                                                onClick={() => setIsAttaching(true)}
                                                className="group/btn relative px-8 py-4 bg-white/5 hover:bg-cyan-500/10 border border-white/10 hover:border-cyan-500/50 rounded-2xl transition-all duration-300 overflow-hidden"
                                            >
                                                <div className="flex items-center gap-3 relative z-10">
                                                    <Plus className="w-5 h-5 text-cyan-400" />
                                                    <span className="text-xs font-black uppercase text-white tracking-[0.2em]">Attach Source Material</span>
                                                </div>
                                            </button>
                                        ) : (
                                            <motion.div
                                                className="w-full space-y-4"
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                animate={{ opacity: 1, scale: 1 }}
                                            >
                                                <div className="flex gap-2">
                                                    <div className="flex-1 relative">
                                                        <Globe className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                                        <input
                                                            type="text"
                                                            value={sourceInput}
                                                            onChange={(e) => setSourceInput(e.target.value)}
                                                            placeholder="Paste PDF URL or identifier..."
                                                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-12 pr-4 py-4 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all font-mono"
                                                            autoFocus
                                                            onKeyDown={(e) => e.key === 'Enter' && handleAttachSource()}
                                                        />
                                                    </div>
                                                    <button
                                                        onClick={handleAttachSource}
                                                        className="px-6 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl transition-all active:scale-95"
                                                    >
                                                        Sync
                                                    </button>
                                                </div>
                                                <button
                                                    onClick={() => setIsAttaching(false)}
                                                    className="text-[10px] font-black text-slate-600 uppercase tracking-widest hover:text-slate-400 transition-colors"
                                                >
                                                    Cancel
                                                </button>
                                            </motion.div>
                                        )}
                                    </div>

                                    {/* Stats HUD */}
                                    <div className="mt-12 flex justify-between border-t border-white/5 pt-8">
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white">0</div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Citations</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white">0</div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Neural Links</div>
                                        </div>
                                        <div className="text-center">
                                            <div className="text-xl font-black text-white text-emerald-400 flex items-center gap-1 justify-center">
                                                <Share2 className="w-3.5 h-3.5" />
                                                Cloud
                                            </div>
                                            <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest">Status</div>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    )}
                </div>

                {/* Reading Tools Bar */}
                <AnimatePresence>
                    {!isZenMode && (
                        <motion.div
                            className="h-14 bg-slate-900/80 backdrop-blur-md border-t border-white/5 px-6 flex items-center justify-between z-20"
                            initial={{ y: 56 }}
                            animate={{ y: 0 }}
                            exit={{ y: 60 }}
                            transition={{ delay: 0, duration: 0.3 }}
                        >
                            <div className="flex items-center gap-2">
                                <button className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                    <Highlighter className="w-3.5 h-3.5" />
                                    Highlight
                                </button>
                                <button
                                    onClick={handleCreateNote}
                                    className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-cyan-400 hover:bg-cyan-400/5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all"
                                >
                                    <StickyNote className="w-3.5 h-3.5" />
                                    Add Note
                                </button>
                                <button className="flex items-center gap-2 px-3 py-2 text-slate-400 hover:text-white hover:bg-white/5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all">
                                    <BookmarkPlus className="w-3.5 h-3.5" />
                                    Bookmark
                                </button>
                            </div>

                            <div className="flex items-center gap-4">
                                <button
                                    onClick={toggleZenMode}
                                    className="p-2 text-slate-500 hover:text-cyan-400 transition-colors"
                                    title="Toggle Zen Mode"
                                >
                                    <Eye className="w-4 h-4" />
                                </button>

                                <button
                                    onClick={() => setIsChatOpen(!isChatOpen)}
                                    className={`flex items-center gap-3 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${isChatOpen
                                        ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                        : 'bg-white/5 text-slate-400 hover:text-white border border-white/10'
                                        }`}
                                >
                                    <MessageSquare className="w-3.5 h-3.5" />
                                    AI Research Assistant
                                    <ChevronRight className={`w-3.5 h-3.5 transition-transform ${isChatOpen ? 'rotate-180' : ''}`} />
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div >

            {/* AI Chat Sidebar */}
            <AnimatePresence>
                {
                    isChatOpen && !isZenMode && (
                        <motion.div
                            className="w-96 bg-slate-900 border-l border-white/5 flex flex-col z-20"
                            initial={{ width: 0, opacity: 0 }}
                            animate={{ width: 384, opacity: 1 }}
                            exit={{ width: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                        >
                            {/* Chat Header */}
                            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4 shrink-0">
                                <div className="flex items-center gap-2">
                                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center">
                                        <Sparkles className="w-4 h-4 text-white" />
                                    </div>
                                    <div>
                                        <span className="text-sm font-bold text-white">Research Assistant</span>
                                        <p className="text-[10px] text-slate-500">Powered by Gemini</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-1">
                                    <button
                                        onClick={clearMessages}
                                        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                        title="Clear chat"
                                    >
                                        <RefreshCw className="w-4 h-4 text-slate-400" />
                                    </button>
                                    <button
                                        onClick={() => setIsChatOpen(false)}
                                        className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors"
                                    >
                                        <X className="w-4 h-4 text-slate-400" />
                                    </button>
                                </div>
                            </div>

                            {/* Chat Messages */}
                            <div className="flex-1 overflow-auto p-4 space-y-4">
                                {messages.map((msg, i) => (
                                    <motion.div
                                        key={`${msg.timestamp}-${i}`}
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                    >
                                        <div
                                            className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm whitespace-pre-wrap ${msg.role === 'user'
                                                ? 'bg-cyan-500 text-white rounded-br-sm'
                                                : 'bg-slate-800 text-slate-300 rounded-bl-sm'
                                                }`}
                                        >
                                            {msg.content || (
                                                <span className="flex items-center gap-2 text-slate-400">
                                                    <Loader2 className="w-3 h-3 animate-spin" />
                                                    Thinking...
                                                </span>
                                            )}
                                        </div>
                                    </motion.div>
                                ))}
                                {error && (
                                    <div className="text-center text-xs text-red-400 py-2">
                                        {error}
                                    </div>
                                )}
                                <div ref={messagesEndRef} />
                            </div>

                            {/* Chat Input */}
                            <div className="p-4 border-t border-slate-800 shrink-0">
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={chatInput}
                                        onChange={(e) => setChatInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
                                        placeholder="Ask about this paper..."
                                        disabled={isLoading}
                                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 disabled:opacity-50"
                                    />
                                    <button
                                        onClick={handleSendMessage}
                                        disabled={!chatInput.trim() || isLoading}
                                        className="p-3 bg-cyan-500 hover:bg-cyan-400 disabled:bg-slate-700 disabled:text-slate-500 rounded-xl transition-colors"
                                    >
                                        {isLoading ? (
                                            <Loader2 className="w-4 h-4 text-white animate-spin" />
                                        ) : (
                                            <Send className="w-4 h-4 text-white" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )
                }
            </AnimatePresence >
        </div >
    );
};

// Premium UI Components
const NeuralRain: React.FC = () => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
            {[...Array(20)].map((_, i) => (
                <motion.div
                    key={i}
                    className="absolute w-[1px] h-20 bg-gradient-to-b from-transparent via-cyan-500/20 to-transparent"
                    initial={{ top: -100, left: `${Math.random() * 100}%` }}
                    animate={{ top: '120%' }}
                    transition={{
                        duration: 5 + Math.random() * 10,
                        repeat: Infinity,
                        ease: "linear",
                        delay: Math.random() * 10
                    }}
                />
            ))}
        </div>
    );
};

export default ReadingRoom;

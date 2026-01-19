/**
 * WritingStudy - Focus Mode for Markdown Notes
 * 
 * A distraction-free writing environment with:
 * - Full-screen markdown editor
 * - AI integration for refining ideas
 * - Connection Context sidebar
 */

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    StickyNote, Save, Sparkles, X, ChevronRight, MessageSquare,
    Type, Hash, List, Image, Code, Link, Zap, Loader2, RefreshCw,
    FileText, CheckCircle2, Library, BookOpen, Share2, Eye, EyeOff,
    DownloadCloud
} from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';
import { useNexusAI } from '../hooks/useNexusAI';

interface WritingStudyProps {
    nodeId: string;
}

export const WritingStudy: React.FC<WritingStudyProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const updateNode = useNexusStore((state) => state.updateNode);
    const edges = useNexusStore((state) => state.edges);
    const nodes = useNexusStore((state) => state.nodes);
    const { isZenMode, toggleZenMode } = useNexusStore();

    const [content, setContent] = useState('');
    const [title, setTitle] = useState('');
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [showSuccess, setShowSuccess] = useState(false);

    const data = node?.data as any;

    useEffect(() => {
        if (data) {
            setContent(data.content || '');
            setTitle(data.title || 'Untitled Note');
        }
    }, [data]);

    // AI Integration
    const { messages, sendMessage, clearMessages, isLoading, isStreaming, error } = useNexusAI({
        documentTitle: title,
        documentContent: content
    });

    const handleSave = async () => {
        if (!node) return;
        setIsSaving(true);
        updateNode(node.id, {
            title,
            content
        });

        // Simulate a slight delay for premium feedback
        setTimeout(() => {
            setIsSaving(false);
            setLastSaved(new Date());
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 800);
    };

    const handleExportMD = () => {
        const dataStr = `# ${title}\n\n${content}`;
        const dataUri = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(dataStr);
        const fileName = `${title.toLowerCase().replace(/\s+/g, '-')}.md`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', fileName);
        linkElement.click();
    };

    if (!node) return null;

    // Get connected nodes for context sidebar
    const connectedNodeIds = edges
        .filter(e => e.source === nodeId || e.target === nodeId)
        .map(e => e.source === nodeId ? e.target : e.source);

    const connectedNodes = nodes.filter(n => connectedNodeIds.includes(n.id));

    return (
        <div className="h-full w-full bg-[#020617] flex relative overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-purple-500/5 blur-[120px] rounded-full" />
                <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-cyan-500/5 blur-[100px] rounded-full" />
            </div>

            {/* Left Sidebar: Context & Connections */}
            <AnimatePresence>
                {!isZenMode && (
                    <motion.div
                        className="w-72 bg-slate-900/50 backdrop-blur-xl border-r border-white/5 flex flex-col z-10"
                        initial={{ x: -288, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -288, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                    >
                        <div className="p-6 border-b border-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Library className="w-3.5 h-3.5 text-purple-400" />
                                Neural Context
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto p-4 space-y-3">
                            {connectedNodes.length > 0 ? (
                                connectedNodes.map(cn => (
                                    <motion.div
                                        key={cn.id}
                                        className="p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-purple-500/30 transition-all group cursor-default"
                                        whileHover={{ scale: 1.02 }}
                                    >
                                        <div className="flex items-center gap-3 mb-3">
                                            <div className={`p-2 rounded-lg bg-slate-950/50 border border-white/5 text-purple-400`}>
                                                {(cn.data as any).type === 'blueprint' ? <Zap className="w-3.5 h-3.5" /> :
                                                    (cn.data as any).type === 'reference' ? <BookOpen className="w-3.5 h-3.5" /> :
                                                        <FileText className="w-3.5 h-3.5" />}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-[9px] text-slate-500 uppercase font-black tracking-widest leading-none">
                                                    {(cn.data as any).type}
                                                </p>
                                                <h4 className="text-xs font-bold text-slate-200 truncate mt-1">
                                                    {(cn.data as any).name || (cn.data as any).title}
                                                </h4>
                                            </div>
                                        </div>
                                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                                            <div className="h-full w-1/3 bg-purple-500/40" />
                                        </div>
                                    </motion.div>
                                ))
                            ) : (
                                <div className="py-20 text-center opacity-30">
                                    <Share2 className="w-8 h-8 mx-auto mb-4 text-slate-600" />
                                    <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">No Connections</p>
                                </div>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Editor Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Editor Header */}
                <header className="h-16 bg-slate-900 border-b border-slate-800 flex items-center justify-between px-6 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <StickyNote className="w-5 h-5 text-purple-400" />
                        <input
                            type="text"
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="bg-transparent border-none focus:outline-none text-xl font-bold text-white w-full max-w-xl"
                            placeholder="Note Title..."
                        />
                    </div>
                    <div className="flex items-center gap-3">
                        <AnimatePresence>
                            {!isZenMode && (
                                <motion.button
                                    onClick={handleSave}
                                    disabled={isSaving}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${isSaving
                                        ? 'bg-emerald-500 text-white'
                                        : showSuccess
                                            ? 'bg-emerald-500 text-white shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                                            : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:border-purple-500/50'
                                        }`}
                                >
                                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                    {isSaving ? 'Syncing...' : showSuccess ? 'Published' : 'Save Draft'}
                                </motion.button>
                            )}
                        </AnimatePresence>

                        <button
                            onClick={handleExportMD}
                            className="flex items-center gap-2 px-4 py-2.5 bg-white/5 text-slate-400 hover:text-cyan-400 border border-white/10 rounded-2xl text-xs font-black uppercase tracking-widest transition-all"
                            title="Export as Markdown"
                        >
                            <DownloadCloud className="w-4 h-4" />
                            <span className="hidden sm:inline">Export MD</span>
                        </button>

                        <button
                            onClick={toggleZenMode}
                            className={`p-2 rounded-xl transition-all ${isZenMode
                                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                            title="Toggle Zen Mode"
                        >
                            <Eye className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                            className={`p-2 rounded-xl transition-all ${isAIPanelOpen
                                ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                                : 'bg-slate-800 text-slate-400 hover:text-white'
                                }`}
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Editor Toolbar (Formatting) */}
                <div className="h-10 bg-slate-900/50 border-b border-slate-800 flex items-center px-6 gap-4">
                    <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><Hash className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><List className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><Code className="w-4 h-4" /></button>
                    <button className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-slate-800 rounded transition-colors"><Image className="w-4 h-4" /></button>
                    <div className="h-4 w-px bg-slate-800 mx-2" />
                    <button className="flex items-center gap-1.5 px-3 py-1 bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 rounded-lg text-[10px] font-bold uppercase transition-colors">
                        <Sparkles className="w-3 h-3" />
                        Critique Writing
                    </button>
                </div>

                {/* Main Textarea */}
                <div className="flex-1 relative overflow-hidden bg-[#0a0b0f]">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="absolute inset-0 w-full h-full bg-transparent text-slate-300 p-10 focus:outline-none resize-none font-serif text-lg leading-relaxed selection:bg-purple-500/30"
                        placeholder="Begin weaving your thoughts into existence..."
                    />

                    {/* Character/Word count */}
                    <div className="absolute bottom-6 left-10 text-[10px] text-slate-600 font-mono uppercase tracking-widest">
                        Words: {content.split(/\s+/).filter(x => x.length > 0).length} | Chars: {content.length}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: AI Assistant */}
            <AnimatePresence>
                {isAIPanelOpen && !isZenMode && (
                    <motion.div
                        className="w-96 bg-slate-900 border-l border-slate-800 flex flex-col"
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 384, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                    >
                        <AIPanel
                            messages={messages}
                            onSendMessage={sendMessage}
                            onClear={clearMessages}
                            isLoading={isLoading}
                            isStreaming={isStreaming}
                            error={error}
                        />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

// Internal AI Panel Component for focus room
const AIPanel: React.FC<{
    messages: any[];
    onSendMessage: (msg: string) => void;
    onClear: () => void;
    isLoading: boolean;
    isStreaming: boolean;
    error: string | null;
}> = ({ messages, onSendMessage, onClear, isLoading, isStreaming, error }) => {
    const [input, setInput] = useState('');
    const endRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        endRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const handleSend = () => {
        if (!input.trim() || isLoading) return;
        onSendMessage(input);
        setInput('');
    };

    return (
        <div className="flex-1 flex flex-col h-full">
            <div className="h-14 border-b border-slate-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-400" />
                    <span className="text-sm font-bold text-white">Writing Oracle</span>
                </div>
                <button onClick={onClear} className="p-1.5 hover:bg-slate-800 rounded-lg transition-colors">
                    <RefreshCw className="w-4 h-4 text-slate-400" />
                </button>
            </div>

            <div className="flex-1 overflow-auto p-4 space-y-4">
                {messages.map((msg, i) => (
                    <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-sm ${msg.role === 'user'
                            ? 'bg-purple-600 text-white rounded-br-none'
                            : 'bg-slate-800 text-slate-300 rounded-bl-none'
                            }`}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {isStreaming && !messages[messages.length - 1]?.content && (
                    <div className="flex justify-start">
                        <div className="bg-slate-800 px-4 py-3 rounded-2xl rounded-bl-none">
                            <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                        </div>
                    </div>
                )}
                {error && (
                    <div className="text-center text-[10px] text-red-400/80 bg-red-400/5 py-2 rounded-xl border border-red-500/20">
                        {error}
                    </div>
                )}
                <div ref={endRef} />
            </div>

            <div className="p-4 border-t border-slate-800 flex gap-2">
                <input
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    placeholder="Ask for feedback or synthesis..."
                    className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-4 py-2 text-sm text-white focus:outline-none focus:border-purple-500/50"
                />
                <button
                    onClick={handleSend}
                    disabled={!input.trim() || isLoading}
                    className="p-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl transition-colors disabled:opacity-50"
                >
                    <ChevronRight className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

export default WritingStudy;

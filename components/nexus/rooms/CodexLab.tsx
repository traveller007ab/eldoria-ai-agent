import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FileCode, Save, Sparkles, X, ChevronRight, MessageSquare,
    Terminal, Play, Cpu, Shield, Zap, Loader2, RefreshCw,
    Copy, Download, Share2, Eye, EyeOff, CheckCircle2,
    Code, Braces, Hash, Search
} from 'lucide-react';
import { useNexusStore, CodexNodeData } from '../../../stores/useNexusStore';
import { useNexusAI } from '../hooks/useNexusAI';

interface CodexLabProps {
    nodeId: string;
}

export const CodexLab: React.FC<CodexLabProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const updateNode = useNexusStore((state) => state.updateNode);
    const { isZenMode, toggleZenMode } = useNexusStore();

    const [code, setCode] = useState('');
    const [filename, setFilename] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [showSuccess, setShowSuccess] = useState(false);
    const [isAIPanelOpen, setIsAIPanelOpen] = useState(true);

    const data = node?.data as CodexNodeData;

    useEffect(() => {
        if (data) {
            setCode(data.codeContent || '// Begin typing your neural logic here...');
            setFilename(data.filename || 'script.py');
        }
    }, [data]);

    // AI Oracle Integration
    const { messages, sendMessage, clearMessages, isLoading, isStreaming, error } = useNexusAI({
        documentTitle: `Codex: ${filename}`,
        documentContent: code
    });

    const handleSave = async () => {
        if (!node) return;
        setIsSaving(true);
        updateNode(node.id, {
            filename,
            codeContent: code,
            isDirty: false,
            lastModified: Date.now()
        } as Partial<CodexNodeData>);

        setTimeout(() => {
            setIsSaving(false);
            setShowSuccess(true);
            setTimeout(() => setShowSuccess(false), 2000);
        }, 800);
    };

    if (!node) return null;

    return (
        <div className="h-full w-full bg-[#05050a] flex relative overflow-hidden font-sans">
            {/* Ambient Neural Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full animate-pulse" />
                <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-indigo-500/5 blur-[100px] rounded-full" />
                <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: 'linear-gradient(#4f46e5 1px, transparent 1px), linear-gradient(90deg, #4f46e5 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
            </div>

            {/* Left Sidebar: Lab Metadata & Tools */}
            <AnimatePresence>
                {!isZenMode && (
                    <motion.div
                        initial={{ x: -320, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: -320, opacity: 0 }}
                        className="w-80 bg-slate-900/50 backdrop-blur-2xl border-r border-white/5 flex flex-col z-10"
                    >
                        <div className="p-6 border-b border-white/5">
                            <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] flex items-center gap-3">
                                <Terminal className="w-3.5 h-3.5 text-blue-400" />
                                Codex Lab Environment
                            </h3>
                        </div>

                        <div className="flex-1 overflow-auto p-4 space-y-6">
                            {/* Execution Context */}
                            <section>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Execution Context</span>
                                <div className="space-y-3">
                                    <div className="p-4 bg-white/5 rounded-2xl border border-white/5 space-y-3">
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Runtime</span>
                                            <span className="text-xs font-mono text-blue-400">{data.language} 3.10</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Memory Load</span>
                                            <span className="text-xs font-mono text-emerald-400">0.4 MB</span>
                                        </div>
                                        <div className="flex items-center justify-between">
                                            <span className="text-xs text-slate-400">Security Level</span>
                                            <div className="flex items-center gap-1.5 text-blue-400">
                                                <Shield className="w-3 h-3" />
                                                <span className="text-[10px] uppercase font-black">Isolated</span>
                                            </div>
                                        </div>
                                    </div>
                                    <button className="w-full py-3 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2">
                                        <Play className="w-3.5 h-3.5 fill-blue-400" />
                                        Run Simulation
                                    </button>
                                </div>
                            </section>

                            {/* Dependencies */}
                            <section>
                                <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest block mb-4">Module Dependencies</span>
                                <div className="space-y-2">
                                    {['numpy', 'scipy', 'nexus_core'].map(dep => (
                                        <div key={dep} className="flex items-center gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-blue-500/30 transition-all cursor-default group">
                                            <Braces className="w-4 h-4 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                            <span className="text-xs font-mono text-slate-300">{dep}</span>
                                        </div>
                                    ))}
                                </div>
                            </section>
                        </div>

                        {/* Lab Footer */}
                        <div className="p-4 bg-white/5 border-t border-white/5">
                            <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                                <span>SYSTEM STATUS</span>
                                <span className="text-emerald-500 flex items-center gap-1.5">
                                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                    STABLE
                                </span>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Main Lab Area */}
            <div className="flex-1 flex flex-col relative">
                {/* Lab Header */}
                <header className="h-16 bg-slate-900/80 backdrop-blur-md border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-20">
                    <div className="flex items-center gap-5 flex-1">
                        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                            <FileCode className="w-5 h-5 text-blue-400" />
                        </div>
                        <div className="flex-1">
                            <input
                                type="text"
                                value={filename}
                                onChange={(e) => setFilename(e.target.value)}
                                className="bg-transparent border-none focus:outline-none text-lg font-bold text-white w-full tracking-tight"
                                placeholder="neural_processor.py"
                            />
                            <div className="flex items-center gap-4 mt-0.5">
                                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest flex items-center gap-1.5">
                                    <Cpu className="w-3 h-3" />
                                    L3 Cache Optimized
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {!isZenMode && (
                            <motion.button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${showSuccess
                                    ? 'bg-emerald-500 text-slate-950'
                                    : 'bg-white/5 text-slate-400 hover:text-white border border-white/10 hover:border-blue-500/50'
                                    }`}
                            >
                                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : showSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {isSaving ? 'Compiling...' : showSuccess ? 'Deployed' : 'Commit Changes'}
                            </motion.button>
                        )}

                        <button
                            onClick={toggleZenMode}
                            className={`p-2.5 rounded-xl transition-all ${isZenMode ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                            title="Toggle Zen Mode"
                        >
                            <Eye className="w-5 h-5" />
                        </button>

                        <button
                            onClick={() => setIsAIPanelOpen(!isAIPanelOpen)}
                            className={`p-2.5 rounded-xl transition-all ${isAIPanelOpen ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30' : 'bg-slate-800 text-slate-400 hover:text-white'}`}
                        >
                            <Sparkles className="w-5 h-5" />
                        </button>
                    </div>
                </header>

                {/* Editor Container */}
                <div className="flex-1 flex overflow-hidden">
                    {/* Line Numbers Sidebar */}
                    <div className="w-12 bg-slate-950/50 border-r border-white/5 flex flex-col items-center py-6 select-none opacity-30">
                        {Array.from({ length: 40 }).map((_, i) => (
                            <div key={i} className="text-[10px] font-mono leading-relaxed h-7">{i + 1}</div>
                        ))}
                    </div>

                    {/* Main Editor */}
                    <div className="flex-1 relative bg-slate-950/20">
                        <textarea
                            value={code}
                            onChange={(e) => setCode(e.target.value)}
                            spellCheck={false}
                            className="absolute inset-0 w-full h-full bg-transparent text-blue-100/90 p-6 focus:outline-none resize-none font-mono text-sm leading-relaxed selection:bg-blue-500/30"
                            placeholder="Write your beautiful code here..."
                        />

                        {/* Cursor Stats */}
                        {!isZenMode && (
                            <div className="absolute bottom-6 left-6 flex items-center gap-4 text-[10px] text-slate-500 font-mono uppercase tracking-[0.2em]">
                                <span>Ln {code.split('\n').length}, Col 1</span>
                                <span>UTF-8</span>
                                <span>CRLF</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Sidebar: AI Oracle */}
            <AnimatePresence>
                {isAIPanelOpen && !isZenMode && (
                    <motion.div
                        initial={{ width: 0, opacity: 0 }}
                        animate={{ width: 384, opacity: 1 }}
                        exit={{ width: 0, opacity: 0 }}
                        className="bg-slate-900/50 backdrop-blur-2xl border-l border-white/5 flex flex-col z-10"
                    >
                        {/* Oracle Header */}
                        <div className="h-16 border-b border-white/5 flex items-center justify-between px-6 bg-white/5">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white">
                                    <Sparkles className="w-4 h-4" />
                                </div>
                                <div>
                                    <span className="text-xs font-black text-white uppercase tracking-widest">Code Oracle</span>
                                    <p className="text-[9px] text-slate-500 font-mono uppercase">Neural Assistant</p>
                                </div>
                            </div>
                            <button onClick={clearMessages} className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-white transition-colors">
                                <RefreshCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Messages Area */}
                        <div className="flex-1 overflow-auto p-6 space-y-6">
                            {messages.length === 0 && (
                                <div className="h-full flex flex-col items-center justify-center text-center opacity-30 space-y-4">
                                    <Cpu className="w-12 h-12 text-blue-500" />
                                    <p className="text-[10px] font-black uppercase tracking-widest leading-relaxed">
                                        Analyze code structure<br />Optimize performance<br />Identify neural leaks
                                    </p>
                                </div>
                            )}

                            {messages.map((msg, i) => (
                                <motion.div
                                    key={i}
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                                >
                                    <div className={`max-w-[85%] px-4 py-3 rounded-2xl text-[13px] leading-relaxed ${msg.role === 'user'
                                        ? 'bg-blue-600 text-white rounded-br-none shadow-lg shadow-blue-600/10'
                                        : 'bg-white/5 text-slate-300 border border-white/10 rounded-bl-none'
                                        }`}>
                                        {msg.content || <Loader2 className="w-4 h-4 animate-spin opacity-50" />}
                                    </div>
                                </motion.div>
                            ))}
                        </div>

                        {/* Input Area */}
                        <div className="p-6 border-t border-white/5 shrink-0">
                            <AIInput onSendMessage={sendMessage} isLoading={isLoading} />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

const AIInput: React.FC<{ onSendMessage: (msg: string) => void; isLoading: boolean }> = ({ onSendMessage, isLoading }) => {
    const [input, setInput] = useState('');

    const handleSend = () => {
        if (input.trim() && !isLoading) {
            onSendMessage(input.trim());
            setInput('');
        }
    };

    return (
        <div className="relative group">
            <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Ask Oracle to refactor or explain..."
                className="w-full bg-slate-950 border border-white/10 rounded-2xl pl-10 pr-12 py-3.5 text-xs text-white placeholder:text-slate-600 focus:outline-none focus:border-blue-500/50 transition-all"
            />
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 group-focus-within:text-blue-500 transition-colors" />
            <button
                onClick={handleSend}
                disabled={!input.trim() || isLoading}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-xl bg-blue-500 hover:bg-blue-400 text-white flex items-center justify-center transition-colors disabled:opacity-30"
            >
                <Zap className="w-4 h-4 fill-white" />
            </button>
        </div>
    );
};

export default CodexLab;

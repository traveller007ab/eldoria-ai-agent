import React, { useState, useEffect } from 'react';
import { X, Search, Database, RefreshCcw, Box, Code, FileText } from 'lucide-react';
import { CodebaseService } from '../services/codebaseService';

interface KnowledgeIndexModalProps {
    onClose: () => void;
}

export const KnowledgeIndexModal: React.FC<KnowledgeIndexModalProps> = ({ onClose }) => {
    const [index, setIndex] = useState<string>("");
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    useEffect(() => {
        setIndex(CodebaseService.getProjectIndex());
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        const newIndex = await CodebaseService.indexProject();
        setIndex(newIndex);
        setIsSyncing(false);
    };

    const files = index.split('\n').filter(line => line.trim() && line.toLowerCase().includes(searchQuery.toLowerCase()));

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-2xl bg-[#0a0a0a] border border-cyan-500/20 rounded-3xl overflow-hidden shadow-[0_0_50px_rgba(34,211,238,0.1)] flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/10 rounded-xl">
                            <Database className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-sm font-bold text-cyan-100 uppercase tracking-widest leading-none">EmeraldMind</h2>
                            <p className="text-[10px] text-cyan-500/60 mt-1 uppercase font-medium">Cognitive Knowledge Index</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-cyan-500/40 hover:text-cyan-100">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-4 border-b border-cyan-500/10 flex items-center gap-4 bg-black/20">
                    <div className="relative flex-grow group">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500/30 group-focus-within:text-cyan-400 transition-colors" />
                        <input
                            type="text"
                            placeholder="Explore crystalline nodes (files)..."
                            className="w-full bg-black/40 border border-cyan-500/10 rounded-xl py-2.5 pl-10 pr-4 text-xs text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-400/30 transition-all font-sans"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleSync}
                        disabled={isSyncing}
                        className="flex items-center gap-2 px-4 py-2.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl border border-cyan-500/20 text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                    >
                        <RefreshCcw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                        {isSyncing ? 'Syncing...' : 'Sync Index'}
                    </button>
                </div>

                <div className="flex-grow overflow-y-auto custom-scrollbar p-4 space-y-1.5 font-mono">
                    {files.length > 0 ? files.map((file, i) => {
                        const isDir = !file.includes('.');
                        const parts = file.split('\\');
                        const name = parts[parts.length - 1];
                        return (
                            <div key={i} className="group flex items-center gap-3 p-2 hover:bg-cyan-500/5 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-default animate-in slide-in-from-left duration-300" style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}>
                                {isDir ? (
                                    <Box className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                                ) : file.endsWith('.tsx') || file.endsWith('.ts') ? (
                                    <Code className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                                ) : (
                                    <FileText className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                                )}
                                <span className="text-[11px] text-cyan-100/60 group-hover:text-cyan-100 transition-colors truncate">
                                    {name}
                                    <span className="text-[9px] text-cyan-500/20 ml-2 group-hover:text-cyan-500/40">{file}</span>
                                </span>
                            </div>
                        );
                    }) : (
                        <div className="flex flex-col items-center justify-center py-20 text-cyan-500/20 italic">
                            <Database className="w-12 h-12 mb-4 opacity-50" />
                            <p className="text-xs">No crystalline nodes found in current buffer.</p>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center justify-between text-[10px] uppercase font-bold tracking-[0.1em]">
                    <span className="text-cyan-500/40">Entities Indexed: <span className="text-cyan-300 font-black">{files.length}</span></span>
                    <span className="text-cyan-500/40">Status: <span className="text-emerald-400">Stable</span></span>
                </div>
            </div>
        </div>
    );
};

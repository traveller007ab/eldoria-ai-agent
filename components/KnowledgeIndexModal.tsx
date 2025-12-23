import React, { useState, useEffect } from 'react';
import { X, Search, Database, RefreshCcw, Box, Code, FileText, ExternalLink } from 'lucide-react';
import { CodebaseService, FileNode } from '../services/codebaseService';
import { useWorkspace } from '../context/WorkspaceContext';

interface KnowledgeIndexModalProps {
    onClose: () => void;
}

export const KnowledgeIndexModal: React.FC<KnowledgeIndexModalProps> = ({ onClose }) => {
    const [structuredIndex, setStructuredIndex] = useState<FileNode[]>([]);
    const [isSyncing, setIsSyncing] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const { openLocalFile } = useWorkspace();

    useEffect(() => {
        setStructuredIndex(CodebaseService.getStructuredIndex());
    }, []);

    const handleSync = async () => {
        setIsSyncing(true);
        await CodebaseService.indexProject();
        setStructuredIndex(CodebaseService.getStructuredIndex());
        setIsSyncing(false);
    };

    const files = structuredIndex.filter(node =>
        node.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        node.path.toLowerCase().includes(searchQuery.toLowerCase())
    ).sort((a, b) => (b.metadata?.relevance || 0) - (a.metadata?.relevance || 0));

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

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
                    {files.length > 0 ? files.map((node, i) => {
                        const file = node.path;
                        return (
                            <div
                                key={i}
                                onClick={() => {
                                    openLocalFile(node.path);
                                    onClose();
                                }}
                                className="group flex items-center justify-between p-2 hover:bg-cyan-500/10 rounded-lg border border-transparent hover:border-cyan-500/10 transition-all cursor-pointer animate-in slide-in-from-left duration-300"
                                style={{ animationDelay: `${Math.min(i * 30, 500)}ms` }}
                            >
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="relative">
                                        {node.name.endsWith('.tsx') || node.name.endsWith('.ts') ? (
                                            <Code className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                                        ) : (
                                            <FileText className="w-3.5 h-3.5 text-cyan-500/40 group-hover:text-cyan-400 transition-colors" />
                                        )}
                                        <ExternalLink className="absolute -top-1 -right-1 w-2 h-2 text-cyan-300 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                    <div className="flex flex-col min-w-0">
                                        <span className="text-[11px] text-cyan-100/60 group-hover:text-cyan-100 transition-colors truncate">
                                            {node.name}
                                        </span>
                                        <span className="text-[8px] text-cyan-500/20 group-hover:text-cyan-500/40 truncate">{node.path}</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-4 shrink-0 text-[10px] font-bold">
                                    <div className="flex flex-col items-end">
                                        <span className="text-cyan-500/20 group-hover:text-cyan-400/60 transition-colors">{formatSize(node.metadata?.size || 0)}</span>
                                        <span className="text-[8px] text-cyan-500/10 group-hover:text-cyan-500/30">{new Date(node.metadata?.lastModified || '').toLocaleDateString()}</span>
                                    </div>
                                    <div className={`px-2 py-0.5 rounded-full border ${(node.metadata?.relevance || 0) > 80 ? 'bg-emerald-500/5 border-emerald-500/20 text-emerald-400/60' :
                                        'bg-cyan-500/5 border-cyan-500/10 text-cyan-500/40'
                                        }`}>
                                        {node.metadata?.relevance}%
                                    </div>
                                </div>
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
                    <span className="text-cyan-500/40">Refinement: <span className="text-emerald-400">High Resolution</span></span>
                </div>
            </div>
        </div>
    );
};

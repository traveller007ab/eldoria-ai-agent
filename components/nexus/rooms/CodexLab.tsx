/**
 * CodexLab - DIGITAL GARDEN AESTHETIC (Themed)
 * 
 * "THE GREENHOUSE IDE" - Real File System Integration
 * Supports Sunlit (Day) and Moonlit (Night) modes.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Code2, Play, Save, Settings, FolderTree, Sparkles,
    ChevronRight, ChevronDown, FileCode, Folder, Terminal,
    GitBranch, Wand2, Loader2, FileIcon
} from 'lucide-react';
import { useNexusStore, CodexNodeData } from '../../../stores/useNexusStore';
import { FileSystemService, FileSystemNode } from '../../../services/FileSystemService';

interface CodexLabProps {
    nodeId: string;
}

export const CodexLab: React.FC<CodexLabProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const { isZenMode, isDarkMode } = useNexusStore();

    // Editor State
    const [code, setCode] = useState('');
    const [activeFile, setActiveFile] = useState<FileSystemNode | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // File System State
    const [fileSystem, setFileSystem] = useState<FileSystemNode[]>([]);
    const [isLoadingFS, setIsLoadingFS] = useState(false);

    // UI State
    const [showExplorer, setShowExplorer] = useState(true);
    const [showAI, setShowAI] = useState(true);

    // Initial Load
    useEffect(() => {
        loadFileSystem();
    }, []);

    const loadFileSystem = async () => {
        setIsLoadingFS(true);
        try {
            // Load root '.'
            const files = await FileSystemService.listFiles('.');
            // Sort: Directories first, then files
            const sorted = files.sort((a, b) => {
                if (a.type === b.type) return a.name.localeCompare(b.name);
                return a.type === 'directory' ? -1 : 1;
            });
            setFileSystem(sorted);
        } catch (e) {
            console.error("Failed to load file system", e);
        } finally {
            setIsLoadingFS(false);
        }
    };

    const handleFileSelect = async (file: FileSystemNode) => {
        try {
            // If it's a file, load it
            if (file.type === 'file') {
                // Check if we have content, if not load it
                const content = await FileSystemService.readFile(file.path);
                setActiveFile({ ...file, content });
                setCode(content);
            }
            // TODO: Handle directory expansion if we get directory children support
        } catch (err) {
            console.error("Failed to read file", err);
        }
    };

    const handleSave = async () => {
        if (!activeFile?.path) return;
        setIsSaving(true);
        try {
            await FileSystemService.writeFile(activeFile.path, code);
            // Update local state
            setActiveFile(prev => prev ? ({ ...prev, content: code }) : null);

            // Artificial delay to show success state
            setTimeout(() => setIsSaving(false), 800);
        } catch (err) {
            console.error("Failed to save", err);
            setIsSaving(false);
        }
    };

    // Keyboard Shortcut
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [activeFile, code]);

    // Theme Variables
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]'
        : 'bg-gradient-to-br from-stone-100 via-stone-50 to-amber-50/30';

    const textMain = isDarkMode ? 'text-zinc-200' : 'text-stone-800';
    const textMuted = isDarkMode ? 'text-zinc-500' : 'text-stone-500';
    const borderClass = isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50';

    return (
        <div className={`h-full w-full ${bgClass} p-4 md:p-6 overflow-hidden transition-colors duration-500`}>

            <div className="h-full flex gap-4">

                {/* LEFT PANEL: Explorer */}
                <AnimatePresence>
                    {!isZenMode && showExplorer && (
                        <motion.div
                            className="w-64 shrink-0"
                            initial={{ x: -280, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -280, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <GlassCard className="h-full flex flex-col" isDark={isDarkMode}>
                                {/* Header */}
                                <div className={`px-4 py-3 border-b flex items-center justify-between ${borderClass}`}>
                                    <div className="flex items-center gap-2">
                                        <FolderTree className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-violet-500'}`} />
                                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-stone-700'}`}>Files</span>
                                    </div>
                                    <div
                                        onClick={loadFileSystem}
                                        className={`cursor-pointer hover:bg-white/5 p-1 rounded transition-colors`}
                                        title="Refresh File List"
                                    >
                                        <div className={`w-2 h-2 rounded-full ${isLoadingFS ? 'bg-amber-400 animate-pulse' : 'bg-emerald-400'}`} />
                                    </div>
                                </div>

                                {/* File List */}
                                <div className="flex-1 overflow-auto p-2 space-y-0.5">
                                    {isLoadingFS && (
                                        <div className="flex items-center justify-center py-8">
                                            <Loader2 className={`w-5 h-5 animate-spin ${textMuted}`} />
                                        </div>
                                    )}

                                    {!isLoadingFS && fileSystem.map((file) => (
                                        <div
                                            key={file.path}
                                            onClick={() => handleFileSelect(file)}
                                            className={`
                                                flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer transition-all text-sm
                                                ${activeFile?.path === file.path
                                                    ? (isDarkMode ? 'bg-indigo-500/20 text-indigo-300' : 'bg-violet-100 text-violet-700 font-medium')
                                                    : (isDarkMode ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/5' : 'text-stone-600 hover:text-stone-900 hover:bg-stone-100')
                                                }
                                            `}
                                        >
                                            {file.type === 'directory'
                                                ? <Folder className="w-4 h-4 opacity-70" />
                                                : <FileIcon className="w-4 h-4 opacity-70" />
                                            }
                                            <span className="truncate">{file.name}</span>
                                        </div>
                                    ))}

                                    {!isLoadingFS && fileSystem.length === 0 && (
                                        <div className={`text-center py-8 text-xs ${textMuted}`}>
                                            No files found in root
                                        </div>
                                    )}
                                </div>

                                {/* Footer Stats */}
                                <div className={`p-4 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-stone-200/50 bg-white/30'}`}>
                                    <div className={`flex items-center justify-between text-xs ${textMuted}`}>
                                        <span className="flex items-center gap-1.5">
                                            <GitBranch className="w-3 h-3" /> main
                                        </span>
                                        <span className="text-emerald-500 font-medium">● Local</span>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CENTER: Editor */}
                <div className="flex-1 min-w-0">
                    <GlassCard className="h-full flex flex-col" accent isDark={isDarkMode}>
                        {/* Tab Bar */}
                        <div className={`px-2 py-2 border-b flex items-center justify-between ${borderClass}`}>
                            <div className="flex items-center gap-1">
                                {activeFile && activeFile.name ? (
                                    <div className={`
                                        flex items-center gap-2 pl-3 pr-8 py-1.5 rounded-t-lg text-xs font-medium border-t border-x relative top-[1px]
                                        ${isDarkMode ? 'bg-[#0F0F12] border-white/[0.06] text-zinc-300' : 'bg-white border-stone-200 text-stone-700'}
                                    `}>
                                        <FileCode className="w-3.5 h-3.5 text-blue-400" />
                                        {String(activeFile.name)}
                                        <div className={`absolute right-2 w-2 h-2 rounded-full ${isSaving ? 'bg-amber-400' : 'bg-transparent'}`} />
                                    </div>
                                ) : (
                                    <div className={`px-4 py-1.5 text-xs italic ${textMuted}`}>No file selected</div>
                                )}
                            </div>

                            <div className="flex items-center gap-2 pr-2">
                                <button
                                    onClick={handleSave}
                                    className={`p-1.5 rounded-md transition-colors ${isSaving ? 'text-amber-400' : (isDarkMode ? 'text-zinc-500 hover:text-zinc-300' : 'text-stone-400 hover:text-stone-600')}`}
                                    title="Save (Ctrl+S)"
                                >
                                    <Save className="w-4 h-4" />
                                </button>
                                <button className={`p-1.5 rounded-md transition-colors ${isDarkMode ? 'text-green-500 hover:bg-green-500/10' : 'text-green-600 hover:bg-green-100'}`}>
                                    <Play className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Editor Area */}
                        <div className="flex-1 relative group">
                            <textarea
                                value={code}
                                onChange={(e) => setCode(e.target.value)}
                                spellCheck={false}
                                className={`
                                    absolute inset-0 w-full h-full resize-none p-6 font-mono text-sm leading-relaxed outline-none transition-colors
                                    ${isDarkMode
                                        ? 'bg-[#0F0F12]/50 text-zinc-300 selection:bg-indigo-500/30 placeholder:text-zinc-700'
                                        : 'bg-white/50 text-stone-800 selection:bg-violet-200 placeholder:text-stone-400'}
                                `}
                                placeholder="// Select a file to start editing..."
                            />
                        </div>

                        {/* Status Bar */}
                        <div className={`px-4 py-1.5 border-t flex items-center justify-between text-[10px] font-mono ${isDarkMode ? 'border-white/[0.06] text-zinc-600' : 'border-stone-200/50 text-stone-400'}`}>
                            <div>Ln {String(code).split('\n').length}, Col 1</div>
                            <div>UTF-8</div>
                            <div>Typescript</div>
                        </div>
                    </GlassCard>
                </div>

                {/* RIGHT PANEL: AI Assistant */}
                <AnimatePresence>
                    {!isZenMode && showAI && (
                        <motion.div
                            className="w-72 shrink-0"
                            initial={{ x: 280, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 280, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <GlassCard className="h-full flex flex-col" isDark={isDarkMode}>
                                <div className={`p-4 border-b flex items-center justify-between ${borderClass} bg-gradient-to-r ${isDarkMode ? 'from-indigo-500/10 to-transparent' : 'from-violet-500/10 to-transparent'}`}>
                                    <div className="flex items-center gap-2">
                                        <Sparkles className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-violet-500'}`} />
                                        <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-stone-700'}`}>Genesis AI</span>
                                    </div>
                                    <Wand2 className={`w-3.5 h-3.5 ${textMuted}`} />
                                </div>

                                <div className="flex-1 p-4 flex flex-col items-center justify-center text-center opacity-60">
                                    <p className={`text-xs mb-2 ${textMuted}`}>Select code to generate insights</p>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

            </div>
        </div>
    );
};

// --- Subcomponents ---

const GlassCard = ({ children, className = '', isDark = false, accent = false }: any) => (
    <div className={`
        relative backdrop-blur-xl rounded-2xl border transition-colors duration-500 overflow-hidden
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        ${isDark
            ? 'bg-[#151518]/70 border-white/[0.06]'
            : 'bg-white/70 border-white/80'
        }
        ${className}
    `}>
        {/* Bracket Connectors */}
        <div className={`absolute -left-1.5 top-10 pointer-events-none w-1.5 h-16 border-2 border-r-0 rounded-l-full opacity-60 transition-colors duration-500
            ${isDark ? 'border-indigo-500' : 'border-violet-400'}`}
        />
        <div className={`absolute -right-1.5 bottom-10 pointer-events-none w-1.5 h-16 border-2 border-l-0 rounded-r-full opacity-60 transition-colors duration-500
            ${isDark ? 'border-indigo-500' : 'border-violet-400'}`}
        />

        {children}
    </div>
);

const TreeItem = ({ icon: Icon, label, active, isFolder, isOpen, isDark }: any) => (
    <div className={`
        flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs cursor-pointer select-none transition-colors
        ${active
            ? (isDark ? 'bg-indigo-500/20 text-indigo-300' : 'bg-violet-100 text-violet-700 font-medium')
            : (isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/5' : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100')
        }
    `}>
        {isFolder && (
            <span className="opacity-50">
                {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
            </span>
        )}
        <Icon className={`w-3.5 h-3.5 ${active ? '' : 'opacity-70'}`} />
        <span>{label}</span>
    </div>
);

export default CodexLab;

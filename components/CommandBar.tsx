/**
 * CommandBar - Unified Command Interface
 * 
 * A floating command bar that serves as the single entry point for:
 * - Research queries
 * - AI generation
 * - Quick actions
 * 
 * Inspired by Spotlight, Raycast, and Perplexity's command interface.
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Search, Sparkles, Globe, Send, X, Command, ArrowRight,
    Lightbulb, FileText, Zap, BookOpen, Loader2, ChevronUp
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';

interface CommandBarProps {
    isOpen: boolean;
    onClose: () => void;
}

type CommandMode = 'search' | 'generate' | 'research';

const MODE_CONFIG = {
    search: {
        icon: Search,
        placeholder: 'Ask anything about your project...',
        color: 'cyan',
        gradient: 'from-cyan-500/20 to-blue-500/20',
        borderColor: 'border-cyan-500/30',
        glowColor: 'shadow-[0_0_30px_rgba(34,211,238,0.15)]'
    },
    generate: {
        icon: Sparkles,
        placeholder: 'Describe what you want to generate...',
        color: 'purple',
        gradient: 'from-purple-500/20 to-pink-500/20',
        borderColor: 'border-purple-500/30',
        glowColor: 'shadow-[0_0_30px_rgba(168,85,247,0.15)]'
    },
    research: {
        icon: Globe,
        placeholder: 'Research any topic with live sources...',
        color: 'emerald',
        gradient: 'from-emerald-500/20 to-teal-500/20',
        borderColor: 'border-emerald-500/30',
        glowColor: 'shadow-[0_0_30px_rgba(16,185,129,0.15)]'
    }
};

const QUICK_ACTIONS = [
    { id: 'explain', label: 'Explain this', icon: Lightbulb, mode: 'search' as CommandMode },
    { id: 'generate', label: 'Generate content', icon: Sparkles, mode: 'generate' as CommandMode },
    { id: 'research', label: 'Deep research', icon: Globe, mode: 'research' as CommandMode },
    { id: 'summarize', label: 'Summarize', icon: FileText, mode: 'search' as CommandMode },
];

export const CommandBar: React.FC<CommandBarProps> = ({ isOpen, onClose }) => {
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [query, setQuery] = useState('');
    const [mode, setMode] = useState<CommandMode>('search');
    const [isProcessing, setIsProcessing] = useState(false);
    const [recentQueries, setRecentQueries] = useState<string[]>([]);

    const {
        sendChatMessage,
        generate,
        activeCanvas,
        isLoading,
        isChatLoading
    } = useWorkspace();

    const config = MODE_CONFIG[mode];
    const IconComponent = config.icon;

    // Focus input when opened
    useEffect(() => {
        if (isOpen && inputRef.current) {
            setTimeout(() => inputRef.current?.focus(), 50);
        }
    }, [isOpen]);

    // Close on Escape
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && isOpen) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Auto-detect mode based on query
    useEffect(() => {
        const q = query.toLowerCase();
        if (q.startsWith('/research ') || q.startsWith('research ')) {
            setMode('research');
        } else if (q.startsWith('/generate ') || q.startsWith('create ') || q.startsWith('write ')) {
            setMode('generate');
        } else if (q.includes('?') || q.startsWith('what') || q.startsWith('how') || q.startsWith('why') || q.startsWith('explain')) {
            setMode('search');
        }
    }, [query]);

    const handleSubmit = useCallback(async () => {
        if (!query.trim() || isProcessing) return;

        setIsProcessing(true);

        // Save to recent queries
        setRecentQueries(prev => [query, ...prev.filter(q => q !== query)].slice(0, 5));

        try {
            if (mode === 'generate') {
                // Trigger generation
                if (activeCanvas) {
                    await generate();
                }
            } else {
                // Send as chat message (research or question)
                await sendChatMessage(query);
            }

            setQuery('');
            onClose();
        } catch (err) {
            console.error('Command failed:', err);
        } finally {
            setIsProcessing(false);
        }
    }, [query, mode, activeCanvas, generate, sendChatMessage, onClose, isProcessing]);

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSubmit();
        }
    };

    if (!isOpen) return null;

    return (
        <>
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[9998] animate-in fade-in duration-200"
                onClick={onClose}
            />

            {/* Command Bar Container */}
            <div className="fixed inset-x-0 bottom-0 z-[9999] p-4 pb-8 animate-in slide-in-from-bottom-4 duration-300">
                <div className={`
                    max-w-2xl mx-auto
                    bg-gradient-to-br ${config.gradient}
                    backdrop-blur-xl
                    border ${config.borderColor}
                    rounded-2xl
                    ${config.glowColor}
                    overflow-hidden
                    transition-all duration-300
                `}>
                    {/* Mode Switcher */}
                    <div className="flex items-center gap-1 p-2 border-b border-white/5">
                        {Object.entries(MODE_CONFIG).map(([key, cfg]) => {
                            const ModeIcon = cfg.icon;
                            const isActive = mode === key;
                            return (
                                <button
                                    key={key}
                                    onClick={() => setMode(key as CommandMode)}
                                    className={`
                                        flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                                        transition-all duration-200
                                        ${isActive
                                            ? `bg-${cfg.color}-500/20 text-${cfg.color}-300 shadow-[0_0_10px_rgba(var(--${cfg.color}-rgb),0.2)]`
                                            : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                        }
                                    `}
                                >
                                    <ModeIcon className="w-3.5 h-3.5" />
                                    <span className="uppercase tracking-wider">{key}</span>
                                </button>
                            );
                        })}
                        <div className="flex-1" />
                        <button
                            onClick={onClose}
                            className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Input Area */}
                    <div className="relative p-4">
                        <div className="flex items-start gap-3">
                            <div className={`p-2 bg-${config.color}-500/20 rounded-xl shrink-0 mt-0.5`}>
                                <IconComponent className={`w-5 h-5 text-${config.color}-400`} />
                            </div>
                            <div className="flex-1 min-w-0">
                                <textarea
                                    ref={inputRef}
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder={config.placeholder}
                                    rows={1}
                                    className={`
                                        w-full bg-transparent border-none outline-none resize-none
                                        text-white text-lg placeholder:text-slate-500
                                        leading-relaxed
                                    `}
                                    style={{
                                        minHeight: '28px',
                                        maxHeight: '120px',
                                        height: 'auto'
                                    }}
                                    onInput={(e) => {
                                        const target = e.target as HTMLTextAreaElement;
                                        target.style.height = 'auto';
                                        target.style.height = `${Math.min(target.scrollHeight, 120)}px`;
                                    }}
                                />
                                <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-500">
                                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Enter</kbd>
                                    <span>to submit</span>
                                    <span className="text-slate-700">•</span>
                                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Shift+Enter</kbd>
                                    <span>for new line</span>
                                    <span className="text-slate-700">•</span>
                                    <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono">Esc</kbd>
                                    <span>to close</span>
                                </div>
                            </div>
                            <button
                                onClick={handleSubmit}
                                disabled={!query.trim() || isProcessing}
                                className={`
                                    p-3 rounded-xl transition-all duration-200
                                    ${query.trim() && !isProcessing
                                        ? `bg-${config.color}-500 hover:bg-${config.color}-400 text-white shadow-lg shadow-${config.color}-500/25`
                                        : 'bg-white/5 text-slate-500 cursor-not-allowed'
                                    }
                                `}
                            >
                                {isProcessing ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <ArrowRight className="w-5 h-5" />
                                )}
                            </button>
                        </div>
                    </div>

                    {/* Quick Actions (when empty) */}
                    {!query.trim() && (
                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-medium">
                                Quick Actions
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                                {QUICK_ACTIONS.map((action) => {
                                    const ActionIcon = action.icon;
                                    return (
                                        <button
                                            key={action.id}
                                            onClick={() => {
                                                setMode(action.mode);
                                                setQuery(action.label + ' ');
                                                inputRef.current?.focus();
                                            }}
                                            className="flex flex-col items-center gap-1.5 p-3 rounded-xl bg-white/5 hover:bg-white/10 transition-colors group"
                                        >
                                            <ActionIcon className="w-4 h-4 text-slate-400 group-hover:text-slate-200 transition-colors" />
                                            <span className="text-[10px] text-slate-400 group-hover:text-slate-200 transition-colors">
                                                {action.label}
                                            </span>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Recent Queries */}
                    {!query.trim() && recentQueries.length > 0 && (
                        <div className="px-4 pb-4">
                            <div className="text-[10px] text-slate-500 uppercase tracking-widest mb-2 font-medium">
                                Recent
                            </div>
                            <div className="space-y-1">
                                {recentQueries.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setQuery(q);
                                            inputRef.current?.focus();
                                        }}
                                        className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 transition-colors truncate"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Keyboard Hint */}
                <div className="text-center mt-3 text-[10px] text-slate-600">
                    Press <kbd className="px-1.5 py-0.5 bg-white/5 rounded border border-white/10 font-mono mx-1">⌘K</kbd> anytime to open
                </div>
            </div>
        </>
    );
};

/**
 * CommandBar Trigger Button
 * A floating button that opens the command bar
 */
export const CommandBarTrigger: React.FC<{ onClick: () => void }> = ({ onClick }) => {
    return (
        <button
            onClick={onClick}
            className="
                fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]
                flex items-center gap-3 px-5 py-3
                bg-slate-900/90 backdrop-blur-xl
                border border-cyan-500/20
                rounded-2xl
                text-sm text-slate-400
                hover:text-cyan-300 hover:border-cyan-500/40
                shadow-[0_8px_32px_rgba(0,0,0,0.4)]
                hover:shadow-[0_8px_32px_rgba(34,211,238,0.15)]
                transition-all duration-300
                group
            "
        >
            <div className="flex items-center gap-2">
                <Search className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 transition-colors" />
                <span className="text-slate-500 group-hover:text-slate-300 transition-colors">
                    Ask, Research, or Generate...
                </span>
            </div>
            <div className="flex items-center gap-1 pl-3 border-l border-slate-700">
                <kbd className="px-1.5 py-0.5 bg-slate-800 rounded text-[10px] font-mono text-slate-500 group-hover:text-cyan-400 transition-colors">
                    ⌘K
                </kbd>
            </div>
        </button>
    );
};

export default CommandBar;

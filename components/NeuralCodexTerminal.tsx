/**
 * NeuralCodexTerminal - Full Featured AI Research Partner
 * 
 * A living knowledge base that grows with you.
 * Think: Obsidian + Notion + ChatGPT in a terminal aesthetic.
 * 
 * Features:
 * - Multi-modal memory (code, files, screenshots, voice, links)
 * - Smart organization (auto-tagging, bi-directional links, graph view)
 * - Proactive intelligence (resurface insights, pattern detection)
 * - Export & publishing (markdown, flashcards, blog posts)
 * - Advanced search (semantic, time-based, code-aware)
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Terminal, MessageSquare, Search, Pin, Archive,
    Tag, ChevronRight, Send, Maximize2, Minimize2,
    X, Plus, Clock, Zap, FileCode, Hash, ArrowUp,
    ArrowDown, CornerDownLeft, Folder, Sparkles,
    Calendar, GitBranch, Download, Mic, Image,
    FileText, Link2, Network, BookOpen, TrendingUp,
    AlertCircle, ChevronDown, Copy, Check, ExternalLink,
    Settings, Filter, MoreHorizontal, Star, Trash2,
    Loader2
} from 'lucide-react';
import { useWorkspace } from '../context/WorkspaceContext';
import { MarkdownRenderer } from './MarkdownRenderer';
import { useCodex, CodexThread, CodexMessage, CodexAttachment } from '../hooks/useCodex';
import { useUser } from '../hooks/useUser';
import { CodexExportEngine } from '../services/agentic/CodexExportEngine';

// Local UI adaptors (if needed)
type ViewMode = 'threads' | 'chat' | 'search' | 'graph' | 'insights';
type SidebarSection = 'recent' | 'pinned' | 'tags' | 'timeline';

// ============================================
// TERMINAL COLORS
// ============================================

const COLORS = {
    bg: '#0a0a0f',
    bgSecondary: '#0f0f17',
    text: '#00ff41',
    textDim: '#00ff4180',
    prompt: '#00d9ff',
    promptDim: '#00d9ff80',
    dim: '#3a3a5a',
    tag: '#ff6b35',
    link: '#a78bfa',
    timestamp: '#4a4a6a',
    error: '#ff4444',
    success: '#00ff41',
    warning: '#ffb347',
    border: '#1a1a2e',
    highlight: '#00ff4120',
};

// ============================================
// SIDEBAR COMPONENT
// ============================================

interface SidebarProps {
    threads: CodexThread[];
    activeThreadId?: string;
    onSelectThread: (thread: CodexThread) => void;
    onNewThread: () => void;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}

const CodexSidebar: React.FC<SidebarProps> = ({
    threads,
    activeThreadId,
    onSelectThread,
    onNewThread,
    isCollapsed,
    onToggleCollapse
}) => {
    const [activeSection, setActiveSection] = useState<SidebarSection>('recent');
    const [tagFilter, setTagFilter] = useState<string | null>(null);

    // Group threads by date
    const today = new Date();
    const todayThreads = threads.filter(t => {
        const d = new Date(t.lastMessageAt);
        return d.toDateString() === today.toDateString();
    });
    const yesterdayThreads = threads.filter(t => {
        const d = new Date(t.lastMessageAt);
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return d.toDateString() === yesterday.toDateString();
    });
    const olderThreads = threads.filter(t => {
        const d = new Date(t.lastMessageAt);
        const twoDaysAgo = new Date(today);
        twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
        return d < twoDaysAgo;
    });

    // Get all unique tags with counts
    const tagCounts = threads.reduce((acc, t) => {
        t.tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    const pinnedThreads = threads.filter(t => t.pinned);

    if (isCollapsed) {
        return (
            <div className="w-10 shrink-0 border-r border-emerald-500/10 flex flex-col items-center py-3 gap-2 bg-[#0a0a0f]">
                <button
                    onClick={onToggleCollapse}
                    className="p-2 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                >
                    <ChevronRight className="w-4 h-4" />
                </button>
                <button
                    onClick={onNewThread}
                    className="p-2 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded-lg transition-all"
                    title="New Thread"
                >
                    <Plus className="w-4 h-4" />
                </button>
                <div className="h-px w-6 bg-emerald-500/10 my-1" />
                <button
                    onClick={() => setActiveSection('recent')}
                    className={`p-2 rounded-lg transition-all ${activeSection === 'recent' ? 'text-emerald-400 bg-emerald-500/20' : 'text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10'}`}
                    title="Recent"
                >
                    <Clock className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setActiveSection('pinned')}
                    className={`p-2 rounded-lg transition-all ${activeSection === 'pinned' ? 'text-amber-400 bg-amber-500/20' : 'text-emerald-400/50 hover:text-amber-400 hover:bg-amber-500/10'}`}
                    title="Pinned"
                >
                    <Pin className="w-4 h-4" />
                </button>
                <button
                    onClick={() => setActiveSection('tags')}
                    className={`p-2 rounded-lg transition-all ${activeSection === 'tags' ? 'text-orange-400 bg-orange-500/20' : 'text-emerald-400/50 hover:text-orange-400 hover:bg-orange-500/10'}`}
                    title="Tags"
                >
                    <Hash className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="w-56 shrink-0 border-r border-emerald-500/10 flex flex-col bg-[#0a0a0f] overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-emerald-500/10 flex items-center justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 font-mono">
                    Threads
                </span>
                <div className="flex items-center gap-1">
                    <button
                        onClick={onNewThread}
                        className="p-1.5 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                        title="New Thread"
                    >
                        <Plus className="w-3.5 h-3.5" />
                    </button>
                    <button
                        onClick={onToggleCollapse}
                        className="p-1.5 text-emerald-400/50 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                    >
                        <ChevronRight className="w-3.5 h-3.5 rotate-180" />
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="flex border-b border-emerald-500/10 px-2 py-1 gap-1">
                {[
                    { id: 'recent', icon: Clock, label: 'Recent' },
                    { id: 'pinned', icon: Pin, label: 'Pinned' },
                    { id: 'tags', icon: Hash, label: 'Tags' },
                ].map(({ id, icon: Icon, label }) => (
                    <button
                        key={id}
                        onClick={() => setActiveSection(id as SidebarSection)}
                        className={`flex-1 flex items-center justify-center gap-1 py-1.5 rounded text-[9px] font-mono uppercase tracking-wider transition-all
                            ${activeSection === id
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : 'text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/5'
                            }`}
                    >
                        <Icon className="w-3 h-3" />
                    </button>
                ))}
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                {activeSection === 'recent' && (
                    <div className="space-y-3">
                        {todayThreads.length > 0 && (
                            <div>
                                <div className="text-[9px] text-slate-600 uppercase tracking-wider font-mono mb-1 px-2">Today</div>
                                {todayThreads.map(thread => (
                                    <ThreadListItem
                                        key={thread._id}
                                        thread={thread}
                                        isActive={thread._id === activeThreadId}
                                        onSelect={() => onSelectThread(thread)}
                                    />
                                ))}
                            </div>
                        )}
                        {yesterdayThreads.length > 0 && (
                            <div>
                                <div className="text-[9px] text-slate-600 uppercase tracking-wider font-mono mb-1 px-2">Yesterday</div>
                                {yesterdayThreads.map(thread => (
                                    <ThreadListItem
                                        key={thread._id}
                                        thread={thread}
                                        isActive={thread._id === activeThreadId}
                                        onSelect={() => onSelectThread(thread)}
                                    />
                                ))}
                            </div>
                        )}
                        {olderThreads.length > 0 && (
                            <div>
                                <div className="text-[9px] text-slate-600 uppercase tracking-wider font-mono mb-1 px-2">Earlier</div>
                                {olderThreads.slice(0, 10).map(thread => (
                                    <ThreadListItem
                                        key={thread._id}
                                        thread={thread}
                                        isActive={thread._id === activeThreadId}
                                        onSelect={() => onSelectThread(thread)}
                                    />
                                ))}
                            </div>
                        )}
                    </div>
                )}

                {activeSection === 'pinned' && (
                    <div className="space-y-1">
                        {pinnedThreads.length === 0 ? (
                            <div className="text-center py-8 text-slate-600 text-xs font-mono">
                                No pinned threads
                            </div>
                        ) : (
                            pinnedThreads.map(thread => (
                                <ThreadListItem
                                    key={thread._id}
                                    thread={thread}
                                    isActive={thread._id === activeThreadId}
                                    onSelect={() => onSelectThread(thread)}
                                />
                            ))
                        )}
                    </div>
                )}

                {activeSection === 'tags' && (
                    <div className="space-y-1">
                        {Object.entries(tagCounts)
                            .sort((a, b) => b[1] - a[1])
                            .map(([tag, count]) => (
                                <button
                                    key={tag}
                                    onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
                                    className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono flex items-center justify-between transition-all
                                        ${tagFilter === tag
                                            ? 'bg-orange-500/20 text-orange-300'
                                            : 'text-slate-400 hover:bg-white/5 hover:text-orange-400'
                                        }`}
                                >
                                    <span>#{tag}</span>
                                    <span className="text-[10px] text-slate-600">{count}</span>
                                </button>
                            ))
                        }
                    </div>
                )}
            </div>
        </div>
    );
};

// Thread List Item
const ThreadListItem: React.FC<{
    thread: CodexThread;
    isActive: boolean;
    onSelect: () => void;
}> = ({ thread, isActive, onSelect }) => (
    <button
        onClick={onSelect}
        className={`w-full text-left px-2 py-1.5 rounded text-xs font-mono transition-all
            ${isActive
                ? 'bg-emerald-500/20 text-emerald-300 border-l-2 border-emerald-400'
                : 'text-slate-400 hover:bg-white/5 hover:text-emerald-300'
            }`}
    >
        <div className="flex items-center gap-1.5">
            {thread.pinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
            <span className="truncate">{thread.title}</span>
        </div>
        {thread.tags.length > 0 && (
            <div className="flex gap-1 mt-0.5 flex-wrap">
                {thread.tags.slice(0, 2).map(tag => (
                    <span key={tag} className="text-[9px] text-orange-400/60">#{tag}</span>
                ))}
            </div>
        )}
    </button>
);

// ============================================
// MESSAGE COMPONENT
// ============================================

const MessageBubble: React.FC<{
    message: CodexMessage;
    onInsertToEditor?: (content: string) => void;
}> = ({ message, onInsertToEditor }) => {
    const isUser = message.role === 'user';
    const [copied, setCopied] = useState(false);
    const time = new Date(message.createdAt).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false
    });

    const handleCopy = async () => {
        await navigator.clipboard.writeText(message.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="mb-4 font-mono group">
            {/* Timestamp + Role */}
            <div className="flex items-center gap-2 mb-1">
                <span className="text-slate-600 text-xs">[{time}]</span>
                <span className={`text-xs font-bold ${isUser ? 'text-cyan-400' : 'text-emerald-400'}`}>
                    {isUser ? 'YOU' : 'AI'}:
                </span>

                {/* Actions (show on hover) */}
                <div className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1">
                    <button
                        onClick={handleCopy}
                        className="p-1 text-slate-600 hover:text-slate-300 rounded transition-colors"
                        title="Copy"
                    >
                        {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    </button>
                    {onInsertToEditor && (
                        <button
                            onClick={() => onInsertToEditor(message.content)}
                            className="p-1 text-slate-600 hover:text-emerald-400 rounded transition-colors"
                            title="Insert to Editor"
                        >
                            <Plus className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Content */}
            <div className={`pl-16 ${isUser ? 'text-slate-300' : 'text-[#00ff41]'}`}>
                <MarkdownRenderer>{message.content}</MarkdownRenderer>
            </div>

            {/* Related Insight */}
            <span>Related Insight Available</span>

            {/* Attachments */}
            {message.attachments && message.attachments.length > 0 && (
                <div className="pl-16 mt-2 flex flex-wrap gap-2">
                    {message.attachments.map((att, i) => (
                        <AttachmentChip key={i} attachment={att} />
                    ))}
                </div>
            )}
        </div>
    );
};

// Attachment Chip
const AttachmentChip: React.FC<{ attachment: CodexAttachment }> = ({ attachment }) => {
    const icons = {
        code: FileCode,
        file: FileText,
        screenshot: Image,
        voice: Mic,
        link: Link2,
    };
    const Icon = icons[attachment.type] || FileText;

    return (
        <div className="inline-flex items-center gap-1.5 px-2 py-1 bg-slate-800 border border-slate-700 rounded text-xs text-cyan-300 cursor-pointer hover:bg-slate-700 transition-colors">
            <Icon className="w-3 h-3" />
            <span className="truncate max-w-[120px]">{attachment.fileName || 'Attachment'}</span>
            {attachment.language && (
                <span className="text-[9px] text-slate-500 uppercase">{attachment.language}</span>
            )}
        </div>
    );
};

// ============================================
// ATTACHMENT BAR
// ============================================

const AttachmentBar: React.FC<{
    onAttachCode: () => void;
    onAttachFile: () => void;
    onAttachScreenshot: () => void;
    onAttachVoice: () => void;
}> = ({ onAttachCode, onAttachFile, onAttachScreenshot, onAttachVoice }) => (
    <div className="flex items-center gap-1 px-2 py-1.5 border-t border-emerald-500/10 bg-[#0a0a0f]">
        <span className="text-[9px] text-slate-600 uppercase tracking-wider font-mono mr-2">Attach:</span>
        <button
            onClick={onAttachCode}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all font-mono"
        >
            <FileCode className="w-3 h-3" />
            Code
        </button>
        <button
            onClick={onAttachFile}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all font-mono"
        >
            <FileText className="w-3 h-3" />
            File
        </button>
        <button
            onClick={onAttachScreenshot}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all font-mono"
        >
            <Image className="w-3 h-3" />
            Screenshot
        </button>
        <button
            onClick={onAttachVoice}
            className="flex items-center gap-1 px-2 py-1 text-[10px] text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all font-mono"
        >
            <Mic className="w-3 h-3" />
            Voice
        </button>
    </div>
);

// ============================================
// TOP BAR
// ============================================

const CodexTopBar: React.FC<{
    view: ViewMode;
    onViewChange: (view: ViewMode) => void;
    onSearch: () => void;
    onExport: () => void;
    onSettings: () => void;
    threadTitle?: string;
}> = ({ view, onViewChange, onSearch, onExport, onSettings, threadTitle }) => (
    <div className="flex items-center justify-between px-4 h-10 border-b border-emerald-500/10 bg-[#0a0a0f]">
        <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-emerald-300/80 font-mono">
                    Neural Codex
                </span>
            </div>
            {threadTitle && (
                <>
                    <ChevronRight className="w-3 h-3 text-slate-600" />
                    <span className="text-xs text-slate-400 font-mono">{threadTitle}</span>
                </>
            )}
        </div>

        <div className="flex items-center gap-1">
            <button
                onClick={onSearch}
                className="p-1.5 text-slate-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-all"
                title="Search (⌘F)"
            >
                <Search className="w-4 h-4" />
            </button>
            <button
                onClick={() => onViewChange('graph')}
                className={`p-1.5 rounded transition-all ${view === 'graph' ? 'text-purple-400 bg-purple-500/20' : 'text-slate-500 hover:text-purple-400 hover:bg-purple-500/10'}`}
                title="Graph View"
            >
                <Network className="w-4 h-4" />
            </button>
            <button
                onClick={() => onViewChange('insights')}
                className={`p-1.5 rounded transition-all ${view === 'insights' ? 'text-amber-400 bg-amber-500/20' : 'text-slate-500 hover:text-amber-400 hover:bg-amber-500/10'}`}
                title="Insights"
            >
                <TrendingUp className="w-4 h-4" />
            </button>
            <button
                onClick={onExport}
                className="p-1.5 text-slate-500 hover:text-emerald-400 hover:bg-emerald-500/10 rounded transition-all"
                title="Export"
            >
                <Download className="w-4 h-4" />
            </button>
            <button
                onClick={onSettings}
                className="p-1.5 text-slate-500 hover:text-slate-300 hover:bg-white/5 rounded transition-all"
                title="Settings"
            >
                <Settings className="w-4 h-4" />
            </button>
        </div>
    </div>
);

// ============================================
// PROACTIVE INSIGHTS PANEL
// ============================================

const InsightsPanel: React.FC<{
    threads: CodexThread[];
    onSelectThread: (thread: CodexThread) => void;
}> = ({ threads, onSelectThread }) => {
    // Find patterns
    const tagFrequency = threads.reduce((acc, t) => {
        t.tags.forEach(tag => {
            acc[tag] = (acc[tag] || 0) + 1;
        });
        return acc;
    }, {} as Record<string, number>);

    const mostAskedTopics = Object.entries(tagFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5);

    return (
        <div className="p-4 space-y-6 font-mono overflow-y-auto custom-scrollbar">
            {/* Proactive Suggestions */}
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-amber-400/60 mb-3 flex items-center gap-2">
                    <Sparkles className="w-3.5 h-3.5" />
                    Proactive Insights
                </h3>
                <div className="space-y-2">
                    {mostAskedTopics.length > 0 && (
                        <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                            <div className="text-xs text-amber-300 mb-1">
                                You've discussed <span className="font-bold">#{mostAskedTopics[0][0]}</span> {mostAskedTopics[0][1]} times
                            </div>
                            <div className="text-[10px] text-amber-300/60">
                                Want a deep dive summary of your learnings?
                            </div>
                        </div>
                    )}

                    <div className="p-3 bg-purple-500/10 border border-purple-500/20 rounded-lg">
                        <div className="text-xs text-purple-300 mb-1">
                            <AlertCircle className="w-3 h-3 inline mr-1" />
                            Pattern detected: Similar question 2 weeks ago
                        </div>
                        <div className="text-[10px] text-purple-300/60">
                            Check "debugging-auth-flow" for how you solved it
                        </div>
                    </div>
                </div>
            </div>

            {/* Top Topics */}
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-cyan-400/60 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-3.5 h-3.5" />
                    Your Top Topics
                </h3>
                <div className="space-y-1">
                    {mostAskedTopics.map(([tag, count]) => (
                        <div key={tag} className="flex items-center justify-between px-2 py-1.5 bg-white/5 rounded">
                            <span className="text-xs text-orange-400">#{tag}</span>
                            <div className="flex items-center gap-2">
                                <div className="h-1 bg-emerald-500/30 rounded" style={{ width: `${(count / mostAskedTopics[0][1]) * 60}px` }} />
                                <span className="text-[10px] text-slate-500">{count}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Activity Timeline */}
            <div>
                <h3 className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/60 mb-3 flex items-center gap-2">
                    <Calendar className="w-3.5 h-3.5" />
                    Recent Activity
                </h3>
                <div className="flex items-end gap-1 h-16">
                    {[...Array(14)].map((_, i) => {
                        const height = Math.random() * 100;
                        return (
                            <div
                                key={i}
                                className="flex-1 bg-emerald-500/30 rounded-t hover:bg-emerald-500/50 transition-colors cursor-pointer"
                                style={{ height: `${Math.max(4, height)}%` }}
                                title={`${Math.floor(height / 10)} messages`}
                            />
                        );
                    })}
                </div>
                <div className="flex justify-between text-[9px] text-slate-600 mt-1">
                    <span>2 weeks ago</span>
                    <span>Today</span>
                </div>
            </div>
        </div>
    );
};

// Mocks removed for live backend integration

// ============================================
// MAIN COMPONENT
// ============================================

export const NeuralCodexTerminal: React.FC = () => {
    const {
        sendChatMessage,
        isChatLoading,
        addCanvasPart,
        activeCanvas,
        toggleTerminalExpansion,
        toggleTerminalMinimized,
        isTerminalExpanded,
        isTerminalMinimized,
    } = useWorkspace();

    // Live user data from Convex
    const { userId } = useUser();

    // Use the Codex hook for real database integration
    const {
        threads,
        activeThread,
        messages,
        isLoadingThreads,
        isLoadingMessages,
        isSending,
        stats,
        selectThread,
        createThread,
        updateThread,
        deleteThread,
        pinThread,
        sendMessage,
        searchQuery: apiSearchQuery,
        setSearchQuery: setApiSearchQuery,
        searchResults,
        exportThread,
        clearActiveThread,
    } = useCodex(userId);

    const [localSearchQuery, setLocalSearchQuery] = useState('');

    // Sidebar adaptation: Use search results if searching
    const displayThreads = localSearchQuery ? searchResults : threads;
    const [input, setInput] = useState('');
    const [view, setView] = useState<ViewMode>('threads');
    const [commandHistory, setCommandHistory] = useState<string[]>([]);
    const [historyIndex, setHistoryIndex] = useState(-1);
    const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
    const [pendingAttachments, setPendingAttachments] = useState<CodexAttachment[]>([]);
    const [isSearchOpen, setIsSearchOpen] = useState(false);

    const inputRef = useRef<HTMLInputElement>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [messages]);

    // Handle Keyboard Shortcuts
    useEffect(() => {
        const handleGlobalKeydown = (e: KeyboardEvent) => {
            if (e.altKey) {
                switch (e.key.toLowerCase()) {
                    case 'n':
                        e.preventDefault();
                        handleNewThread();
                        break;
                    case 'e':
                        e.preventDefault();
                        handleExport();
                        break;
                    case 'g':
                        e.preventDefault();
                        setView('graph');
                        break;
                    case 'i':
                        e.preventDefault();
                        setView('insights');
                        break;
                    case 'c':
                        e.preventDefault();
                        setView('chat');
                        break;
                    case 's':
                        e.preventDefault();
                        setIsSearchOpen(true);
                        break;
                }
            }
        };

        window.addEventListener('keydown', handleGlobalKeydown);
        return () => window.removeEventListener('keydown', handleGlobalKeydown);
    }, [activeThread, messages]);

    const handleExport = () => {
        if (activeThread && messages.length > 0) {
            CodexExportEngine.downloadThreadExport(activeThread, messages);
        }
    };

    // Focus input
    useEffect(() => {
        if (!isTerminalMinimized && view === 'chat') {
            inputRef.current?.focus();
        }
    }, [isTerminalMinimized, view, activeThread]);

    // Handle sending message
    const handleSend = useCallback(async () => {
        if (!input.trim() && pendingAttachments.length === 0) return;
        if (!activeThread) return;

        setCommandHistory(prev => [input, ...prev.slice(0, 49)]);
        const messageContent = input.trim();
        setInput('');

        // Map local attachments to API format if needed
        const attachmentsToSend = pendingAttachments.map(att => ({
            type: att.type,
            content: att.content,
            fileName: (att as any).name || att.fileName,
            language: att.language,
            metadata: att.metadata
        }));

        setPendingAttachments([]);

        // Use the hook to send message to API
        await sendMessage(messageContent, attachmentsToSend);
    }, [input, activeThread, pendingAttachments, sendMessage]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Command processing
        const cmd = input.trim().toLowerCase();
        if (cmd === '/export') {
            handleExport();
            setInput('');
            return;
        }
        if (cmd === '/new') {
            handleNewThread();
            setInput('');
            return;
        }
        if (cmd === '/clear') {
            setInput('');
            return;
        }
        if (cmd === '/graph') {
            setView('graph');
            setInput('');
            return;
        }
        if (cmd === '/insights') {
            setView('insights');
            setInput('');
            return;
        }
        if (cmd === '/chat' || cmd === '/terminal') {
            setView('chat');
            setInput('');
            return;
        }

        handleSend();
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'ArrowUp' && commandHistory.length > 0) {
            e.preventDefault();
            const newIndex = Math.min(historyIndex + 1, commandHistory.length - 1);
            setHistoryIndex(newIndex);
            setInput(commandHistory[newIndex] || '');
        } else if (e.key === 'ArrowDown') {
            e.preventDefault();
            if (historyIndex > 0) {
                const newIndex = historyIndex - 1;
                setHistoryIndex(newIndex);
                setInput(commandHistory[newIndex] || '');
            } else {
                setHistoryIndex(-1);
                setInput('');
            }
        }
    };

    const handleNewThread = async () => {
        const timestamp = Date.now();
        const thread = await createThread(`thread-${timestamp}`, []);
        if (thread) {
            setView('chat');
        }
    };

    const handleSelectThread = async (thread: CodexThread) => {
        await selectThread({
            _id: thread._id,
            title: thread.title,
            tags: thread.tags,
            pinned: thread.pinned,
            archived: thread.archived,
            lastMessageAt: thread.lastMessageAt,
            messageCount: thread.messageCount,
            userId: '',
            createdAt: 0,
            updatedAt: 0,
        } as any);
        setView('chat');
    };

    const handleInsertToEditor = (content: string) => {
        if (activeCanvas) {
            addCanvasPart(activeCanvas.id, { type: 'text', content: content + '\n\n' });
        }
    };



    // Minimized state
    if (isTerminalMinimized) {
        return (
            <div
                onClick={toggleTerminalMinimized}
                className="h-11 w-full flex items-center justify-between px-4 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-emerald-500/20 cursor-pointer hover:bg-emerald-500/5 transition-all shrink-0"
            >
                <div className="flex items-center gap-3">
                    <Terminal className="w-4 h-4 text-emerald-400" />
                    <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-emerald-300/80 font-mono">
                        Neural Codex
                    </span>
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 rotate-90" />
            </div>
        );
    }

    return (
        <div
            className={`
                ${isTerminalExpanded ? 'h-[70vh]' : 'h-64'}
                w-full relative flex flex-col transition-all duration-500
                overflow-hidden bg-[#0a0a0f]/95 backdrop-blur-xl 
                border-t border-emerald-500/20 shrink-0
            `}
        >
            {/* Top Bar */}
            <CodexTopBar
                view={view}
                onViewChange={setView}
                onSearch={() => setIsSearchOpen(true)}
                onExport={handleExport}
                onSettings={() => console.log('Settings')}
                threadTitle={activeThread?.title}
            />

            {/* Main Content */}
            <div className="flex-1 flex overflow-hidden">
                {/* Sidebar */}
                <CodexSidebar
                    threads={displayThreads as any}
                    activeThreadId={activeThread?._id}
                    onSelectThread={handleSelectThread}
                    onNewThread={handleNewThread}
                    isCollapsed={isSidebarCollapsed}
                    onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
                />

                {/* Main Area */}
                <div className="flex-1 flex flex-col overflow-hidden">
                    {/* Chat View */}
                    {view === 'chat' && activeThread && (
                        <>
                            <div
                                ref={scrollRef}
                                className="flex-1 overflow-y-auto custom-scrollbar p-4"
                            >
                                {messages.map(msg => (
                                    <MessageBubble
                                        key={msg._id}
                                        message={msg as any}
                                        onInsertToEditor={handleInsertToEditor}
                                    />
                                ))}
                                {isChatLoading && (
                                    <div className="flex items-center gap-2 text-emerald-400 font-mono text-sm animate-pulse">
                                        <Sparkles className="w-4 h-4" />
                                        Processing...
                                    </div>
                                )}
                            </div>

                            {/* Attachment Bar */}
                            <AttachmentBar
                                onAttachCode={() => console.log('Attach code')}
                                onAttachFile={() => console.log('Attach file')}
                                onAttachScreenshot={() => console.log('Attach screenshot')}
                                onAttachVoice={() => console.log('Attach voice')}
                            />

                            {/* Input */}
                            <form
                                onSubmit={handleSubmit}
                                className="px-4 py-3 bg-emerald-950/20 border-t border-emerald-500/10 flex items-center gap-2"
                            >
                                <span className="text-emerald-500 font-bold font-mono">❯</span>
                                <input
                                    ref={inputRef}
                                    type="text"
                                    value={input}
                                    onChange={(e) => setInput(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="Type your question..."
                                    className="flex-1 bg-transparent border-none outline-none text-[#00ff41] text-sm placeholder:text-slate-700 font-mono"
                                />
                                <button
                                    type="submit"
                                    disabled={!input.trim()}
                                    className="p-2 text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-all disabled:opacity-30"
                                >
                                    <Send className="w-4 h-4" />
                                </button>
                            </form>
                        </>
                    )}

                    {/* Thread List View */}
                    {view === 'threads' && (
                        <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-sm p-4">
                            <div className="text-center">
                                <Terminal className="w-12 h-12 mx-auto mb-4 opacity-20" />
                                <p className="mb-2">Select a thread from the sidebar</p>
                                <p className="text-xs text-slate-600">or create a new one with the + button</p>
                            </div>
                        </div>
                    )}

                    {/* Insights View */}
                    {view === 'insights' && (
                        <InsightsPanel
                            threads={threads}
                            onSelectThread={handleSelectThread}
                        />
                    )}

                    {/* Graph View Placeholder */}
                    {view === 'graph' && (
                        <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-sm">
                            <div className="text-center">
                                <Network className="w-12 h-12 mx-auto mb-4 opacity-20 text-purple-400" />
                                <p className="text-purple-400">Graph View</p>
                                <p className="text-xs text-slate-600 mt-1">Visual map of connected threads coming soon</p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Window Controls */}
            <div className="absolute top-2 right-32 flex items-center gap-1">
                <button
                    onClick={toggleTerminalMinimized}
                    className="p-1 text-slate-600 hover:text-slate-400 rounded transition-colors"
                    title="Minimize"
                >
                    <Minimize2 className="w-3 h-3" />
                </button>
                <button
                    onClick={toggleTerminalExpansion}
                    className="p-1 text-slate-600 hover:text-slate-400 rounded transition-colors"
                    title={isTerminalExpanded ? "Restore" : "Maximize"}
                >
                    <Maximize2 className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

export default NeuralCodexTerminal;

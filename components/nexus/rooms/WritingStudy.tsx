/**
 * WritingStudy - DIGITAL GARDEN AESTHETIC (Themed)
 * 
 * "THE QUIET STUDY"
 * Supports Sunlit and Moonlit modes.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Feather, Bold, Italic, List, Quote, Image as ImageIcon,
    Save, Cloud, Clock, Sparkles, AlignLeft, Heading1, Heading2
} from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';

interface WritingStudyProps {
    nodeId: string;
}

export const WritingStudy: React.FC<WritingStudyProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const { isZenMode, isDarkMode } = useNexusStore();
    const data = node?.data as any;

    const [content, setContent] = useState(data?.content || '');
    const [title, setTitle] = useState(data?.title || '');
    const [wordCount, setWordCount] = useState(0);
    const [showAI, setShowAI] = useState(false);
    const [lastSaved, setLastSaved] = useState<Date | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Journal State
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    const journalPath = `journal/Journal_${today}.md`;

    useEffect(() => {
        setWordCount(content.trim().split(/\s+/).filter((w: any) => w.length > 0).length);
    }, [content]);

    // Initial Load - Check for today's journal
    useEffect(() => {
        loadDailyJournal();
    }, []);

    // Auto-save on Ctrl+S
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                saveJournal();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [content, title]);

    const loadDailyJournal = async () => {
        try {
            const FSS = await import('../../../services/FileSystemService').then(m => m.FileSystemService);
            const fileContent = await FSS.readFile(journalPath);

            // Parse frontmatter if exists (simple implementation)
            const parts = fileContent.split('---');
            if (parts.length >= 3) {
                // Heuristic: basic frontmatter parsing
                const frontmatter = parts[1];
                const body = parts.slice(2).join('---').trim();

                const titleMatch = frontmatter.match(/title:\s*(.*)/);
                if (titleMatch) setTitle(titleMatch[1]);
                setContent(body);
            } else {
                setContent(fileContent);
            }
            setLastSaved(new Date());
        } catch (error) {
            // File doesn't exist? Use default/template
            console.log("No journal entry for today, using template.");
            setTitle('Daily Entry');
            if (!content) {
                setContent(`# ${new Date().toLocaleDateString()}\n\nToday's thoughts...`);
            }
        }
    };

    const saveJournal = async () => {
        setIsSaving(true);
        try {
            const FSS = await import('../../../services/FileSystemService').then(m => m.FileSystemService);

            // Create simple frontmatter
            const fullContent = `---
title: ${title || 'Untitled'}
date: ${today}
type: journal
---

${content}`;

            await FSS.writeFile(journalPath, fullContent);
            setLastSaved(new Date());

            // Also update node data in store so it persists in graph state temporarily
            useNexusStore.getState().updateNode(nodeId, {
                content,
                title,
                lastModified: Date.now()
            });

        } catch (error) {
            console.error("Failed to save journal:", error);
        } finally {
            setIsSaving(false);
        }
    };

    // Daily goal simulation
    const dailyGoal = 500;
    const progress = Math.min((wordCount / dailyGoal) * 100, 100);

    // Theme Variables
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]'
        : 'bg-gradient-to-br from-stone-100 via-amber-50/40 to-rose-50/30';

    return (
        <div className={`h-full w-full ${bgClass} p-4 md:p-6 overflow-hidden transition-colors duration-500`}>

            <div className="h-full flex gap-4">

                {/* CENTER: Writing Canvas */}
                <div className="flex-1 min-w-0">
                    <GlassCard className="h-full flex flex-col" accent isDark={isDarkMode}>
                        {/* Toolbar */}
                        <AnimatePresence>
                            {!isZenMode && (
                                <motion.div
                                    className={`px-4 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}
                                    initial={{ y: -50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: -50, opacity: 0 }}
                                >
                                    <div className="flex items-center gap-1">
                                        <FormatBtn icon={Bold} isDark={isDarkMode} />
                                        <FormatBtn icon={Italic} isDark={isDarkMode} />
                                        <div className={`w-px h-5 mx-2 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-stone-200'}`} />
                                        <FormatBtn icon={Heading1} isDark={isDarkMode} />
                                        <FormatBtn icon={Heading2} isDark={isDarkMode} />
                                        <div className={`w-px h-5 mx-2 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-stone-200'}`} />
                                        <FormatBtn icon={List} isDark={isDarkMode} />
                                        <FormatBtn icon={Quote} isDark={isDarkMode} />
                                        <FormatBtn icon={ImageIcon} isDark={isDarkMode} />
                                    </div>

                                    <div className="flex items-center gap-3">
                                        <button
                                            onClick={() => setShowAI(!showAI)}
                                            className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-sm transition-all border
                                                ${showAI
                                                    ? (isDarkMode ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-violet-100 border-violet-200 text-violet-700')
                                                    : (isDarkMode ? 'border-transparent text-zinc-500 hover:bg-white/[0.06]' : 'border-transparent text-stone-500 hover:bg-stone-100')
                                                }`}
                                        >
                                            <Sparkles className="w-4 h-4" />
                                            <span className="font-medium">AI</span>
                                        </button>
                                        <button
                                            onClick={saveJournal}
                                            disabled={isSaving}
                                            className={`flex items-center gap-2 px-4 py-1.5 rounded-xl text-sm font-medium transition-colors shadow-lg
                                            ${isDarkMode
                                                    ? 'bg-zinc-800 text-zinc-200 hover:bg-zinc-700'
                                                    : 'bg-stone-800 text-white hover:bg-stone-700'
                                                } ${isSaving ? 'opacity-50 cursor-wait' : ''}`}>
                                            <Save className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
                                            {isSaving ? 'Saving...' : 'Save'}
                                        </button>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* Writing Area */}
                        <div className="flex-1 overflow-auto">
                            <div className={`max-w-2xl mx-auto py-12 px-8 transition-all duration-300 ${isZenMode ? 'scale-105' : ''}`}>
                                {/* Title */}
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    placeholder="Untitled"
                                    className={`w-full bg-transparent text-4xl md:text-5xl font-serif font-medium focus:outline-none mb-2
                                        ${isDarkMode ? 'text-zinc-200 placeholder:text-zinc-600' : 'text-stone-800 placeholder:text-stone-300'}`}
                                />

                                {/* Meta Line */}
                                <div className={`flex items-center gap-3 mb-10 text-sm ${isDarkMode ? 'text-zinc-500' : 'text-stone-400'}`}>
                                    <span>{new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })}</span>
                                    <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-zinc-600' : 'bg-stone-300'}`} />
                                    <span>{wordCount} words</span>
                                    {wordCount >= dailyGoal && (
                                        <>
                                            <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-zinc-600' : 'bg-stone-300'}`} />
                                            <span className="text-emerald-500 font-medium">🎉 Goal reached!</span>
                                        </>
                                    )}
                                </div>

                                {/* Content */}
                                <textarea
                                    value={content}
                                    onChange={(e) => setContent(e.target.value)}
                                    placeholder="Begin writing..."
                                    className={`w-full min-h-[400px] bg-transparent text-lg leading-relaxed resize-none focus:outline-none font-serif
                                        ${isDarkMode ? 'text-zinc-300 placeholder:text-zinc-700' : 'text-stone-700 placeholder:text-stone-300'}`}
                                    spellCheck={false}
                                />
                            </div>
                        </div>

                        {/* Status Bar */}
                        <AnimatePresence>
                            {!isZenMode && (
                                <motion.div
                                    className={`px-6 py-3 border-t flex items-center justify-between
                                        ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-stone-200/50 bg-white/30'}`}
                                    initial={{ y: 50, opacity: 0 }}
                                    animate={{ y: 0, opacity: 1 }}
                                    exit={{ y: 50, opacity: 0 }}
                                >
                                    <div className="flex items-center gap-4">
                                        <span className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-zinc-500' : 'text-stone-500'}`}>
                                            <Cloud className={`w-3.5 h-3.5 ${lastSaved ? 'text-emerald-500' : 'text-slate-400'}`} />
                                            {lastSaved ? 'Saved to journal' : 'Not saved'}
                                        </span>
                                        {lastSaved && (
                                            <span className={`flex items-center gap-1.5 text-xs ${isDarkMode ? 'text-zinc-600' : 'text-stone-400'}`}>
                                                <Clock className="w-3.5 h-3.5" />
                                                {lastSaved.toLocaleTimeString()}
                                            </span>
                                        )}
                                    </div>

                                    {/* Daily Goal Progress */}
                                    <div className="flex items-center gap-3">
                                        <span className={`text-xs ${isDarkMode ? 'text-zinc-600' : 'text-stone-500'}`}>Daily Goal</span>
                                        <div className={`w-32 h-2 rounded-full overflow-hidden ${isDarkMode ? 'bg-white/[0.1]' : 'bg-stone-200'}`}>
                                            <div
                                                className="h-full bg-gradient-to-r from-amber-400 to-rose-400 rounded-full transition-all duration-500"
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                        <span className={`text-xs font-medium ${isDarkMode ? 'text-zinc-400' : 'text-stone-600'}`}>{wordCount}/{dailyGoal}</span>
                                    </div>
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </GlassCard>
                </div>

                {/* RIGHT: AI Writing Assistant */}
                <AnimatePresence>
                    {!isZenMode && showAI && (
                        <motion.div
                            className="w-80 shrink-0"
                            initial={{ x: 320, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 320, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <GlassCard className="h-full flex flex-col" isDark={isDarkMode}>
                                <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}>
                                    <Feather className={`w-4 h-4 ${isDarkMode ? 'text-indigo-400' : 'text-violet-500'}`} />
                                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-stone-700'}`}>Writing Coach</span>
                                </div>

                                <div className="flex-1 overflow-auto p-4 space-y-4">
                                    {/* Suggestion Cards */}
                                    <SuggestionCard
                                        type="improve"
                                        title="Strengthen your opening"
                                        description="Consider starting with a more vivid scene to hook your reader."
                                        isDark={isDarkMode}
                                    />
                                    <SuggestionCard
                                        type="idea"
                                        title="Expand on this theme"
                                        description="You mention 'recursive architecture' — explore how it relates to your main argument."
                                        isDark={isDarkMode}
                                    />
                                    <SuggestionCard
                                        type="tone"
                                        title="Tone check"
                                        description="Your writing feels clear and academic. Perfect for research documentation."
                                        isDark={isDarkMode}
                                    />
                                </div>

                                <div className={`p-4 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-stone-200/50 bg-white/30'}`}>
                                    <input
                                        type="text"
                                        placeholder="Ask for writing help..."
                                        className={`w-full px-4 py-2.5 rounded-xl text-sm focus:outline-none focus:ring-2 border
                                            ${isDarkMode
                                                ? 'bg-[#151518] border-white/[0.1] text-zinc-300 focus:ring-indigo-500/50 placeholder:text-zinc-600'
                                                : 'bg-white/80 border-stone-200 text-stone-700 focus:ring-violet-300 placeholder:text-stone-400'
                                            }`}
                                    />
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

const GlassCard = ({ children, className = '', accent = false, isDark = false }: any) => (
    <div className={`
        relative backdrop-blur-xl rounded-2xl border transition-colors duration-500
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        ${isDark
            ? 'bg-[#151518]/70 border-white/[0.06]'
            : 'bg-white/70 border-white/80'
        }
        ${accent && isDark ? 'ring-1 ring-amber-500/10' : ''}
        ${accent && !isDark ? 'ring-1 ring-amber-200/50' : ''}
        ${className}
    `}>
        {/* Bracket Connectors - POINTER EVENTS NONE FIX */}
        <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-r-0 rounded-l-full opacity-50 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-amber-600/50' : 'border-amber-300'}`}
        />
        <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-l-0 rounded-r-full opacity-50 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-amber-600/50' : 'border-amber-300'}`}
        />
        <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
);

const FormatBtn = ({ icon: Icon, isDark }: any) => (
    <button className={`p-2 rounded-lg transition-all
        ${isDark
            ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]'
            : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
        }`}>
        <Icon className="w-4 h-4" />
    </button>
);

const SuggestionCard = ({ type, title, description, isDark }: any) => {
    const icons: any = {
        improve: '✨',
        idea: '💡',
        tone: '🎨',
    };

    // Theme Colors
    const getColors = () => {
        if (isDark) {
            switch (type) {
                case 'improve': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200';
                case 'idea': return 'bg-amber-500/10 border-amber-500/20 text-amber-200';
                case 'tone': return 'bg-rose-500/10 border-rose-500/20 text-rose-200';
                default: return '';
            }
        } else {
            switch (type) {
                case 'improve': return 'bg-violet-50 border-violet-200 text-stone-700';
                case 'idea': return 'bg-amber-50 border-amber-200 text-stone-700';
                case 'tone': return 'bg-rose-50 border-rose-200 text-stone-700';
                default: return '';
            }
        }
    }

    return (
        <div className={`p-4 rounded-xl border ${getColors()}`}>
            <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{icons[type]}</span>
                <h4 className={`text-sm font-semibold ${isDark ? 'text-zinc-200' : 'text-stone-700'}`}>{title}</h4>
            </div>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-zinc-400' : 'text-stone-600'}`}>{description}</p>
        </div>
    );
};

export default WritingStudy;

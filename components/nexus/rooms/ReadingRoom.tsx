/**
 * ReadingRoom - DIGITAL GARDEN AESTHETIC (Themed)
 * 
 * "THE READING NOOK"
 * Supports Sunlit and Moonlit modes.
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    BookOpen, Search, Bookmark, Heart, Share2,
    Clock, FileText, Highlighter, MessageSquare,
    ChevronRight, Sparkles, ExternalLink
} from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';

interface ReadingRoomProps {
    nodeId: string;
}

export const ReadingRoom: React.FC<ReadingRoomProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const { isZenMode, isDarkMode } = useNexusStore();
    const data = node?.data as any;

    const [documents, setDocuments] = useState<any[]>([]);
    const [activeDoc, setActiveDoc] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [content, setContent] = useState<string>('');
    const [pdfUrl, setPdfUrl] = useState<string | null>(null);

    // Initial Load
    React.useEffect(() => {
        loadDocuments();
    }, []);

    const loadDocuments = async () => {
        try {
            setLoading(true);
            // List files in 'documents' folder relative to root
            // If it fails, it might be because the folder doesn't exist, handle gracefully
            const files = await import('../../../services/FileSystemService').then(m => m.FileSystemService.listFiles('documents'));

            // Filter for readable files
            const readableFiles = files.filter((f: any) =>
                f.name.endsWith('.pdf') ||
                f.name.endsWith('.md') ||
                f.name.endsWith('.txt')
            );

            setDocuments(readableFiles);

            // Auto-select first file if available
            if (readableFiles.length > 0 && !activeDoc) {
                handleSelectDoc(readableFiles[0]);
            }
        } catch (error) {
            console.error("Failed to load documents:", error);
            // Don't show critical error, just empty state
        } finally {
            setLoading(false);
        }
    };

    const handleSelectDoc = async (doc: any) => {
        setActiveDoc(doc);
        setPdfUrl(null);
        setContent('');

        try {
            const FSS = await import('../../../services/FileSystemService').then(m => m.FileSystemService);

            if (doc.name.endsWith('.pdf')) {
                // Get served URL
                const url = FSS.getFileUrl(doc.path);
                setPdfUrl(url);
            } else {
                // Read text content
                const text = await FSS.readFile(doc.path);
                setContent(text);
            }
        } catch (error) {
            console.error("Failed to read file:", error);
            setContent("Error loading file content.");
        }
    };

    // Theme Variables
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]'
        : 'bg-gradient-to-br from-amber-50/50 via-stone-50 to-rose-50/30';

    return (
        <div className={`h-full w-full ${bgClass} p-4 md:p-6 overflow-hidden transition-colors duration-500`}>

            <div className="h-full flex gap-4">

                {/* LEFT: Library Sidebar */}
                <AnimatePresence>
                    {!isZenMode && showLibrary && (
                        <motion.div
                            className="w-72 shrink-0"
                            initial={{ x: -300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: -300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <GlassCard className="h-full flex flex-col" isDark={isDarkMode}>
                                {/* Search */}
                                <div className={`p-4 border-b ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}>
                                    <div className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-colors
                                        ${isDarkMode ? 'bg-white/[0.06]' : 'bg-stone-100/80'}`}>
                                        <Search className={`w-4 h-4 ${isDarkMode ? 'text-zinc-500' : 'text-stone-400'}`} />
                                        <input
                                            type="text"
                                            placeholder="Search library..."
                                            className={`flex-1 bg-transparent text-sm focus:outline-none 
                                                ${isDarkMode ? 'placeholder:text-zinc-600 text-zinc-300' : 'placeholder:text-stone-400 text-stone-700'}`}
                                        />
                                    </div>
                                </div>

                                {/* Reading List */}
                                <div className="flex-1 overflow-auto p-3 space-y-2">
                                    <span className={`px-2 text-xs font-semibold uppercase tracking-wider ${isDarkMode ? 'text-zinc-600' : 'text-stone-500'}`}>Documents</span>

                                    {loading ? (
                                        <div className="px-4 py-4 text-xs opacity-50">Scanning archives...</div>
                                    ) : documents.length === 0 ? (
                                        <div className="px-4 py-8 text-center">
                                            <p className="text-xs opacity-50 mb-2">No documents found.</p>
                                            <p className="text-[10px] opacity-40">Place .pdf or .md files in the /documents folder.</p>
                                        </div>
                                    ) : (
                                        documents.map((doc) => (
                                            <LibraryItem
                                                key={doc.path}
                                                title={doc.name}
                                                author={doc.name.endsWith('.pdf') ? 'PDF Document' : 'Manuscript'}
                                                active={activeDoc?.path === doc.path}
                                                isDark={isDarkMode}
                                                onClick={() => handleSelectDoc(doc)}
                                            />
                                        ))
                                    )}
                                </div>

                                {/* Stats */}
                                <div className={`p-4 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-stone-200/50 bg-white/30'}`}>
                                    <div className="flex items-center justify-between text-xs">
                                        <span className={isDarkMode ? 'text-zinc-500' : 'text-stone-500'}>📚 {documents.length} items</span>
                                        <button onClick={loadDocuments} className={`font-medium hover:underline ${isDarkMode ? 'text-indigo-400' : 'text-violet-600'}`}>Refresh</button>
                                    </div>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* CENTER: Reader */}
                <div className="flex-1 min-w-0">
                    <GlassCard className="h-full flex flex-col" accent isDark={isDarkMode}>
                        {/* Header */}
                        <div className={`px-6 py-4 border-b flex items-center justify-between ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}>
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-violet-400 to-rose-400 rounded-xl flex items-center justify-center shadow-lg">
                                    <BookOpen className="w-5 h-5 text-white" />
                                </div>
                                <div>
                                    <h1 className={`text-lg font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-stone-800'}`}>{activeDoc?.name || "Select a Document"}</h1>
                                    <p className={`text-sm ${isDarkMode ? 'text-zinc-500' : 'text-stone-500'}`}>
                                        {activeDoc ? (activeDoc.name.endsWith('.pdf') ? 'Binary View' : 'Text View') : 'Library Index'}
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-2">
                                <ToolBtn icon={Highlighter} isDark={isDarkMode} />
                                <ToolBtn icon={Bookmark} isDark={isDarkMode} />
                                <ToolBtn icon={Heart} isDark={isDarkMode} />
                                <div className={`w-px h-5 mx-1 ${isDarkMode ? 'bg-white/[0.06]' : 'bg-stone-200'}`} />
                                <ToolBtn icon={MessageSquare} onClick={() => setShowNotes(!showNotes)} active={showNotes} isDark={isDarkMode} />
                            </div>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-hidden relative">
                            {previewContent()}
                        </div>
                    </GlassCard>
                </div>

                {/* RIGHT: Notes Panel */}
                <AnimatePresence>
                    {!isZenMode && showNotes && (
                        <motion.div
                            className="w-72 shrink-0"
                            initial={{ x: 300, opacity: 0 }}
                            animate={{ x: 0, opacity: 1 }}
                            exit={{ x: 300, opacity: 0 }}
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <GlassCard className="h-full flex flex-col" isDark={isDarkMode}>
                                <div className={`px-4 py-3 border-b flex items-center gap-2 ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}>
                                    <Sparkles className="w-4 h-4 text-amber-500" />
                                    <span className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-300' : 'text-stone-700'}`}>Notes & Highlights</span>
                                </div>

                                <div className="flex-1 overflow-auto p-4 space-y-3">
                                    <NoteCard color="yellow" text="Use the toolbar to highlight key sections." isDark={isDarkMode} />
                                </div>

                                <div className={`p-3 border-t ${isDarkMode ? 'border-white/[0.06] bg-black/20' : 'border-stone-200/50 bg-white/30'}`}>
                                    <button className={`w-full py-2 text-sm rounded-lg transition-colors font-medium
                                        ${isDarkMode ? 'text-indigo-400 hover:bg-indigo-500/10' : 'text-violet-600 hover:bg-violet-50'}`}>
                                        + Add Note
                                    </button>
                                </div>
                            </GlassCard>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );

    function previewContent() {
        if (!activeDoc) {
            return (
                <div className="flex flex-col items-center justify-center h-full opacity-30">
                    <BookOpen className="w-16 h-16 mb-4" />
                    <p>Select a document from the library</p>
                </div>
            );
        }

        if (pdfUrl) {
            return (
                <iframe
                    src={pdfUrl}
                    className="w-full h-full border-none"
                    title="PDF Viewer"
                />
            );
        }

        return (
            <article className="max-w-2xl mx-auto py-10 px-8 h-full overflow-auto">
                <div className={`prose max-w-none ${isDarkMode ? 'prose-invert text-zinc-300' : 'prose-stone text-stone-700'}`}>
                    <pre className="whitespace-pre-wrap font-sans text-base leading-relaxed">
                        {content}
                    </pre>
                </div>
            </article>
        );
    }
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
        ${accent && isDark ? 'ring-1 ring-indigo-500/20' : ''}
        ${accent && !isDark ? 'ring-1 ring-violet-200/50' : ''}
        ${className}
    `}>
        {/* Bracket Connectors - POINTER EVENTS NONE FIX */}
        <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-r-0 rounded-l-full opacity-60 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-indigo-500' : 'border-rose-300'}`}
        />
        <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-l-0 rounded-r-full opacity-60 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-indigo-500' : 'border-rose-300'}`}
        />
        <div className="relative z-10 h-full flex flex-col">{children}</div>
    </div>
);

const LibraryItem = ({ title, author, active, bookmarked, isDark }: any) => (
    <div className={`p-3 rounded-xl cursor-pointer transition-all border 
        ${active
            ? (isDark ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-violet-100 border-violet-200')
            : (isDark ? 'bg-transparent border-transparent hover:bg-white/[0.04]' : 'bg-transparent border-transparent hover:bg-stone-100')
        }`}>
        <div className="flex items-start justify-between">
            <div>
                <h4 className={`text-sm font-medium ${active ? (isDark ? 'text-indigo-300' : 'text-violet-800') : (isDark ? 'text-zinc-300' : 'text-stone-700')}`}>{title}</h4>
                <p className={`text-xs mt-0.5 ${isDark ? 'text-zinc-500' : 'text-stone-500'}`}>{author}</p>
            </div>
            {bookmarked && <Bookmark className="w-4 h-4 text-amber-500 fill-amber-500" />}
        </div>
    </div>
);

const ToolBtn = ({ icon: Icon, onClick, active, isDark }: any) => (
    <button
        onClick={onClick}
        className={`p-2 rounded-xl transition-all 
            ${active
                ? (isDark ? 'bg-indigo-500/20 text-indigo-400' : 'bg-violet-100 text-violet-600')
                : (isDark ? 'text-zinc-500 hover:text-zinc-300 hover:bg-white/[0.06]' : 'text-stone-400 hover:text-stone-600 hover:bg-stone-100')
            }`}
    >
        <Icon className="w-4 h-4" />
    </button>
);

const NoteCard = ({ color, text, isDark }: any) => {
    // Map abstract colors to specific theme classes
    const getColors = () => {
        if (isDark) {
            switch (color) {
                case 'yellow': return 'bg-amber-500/10 border-amber-500/20 text-amber-200';
                case 'violet': return 'bg-indigo-500/10 border-indigo-500/20 text-indigo-200';
                case 'rose': return 'bg-rose-500/10 border-rose-500/20 text-rose-200';
                default: return 'bg-zinc-800 border-zinc-700 text-zinc-300';
            }
        } else {
            switch (color) {
                case 'yellow': return 'bg-amber-50 border-amber-200 text-stone-700';
                case 'violet': return 'bg-violet-50 border-violet-200 text-stone-700';
                case 'rose': return 'bg-rose-50 border-rose-200 text-stone-700';
                default: return 'bg-white border-stone-200 text-stone-700';
            }
        }
    };

    return (
        <div className={`p-3 rounded-xl border ${getColors()}`}>
            <p className="text-sm leading-relaxed">{text}</p>
        </div>
    );
};

export default ReadingRoom;

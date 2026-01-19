/**
 * ArchitectWorkspace - The Fractal Interior
 * 
 * This is the "deep dive" view shown when a user enters an Architect Node.
 * Implements a 3-panel layout:
 * - Left: Context (Files, Sub-nodes)
 * - Center: The Spec Editor (Notion-lite)
 * - Right: Properties/Metadata
 * 
 * Adheres to "Glass & Steel" design:
 * - Matte dark panels
 * - Hairline dividers
 * - Refined typography
 */

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    ArrowLeft, FolderKanban, FileText, Link2, Layers,
    Check, Circle, Edit3
} from 'lucide-react';
import { useNexusStore, ArchitectNodeData } from '@/stores/useNexusStore';

export const ArchitectWorkspace: React.FC = () => {
    const { focusedNodeId, getNodeById, exitRoom, updateNode } = useNexusStore();
    const node = focusedNodeId ? getNodeById(focusedNodeId) : null;
    const data = node?.data as ArchitectNodeData | undefined;

    const [specs, setSpecs] = useState(data?.specs || '');
    const [title, setTitle] = useState(data?.title || 'Untitled Workspace');
    const [isEditingTitle, setIsEditingTitle] = useState(false);

    // Save specs on blur
    const handleSaveSpecs = () => {
        if (focusedNodeId) {
            updateNode(focusedNodeId, { specs });
        }
    };

    const handleSaveTitle = () => {
        if (focusedNodeId) {
            updateNode(focusedNodeId, { title });
        }
        setIsEditingTitle(false);
    };

    if (!node || !data) {
        return (
            <div className="flex items-center justify-center h-full bg-slate-950 text-slate-500">
                No workspace selected.
            </div>
        );
    }

    const statusOptions: Array<{ value: 'draft' | 'active' | 'complete'; label: string; color: string }> = [
        { value: 'draft', label: 'Draft', color: 'bg-zinc-500' },
        { value: 'active', label: 'In Progress', color: 'bg-amber-500' },
        { value: 'complete', label: 'Complete', color: 'bg-emerald-500' },
    ];

    return (
        <motion.div
            className="h-full w-full bg-slate-950 flex flex-col"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
        >
            {/* Header Bar */}
            <header className="h-14 flex items-center gap-4 px-6 border-b border-white/5 bg-slate-900/50 backdrop-blur-sm shrink-0">
                <button
                    onClick={exitRoom}
                    className="p-2 -ml-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                    title="Exit Workspace"
                >
                    <ArrowLeft className="w-5 h-5" />
                </button>

                <div className="h-6 w-px bg-white/10" />

                <FolderKanban className="w-5 h-5 text-slate-500" />

                {isEditingTitle ? (
                    <input
                        type="text"
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        onBlur={handleSaveTitle}
                        onKeyDown={(e) => e.key === 'Enter' && handleSaveTitle()}
                        className="text-lg font-semibold text-white bg-transparent border-b border-slate-600 focus:border-slate-400 outline-none px-1"
                        autoFocus
                    />
                ) : (
                    <h1
                        onClick={() => setIsEditingTitle(true)}
                        className="text-lg font-semibold text-white cursor-text hover:text-slate-300 transition-colors"
                    >
                        {title}
                    </h1>
                )}

                <div className="ml-auto flex items-center gap-3">
                    {statusOptions.map((opt) => (
                        <button
                            key={opt.value}
                            onClick={() => {
                                if (focusedNodeId) updateNode(focusedNodeId, { status: opt.value });
                            }}
                            className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${data.status === opt.value
                                    ? 'bg-white/10 text-white'
                                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                        >
                            <span className={`w-2 h-2 rounded-full ${opt.color}`} />
                            {opt.label}
                        </button>
                    ))}
                </div>
            </header>

            {/* Main Content Area */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left Panel: Context */}
                <aside className="w-64 border-r border-white/5 bg-slate-900/30 p-4 shrink-0 hidden md:block">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-3">Linked Items</h3>
                    {data.linkedFilePath ? (
                        <div className="flex items-center gap-2 px-3 py-2 bg-slate-800/50 rounded-lg text-sm text-slate-300">
                            <Link2 className="w-4 h-4 text-slate-500" />
                            <span className="font-mono truncate">{data.linkedFilePath}</span>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-600 italic">No files linked.</p>
                    )}

                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mt-6 mb-3">Nested Nodes</h3>
                    {data.childNodeIds && data.childNodeIds.length > 0 ? (
                        <ul className="space-y-1">
                            {data.childNodeIds.map((id) => (
                                <li key={id} className="flex items-center gap-2 px-3 py-2 bg-slate-800/30 rounded-lg text-sm text-slate-400">
                                    <Layers className="w-4 h-4" /> <span className="truncate">{id}</span>
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm text-slate-600 italic">No nested items.</p>
                    )}
                </aside>

                {/* Center: Spec Editor */}
                <main className="flex-1 p-8 overflow-y-auto">
                    <div className="max-w-3xl mx-auto">
                        <div className="flex items-center gap-2 text-slate-400 mb-4">
                            <FileText className="w-4 h-4" />
                            <span className="text-sm font-medium">Specification</span>
                        </div>
                        <textarea
                            value={specs}
                            onChange={(e) => setSpecs(e.target.value)}
                            onBlur={handleSaveSpecs}
                            placeholder="Write your specifications, user stories, and notes here...

Use markdown for formatting:
# Heading
- Bullet point
**Bold text**"
                            className="w-full min-h-[400px] bg-transparent text-slate-200 text-base leading-relaxed placeholder:text-slate-600 resize-none focus:outline-none font-sans"
                        />
                    </div>
                </main>

                {/* Right Panel: Properties */}
                <aside className="w-72 border-l border-white/5 bg-slate-900/30 p-5 shrink-0 hidden lg:block">
                    <h3 className="text-xs font-medium text-slate-500 uppercase tracking-wide mb-4">Properties</h3>

                    <div className="space-y-4">
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Node ID</label>
                            <p className="text-sm text-slate-300 font-mono truncate">{focusedNodeId}</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Type</label>
                            <p className="text-sm text-slate-300">Architect Workspace</p>
                        </div>
                        <div>
                            <label className="text-xs text-slate-500 block mb-1">Linked Path</label>
                            <input
                                type="text"
                                value={data.linkedFilePath || ''}
                                onChange={(e) => {
                                    if (focusedNodeId) updateNode(focusedNodeId, { linkedFilePath: e.target.value });
                                }}
                                placeholder="/src/components/..."
                                className="w-full px-3 py-2 bg-slate-800/50 border border-white/5 rounded-lg text-sm text-slate-300 placeholder:text-slate-600 focus:outline-none focus:border-slate-600"
                            />
                        </div>
                    </div>
                </aside>
            </div>
        </motion.div>
    );
};

export default ArchitectWorkspace;

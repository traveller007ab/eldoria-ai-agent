/**
 * NexusLayout - The Main Container for the Research Nexus
 * 
 * This component orchestrates:
 * - The Mind Canvas (infinite workspace)
 * - Focus Room transitions (Engine Room, Reading Room, etc.)
 * - Global Nexus controls and navigation
 */

import React, { useState } from 'react';
import { ReactFlowProvider } from 'reactflow';
import {
    Compass, Search, Settings, Grid3X3, Home, Layers
} from 'lucide-react';
import { MindCanvas } from './MindCanvas';
import { useNexusStore, ViewMode } from '../../stores/useNexusStore';
import { NavLink } from 'react-router-dom';

// Focus Room Components (lazy loaded)
const EngineRoom = React.lazy(() => import('./rooms/EngineRoom'));
const ReadingRoom = React.lazy(() => import('./rooms/ReadingRoom'));
const WritingStudy = React.lazy(() => import('./rooms/WritingStudy'));
const CodexLab = React.lazy(() => import('./rooms/CodexLab'));

import { WorkspaceManager } from './toolbar/WorkspaceManager';

export const NexusLayout: React.FC = () => {
    return (
        <ReactFlowProvider>
            <NexusLayoutContent />
        </ReactFlowProvider>
    );
};

const NexusLayoutContent: React.FC = () => {
    const {
        viewMode,
        focusedNodeId,
        exitRoom,
        nodes,
    } = useNexusStore();

    const [searchQuery, setSearchQuery] = useState('');

    // Render Focus Room if active
    if (viewMode !== 'canvas' && focusedNodeId) {
        return (
            <React.Suspense fallback={
                <div className="h-screen w-full bg-slate-900 flex items-center justify-center">
                    <div className="animate-pulse text-cyan-400">Loading Room...</div>
                </div>
            }>
                <div className="relative h-screen w-full">
                    {/* Exit Button */}
                    <button
                        onClick={exitRoom}
                        className="fixed top-4 left-4 z-50 flex items-center gap-2 px-4 py-2 bg-slate-800/90 backdrop-blur-md border border-slate-700 rounded-full text-sm font-medium text-slate-300 hover:text-white hover:border-cyan-500/50 transition-all shadow-lg"
                    >
                        <Home className="w-4 h-4" />
                        Exit to Canvas
                    </button>

                    {viewMode === 'engine_room' && <EngineRoom nodeId={focusedNodeId} />}
                    {viewMode === 'reading_room' && <ReadingRoom nodeId={focusedNodeId} />}
                    {viewMode === 'writing_study' && <WritingStudy nodeId={focusedNodeId} />}
                    {viewMode === 'codex_lab' && <CodexLab nodeId={focusedNodeId} />}

                    {!nodes.find(n => n.id === focusedNodeId) && (
                        <div className="flex flex-col items-center justify-center h-full text-slate-500 gap-4">
                            <Layers className="w-12 h-12 opacity-20" />
                            <p className="text-sm font-bold uppercase tracking-widest">Neural link broken: Node not found</p>
                            <button onClick={exitRoom} className="px-4 py-2 bg-white/5 border border-white/10 rounded-xl text-xs hover:text-white transition-colors">
                                Return to Canvas
                            </button>
                        </div>
                    )}
                </div>
            </React.Suspense>
        );
    }

    return (
        <div className="h-screen w-full bg-slate-950 overflow-hidden relative">
            {/* Ambient Background */}
            <div className="absolute inset-0 pointer-events-none">
                <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-cyan-900/10 via-slate-950 to-slate-950" />
                <div
                    className="absolute inset-0 opacity-[0.03]"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #22d3ee 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                />
            </div>

            {/* Top Navigation Bar */}
            <header className="absolute top-0 left-0 right-0 z-40 h-12 bg-slate-900/80 backdrop-blur-md border-b border-slate-800 flex items-center justify-between px-4">
                <div className="flex items-center gap-4">
                    <NavLink
                        to="/"
                        className="flex items-center gap-2 text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                        <Home className="w-4 h-4" />
                    </NavLink>

                    <div className="h-5 w-px bg-slate-700" />

                    <div className="flex items-center gap-2">
                        <Compass className="w-5 h-5 text-cyan-400" />
                        <span className="text-sm font-bold text-white tracking-wide mr-4">Research Nexus</span>
                    </div>

                    <WorkspaceManager />
                </div>

                {/* Search */}
                <div className="flex-1 max-w-md mx-8">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Search nodes, references, blueprints..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-slate-800/50 border border-slate-700 rounded-full pl-10 pr-4 py-1.5 text-sm text-slate-200 placeholder:text-slate-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/20 transition-all"
                        />
                    </div>
                </div>

                {/* Right Controls */}
                <div className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 font-mono">
                        {nodes.length} nodes
                    </span>

                    <div className="h-5 w-px bg-slate-700" />

                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <Grid3X3 className="w-4 h-4" />
                    </button>
                    <button className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                        <Settings className="w-4 h-4" />
                    </button>
                </div>
            </header>

            {/* Main Canvas */}
            <MindCanvas />
        </div>
    );
};

export default NexusLayout;

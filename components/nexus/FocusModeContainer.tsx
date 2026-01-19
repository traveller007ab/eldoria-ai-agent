/**
 * FocusModeContainer - The Stage Manager
 * 
 * Manages the mounting of focus rooms.
 * Updated to support the "Obsidian Frame" system.
 */

import React, { Suspense } from 'react';
import { useNexusStore } from '../../stores/useNexusStore';
import { FocusTransition } from './transitions/FocusTransition';
import { Loader2 } from 'lucide-react';

// Lazy load rooms for code splitting
const EngineRoom = React.lazy(() => import('./rooms/EngineRoom'));
const ReadingRoom = React.lazy(() => import('./rooms/ReadingRoom'));
const WritingStudy = React.lazy(() => import('./rooms/WritingStudy'));
const CodexLab = React.lazy(() => import('./rooms/CodexLab'));
const ArchitectWorkspace = React.lazy(() => import('./ArchitectWorkspace'));

// Minimal Loader in the Void
const RoomLoader: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center bg-[#050505]">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-5 h-5 text-zinc-700 animate-spin" />
            <span className="text-[10px] font-mono text-zinc-700 uppercase tracking-[0.2em]">Initializing Environment...</span>
        </div>
    </div>
);

export const FocusModeContainer: React.FC = () => {
    const { viewMode, focusedNodeId } = useNexusStore();

    // Only render if we're in a focus mode
    if (viewMode === 'canvas' || !focusedNodeId) {
        return null;
    }

    return (
        <Suspense fallback={<RoomLoader />}>
            {/* Engine Room */}
            <FocusTransition
                roomType="engine_room"
                roomLabel="Engine Room"
                accentColor="emerald"
            >
                <EngineRoom nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Reading Room */}
            <FocusTransition
                roomType="reading_room"
                roomLabel="Reading Room"
                accentColor="cyan"
            >
                <ReadingRoom nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Writing Study */}
            <FocusTransition
                roomType="writing_study"
                roomLabel="Writing Study"
                accentColor="purple"
            >
                <WritingStudy nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Codex Lab */}
            <FocusTransition
                roomType="codex_lab"
                roomLabel="Codex Lab"
                accentColor="amber"
            >
                <CodexLab nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Architect Workspace */}
            <FocusTransition
                roomType="architect_workspace"
                roomLabel="Architect Workspace"
                accentColor="slate"
            >
                <ArchitectWorkspace />
            </FocusTransition>
        </Suspense>
    );
};

export default FocusModeContainer;

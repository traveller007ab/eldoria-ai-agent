/**
 * FocusModeContainer - Manages Focus Room rendering
 * 
 * Renders the appropriate room based on the current view mode
 * with smooth transitions handled by FocusTransition.
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

// Loading fallback
const RoomLoader: React.FC = () => (
    <div className="h-full w-full flex items-center justify-center bg-slate-950">
        <div className="flex flex-col items-center gap-4">
            <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
            <span className="text-sm text-slate-400">Loading room...</span>
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
            {/* Engine Room - for Blueprints */}
            <FocusTransition
                roomType="engine_room"
                roomLabel="Engine Room"
                accentColor="emerald"
            >
                <EngineRoom nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Reading Room - for References */}
            <FocusTransition
                roomType="reading_room"
                roomLabel="Reading Room"
                accentColor="cyan"
            >
                <ReadingRoom nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Writing Study - for Notes */}
            <FocusTransition
                roomType="writing_study"
                roomLabel="Writing Study"
                accentColor="purple"
            >
                <WritingStudy nodeId={focusedNodeId} />
            </FocusTransition>

            {/* Codex Lab - for Code */}
            <FocusTransition
                roomType="codex_lab"
                roomLabel="Codex Lab"
                accentColor="amber"
            >
                <CodexLab nodeId={focusedNodeId} />
            </FocusTransition>
        </Suspense>
    );
};

export default FocusModeContainer;

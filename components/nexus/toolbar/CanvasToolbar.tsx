/**
 * CanvasToolbar - Floating toolbar for canvas actions
 * 
 * Provides quick access to:
 * - Layout algorithms (Grid, Radial, Force)
 * - View options
 * - Canvas utilities
 */

import React, { useState } from 'react';
import {
    Grid3X3, Circle, Sparkles, ZoomIn, ZoomOut,
    Maximize, RotateCcw, Layers, Eye, EyeOff, Trash2, Folder
} from 'lucide-react';
import { AnimatePresence } from 'framer-motion';
import { useReactFlow } from 'reactflow';
import { useNexusStore } from '../../../stores/useNexusStore';
import { useGraphLayout } from '../hooks/useGraphLayout';

import { ProjectManagerModal } from '../modals/ProjectManagerModal';

export const CanvasToolbar: React.FC = () => {
    const { fitView, zoomIn, zoomOut, setViewport } = useReactFlow();
    const { nodes, edges, setNodes, reset } = useNexusStore();
    const { gridLayout, radialLayout, clusterLayout, runLayout } = useGraphLayout();
    const [showMinimap, setShowMinimap] = useState(true);
    const [showProjectManager, setShowProjectManager] = useState(false);

    const handleGridLayout = () => {
        gridLayout(nodes, (arranged) => {
            setNodes(arranged as any);
        });
        setTimeout(() => fitView({ padding: 0.2 }), 100);
    };

    const handleRadialLayout = () => {
        radialLayout(nodes, null, (arranged) => {
            setNodes(arranged as any);
        });
        setTimeout(() => fitView({ padding: 0.2 }), 100);
    };

    const handleClusterLayout = () => {
        clusterLayout(nodes, (arranged) => {
            setNodes(arranged as any);
        });
        setTimeout(() => fitView({ padding: 0.2 }), 100);
    };

    const handleForceLayout = () => {
        runLayout(nodes, edges, (arranged) => {
            setNodes(arranged as any);
        });
        setTimeout(() => fitView({ padding: 0.2 }), 100);
    };

    const handleReset = () => {
        if (confirm('Clear all nodes from the canvas?')) {
            reset();
        }
    };

    return (
        <>
            <div className="absolute left-4 top-1/2 -translate-y-1/2 z-30 flex flex-col gap-2">
                {/* Layout Controls */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-xl p-1 flex flex-col gap-0.5 shadow-lg">
                    <ToolbarButton
                        icon={Grid3X3}
                        tooltip="Grid Layout"
                        onClick={handleGridLayout}
                        disabled={nodes.length === 0}
                    />
                    <ToolbarButton
                        icon={Circle}
                        tooltip="Radial Layout"
                        onClick={handleRadialLayout}
                        disabled={nodes.length === 0}
                    />
                    <ToolbarButton
                        icon={Layers}
                        tooltip="Cluster by Type"
                        onClick={handleClusterLayout}
                        disabled={nodes.length === 0}
                    />
                    <div className="h-px bg-white/5 mx-1 my-0.5" />
                    <ToolbarButton
                        icon={Sparkles}
                        tooltip="Force Layout"
                        onClick={handleForceLayout}
                        disabled={nodes.length < 2}
                        accent
                    />
                </div>

                {/* View Controls */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-xl p-1 flex flex-col gap-0.5 shadow-lg">
                    <ToolbarButton
                        icon={ZoomIn}
                        tooltip="Zoom In"
                        onClick={() => zoomIn()}
                    />
                    <ToolbarButton
                        icon={ZoomOut}
                        tooltip="Zoom Out"
                        onClick={() => zoomOut()}
                    />
                    <ToolbarButton
                        icon={Maximize}
                        tooltip="Fit View"
                        onClick={() => fitView({ padding: 0.2 })}
                    />
                    <ToolbarButton
                        icon={RotateCcw}
                        tooltip="Reset View"
                        onClick={() => setViewport({ x: 0, y: 0, zoom: 1 })}
                    />
                </div>

                {/* Utility Controls */}
                <div className="bg-slate-900/60 backdrop-blur-md border border-white/5 rounded-xl p-1 flex flex-col gap-0.5 shadow-lg">
                    <ToolbarButton
                        icon={showMinimap ? Eye : EyeOff}
                        tooltip={showMinimap ? 'Hide Minimap' : 'Show Minimap'}
                        onClick={() => setShowMinimap(!showMinimap)}
                    />
                    <ToolbarButton
                        icon={Folder}
                        tooltip="Project Archives"
                        onClick={() => setShowProjectManager(true)}
                        accent
                    />
                    <ToolbarButton
                        icon={Trash2}
                        tooltip="Clear Canvas"
                        onClick={handleReset}
                        danger
                        disabled={nodes.length === 0}
                    />
                </div>
            </div>

            <AnimatePresence>
                {showProjectManager && (
                    <ProjectManagerModal onClose={() => setShowProjectManager(false)} />
                )}
            </AnimatePresence>
        </>
    );
};

interface ToolbarButtonProps {
    icon: React.FC<{ className?: string }>;
    tooltip: string;
    onClick: () => void;
    disabled?: boolean;
    accent?: boolean;
    danger?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({
    icon: Icon,
    tooltip,
    onClick,
    disabled,
    accent,
    danger
}) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={tooltip}
        className={`
            p-2 rounded-lg transition-all group relative
            ${disabled
                ? 'opacity-30 cursor-not-allowed'
                : accent
                    ? 'text-emerald-400 hover:bg-emerald-500/20'
                    : danger
                        ? 'text-red-400 hover:bg-red-500/20'
                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }
        `}
    >
        <Icon className="w-4 h-4" />

        {/* Tooltip */}
        <span className="absolute left-full ml-2 top-1/2 -translate-y-1/2 px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[10px] text-white whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity">
            {tooltip}
        </span>
    </button>
);

export default CanvasToolbar;

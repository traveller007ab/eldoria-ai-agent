import React from 'react';
import { useMechStore } from '../../stores/useMechStore';
import {
    Undo2, Redo2, Copy, Clipboard, Trash2, ZoomIn, ZoomOut,
    Maximize2, Grid3X3, Lock, Unlock, Layers
} from 'lucide-react';

interface ToolbarProps {
    onZoomIn?: () => void;
    onZoomOut?: () => void;
    onFitView?: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ onZoomIn, onZoomOut, onFitView }) => {
    const {
        undo, redo, canUndo, canRedo,
        selectedComponentId,
        copyComponent,
        pasteComponent,
        duplicateComponent,
        removeComponent,
        clipboard,
        clearBlueprint,
        currentBlueprint
    } = useMechStore();

    const handleCopy = () => {
        if (selectedComponentId) {
            copyComponent(selectedComponentId);
        }
    };

    const handlePaste = () => {
        if (clipboard) {
            pasteComponent({ x: 200, y: 200 });
        }
    };

    const handleDuplicate = () => {
        if (selectedComponentId) {
            duplicateComponent(selectedComponentId);
        }
    };

    const handleDelete = () => {
        if (selectedComponentId) {
            removeComponent(selectedComponentId);
        }
    };

    return (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 bg-slate-800/95 backdrop-blur-sm border border-slate-700 rounded-lg px-2 py-1.5 shadow-xl">
            {/* Undo/Redo */}
            <div className="flex items-center gap-0.5 pr-2 border-r border-slate-700">
                <ToolbarButton
                    icon={<Undo2 className="w-4 h-4" />}
                    onClick={undo}
                    disabled={!canUndo()}
                    title="Undo (Ctrl+Z)"
                />
                <ToolbarButton
                    icon={<Redo2 className="w-4 h-4" />}
                    onClick={redo}
                    disabled={!canRedo()}
                    title="Redo (Ctrl+Y)"
                />
            </div>

            {/* Clipboard */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
                <ToolbarButton
                    icon={<Copy className="w-4 h-4" />}
                    onClick={handleCopy}
                    disabled={!selectedComponentId}
                    title="Copy (Ctrl+C)"
                />
                <ToolbarButton
                    icon={<Clipboard className="w-4 h-4" />}
                    onClick={handlePaste}
                    disabled={!clipboard}
                    title="Paste (Ctrl+V)"
                />
                <ToolbarButton
                    icon={<Layers className="w-4 h-4" />}
                    onClick={handleDuplicate}
                    disabled={!selectedComponentId}
                    title="Duplicate (Ctrl+D)"
                />
                <ToolbarButton
                    icon={<Trash2 className="w-4 h-4" />}
                    onClick={handleDelete}
                    disabled={!selectedComponentId}
                    title="Delete (Del)"
                    danger
                />
            </div>

            {/* View */}
            <div className="flex items-center gap-0.5 px-2 border-r border-slate-700">
                <ToolbarButton
                    icon={<ZoomIn className="w-4 h-4" />}
                    onClick={onZoomIn}
                    title="Zoom In"
                />
                <ToolbarButton
                    icon={<ZoomOut className="w-4 h-4" />}
                    onClick={onZoomOut}
                    title="Zoom Out"
                />
                <ToolbarButton
                    icon={<Maximize2 className="w-4 h-4" />}
                    onClick={onFitView}
                    title="Fit View (Ctrl+F)"
                />
            </div>

            {/* Component Count */}
            <div className="px-2 text-xs text-slate-400">
                {currentBlueprint?.components.length || 0} components
            </div>
        </div>
    );
};

interface ToolbarButtonProps {
    icon: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    title?: string;
    danger?: boolean;
}

const ToolbarButton: React.FC<ToolbarButtonProps> = ({ icon, onClick, disabled, title, danger }) => (
    <button
        onClick={onClick}
        disabled={disabled}
        title={title}
        className={`
      p-1.5 rounded transition-colors
      ${disabled
                ? 'text-slate-600 cursor-not-allowed'
                : danger
                    ? 'text-slate-400 hover:text-red-400 hover:bg-red-500/10'
                    : 'text-slate-400 hover:text-white hover:bg-slate-700'
            }
    `}
    >
        {icon}
    </button>
);

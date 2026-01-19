/**
 * NodeContextMenu - Right-click context menu for canvas nodes
 * 
 * Provides quick actions:
 * - Open/Focus
 * - Edit
 * - Duplicate
 * - Delete
 * - Connect to...
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Eye, Pencil, Copy, Trash2, Link2, ExternalLink,
    Maximize2, Palette, X
} from 'lucide-react';
import { useNexusStore, NexusNode } from '../../stores/useNexusStore';

interface NodeContextMenuProps {
    node: NexusNode | null;
    position: { x: number; y: number } | null;
    onClose: () => void;
}

export const NodeContextMenu: React.FC<NodeContextMenuProps> = ({
    node,
    position,
    onClose
}) => {
    const { removeNode, enterRoom, updateNode } = useNexusStore();

    if (!node || !position) return null;

    const handleFocus = () => {
        const data = node.data as any;
        if (data.type === 'blueprint') {
            enterRoom(node.id, 'engine_room');
        } else if (data.type === 'reference') {
            enterRoom(node.id, 'reading_room');
        } else if (data.type === 'note') {
            enterRoom(node.id, 'writing_study');
        }
        onClose();
    };

    const handleDuplicate = () => {
        const { addNode } = useNexusStore.getState();
        addNode({
            ...node,
            id: crypto.randomUUID(),
            position: {
                x: node.position.x + 50,
                y: node.position.y + 50
            }
        });
        onClose();
    };

    const handleDelete = () => {
        removeNode(node.id);
        onClose();
    };

    const handleChangeColor = (color: 'cyan' | 'emerald' | 'amber' | 'purple') => {
        updateNode(node.id, { color });
        onClose();
    };

    const data = node.data as any;
    const isNote = data.type === 'note';

    return (
        <AnimatePresence>
            <motion.div
                className="fixed z-[9999] bg-slate-800/95 backdrop-blur-md border border-slate-700 rounded-xl shadow-2xl overflow-hidden min-w-[180px]"
                style={{ left: position.x, top: position.y }}
                initial={{ opacity: 0, scale: 0.9, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.15 }}
            >
                {/* Header */}
                <div className="px-3 py-2 border-b border-slate-700 flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                        {data.type || 'Node'}
                    </span>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-700 rounded transition-colors"
                    >
                        <X className="w-3 h-3 text-slate-500" />
                    </button>
                </div>

                {/* Actions */}
                <div className="p-1">
                    <MenuItem
                        icon={Maximize2}
                        label="Open in Focus Mode"
                        onClick={handleFocus}
                        accent
                    />
                    <MenuItem
                        icon={Pencil}
                        label="Edit"
                        onClick={() => { /* TODO: Inline edit */ onClose(); }}
                    />
                    <MenuItem
                        icon={Copy}
                        label="Duplicate"
                        onClick={handleDuplicate}
                    />

                    {data.source && (
                        <MenuItem
                            icon={ExternalLink}
                            label="Open Source"
                            onClick={() => { window.open(data.source, '_blank'); onClose(); }}
                        />
                    )}

                    <div className="h-px bg-slate-700 my-1" />

                    {isNote && (
                        <>
                            <div className="px-3 py-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Color</span>
                                <div className="flex gap-2 mt-2">
                                    {(['cyan', 'emerald', 'amber', 'purple'] as const).map(color => (
                                        <button
                                            key={color}
                                            onClick={() => handleChangeColor(color)}
                                            className={`w-5 h-5 rounded-full transition-transform hover:scale-110 ${color === 'cyan' ? 'bg-cyan-500' :
                                                color === 'emerald' ? 'bg-emerald-500' :
                                                    color === 'amber' ? 'bg-amber-500' : 'bg-purple-500'
                                                } ${data.color === color ? 'ring-2 ring-white ring-offset-2 ring-offset-slate-800' : ''}`}
                                        />
                                    ))}
                                </div>
                            </div>
                            <div className="h-px bg-slate-700 my-1" />
                        </>
                    )}

                    <MenuItem
                        icon={Trash2}
                        label="Delete"
                        onClick={handleDelete}
                        danger
                    />
                </div>
            </motion.div>

            {/* Backdrop */}
            <div
                className="fixed inset-0 z-[9998]"
                onClick={onClose}
            />
        </AnimatePresence>
    );
};

interface MenuItemProps {
    icon: React.FC<{ className?: string }>;
    label: string;
    onClick: () => void;
    accent?: boolean;
    danger?: boolean;
}

const MenuItem: React.FC<MenuItemProps> = ({ icon: Icon, label, onClick, accent, danger }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center gap-3 px-3 py-2 text-left text-sm rounded-lg transition-colors ${danger
            ? 'text-red-400 hover:bg-red-500/10'
            : accent
                ? 'text-cyan-400 hover:bg-cyan-500/10'
                : 'text-slate-300 hover:bg-slate-700/50'
            }`}
    >
        <Icon className="w-4 h-4" />
        {label}
    </button>
);

export default NodeContextMenu;

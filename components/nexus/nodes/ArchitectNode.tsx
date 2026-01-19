/**
 * ArchitectNode - The Fractal Container
 * 
 * A sophisticated, minimalist node representing a workspace "room".
 * Designed with "Glass & Steel" aesthetic:
 * - Matte dark surfaces
 * - Hairline borders
 * - Semantic status colors
 * - Clean typography
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { FolderKanban, ChevronRight, Circle } from 'lucide-react';
import { ArchitectNodeData, useNexusStore } from '@/stores/useNexusStore';

const statusConfig = {
    draft: { color: 'bg-zinc-500', label: 'Draft', ring: 'ring-zinc-500/30' },
    active: { color: 'bg-amber-500', label: 'In Progress', ring: 'ring-amber-500/30' },
    complete: { color: 'bg-emerald-500', label: 'Complete', ring: 'ring-emerald-500/30' },
};

export const ArchitectNode: React.FC<NodeProps<ArchitectNodeData>> = memo(({ id, data, selected }) => {
    const { enterRoom } = useNexusStore();
    const status = statusConfig[data.status] || statusConfig.draft;

    const handleDoubleClick = () => {
        enterRoom(id, 'architect_workspace');
    };

    return (
        <motion.div
            className={`
                group relative w-72 
                bg-slate-900/80 backdrop-blur-md 
                border border-white/10 rounded-lg
                shadow-xl shadow-black/20
                transition-all duration-200
                ${selected ? 'ring-1 ring-slate-400/50' : ''}
            `}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -2 }}
            onDoubleClick={handleDoubleClick}
        >
            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Top}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-top-1"
            />
            <Handle
                type="source"
                position={Position.Bottom}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-bottom-1"
            />

            {/* Header Bar */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
                <div className={`w-2 h-2 rounded-full ${status.color}`} />
                <span className="text-xs font-medium text-slate-400 uppercase tracking-wide">
                    {status.label}
                </span>
            </div>

            {/* Content */}
            <div className="p-4 space-y-3">
                {/* Title */}
                <div className="flex items-start gap-3">
                    <div className="p-2 rounded-md bg-slate-800/50 border border-white/5">
                        <FolderKanban className="w-4 h-4 text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="text-sm font-semibold text-slate-100 truncate">
                            {data.title}
                        </h3>
                        {data.linkedFilePath && (
                            <p className="text-xs text-slate-500 font-mono truncate mt-0.5">
                                {data.linkedFilePath}
                            </p>
                        )}
                    </div>
                </div>

                {/* Specs Preview */}
                {data.specs && (
                    <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                        {data.specs.slice(0, 120)}...
                    </p>
                )}

                {/* Children Indicator */}
                {data.childNodeIds && data.childNodeIds.length > 0 && (
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                        <div className="flex -space-x-1">
                            {[...Array(Math.min(data.childNodeIds.length, 3))].map((_, i) => (
                                <Circle key={i} className="w-3 h-3 fill-slate-700 text-slate-600" />
                            ))}
                        </div>
                        <span>{data.childNodeIds.length} nested items</span>
                    </div>
                )}
            </div>

            {/* Footer - Dive Action */}
            <div className="px-4 py-2.5 border-t border-white/5 bg-slate-800/30 rounded-b-lg">
                <button
                    onClick={handleDoubleClick}
                    className="w-full flex items-center justify-between text-xs text-slate-500 hover:text-slate-300 transition-colors"
                >
                    <span>Enter Workspace</span>
                    <ChevronRight className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
                </button>
            </div>
        </motion.div>
    );
});

ArchitectNode.displayName = 'ArchitectNode';

export default ArchitectNode;

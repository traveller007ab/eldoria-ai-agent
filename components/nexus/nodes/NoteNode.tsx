/**
 * NoteNode - Custom Node for Markdown Notes
 * 
 * Displays sticky notes with:
 * - Editable markdown content
 * - Color coding
 * - Quick editing capability
 */

import React, { memo, useState } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { StickyNote, Edit3, Check, X } from 'lucide-react';
import type { NoteNodeData } from '../../../stores/useNexusStore';
import { useNexusStore } from '../../../stores/useNexusStore';

const colorMap = {
    cyan: {
        bg: 'bg-cyan-500/5',
        border: 'border-cyan-500/30',
        accent: 'text-cyan-400',
        header: 'from-cyan-600 to-cyan-400',
        glow: 'shadow-[0_0_30px_rgba(34,211,238,0.1)]'
    },
    emerald: {
        bg: 'bg-emerald-500/5',
        border: 'border-emerald-500/30',
        accent: 'text-emerald-400',
        header: 'from-emerald-600 to-emerald-400',
        glow: 'shadow-[0_0_30px_rgba(16,185,129,0.1)]'
    },
    amber: {
        bg: 'bg-amber-500/5',
        border: 'border-amber-500/30',
        accent: 'text-amber-400',
        header: 'from-amber-600 to-amber-400',
        glow: 'shadow-[0_0_30px_rgba(245,158,11,0.1)]'
    },
    purple: {
        bg: 'bg-purple-500/5',
        border: 'border-purple-500/30',
        accent: 'text-purple-400',
        header: 'from-purple-600 to-purple-400',
        glow: 'shadow-[0_0_30px_rgba(168,85,247,0.1)]'
    },
};

export const NoteNode: React.FC<NodeProps<NoteNodeData>> = memo(({ id, data, selected }) => {
    const [isEditing, setIsEditing] = useState(false);
    const [editContent, setEditContent] = useState(data.content);
    const [editTitle, setEditTitle] = useState(data.title);
    const { updateNode, enterRoom } = useNexusStore();

    const colors = colorMap[data.color || 'cyan'];

    const handleSave = () => {
        updateNode(id, {
            title: editTitle,
            content: editContent
        });
        setIsEditing(false);
    };

    const handleCancel = () => {
        setEditTitle(data.title);
        setEditContent(data.content);
        setIsEditing(false);
    };

    return (
        <div
            onDoubleClick={(e) => {
                if (!isEditing) {
                    e.stopPropagation();
                    enterRoom(id, 'writing_study');
                }
            }}
            className={`
                w-56 bg-slate-900/80 backdrop-blur-md rounded-lg border overflow-hidden
                transition-all duration-200 group cursor-pointer
                ${selected
                    ? `${colors.border.replace('30', '40')} ring-1 ${colors.border.replace('30', '10')}`
                    : 'border-white/10 hover:border-white/15'
                }
            `}
        >
            {/* Connection Handles */}
            <Handle
                type="target"
                position={Position.Left}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-left-1"
            />
            <Handle
                type="source"
                position={Position.Right}
                className="!w-2 !h-2 !bg-slate-500 !border-slate-700 !-right-1"
            />

            {/* Header Hint */}
            <div className={`h-0.5 bg-gradient-to-r ${colors.header} opacity-50`} />

            {/* Content */}
            <div className="p-4 relative">
                {/* Title */}
                <div className="flex items-start gap-3 mb-4">
                    <div className={`p-2 rounded-lg bg-white/5 border border-white/5 shrink-0 group-hover:${colors.border} transition-colors`}>
                        <StickyNote className={`w-4 h-4 ${colors.accent}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                        {isEditing ? (
                            <input
                                type="text"
                                value={editTitle}
                                onChange={(e) => setEditTitle(e.target.value)}
                                className="w-full bg-slate-950/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white focus:outline-none focus:border-cyan-500/50"
                                autoFocus
                            />
                        ) : (
                            <>
                                <h3 className="text-xs font-bold text-white/90 truncate tracking-tight">{data.title}</h3>
                                <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">Neural Log</p>
                            </>
                        )}
                    </div>

                    {!isEditing ? (
                        <button
                            onClick={() => setIsEditing(true)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-white/5 rounded-lg transition-all text-slate-500 hover:text-white"
                        >
                            <Edit3 className="w-3 h-3" />
                        </button>
                    ) : (
                        <div className="flex gap-1">
                            <button
                                onClick={handleSave}
                                className="p-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-lg transition-colors"
                            >
                                <Check className="w-3 h-3 text-emerald-400" />
                            </button>
                            <button
                                onClick={handleCancel}
                                className="p-1.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 rounded-lg transition-colors"
                            >
                                <X className="w-3 h-3 text-red-400" />
                            </button>
                        </div>
                    )}
                </div>

                {/* Content Area */}
                {isEditing ? (
                    <textarea
                        value={editContent}
                        onChange={(e) => setEditContent(e.target.value)}
                        className="w-full h-32 bg-slate-950/50 border border-white/10 rounded-lg p-2 text-[10px] text-slate-300 font-mono resize-none focus:outline-none focus:border-cyan-500/50"
                        placeholder="Log research data..."
                    />
                ) : (
                    <div className="text-[10px] text-slate-400 leading-relaxed line-clamp-6 whitespace-pre-wrap opacity-80">
                        {data.content || 'System log empty...'}
                    </div>
                )}
            </div>
        </div>
    );
});

NoteNode.displayName = 'NoteNode';

export default NoteNode;

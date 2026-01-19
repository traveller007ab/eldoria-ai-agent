/**
 * ReferenceNode - Custom Node for Research References
 * 
 * Displays PDF papers or web references with:
 * - Title and authors
 * - Abstract preview
 * - Quick access to full reading mode
 */

import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { BookOpen, ExternalLink, Maximize2, FileText, Link } from 'lucide-react';
import type { ReferenceNodeData } from '../../../stores/useNexusStore';

export const ReferenceNode: React.FC<NodeProps<ReferenceNodeData>> = memo(({ data, selected }) => {
    const isPDF = data.source?.endsWith('.pdf') || data.source?.startsWith('blob:');
    const isURL = data.source?.startsWith('http');

    return (
        <div
            className={`
                w-56 bg-slate-900/80 backdrop-blur-md rounded-lg border
                transition-all duration-200 group cursor-pointer
                ${selected
                    ? 'border-cyan-500/40 ring-1 ring-cyan-500/10'
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
            <div className="h-0.5 bg-gradient-to-r from-cyan-600/60 to-blue-600/60" />

            {/* Content */}
            <div className="p-4 relative">
                {/* Icon & Type */}
                <div className="flex items-start gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-white/5 border border-white/5 shrink-0 group-hover:border-cyan-500/30 transition-colors">
                        {isPDF ? (
                            <FileText className="w-4 h-4 text-cyan-400" />
                        ) : isURL ? (
                            <Link className="w-4 h-4 text-cyan-400" />
                        ) : (
                            <BookOpen className="w-4 h-4 text-cyan-400" />
                        )}
                    </div>

                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-white/90 line-clamp-2 leading-snug tracking-tight">
                            {data.title}
                        </h3>
                        {data.authors && data.authors.length > 0 && (
                            <p className="text-[8px] text-slate-500 font-bold uppercase tracking-widest mt-1 truncate">
                                {data.authors[0]} {data.authors.length > 1 && '& OTHERS'}
                            </p>
                        )}
                    </div>
                </div>

                {/* Abstract Preview */}
                {data.abstract && (
                    <p className="text-[10px] text-slate-400 line-clamp-3 leading-relaxed mb-4 italic opacity-80">
                        "{data.abstract}"
                    </p>
                )}

                {/* Source indicator */}
                <div className="flex items-center gap-2 text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">
                    {isPDF && <span className="text-red-500/80">PDF</span>}
                    {isURL && <span className="text-blue-500/80">WEB</span>}
                    <span className="truncate flex-1">{data.source?.split('/').pop()?.substring(0, 15) || 'Reference'}</span>
                </div>

                {/* Quick Action Button (Compact) */}
                <div className="mt-4 pt-4 border-t border-white/5">
                    <button className="w-full py-1.5 bg-white/5 hover:bg-cyan-500/10 border border-white/5 hover:border-cyan-500/30 rounded-lg text-slate-400 hover:text-cyan-400 text-[9px] font-black uppercase tracking-[0.2em] transition-all duration-300">
                        Analyze Source
                    </button>
                </div>
            </div>
        </div>
    );
});

ReferenceNode.displayName = 'ReferenceNode';

export default ReferenceNode;

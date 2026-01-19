/**
 * BlueprintNode - Custom Node for SAF Blueprints
 * 
 * Displays a mini-preview of a mechanical blueprint with:
 * - Status indicator (idle, running, completed, failed)
 * - Live simulation thumbnail
 * - Quick actions
 */

import React, { memo } from 'react';
import { motion } from 'framer-motion';
import { Handle, Position, NodeProps } from 'reactflow';
import { Cog, Play, CheckCircle2, AlertTriangle, Loader2, Maximize2 } from 'lucide-react';
import { useMechStore } from '../../../stores/useMechStore';
import type { BlueprintNodeData } from '../../../stores/useNexusStore';

export const BlueprintNode: React.FC<NodeProps<BlueprintNodeData>> = memo(({ id, data, selected }) => {
    const isSimulating = useMechStore((state) => state.isSimulating);
    const simulationProgress = useMechStore((state) => state.simulationProgress);
    const currentBlueprint = useMechStore((state) => state.currentBlueprint);

    // Is this specific node currently being simulated?
    const isRunningThis = data.status === 'running' || (isSimulating && currentBlueprint?.id === data.blueprintId);

    const statusConfig = {
        idle: { icon: Cog, color: 'text-slate-400', bg: 'bg-slate-500/20', label: 'Ready' },
        running: { icon: Loader2, color: 'text-amber-400', bg: 'bg-amber-500/20', label: 'Running', animate: true },
        completed: { icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/20', label: 'Converged' },
        failed: { icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/20', label: 'Failed' },
    };

    const statusKey = isRunningThis ? 'running' : data.status;
    const status = statusConfig[statusKey] || statusConfig.idle;
    const StatusIcon = status.icon;

    return (
        <div
            className={`
                w-64 bg-slate-900/80 backdrop-blur-md rounded-lg border overflow-hidden
                transition-all duration-200 group cursor-pointer
                ${selected
                    ? 'border-emerald-500/40 ring-1 ring-emerald-500/10'
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

            {/* Preview Area */}
            <div className="h-32 bg-slate-950/40 relative overflow-hidden border-b border-white/5">
                {/* Progress Overlay */}
                {isRunningThis && (
                    <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center p-6">
                        <div className="w-full bg-white/5 h-1 rounded-full overflow-hidden mb-2">
                            <motion.div
                                className="h-full bg-gradient-to-r from-emerald-600 to-emerald-400 shadow-[0_0_15px_rgba(16,185,129,0.5)]"
                                initial={{ width: 0 }}
                                animate={{ width: `${simulationProgress}%` }}
                                transition={{ duration: 0.5 }}
                            />
                        </div>
                        <div className="flex justify-between w-full px-1">
                            <span className="text-[8px] font-bold text-emerald-400/80 uppercase tracking-[0.2em]">Processing Physics</span>
                            <span className="text-[8px] font-bold text-emerald-400">{Math.round(simulationProgress)}%</span>
                        </div>
                    </div>
                )}

                {/* Placeholder for 3D preview or schematic */}
                <div className="absolute inset-0 flex items-center justify-center opacity-40">
                    <div className="w-24 h-24 rounded-full border border-emerald-500/10 flex items-center justify-center">
                        <Cog className="w-12 h-12 text-emerald-500/20" />
                    </div>
                </div>

                {/* Decorative circuit lines */}
                <svg className="absolute inset-0 w-full h-full opacity-5" viewBox="0 0 100 100">
                    <path d="M0,50 L30,50 L35,30 L65,30 L70,50 L100,50" stroke="white" fill="none" strokeWidth="0.5" />
                    <path d="M50,0 L50,30 L30,35 L30,65 L50,70 L50,100" stroke="white" fill="none" strokeWidth="0.5" />
                </svg>

                {/* Expand indicator on hover */}
                <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-all duration-300 translate-y-1 group-hover:translate-y-0 text-white/40">
                    <Maximize2 className="w-3.5 h-3.5" />
                </div>
            </div>

            {/* Content */}
            <div className="p-4 relative">
                <div className="flex items-start justify-between gap-2 mb-4">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold text-white/90 truncate tracking-tight">{data.name}</h3>
                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.15em] mt-0.5">Automated Bio-Core</p>
                    </div>

                    {/* Status Badge */}
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border border-white/5 ${status.bg}`}>
                        <StatusIcon className={`w-2.5 h-2.5 ${status.color} ${status.animate ? 'animate-spin' : ''}`} />
                    </div>
                </div>

                {/* Quick Action */}
                <button className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-white/5 hover:bg-emerald-500/10 border border-white/5 hover:border-emerald-500/30 rounded-lg text-slate-400 hover:text-emerald-400 text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300">
                    {statusKey === 'running' ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3" />}
                    {statusKey === 'running' ? 'Solving' : 'Initialize'}
                </button>
            </div>
        </div>
    );
});

BlueprintNode.displayName = 'BlueprintNode';

export default BlueprintNode;

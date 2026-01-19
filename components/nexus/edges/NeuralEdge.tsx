/**
 * NeuralEdge - Custom Edge for Knowledge Graph Connections
 * 
 * Renders animated, glowing connections between nodes with:
 * - Animated flow particles
 * - Hover labels
 * - Gradient styling
 */

import React, { memo } from 'react';
import { EdgeProps, getBezierPath, EdgeLabelRenderer } from 'reactflow';
import { useMechStore } from '../../../stores/useMechStore';

export const NeuralEdge: React.FC<EdgeProps> = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
    markerEnd,
    selected,
    source,
    target,
}) => {
    const isSimulating = useMechStore((state) => state.isSimulating);
    const currentBlueprint = useMechStore((state) => state.currentBlueprint);
    const isFlowing = isSimulating && (source === currentBlueprint?.id || target === currentBlueprint?.id || data?.isActive);

    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            {/* Glow Effect Layer */}
            <path
                id={`${id}-glow`}
                className="react-flow__edge-path"
                d={edgePath}
                fill="none"
                strokeWidth={8}
                stroke="rgba(34, 211, 238, 0.1)"
                style={{ filter: 'blur(4px)' }}
            />

            {/* Main Edge Path */}
            <path
                id={id}
                className="react-flow__edge-path"
                d={edgePath}
                fill="none"
                strokeWidth={selected ? 3 : 2}
                stroke={selected ? '#22d3ee' : 'url(#neural-gradient)'}
                strokeLinecap="round"
                markerEnd={markerEnd}
                style={{
                    ...style,
                    transition: 'stroke-width 0.2s ease',
                }}
            />

            {/* Animated Particles */}
            <circle r={isFlowing ? 3 : 2.5} fill={isFlowing ? '#34d399' : (selected ? '#22d3ee' : '#10b981')} filter="url(#neural-glow)">
                <animateMotion
                    dur={`${(isFlowing ? 0.8 : 2) + Math.random() * 2}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                />
            </circle>
            <circle r="1.5" fill="#22d3ee">
                <animateMotion
                    dur={`${(isFlowing ? 0.6 : 1.5) + Math.random() * 1.5}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="0.8s"
                />
            </circle>
            {isFlowing && (
                <circle r="2" fill="#10b981" opacity="0.6">
                    <animateMotion
                        dur="1.2s"
                        repeatCount="indefinite"
                        path={edgePath}
                        begin="0.4s"
                    />
                </circle>
            )}
            <circle r="1" fill="#f59e0b">
                <animateMotion
                    dur={`${isFlowing ? 2 : 4 + Math.random() * 2}s`}
                    repeatCount="indefinite"
                    path={edgePath}
                    begin="2s"
                />
            </circle>

            {/* Label (if provided) */}
            {data?.label && (
                <EdgeLabelRenderer>
                    <div
                        style={{
                            position: 'absolute',
                            transform: `translate(-50%, -50%) translate(${labelX}px,${labelY}px)`,
                            pointerEvents: 'all',
                        }}
                        className={`px-2 py-1 bg-slate-800/90 backdrop-blur-sm border rounded-full text-[9px] font-bold uppercase tracking-wider transition-all ${data.label.toLowerCase().includes('sim') ? 'text-emerald-400 border-emerald-500/50' :
                            data.label.toLowerCase().includes('ref') ? 'text-cyan-400 border-cyan-500/50' :
                                'text-amber-400 border-amber-500/50'
                            }`}
                    >
                        {data.label}
                    </div>
                </EdgeLabelRenderer>
            )}

            {/* SVG Definitions for gradients and filters */}
            <defs>
                <linearGradient id="neural-gradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#22d3ee" stopOpacity="0.4" />
                    <stop offset="50%" stopColor="#10b981" stopOpacity="0.8" />
                    <stop offset="100%" stopColor="#22d3ee" stopOpacity="0.4" />
                </linearGradient>

                <filter id="neural-glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="1.5" result="blur" />
                    <feMerge>
                        <feMergeNode in="blur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </>
    );
});

NeuralEdge.displayName = 'NeuralEdge';

export default NeuralEdge;

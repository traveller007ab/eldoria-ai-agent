import React from 'react';
import { EdgeProps, getBezierPath, BaseEdge } from 'reactflow';

/**
 * AnimatedFlowEdge: n8n-style animated edge with flowing particles
 * Shows direction and intensity of flow between components.
 */

interface AnimatedFlowEdgeData {
    flowValue?: number;
    flowType?: 'energy' | 'material' | 'data' | 'control' | 'signal';
    isActive?: boolean;
}

// Flow type to color mapping
const FLOW_COLORS: Record<string, string> = {
    energy: '#ef4444',    // Red
    material: '#10b981',  // Green
    data: '#6b7280',      // Gray
    control: '#3b82f6',   // Blue
    signal: '#f59e0b',    // Orange
};

export const AnimatedFlowEdge: React.FC<EdgeProps<AnimatedFlowEdgeData>> = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    data,
    style,
    markerEnd,
}) => {
    const flowValue = data?.flowValue ?? 0;
    const flowType = data?.flowType ?? 'energy';
    const isActive = data?.isActive ?? (flowValue > 0);

    const baseColor = FLOW_COLORS[flowType] || '#ef4444';
    const dimColor = '#333';

    const [edgePath] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    // Calculate animation speed based on flow value (higher = faster)
    const animationDuration = isActive ? Math.max(0.5, 3 - (flowValue / 100)) : 0;

    // Calculate glow intensity based on flow value
    const glowIntensity = isActive ? Math.min(1, flowValue / 100) : 0;

    return (
        <g className="react-flow__edge">
            {/* Background glow (only when active) */}
            {isActive && (
                <path
                    d={edgePath}
                    fill="none"
                    stroke={baseColor}
                    strokeWidth={8}
                    strokeOpacity={glowIntensity * 0.3}
                    filter="url(#glow)"
                    className="transition-all duration-300"
                />
            )}

            {/* Main edge line */}
            <path
                id={id}
                d={edgePath}
                fill="none"
                stroke={isActive ? baseColor : dimColor}
                strokeWidth={isActive ? 3 : 1.5}
                strokeOpacity={isActive ? 1 : 0.4}
                className="transition-all duration-300"
                markerEnd={markerEnd}
            />

            {/* Animated particles (only when active) */}
            {isActive && (
                <>
                    {/* Particle 1 */}
                    <circle r={4} fill={baseColor} filter="url(#glow)">
                        <animateMotion
                            dur={`${animationDuration}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                        />
                    </circle>

                    {/* Particle 2 (offset) */}
                    <circle r={3} fill={baseColor} opacity={0.7}>
                        <animateMotion
                            dur={`${animationDuration}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                            begin={`${animationDuration * 0.33}s`}
                        />
                    </circle>

                    {/* Particle 3 (offset) */}
                    <circle r={2} fill={baseColor} opacity={0.5}>
                        <animateMotion
                            dur={`${animationDuration}s`}
                            repeatCount="indefinite"
                            path={edgePath}
                            begin={`${animationDuration * 0.66}s`}
                        />
                    </circle>
                </>
            )}

            {/* SVG Filters for glow effect */}
            <defs>
                <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>
        </g>
    );
};

export default AnimatedFlowEdge;

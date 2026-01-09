import React, { memo, useMemo } from 'react';
import { EdgeProps, getBezierPath, BaseEdge } from 'reactflow';
import { useMechStore } from '../../stores/useMechStore';

export const AnimatedConnection = memo(({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    markerEnd,
    source,
    target
}: EdgeProps) => {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    const { lastSimulationResult, currentBlueprint } = useMechStore();

    const connectionState = useMemo(() => {
        if (!lastSimulationResult) return { flow: 0, temp: 20, isSimulating: false };

        const simVars = lastSimulationResult.system_vars || lastSimulationResult.variables;
        
        // 1. Try Direct Edge ID Lookup (Preferred for Genesis Engine)
        // Check for common flow variables: I (Current), m (Mass Flow), Q (Volumetric Flow)
        const directFlow = simVars[`${id}.I`] ?? simVars[`${id}.m`] ?? simVars[`${id}.Q`];
        
        if (directFlow !== undefined) {
            // For temperature, we might look for source node temp or fluid temp
            // Default to 20C if not found
            return { 
                flow: Math.abs(Number(directFlow)), 
                temp: 20, 
                isSimulating: true 
            };
        }

        // 2. Fallback: Component-based heuristic (Legacy)
        // Find relevant variables for the source component
        const sourceComp = currentBlueprint?.components.find(c => c.id === source);
        if (!sourceComp) return { flow: 0, temp: 20, isSimulating: true };

        const prefix = sourceComp.name.replace(/\s+/g, '_');
        
        // Try various keys
        const flow = simVars[`${prefix}_flow`] ?? simVars[`${prefix}_flow_rate`] ?? simVars['totalFlowRate'] ?? 0;
        const temp = simVars[`${prefix}_T_out`] ?? 20;

        return { flow: Math.abs(flow as number), temp: (temp as number), isSimulating: true };
    }, [lastSimulationResult, source, id, currentBlueprint]);

    // Animation Speed: Higher flow -> Faster animation (lower duration)
    const animationDuration = connectionState.flow > 0
        ? Math.max(0.5, 5000 / (connectionState.flow + 100)) + 's'
        : '0s';

    // Color: Blue (20C) -> Red (100C)
    const getStrokeColor = (temp: number) => {
        const t = Math.max(20, Math.min(100, temp));
        const ratio = (t - 20) / 80; // 0 to 1
        // Interpolate Blue (#3b82f6) to Red (#ef4444)
        // Blue: 59, 130, 246
        // Red: 239, 68, 68
        const r = 59 + (239 - 59) * ratio;
        const g = 130 + (68 - 130) * ratio;
        const b = 246 + (68 - 246) * ratio;
        return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
    };

    const strokeColor = connectionState.isSimulating ? getStrokeColor(connectionState.temp) : '#64748b';
    const strokeWidth = style.strokeWidth || 2;

    return (
        <>
            <BaseEdge path={edgePath} markerEnd={markerEnd} style={{
                ...style,
                stroke: strokeColor,
                strokeWidth,
                strokeDasharray: connectionState.flow > 0 ? '5,5' : 'none',
                animation: connectionState.flow > 0 ? `dashdraw ${animationDuration} linear infinite` : 'none'
            }} />

            {/* Inject CSS for animation dynamically or assume global style */}
            <style>
                {`
                    @keyframes dashdraw {
                        from { stroke-dashoffset: 10; }
                        to { stroke-dashoffset: 0; }
                    }
                `}
            </style>
        </>
    );
});

// Needs to be registered in Canvas edgeTypes

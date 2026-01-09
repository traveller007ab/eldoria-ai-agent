import React, { memo } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { MechComponentInstance, MechPortDefinition } from '../../types';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { Droplets, Flame, Cog, Cpu, Zap, AlertTriangle, AlertCircle, Layers, ArrowRightCircle } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';

interface MechNodeData {
    label: string;
    component: MechComponentInstance;
    issueSeverity?: 'warning' | 'critical';
    issueMessage?: string;
    simulationState?: Record<string, number>; // Live Telemetry
}

const getIconForDomain = (domain: string) => {
    switch (domain) {
        case 'fluid': return <Droplets className="w-4 h-4" />;
        case 'thermal': return <Flame className="w-4 h-4" />;
        case 'mechanical': return <Cog className="w-4 h-4" />;
        case 'control': return <Cpu className="w-4 h-4" />;
        default: return <Zap className="w-4 h-4" />;
    }
};

const getDomainColor = (domain: string) => {
    switch (domain) {
        case 'fluid': return { bg: 'from-cyan-600/20 to-blue-600/20', border: 'border-cyan-500/50', icon: 'text-cyan-400' };
        case 'thermal': return { bg: 'from-orange-600/20 to-red-600/20', border: 'border-orange-500/50', icon: 'text-orange-400' };
        case 'mechanical': return { bg: 'from-slate-500/20 to-zinc-600/20', border: 'border-slate-400/50', icon: 'text-slate-300' };
        case 'control': return { bg: 'from-emerald-600/20 to-green-600/20', border: 'border-emerald-500/50', icon: 'text-emerald-400' };
        default: return { bg: 'from-purple-600/20 to-indigo-600/20', border: 'border-purple-500/50', icon: 'text-purple-400' };
    }
};

const getPortPosition = (port: MechPortDefinition, index: number, totalPorts: number): { top: string } => {
    if (port.position) {
        return { top: `${port.position.y * 100}%` };
    }
    // Distribute ports evenly if no position specified
    const spacing = 100 / (totalPorts + 1);
    return { top: `${spacing * (index + 1)}%` };
};

export const MechNode: React.FC<NodeProps<MechNodeData>> = memo(({ data, selected }) => {
    const { component } = data;
    const { pushBlueprint } = useMechStore();
    const componentDef = ComponentRegistry.getInstance().getComponent(component.componentDefinitionId);

    if (!componentDef) {
        return (
            <div className="px-4 py-2 bg-red-900/50 border border-red-500 rounded-lg text-red-300">
                Unknown Component
            </div>
        );
    }

    const colors = getDomainColor(componentDef.domain);
    const leftPorts = componentDef.ports.filter(p => p.position?.side === 'left' || p.type === 'input');
    const rightPorts = componentDef.ports.filter(p => p.position?.side === 'right' || p.type === 'output');
    const topPorts = componentDef.ports.filter(p => p.position?.side === 'top');
    const bottomPorts = componentDef.ports.filter(p => p.position?.side === 'bottom');

    const handleDoubleClick = (e: React.MouseEvent) => {
        if (component.childBlueprintId) {
            e.stopPropagation();
            pushBlueprint(component.childBlueprintId);
        }
    };

    return (
        <div
            onDoubleClick={handleDoubleClick}
            className={`
        relative min-w-[140px] px-3 py-2 rounded-lg
        bg-gradient-to-br ${colors.bg} backdrop-blur-sm
        border-2 ${selected ? 'border-blue-400 shadow-lg shadow-blue-500/20' : colors.border}
        transition-all duration-200
      `}
        >
            {/* Header */}
            <div className="flex items-center gap-2 mb-1">
                <div className={`${colors.icon}`}>
                    {component.childBlueprintId ? <Layers className="w-4 h-4" /> : getIconForDomain(componentDef.domain)}
                </div>
                <span className="text-sm font-medium text-white truncate">{component.name}</span>

                {/* Subsystem Indicator */}
                {component.childBlueprintId && (
                    <div className="absolute -top-1 -right-1 bg-purple-500/20 border border-purple-500/50 rounded-full p-0.5">
                        <Layers className="w-2.5 h-2.5 text-purple-300" />
                    </div>
                )}

                {/* Diagnostics Badge */}
                {data.issueSeverity && (
                    <div className={`
                        absolute -top-2 -right-2 p-1 rounded-full shadow-lg border bg-[#0f1014]
                        ${data.issueSeverity === 'critical' ? 'border-red-500 text-red-500 animate-pulse' : 'border-yellow-500 text-yellow-500'}
                    `} title={data.issueMessage}>
                        {data.issueSeverity === 'critical' ? <AlertCircle className="w-4 h-4 fill-red-500/20" /> : <AlertTriangle className="w-4 h-4 fill-yellow-500/20" />}
                    </div>
                )}
            </div>

            {/* Subcategory */}
            <div className="text-[10px] text-slate-400 capitalize">
                {componentDef.subcategory}
            </div>

            {/* Live Telemetry Display */}
            {data.simulationState && (
                <div className="mt-2 space-y-0.5 border-t border-white/10 pt-1">
                    {Object.entries(data.simulationState).slice(0, 3).map(([key, value]) => {
                        // Format key (e.g. "port1.P" -> "P")
                        const shortKey = key.split('.').pop() || key;
                        // Format value
                        const displayVal = typeof value === 'number' ? value.toFixed(1) : value;
                        return (
                            <div key={key} className="flex justify-between text-[9px] font-mono">
                                <span className="text-slate-400">{shortKey}:</span>
                                <span className="text-emerald-300">{displayVal}</span>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Subsystem Entry Action */}
            {component.childBlueprintId && (
                <div className="mt-2 pt-2 border-t border-white/10">
                    <button
                        onClick={(e) => { e.stopPropagation(); pushBlueprint(component.childBlueprintId!); }}
                        className="w-full flex items-center justify-center gap-1.5 py-1 px-2 rounded bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 text-[10px] font-medium transition-colors"
                    >
                        <ArrowRightCircle className="w-3 h-3" />
                        Enter Subsystem
                    </button>
                </div>
            )}
            
            {/* Ports - Absolute Positioning */}
            {leftPorts.map((port, index) => (
                <Handle
                    key={port.id}
                    type="target"
                    position={Position.Left}
                    id={port.id}
                    style={{
                        ...getPortPosition(port, index, leftPorts.length),
                        background: '#64748b',
                        width: 10,
                        height: 10,
                        border: '2px solid #1e293b'
                    }}
                    title={port.name}
                />
            ))}

            {/* Right Ports */}
            {rightPorts.map((port, index) => (
                <Handle
                    key={port.id}
                    type="source"
                    position={Position.Right}
                    id={port.id}
                    style={{
                        ...getPortPosition(port, index, rightPorts.length),
                        background: '#64748b',
                        width: 10,
                        height: 10,
                        border: '2px solid #1e293b'
                    }}
                    title={port.name}
                />
            ))}

            {/* Top Ports */}
            {topPorts.map((port, index) => (
                <Handle
                    key={port.id}
                    type={port.type === 'input' ? 'target' : 'source'}
                    position={Position.Top}
                    id={port.id}
                    style={{
                        left: `${((index + 1) / (topPorts.length + 1)) * 100}%`,
                        background: '#64748b',
                        width: 10,
                        height: 10,
                        border: '2px solid #1e293b'
                    }}
                    title={port.name}
                />
            ))}

            {/* Bottom Ports */}
            {bottomPorts.map((port, index) => (
                <Handle
                    key={port.id}
                    type={port.type === 'input' ? 'target' : 'source'}
                    position={Position.Bottom}
                    id={port.id}
                    style={{
                        left: `${((index + 1) / (bottomPorts.length + 1)) * 100}%`,
                        background: '#64748b',
                        width: 10,
                        height: 10,
                        border: '2px solid #1e293b'
                    }}
                    title={port.name}
                />
            ))}
        </div>
    );
});

MechNode.displayName = 'MechNode';

export const nodeTypes = {
    mechNode: MechNode
};

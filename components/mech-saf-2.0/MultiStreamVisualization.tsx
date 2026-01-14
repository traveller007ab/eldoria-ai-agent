/**
 * Multi-Stream Visualization
 * 
 * Visualizes multiple fluid streams flowing through the system.
 * Shows fluid composition, phase, and warns about incompatible connections.
 */

import React, { useState, useMemo } from 'react';
import {
    Droplets, AlertTriangle, CheckCircle2, Info,
    Thermometer, Gauge, Waves, Flame, Snowflake
} from 'lucide-react';

// ═══════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════

export interface FluidStream {
    id: string;
    name: string;
    fluidType: 'water' | 'coolant' | 'oil' | 'fuel' | 'refrigerant' | 'steam' | 'air' | 'custom';
    phase: 'liquid' | 'gas' | 'two-phase';
    circuit: string;
    color: string;
    properties: {
        temperature: number;  // °C
        pressure: number;     // kPa
        flowRate: number;     // kg/s
        density?: number;     // kg/m³
        viscosity?: number;   // Pa·s
    };
    composition?: {
        species: string;
        fraction: number;
    }[];
}

export interface StreamConnection {
    fromComponent: string;
    toComponent: string;
    streamId: string;
    isCompatible: boolean;
    warning?: string;
}

interface MultiStreamVisualizationProps {
    streams: FluidStream[];
    connections: StreamConnection[];
    selectedStreamId?: string;
    onStreamSelect?: (streamId: string) => void;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════

const FLUID_COLORS: Record<FluidStream['fluidType'], string> = {
    water: '#3b82f6',      // Blue
    coolant: '#06b6d4',    // Cyan
    oil: '#f59e0b',        // Amber
    fuel: '#ef4444',       // Red
    refrigerant: '#8b5cf6', // Purple
    steam: '#e5e7eb',      // Gray
    air: '#a3e635',        // Lime
    custom: '#ec4899'      // Pink
};

const PHASE_ICONS: Record<FluidStream['phase'], React.ReactNode> = {
    liquid: <Droplets className="w-3 h-3" />,
    gas: <Waves className="w-3 h-3" />,
    'two-phase': <Flame className="w-3 h-3" />
};

// ═══════════════════════════════════════════════════════════════
// DEMO DATA
// ═══════════════════════════════════════════════════════════════

const DEMO_STREAMS: FluidStream[] = [
    {
        id: 'cooling_water',
        name: 'Cooling Water',
        fluidType: 'water',
        phase: 'liquid',
        circuit: 'cooling',
        color: FLUID_COLORS.water,
        properties: {
            temperature: 25,
            pressure: 300,
            flowRate: 5.2
        }
    },
    {
        id: 'glycol_coolant',
        name: '50% Glycol Coolant',
        fluidType: 'coolant',
        phase: 'liquid',
        circuit: 'engine_cooling',
        color: FLUID_COLORS.coolant,
        properties: {
            temperature: 85,
            pressure: 200,
            flowRate: 2.1
        },
        composition: [
            { species: 'Water', fraction: 0.5 },
            { species: 'Ethylene Glycol', fraction: 0.5 }
        ]
    },
    {
        id: 'lube_oil',
        name: 'Lubricating Oil',
        fluidType: 'oil',
        phase: 'liquid',
        circuit: 'lubrication',
        color: FLUID_COLORS.oil,
        properties: {
            temperature: 65,
            pressure: 400,
            flowRate: 0.8
        }
    },
    {
        id: 'fuel_line',
        name: 'Diesel Fuel',
        fluidType: 'fuel',
        phase: 'liquid',
        circuit: 'fuel_system',
        color: FLUID_COLORS.fuel,
        properties: {
            temperature: 40,
            pressure: 600,
            flowRate: 0.15
        }
    }
];

const DEMO_CONNECTIONS: StreamConnection[] = [
    { fromComponent: 'Tank_1', toComponent: 'Pump_1', streamId: 'cooling_water', isCompatible: true },
    { fromComponent: 'Pump_1', toComponent: 'HX_1', streamId: 'cooling_water', isCompatible: true },
    { fromComponent: 'HX_1', toComponent: 'Tank_1', streamId: 'cooling_water', isCompatible: true },
    { fromComponent: 'Engine', toComponent: 'Radiator', streamId: 'glycol_coolant', isCompatible: true },
    { fromComponent: 'Oil_Pump', toComponent: 'Engine', streamId: 'lube_oil', isCompatible: true },
    { fromComponent: 'Fuel_Tank', toComponent: 'Injector', streamId: 'fuel_line', isCompatible: true },
    // Incompatible connection example
    { fromComponent: 'Water_Line', toComponent: 'Oil_Pump', streamId: 'cooling_water', isCompatible: false, warning: 'Water connected to oil circuit!' }
];

// ═══════════════════════════════════════════════════════════════
// COMPONENT
// ═══════════════════════════════════════════════════════════════

export const MultiStreamVisualization: React.FC<MultiStreamVisualizationProps> = ({
    streams = DEMO_STREAMS,
    connections = DEMO_CONNECTIONS,
    selectedStreamId,
    onStreamSelect
}) => {
    const [hoveredStream, setHoveredStream] = useState<string | null>(null);

    const incompatibleConnections = useMemo(() =>
        connections.filter(c => !c.isCompatible),
        [connections]
    );

    const circuitGroups = useMemo(() => {
        const groups: Record<string, FluidStream[]> = {};
        for (const stream of streams) {
            if (!groups[stream.circuit]) {
                groups[stream.circuit] = [];
            }
            groups[stream.circuit].push(stream);
        }
        return groups;
    }, [streams]);

    return (
        <div className="bg-slate-900 rounded-xl border border-slate-700 overflow-hidden">
            {/* Header */}
            <div className="p-3 border-b border-slate-700 bg-gradient-to-r from-blue-900/30 to-cyan-900/30 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-gradient-to-br from-blue-500 to-cyan-500 rounded-lg">
                        <Droplets className="w-4 h-4 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-bold text-white">Multi-Stream Monitor</h3>
                        <p className="text-xs text-slate-400">
                            {streams.length} streams · {Object.keys(circuitGroups).length} circuits
                        </p>
                    </div>
                </div>

                {incompatibleConnections.length > 0 && (
                    <div className="flex items-center gap-1.5 px-2 py-1 bg-red-500/20 border border-red-500/30 rounded-lg">
                        <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-xs text-red-400 font-medium">
                            {incompatibleConnections.length} incompatible
                        </span>
                    </div>
                )}
            </div>

            {/* Warnings */}
            {incompatibleConnections.length > 0 && (
                <div className="p-2 bg-red-500/10 border-b border-red-500/20">
                    {incompatibleConnections.map((conn, i) => (
                        <div key={i} className="flex items-center gap-2 text-xs text-red-400 py-1">
                            <AlertTriangle className="w-3 h-3 shrink-0" />
                            <span>
                                <strong>{conn.fromComponent}</strong> → <strong>{conn.toComponent}</strong>: {conn.warning}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Stream Cards */}
            <div className="p-3 grid grid-cols-1 gap-3">
                {streams.map(stream => (
                    <StreamCard
                        key={stream.id}
                        stream={stream}
                        isSelected={selectedStreamId === stream.id}
                        isHovered={hoveredStream === stream.id}
                        onSelect={() => onStreamSelect?.(stream.id)}
                        onHover={(hover) => setHoveredStream(hover ? stream.id : null)}
                    />
                ))}
            </div>

            {/* Legend */}
            <div className="p-2 border-t border-slate-800 bg-slate-900/50">
                <div className="flex flex-wrap gap-3 text-xs">
                    {Object.entries(FLUID_COLORS).map(([type, color]) => (
                        <div key={type} className="flex items-center gap-1.5">
                            <div
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: color }}
                            />
                            <span className="text-slate-500 capitalize">{type}</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

// ═══════════════════════════════════════════════════════════════
// STREAM CARD
// ═══════════════════════════════════════════════════════════════

interface StreamCardProps {
    stream: FluidStream;
    isSelected: boolean;
    isHovered: boolean;
    onSelect: () => void;
    onHover: (hover: boolean) => void;
}

const StreamCard: React.FC<StreamCardProps> = ({
    stream,
    isSelected,
    isHovered,
    onSelect,
    onHover
}) => {
    return (
        <div
            className={`
        p-3 rounded-lg border transition-all cursor-pointer
        ${isSelected
                    ? 'bg-slate-700/50 border-cyan-500/50 ring-1 ring-cyan-500/30'
                    : isHovered
                        ? 'bg-slate-800/80 border-slate-600'
                        : 'bg-slate-800/50 border-slate-700 hover:border-slate-600'}
      `}
            onClick={onSelect}
            onMouseEnter={() => onHover(true)}
            onMouseLeave={() => onHover(false)}
        >
            <div className="flex items-start justify-between gap-3">
                {/* Left: Info */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5">
                        <div
                            className="w-3 h-3 rounded-full ring-2 ring-white/20"
                            style={{ backgroundColor: stream.color }}
                        />
                        <span className="text-sm font-medium text-white truncate">{stream.name}</span>
                        <span className="px-1.5 py-0.5 bg-slate-700 text-slate-400 text-xs rounded">
                            {stream.circuit}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400">
                        <span className="flex items-center gap-1">
                            {PHASE_ICONS[stream.phase]}
                            <span className="capitalize">{stream.phase}</span>
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                            {stream.fluidType}
                        </span>
                    </div>
                </div>

                {/* Right: Properties */}
                <div className="flex flex-col items-end gap-1 text-xs">
                    <div className="flex items-center gap-1 text-amber-400">
                        <Thermometer className="w-3 h-3" />
                        <span>{stream.properties.temperature}°C</span>
                    </div>
                    <div className="flex items-center gap-1 text-cyan-400">
                        <Gauge className="w-3 h-3" />
                        <span>{stream.properties.pressure} kPa</span>
                    </div>
                    <div className="flex items-center gap-1 text-green-400">
                        <Droplets className="w-3 h-3" />
                        <span>{stream.properties.flowRate} kg/s</span>
                    </div>
                </div>
            </div>

            {/* Composition (if available) */}
            {stream.composition && stream.composition.length > 0 && (
                <div className="mt-2 pt-2 border-t border-slate-700/50">
                    <div className="flex flex-wrap gap-1.5">
                        {stream.composition.map((comp, i) => (
                            <span
                                key={i}
                                className="px-1.5 py-0.5 bg-slate-900/50 border border-slate-700 rounded text-xs text-slate-400"
                            >
                                {comp.species}: {(comp.fraction * 100).toFixed(0)}%
                            </span>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default MultiStreamVisualization;

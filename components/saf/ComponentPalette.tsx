import React from 'react';
import { Zap, Cog, Database, CircleDot, Flame, Droplets, Wind, Lightbulb } from 'lucide-react';

/**
 * ComponentPalette: Drag-and-Drop Component Library
 * 
 * This is the "modular building" heart of SAF Lab.
 * Users drag components from here onto the canvas.
 */

import { SAFParameter } from './types';

// Component Type Definitions
export type ComponentCategory = 'source' | 'transform' | 'store' | 'sink';

export interface PaletteItem {
    id: string;
    name: string;
    category: ComponentCategory;
    icon: React.ReactNode;
    description: string;
    defaultParams: SAFParameter[];
    color?: string; // Optional hex color for visual customization
}

// Predefined Components Library with REAL default parameters
const PALETTE_ITEMS: PaletteItem[] = [
    // ========================
    // SOURCES - Energy/Material generators
    // ========================
    {
        id: 'battery',
        name: 'Battery',
        category: 'source',
        icon: <Zap className="w-4 h-4" />,
        description: 'Electrical energy storage',
        color: '#10b981',
        defaultParams: [
            { name: 'Capacity', value: 100, unit: 'Ah', min: 10, max: 1000, description: 'Total charge capacity' },
            { name: 'Voltage', value: 12, unit: 'V', min: 3.7, max: 48, description: 'Nominal voltage' },
            { name: 'SOC', value: 100, unit: '%', min: 0, max: 100, description: 'State of Charge' },
            { name: 'Internal Resistance', value: 0.02, unit: 'Ω', min: 0.001, max: 0.5, description: 'Internal resistance' },
        ]
    },
    {
        id: 'solar_panel',
        name: 'Solar Panel',
        category: 'source',
        icon: <CircleDot className="w-4 h-4" />,
        description: 'Photovoltaic power source',
        color: '#f59e0b',
        defaultParams: [
            { name: 'Peak Power', value: 400, unit: 'W', min: 50, max: 600, description: 'Rated peak power' },
            { name: 'Efficiency', value: 22, unit: '%', min: 15, max: 25, description: 'Conversion efficiency' },
            { name: 'Area', value: 2, unit: 'm²', min: 0.5, max: 3, description: 'Panel surface area' },
            { name: 'Irradiance', value: 1000, unit: 'W/m²', min: 0, max: 1200, description: 'Solar irradiance' },
        ]
    },
    {
        id: 'fuel_tank',
        name: 'Fuel Tank',
        category: 'source',
        icon: <Flame className="w-4 h-4" />,
        description: 'Chemical energy source (fuel)',
        color: '#ef4444',
        defaultParams: [
            { name: 'Capacity', value: 50, unit: 'L', min: 5, max: 500, description: 'Tank volume' },
            { name: 'Fuel Level', value: 100, unit: '%', min: 0, max: 100, description: 'Current fill level' },
            { name: 'Energy Density', value: 34.2, unit: 'MJ/L', min: 20, max: 45, description: 'Energy per liter (diesel ~36, gasoline ~34)' },
            { name: 'Flow Rate', value: 1.5, unit: 'L/min', min: 0.1, max: 10, description: 'Fuel flow rate' },
        ]
    },

    // ========================
    // TRANSFORMS - Energy/Material converters
    // ========================
    {
        id: 'inverter',
        name: 'Inverter',
        category: 'transform',
        icon: <Cog className="w-4 h-4" />,
        description: 'DC to AC power conversion',
        color: '#3b82f6',
        defaultParams: [
            { name: 'Rated Power', value: 3000, unit: 'W', min: 500, max: 10000, description: 'Maximum continuous power' },
            { name: 'Efficiency', value: 95, unit: '%', min: 85, max: 98, description: 'Conversion efficiency' },
            { name: 'Input Voltage', value: 48, unit: 'V', min: 12, max: 96, description: 'DC input voltage' },
            { name: 'Output Voltage', value: 230, unit: 'V', min: 110, max: 240, description: 'AC output voltage' },
        ]
    },
    {
        id: 'motor',
        name: 'Electric Motor',
        category: 'transform',
        icon: <Cog className="w-4 h-4" />,
        description: 'Electrical to mechanical conversion',
        color: '#8b5cf6',
        defaultParams: [
            { name: 'Rated Power', value: 1500, unit: 'W', min: 100, max: 50000, description: 'Mechanical output power' },
            { name: 'Efficiency', value: 88, unit: '%', min: 70, max: 95, description: 'Motor efficiency' },
            { name: 'RPM', value: 1800, unit: 'rpm', min: 500, max: 5000, description: 'Rotational speed' },
            { name: 'Torque', value: 8, unit: 'Nm', min: 0.5, max: 100, description: 'Mechanical torque' },
        ]
    },
    {
        id: 'pump',
        name: 'Pump',
        category: 'transform',
        icon: <Droplets className="w-4 h-4" />,
        description: 'Fluid pressure/flow generator',
        color: '#06b6d4',
        defaultParams: [
            { name: 'Flow Rate', value: 10, unit: 'L/min', min: 1, max: 500, description: 'Volumetric flow rate' },
            { name: 'Head', value: 20, unit: 'm', min: 1, max: 100, description: 'Pressure head' },
            { name: 'Efficiency', value: 75, unit: '%', min: 50, max: 90, description: 'Hydraulic efficiency' },
            { name: 'Power', value: 500, unit: 'W', min: 50, max: 5000, description: 'Input power' },
        ]
    },
    {
        id: 'heat_exchanger',
        name: 'Heat Exchanger',
        category: 'transform',
        icon: <Wind className="w-4 h-4" />,
        description: 'Thermal energy transfer',
        color: '#ec4899',
        defaultParams: [
            { name: 'Heat Transfer', value: 5000, unit: 'W', min: 100, max: 50000, description: 'Heat transfer rate' },
            { name: 'Effectiveness', value: 85, unit: '%', min: 50, max: 95, description: 'Thermal effectiveness' },
            { name: 'Hot Side Temp', value: 80, unit: '°C', min: 20, max: 200, description: 'Hot side inlet temperature' },
            { name: 'Cold Side Temp', value: 20, unit: '°C', min: 5, max: 50, description: 'Cold side inlet temperature' },
        ]
    },

    // ========================
    // STORES - Buffers and accumulators
    // ========================
    {
        id: 'accumulator',
        name: 'Accumulator',
        category: 'store',
        icon: <Database className="w-4 h-4" />,
        description: 'Energy buffer/storage',
        color: '#a855f7',
        defaultParams: [
            { name: 'Capacity', value: 500, unit: 'kJ', min: 10, max: 10000, description: 'Total storage capacity' },
            { name: 'Stored', value: 250, unit: 'kJ', min: 0, max: 10000, description: 'Current stored energy' },
            { name: 'Charge Rate', value: 100, unit: 'W', min: 10, max: 1000, description: 'Max charge rate' },
            { name: 'Discharge Rate', value: 100, unit: 'W', min: 10, max: 1000, description: 'Max discharge rate' },
        ]
    },
    {
        id: 'tank',
        name: 'Fluid Tank',
        category: 'store',
        icon: <Droplets className="w-4 h-4" />,
        description: 'Liquid storage vessel',
        color: '#14b8a6',
        defaultParams: [
            { name: 'Volume', value: 1000, unit: 'L', min: 50, max: 50000, description: 'Tank volume' },
            { name: 'Fill Level', value: 50, unit: '%', min: 0, max: 100, description: 'Current fill percentage' },
            { name: 'Pressure', value: 1, unit: 'bar', min: 0.5, max: 10, description: 'Internal pressure' },
            { name: 'Temperature', value: 25, unit: '°C', min: -20, max: 100, description: 'Fluid temperature' },
        ]
    },

    // ========================
    // SINKS - Consumers
    // ========================
    {
        id: 'load',
        name: 'Electrical Load',
        category: 'sink',
        icon: <Lightbulb className="w-4 h-4" />,
        description: 'Power consumer (appliances, devices)',
        color: '#f59e0b',
        defaultParams: [
            { name: 'Power', value: 500, unit: 'W', min: 10, max: 10000, description: 'Power consumption' },
            { name: 'Power Factor', value: 0.9, unit: '', min: 0.5, max: 1, description: 'Electrical power factor' },
            { name: 'Duty Cycle', value: 100, unit: '%', min: 0, max: 100, description: 'Percentage of time active' },
        ]
    },
    {
        id: 'drain',
        name: 'Drain',
        category: 'sink',
        icon: <CircleDot className="w-4 h-4" />,
        description: 'Material/fluid disposal',
        color: '#6b7280',
        defaultParams: [
            { name: 'Flow Rate', value: 5, unit: 'L/min', min: 0.1, max: 100, description: 'Disposal flow rate' },
        ]
    },
];

// Category Metadata
const CATEGORY_CONFIG: Record<ComponentCategory, { label: string; color: string; bgColor: string }> = {
    source: { label: 'Sources', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10' },
    transform: { label: 'Transforms', color: 'text-cyan-400', bgColor: 'bg-cyan-500/10' },
    store: { label: 'Storage', color: 'text-purple-400', bgColor: 'bg-purple-500/10' },
    sink: { label: 'Sinks', color: 'text-rose-400', bgColor: 'bg-rose-500/10' },
};

interface ComponentPaletteProps {
    onAddNode?: (type: 'core' | 'subcore' | 'micro', position?: { x: number; y: number }) => void;
}

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({ onAddNode }) => {
    // Group items by category
    const groupedItems = PALETTE_ITEMS.reduce((acc, item) => {
        if (!acc[item.category]) acc[item.category] = [];
        acc[item.category].push(item);
        return acc;
    }, {} as Record<ComponentCategory, PaletteItem[]>);

    const handleDragStart = (e: React.DragEvent, item: PaletteItem) => {
        // Set drag data for the canvas to read
        e.dataTransfer.setData('application/saf-component', JSON.stringify({
            id: item.id,
            name: item.name,
            category: item.category,
            defaultParams: item.defaultParams,
        }));
        e.dataTransfer.effectAllowed = 'copy';
    };

    return (
        <div className="w-56 bg-black/60 backdrop-blur-md border-r border-white/10 flex flex-col h-full overflow-hidden">
            {/* Header */}
            <div className="px-4 py-3 border-b border-white/10">
                <h2 className="text-xs font-bold text-white/80 uppercase tracking-wider">
                    Components
                </h2>
                <p className="text-[10px] text-gray-500 mt-0.5">
                    Drag onto canvas
                </p>
            </div>

            {/* Component List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-4">
                {(Object.entries(groupedItems) as [ComponentCategory, PaletteItem[]][]).map(([category, items]) => {
                    const config = CATEGORY_CONFIG[category];
                    return (
                        <div key={category}>
                            {/* Category Header */}
                            <div className={`px-2 py-1 rounded text-[10px] font-bold uppercase ${config.color} ${config.bgColor} mb-2`}>
                                {config.label}
                            </div>

                            {/* Items */}
                            <div className="space-y-1">
                                {items.map((item) => (
                                    <div
                                        key={item.id}
                                        draggable
                                        onDragStart={(e) => handleDragStart(e, item)}
                                        className="group flex items-center gap-2 px-2 py-1.5 rounded cursor-grab active:cursor-grabbing
                                            bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20
                                            transition-all duration-150"
                                        title={item.description}
                                    >
                                        <div className={`p-1 rounded ${config.bgColor} ${config.color}`}>
                                            {item.icon}
                                        </div>
                                        <span className="text-xs text-gray-300 group-hover:text-white">
                                            {item.name}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Footer: Keyboard Hints */}
            <div className="px-4 py-2 border-t border-white/10 text-[9px] text-gray-600">
                <span className="font-mono bg-white/5 px-1 rounded">S</span> Source &nbsp;
                <span className="font-mono bg-white/5 px-1 rounded">T</span> Transform
            </div>
        </div>
    );
};

// Export the palette items for use elsewhere
export { PALETTE_ITEMS, CATEGORY_CONFIG };

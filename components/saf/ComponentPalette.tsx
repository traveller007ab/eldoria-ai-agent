import React from 'react';
import { Zap, Cog, Database, CircleDot, Flame, Droplets, Wind, Lightbulb } from 'lucide-react';

/**
 * ComponentPalette: Drag-and-Drop Component Library
 * 
 * This is the "modular building" heart of SAF Lab.
 * Users drag components from here onto the canvas.
 */

// Component Type Definitions
export type ComponentCategory = 'source' | 'transform' | 'store' | 'sink';

export interface PaletteItem {
    id: string;
    name: string;
    category: ComponentCategory;
    icon: React.ReactNode;
    description: string;
    defaultParams?: Record<string, number>;
}

// Predefined Components Library
const PALETTE_ITEMS: PaletteItem[] = [
    // SOURCES - Energy/Material generators
    {
        id: 'battery',
        name: 'Battery',
        category: 'source',
        icon: <Zap className="w-4 h-4" />,
        description: 'Electrical energy storage',
        defaultParams: { capacity: 100, voltage: 12 }
    },
    {
        id: 'solar_panel',
        name: 'Solar Panel',
        category: 'source',
        icon: <CircleDot className="w-4 h-4" />,
        description: 'Photovoltaic power source',
        defaultParams: { capacity: 250, efficiency: 0.22 }
    },
    {
        id: 'fuel_tank',
        name: 'Fuel Tank',
        category: 'source',
        icon: <Flame className="w-4 h-4" />,
        description: 'Chemical energy source',
        defaultParams: { capacity: 50, flow: 1.5 }
    },

    // TRANSFORMS - Energy/Material converters
    {
        id: 'inverter',
        name: 'Inverter',
        category: 'transform',
        icon: <Cog className="w-4 h-4" />,
        description: 'DC to AC conversion',
        defaultParams: { efficiency: 0.95 }
    },
    {
        id: 'motor',
        name: 'Motor',
        category: 'transform',
        icon: <Cog className="w-4 h-4" />,
        description: 'Electrical to mechanical',
        defaultParams: { efficiency: 0.88, power: 1000 }
    },
    {
        id: 'pump',
        name: 'Pump',
        category: 'transform',
        icon: <Droplets className="w-4 h-4" />,
        description: 'Fluid pressure lift',
        defaultParams: { efficiency: 0.75, flow: 10 }
    },
    {
        id: 'heat_exchanger',
        name: 'Heat Exchanger',
        category: 'transform',
        icon: <Wind className="w-4 h-4" />,
        description: 'Thermal energy transfer',
        defaultParams: { efficiency: 0.90, area: 5 }
    },

    // STORES - Buffers and accumulators
    {
        id: 'accumulator',
        name: 'Accumulator',
        category: 'store',
        icon: <Database className="w-4 h-4" />,
        description: 'Energy buffer',
        defaultParams: { capacity: 500 }
    },
    {
        id: 'tank',
        name: 'Tank',
        category: 'store',
        icon: <Droplets className="w-4 h-4" />,
        description: 'Fluid storage',
        defaultParams: { capacity: 1000, pressure: 1 }
    },

    // SINKS - Consumers
    {
        id: 'load',
        name: 'Load',
        category: 'sink',
        icon: <Lightbulb className="w-4 h-4" />,
        description: 'Power consumer',
        defaultParams: { power: 500 }
    },
    {
        id: 'drain',
        name: 'Drain',
        category: 'sink',
        icon: <CircleDot className="w-4 h-4" />,
        description: 'Material disposal',
        defaultParams: {}
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

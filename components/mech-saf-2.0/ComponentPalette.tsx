import React, { useState, useMemo } from 'react';
import { Search, ChevronDown, ChevronRight, Hexagon, Droplets, Flame, Cpu, Cog } from 'lucide-react';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { MechComponentDefinition } from '../../types';

export const ComponentPalette: React.FC = () => {
    const [searchQuery, setSearchQuery] = useState('');
    const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({
        'fluid': true,
        'thermal': false,
        'mechanical': false,
        'control': false
    });

    const registry = ComponentRegistry.getInstance();
    const allComponents = registry.getAllComponents();

    const filteredComponents = useMemo(() => {
        if (!searchQuery) return allComponents;
        return registry.searchComponents(searchQuery);
    }, [searchQuery, allComponents]);

    const groupedComponents = useMemo(() => {
        const groups: Record<string, MechComponentDefinition[]> = {};
        filteredComponents.forEach(comp => {
            if (!groups[comp.domain]) {
                groups[comp.domain] = [];
            }
            groups[comp.domain].push(comp);
        });
        return groups;
    }, [filteredComponents]);

    const toggleCategory = (category: string) => {
        setExpandedCategories(prev => ({ ...prev, [category]: !prev[category] }));
    };

    const onDragStart = (event: React.DragEvent, component: MechComponentDefinition) => {
        event.dataTransfer.setData('application/reactflow', JSON.stringify(component));
        event.dataTransfer.effectAllowed = 'move';
    };

    const getIcon = (domain: string) => {
        switch (domain) {
            case 'fluid': return <Droplets className="w-4 h-4 text-cyan-400" />;
            case 'thermal': return <Flame className="w-4 h-4 text-orange-400" />;
            case 'mechanical': return <Cog className="w-4 h-4 text-slate-400" />;
            case 'control': return <Cpu className="w-4 h-4 text-emerald-400" />;
            default: return <Hexagon className="w-4 h-4" />;
        }
    };

    const getDomainLabel = (domain: string) => {
        switch (domain) {
            case 'fluid': return 'Fluid Systems';
            case 'thermal': return 'Thermal Components';
            case 'mechanical': return 'Machine Elements';
            case 'control': return 'Control Systems';
            default: return domain;
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-3 border-b border-slate-700">
                <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search components..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-md py-2 pl-9 pr-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 transition-colors"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-2 custom-scrollbar">
                {Object.entries(groupedComponents).map(([domain, components]) => (
                    <div key={domain} className="rounded-lg overflow-hidden border border-slate-700/50 bg-slate-800/50">
                        <button
                            className="w-full flex items-center justify-between p-2.5 bg-slate-800 hover:bg-slate-700 transition-colors"
                            onClick={() => toggleCategory(domain)}
                        >
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-200">
                                {getIcon(domain)}
                                {getDomainLabel(domain)}
                                <span className="text-xs text-slate-500">({components.length})</span>
                            </div>
                            {expandedCategories[domain] ? <ChevronDown className="w-4 h-4 text-slate-500" /> : <ChevronRight className="w-4 h-4 text-slate-500" />}
                        </button>

                        {expandedCategories[domain] && (
                            <div className="p-2 space-y-1 bg-slate-900/30">
                                {components.map(comp => (
                                    <div
                                        key={comp.id}
                                        className="flex items-center gap-3 p-2 rounded-md hover:bg-slate-700/50 hover:border-blue-500/30 border border-transparent cursor-grab active:cursor-grabbing group transition-all"
                                        draggable
                                        onDragStart={(e) => onDragStart(e, comp)}
                                    >
                                        <div className="w-9 h-9 rounded bg-slate-800 flex items-center justify-center text-slate-400 group-hover:text-blue-400 group-hover:bg-blue-500/10 transition-colors shrink-0">
                                            <span className="text-xs font-bold">{comp.name.substring(0, 2).toUpperCase()}</span>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="text-sm font-medium text-slate-200 group-hover:text-white truncate">{comp.name}</div>
                                            <div className="text-xs text-slate-500 truncate">{comp.description}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                ))}

                {Object.keys(groupedComponents).length === 0 && (
                    <div className="text-center text-slate-500 py-8 text-sm">
                        No components match your search.
                    </div>
                )}
            </div>
        </div>
    );
};

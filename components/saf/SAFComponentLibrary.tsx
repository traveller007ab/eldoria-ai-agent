import React, { useState } from 'react';
import { Search, Plus, Box, Layers, Cpu, FolderOpen, FileText, Grid } from 'lucide-react';
import { COMPONENT_STYLES } from './types';

interface SAFComponentLibraryProps {
    onAddNode: (type: 'core' | 'subcore' | 'micro', position?: { x: number; y: number }) => void;
    onLoadProject?: (id: string) => void;
}

export const SAFComponentLibrary: React.FC<SAFComponentLibraryProps> = ({ onAddNode, onLoadProject }) => {
    const [activeTab, setActiveTab] = useState<'library' | 'projects'>('library');
    const [searchQuery, setSearchQuery] = useState('');

    const componentCategories = [
        {
            id: 'core',
            name: 'Core Systems',
            icon: Box,
            description: 'Major system components (Turbines, reactors)',
            style: COMPONENT_STYLES.core
        },
        {
            id: 'subcore',
            name: 'Sub-Systems',
            icon: Layers,
            description: 'Supporting assemblies (Pumps, heat exchangers)',
            style: COMPONENT_STYLES.subcore
        },
        {
            id: 'micro',
            name: 'Micro Components',
            icon: Cpu,
            description: 'Sensors, valves, controllers',
            style: COMPONENT_STYLES.micro
        }
    ];

    // Mock project list
    const recentProjects = [
        { id: 'p1', name: 'Rankine Cycle Plant', domain: 'mechanical', updated: '2h ago' },
        { id: 'p2', name: 'Solar Microgrid', domain: 'electrical', updated: '1d ago' },
        { id: 'p3', name: 'Water Treatment', domain: 'fluid', updated: '3d ago' },
    ];

    return (
        <div className="w-64 shrink-0 flex flex-col bg-black/40 border-r border-cyan-900/30 overflow-hidden">
            {/* Sidebar Header */}
            <div className="p-4 border-b border-cyan-900/20">
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Explorer</h3>

                {/* Search */}
                <div className="relative">
                    <Search className="absolute left-2 top-2 w-4 h-4 text-gray-500" />
                    <input
                        type="text"
                        placeholder="Search..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-gray-900/50 border border-gray-800 rounded-lg pl-8 pr-2 py-1.5 text-xs text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-cyan-900/20">
                <button
                    onClick={() => setActiveTab('library')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'library' ? 'text-cyan-400 bg-cyan-900/10 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <Grid className="w-3 h-3" />
                    Library
                </button>
                <button
                    onClick={() => setActiveTab('projects')}
                    className={`flex-1 py-2 text-xs font-medium flex items-center justify-center gap-2 transition-colors ${activeTab === 'projects' ? 'text-cyan-400 bg-cyan-900/10 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
                        }`}
                >
                    <FolderOpen className="w-3 h-3" />
                    Projects
                </button>
            </div>

            {/* Content Area */}
            <div className="flex-grow overflow-y-auto p-4 space-y-4">
                {activeTab === 'library' ? (
                    <div className="space-y-6">
                        {componentCategories.map(cat => (
                            <div key={cat.id} className="space-y-2">
                                <h4 className="text-[10px] uppercase font-bold text-gray-600 pl-1">{cat.name}</h4>
                                <div
                                    draggable
                                    onDragStart={(e) => {
                                        e.dataTransfer.setData('application/reactflow/type', cat.id);
                                        e.dataTransfer.effectAllowed = 'move';
                                    }}
                                    className="group p-3 bg-gray-900/40 border border-gray-800 rounded-xl hover:border-cyan-500/30 hover:bg-gray-900/60 cursor-grab active:cursor-grabbing transition-all hover:shadow-[0_0_15px_rgba(6,182,212,0.1)]"
                                    onClick={() => onAddNode(cat.id as any)}
                                >
                                    <div className="flex items-center gap-3 mb-2">
                                        <div
                                            className="p-2 rounded-lg bg-black/40"
                                            style={{ color: cat.style.borderColor }}
                                        >
                                            <cat.icon className="w-5 h-5" />
                                        </div>
                                        <div>
                                            <div className="text-sm font-bold text-gray-200 group-hover:text-white">{cat.name}</div>
                                            <div className="text-[10px] text-gray-500">{cat.id} component</div>
                                        </div>
                                    </div>
                                    <p className="text-[10px] text-gray-500 leading-relaxed pl-1">
                                        {cat.description}
                                    </p>
                                    <div className="mt-2 flex justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                                        <div className="text-[10px] flex items-center gap-1 text-cyan-400 bg-cyan-900/20 px-1.5 py-0.5 rounded">
                                            <Plus className="w-3 h-3" />
                                            Add
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <div className="space-y-2">
                        {recentProjects.map(proj => (
                            <button
                                key={proj.id}
                                disabled
                                className="w-full p-3 bg-gray-900/20 border border-gray-800 rounded-xl flex items-center gap-3 hover:bg-gray-800/40 opacity-60 cursor-not-allowed group text-left"
                            >
                                <div className="p-2 bg-gray-800 rounded-lg text-gray-400">
                                    <FileText className="w-4 h-4" />
                                </div>
                                <div className="flex-grow min-w-0">
                                    <div className="text-sm font-medium text-gray-300 truncate">{proj.name}</div>
                                    <div className="text-[10px] text-gray-600 flex items-center justify-between mt-1">
                                        <span className="capitalize text-cyan-500/50">{proj.domain}</span>
                                        <span>{proj.updated}</span>
                                    </div>
                                </div>
                            </button>
                        ))}
                        <div className="pt-4 text-center">
                            <p className="text-xs text-gray-600 italic">Project loading coming soon...</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

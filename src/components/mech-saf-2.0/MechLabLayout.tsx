import React from 'react';
import { PanelLeft, Settings, Play, Download, Search } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentPalette } from './ComponentPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { Canvas } from './Canvas';

export const MechLabLayout: React.FC = () => {
    const { isPropertiesPanelOpen, togglePropertiesPanel } = useMechStore();

    return (
        <div className="flex flex-col h-screen w-full bg-slate-900 text-white overflow-hidden">
            {/* Header */}
            <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 z-10">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Mech SAF Lab v2.0
                    </div>
                    <div className="h-6 w-px bg-slate-700 mx-2" />
                    <nav className="flex gap-2 text-sm text-slate-400">
                        <button className="hover:text-white transition-colors">File</button>
                        <button className="hover:text-white transition-colors">Edit</button>
                        <button className="hover:text-white transition-colors">View</button>
                        <button className="hover:text-white transition-colors">Simulate</button>
                    </nav>
                </div>

                <div className="flex items-center gap-3">
                    <button className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-3 py-1.5 rounded-md text-sm font-medium transition-colors">
                        <Play className="w-4 h-4" /> Run Simulation
                    </button>

                    <button
                        onClick={togglePropertiesPanel}
                        className={`p-2 rounded-md transition-colors ${isPropertiesPanelOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        <PanelLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            </header>

            {/* Main Content */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Palette) */}
                <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 z-10">
                    <ComponentPalette />
                </div>

                {/* Center Canvas */}
                <div className="flex-1 bg-slate-900 relative">
                    <Canvas />
                </div>

                {/* Right Sidebar (Properties) */}
                {isPropertiesPanelOpen && (
                    <div className="w-80 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 z-10 overflow-y-auto custom-scrollbar">
                        <PropertiesPanel />
                    </div>
                )}
            </div>

            {/* Status Bar */}
            <div className="h-8 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-400 shrink-0 z-10">
                <div className="flex gap-4">
                    <span>Ready</span>
                    <span>Fluid Domain</span>
                </div>
                <div className="flex gap-4">
                    <span>Zoom: 100%</span>
                    <span>Grid: On</span>
                </div>
            </div>
        </div>
    );
};

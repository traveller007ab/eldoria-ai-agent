import React from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { X, Sliders } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
    const { selectedComponentId, currentBlueprint, togglePropertiesPanel } = useMechStore();

    const selectedComponent = currentBlueprint?.components.find(c => c.id === selectedComponentId);

    if (!selectedComponent) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <Sliders className="w-12 h-12 mb-4 opacity-20" />
                <p>Select a component to view its properties</p>
            </div>
        );
    }

    const { name, parameterValues } = selectedComponent;

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 truncate pr-4">{name}</h3>
                <button onClick={togglePropertiesPanel} className="text-slate-500 hover:text-white">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6">
                <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Design Parameters</div>
                    <div className="space-y-3">
                        {Object.entries(parameterValues).map(([key, value]) => (
                            <div key={key} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 font-medium">{key}</label>
                                    <span className="text-[10px] text-slate-600 font-mono">ID: {key}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type={typeof value === 'number' ? 'number' : 'text'}
                                        value={value}
                                        readOnly // Readonly for now until we add update action
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none"
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Placeholder for Calculated Results */}
                <div>
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calculated Results</div>
                    <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50 text-sm text-slate-400 italic">
                        Run simulation to see results.
                    </div>
                </div>
            </div>
        </div>
    );
};

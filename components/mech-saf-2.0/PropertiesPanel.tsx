import React from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { MaterialRegistry } from '../../services/physics/MaterialRegistry';
import { X, Sliders, Zap, Activity, Droplets } from 'lucide-react';

export const PropertiesPanel: React.FC = () => {
    const {
        selectedComponentId,
        currentBlueprint,
        togglePropertiesPanel,
        updateComponentParameter,
        lastSimulationResult,
        setFluidId
    } = useMechStore();

    const selectedComponent = currentBlueprint?.components.find(c => c.id === selectedComponentId);
    const componentDef = selectedComponent ? ComponentRegistry.getInstance().getComponent(selectedComponent.componentDefinitionId) : null;

    if (!selectedComponent || !componentDef) {
        const currentFluidId = currentBlueprint?.fluidId || 'water';
        const currentFluid = MaterialRegistry.getInstance().getFluid(currentFluidId);

        return (
            <div className="flex flex-col h-full">
                <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                    <h3 className="font-semibold text-slate-200">Project Settings</h3>
                    <p className="text-xs text-slate-500">Global configuration</p>
                </div>

                <div className="p-4 space-y-6">
                    {/* Fluid Selection */}
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            <Droplets className="w-3 h-3" />
                            Working Fluid
                        </div>

                        <select
                            className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                            value={currentFluidId}
                            onChange={(e) => setFluidId(e.target.value)}
                        >
                            {MaterialRegistry.getInstance().getAllFluids().map(f => (
                                <option key={f.id} value={f.id}>{f.name}</option>
                            ))}
                        </select>

                        {currentFluid && (
                            <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Density</span>
                                    <span className="text-slate-300 font-mono">{currentFluid.density} kg/m³</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Viscosity</span>
                                    <span className="text-slate-300 font-mono">{currentFluid.viscosity} Pa·s</span>
                                </div>
                                <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">Specific Heat</span>
                                    <span className="text-slate-300 font-mono">{currentFluid.specificHeat} kJ/kg·K</span>
                                </div>
                            </div>
                        )}
                    </div>

                    <div className="bg-blue-900/20 border border-blue-800 rounded p-3">
                        <p className="text-xs text-blue-200">
                            Select a component on the canvas to edit its specific parameters.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    const handleParameterChange = (paramId: string, value: string) => {
        const numValue = parseFloat(value);
        if (!isNaN(numValue)) {
            updateComponentParameter(selectedComponent.id, paramId, numValue);
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                <div>
                    <h3 className="font-semibold text-slate-200">{selectedComponent.name}</h3>
                    <p className="text-xs text-slate-500">{componentDef.subcategory}</p>
                </div>
                <button onClick={togglePropertiesPanel} className="text-slate-500 hover:text-white p-1 rounded hover:bg-slate-700">
                    <X className="w-5 h-5" />
                </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-6 custom-scrollbar">
                {/* Design Parameters Section */}
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        <Sliders className="w-3 h-3" />
                        Design Parameters
                    </div>
                    <div className="space-y-3">
                        {componentDef.parameters.filter(p => p.source === 'design').map((param) => (
                            <div key={param.id} className="space-y-1">
                                <div className="flex items-center justify-between">
                                    <label className="text-xs text-slate-400 font-medium">{param.name}</label>
                                    <span className="text-[10px] text-slate-600 font-mono">{param.symbol}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input
                                        type="number"
                                        value={selectedComponent.parameterValues[param.id] ?? param.value ?? ''}
                                        onChange={(e) => handleParameterChange(param.id, e.target.value)}
                                        className="flex-1 bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none transition-colors"
                                    />
                                    <span className="text-xs text-slate-500 w-16 text-right shrink-0">{param.unit}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Equations Section */}
                {componentDef.equations.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            <Zap className="w-3 h-3" />
                            Governing Equations
                        </div>
                        <div className="space-y-2">
                            {componentDef.equations.map((eq) => (
                                <div key={eq.id} className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50">
                                    <div className="text-xs text-slate-400 mb-1">{eq.name}</div>
                                    <div className="font-mono text-sm text-cyan-400">{eq.expression}</div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Simulation Results Section */}
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        <Activity className="w-3 h-3" />
                        Simulation Results
                    </div>
                    {lastSimulationResult && lastSimulationResult.status === 'completed' ? (
                        <div className="space-y-2">
                            {Object.entries(lastSimulationResult.variables).slice(0, 5).map(([key, value]) => (
                                <div key={key} className="flex items-center justify-between bg-slate-900/50 rounded-md px-3 py-2 border border-slate-700/50">
                                    <span className="text-xs text-slate-400 font-mono">{key}</span>
                                    <span className="text-sm text-emerald-400 font-semibold">{typeof value === 'number' ? value.toFixed(2) : value}</span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="bg-slate-900/50 rounded-md p-3 border border-slate-700/50 text-sm text-slate-500 italic text-center">
                            Run simulation to see results.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

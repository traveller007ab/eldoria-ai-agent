import React, { useState } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { MaterialRegistry } from '../../services/physics/MaterialRegistry';
import { X, Sliders, Zap, Activity, Droplets, Plus, Pencil, AlertCircle, Info, FileCode, Layers } from 'lucide-react';
import { DynoGraph } from './DynoGraph';
import { CustomFluidDialog } from './CustomFluidDialog';
import { ParameterValidator, getValidationStatus } from '../../utils/ParameterValidator';

export const PropertiesPanel: React.FC = () => {
    const {
        selectedComponentId,
        selectedConnectionId,
        currentBlueprint,
        togglePropertiesPanel,
        updateComponentParameter,
        updateComponentEquations,
        convertToSubsystem,
        lastSimulationResult,
        setFluidId,
        updateConnectionFluid
    } = useMechStore();

    const [showCustomFluidDialog, setShowCustomFluidDialog] = useState(false);
    const [editingFluidId, setEditingFluidId] = useState<string | undefined>();

    const selectedComponent = currentBlueprint?.components.find(c => c.id === selectedComponentId);
    const componentDef = selectedComponent ? ComponentRegistry.getInstance().getComponent(selectedComponent.componentDefinitionId) : null;

    const selectedConnection = selectedConnectionId
        ? currentBlueprint?.connections.find(c => c.id === selectedConnectionId)
        : null;

    const handleFluidCreated = (fluidId: string) => {
        setFluidId(fluidId);
    };

    const handleEditFluid = (fluidId: string) => {
        setEditingFluidId(fluidId);
        setShowCustomFluidDialog(true);
    };

    const handleConnectionFluidChange = (fluidId: string) => {
        if (selectedConnectionId) {
            updateConnectionFluid(selectedConnectionId, fluidId);
        }
    };

    if (selectedConnection) {
        const connectionFluidId = selectedConnection.fluidId || currentBlueprint?.fluidId || 'water';
        const connectionFluid = MaterialRegistry.getInstance().getFluid(connectionFluidId);
        const customFluids = MaterialRegistry.getInstance().getCustomFluids();

        const sourceComp = currentBlueprint?.components.find(c => c.id === selectedConnection.sourceComponentId);
        const targetComp = currentBlueprint?.components.find(c => c.id === selectedConnection.targetComponentId);

        return (
            <>
                <div className="flex flex-col h-full">
                    <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                        <h3 className="font-semibold text-slate-200">Connection</h3>
                        <p className="text-xs text-slate-500">
                            {sourceComp?.name} → {targetComp?.name}
                        </p>
                    </div>

                    <div className="p-4 space-y-6">
                        <div>
                            <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                                <Droplets className="w-3 h-3" />
                                Connection Fluid
                            </div>

                            <div className="bg-amber-900/20 border border-amber-800 rounded p-2 mb-3">
                                <p className="text-xs text-amber-200">
                                    Override the global fluid for this specific connection to create dual-loop systems.
                                </p>
                            </div>

                            <select
                                className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                                value={selectedConnection.fluidId || ''}
                                onChange={(e) => handleConnectionFluidChange(e.target.value)}
                            >
                                <option value="">Use Global ({currentBlueprint?.fluidId || 'water'})</option>
                                <optgroup label="Built-in Fluids">
                                    {MaterialRegistry.getInstance().getBuiltInFluids().map(f => (
                                        <option key={f.id} value={f.id}>{f.name}</option>
                                    ))}
                                </optgroup>
                                {customFluids.length > 0 && (
                                    <optgroup label="Custom Fluids">
                                        {customFluids.map(f => (
                                            <option key={f.id} value={f.id}>{f.name}</option>
                                        ))}
                                    </optgroup>
                                )}
                            </select>

                            {selectedConnection.fluidId && (
                                <button
                                    onClick={() => handleConnectionFluidChange('')}
                                    className="mt-2 w-full flex items-center justify-center gap-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded text-xs text-slate-400 hover:text-white hover:border-slate-600 transition-colors"
                                >
                                    <X className="w-3 h-3" />
                                    Use Global Fluid
                                </button>
                            )}

                            {connectionFluid && (
                                <div className="mt-4 bg-slate-900/50 rounded-lg p-3 border border-slate-700/50 space-y-2">
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Density</span>
                                        <span className="text-slate-300 font-mono">{connectionFluid.density} kg/m³</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Viscosity</span>
                                        <span className="text-slate-300 font-mono">{connectionFluid.viscosity.toExponential(2)} Pa·s</span>
                                    </div>
                                    <div className="flex justify-between text-xs">
                                        <span className="text-slate-500">Specific Heat</span>
                                        <span className="text-slate-300 font-mono">{connectionFluid.specificHeat} kJ/kg·K</span>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </>
        );
    }

    if (!selectedComponent || !componentDef) {
        return (
            <div className="flex flex-col h-full items-center justify-center text-slate-500 p-6 text-center">
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-4">
                    <Sliders className="w-8 h-8 opacity-50" />
                </div>
                <h3 className="text-sm font-medium text-slate-300 mb-2">No Component Selected</h3>
                <p className="text-xs max-w-xs leading-relaxed">
                    Click on a component in the canvas to view and edit its properties, equations, and simulation results.
                </p>
                <div className="mt-4 p-3 bg-slate-800/50 rounded-lg border border-slate-700/50">
                    <p className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold mb-2">Quick Start</p>
                    <ul className="text-xs text-slate-400 text-left space-y-1.5">
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">1.</span>
                            <span>Drag a component from the left palette</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">2.</span>
                            <span>Click the component to select it</span>
                        </li>
                        <li className="flex items-start gap-2">
                            <span className="text-emerald-400">3.</span>
                            <span>Edit parameters here</span>
                        </li>
                    </ul>
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

    const getInputBorderClass = (param: typeof componentDef.parameters[0], value: number | string | boolean) => {
        const numValue = typeof value === 'number' ? value : parseFloat(value as string);
        if (isNaN(numValue)) return 'border-slate-700';
        const status = getValidationStatus(param, numValue);
        if (status === 'error') return 'border-red-500 focus:border-red-500';
        if (status === 'warning') return 'border-yellow-500 focus:border-yellow-500';
        return 'border-slate-700 focus:border-blue-500';
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
                {/* Live Dyno Graph - Show only for Engine components */}
                {componentDef.id.includes('engine') && componentDef.id.includes('parametric') && (
                    <DynoGraph
                        geometry={{
                            bore_mm: Number(selectedComponent.parameterValues['bore_mm']) || 86,
                            stroke_mm: Number(selectedComponent.parameterValues['stroke_mm']) || 86,
                            cylinders: Number(selectedComponent.parameterValues['cylinders']) || 4,
                            compression_ratio: Number(selectedComponent.parameterValues['compression_ratio']) || 10.0
                        }}
                        fuel={{
                            type: 'gasoline',
                            octane_rkm: 93,
                            stoichiometric_afr: 14.7,
                            energy_density_mj_kg: 44.0,
                            knock_resistance: 0.8
                        }}
                        intake={{
                            aspiration: (selectedComponent.parameterValues['aspiration'] as 'na' | 'turbo' | 'supercharged') || 'turbo',
                            boost_pressure_bar: Number(selectedComponent.parameterValues['boost_pressure_bar']) || 1.2,
                            intercooler_efficiency: 0.7,
                            volumetric_efficiency_curve: [[1000, 0.7], [3000, 0.85], [5000, 0.9], [7000, 0.82]]
                        }}
                        redlineRpm={Number(selectedComponent.parameterValues['redline_rpm']) || 7000}
                    />
                )}

                {/* Design Parameters Section */}
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        <Sliders className="w-3 h-3" />
                        Design Parameters
                    </div>
                    <div className="space-y-3">
                        {componentDef.parameters.filter(p => p.source === 'design').map((param) => {
                            const rawValue = selectedComponent.parameterValues[param.id] ?? param.value ?? 0;
                            const currentValue = typeof rawValue === 'number' || typeof rawValue === 'string' ? rawValue : 0;
                            const validation = ParameterValidator.validateParameter(param, currentValue);
                            const status = getValidationStatus(param, currentValue);

                            return (
                                <div key={param.id} className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <label className="text-xs text-slate-400 font-medium flex items-center gap-1">
                                            {param.name}
                                            {param.designRange && (
                                                <span className="text-[10px] text-slate-600 font-mono" title={`Valid range: ${ParameterValidator.getRecommendedRange(param)}`}>
                                                    <Info className="w-3 h-3" />
                                                </span>
                                            )}
                                        </label>
                                        <span className="text-[10px] text-slate-600 font-mono">{param.symbol}</span>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                value={String(currentValue)}
                                                onChange={(e) => handleParameterChange(param.id, e.target.value)}
                                                className={`w-full bg-slate-900 border rounded px-2 py-1.5 text-sm text-white focus:outline-none transition-colors ${getInputBorderClass(param, currentValue)}`}
                                                placeholder={`Enter ${param.name}`}
                                            />
                                            {status === 'error' && (
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 text-red-500">
                                                    <AlertCircle className="w-4 h-4" />
                                                </div>
                                            )}
                                        </div>
                                        <span className="text-xs text-slate-500 w-16 text-right shrink-0">{param.unit}</span>
                                    </div>
                                    {validation.error && (
                                        <p className="text-[10px] text-red-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            {validation.error}
                                        </p>
                                    )}
                                    {status === 'warning' && !validation.error && (
                                        <p className="text-[10px] text-yellow-400 flex items-center gap-1">
                                            <AlertCircle className="w-3 h-3" />
                                            Value outside recommended range
                                        </p>
                                    )}
                                    {param.designRange && !validation.error && status === 'valid' && (
                                        <p className="text-[10px] text-slate-600">
                                            Range: {ParameterValidator.getRecommendedRange(param)}
                                        </p>
                                    )}
                                </div>
                            );
                        })}
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

                {/* Custom Physics Section */}
                <div>
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                        <FileCode className="w-3 h-3" />
                        Custom Physics (Genesis)
                    </div>
                    <div className="space-y-2">
                        <textarea
                            value={selectedComponent.customEquations || ''}
                            onChange={(e) => updateComponentEquations(selectedComponent.id, e.target.value)}
                            placeholder="Enter SymPy equations (e.g., Eq(V_out, V_in * 0.5))"
                            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-xs font-mono text-emerald-300 focus:outline-none focus:border-emerald-500 min-h-[100px]"
                        />
                        <p className="text-[10px] text-slate-500">
                            Use SymPy syntax. Available symbols: {componentDef.parameters.map(p => p.symbol).join(', ')}
                        </p>
                    </div>
                </div>

                {/* Subsystem Conversion */}
                {!selectedComponent.childBlueprintId && (
                    <div className="pt-2 border-t border-slate-700">
                        <button
                            onClick={() => convertToSubsystem(selectedComponent.id)}
                            className="w-full flex items-center justify-center gap-2 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 rounded text-purple-300 hover:text-purple-200 transition-colors"
                        >
                            <Layers className="w-4 h-4" />
                            <span className="text-xs font-medium">Convert to Subsystem</span>
                        </button>
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

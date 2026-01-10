import React, { useState } from 'react';
import { Settings, Zap, Thermometer, Pipe, Power, Engine, ChevronDown, ChevronRight, Info, AlertTriangle, CheckCircle } from 'lucide-react';
import { ComponentOptimizer, OptimizationTarget, OptimizationResult } from '../../services/optimization/ComponentOptimizer';
import { useMechStore } from '../../stores/useMechStore';

interface OptimizationPreset {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    targets: OptimizationTarget[];
}

const PRESETS: OptimizationPreset[] = [
    {
        id: 'pump-system',
        name: 'Pump System',
        description: 'Optimize pump sizing based on system requirements',
        icon: <Zap className="w-4 h-4" />,
        targets: [
            {
                componentId: '',
                componentType: 'pump',
                parameters: { requiredFlow: 100, requiredHead: 20 },
                constraints: {}
            }
        ]
    },
    {
        id: 'heat-exchanger',
        name: 'Heat Exchanger',
        description: 'Size heat exchanger for thermal load',
        icon: <Thermometer className="w-4 h-4" />,
        targets: [
            {
                componentId: '',
                componentType: 'heat_exchanger',
                parameters: { hotFlow: 50, coldFlow: 75, hotInletTemp: 120, hotOutletTemp: 60, coldInletTemp: 20 },
                constraints: {}
            }
        ]
    },
    {
        id: 'pipe-network',
        name: 'Pipe Sizing',
        description: 'Calculate optimal pipe diameter for flow',
        icon: <Pipe className="w-4 h-4" />,
        targets: [
            {
                componentId: '',
                componentType: 'pipe',
                parameters: { requiredFlow: 50 },
                constraints: { maxVelocity: { max: 3 } }
            }
        ]
    },
    {
        id: 'motor-drive',
        name: 'Motor Sizing',
        description: 'Select appropriate motor for load',
        icon: <Power className="w-4 h-4" />,
        targets: [
            {
                componentId: '',
                componentType: 'motor',
                parameters: { loadPower: 10 },
                constraints: { efficiency: { min: 0.9 } }
            }
        ]
    },
    {
        id: 'engine-power',
        name: 'Engine Selection',
        description: 'Size engine for power requirements',
        icon: <Engine className="w-4 h-4" />,
        targets: [
            {
                componentId: '',
                componentType: 'engine',
                parameters: { requiredPower: 50 },
                constraints: {}
            }
        ]
    }
];

export const ComponentOptimizerPanel: React.FC = () => {
    const { blueprint, setBlueprint } = useMechStore();
    const [selectedPreset, setSelectedPreset] = useState<string | null>(null);
    const [customTargets, setCustomTargets] = useState<OptimizationTarget[]>([]);
    const [results, setResults] = useState<OptimizationResult[]>([]);
    const [isExpanded, setIsExpanded] = useState(true);
    const [isOptimizing, setIsOptimizing] = useState(false);

    const optimizer = new ComponentOptimizer();

    const getComponentOptions = (type: string) => {
        return blueprint.components
            .filter(c => {
                const defId = c.componentDefinitionId.toLowerCase();
                switch (type) {
                    case 'pump': return defId.includes('pump');
                    case 'heat_exchanger': return defId.includes('heatexchanger') || defId.includes('heat_exchanger');
                    case 'pipe': return defId.includes('pipe');
                    case 'motor': return defId.includes('motor');
                    case 'engine': return defId.includes('engine');
                    default: return false;
                }
            })
            .map(c => ({ id: c.id, name: c.name }));
    };

    const updateTarget = (index: number, updates: Partial<OptimizationTarget>) => {
        setCustomTargets(prev => {
            const updated = [...prev];
            updated[index] = { ...updated[index], ...updates };
            return updated;
        });
    };

    const addTarget = () => {
        setCustomTargets(prev => [
            ...prev,
            {
                componentId: '',
                componentType: 'pump',
                parameters: { requiredFlow: 100, requiredHead: 20 },
                constraints: {}
            }
        ]);
    };

    const removeTarget = (index: number) => {
        setCustomTargets(prev => prev.filter((_, i) => i !== index));
    };

    const handleOptimize = async () => {
        setIsOptimizing(true);
        setResults([]);

        await new Promise(resolve => setTimeout(resolve, 500));

        const targets = customTargets.length > 0 ? customTargets : [];
        if (targets.length === 0 && selectedPreset) {
            const preset = PRESETS.find(p => p.id === selectedPreset);
            if (preset) {
                targets.push(...preset.targets);
            }
        }

        if (targets.length === 0) {
            setIsOptimizing(false);
            return;
        }

        const { results: optimizationResults } = optimizer.applyOptimizations(blueprint, targets);
        setResults(optimizationResults);

        setBlueprint({ ...blueprint });
        setIsOptimizing(false);
    };

    const getResultIcon = (result: OptimizationResult) => {
        if (result.warnings.length > 2) {
            return <AlertTriangle className="w-4 h-4 text-amber-400" />;
        }
        if (result.warnings.length === 0) {
            return <CheckCircle className="w-4 h-4 text-emerald-400" />;
        }
        return <Info className="w-4 h-4 text-blue-400" />;
    };

    return (
        <div className="bg-slate-800/50 rounded-lg border border-slate-700 overflow-hidden">
            <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="w-full px-4 py-3 flex items-center justify-between bg-slate-800/80 hover:bg-slate-800 transition-colors"
            >
                <div className="flex items-center gap-2">
                    <Settings className="w-4 h-4 text-cyan-400" />
                    <span className="text-sm font-medium text-white">Component Optimizer</span>
                </div>
                {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>

            {isExpanded && (
                <div className="p-4 space-y-4">
                    <div className="text-xs text-slate-400">
                        Automatically size components based on system requirements and engineering constraints.
                    </div>

                    {/* Quick Presets */}
                    <div>
                        <label className="block text-xs font-medium text-slate-400 mb-2">Quick Presets</label>
                        <div className="grid grid-cols-2 gap-2">
                            {PRESETS.map(preset => (
                                <button
                                    key={preset.id}
                                    onClick={() => {
                                        setSelectedPreset(preset.id);
                                        setCustomTargets(preset.targets.map(t => ({ ...t, componentId: '' })));
                                    }}
                                    className={`p-2 rounded border text-left transition-colors ${
                                        selectedPreset === preset.id
                                            ? 'border-cyan-500 bg-cyan-950/30'
                                            : 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
                                    }`}
                                >
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="text-slate-400">{preset.icon}</span>
                                        <span className="text-xs font-medium text-white">{preset.name}</span>
                                    </div>
                                    <span className="text-[10px] text-slate-500">{preset.description}</span>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Custom Targets */}
                    <div>
                        <div className="flex items-center justify-between mb-2">
                            <label className="text-xs font-medium text-slate-400">Custom Targets</label>
                            <button
                                onClick={addTarget}
                                className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
                            >
                                <Settings className="w-3 h-3" />
                                Add Target
                            </button>
                        </div>

                        {customTargets.length === 0 ? (
                            <div className="text-center py-4 text-slate-500 text-xs">
                                Select a preset above or add custom optimization targets
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {customTargets.map((target, index) => (
                                    <div key={index} className="p-3 bg-slate-800/30 rounded border border-slate-700">
                                        <div className="flex items-center justify-between mb-2">
                                            <select
                                                value={target.componentType}
                                                onChange={e => updateTarget(index, { componentType: e.target.value as any })}
                                                className="px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                            >
                                                <option value="pump">Pump</option>
                                                <option value="heat_exchanger">Heat Exchanger</option>
                                                <option value="pipe">Pipe</option>
                                                <option value="motor">Motor</option>
                                                <option value="engine">Engine</option>
                                            </select>
                                            <button
                                                onClick={() => removeTarget(index)}
                                                className="text-slate-500 hover:text-red-400"
                                            >
                                                ×
                                            </button>
                                        </div>

                                        <div className="space-y-2">
                                            <select
                                                value={target.componentId}
                                                onChange={e => updateTarget(index, { componentId: e.target.value })}
                                                className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                            >
                                                <option value="">Select component...</option>
                                                {getComponentOptions(target.componentType).map(c => (
                                                    <option key={c.id} value={c.id}>{c.name}</option>
                                                ))}
                                            </select>

                                            {target.componentType === 'pump' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Flow (L/min)</label>
                                                        <input
                                                            type="number"
                                                            value={target.parameters.requiredFlow || ''}
                                                            onChange={e => updateTarget(index, { parameters: { ...target.parameters, requiredFlow: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Head (m)</label>
                                                        <input
                                                            type="number"
                                                            value={target.parameters.requiredHead || ''}
                                                            onChange={e => updateTarget(index, { parameters: { ...target.parameters, requiredHead: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {target.componentType === 'heat_exchanger' && (
                                                <div className="grid grid-cols-2 gap-2">
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Hot Flow (L/h)</label>
                                                        <input
                                                            type="number"
                                                            value={target.parameters.hotFlow || ''}
                                                            onChange={e => updateTarget(index, { parameters: { ...target.parameters, hotFlow: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                        />
                                                    </div>
                                                    <div>
                                                        <label className="text-[10px] text-slate-500">Hot Inlet (°C)</label>
                                                        <input
                                                            type="number"
                                                            value={target.parameters.hotInletTemp || ''}
                                                            onChange={e => updateTarget(index, { parameters: { ...target.parameters, hotInletTemp: Number(e.target.value) } })}
                                                            className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                        />
                                                    </div>
                                                </div>
                                            )}

                                            {target.componentType === 'pipe' && (
                                                <div>
                                                    <label className="text-[10px] text-slate-500">Required Flow (L/h)</label>
                                                    <input
                                                        type="number"
                                                        value={target.parameters.requiredFlow || ''}
                                                        onChange={e => updateTarget(index, { parameters: { ...target.parameters, requiredFlow: Number(e.target.value) } })}
                                                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                    />
                                                </div>
                                            )}

                                            {target.componentType === 'motor' && (
                                                <div>
                                                    <label className="text-[10px] text-slate-500">Load Power (kW)</label>
                                                    <input
                                                        type="number"
                                                        value={target.parameters.loadPower || ''}
                                                        onChange={e => updateTarget(index, { parameters: { ...target.parameters, loadPower: Number(e.target.value) } })}
                                                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                    />
                                                </div>
                                            )}

                                            {target.componentType === 'engine' && (
                                                <div>
                                                    <label className="text-[10px] text-slate-500">Required Power (kW)</label>
                                                    <input
                                                        type="number"
                                                        value={target.parameters.requiredPower || ''}
                                                        onChange={e => updateTarget(index, { parameters: { ...target.parameters, requiredPower: Number(e.target.value) } })}
                                                        className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-xs text-white"
                                                    />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Optimize Button */}
                    <button
                        onClick={handleOptimize}
                        disabled={isOptimizing || customTargets.length === 0}
                        className={`w-full py-2 rounded font-medium text-sm transition-all ${
                            isOptimizing || customTargets.length === 0
                                ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20'
                        }`}
                    >
                            {isOptimizing ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                                    </svg>
                                    Optimizing...
                                </span>
                            ) : (
                            'Run Optimization'
                        )}
                    </button>

                    {/* Results */}
                    {results.length > 0 && (
                        <div className="pt-4 border-t border-slate-700">
                            <h4 className="text-xs font-medium text-white mb-3">Optimization Results</h4>
                            <div className="space-y-2">
                                {results.map((result, index) => (
                                    <div key={index} className="p-3 bg-slate-800/30 rounded border border-slate-700">
                                        <div className="flex items-center gap-2 mb-2">
                                            {getResultIcon(result)}
                                            <span className="text-sm font-medium text-white">{result.componentId}</span>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Efficiency</span>
                                                <span className="text-white">{(result.efficiency * 100).toFixed(1)}%</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">Margin</span>
                                                <span className="text-white">{(result.margin * 100).toFixed(1)}%</span>
                                            </div>
                                        </div>
                                        {Object.entries(result.optimizedParameters).length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-700">
                                                <div className="text-[10px] text-slate-500 mb-1">Optimized Parameters:</div>
                                                <div className="grid grid-cols-2 gap-1">
                                                    {Object.entries(result.optimizedParameters).map(([key, value]) => (
                                                        <div key={key} className="text-xs text-slate-300">
                                                            <span className="text-slate-500">{key}:</span> {value}
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                        {result.warnings.length > 0 && (
                                            <div className="mt-2 pt-2 border-t border-slate-700">
                                                {result.warnings.map((warning, i) => (
                                                    <div key={i} className="text-[10px] text-amber-400 flex items-center gap-1">
                                                        <AlertTriangle className="w-3 h-3" />
                                                        {warning}
                                                    </div>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

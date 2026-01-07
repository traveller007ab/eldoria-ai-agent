import React, { useMemo, useState } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { OptimizationService, OptimizationResult } from '../../services/physics/OptimizationService';
import {
    BarChart3, PieChart, AlertTriangle, CheckCircle2,
    Droplets, Flame, Cog, Cpu, TrendingUp, Zap, Activity, Target, Sliders, ChevronRight
} from 'lucide-react';
import { Loader2 } from 'lucide-react';

type Tab = 'validation' | 'optimization';

export const AnalysisPanel: React.FC = () => {
    const { currentBlueprint, lastSimulationResult } = useMechStore();
    const registry = ComponentRegistry.getInstance();
    const [activeTab, setActiveTab] = useState<Tab>('validation');

    // Optimization State
    const [targetCompId, setTargetCompId] = useState<string>('');
    const [targetVar, setTargetVar] = useState<string>('flow');
    const [targetValue, setTargetValue] = useState<number>(0);
    const [adjustCompId, setAdjustCompId] = useState<string>('');
    const [adjustParam, setAdjustParam] = useState<string>('speed');
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [optResult, setOptResult] = useState<OptimizationResult | null>(null);

    const validComponents = useMemo(() => currentBlueprint?.components || [], [currentBlueprint]);

    const analysis = useMemo(() => {
        if (!currentBlueprint) return null;

        const components = currentBlueprint.components;
        const connections = currentBlueprint.connections;

        // Domain distribution
        const domainCount: Record<string, number> = {};
        components.forEach(c => {
            const def = registry.getComponent(c.componentDefinitionId);
            if (def) {
                domainCount[def.domain] = (domainCount[def.domain] || 0) + 1;
            }
        });

        // Find potential issues (simplified for brevity - keeping core logic)
        const issues: string[] = [];
        const connectedComponents = new Set<string>();
        connections.forEach(c => {
            connectedComponents.add(c.sourceComponentId);
            connectedComponents.add(c.targetComponentId);
        });
        const unconnectedComponents = components.filter(c => !connectedComponents.has(c.id));

        if (unconnectedComponents.length > 0) issues.push(`${unconnectedComponents.length} component(s) not connected`);

        return {
            totalComponents: components.length,
            totalConnections: connections.length,
            domainCount,
            issues,
            isValid: issues.length === 0
        };
    }, [currentBlueprint]);

    if (!currentBlueprint || !analysis) {
        return <div className="p-4 text-sm text-slate-500 text-center">No blueprint loaded</div>;
    }

    const handleRunOptimization = async () => {
        if (!targetCompId || !adjustCompId) return;
        setIsOptimizing(true);
        setOptResult(null);

        try {
            const result = await OptimizationService.goalSeek(currentBlueprint, {
                targetComponentId: targetCompId,
                targetVariable: targetVar,
                targetValue: Number(targetValue),
                adjustComponentId: adjustCompId,
                adjustParameter: adjustParam,
                minAdjust: 0, // Simplified: assume positive ranges
                maxAdjust: 5000, // Reasonable cap for speed/flow
                tolerance: 0.1,
                maxIterations: 20
            });
            setOptResult(result);
        } catch (e) {
            console.error(e);
        } finally {
            setIsOptimizing(false);
        }
    };

    const domainIcons: Record<string, React.ReactNode> = {
        fluid: <Droplets className="w-4 h-4 text-cyan-400" />,
        thermal: <Flame className="w-4 h-4 text-orange-400" />,
        mechanical: <Cog className="w-4 h-4 text-slate-400" />,
        control: <Cpu className="w-4 h-4 text-emerald-400" />
    };

    return (
        <div className="flex flex-col h-full overflow-hidden">
            {/* Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-800 shrink-0">
                <button
                    onClick={() => setActiveTab('validation')}
                    className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${activeTab === 'validation' ? 'text-cyan-400 border-b-2 border-cyan-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    System Health
                </button>
                <button
                    onClick={() => setActiveTab('optimization')}
                    className={`flex-1 py-3 text-xs font-medium uppercase tracking-wider transition-colors ${activeTab === 'optimization' ? 'text-purple-400 border-b-2 border-purple-400 bg-slate-800' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                >
                    Optimization
                </button>
            </div>

            <div className="flex-1 overflow-y-auto custom-scrollbar">
                {activeTab === 'validation' ? (
                    <>
                        {/* Summary Header */}
                        <div className={`p-4 border-b ${analysis.isValid ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-yellow-900/20 border-yellow-700/50'}`}>
                            <div className="flex items-center gap-3">
                                {analysis.isValid ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-yellow-400" />}
                                <div>
                                    <div className={`font-semibold ${analysis.isValid ? 'text-emerald-300' : 'text-yellow-300'}`}>
                                        {analysis.isValid ? 'System Valid' : `${analysis.issues.length} Issue(s) Detected`}
                                    </div>
                                    <div className="text-xs text-slate-400">{analysis.totalComponents} components, {analysis.totalConnections} connections</div>
                                </div>
                            </div>
                        </div>

                        {/* Chart */}
                        <div className="p-4 border-b border-slate-700">
                            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <PieChart className="w-3 h-3" /> Distribution
                            </h3>
                            <div className="space-y-2">
                                {Object.entries(analysis.domainCount).map(([domain, count]) => (
                                    <div key={domain} className="flex items-center gap-2">
                                        {domainIcons[domain] || <Zap className="w-4 h-4 text-slate-400" />}
                                        <div className="w-20 h-1.5 bg-slate-700 rounded-full overflow-hidden flex-1 max-w-[100px]">
                                            <div className="h-full bg-slate-400 rounded-full" style={{ width: `${(count / analysis.totalComponents) * 100}%` }} />
                                        </div>
                                        <span className="text-xs text-slate-400 capitalize">{domain} ({count})</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Recent Performance */}
                        {lastSimulationResult && (
                            <div className="p-4">
                                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                    <BarChart3 className="w-3 h-3" /> Last Run
                                </h3>
                                <div className="grid grid-cols-2 gap-2">
                                    <StatCard label="Efficiency" value={`${lastSimulationResult.metrics.overallEfficiency.toFixed(1)}%`} />
                                    <StatCard label="Power" value={`${lastSimulationResult.metrics.totalPowerInput.toFixed(1)} kW`} />
                                </div>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="p-4">
                        <div className="bg-purple-900/10 border border-purple-500/20 rounded-lg p-3 mb-6">
                            <h3 className="text-sm font-bold text-purple-300 mb-1 flex items-center gap-2">
                                <Target className="w-4 h-4" /> Goal Seek
                            </h3>
                            <p className="text-xs text-slate-400">
                                Automatically adjust a component parameter to achieve a specific target value elsewhere in the system.
                            </p>
                        </div>

                        <div className="space-y-4">
                            {/* GOAL Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">1. Set Goal</label>
                                <div className="space-y-2">
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                        value={targetCompId}
                                        onChange={(e) => setTargetCompId(e.target.value)}
                                    >
                                        <option value="">Select Target Component...</option>
                                        {validComponents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <div className="flex gap-2">
                                        <select
                                            className="flex-1 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                            value={targetVar}
                                            onChange={(e) => setTargetVar(e.target.value)}
                                        >
                                            <option value="flow">Flow Rate</option>
                                            <option value="pressure">Pressure</option>
                                            <option value="power">Power</option>
                                            <option value="efficiency">Efficiency</option>
                                            <option value="temperature">Temperature</option>
                                        </select>
                                        <input
                                            type="number"
                                            className="w-24 bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                            placeholder="Value"
                                            value={targetValue}
                                            onChange={(e) => setTargetValue(Number(e.target.value))}
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* ADJUST Section */}
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 block">2. Adjustable Variable</label>
                                <div className="space-y-2">
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                        value={adjustCompId}
                                        onChange={(e) => setAdjustCompId(e.target.value)}
                                    >
                                        <option value="">Select Component to Adjust...</option>
                                        {validComponents.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                    </select>
                                    <select
                                        className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-sm text-white focus:outline-none focus:border-purple-500"
                                        value={adjustParam}
                                        onChange={(e) => setAdjustParam(e.target.value)}
                                    >
                                        <option value="speed">Speed (RPM)</option>
                                        <option value="opening">Valve Opening (%)</option>
                                        <option value="diameter">Diameter (mm)</option>
                                        <option value="length">Length (m)</option>
                                    </select>
                                </div>
                            </div>

                            <button
                                onClick={handleRunOptimization}
                                disabled={isOptimizing || !targetCompId || !adjustCompId}
                                className="w-full py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded font-medium transition-colors flex items-center justify-center gap-2 shadow-lg"
                            >
                                {isOptimizing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sliders className="w-4 h-4" />}
                                {isOptimizing ? 'Solving...' : 'Find Solution'}
                            </button>

                            {/* Results */}
                            {optResult && (
                                <div className={`mt-4 p-4 rounded border ${optResult.converged ? 'bg-emerald-900/10 border-emerald-500/30' : 'bg-red-900/10 border-red-500/30'}`}>
                                    <div className="flex items-center gap-2 font-bold mb-2">
                                        {optResult.converged ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-red-400" />}
                                        <span className={optResult.converged ? 'text-emerald-300' : 'text-red-300'}>
                                            {optResult.converged ? 'Solution Found' : 'Could Not Converge'}
                                        </span>
                                    </div>
                                    <div className="space-y-1 text-sm">
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Iterations:</span>
                                            <span className="text-white font-mono">{optResult.iterations}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Final Parameter:</span>
                                            <span className="text-white font-mono">{optResult.finalParameter.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Achieved Value:</span>
                                            <span className="text-white font-mono">{optResult.finalValue.toFixed(2)}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span className="text-slate-400">Error:</span>
                                            <span className="text-white font-mono">{optResult.error.toExponential(2)}</span>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string; value: string; trend?: 'up' | 'down' }> = ({ label, value, trend }) => (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
        <div className="text-[10px] text-slate-500 uppercase mb-1 flex items-center gap-1">
            {label}
            {trend && (
                <TrendingUp className={`w-3 h-3 ${trend === 'up' ? 'text-emerald-400' : 'text-red-400 rotate-180'}`} />
            )}
        </div>
        <div className="text-lg font-bold text-white">{value}</div>
    </div>
);

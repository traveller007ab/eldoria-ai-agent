import React, { useMemo } from 'react';
import { DeepSAFBlueprint, SAFScenario } from './types';
import { X, TrendingUp, TrendingDown, Minus, BarChart3, Zap } from 'lucide-react';

interface ScenarioComparisonPanelProps {
    blueprint: DeepSAFBlueprint;
    selectedScenarios: string[]; // Scenario IDs to compare
    onClose: () => void;
    onSelectScenario: (id: string) => void;
}

/**
 * Scenario Comparison Panel - Side-by-side metrics for 2-3 scenarios
 * Shows key performance indicators, parameter differences, and visual comparisons
 */
export const ScenarioComparisonPanel: React.FC<ScenarioComparisonPanelProps> = ({
    blueprint,
    selectedScenarios,
    onClose,
    onSelectScenario,
}) => {
    const scenarios = useMemo(() => {
        return (blueprint.scenarios || []).filter(s => selectedScenarios.includes(s.id));
    }, [blueprint.scenarios, selectedScenarios]);

    // Extract key metrics from each scenario
    const extractMetrics = (scenario: SAFScenario) => {
        const metrics: Record<string, number> = {};
        
        // Find efficiency-related outputs
        scenario.components.forEach(comp => {
            comp.outputs?.forEach(output => {
                if (typeof output.value === 'number') {
                    const key = `${comp.name}.${output.name}`;
                    metrics[key] = output.value;
                }
            });
        });

        // Extract key parameters
        scenario.components.forEach(comp => {
            comp.parameters?.forEach(param => {
                if (typeof param.value === 'number') {
                    const key = `${comp.name}.${param.name}`;
                    metrics[key] = param.value;
                }
            });
        });

        return metrics;
    };

    const scenarioMetrics = scenarios.map(s => ({
        scenario: s,
        metrics: extractMetrics(s),
    }));

    // Find common metrics across all scenarios
    const commonMetrics = useMemo(() => {
        if (scenarioMetrics.length === 0) return [];
        const firstKeys = Object.keys(scenarioMetrics[0].metrics);
        return firstKeys.filter(key => 
            scenarioMetrics.every(sm => key in sm.metrics)
        );
    }, [scenarioMetrics]);

    // Calculate differences
    const getDifference = (metricKey: string, baseIdx: number, compareIdx: number) => {
        const base = scenarioMetrics[baseIdx]?.metrics[metricKey] || 0;
        const compare = scenarioMetrics[compareIdx]?.metrics[metricKey] || 0;
        const diff = compare - base;
        const percent = base !== 0 ? (diff / base) * 100 : 0;
        return { diff, percent };
    };

    if (scenarios.length === 0) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm">
                <div className="w-full max-w-4xl bg-gray-900 border border-cyan-500/30 rounded-2xl p-8">
                    <div className="flex items-center justify-between mb-6">
                        <h2 className="text-xl font-bold text-white">Scenario Comparison</h2>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <p className="text-gray-400 text-center py-8">Select 2-3 scenarios to compare</p>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="w-full max-w-6xl bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="shrink-0 p-6 border-b border-cyan-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <BarChart3 className="w-6 h-6 text-cyan-400" />
                        <h2 className="text-xl font-bold text-white">Scenario Comparison</h2>
                        <span className="text-xs text-gray-500 px-2 py-1 bg-gray-800 rounded">
                            {scenarios.length} scenarios
                        </span>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Comparison Table */}
                <div className="flex-grow overflow-y-auto p-6">
                    <div className="grid gap-4">
                        {/* Scenario Headers */}
                        <div className="grid gap-4" style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}>
                            <div className="font-bold text-sm text-gray-400 uppercase tracking-wider">Metric</div>
                            {scenarios.map((scenario, idx) => (
                                <div key={scenario.id} className="text-center">
                                    <div className="font-bold text-white mb-1">{scenario.name}</div>
                                    {idx > 0 && (
                                        <div className="text-xs text-gray-500">
                                            vs {scenarios[0].name}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        {/* Metrics Rows */}
                        {commonMetrics.slice(0, 15).map(metricKey => {
                            const parts = metricKey.split('.');
                            const componentName = parts[0];
                            const metricName = parts.slice(1).join('.');
                            
                            return (
                                <div 
                                    key={metricKey}
                                    className="grid gap-4 items-center p-3 bg-gray-800/30 rounded-lg hover:bg-gray-800/50 transition-colors"
                                    style={{ gridTemplateColumns: `200px repeat(${scenarios.length}, 1fr)` }}
                                >
                                    <div className="text-sm text-gray-300">
                                        <div className="font-medium">{componentName}</div>
                                        <div className="text-xs text-gray-500">{metricName}</div>
                                    </div>
                                    
                                    {scenarioMetrics.map((sm, idx) => {
                                        const value = sm.metrics[metricKey];
                                        const isNumeric = typeof value === 'number';
                                        
                                        if (idx === 0) {
                                            // Base scenario
                                            return (
                                                <div key={sm.scenario.id} className="text-center">
                                                    <div className="text-lg font-mono font-bold text-cyan-400">
                                                        {isNumeric ? value.toFixed(2) : value}
                                                    </div>
                                                </div>
                                            );
                                        } else {
                                            // Comparison scenarios
                                            const { diff, percent } = getDifference(metricKey, 0, idx);
                                            const isIncrease = diff > 0;
                                            
                                            return (
                                                <div key={sm.scenario.id} className="text-center">
                                                    <div className="text-lg font-mono font-bold text-white mb-1">
                                                        {isNumeric ? value.toFixed(2) : value}
                                                    </div>
                                                    <div className={`text-xs flex items-center justify-center gap-1 ${
                                                        isIncrease ? 'text-emerald-400' : diff < 0 ? 'text-red-400' : 'text-gray-500'
                                                    }`}>
                                                        {diff !== 0 && (
                                                            <>
                                                                {isIncrease ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
                                                                {isNumeric && (
                                                                    <span>
                                                                        {diff > 0 ? '+' : ''}{diff.toFixed(2)} ({percent > 0 ? '+' : ''}{percent.toFixed(1)}%)
                                                                    </span>
                                                                )}
                                                            </>
                                                        )}
                                                        {diff === 0 && <Minus className="w-3 h-3" />}
                                                    </div>
                                                </div>
                                            );
                                        }
                                    })}
                                </div>
                            );
                        })}
                    </div>

                    {/* Visual Comparison Chart Placeholder */}
                    {commonMetrics.length > 0 && scenarios.length >= 2 && (
                        <div className="mt-8 p-6 bg-gray-800/30 rounded-lg border border-cyan-500/10">
                            <div className="flex items-center gap-2 mb-4">
                                <Zap className="w-4 h-4 text-cyan-400" />
                                <h3 className="font-bold text-white text-sm">Key Performance Indicators</h3>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                {commonMetrics.slice(0, 4).map(metricKey => {
                                    const parts = metricKey.split('.');
                                    const metricName = parts.slice(1).join('.');
                                    const values = scenarioMetrics.map(sm => sm.metrics[metricKey]);
                                    const maxVal = Math.max(...values.filter(v => typeof v === 'number'));
                                    const minVal = Math.min(...values.filter(v => typeof v === 'number'));
                                    
                                    return (
                                        <div key={metricKey} className="space-y-2">
                                            <div className="text-xs text-gray-400">{metricName}</div>
                                            <div className="flex gap-2 items-end h-20">
                                                {values.map((val, idx) => {
                                                    if (typeof val !== 'number') return null;
                                                    const height = maxVal !== minVal 
                                                        ? ((val - minVal) / (maxVal - minVal)) * 100 
                                                        : 50;
                                                    return (
                                                        <div key={idx} className="flex-1 flex flex-col items-center gap-1">
                                                            <div 
                                                                className="w-full bg-gradient-to-t from-cyan-500 to-cyan-400 rounded-t transition-all"
                                                                style={{ height: `${height}%` }}
                                                            />
                                                            <div className="text-[10px] text-gray-500 font-mono">
                                                                {val.toFixed(1)}
                                                            </div>
                                                        </div>
                                                    );
                                                })}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 p-4 border-t border-cyan-500/20 flex items-center justify-between bg-gray-900/50">
                    <div className="text-xs text-gray-500">
                        Comparing {scenarios.length} of {blueprint.scenarios?.length || 0} saved scenarios
                    </div>
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors text-sm font-bold"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ScenarioComparisonPanel;




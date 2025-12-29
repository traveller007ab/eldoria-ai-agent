import React, { useState, useMemo } from 'react';
import { DeepSAFBlueprint } from './types';
import { TrendingUp, TrendingDown, Activity, X, Download, FileText } from 'lucide-react';

interface SensitivityAnalysisPanelProps {
    blueprint: DeepSAFBlueprint;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClose: () => void;
}

/**
 * Sensitivity Analysis Panel
 * Analyzes how output variables respond to parameter changes
 */
export const SensitivityAnalysisPanel: React.FC<SensitivityAnalysisPanelProps> = ({
    blueprint,
    isExpanded,
    onToggleExpand,
    onClose,
}) => {
    const sweeps = blueprint.sweeps || [];
    const simulation = blueprint.last_simulation;

    // Calculate sensitivity coefficients
    const sensitivityData = useMemo(() => {
        if (sweeps.length === 0) return [];

        const results: Array<{
            parameter: string;
            output: string;
            sensitivity: number;
            normalized: number;
            direction: 'positive' | 'negative' | 'neutral';
        }> = [];

        sweeps.forEach(sweep => {
            if (sweep.points.length < 2) return;

            const paramName = sweep.parameterPath.split('.').pop() || 'parameter';
            const outputVars = Object.keys(sweep.points[0].system_vars);

            outputVars.forEach(outputVar => {
                const values = sweep.points.map(p => p.system_vars[outputVar]);
                const paramValues = sweep.points.map(p => p.value);

                // Calculate sensitivity: d(output)/d(parameter)
                const deltas = [];
                for (let i = 1; i < values.length; i++) {
                    const dOutput = values[i] - values[i - 1];
                    const dParam = paramValues[i] - paramValues[i - 1];
                    if (dParam !== 0) {
                        deltas.push(dOutput / dParam);
                    }
                }

                const avgSensitivity = deltas.length > 0
                    ? deltas.reduce((a, b) => a + b, 0) / deltas.length
                    : 0;

                // Normalize by initial values
                const initialOutput = values[0];
                const initialParam = paramValues[0];
                const normalized = initialParam !== 0 && initialOutput !== 0
                    ? (avgSensitivity * initialParam) / initialOutput
                    : 0;

                results.push({
                    parameter: paramName,
                    output: outputVar,
                    sensitivity: avgSensitivity,
                    normalized,
                    direction: normalized > 0.01 ? 'positive' : normalized < -0.01 ? 'negative' : 'neutral',
                });
            });
        });

        return results.sort((a, b) => Math.abs(b.normalized) - Math.abs(a.normalized));
    }, [sweeps]);

    const handleExportReport = () => {
        const report = `SENSITIVITY ANALYSIS REPORT
${blueprint.project_name}
Generated: ${new Date().toISOString()}

================================================================================
EXECUTIVE SUMMARY
================================================================================

Total Parameters Analyzed: ${sweeps.length}
Total Sensitivity Coefficients: ${sensitivityData.length}

Most Sensitive Relationships:
${sensitivityData.slice(0, 5).map((r, idx) => 
    `${idx + 1}. ${r.parameter} → ${r.output}: ${r.normalized.toFixed(4)} (${r.direction})`
).join('\n')}

================================================================================
DETAILED SENSITIVITY COEFFICIENTS
================================================================================

${sensitivityData.map(r => `
Parameter: ${r.parameter}
Output Variable: ${r.output}
Sensitivity: ${r.sensitivity.toFixed(6)}
Normalized Sensitivity: ${r.normalized.toFixed(4)}
Direction: ${r.direction}
`).join('\n')}

================================================================================
METHODOLOGY
================================================================================

Sensitivity coefficients calculated using finite difference method:
- Normalized sensitivity = (dOutput/dParam) * (Param_initial / Output_initial)
- Values > 0.01 indicate positive correlation
- Values < -0.01 indicate negative correlation
- Values between -0.01 and 0.01 indicate weak/no correlation

================================================================================
`;

        const blob = new Blob([report], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blueprint.project_name}_sensitivity_analysis_${new Date().toISOString().split('T')[0]}.txt`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isExpanded) {
        return (
            <div className="fixed bottom-0 right-0 w-96 bg-gray-900 border-t border-l border-purple-500/30 rounded-tl-2xl shadow-2xl z-50">
                <div className="p-3 flex items-center justify-between border-b border-purple-500/20">
                    <div className="flex items-center gap-2">
                        <Activity className="w-4 h-4 text-purple-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Sensitivity Analysis</span>
                        {sensitivityData.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-purple-500/20 text-purple-400 rounded">
                                {sensitivityData.length} coeffs
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onToggleExpand}
                        className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 transition-colors"
                    >
                        Expand
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-[700px] h-[500px] bg-gray-900 border-t border-l border-purple-500/30 rounded-tl-2xl shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-purple-500/20 flex items-center justify-between bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <Activity className="w-5 h-5 text-purple-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white">Sensitivity Analysis</h3>
                        <p className="text-[10px] text-gray-500">{blueprint.project_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportReport}
                        className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                    >
                        <FileText className="w-3 h-3" />
                        Export
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
                    >
                        Collapse
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4">
                {sensitivityData.length === 0 ? (
                    <div className="h-full flex items-center justify-center">
                        <div className="text-center">
                            <Activity className="w-16 h-16 mx-auto mb-4 text-gray-600 opacity-50" />
                            <p className="text-sm text-gray-400 mb-2">No sensitivity data available</p>
                            <p className="text-xs text-gray-500">Run parameter sweeps to generate sensitivity analysis</p>
                        </div>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {/* Summary Cards */}
                        <div className="grid grid-cols-3 gap-3">
                            <div className="bg-black/30 rounded-lg p-3 border border-purple-500/10">
                                <div className="text-[10px] text-gray-500 uppercase mb-1">Total Coefficients</div>
                                <div className="text-xl font-bold text-purple-400">{sensitivityData.length}</div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 border border-emerald-500/10">
                                <div className="text-[10px] text-gray-500 uppercase mb-1">Positive Correlations</div>
                                <div className="text-xl font-bold text-emerald-400">
                                    {sensitivityData.filter(r => r.direction === 'positive').length}
                                </div>
                            </div>
                            <div className="bg-black/30 rounded-lg p-3 border border-red-500/10">
                                <div className="text-[10px] text-gray-500 uppercase mb-1">Negative Correlations</div>
                                <div className="text-xl font-bold text-red-400">
                                    {sensitivityData.filter(r => r.direction === 'negative').length}
                                </div>
                            </div>
                        </div>

                        {/* Sensitivity Table */}
                        <div className="bg-black/30 rounded-lg border border-purple-500/10 overflow-hidden">
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead className="bg-gray-800/50 border-b border-purple-500/20">
                                        <tr>
                                            <th className="px-4 py-3 text-left text-purple-400 font-bold uppercase tracking-wider">Parameter</th>
                                            <th className="px-4 py-3 text-left text-purple-400 font-bold uppercase tracking-wider">Output</th>
                                            <th className="px-4 py-3 text-right text-purple-400 font-bold uppercase tracking-wider">Sensitivity</th>
                                            <th className="px-4 py-3 text-right text-purple-400 font-bold uppercase tracking-wider">Normalized</th>
                                            <th className="px-4 py-3 text-center text-purple-400 font-bold uppercase tracking-wider">Direction</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-800/50">
                                        {sensitivityData.map((result, idx) => (
                                            <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                                <td className="px-4 py-2 font-mono text-gray-300">{result.parameter}</td>
                                                <td className="px-4 py-2 font-mono text-gray-300">{result.output}</td>
                                                <td className="px-4 py-2 text-right font-bold text-cyan-400">
                                                    {result.sensitivity.toFixed(6)}
                                                </td>
                                                <td className="px-4 py-2 text-right font-bold text-purple-400">
                                                    {result.normalized.toFixed(4)}
                                                </td>
                                                <td className="px-4 py-2 text-center">
                                                    {result.direction === 'positive' ? (
                                                        <div className="flex items-center justify-center gap-1 text-emerald-400">
                                                            <TrendingUp className="w-3 h-3" />
                                                            <span className="text-xs">+</span>
                                                        </div>
                                                    ) : result.direction === 'negative' ? (
                                                        <div className="flex items-center justify-center gap-1 text-red-400">
                                                            <TrendingDown className="w-3 h-3" />
                                                            <span className="text-xs">-</span>
                                                        </div>
                                                    ) : (
                                                        <span className="text-xs text-gray-500">~</span>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>

                        {/* Top Sensitivities */}
                        <div className="bg-black/30 rounded-lg p-4 border border-purple-500/10">
                            <h4 className="text-xs font-bold text-purple-400 mb-3 uppercase tracking-wider">
                                Most Sensitive Relationships
                            </h4>
                            <div className="space-y-2">
                                {sensitivityData.slice(0, 5).map((result, idx) => {
                                    const absNorm = Math.abs(result.normalized);
                                    const maxAbs = Math.abs(sensitivityData[0]?.normalized || 1);
                                    const width = (absNorm / maxAbs) * 100;

                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-300">
                                                    <span className="font-mono">{result.parameter}</span>
                                                    {' → '}
                                                    <span className="font-mono">{result.output}</span>
                                                </span>
                                                <span className={`font-bold ${
                                                    result.direction === 'positive' ? 'text-emerald-400' :
                                                    result.direction === 'negative' ? 'text-red-400' : 'text-gray-500'
                                                }`}>
                                                    {result.normalized > 0 ? '+' : ''}{result.normalized.toFixed(4)}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className={`h-full transition-all ${
                                                        result.direction === 'positive'
                                                            ? 'bg-gradient-to-r from-emerald-500 to-emerald-400'
                                                            : result.direction === 'negative'
                                                            ? 'bg-gradient-to-r from-red-500 to-red-400'
                                                            : 'bg-gray-600'
                                                    }`}
                                                    style={{ width: `${width}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SensitivityAnalysisPanel;



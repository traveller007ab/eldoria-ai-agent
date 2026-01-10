import React, { useState, useMemo } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { SensitivityAnalysisService, SENSITIVITY_PRESETS, SensitivityInput, SensitivityResult } from '../../services/simulation/SensitivityAnalysisService';
import { Activity, TrendingUp, AlertTriangle, BarChart3, Settings, Play, Info, ChevronDown, ChevronUp, ChevronRight } from 'lucide-react';

const MetricCard: React.FC<{ label: string; value: string; unit: string; icon: React.ReactNode; color?: string }> = ({
    label, value, unit, icon, color = 'text-cyan-400'
}) => (
    <div className="bg-slate-800/50 rounded-lg p-3 border border-slate-700">
        <div className="flex items-center gap-2 mb-1">
            <span className={color}>{icon}</span>
            <span className="text-[10px] text-slate-500 uppercase">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-lg font-bold text-white">{value}</span>
            <span className="text-xs text-slate-500">{unit}</span>
        </div>
    </div>
);

const TornadoBar: React.FC<{
    label: string;
    impact: number;
    direction: 'positive' | 'negative';
    maxImpact: number;
}> = ({ label, impact, direction, maxImpact }) => {
    const width = (impact / maxImpact) * 100;
    const isPositive = direction === 'positive';

    return (
        <div className="flex items-center gap-3 py-2">
            <div className="w-32 text-xs text-slate-300 truncate" title={label}>{label}</div>
            <div className="flex-1 h-8 bg-slate-800 rounded relative overflow-hidden">
                {/* Zero line */}
                <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600" />
                
                {/* Bar */}
                <div
                    className={`absolute top-1 bottom-1 rounded ${
                        isPositive ? 'bg-emerald-500/50' : 'bg-red-500/50'
                    }`}
                    style={{
                        left: direction === 'positive' ? '50%' : `${50 - width}%`,
                        width: `${width}%`
                    }}
                />
                
                {/* Impact label */}
                <div className="absolute top-1/2 -translate-y-1/2 text-[10px] text-slate-400">
                    ±{impact.toFixed(1)}%
                </div>
            </div>
        </div>
    );
};

export const SensitivityAnalysisPanel: React.FC = () => {
    const { lastSimulationResult, currentBlueprint } = useMechStore();
    const [selectedPreset, setSelectedPreset] = useState<string>('pump_system');
    const [customInputs, setCustomInputs] = useState<SensitivityInput[]>([]);
    const [useCustom, setUseCustom] = useState(false);
    const [result, setResult] = useState<SensitivityResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [showDetails, setShowDetails] = useState(false);

    const preset = SENSITIVITY_PRESETS[selectedPreset];

    const handleRunAnalysis = async () => {
        if (!currentBlueprint) return;

        setIsRunning(true);
        try {
            const service = new SensitivityAnalysisService(currentBlueprint);
            const inputs = useCustom ? customInputs : preset.inputs;
            const analysisResult = service.analyze(inputs, preset.outputs);
            setResult(analysisResult);
        } finally {
            setIsRunning(false);
        }
    };

    const formatValue = (v: number) => {
        if (Math.abs(v) < 0.01) return v.toExponential(2);
        if (Math.abs(v) < 1) return v.toFixed(3);
        if (Math.abs(v) < 100) return v.toFixed(2);
        return v.toFixed(1);
    };

    const maxImpact = useMemo(() => {
        if (!result) return 10;
        return Math.max(...result.tornadoData.map(d => d.impact), 1);
    }, [result]);

    if (!lastSimulationResult) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Run a simulation first</p>
                <p className="text-xs text-slate-600 mt-1">to enable sensitivity analysis.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400">
                            <BarChart3 className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-semibold text-white">Sensitivity Analysis</div>
                            <div className="text-xs text-slate-400">Understand which parameters affect outputs most</div>
                        </div>
                    </div>
                    <button
                        onClick={handleRunAnalysis}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isRunning ? (
                            <Activity className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isRunning ? 'Analyzing...' : 'Run Analysis'}
                    </button>
                </div>

                {/* Preset Selector */}
                <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                        <label className="block text-xs text-slate-500 mb-1">Analysis Preset</label>
                        <select
                            value={selectedPreset}
                            onChange={(e) => {
                                setSelectedPreset(e.target.value);
                                setUseCustom(false);
                            }}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-amber-500 focus:outline-none"
                        >
                            {Object.entries(SENSITIVITY_PRESETS).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.name}</option>
                            ))}
                        </select>
                    </div>
                    <div className="flex items-end">
                        <button
                            onClick={() => setUseCustom(!useCustom)}
                            className={`w-full px-3 py-2 border rounded-lg text-sm transition-colors ${
                                useCustom
                                    ? 'bg-amber-500/20 border-amber-500/50 text-amber-400'
                                    : 'bg-slate-900 border-slate-700 text-slate-400 hover:text-white'
                            }`}
                        >
                            Custom Inputs
                        </button>
                    </div>
                </div>

                {/* Preset Description */}
                <div className="mt-3 p-3 bg-slate-900/50 rounded-lg border border-slate-700/50">
                    <div className="text-xs text-slate-400">{preset.description}</div>
                    <div className="flex flex-wrap gap-2 mt-2">
                        {preset.inputs.map((input, i) => (
                            <span key={i} className="px-2 py-0.5 bg-slate-800 rounded text-[10px] text-slate-300">
                                {input.label} ±{input.perturbation * 100}%
                            </span>
                        ))}
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Most Sensitive */}
                    <div className="p-4 border-b border-slate-700 bg-amber-900/10">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-amber-400" />
                            <span className="text-sm font-medium text-amber-300">Most Sensitive Parameter</span>
                        </div>
                        <div className="grid grid-cols-3 gap-3">
                            <MetricCard
                                label="Parameter"
                                value={result.mostSensitive.parameter}
                                unit=""
                                icon={<Settings className="w-4 h-4" />}
                                color="text-amber-400"
                            />
                            <MetricCard
                                label="Elasticity"
                                value={result.mostSensitive.elasticity.toFixed(2)}
                                unit=""
                                icon={<Activity className="w-4 h-4" />}
                                color="text-amber-400"
                            />
                            <MetricCard
                                label="Affected Metrics"
                                value={result.mostSensitive.affectedMetrics.length.toString()}
                                unit="metrics"
                                icon={<BarChart3 className="w-4 h-4" />}
                                color="text-amber-400"
                            />
                        </div>
                    </div>

                    {/* Tornado Chart */}
                    <div className="p-4 border-b border-slate-700">
                        <div className="flex items-center justify-between mb-3">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                                <BarChart3 className="w-4 h-4" />
                                Tornado Chart
                            </div>
                            <button
                                onClick={() => setShowDetails(!showDetails)}
                                className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
                            >
                                {showDetails ? 'Hide Details' : 'Show Details'}
                                {showDetails ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                            </button>
                        </div>
                        <div className="bg-slate-900 rounded-lg p-4 border border-slate-700">
                            {/* Chart header */}
                            <div className="flex items-center gap-3 pb-2 border-b border-slate-700">
                                <div className="w-32 text-[10px] text-slate-500 uppercase">Parameter</div>
                                <div className="flex-1 h-6 relative">
                                    <div className="absolute left-1/2 top-0 bottom-0 w-0.5 bg-slate-600" />
                                    <div className="absolute left-1/2 top-0 -translate-x-1/2 text-[9px] text-slate-500">-10%</div>
                                    <div className="absolute right-0 top-0 text-[9px] text-slate-500">+10%</div>
                                </div>
                            </div>
                            {/* Bars */}
                            {result.tornadoData.map((item, i) => (
                                <TornadoBar
                                    key={i}
                                    label={item.parameter}
                                    impact={item.impact}
                                    direction={item.direction}
                                    maxImpact={maxImpact}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Detailed Results Table */}
                    {showDetails && (
                        <div className="p-4 border-b border-slate-700">
                            <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                                <Info className="w-4 h-4" />
                                Detailed Results
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-xs">
                                    <thead>
                                        <tr className="text-slate-400 border-b border-slate-700">
                                            <th className="text-left py-2 px-2">Input → Output</th>
                                            <th className="text-right py-2 px-2">Base</th>
                                            <th className="text-right py-2 px-2">-10%</th>
                                            <th className="text-right py-2 px-2">+10%</th>
                                            <th className="text-right py-2 px-2">Change</th>
                                            <th className="text-right py-2 px-2">Elasticity</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {result.outputs.map((output, i) => (
                                            <tr key={i} className="border-b border-slate-800/50">
                                                <td className="py-2 px-2 text-slate-300">
                                                    {output.label}
                                                </td>
                                                <td className="py-2 px-2 text-right text-slate-400">
                                                    {formatValue(output.baseValue)}
                                                </td>
                                                <td className="py-2 px-2 text-right text-cyan-400">
                                                    {formatValue(output.lowValue)}
                                                </td>
                                                <td className="py-2 px-2 text-right text-amber-400">
                                                    {formatValue(output.highValue)}
                                                </td>
                                                <td className={`py-2 px-2 text-right font-medium ${
                                                    output.changePercent > 5 ? 'text-amber-400' : 'text-slate-400'
                                                }`}>
                                                    ±{output.changePercent.toFixed(1)}%
                                                </td>
                                                <td className="py-2 px-2 text-right text-slate-400">
                                                    {output.elasticity.toFixed(2)}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}

                    {/* Interpretation Guide */}
                    <div className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                            <Info className="w-4 h-4 text-slate-400" />
                            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Interpretation</span>
                        </div>
                        <div className="space-y-2 text-xs text-slate-400">
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400 text-[10px] font-bold">+</span>
                                <span><span className="text-emerald-400 font-medium">Positive elasticity</span>: Increasing the input increases the output</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded bg-red-500/20 flex items-center justify-center text-red-400 text-[10px] font-bold">-</span>
                                <span><span className="text-red-400 font-medium">Negative elasticity</span>: Increasing the input decreases the output</span>
                            </div>
                            <div className="flex items-start gap-2">
                                <span className="w-4 h-4 rounded bg-amber-500/20 flex items-center justify-center text-amber-400 text-[10px] font-bold">#</span>
                                <span><span className="text-amber-400 font-medium">Higher impact</span> in tornado chart = more critical parameter to control</span>
                            </div>
                        </div>
                    </div>
                </>
            )}

            {/* Initial State */}
            {!result && !isRunning && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                    <BarChart3 className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Configure and run sensitivity analysis</p>
                    <p className="text-xs text-slate-600 mt-1">Identify which parameters most affect your system</p>
                </div>
            )}
        </div>
    );
};

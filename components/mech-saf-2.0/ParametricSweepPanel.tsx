import React, { useState, useMemo } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { ParametricSweepService, SWEEP_PRESETS, ParametricSweepConfig, ParametricSweepResult } from '../../services/simulation/ParametricSweepService';
import { Activity, TrendingUp, TrendingDown, Settings, Play, RefreshCw, AlertTriangle, CheckCircle2, Zap, Droplets } from 'lucide-react';

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

const StatusBadge: React.FC<{ status: 'ok' | 'warning' | 'error' }> = ({ status }) => {
    const config = {
        ok: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', text: 'text-emerald-400', icon: CheckCircle2, label: 'OK' },
        warning: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', text: 'text-amber-400', icon: AlertTriangle, label: 'Warning' },
        error: { bg: 'bg-red-500/10', border: 'border-red-500/30', text: 'text-red-400', icon: AlertTriangle, label: 'Error' }
    };
    const c = config[status];
    const Icon = c.icon;

    return (
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border ${c.bg} ${c.border} ${c.text}`}>
            <Icon className="w-3 h-3" />
            {c.label}
        </span>
    );
};

export const ParametricSweepPanel: React.FC = () => {
    const { lastSimulationResult, currentBlueprint } = useMechStore();
    const [selectedPreset, setSelectedPreset] = useState<string>('pump_speed');
    const [customMin, setCustomMin] = useState(50);
    const [customMax, setCustomMax] = useState(150);
    const [steps, setSteps] = useState(11);
    const [result, setResult] = useState<ParametricSweepResult | null>(null);
    const [isRunning, setIsRunning] = useState(false);
    const [sweepProgress, setSweepProgress] = useState<{ current: number; total: number } | null>(null);
    const [selectedPoint, setSelectedPoint] = useState<number | null>(null);

    const preset = SWEEP_PRESETS[selectedPreset];

    const handleRunSweep = async () => {
        if (!currentBlueprint) return;

        setIsRunning(true);
        setSweepProgress(null);
        try {
            const service = new ParametricSweepService(currentBlueprint);
            const config: ParametricSweepConfig = {
                parameter: preset.parameter,
                values: Array.from({ length: steps }, (_, i) => customMin + (i * (customMax - customMin) / (steps - 1))),
                unit: preset.unit,
                label: preset.label
            };

            const sweepResult = await service.runSweep(config, (current, total) => {
                setSweepProgress({ current, total });
            });
            setResult(sweepResult);
            setSelectedPoint(sweepResult.bestEfficiencyPoint.value);
        } finally {
            setIsRunning(false);
            setSweepProgress(null);
        }
    };

    const currentPoint = useMemo(() => {
        if (!result || selectedPoint === null) return null;
        return result.results.find(r => r.parameterValue === selectedPoint);
    }, [result, selectedPoint]);

    const formatValue = (v: number) => {
        if (Math.abs(v) < 0.01) return v.toExponential(2);
        if (Math.abs(v) < 1) return v.toFixed(3);
        if (Math.abs(v) < 100) return v.toFixed(2);
        return v.toFixed(1);
    };

    if (!lastSimulationResult) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Run a simulation first</p>
                <p className="text-xs text-slate-600 mt-1">to enable parametric analysis.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-semibold text-white">Parametric Sweep</div>
                            <div className="text-xs text-slate-400">Analyze system behavior across operating range</div>
                        </div>
                    </div>
                    <button
                        onClick={handleRunSweep}
                        disabled={isRunning}
                        className="flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-600 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                        {isRunning ? (
                            <RefreshCw className="w-4 h-4 animate-spin" />
                        ) : (
                            <Play className="w-4 h-4" />
                        )}
                        {isRunning
                            ? `Running${sweepProgress ? ` ${sweepProgress.current}/${sweepProgress.total}` : '...'}`
                            : 'Run Sweep'}
                    </button>
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-4 gap-3">
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Parameter</label>
                        <select
                            value={selectedPreset}
                            onChange={(e) => setSelectedPreset(e.target.value)}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                        >
                            {Object.entries(SWEEP_PRESETS).map(([key, preset]) => (
                                <option key={key} value={key}>{preset.label}</option>
                            ))}
                        </select>
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Min (%)</label>
                        <input
                            type="number"
                            value={customMin}
                            onChange={(e) => setCustomMin(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Max (%)</label>
                        <input
                            type="number"
                            value={customMax}
                            onChange={(e) => setCustomMax(Number(e.target.value))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                    <div>
                        <label className="block text-xs text-slate-500 mb-1">Steps</label>
                        <input
                            type="number"
                            value={steps}
                            onChange={(e) => setSteps(Math.max(3, Math.min(51, Number(e.target.value))))}
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm text-white focus:border-cyan-500 focus:outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Results */}
            {result && (
                <>
                    {/* Best Efficiency Point */}
                    <div className="p-4 border-b border-slate-700 bg-emerald-900/10">
                        <div className="flex items-center gap-2 mb-3">
                            <TrendingUp className="w-4 h-4 text-emerald-400" />
                            <span className="text-sm font-medium text-emerald-300">Best Efficiency Point</span>
                        </div>
                        <div className="grid grid-cols-4 gap-3">
                            <MetricCard
                                label="Setting"
                                value={formatValue(result.bestEfficiencyPoint.value)}
                                unit="%"
                                icon={<Settings className="w-4 h-4" />}
                                color="text-emerald-400"
                            />
                            <MetricCard
                                label="Efficiency"
                                value={formatValue(result.bestEfficiencyPoint.efficiency)}
                                unit="%"
                                icon={<Activity className="w-4 h-4" />}
                                color="text-emerald-400"
                            />
                            <MetricCard
                                label="Flow"
                                value={formatValue(result.bestEfficiencyPoint.flow)}
                                unit="m³/h"
                                icon={<Droplets className="w-4 h-4" />}
                                color="text-emerald-400"
                            />
                            <MetricCard
                                label="Head"
                                value={formatValue(result.bestEfficiencyPoint.head)}
                                unit="m"
                                icon={<Zap className="w-4 h-4" />}
                                color="text-emerald-400"
                            />
                        </div>
                    </div>

                    {/* Sweep Curve Visualization */}
                    <div className="p-4 border-b border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Pump Curve</div>
                        <div className="h-40 bg-slate-900 rounded-lg border border-slate-700 relative overflow-hidden">
                            {/* Grid lines */}
                            <div className="absolute inset-0 grid grid-cols-4 grid-rows-4">
                                {Array(16).fill(0).map((_, i) => (
                                    <div key={i} className="border-r border-b border-slate-800" />
                                ))}
                            </div>
                            {/* Pump curve */}
                            <svg className="absolute inset-0 w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
                                <path
                                    d={`M ${result.pumpCurve.map(p => `${p.flow / 150 * 100},${100 - p.head / 60 * 100}`).join(' L ')}`}
                                    fill="none"
                                    stroke="#22d3ee"
                                    strokeWidth="1"
                                    vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                            {/* Best efficiency marker */}
                            <div
                                className="absolute w-3 h-3 bg-emerald-400 rounded-full border-2 border-white transform -translate-x-1/2 -translate-y-1/2"
                                style={{
                                    left: `${result.bestEfficiencyPoint.flow / 150 * 100}%`,
                                    bottom: `${result.bestEfficiencyPoint.head / 60 * 100}%`
                                }}
                            />
                        </div>
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>0 m³/h</span>
                            <span>Flow →</span>
                            <span>150 m³/h</span>
                        </div>
                    </div>

                    {/* Point Selector */}
                    <div className="p-4 border-b border-slate-700">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">
                            Operating Point: {selectedPoint?.toFixed(0) || '-'}%
                        </div>
                        <input
                            type="range"
                            min={customMin}
                            max={customMax}
                            value={selectedPoint || customMin}
                            onChange={(e) => setSelectedPoint(Number(e.target.value))}
                            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                            <span>{customMin}%</span>
                            <span>{customMax}%</span>
                        </div>
                    </div>

                    {/* Selected Point Details */}
                    {currentPoint && (
                        <div className="p-4 border-b border-slate-700">
                            <div className="flex items-center justify-between mb-3">
                                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">Point Details</div>
                                <StatusBadge status={currentPoint.status} />
                            </div>
                            <div className="grid grid-cols-4 gap-3 mb-4">
                                <MetricCard
                                    label="Flow"
                                    value={formatValue(currentPoint.flow)}
                                    unit="m³/h"
                                    icon={<Droplets className="w-4 h-4 text-blue-400" />}
                                />
                                <MetricCard
                                    label="Head"
                                    value={formatValue(currentPoint.head)}
                                    unit="m"
                                    icon={<Zap className="w-4 h-4 text-yellow-400" />}
                                />
                                <MetricCard
                                    label="Power"
                                    value={formatValue(currentPoint.power)}
                                    unit="kW"
                                    icon={<Activity className="w-4 h-4 text-orange-400" />}
                                />
                                <MetricCard
                                    label="Efficiency"
                                    value={formatValue(currentPoint.efficiency)}
                                    unit="%"
                                    icon={<TrendingUp className="w-4 h-4 text-emerald-400" />}
                                />
                            </div>
                            {currentPoint.warnings.length > 0 && (
                                <div className="bg-amber-900/20 border border-amber-500/30 rounded-lg p-3">
                                    <div className="flex items-center gap-2 mb-2">
                                        <AlertTriangle className="w-4 h-4 text-amber-400" />
                                        <span className="text-xs font-medium text-amber-300">Warnings</span>
                                    </div>
                                    <ul className="space-y-1">
                                        {currentPoint.warnings.map((w, i) => (
                                            <li key={i} className="text-xs text-amber-200/80">• {w}</li>
                                        ))}
                                    </ul>
                                </div>
                            )}
                        </div>
                    )}

                    {/* All Results Table */}
                    <div className="p-4">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">All Results</div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="text-slate-400 border-b border-slate-700">
                                        <th className="text-left py-2 px-2">Setting</th>
                                        <th className="text-right py-2 px-2">Flow</th>
                                        <th className="text-right py-2 px-2">Head</th>
                                        <th className="text-right py-2 px-2">Power</th>
                                        <th className="text-right py-2 px-2">Efficiency</th>
                                        <th className="text-right py-2 px-2">Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {result.results.map((r) => (
                                        <tr
                                            key={r.parameterValue}
                                            onClick={() => setSelectedPoint(r.parameterValue)}
                                            className={`border-b border-slate-800 cursor-pointer transition-colors ${
                                                selectedPoint === r.parameterValue ? 'bg-cyan-500/10' : 'hover:bg-slate-800/50'
                                            }`}
                                        >
                                            <td className="py-2 px-2 text-slate-300">{r.parameterValue.toFixed(0)}%</td>
                                            <td className="py-2 px-2 text-right text-slate-300">{formatValue(r.flow)}</td>
                                            <td className="py-2 px-2 text-right text-slate-300">{formatValue(r.head)}</td>
                                            <td className="py-2 px-2 text-right text-slate-300">{formatValue(r.power)}</td>
                                            <td className={`py-2 px-2 text-right font-medium ${
                                                r.efficiency > 70 ? 'text-emerald-400' :
                                                r.efficiency > 50 ? 'text-amber-400' : 'text-red-400'
                                            }`}>{formatValue(r.efficiency)}%</td>
                                            <td className="py-2 px-2 text-right">
                                                <StatusBadge status={r.status} />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            {/* Initial State */}
            {!result && !isRunning && (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                    <Settings className="w-12 h-12 mb-4 opacity-20" />
                    <p className="text-sm">Configure and run a parametric sweep</p>
                    <p className="text-xs text-slate-600 mt-1">Analyze how system performance changes with parameter variations</p>
                </div>
            )}
        </div>
    );
};

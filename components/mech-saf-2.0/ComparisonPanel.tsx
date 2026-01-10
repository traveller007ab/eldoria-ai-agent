import React, { useMemo } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { MechSimulationResult, MechSimulationMetrics, MechDynamicSimulationResult } from '../../types';
import { ArrowRight, TrendingUp, TrendingDown, Minus, Activity, Zap, Droplets, Thermometer, Gauge } from 'lucide-react';

interface ComparisonMetric {
    label: string;
    key: keyof MechSimulationMetrics;
    unit: string;
    format: (v: number) => string;
    higherIsBetter?: boolean;
}

const COMPARISON_METRICS: ComparisonMetric[] = [
    { label: 'Power Input', key: 'totalPowerInput', unit: 'kW', format: (v) => v.toFixed(2) },
    { label: 'Power Output', key: 'totalPowerOutput', unit: 'kW', format: (v) => v.toFixed(2) },
    { label: 'Efficiency', key: 'overallEfficiency', unit: '%', format: (v) => v.toFixed(1), higherIsBetter: true },
    { label: 'Flow Rate', key: 'totalFlowRate', unit: 'm³/h', format: (v) => v.toFixed(1) },
    { label: 'Max Pressure', key: 'maxPressure', unit: 'kPa', format: (v) => v.toFixed(1) },
    { label: 'Pressure Drop', key: 'pressureDrop', unit: 'kPa', format: (v) => v.toFixed(1) },
    { label: 'Heat Input', key: 'totalHeatInput', unit: 'kW', format: (v) => v.toFixed(2) },
    { label: 'Heat Output', key: 'totalHeatOutput', unit: 'kW', format: (v) => v.toFixed(2) },
];

const formatDelta = (staticVal: number, dynamicVal: number, unit: string): { value: string; trend: 'up' | 'down' | 'same' | 'neutral'; percent: number } => {
    const delta = dynamicVal - staticVal;
    const percent = staticVal !== 0 ? (delta / Math.abs(staticVal)) * 100 : 0;

    let trend: 'up' | 'down' | 'same' | 'neutral';
    const absPercent = Math.abs(percent);
    const threshold = 0.5; // % threshold for "same"

    if (absPercent < threshold) {
        trend = 'same';
    } else if (delta > 0) {
        trend = 'up';
    } else {
        trend = 'down';
    }

    const sign = delta > 0 ? '+' : '';
    return {
        value: `${sign}${delta.toFixed(2)} ${unit}`,
        trend,
        percent
    };
};

const getTrendIcon = (trend: 'up' | 'down' | 'same' | 'neutral', higherIsBetter?: boolean) => {
    if (trend === 'same') return <Minus className="w-3 h-3 text-slate-500" />;
    if (trend === 'neutral') return <Minus className="w-3 h-3 text-slate-400" />;

    const isGood = higherIsBetter ? trend === 'up' : trend === 'down';
    const isBad = higherIsBetter ? trend === 'down' : trend === 'up';

    if (trend === 'up') {
        return <TrendingUp className={`w-3 h-3 ${isGood ? 'text-emerald-400' : 'text-amber-400'}`} />;
    }
    return <TrendingDown className={`w-3 h-3 ${isGood ? 'text-emerald-400' : 'text-amber-400'}`} />;
};

const getTrendColor = (trend: 'up' | 'down' | 'same' | 'neutral', higherIsBetter?: boolean) => {
    if (trend === 'same') return 'text-slate-400';
    if (trend === 'neutral') return 'text-slate-500';

    const isGood = higherIsBetter ? trend === 'up' : trend === 'down';
    if (trend === 'up' || trend === 'down') {
        return isGood ? 'text-emerald-400' : 'text-amber-400';
    }
    return 'text-slate-400';
};

export const ComparisonPanel: React.FC = () => {
    const { lastSimulationResult, lastStaticResult } = useMechStore();

    const staticResult = lastStaticResult || (lastSimulationResult && !lastSimulationResult.isDynamic) ? lastSimulationResult : null;
    const dynamicResult = (lastSimulationResult as MechDynamicSimulationResult)?.isDynamic ? lastSimulationResult as MechDynamicSimulationResult : null;

    const hasBoth = staticResult && dynamicResult;

    const metrics = useMemo(() => {
        if (!hasBoth) return [];

        return COMPARISON_METRICS.map(metric => {
            const staticVal = Number(staticResult!.metrics[metric.key]) || 0;
            const dynamicVal = Number(dynamicResult!.metrics[metric.key]) || 0;
            const comparison = formatDelta(staticVal, dynamicVal, metric.unit);

            return {
                ...metric,
                staticValue: metric.format(staticVal),
                dynamicValue: metric.format(dynamicVal),
                delta: comparison.value,
                trend: comparison.trend,
                percent: comparison.percent,
                higherIsBetter: metric.higherIsBetter
            };
        });
    }, [staticResult, dynamicResult, hasBoth]);

    if (!hasBoth) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">Run both static and dynamic simulations</p>
                <p className="text-xs text-slate-600 mt-1">to see comparison metrics.</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Header */}
            <div className="p-4 border-b border-slate-700 bg-slate-800/50">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                            <Activity className="w-5 h-5" />
                        </div>
                        <div>
                            <div className="font-semibold text-white">Static vs Dynamic Comparison</div>
                            <div className="text-xs text-slate-400">
                                {staticResult!.duration}ms (static) → {dynamicResult!.duration}ms (dynamic)
                            </div>
                        </div>
                    </div>
                    <div className="px-3 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-medium border border-emerald-500/30">
                        {dynamicResult!.timePoints?.length || 0} time points
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-3 p-4">
                {/* Static Summary */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-amber-400" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Static Analysis</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Power</span>
                            <span className="text-sm font-medium text-white">{staticResult!.metrics.totalPowerInput.toFixed(1)} kW</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Efficiency</span>
                            <span className="text-sm font-medium text-white">{staticResult!.metrics.overallEfficiency.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Flow</span>
                            <span className="text-sm font-medium text-white">{staticResult!.metrics.totalFlowRate.toFixed(1)} m³/h</span>
                        </div>
                    </div>
                </div>

                {/* Dynamic Summary */}
                <div className="p-4 rounded-lg bg-slate-800/50 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-2 h-2 rounded-full bg-cyan-400" />
                        <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">Dynamic Analysis</span>
                    </div>
                    <div className="space-y-2">
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Power</span>
                            <span className="text-sm font-medium text-white">{dynamicResult!.metrics.totalPowerInput.toFixed(1)} kW</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Efficiency</span>
                            <span className="text-sm font-medium text-white">{dynamicResult!.metrics.overallEfficiency.toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-xs text-slate-500">Flow</span>
                            <span className="text-sm font-medium text-white">{dynamicResult!.metrics.totalFlowRate.toFixed(1)} m³/h</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Comparison Table */}
            <div className="px-4 pb-4">
                <div className="rounded-lg border border-slate-700 overflow-hidden">
                    {/* Table Header */}
                    <div className="grid grid-cols-5 gap-2 p-3 bg-slate-800/80 border-b border-slate-700 text-xs font-medium text-slate-400 uppercase tracking-wider">
                        <div className="col-span-1">Metric</div>
                        <div className="col-span-1 text-center">Static</div>
                        <div className="col-span-1 text-center">Dynamic</div>
                        <div className="col-span-2 text-center">Change</div>
                    </div>

                    {/* Table Body */}
                    <div className="divide-y divide-slate-700/50">
                        {metrics.map((metric, index) => (
                            <div key={metric.key} className="grid grid-cols-5 gap-2 p-3 hover:bg-slate-800/30 transition-colors">
                                <div className="col-span-1 flex items-center">
                                    <span className="text-sm text-slate-300">{metric.label}</span>
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                    <span className="text-sm font-mono text-amber-300">{metric.staticValue}</span>
                                    <span className="text-xs text-slate-500 ml-1">{metric.unit}</span>
                                </div>
                                <div className="col-span-1 flex items-center justify-center">
                                    <span className="text-sm font-mono text-cyan-300">{metric.dynamicValue}</span>
                                    <span className="text-xs text-slate-500 ml-1">{metric.unit}</span>
                                </div>
                                <div className="col-span-2 flex items-center justify-center gap-2">
                                    <span className={`text-sm font-mono ${getTrendColor(metric.trend, metric.higherIsBetter)}`}>
                                        {metric.delta}
                                    </span>
                                    {getTrendIcon(metric.trend, metric.higherIsBetter)}
                                    <span className="text-xs text-slate-500">
                                        ({metric.percent > 0 ? '+' : ''}{metric.percent.toFixed(1)}%)
                                    </span>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Key Differences Analysis */}
            <div className="px-4 pb-4">
                <div className="p-4 rounded-lg bg-slate-800/30 border border-slate-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Gauge className="w-4 h-4 text-cyan-400" />
                        <span className="text-sm font-medium text-white">Key Differences</span>
                    </div>
                    <div className="space-y-2">
                        {metrics
                            .filter(m => Math.abs(m.percent) > 5)
                            .sort((a, b) => Math.abs(b.percent) - Math.abs(a.percent))
                            .slice(0, 3)
                            .map(metric => (
                                <div key={metric.key} className="flex items-center justify-between text-sm">
                                    <span className="text-slate-400">{metric.label}</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`font-mono ${getTrendColor(metric.trend, metric.higherIsBetter)}`}>
                                            {metric.percent > 0 ? '+' : ''}{metric.percent.toFixed(1)}%
                                        </span>
                                    </div>
                                </div>
                            ))}
                        {metrics.filter(m => Math.abs(m.percent) > 5).length === 0 && (
                            <p className="text-xs text-slate-500 italic">No significant differences detected.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Time Series Insight */}
            {dynamicResult?.timeSeries && Object.keys(dynamicResult.timeSeries).length > 0 && (
                <div className="px-4 pb-4">
                    <div className="p-4 rounded-lg bg-cyan-900/10 border border-cyan-500/20">
                        <div className="flex items-center gap-2 mb-3">
                            <Activity className="w-4 h-4 text-cyan-400" />
                            <span className="text-sm font-medium text-white">Dynamic Behavior</span>
                        </div>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Time Points Recorded</span>
                                <span className="text-white font-mono">{dynamicResult.timePoints?.length || 0}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Variables Tracked</span>
                                <span className="text-white font-mono">{Object.keys(dynamicResult.timeSeries).length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Simulation Duration</span>
                                <span className="text-white font-mono">{dynamicResult.totalDuration}s</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

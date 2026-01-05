import React, { useMemo, useState } from 'react';
import { LineChart, TrendingUp, Activity, Zap, ChevronDown } from 'lucide-react';
import { DeepSAFBlueprint } from './types';

/**
 * SimulationGraphPanel - Real SVG Line Charts for Simulation Values
 * 
 * Displays live simulation data as interactive line charts.
 * Uses pure SVG for rendering (no external chart library).
 */

interface SimulationGraphPanelProps {
    blueprint: DeepSAFBlueprint;
    simulationHistory?: Array<{ timestamp: string; values: Record<string, number> }>;
}

interface ChartData {
    label: string;
    values: number[];
    color: string;
    unit?: string;
}

// Color palette for chart lines
const CHART_COLORS = [
    '#06b6d4', // cyan
    '#8b5cf6', // purple
    '#10b981', // emerald
    '#f59e0b', // amber
    '#ec4899', // pink
    '#3b82f6', // blue
    '#ef4444', // red
    '#14b8a6', // teal
];

const SVGLineChart: React.FC<{
    data: ChartData[];
    width: number;
    height: number;
    showLegend?: boolean;
}> = ({ data, width, height, showLegend = true }) => {
    const padding = { top: 20, right: 20, bottom: 30, left: 50 };
    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Calculate scale
    const allValues = data.flatMap(d => d.values);
    const maxVal = Math.max(...allValues, 1);
    const minVal = Math.min(...allValues, 0);
    const valueRange = maxVal - minVal || 1;

    const maxPoints = Math.max(...data.map(d => d.values.length), 1);

    // Scale functions
    const xScale = (i: number) => padding.left + (i / Math.max(maxPoints - 1, 1)) * chartWidth;
    const yScale = (v: number) => padding.top + chartHeight - ((v - minVal) / valueRange) * chartHeight;

    // Generate Y-axis ticks
    const yTicks = useMemo(() => {
        const tickCount = 5;
        const step = valueRange / (tickCount - 1);
        return Array.from({ length: tickCount }, (_, i) => minVal + step * i);
    }, [minVal, valueRange]);

    if (data.length === 0 || data.every(d => d.values.length === 0)) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <Activity className="w-8 h-8 mb-2 opacity-50" />
                <p className="text-xs">No simulation data yet</p>
                <p className="text-[10px] mt-1">Run simulation to see charts</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <svg width={width} height={height} className="flex-shrink-0">
                {/* Background grid */}
                <defs>
                    <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3" />
                    </pattern>
                </defs>
                <rect x={padding.left} y={padding.top} width={chartWidth} height={chartHeight} fill="url(#grid)" />

                {/* Y-axis ticks and labels */}
                {yTicks.map((tick, i) => (
                    <g key={i}>
                        <line
                            x1={padding.left - 5}
                            x2={padding.left}
                            y1={yScale(tick)}
                            y2={yScale(tick)}
                            stroke="#6b7280"
                            strokeWidth="1"
                        />
                        <text
                            x={padding.left - 8}
                            y={yScale(tick)}
                            textAnchor="end"
                            dominantBaseline="middle"
                            className="fill-gray-500 text-[10px]"
                        >
                            {tick.toFixed(tick < 10 ? 1 : 0)}
                        </text>
                    </g>
                ))}

                {/* X-axis */}
                <line
                    x1={padding.left}
                    x2={padding.left + chartWidth}
                    y1={padding.top + chartHeight}
                    y2={padding.top + chartHeight}
                    stroke="#6b7280"
                    strokeWidth="1"
                />

                {/* Y-axis */}
                <line
                    x1={padding.left}
                    x2={padding.left}
                    y1={padding.top}
                    y2={padding.top + chartHeight}
                    stroke="#6b7280"
                    strokeWidth="1"
                />

                {/* Data lines */}
                {data.map((series, seriesIdx) => {
                    if (series.values.length < 2) return null;
                    const pathData = series.values
                        .map((v, i) => `${i === 0 ? 'M' : 'L'} ${xScale(i)} ${yScale(v)}`)
                        .join(' ');

                    return (
                        <g key={seriesIdx}>
                            {/* Gradient fill under line */}
                            <defs>
                                <linearGradient id={`gradient-${seriesIdx}`} x1="0%" y1="0%" x2="0%" y2="100%">
                                    <stop offset="0%" stopColor={series.color} stopOpacity="0.3" />
                                    <stop offset="100%" stopColor={series.color} stopOpacity="0" />
                                </linearGradient>
                            </defs>
                            <path
                                d={`${pathData} L ${xScale(series.values.length - 1)} ${padding.top + chartHeight} L ${padding.left} ${padding.top + chartHeight} Z`}
                                fill={`url(#gradient-${seriesIdx})`}
                            />
                            {/* Main line */}
                            <path
                                d={pathData}
                                fill="none"
                                stroke={series.color}
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            />
                            {/* Data points */}
                            {series.values.map((v, i) => (
                                <circle
                                    key={i}
                                    cx={xScale(i)}
                                    cy={yScale(v)}
                                    r="3"
                                    fill={series.color}
                                    stroke="#1f2937"
                                    strokeWidth="1"
                                    className="hover:r-4 transition-all cursor-pointer"
                                >
                                    <title>{`${series.label}: ${v.toFixed(2)}${series.unit || ''}`}</title>
                                </circle>
                            ))}
                        </g>
                    );
                })}
            </svg>

            {/* Legend */}
            {showLegend && (
                <div className="flex flex-wrap gap-3 px-4 py-2 border-t border-white/10">
                    {data.map((series, i) => (
                        <div key={i} className="flex items-center gap-1.5 text-xs">
                            <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: series.color }}
                            />
                            <span className="text-gray-400">{series.label}</span>
                            {series.unit && <span className="text-gray-600">({series.unit})</span>}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export const SimulationGraphPanel: React.FC<SimulationGraphPanelProps> = ({
    blueprint,
    simulationHistory = [],
}) => {
    const [selectedVars, setSelectedVars] = useState<string[]>([]);
    const [isCollapsed, setIsCollapsed] = useState(false);

    // Extract chart data from simulation history or current snapshot
    const chartData = useMemo<ChartData[]>(() => {
        if (simulationHistory.length > 0) {
            // Use history if available
            const allKeys = new Set<string>();
            simulationHistory.forEach(snap => {
                Object.keys(snap.values).forEach(k => allKeys.add(k));
            });

            const keys = selectedVars.length > 0
                ? selectedVars
                : Array.from(allKeys).slice(0, 6); // Limit to 6 series by default

            return keys.map((key, i) => ({
                label: key.split('.').pop() || key,
                values: simulationHistory.map(snap => snap.values[key] ?? 0),
                color: CHART_COLORS[i % CHART_COLORS.length],
                unit: '',
            }));
        }

        // Fallback: use current simulation snapshot
        const simVars = blueprint.last_simulation?.system_vars || {};
        if (Object.keys(simVars).length === 0) return [];

        // For single snapshot, create a bar-like display (single point per var)
        const keys = selectedVars.length > 0
            ? selectedVars
            : Object.keys(simVars).slice(0, 8);

        return keys.map((key, i) => ({
            label: key.split('.').pop() || key,
            values: [simVars[key] ?? 0],
            color: CHART_COLORS[i % CHART_COLORS.length],
            unit: '',
        }));
    }, [blueprint.last_simulation, simulationHistory, selectedVars]);

    // Available variables for selection
    const availableVars = useMemo(() => {
        if (simulationHistory.length > 0) {
            const allKeys = new Set<string>();
            simulationHistory.forEach(snap => {
                Object.keys(snap.values).forEach(k => allKeys.add(k));
            });
            return Array.from(allKeys);
        }
        return Object.keys(blueprint.last_simulation?.system_vars || {});
    }, [blueprint.last_simulation, simulationHistory]);

    const toggleVar = (varName: string) => {
        setSelectedVars(prev =>
            prev.includes(varName)
                ? prev.filter(v => v !== varName)
                : [...prev, varName]
        );
    };

    return (
        <div className="flex flex-col h-full bg-gray-900/95 backdrop-blur-md border border-cyan-900/30 rounded-xl overflow-hidden">
            {/* Header */}
            <div
                className="shrink-0 px-4 py-3 border-b border-cyan-900/20 bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 flex items-center justify-between cursor-pointer"
                onClick={() => setIsCollapsed(!isCollapsed)}
            >
                <div className="flex items-center gap-3">
                    <LineChart className="w-5 h-5 text-emerald-400" />
                    <div>
                        <h3 className="font-bold text-white text-sm">Simulation Graphs</h3>
                        <span className="text-xs text-gray-500">
                            {chartData.length} variables
                            {simulationHistory.length > 0 && ` • ${simulationHistory.length} samples`}
                        </span>
                    </div>
                </div>
                <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? '' : 'rotate-180'}`} />
            </div>

            {!isCollapsed && (
                <>
                    {/* Variable Selector */}
                    {availableVars.length > 0 && (
                        <div className="shrink-0 p-3 border-b border-cyan-900/10 overflow-x-auto">
                            <div className="flex gap-2 flex-wrap">
                                {availableVars.map((varName, i) => {
                                    const isSelected = selectedVars.includes(varName) ||
                                        (selectedVars.length === 0 && i < 6);
                                    return (
                                        <button
                                            key={varName}
                                            onClick={() => toggleVar(varName)}
                                            className={`px-2 py-1 text-[10px] rounded-full border transition-colors ${isSelected
                                                ? 'bg-cyan-500/20 border-cyan-500/50 text-cyan-400'
                                                : 'bg-transparent border-white/10 text-gray-500 hover:border-white/30'
                                                }`}
                                        >
                                            {varName.split('.').pop()}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    )}

                    {/* Chart Area */}
                    <div className="flex-grow min-h-[200px] p-2">
                        <SVGLineChart
                            data={chartData}
                            width={400}
                            height={250}
                            showLegend={true}
                        />
                    </div>

                    {/* Footer Stats */}
                    {chartData.length > 0 && (
                        <div className="shrink-0 px-4 py-2 border-t border-cyan-900/20 bg-black/20 flex gap-4">
                            {chartData.slice(0, 3).map((series, i) => {
                                const latest = series.values[series.values.length - 1] ?? 0;
                                const prev = series.values.length > 1 ? series.values[series.values.length - 2] : latest;
                                const delta = latest - prev;
                                return (
                                    <div key={i} className="flex items-center gap-2">
                                        <div
                                            className="w-2 h-2 rounded-full"
                                            style={{ backgroundColor: series.color }}
                                        />
                                        <span className="text-xs text-gray-400">{series.label}:</span>
                                        <span className="text-xs text-white font-mono">{latest.toFixed(2)}</span>
                                        {delta !== 0 && (
                                            <span className={`text-[10px] ${delta > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                                                {delta > 0 ? '+' : ''}{delta.toFixed(1)}
                                            </span>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default SimulationGraphPanel;

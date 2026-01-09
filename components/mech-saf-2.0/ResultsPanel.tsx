import React, { Dispatch, SetStateAction } from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { TimePlot } from './TimePlot';
import { CheckCircle2, AlertTriangle, Activity, Gauge, Droplets, Flame, Zap, Clock, LineChart, Printer, Download, Settings } from 'lucide-react';
import { MechDynamicSimulationResult } from '../../types';
import { ReportPreviewModal } from './ReportPreviewModal';
import { exportToCSV, exportToJSON, exportDynamicMetricsJSON } from '../../utils/ExportUtils';
import { ModelAnalyzer, ModelCategory } from '../../services/physics/ModelAnalyzer';

const MODEL_CATEGORIES: { value: ModelCategory; label: string }[] = [
    { value: 'engine_system', label: 'Engine System' },
    { value: 'pump_system', label: 'Pump System' },
    { value: 'hydraulic_circuit', label: 'Hydraulic Circuit' },
    { value: 'vehicle_dynamics', label: 'Vehicle Dynamics' },
    { value: 'power_plant', label: 'Power Plant' },
    { value: 'hvac_system', label: 'HVAC System' },
    { value: 'thermal_network', label: 'Thermal Network' },
    { value: 'process_system', label: 'Process System' },
    { value: 'general', label: 'General' }
];

export const ResultsPanel: React.FC = () => {
    const { lastSimulationResult, isSimulating, currentBlueprint } = useMechStore();
    const [isReportOpen, setIsReportOpen] = React.useState(false);
    const [exportFormat, setExportFormat] = React.useState<'csv' | 'json' | 'dynamic' | null>(null);
    const [overrideCategory, setOverrideCategory] = React.useState<ModelCategory | null>(null);
    const [showCategorySelector, setShowCategorySelector] = React.useState(false);

    const handleExport = (format: 'csv' | 'json' | 'dynamic') => {
        if (!lastSimulationResult || !currentBlueprint) return;

        if (format === 'csv') {
            exportToCSV(lastSimulationResult, currentBlueprint);
        } else if (format === 'json') {
            exportToJSON(lastSimulationResult, currentBlueprint);
        } else if (format === 'dynamic') {
            exportDynamicMetricsJSON(lastSimulationResult, currentBlueprint);
        }
        setExportFormat(null);
    };

    if (isSimulating) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-400 p-8">
                <div className="animate-spin w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full mb-4" />
                <p className="text-sm">Running simulation...</p>
            </div>
        );
    }

    if (!lastSimulationResult) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-slate-500 p-8 text-center">
                <Activity className="w-12 h-12 mb-4 opacity-20" />
                <p className="text-sm">No simulation results yet.</p>
                <p className="text-xs text-slate-600 mt-1">Click "Run Simulation" to analyze your system.</p>
            </div>
        );
    }

    const { metrics, diagnostics, variables, duration, configuration } = lastSimulationResult;
    const isConverged = diagnostics.convergence.converged;

    return (
        <div className="flex flex-col h-full overflow-y-auto custom-scrollbar">
            {/* Status Header */}
            <div className={`p-4 border-b ${isConverged ? 'bg-emerald-900/20 border-emerald-700/50' : 'bg-red-900/20 border-red-700/50'}`}>
                <div className="flex items-center gap-3">
                    {isConverged ? (
                        <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : (
                        <AlertTriangle className="w-6 h-6 text-red-400" />
                    )}
                    <div>
                        <div className={`font-semibold ${isConverged ? 'text-emerald-300' : 'text-red-300'}`}>
                            {isConverged ? 'Simulation Converged' : 'Simulation Failed'}
                        </div>
                        <div className="text-xs text-slate-400 flex items-center gap-2 mt-0.5">
                            <Clock className="w-3 h-3" />
                            {duration}ms | {diagnostics.convergence.iterations} iterations
                        </div>
                    </div>
                </div>

                <div className="flex items-center gap-2 mt-3">
                    <button
                        onClick={() => setIsReportOpen(true)}
                        className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-medium text-slate-300 hover:text-white transition-colors"
                        title="Generate PDF Report"
                    >
                        <Printer className="w-3.5 h-3.5" />
                        Report
                    </button>

                    <div className="relative">
                        <button
                            onClick={() => setExportFormat(exportFormat ? null : 'csv')}
                            className="flex items-center gap-2 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs font-medium text-slate-300 hover:text-white transition-colors"
                            title="Export Results"
                        >
                            <Download className="w-3.5 h-3.5" />
                            Export
                        </button>

                        {exportFormat && (
                            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-600 rounded-lg shadow-xl z-10 overflow-hidden min-w-[160px]">
                                <button
                                    onClick={() => handleExport('csv')}
                                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 w-full text-left"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export as CSV
                                </button>
                                <button
                                    onClick={() => handleExport('json')}
                                    className="flex items-center gap-2 px-4 py-2 text-xs text-slate-300 hover:bg-slate-700 w-full text-left"
                                >
                                    <Download className="w-3.5 h-3.5" />
                                    Export as JSON
                                </button>
                                {lastSimulationResult.dynamicMetrics && (
                                    <button
                                        onClick={() => handleExport('dynamic')}
                                        className="flex items-center gap-2 px-4 py-2 text-xs text-cyan-400 hover:bg-slate-700 w-full text-left border-t border-slate-700"
                                    >
                                        <Activity className="w-3.5 h-3.5" />
                                        Export Dynamic Metrics
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Diagnostic Issues */}
            {lastSimulationResult.issues && lastSimulationResult.issues.length > 0 && (
                <div className="p-4 border-b border-orange-900/30 bg-orange-900/10">
                    <h3 className="text-xs font-bold text-orange-400 uppercase tracking-wider mb-2 flex items-center gap-2">
                        <AlertTriangle className="w-3 h-3" /> Diagnostics Alerts
                    </h3>
                    <div className="space-y-2">
                        {lastSimulationResult.issues.map((issue) => (
                            <div key={issue.id} className="flex items-start gap-2 text-xs bg-black/20 p-2 rounded border border-orange-500/20">
                                <AlertTriangle className={`w-3.5 h-3.5 mt-0.5 ${issue.severity === 'critical' ? 'text-red-400' : 'text-orange-400'}`} />
                                <div>
                                    <div className="font-semibold text-slate-300">
                                        {currentBlueprint?.components.find(c => c.id === issue.componentId)?.name || issue.componentId}
                                    </div>
                                    <div className="text-slate-400">{issue.message}</div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* System Metrics */}
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Gauge className="w-3 h-3" /> System Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                    <MetricCard
                        label="Power Input"
                        value={metrics.totalPowerInput.toFixed(2)}
                        unit="kW"
                        icon={<Zap className="w-4 h-4 text-yellow-400" />}
                    />
                    <MetricCard
                        label="Power Output"
                        value={metrics.totalPowerOutput.toFixed(2)}
                        unit="kW"
                        icon={<Zap className="w-4 h-4 text-emerald-400" />}
                    />
                    <MetricCard
                        label="Efficiency"
                        value={metrics.overallEfficiency.toFixed(1)}
                        unit="%"
                        icon={<Activity className="w-4 h-4 text-cyan-400" />}
                    />
                    <MetricCard
                        label="Total Flow"
                        value={metrics.totalFlowRate.toFixed(1)}
                        unit="m³/h"
                        icon={<Droplets className="w-4 h-4 text-blue-400" />}
                    />
                    {metrics.totalHeatInput > 0 && (
                        <>
                            <MetricCard
                                label="Heat Input"
                                value={metrics.totalHeatInput.toFixed(1)}
                                unit="kW"
                                icon={<Flame className="w-4 h-4 text-orange-400" />}
                            />
                            <MetricCard
                                label="Heat Output"
                                value={metrics.totalHeatOutput.toFixed(1)}
                                unit="kW"
                                icon={<Flame className="w-4 h-4 text-red-400" />}
                            />
                        </>
                    )}
                </div>
            </div>

            {/* Dynamic Metrics Section */}
            {lastSimulationResult.dynamicMetrics && (
                <DynamicMetricsSection
                    metrics={lastSimulationResult.dynamicMetrics}
                    overrideCategory={overrideCategory}
                    onOverrideChange={setOverrideCategory}
                />
            )}

            {/* Balance Diagnostics */}
            <div className="p-4 border-b border-slate-700">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Balances</h3>
                <div className="space-y-2">
                    <BalanceBar
                        label="Mass Balance"
                        status={diagnostics.massBalance.status}
                        imbalance={diagnostics.massBalance.imbalancePercent}
                    />
                    <BalanceBar
                        label="Energy Balance"
                        status={diagnostics.energyBalance.status}
                        imbalance={diagnostics.energyBalance.imbalancePercent}
                    />
                </div>
            </div>

            {/* Variable Results */}
            <div className="p-4 flex-1">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3">Calculated Variables</h3>
                <div className="space-y-1">
                    {Object.entries(variables).map(([key, value]) => (
                        <div key={key} className="flex items-center justify-between py-1.5 px-2 rounded bg-slate-900/50 hover:bg-slate-800/50">
                            <span className="text-xs text-slate-400 font-mono truncate flex-1">{key}</span>
                            <span className="text-sm text-cyan-400 font-semibold ml-2">
                                {typeof value === 'number' ? (value > 1000 ? value.toExponential(2) : value.toFixed(2)) : value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>

            {/* Dynamic Charts */}
            {(lastSimulationResult as any).isDynamic && (
                <div className="p-4 border-t border-slate-700">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <LineChart className="w-3 h-3" /> Dynamic Response
                    </h3>
                    <div className="space-y-4">
                        {/* Only show "interesting" variables that change over time (e.g. Tank Levels, Temps) */}
                        {Object.entries((lastSimulationResult as MechDynamicSimulationResult).timeSeries)
                            .filter(([key]) => key.includes('level') || key.includes('temperature') || key.includes('pressure') || key.includes('flow'))
                            .slice(0, 5) // Limit to top 5 to avoid clutter
                            .map(([key, data]) => (
                                <TimePlot
                                    key={key}
                                    timePoints={(lastSimulationResult as MechDynamicSimulationResult).timePoints}
                                    data={data}
                                    label={key.replace(/_/g, ' ')}
                                    unit={key.includes('level') ? 'm' : key.includes('temp') ? '°C' : key.includes('flow') ? 'm³/h' : ''}
                                    height={80}
                                    color={key.includes('level') ? '#22d3ee' : key.includes('temp') ? '#fb923c' : '#94a3b8'}
                                />
                            ))
                        }
                    </div>
                </div>
            )}
            {currentBlueprint && (
                <ReportPreviewModal
                    isOpen={isReportOpen}
                    onClose={() => setIsReportOpen(false)}
                    blueprint={currentBlueprint}
                    result={lastSimulationResult}
                />
            )}
        </div>
    );
};

const MetricCard: React.FC<{ label: string; value: string; unit: string; icon: React.ReactNode }> = ({ label, value, unit, icon }) => (
    <div className="bg-slate-900/50 rounded-lg p-3 border border-slate-700/50">
        <div className="flex items-center gap-2 mb-1">
            {icon}
            <span className="text-[10px] text-slate-500 uppercase">{label}</span>
        </div>
        <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-white">{value}</span>
            <span className="text-xs text-slate-500">{unit}</span>
        </div>
    </div>
);

const BalanceBar: React.FC<{ label: string; status: 'ok' | 'warning' | 'error'; imbalance: number }> = ({ label, status, imbalance }) => {
    const colors = {
        ok: 'bg-emerald-500',
        warning: 'bg-yellow-500',
        error: 'bg-red-500'
    };

    return (
        <div className="flex items-center gap-3 bg-slate-900/50 rounded px-3 py-2">
            <div className={`w-2 h-2 rounded-full ${colors[status]}`} />
            <span className="text-xs text-slate-400 flex-1">{label}</span>
            <span className="text-xs text-slate-500">
                {status === 'ok' ? 'OK' : `${Math.abs(imbalance).toFixed(1)}% imbalance`}
            </span>
        </div>
    );
};

interface DynamicMetricsSectionProps {
    metrics: Record<string, any>;
    overrideCategory: ModelCategory | null;
    onOverrideChange: (category: ModelCategory | null) => void;
}

const DynamicMetricsSection: React.FC<DynamicMetricsSectionProps> = ({ metrics, overrideCategory, onOverrideChange }) => {
    const { summary, engine, pump, thermal, hydraulic, vehicle, process } = metrics;

    if (!summary?.modelCategory || summary.modelCategory === 'general') {
        return null;
    }

    const displayCategory = overrideCategory || summary.modelCategory as ModelCategory;

    return (
        <div className="p-4 border-b border-slate-700">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-cyan-500 uppercase tracking-wider flex items-center gap-2">
                    <Activity className="w-3 h-3" />
                    {displayCategory.replace(/_/g, ' ')} Metrics
                </h3>
                <button
                    onClick={() => onOverrideChange(overrideCategory ? null : displayCategory)}
                    className="flex items-center gap-1 px-2 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded text-xs text-slate-400 hover:text-white transition-colors"
                    title="Change model category"
                >
                    <Settings className="w-3 h-3" />
                    {overrideCategory ? 'Auto-detected' : 'Override'}
                </button>
            </div>

            {overrideCategory && overrideCategory !== summary.modelCategory && (
                <div className="mb-3 p-2 bg-cyan-900/20 border border-cyan-700/50 rounded">
                    <div className="text-xs text-cyan-400 mb-2">
                        Override: {overrideCategory.replace(/_/g, ' ')}
                        <span className="text-slate-500 ml-2">(Original: {summary.modelCategory.replace(/_/g, ' ')})</span>
                    </div>
                    <select
                        value={overrideCategory}
                        onChange={(e) => onOverrideChange(e.target.value as ModelCategory)}
                        className="w-full bg-slate-800 border border-slate-600 rounded px-2 py-1 text-xs text-white"
                    >
                        {MODEL_CATEGORIES.map(cat => (
                            <option key={cat.value} value={cat.value}>{cat.label}</option>
                        ))}
                    </select>
                    <p className="text-[10px] text-slate-500 mt-1">
                        Re-run simulation to see metrics for the new category
                    </p>
                </div>
            )}

            {/* Engine Metrics */}
            {engine && (
                <div className="space-y-2 mb-4">
                    {engine._warning && (
                        <div className="bg-yellow-900/20 border border-yellow-700/50 rounded p-2 mb-2">
                            <p className="text-xs text-yellow-400">{engine._warning}</p>
                        </div>
                    )}
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Torque" value={engine.torque?.toFixed(1) || '—'} unit="Nm" icon={<Zap className="w-4 h-4 text-yellow-400" />} />
                        <MetricCard label="Power" value={engine.brakePower?.toFixed(1) || '—'} unit="kW" icon={<Zap className="w-4 h-4 text-cyan-400" />} />
                        <MetricCard label="Horsepower" value={engine.horsepower?.toFixed(1) || '—'} unit="HP" icon={<Zap className="w-4 h-4 text-emerald-400" />} />
                        <MetricCard label="RPM" value={engine.rpm?.toFixed(0) || '—'} unit="" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                        <MetricCard label="BMEP" value={engine.bmep?.toFixed(1) || '—'} unit="bar" icon={<Gauge className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="BSFC" value={engine.bsfc?.toFixed(1) || '—'} unit="g/kWh" icon={<Activity className="w-4 h-4 text-orange-400" />} />
                        <MetricCard label="Thermal Eff." value={engine.thermalEfficiency?.toFixed(1) || '—'} unit="%" icon={<Flame className="w-4 h-4 text-red-400" />} />
                        <MetricCard label="AFR" value={engine.airFuelRatio?.toFixed(1) || '—'} unit="" icon={<Activity className="w-4 h-4 text-cyan-400" />} />
                    </div>
                </div>
            )}

            {/* Pump Metrics */}
            {pump && (
                <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Pump Head" value={pump.head?.toFixed(1) || '0'} unit="m" icon={<Gauge className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="Efficiency" value={pump.efficiency?.toFixed(1) || '0'} unit="%" icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                        <MetricCard label="NPSHa" value={pump.npsha?.toFixed(2) || '0'} unit="m" icon={<Gauge className="w-4 h-4 text-yellow-400" />} />
                        <MetricCard label="NPSHr" value={pump.npshr?.toFixed(2) || '0'} unit="m" icon={<Gauge className="w-4 h-4 text-orange-400" />} />
                        <MetricCard label="Suction Spd" value={pump.suctionSpecificSpeed?.toFixed(0) || '0'} unit="" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                        <MetricCard label="Flow Coef." value={pump.flowCoefficient?.toFixed(3) || '0'} unit="" icon={<Activity className="w-4 h-4 text-cyan-400" />} />
                    </div>
                </div>
            )}

            {/* Thermal Metrics */}
            {thermal && (
                <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="COP" value={thermal.cop?.toFixed(2) || '0'} unit="" icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                        <MetricCard label="LMTD" value={thermal.lmtd?.toFixed(1) || '0'} unit="°C" icon={<Flame className="w-4 h-4 text-orange-400" />} />
                        <MetricCard label="UA Value" value={thermal.uaValue?.toFixed(1) || '0'} unit="kW/K" icon={<Gauge className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="Effectiveness" value={(thermal.effectiveness * 100)?.toFixed(1) || '0'} unit="%" icon={<Activity className="w-4 h-4 text-cyan-400" />} />
                    </div>
                </div>
            )}

            {/* Hydraulic Metrics */}
            {hydraulic && (
                <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Max Velocity" value={hydraulic.pipeVelocity?.toFixed(2) || '0'} unit="m/s" icon={<Activity className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="Reynolds No." value={hydraulic.reynoldsNumber?.toFixed(0) || '0'} unit="" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                        <MetricCard label="Friction Factor" value={hydraulic.frictionFactor?.toFixed(4) || '0'} unit="" icon={<Gauge className="w-4 h-4 text-cyan-400" />} />
                        <MetricCard label="Cavitation Mrg" value={hydraulic.cavitationMargin?.toFixed(2) || '0'} unit="m" icon={<AlertTriangle className="w-4 h-4 text-yellow-400" />} />
                    </div>
                </div>
            )}

            {/* Vehicle Metrics */}
            {vehicle && (
                <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Top Speed" value={vehicle.topSpeed?.toFixed(1) || '0'} unit="km/h" icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                        <MetricCard label="0-100 km/h" value={vehicle.accelerationTime?.toFixed(1) || '0'} unit="s" icon={<Activity className="w-4 h-4 text-cyan-400" />} />
                        <MetricCard label="Wheel HP" value={vehicle.wheelHorsepower?.toFixed(1) || '0'} unit="HP" icon={<Zap className="w-4 h-4 text-yellow-400" />} />
                        <MetricCard label="P/W Ratio" value={vehicle.powerToWeightRatio?.toFixed(3) || '0'} unit="kW/kg" icon={<Gauge className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="Torque Wheels" value={vehicle.torqueAtWheels?.toFixed(1) || '0'} unit="Nm" icon={<Zap className="w-4 h-4 text-orange-400" />} />
                        <MetricCard label="Range" value={vehicle.range?.toFixed(0) || '0'} unit="km" icon={<Activity className="w-4 h-4 text-purple-400" />} />
                    </div>
                </div>
            )}

            {/* Process Metrics */}
            {process && (
                <div className="space-y-2 mb-4">
                    <div className="grid grid-cols-2 gap-2">
                        <MetricCard label="Throughput" value={process.throughput?.toFixed(1) || '0'} unit="m³/h" icon={<Droplets className="w-4 h-4 text-blue-400" />} />
                        <MetricCard label="Residence Time" value={process.residenceTime?.toFixed(1) || '0'} unit="s" icon={<Clock className="w-4 h-4 text-purple-400" />} />
                        <MetricCard label="Yield" value={(process.yield * 100)?.toFixed(1) || '0'} unit="%" icon={<Activity className="w-4 h-4 text-emerald-400" />} />
                        <MetricCard label="Conversion" value={(process.conversion * 100)?.toFixed(1) || '0'} unit="%" icon={<Activity className="w-4 h-4 text-cyan-400" />} />
                    </div>
                </div>
            )}
        </div>
    );
};

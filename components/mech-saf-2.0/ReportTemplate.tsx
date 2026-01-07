import React from 'react';
import { MechBlueprint, MechSimulationResult, MechDynamicSimulationResult } from '../../types';
import { MaterialRegistry } from '../../services/physics/MaterialRegistry';
import { BarChart3, Clock, Layout, Droplets } from 'lucide-react';

interface ReportTemplateProps {
    blueprint: MechBlueprint;
    result: MechSimulationResult;
}

export const ReportTemplate: React.FC<ReportTemplateProps> = ({ blueprint, result }) => {
    const isDynamic = result.isDynamic;
    const dynamicResult = result as MechDynamicSimulationResult;
    const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');

    const formatDate = (date: Date) => {
        return new Date(date).toLocaleString();
    };

    return (
        <div className="bg-white text-slate-900 p-8 max-w-[210mm] mx-auto min-h-[297mm] shadow-lg print:shadow-none print:max-w-none print:w-full print:p-0">
            {/* Header */}
            <div className="border-b-2 border-slate-800 pb-4 mb-8 flex justify-between items-end">
                <div>
                    <h1 className="text-3xl font-bold text-slate-800 uppercase tracking-tight">Simulation Report</h1>
                    <div className="text-slate-500 mt-1 font-medium">{blueprint.name}</div>
                </div>
                <div className="text-right text-sm text-slate-600">
                    <div>Generated: {formatDate(new Date())}</div>
                    <div>Author: {blueprint.author || 'User'}</div>
                    <div className="font-mono text-xs mt-1 text-slate-400">ID: {result.id.slice(0, 8)}</div>
                </div>
            </div>

            {/* Project Metrics */}
            <div className="grid grid-cols-2 gap-8 mb-8">
                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 print:border hover:border-slate-300 transition-colors">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">
                        <Layout className="w-4 h-4" />
                        System Overview
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-slate-500">Components</dt>
                        <dd className="font-mono font-bold">{blueprint.components.length}</dd>

                        <dt className="text-slate-500">Connections</dt>
                        <dd className="font-mono font-bold">{blueprint.connections.length}</dd>

                        <dt className="text-slate-500">Duration</dt>
                        <dd className="font-mono font-bold">{result.duration}ms</dd>

                        <dt className="text-slate-500">Status</dt>
                        <dd className={`font-bold uppercase text-xs px-2 py-0.5 rounded w-fit ${result.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                            {result.status}
                        </dd>
                    </dl>
                </div>

                <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 print:border">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-3 border-b border-slate-200 pb-2">
                        <Droplets className="w-4 h-4" />
                        Fluid Properties ({fluid?.name || 'Water'})
                    </h3>
                    <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                        <dt className="text-slate-500">Density</dt>
                        <dd className="font-mono">{fluid?.density} kg/m³</dd>

                        <dt className="text-slate-500">Viscosity</dt>
                        <dd className="font-mono">{fluid?.viscosity} Pa·s</dd>

                        <dt className="text-slate-500">Spec. Heat</dt>
                        <dd className="font-mono">{fluid?.specificHeat} kJ/kg·K</dd>
                    </dl>
                </div>
            </div>

            {/* Key Results */}
            <div className="mb-8">
                <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 text-lg">
                    <BarChart3 className="w-5 h-5" />
                    Key Performance Indicators
                </h3>
                <div className="grid grid-cols-4 gap-4">
                    <div className="border border-slate-200 rounded p-3 text-center print:border-slate-300">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Total Flow</div>
                        <div className="text-xl font-bold text-slate-900">{result.metrics.totalFlowRate.toFixed(2)} <span className="text-sm font-normal text-slate-500">m³/h</span></div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 text-center print:border-slate-300">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Power Input</div>
                        <div className="text-xl font-bold text-slate-900">{result.metrics.totalPowerInput.toFixed(2)} <span className="text-sm font-normal text-slate-500">kW</span></div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 text-center print:border-slate-300">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Efficiency</div>
                        <div className="text-xl font-bold text-slate-900">{result.metrics.overallEfficiency.toFixed(1)} <span className="text-sm font-normal text-slate-500">%</span></div>
                    </div>
                    <div className="border border-slate-200 rounded p-3 text-center print:border-slate-300">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">Max Pressure</div>
                        <div className="text-xl font-bold text-slate-900">{result.metrics.maxPressure.toFixed(2)} <span className="text-sm font-normal text-slate-500">bar</span></div>
                    </div>
                </div>
            </div>

            {/* Detailed Table */}
            <div className="mb-8">
                <h3 className="font-bold text-slate-700 mb-4 text-lg">Component Metrics</h3>
                <table className="w-full text-sm text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-100 border-b-2 border-slate-300 text-slate-600">
                            <th className="py-2 px-3 font-semibold">Component</th>
                            <th className="py-2 px-3 font-semibold">Key</th>
                            <th className="py-2 px-3 font-semibold text-right">Value</th>
                            <th className="py-2 px-3 font-semibold text-right">Unit</th>
                        </tr>
                    </thead>
                    <tbody>
                        {Object.entries(result.variables).map(([key, value], idx) => {
                            // Filter logic to show relevant data only (skip internal IDs if possible, but we don't store them here clearly)
                            // We only have flat variables map. Let's show first 15 or specific logic.
                            if (typeof value !== 'number') return null;
                            const [compName, varName] = key.split(/_(.+)/);

                            return (
                                <tr key={key} className="border-b border-slate-200 print:break-inside-avoid">
                                    <td className="py-2 px-3 font-medium text-slate-800 capitalize">{compName?.replace(/_/g, ' ')}</td>
                                    <td className="py-2 px-3 text-slate-500 capitalize">{varName?.replace(/_/g, ' ')}</td>
                                    <td className="py-2 px-3 font-mono text-right">{value.toFixed(4)}</td>
                                    <td className="py-2 px-3 text-slate-400 text-right">-</td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>

            {/* Dynamic Charts Snapshot */}
            {isDynamic && dynamicResult.timeSeries && (
                <div className="print:break-before-page">
                    <h3 className="flex items-center gap-2 font-bold text-slate-700 mb-4 text-lg mt-8">
                        <Clock className="w-5 h-5" />
                        Dynamic Response (Snapshot)
                    </h3>
                    <div className="grid grid-cols-1 gap-6">
                        {/* We can't render the interactive TimePlot here easily without heavy modification.
                             In a real app, we might render a static SVG.
                             For now, we'll list the range of variation. */}
                        <div className="bg-slate-50 p-4 border border-slate-200 rounded text-center text-slate-500 italic">
                            Detailed time-series charts are available in the interactive dashboard.
                        </div>
                    </div>
                </div>
            )}

            {/* Footer */}
            <div className="mt-12 pt-4 border-t border-slate-300 text-center text-xs text-slate-400">
                Generated by Eldoria Mechanical SAF Lab v2.0
            </div>
        </div>
    );
};

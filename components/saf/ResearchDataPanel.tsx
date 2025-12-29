import React, { useState, useMemo } from 'react';
import { DeepSAFBlueprint } from './types';
import { BarChart3, LineChart, TrendingUp, Download, Table, Filter, Search, FileSpreadsheet, FileText } from 'lucide-react';

interface ResearchDataPanelProps {
    blueprint: DeepSAFBlueprint;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClose: () => void;
}

type ViewMode = 'charts' | 'table' | 'analysis';

/**
 * Research Data Panel - Professional data visualization and analysis
 * Provides charts, tables, and export capabilities for research-grade work
 */
export const ResearchDataPanel: React.FC<ResearchDataPanelProps> = ({
    blueprint,
    isExpanded,
    onToggleExpand,
    onClose,
}) => {
    const [viewMode, setViewMode] = useState<ViewMode>('charts');
    const [selectedMetric, setSelectedMetric] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');

    const simulationData = blueprint.last_simulation?.system_vars || {};
    const sweepData = blueprint.sweeps || [];

    // Extract metrics from simulation
    const metrics = useMemo(() => {
        const keys = Object.keys(simulationData);
        return keys.map(key => ({
            name: key,
            value: simulationData[key],
            category: key.includes('.P') ? 'Pressure' : key.includes('.T') ? 'Temperature' : key.includes('.m') ? 'Mass Flow' : 'Other',
        }));
    }, [simulationData]);

    // Filter metrics based on search
    const filteredMetrics = useMemo(() => {
        if (!searchQuery) return metrics;
        const query = searchQuery.toLowerCase();
        return metrics.filter(m => 
            m.name.toLowerCase().includes(query) || 
            m.category.toLowerCase().includes(query)
        );
    }, [metrics, searchQuery]);

    // Prepare data for charts
    const chartData = useMemo(() => {
        if (sweepData.length === 0) return null;
        
        const sweep = sweepData[0]; // Use first sweep
        return sweep.points.map((point, idx) => ({
            x: point.value,
            y: Object.values(point.system_vars)[0] || 0,
            label: Object.keys(point.system_vars)[0] || '',
        }));
    }, [sweepData]);

    const handleExportCSV = () => {
        const headers = ['Variable', 'Value', 'Category'];
        const rows = metrics.map(m => [m.name, m.value.toString(), m.category]);
        const csv = [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
        
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blueprint.project_name}_data_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
        URL.revokeObjectURL(url);
    };

    const handleExportExcel = () => {
        // For Excel, we'd need a library like xlsx, but for now export as CSV
        handleExportCSV();
    };

    const handleExportLaTeX = () => {
        const latex = `\\begin{table}[h]
\\centering
\\caption{Simulation Results: ${blueprint.project_name}}
\\label{tab:sim_results}
\\begin{tabular}{|l|r|c|}
\\hline
\\textbf{Variable} & \\textbf{Value} & \\textbf{Category} \\\\
\\hline
${metrics.map(m => `${m.name.replace(/_/g, '\\_')} & ${m.value.toFixed(4)} & ${m.category}`).join(' \\\\\n')} \\\\
\\hline
\\end{tabular}
\\end{table}`;
        
        const blob = new Blob([latex], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${blueprint.project_name}_table.tex`;
        a.click();
        URL.revokeObjectURL(url);
    };

    if (!isExpanded) {
        return (
            <div className="fixed bottom-0 right-0 w-96 bg-gray-900 border-t border-l border-cyan-500/30 rounded-tl-2xl shadow-2xl z-50">
                <div className="p-3 flex items-center justify-between border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                        <BarChart3 className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Research Data</span>
                        {metrics.length > 0 && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-cyan-500/20 text-cyan-400 rounded">
                                {metrics.length} vars
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onToggleExpand}
                        className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
                    >
                        Expand
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 right-0 w-[800px] h-[600px] bg-gray-900 border-t border-l border-cyan-500/30 rounded-tl-2xl shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <BarChart3 className="w-5 h-5 text-cyan-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white">Research Data Analysis</h3>
                        <p className="text-[10px] text-gray-500">{blueprint.project_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                        title="Export to CSV"
                    >
                        <FileSpreadsheet className="w-3 h-3" />
                        CSV
                    </button>
                    <button
                        onClick={handleExportLaTeX}
                        className="px-3 py-1.5 text-xs bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                        title="Export LaTeX table"
                    >
                        <FileText className="w-3 h-3" />
                        LaTeX
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

            {/* Toolbar */}
            <div className="shrink-0 p-3 border-b border-cyan-500/10 bg-gray-900/30 flex items-center gap-3">
                <div className="flex items-center gap-2 flex-1">
                    <div className="relative flex-1 max-w-xs">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search variables..."
                            className="w-full pl-7 pr-3 py-1.5 bg-black/50 border border-cyan-900/30 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                        />
                    </div>
                </div>
                <div className="flex items-center gap-1 bg-gray-800/50 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('charts')}
                        className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            viewMode === 'charts' 
                                ? 'bg-cyan-500/20 text-cyan-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <LineChart className="w-3 h-3" />
                        Charts
                    </button>
                    <button
                        onClick={() => setViewMode('table')}
                        className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            viewMode === 'table' 
                                ? 'bg-cyan-500/20 text-cyan-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <Table className="w-3 h-3" />
                        Table
                    </button>
                    <button
                        onClick={() => setViewMode('analysis')}
                        className={`px-3 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
                            viewMode === 'analysis' 
                                ? 'bg-cyan-500/20 text-cyan-400' 
                                : 'text-gray-400 hover:text-white'
                        }`}
                    >
                        <TrendingUp className="w-3 h-3" />
                        Analysis
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4">
                {viewMode === 'charts' && (
                    <div className="space-y-6">
                        {chartData ? (
                            <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/10">
                                <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">Parameter Sweep</h4>
                                <div className="h-64 bg-gray-900/50 rounded p-4 flex items-center justify-center border border-cyan-500/5">
                                    <div className="text-center text-gray-500">
                                        <LineChart className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                        <p className="text-xs">Chart visualization</p>
                                        <p className="text-[10px] mt-1">({chartData.length} data points)</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-black/30 rounded-lg p-8 border border-cyan-500/10 text-center">
                                <LineChart className="w-12 h-12 mx-auto mb-3 text-gray-600" />
                                <p className="text-sm text-gray-400">No sweep data available</p>
                                <p className="text-xs text-gray-500 mt-1">Run a parameter sweep to generate charts</p>
                            </div>
                        )}

                        {/* Metric Distribution */}
                        <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/10">
                            <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">Variable Distribution</h4>
                            <div className="space-y-2">
                                {filteredMetrics.slice(0, 10).map((metric, idx) => {
                                    const maxVal = Math.max(...metrics.map(m => Math.abs(m.value)));
                                    const width = (Math.abs(metric.value) / maxVal) * 100;
                                    return (
                                        <div key={idx} className="space-y-1">
                                            <div className="flex items-center justify-between text-xs">
                                                <span className="text-gray-300 font-mono">{metric.name}</span>
                                                <span className="text-cyan-400 font-bold">{metric.value.toFixed(4)}</span>
                                            </div>
                                            <div className="h-2 bg-gray-800 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-cyan-500 to-cyan-400 transition-all"
                                                    style={{ width: `${Math.min(width, 100)}%` }}
                                                />
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                )}

                {viewMode === 'table' && (
                    <div className="bg-black/30 rounded-lg border border-cyan-500/10 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead className="bg-gray-800/50 border-b border-cyan-500/20">
                                    <tr>
                                        <th className="px-4 py-3 text-left text-cyan-400 font-bold uppercase tracking-wider">Variable</th>
                                        <th className="px-4 py-3 text-right text-cyan-400 font-bold uppercase tracking-wider">Value</th>
                                        <th className="px-4 py-3 text-center text-cyan-400 font-bold uppercase tracking-wider">Category</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-800/50">
                                    {filteredMetrics.map((metric, idx) => (
                                        <tr key={idx} className="hover:bg-gray-800/30 transition-colors">
                                            <td className="px-4 py-2 font-mono text-gray-300">{metric.name}</td>
                                            <td className="px-4 py-2 text-right font-bold text-cyan-400">{metric.value.toFixed(6)}</td>
                                            <td className="px-4 py-2 text-center">
                                                <span className="px-2 py-0.5 bg-purple-500/20 text-purple-400 rounded text-[10px]">
                                                    {metric.category}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        {filteredMetrics.length === 0 && (
                            <div className="p-8 text-center text-gray-500">
                                <p className="text-sm">No variables found</p>
                            </div>
                        )}
                    </div>
                )}

                {viewMode === 'analysis' && (
                    <div className="space-y-4">
                        <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/10">
                            <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">Statistical Summary</h4>
                            <div className="grid grid-cols-3 gap-4">
                                <div className="bg-gray-900/50 rounded p-3">
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Count</div>
                                    <div className="text-lg font-bold text-cyan-400">{metrics.length}</div>
                                </div>
                                <div className="bg-gray-900/50 rounded p-3">
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Mean</div>
                                    <div className="text-lg font-bold text-emerald-400">
                                        {(metrics.reduce((sum, m) => sum + m.value, 0) / metrics.length).toFixed(4)}
                                    </div>
                                </div>
                                <div className="bg-gray-900/50 rounded p-3">
                                    <div className="text-[10px] text-gray-500 uppercase mb-1">Range</div>
                                    <div className="text-lg font-bold text-purple-400">
                                        {(Math.max(...metrics.map(m => m.value)) - Math.min(...metrics.map(m => m.value))).toFixed(4)}
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="bg-black/30 rounded-lg p-4 border border-cyan-500/10">
                            <h4 className="text-xs font-bold text-cyan-400 mb-3 uppercase tracking-wider">Category Breakdown</h4>
                            <div className="space-y-2">
                                {['Pressure', 'Temperature', 'Mass Flow', 'Other'].map(cat => {
                                    const count = metrics.filter(m => m.category === cat).length;
                                    if (count === 0) return null;
                                    return (
                                        <div key={cat} className="flex items-center justify-between text-xs">
                                            <span className="text-gray-400">{cat}</span>
                                            <span className="text-cyan-400 font-bold">{count} variables</span>
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

export default ResearchDataPanel;


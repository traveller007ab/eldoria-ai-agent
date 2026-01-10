import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Terminal, Activity, X, Trash2, ChevronUp, ChevronDown, Filter, AlertTriangle, CheckCircle, XCircle, Lightbulb, Wrench, ArrowRight, Info, RefreshCw } from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { GenesisDebugService } from '../../services/debug/GenesisDebugService';
import { DebugOutputFormatter } from '../../services/debug/DebugOutputFormatter';
import type { GenesisIssue, FailureSeverity, DiagnosticResult } from '../../services/debug/DiagnosticTypes';

export const BottomPanel: React.FC = () => {
    const { logs, clearLogs, isBottomPanelOpen, toggleBottomPanel, isSimulating, lastSimulationResult, currentBlueprint } = useMechStore();
    const [activeTab, setActiveTab] = useState<'console' | 'debug'>('debug');
    const [filterType, setFilterType] = useState<'all' | 'info' | 'error' | 'warning' | 'success'>('all');
    const scrollRef = useRef<HTMLDivElement>(null);
    const [showFilterMenu, setShowFilterMenu] = useState(false);
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());

    // Auto-scroll to bottom
    useEffect(() => {
        if (scrollRef.current) {
            scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
    }, [logs, activeTab, isBottomPanelOpen, filterType]);

    const filteredLogs = logs.filter(log => filterType === 'all' || log.type === filterType);

    // Run diagnostic analysis when simulation completes
    const diagnosticResult: DiagnosticResult | null = useMemo(() => {
        if (!isSimulating && lastSimulationResult && currentBlueprint) {
            try {
                return GenesisDebugService.analyze(currentBlueprint, lastSimulationResult);
            } catch (error) {
                console.error('Debug analysis failed:', error);
                return null;
            }
        }
        return null;
    }, [isSimulating, lastSimulationResult, currentBlueprint]);

    // Get compact debug output
    const debugOutput = useMemo(() => {
        if (!diagnosticResult) return null;
        return DebugOutputFormatter.format(
            diagnosticResult.issues,
            diagnosticResult.failureBreakdown,
            { format: 'text', verbose: false }
        );
    }, [diagnosticResult]);

    const toggleIssueExpanded = (issueId: string) => {
        const newExpanded = new Set(expandedIssues);
        if (newExpanded.has(issueId)) {
            newExpanded.delete(issueId);
        } else {
            newExpanded.add(issueId);
        }
        setExpandedIssues(newExpanded);
    };

    const getSeverityIcon = (severity: FailureSeverity) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-4 h-4 text-red-400" />;
            case 'major': return <AlertTriangle className="w-4 h-4 text-orange-400" />;
            case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-400" />;
            case 'minor': return <Info className="w-4 h-4 text-blue-400" />;
            case 'info': return <Info className="w-4 h-4 text-slate-400" />;
        }
    };

    const getSeverityBg = (severity: FailureSeverity) => {
        switch (severity) {
            case 'critical': return 'bg-red-950/30 border-red-800/50';
            case 'major': return 'bg-orange-950/30 border-orange-800/50';
            case 'warning': return 'bg-amber-950/30 border-amber-800/50';
            case 'minor': return 'bg-blue-950/30 border-blue-800/50';
            case 'info': return 'bg-slate-900/30 border-slate-800/50';
        }
    };

    if (!isBottomPanelOpen) {
        return (
            <div className="h-8 bg-slate-900 border-t border-slate-700 flex items-center px-4 justify-between shrink-0">
                <div className="flex items-center gap-4">
                    <button 
                        onClick={toggleBottomPanel}
                        className="flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-white transition-colors"
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        Console
                        {diagnosticResult && diagnosticResult.issues.length > 0 && (
                            <span className={`px-1.5 rounded-full text-[10px] font-bold ${
                                diagnosticResult.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                diagnosticResult.status === 'partial' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-amber-500/20 text-amber-400'
                            }`}>
                                {diagnosticResult.issues.length}
                            </span>
                        )}
                    </button>
                </div>
                <button onClick={toggleBottomPanel} className="text-slate-500 hover:text-white">
                    <ChevronUp className="w-4 h-4" />
                </button>
            </div>
        );
    }

    return (
        <div className="h-64 bg-slate-900 border-t border-slate-700 flex flex-col shrink-0 transition-all duration-300">
            {/* Header */}
            <div className="h-9 flex items-center justify-between px-4 bg-slate-800/50 border-b border-slate-700">
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => setActiveTab('console')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors flex items-center gap-2 ${
                            activeTab === 'console' 
                                ? 'text-blue-400 bg-slate-800 border-t border-x border-slate-700 -mb-px' 
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Terminal className="w-3.5 h-3.5" />
                        Console
                        <span className="bg-slate-700 text-slate-300 px-1.5 rounded-full text-[10px]">{logs.length}</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('debug')}
                        className={`px-3 py-1.5 text-xs font-medium rounded-t-md transition-colors flex items-center gap-2 ${
                            activeTab === 'debug' 
                                ? 'text-purple-400 bg-slate-800 border-t border-x border-slate-700 -mb-px' 
                                : 'text-slate-500 hover:text-slate-300'
                        }`}
                    >
                        <Activity className="w-3.5 h-3.5" />
                        Genesis Debug
                        {diagnosticResult && diagnosticResult.issues.length > 0 && (
                            <span className={`px-1.5 rounded-full text-[10px] font-bold ${
                                diagnosticResult.status === 'failed' ? 'bg-red-500/20 text-red-400' :
                                diagnosticResult.status === 'partial' ? 'bg-orange-500/20 text-orange-400' :
                                'bg-amber-500/20 text-amber-400'
                            }`}>
                                {diagnosticResult.issues.length}
                            </span>
                        )}
                    </button>
                </div>
                
                <div className="flex items-center gap-2">
                    {activeTab === 'console' && (
                        <div className="relative">
                            <button 
                                onClick={() => setShowFilterMenu(!showFilterMenu)}
                                className={`p-1 hover:bg-slate-700 rounded transition-colors flex items-center gap-1 ${filterType !== 'all' ? 'text-blue-400' : 'text-slate-500'}`}
                                title="Filter Logs"
                            >
                                <Filter className="w-3.5 h-3.5" />
                                {filterType !== 'all' && <span className="text-[10px] uppercase font-bold">{filterType}</span>}
                            </button>
                            
                            {showFilterMenu && (
                                <div className="absolute right-0 top-full mt-1 w-32 bg-slate-800 border border-slate-700 rounded shadow-xl z-50 flex flex-col py-1">
                                    {(['all', 'info', 'success', 'warning', 'error'] as const).map(type => (
                                        <button
                                            key={type}
                                            onClick={() => { setFilterType(type); setShowFilterMenu(false); }}
                                            className={`px-3 py-1.5 text-left text-xs hover:bg-slate-700 capitalize flex items-center justify-between ${filterType === type ? 'text-blue-400 bg-slate-700/50' : 'text-slate-300'}`}
                                        >
                                            {type}
                                            {filterType === type && <div className="w-1.5 h-1.5 rounded-full bg-blue-400" />}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                    <button onClick={clearLogs} className="p-1 text-slate-500 hover:text-red-400" title="Clear Console">
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                    <div className="w-px h-4 bg-slate-700 mx-1" />
                    <button onClick={toggleBottomPanel} className="p-1 text-slate-500 hover:text-white">
                        <ChevronDown className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto" ref={scrollRef}>
                {activeTab === 'console' && (
                    <div className="p-2 space-y-1 font-mono text-xs">
                        {filteredLogs.length === 0 && (
                            <div className="text-slate-600 italic px-2">
                                {logs.length === 0 ? "No logs to display. Run a simulation to see output." : `No ${filterType} logs found.`}
                            </div>
                        )}
                        {filteredLogs.map((log, i) => (
                            <div key={i} className="flex gap-2 hover:bg-slate-800/50 rounded px-2 py-0.5">
                                <span className="text-slate-600 shrink-0 select-none">
                                    {log.timestamp.toLocaleTimeString()}
                                </span>
                                <span className={`
                                    ${log.type === 'error' ? 'text-red-400' : ''}
                                    ${log.type === 'warning' ? 'text-yellow-400' : ''}
                                    ${log.type === 'success' ? 'text-emerald-400' : ''}
                                    ${log.type === 'info' ? 'text-slate-300' : ''}
                                `}>
                                    {log.message}
                                </span>
                            </div>
                        ))}
                    </div>
                )}
                
                {activeTab === 'debug' && (
                    <div className="p-3">
                        {isSimulating ? (
                            <div className="flex items-center gap-3 text-cyan-400">
                                <RefreshCw className="w-4 h-4 animate-spin" />
                                <span className="font-mono text-sm">Running simulation analysis...</span>
                            </div>
                        ) : diagnosticResult ? (
                            <div className="space-y-3">
                                {/* Status Header */}
                                <div className={`flex items-center gap-2 px-3 py-2 rounded-lg border ${
                                    diagnosticResult.status === 'failed' ? 'bg-red-950/30 border-red-800/50' :
                                    diagnosticResult.status === 'partial' ? 'bg-orange-950/30 border-orange-800/50' :
                                    diagnosticResult.status === 'degraded' ? 'bg-amber-950/30 border-amber-800/50' :
                                    'bg-emerald-950/30 border-emerald-800/50'
                                }`}>
                                    {diagnosticResult.status === 'failed' ? (
                                        <XCircle className="w-5 h-5 text-red-400" />
                                    ) : diagnosticResult.status === 'healthy' ? (
                                        <CheckCircle className="w-5 h-5 text-emerald-400" />
                                    ) : (
                                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                                    )}
                                    <div>
                                        <span className={`font-semibold ${
                                            diagnosticResult.status === 'failed' ? 'text-red-400' :
                                            diagnosticResult.status === 'partial' ? 'text-orange-400' :
                                            diagnosticResult.status === 'degraded' ? 'text-amber-400' :
                                            'text-emerald-400'
                                        }`}>
                                            {diagnosticResult.status.toUpperCase()}
                                        </span>
                                        <span className="text-slate-400 text-sm ml-2">
                                            Health: {diagnosticResult.healthScore}% | 
                                            Risk: {diagnosticResult.failureRiskScore.toFixed(0)}%
                                        </span>
                                    </div>
                                </div>

                                {/* Issues Summary */}
                                {diagnosticResult.issues.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            <AlertTriangle className="w-4 h-4" />
                                            Detected Issues ({diagnosticResult.issues.length})
                                        </div>
                                        
                                        {diagnosticResult.issues.slice(0, 5).map((issue) => (
                                            <div 
                                                key={issue.id}
                                                className={`rounded-lg border ${getSeverityBg(issue.severity)} overflow-hidden`}
                                            >
                                                <div 
                                                    className="flex items-start gap-2 p-2 cursor-pointer"
                                                    onClick={() => toggleIssueExpanded(issue.id)}
                                                >
                                                    {getSeverityIcon(issue.severity)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <span className="text-xs font-mono text-slate-500">{issue.issueCode}</span>
                                                            <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                                                issue.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                                                                issue.severity === 'major' ? 'bg-orange-500/20 text-orange-300' :
                                                                'bg-amber-500/20 text-amber-300'
                                                            }`}>
                                                                {issue.severity.toUpperCase()}
                                                            </span>
                                                        </div>
                                                        <p className="text-xs text-slate-300">{issue.message}</p>
                                                        {issue.componentId && (
                                                            <span className="text-[10px] text-cyan-400">
                                                                {issue.componentName || issue.componentId}
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                
                                                {expandedIssues.has(issue.id) && issue.suggestedFixes && (
                                                    <div className="px-2 pb-2 pl-8 space-y-1">
                                                        {issue.rootCause && (
                                                            <div className="flex items-start gap-1 text-[10px] text-amber-400">
                                                                <Lightbulb className="w-3 h-3 shrink-0 mt-0.5" />
                                                                <span>Root cause: {issue.rootCause}</span>
                                                            </div>
                                                        )}
                                                        <div className="flex items-start gap-1 text-[10px] text-cyan-400">
                                                            <Wrench className="w-3 h-3 shrink-0 mt-0.5" />
                                                            <span>Suggested fixes:</span>
                                                        </div>
                                                        {issue.suggestedFixes.slice(0, 3).map((fix, idx) => (
                                                            <div key={idx} className="flex items-start gap-1 text-[10px] text-slate-400 pl-4">
                                                                <ArrowRight className="w-2 h-2 shrink-0 mt-1" />
                                                                {fix}
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                        
                                        {diagnosticResult.issues.length > 5 && (
                                            <div className="text-center text-xs text-slate-500">
                                                +{diagnosticResult.issues.length - 5} more issues
                                            </div>
                                        )}
                                    </div>
                                )}

                                {/* Root Cause Section */}
                                {diagnosticResult.failureBreakdown?.rootCauseChain && diagnosticResult.failureBreakdown.rootCauseChain.length > 0 && (
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                                            <Lightbulb className="w-4 h-4" />
                                            Root Cause Analysis
                                        </div>
                                        {diagnosticResult.failureBreakdown.rootCauseChain.slice(0, 3).map((node, idx) => (
                                            <div key={idx} className="bg-slate-800/50 rounded-lg p-2 border border-slate-700">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <span className="text-xs font-bold text-amber-400">Level {node.level}</span>
                                                </div>
                                                <p className="text-xs text-slate-300">{node.cause}</p>
                                                {node.affectedComponents.length > 0 && (
                                                    <p className="text-[10px] text-slate-500 mt-1">
                                                        Affects: {node.affectedComponents.join(', ')}
                                                    </p>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Quick Stats */}
                                <div className="grid grid-cols-4 gap-2 mt-2">
                                    <div className="bg-slate-800/50 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-red-400">
                                            {diagnosticResult.issues.filter(i => i.severity === 'critical').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500">Critical</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-orange-400">
                                            {diagnosticResult.issues.filter(i => i.severity === 'major').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500">Major</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-amber-400">
                                            {diagnosticResult.issues.filter(i => i.severity === 'warning').length}
                                        </div>
                                        <div className="text-[10px] text-slate-500">Warning</div>
                                    </div>
                                    <div className="bg-slate-800/50 rounded p-2 text-center">
                                        <div className="text-lg font-bold text-emerald-400">
                                            {diagnosticResult.healthScore}%
                                        </div>
                                        <div className="text-[10px] text-slate-500">Health</div>
                                    </div>
                                </div>

                                {/* Simulation Details */}
                                {lastSimulationResult && (
                                    <div className="grid grid-cols-3 gap-2 text-xs text-slate-400 mt-2">
                                        <div className="flex justify-between">
                                            <span>Duration:</span>
                                            <span className="text-slate-300">{lastSimulationResult.duration}ms</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Iterations:</span>
                                            <span className="text-slate-300">{lastSimulationResult.diagnostics?.convergence?.iterations ?? 0}</span>
                                        </div>
                                        <div className="flex justify-between">
                                            <span>Residual:</span>
                                            <span className="text-slate-300">{lastSimulationResult.diagnostics?.convergence?.residual?.toExponential(2) ?? 'N/A'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full text-slate-500">
                                <div className="text-center">
                                    <Activity className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">Run a simulation to see debug analysis</p>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

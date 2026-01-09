import React from 'react';
import { useMechStore } from '../../stores/useMechStore';
import { AlertTriangle, AlertCircle, CheckCircle2 } from 'lucide-react';

export const DiagnosticsPanel: React.FC = () => {
    const { lastSimulationResult } = useMechStore();

    if (!lastSimulationResult) {
        return (
            <div className="p-4 text-center text-slate-500 italic text-sm">
                Run a simulation to see diagnostics.
            </div>
        );
    }

    const { diagnostics, issues = [] } = lastSimulationResult;
    // Fallback to empty array if issues is undefined

    return (
        <div className="flex flex-col h-full bg-slate-900">
            <div className="p-3 border-b border-slate-700 bg-slate-800/50 flex items-center justify-between">
                <h3 className="font-semibold text-slate-200 text-sm">System Health</h3>
                <div className="flex items-center gap-2">
                    {diagnostics.convergence.converged ? (
                        <span className="flex items-center gap-1 text-[10px] bg-emerald-900/30 text-emerald-400 px-2 py-0.5 rounded-full border border-emerald-500/30">
                            <CheckCircle2 className="w-3 h-3" /> Converged
                        </span>
                    ) : (
                        <span className="flex items-center gap-1 text-[10px] bg-red-900/30 text-red-400 px-2 py-0.5 rounded-full border border-red-500/30">
                            <AlertCircle className="w-3 h-3" /> Diverged
                        </span>
                    )}
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                {issues.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-32 text-slate-500 gap-2 border border-slate-800 rounded-lg border-dashed">
                        <CheckCircle2 className="w-8 h-8 text-emerald-500/50" />
                        <span className="text-sm">No issues detected</span>
                    </div>
                ) : (
                    issues.map((issue, idx) => (
                        <div key={idx} className={`
                            p-3 rounded-lg border text-sm
                            ${issue.severity === 'critical'
                                ? 'bg-red-900/10 border-red-500/30 text-red-200'
                                : 'bg-yellow-900/10 border-yellow-500/30 text-yellow-200'}
                        `}>
                            <div className="flex items-start gap-2">
                                <div className="mt-0.5 shrink-0">
                                    {issue.severity === 'critical'
                                        ? <AlertCircle className="w-4 h-4 text-red-500" />
                                        : <AlertTriangle className="w-4 h-4 text-yellow-500" />
                                    }
                                </div>
                                <div className="space-y-1">
                                    <div className="font-medium leading-none">{issue.severity === 'critical' ? 'Critical Error' : 'Warning'}</div>
                                    <div className="opacity-90">{issue.message}</div>
                                    {issue.componentId && (
                                        <div className="text-[10px] opacity-50 font-mono mt-1">Component ID: {issue.componentId.split('-')[0]}...</div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

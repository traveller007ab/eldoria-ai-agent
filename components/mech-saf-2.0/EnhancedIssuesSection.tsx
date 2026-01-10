import React, { useState, useMemo } from 'react';
import { 
    AlertTriangle, AlertCircle, CheckCircle, Info, ChevronDown, 
    ChevronRight, Lightbulb, Wrench, Search, Filter, ArrowRight,
    XCircle, Activity, Zap, Thermometer, Droplets, Settings
} from 'lucide-react';
import type { GenesisIssue, FailureBreakdown, FailureSeverity } from '../../services/debug/DiagnosticTypes';
import { DebugOutputFormatter } from '../../services/debug/DebugOutputFormatter';

interface EnhancedIssuesSectionProps {
    issues: GenesisIssue[];
    breakdown: FailureBreakdown | null;
    onFixIssue?: (issueId: string) => void;
    onExportReport?: (format: 'text' | 'json' | 'html') => void;
}

export const EnhancedIssuesSection: React.FC<EnhancedIssuesSectionProps> = ({
    issues,
    breakdown,
    onFixIssue,
    onExportReport
}) => {
    const [expandedIssues, setExpandedIssues] = useState<Set<string>>(new Set());
    const [filterSeverity, setFilterSeverity] = useState<FailureSeverity | 'all'>('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [viewMode, setViewMode] = useState<'grouped' | 'list'>('grouped');

    const filteredIssues = useMemo(() => {
        return issues.filter(issue => {
            const matchesSeverity = filterSeverity === 'all' || issue.severity === filterSeverity;
            const matchesSearch = !searchQuery || 
                issue.message.toLowerCase().includes(searchQuery.toLowerCase()) ||
                issue.componentId?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                issue.issueCode.toLowerCase().includes(searchQuery.toLowerCase());
            return matchesSeverity && matchesSearch;
        });
    }, [issues, filterSeverity, searchQuery]);

    const groupedIssues = useMemo(() => {
        const groups: Record<FailureSeverity, GenesisIssue[]> = {
            critical: [],
            major: [],
            warning: [],
            minor: [],
            info: []
        };
        
        filteredIssues.forEach(issue => {
            groups[issue.severity].push(issue);
        });
        
        return groups;
    }, [filteredIssues]);

    const totalCount = filteredIssues.length;
    const criticalCount = groupedIssues.critical.length;
    const majorCount = groupedIssues.major.length;
    const warningCount = groupedIssues.warning.length;

    const getSeverityIcon = (severity: FailureSeverity) => {
        switch (severity) {
            case 'critical': return <XCircle className="w-5 h-5 text-red-400" />;
            case 'major': return <AlertTriangle className="w-5 h-5 text-orange-400" />;
            case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            case 'minor': return <Info className="w-5 h-5 text-blue-400" />;
            case 'info': return <Info className="w-5 h-5 text-gray-400" />;
        }
    };

    const getSeverityBg = (severity: FailureSeverity) => {
        switch (severity) {
            case 'critical': return 'bg-red-950/30 border-red-800/50';
            case 'major': return 'bg-orange-950/30 border-orange-800/50';
            case 'warning': return 'bg-amber-950/30 border-amber-800/50';
            case 'minor': return 'bg-blue-950/30 border-blue-800/50';
            case 'info': return 'bg-gray-900/30 border-gray-800/50';
        }
    };

    const getCategoryIcon = (category: string) => {
        const icons: Record<string, React.ReactNode> = {
            convergence: <Activity className="w-4 h-4" />,
            constraint: <Settings className="w-4 h-4" />,
            compatibility: <Zap className="w-4 h-4" />,
            performance: <Activity className="w-4 h-4" />,
            stability: <Droplets className="w-4 h-4" />,
            numerical: <Info className="w-4 h-4" />,
            topology: <Settings className="w-4 h-4" />,
            configuration: <Settings className="w-4 h-4" />,
            physical_limit: <Thermometer className="w-4 h-4" />
        };
        return icons[category] || <Info className="w-4 h-4" />;
    };

    const toggleExpanded = (issueId: string) => {
        const newExpanded = new Set(expandedIssues);
        if (newExpanded.has(issueId)) {
            newExpanded.delete(issueId);
        } else {
            newExpanded.add(issueId);
        }
        setExpandedIssues(newExpanded);
    };

    const exportReport = (format: 'text' | 'json' | 'html') => {
        const output = DebugOutputFormatter.format(issues, breakdown, { format });
        const blob = new Blob([output.formattedOutput], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `genesis-debug-report.${format}`;
        a.click();
        URL.revokeObjectURL(url);
        onExportReport?.(format);
    };

    if (issues.length === 0) {
        return (
            <div className="bg-slate-900/50 border border-slate-800 rounded-lg p-6 text-center">
                <CheckCircle className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-emerald-400">All Systems Operational</h3>
                <p className="text-slate-400">No issues detected in the simulation.</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {/* Header Stats */}
            <div className="flex items-center justify-between bg-slate-800/50 rounded-lg p-4">
                <div className="flex items-center gap-6">
                    <div className="flex items-center gap-2">
                        <XCircle className="w-5 h-5 text-red-400" />
                        <span className="text-red-400 font-semibold">{criticalCount}</span>
                        <span className="text-slate-400 text-sm">Critical</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-orange-400" />
                        <span className="text-orange-400 font-semibold">{majorCount}</span>
                        <span className="text-slate-400 text-sm">Major</span>
                    </div>
                    <div className="flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-amber-400" />
                        <span className="text-amber-400 font-semibold">{warningCount}</span>
                        <span className="text-slate-400 text-sm">Warnings</span>
                    </div>
                </div>
                
                <div className="flex items-center gap-2">
                    {onExportReport && (
                        <div className="flex gap-1">
                            <button 
                                onClick={() => exportReport('text')}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                            >
                                Export Text
                            </button>
                            <button 
                                onClick={() => exportReport('json')}
                                className="px-3 py-1 bg-slate-700 hover:bg-slate-600 rounded text-xs text-slate-300"
                            >
                                Export JSON
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-md">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Search issues..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-sm text-white placeholder-slate-500 focus:border-cyan-500 focus:outline-none"
                    />
                </div>
                
                <div className="flex items-center gap-2">
                    <Filter className="w-4 h-4 text-slate-500" />
                    <select
                        value={filterSeverity}
                        onChange={(e) => setFilterSeverity(e.target.value as FailureSeverity | 'all')}
                        className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-white focus:border-cyan-500 focus:outline-none"
                    >
                        <option value="all">All Severities</option>
                        <option value="critical">Critical Only</option>
                        <option value="major">Major & Critical</option>
                        <option value="warning">Warnings+</option>
                    </select>
                </div>
                
                <div className="flex items-center gap-1 bg-slate-800 rounded-lg p-1">
                    <button
                        onClick={() => setViewMode('grouped')}
                        className={`px-3 py-1 rounded text-xs transition-colors ${viewMode === 'grouped' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        Grouped
                    </button>
                    <button
                        onClick={() => setViewMode('list')}
                        className={`px-3 py-1 rounded text-xs transition-colors ${viewMode === 'list' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'}`}
                    >
                        List
                    </button>
                </div>
            </div>

            {/* System Degradation Info */}
            {breakdown && (
                <div className="bg-slate-800/50 rounded-lg p-4 border border-slate-700">
                    <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-semibold text-slate-300">System Health</h4>
                        <span className={`text-sm font-semibold ${
                            breakdown.systemDegradationPercent < 25 ? 'text-emerald-400' :
                            breakdown.systemDegradationPercent < 50 ? 'text-amber-400' :
                            'text-red-400'
                        }`}>
                            {(100 - breakdown.systemDegradationPercent).toFixed(0)}% Healthy
                        </span>
                    </div>
                    <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
                        <div 
                            className={`h-full transition-all ${
                                breakdown.systemDegradationPercent < 25 ? 'bg-emerald-500' :
                                breakdown.systemDegradationPercent < 50 ? 'bg-amber-500' :
                                'bg-red-500'
                            }`}
                            style={{ width: `${100 - breakdown.systemDegradationPercent}%` }}
                        />
                    </div>
                    <div className="flex items-center justify-between mt-2 text-xs text-slate-500">
                        <span>{breakdown.componentsAffected}/{breakdown.totalComponents} components affected</span>
                        <span>
                            {breakdown.isCompleteFailure ? 'Complete Failure' : 
                             breakdown.isPartialFailure ? 'Partial Failure' : 'Degraded'}
                        </span>
                    </div>
                </div>
            )}

            {/* Issues List */}
            <div className="space-y-3">
                {viewMode === 'grouped' ? (
                    Object.entries(groupedIssues).map(([severity, severityIssues]) => (
                        severityIssues.length > 0 && (
                            <div key={severity} className="space-y-2">
                                <h4 className={`text-sm font-semibold uppercase ${
                                    severity === 'critical' ? 'text-red-400' :
                                    severity === 'major' ? 'text-orange-400' :
                                    severity === 'warning' ? 'text-amber-400' :
                                    'text-slate-400'
                                }`}>
                                    {severity} ({severityIssues.length})
                                </h4>
                                {severityIssues.map(issue => (
                                    <IssueCard 
                                        key={issue.id}
                                        issue={issue}
                                        isExpanded={expandedIssues.has(issue.id)}
                                        onToggle={() => toggleExpanded(issue.id)}
                                        onFix={onFixIssue}
                                        getSeverityBg={getSeverityBg}
                                        getCategoryIcon={getCategoryIcon}
                                    />
                                ))}
                            </div>
                        )
                    ))
                ) : (
                    filteredIssues.map(issue => (
                        <IssueCard 
                            key={issue.id}
                            issue={issue}
                            isExpanded={expandedIssues.has(issue.id)}
                            onToggle={() => toggleExpanded(issue.id)}
                            onFix={onFixIssue}
                            getSeverityBg={getSeverityBg}
                            getCategoryIcon={getCategoryIcon}
                        />
                    ))
                )}
            </div>
        </div>
    );
};

// Issue Card Component
interface IssueCardProps {
    issue: GenesisIssue;
    isExpanded: boolean;
    onToggle: () => void;
    onFix?: (issueId: string) => void;
    getSeverityBg: (severity: FailureSeverity) => string;
    getCategoryIcon: (category: string) => React.ReactNode;
}

const IssueCard: React.FC<IssueCardProps> = ({
    issue,
    isExpanded,
    onToggle,
    onFix,
    getSeverityBg,
    getCategoryIcon
}) => {
    return (
        <div className={`rounded-lg border ${getSeverityBg(issue.severity)} overflow-hidden transition-all`}>
            <div 
                className="flex items-start gap-3 p-3 cursor-pointer"
                onClick={onToggle}
            >
                <div className="shrink-0 mt-0.5">
                    {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : 
                                     <ChevronRight className="w-4 h-4 text-slate-400" />}
                </div>
                
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-mono text-slate-500">{issue.issueCode}</span>
                        <span className={`px-2 py-0.5 rounded text-xs ${
                            issue.severity === 'critical' ? 'bg-red-500/20 text-red-300' :
                            issue.severity === 'major' ? 'bg-orange-500/20 text-orange-300' :
                            'bg-amber-500/20 text-amber-300'
                        }`}>
                            {issue.severity.toUpperCase()}
                        </span>
                        {issue.confidence && (
                            <span className="text-xs text-slate-500">{issue.confidence} confidence</span>
                        )}
                    </div>
                    
                    <p className="text-sm text-slate-200">{issue.message}</p>
                    
                    {issue.componentId && (
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-500">Component:</span>
                            <span className="text-xs text-cyan-400">{issue.componentName || issue.componentId}</span>
                        </div>
                    )}
                    
                    {issue.observedValue !== undefined && (
                        <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-slate-500">Value:</span>
                            <span className="text-xs font-mono text-slate-300">
                                {issue.observedValue.toFixed(2)}{issue.unit ? ` ${issue.unit}` : ''}
                            </span>
                            {issue.threshold && (
                                <>
                                    <span className="text-xs text-slate-500">Threshold:</span>
                                    <span className="text-xs font-mono text-slate-400">
                                        {issue.threshold.toFixed(2)}{issue.unit ? ` ${issue.unit}` : ''}
                                    </span>
                                </>
                            )}
                        </div>
                    )}
                </div>
                
                <div className="shrink-0 flex items-center gap-2">
                    {getCategoryIcon(issue.category)}
                    {onFix && (
                        <button
                            onClick={(e) => { e.stopPropagation(); onFix(issue.id); }}
                            className="p-1.5 rounded hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
                            title="Apply fix"
                        >
                            <Wrench className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
            
            {isExpanded && (
                <div className="px-3 pb-3 pl-12 space-y-3">
                    {issue.rootCause && (
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="flex items-center gap-2 mb-1">
                                <Lightbulb className="w-4 h-4 text-amber-400" />
                                <span className="text-xs font-semibold text-amber-400">Root Cause</span>
                            </div>
                            <p className="text-xs text-slate-300">{issue.rootCause}</p>
                        </div>
                    )}
                    
                    {issue.contributingFactors && issue.contributingFactors.length > 0 && (
                        <div className="bg-slate-900/50 rounded p-2">
                            <span className="text-xs font-semibold text-slate-400">Contributing Factors:</span>
                            <ul className="mt-1 space-y-1">
                                {issue.contributingFactors.map((factor, idx) => (
                                    <li key={idx} className="text-xs text-slate-400 flex items-center gap-1">
                                        <span className="w-1 h-1 rounded-full bg-slate-500" />
                                        {factor}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {issue.suggestedFixes && issue.suggestedFixes.length > 0 && (
                        <div className="bg-slate-900/50 rounded p-2">
                            <div className="flex items-center gap-2 mb-2">
                                <Wrench className="w-4 h-4 text-cyan-400" />
                                <span className="text-xs font-semibold text-cyan-400">Suggested Fixes</span>
                            </div>
                            <ul className="space-y-1">
                                {issue.suggestedFixes.map((fix, idx) => (
                                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                                        <ArrowRight className="w-3 h-3 shrink-0 mt-0.5 text-slate-500" />
                                        {fix}
                                    </li>
                                ))}
                            </ul>
                        </div>
                    )}
                    
                    {issue.detailedExplanation && (
                        <div className="bg-slate-900/50 rounded p-2">
                            <span className="text-xs font-semibold text-slate-400">Details:</span>
                            <p className="text-xs text-slate-400 mt-1">{issue.detailedExplanation}</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

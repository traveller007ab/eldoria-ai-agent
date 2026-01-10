/**
 * Debug Output Formatter
 * Generates actionable, human-readable debug output for simulation failures
 */

import type { 
    GenesisIssue, 
    FailureBreakdown, 
    DebugOutput,
    RootCauseNode,
    FailureSeverity,
    ImpactScope,
    ConfidenceLevel
} from './DiagnosticTypes';
import { 
    getSeverityOrder, 
    getCategoryIcon, 
    getSeverityColor,
    getImpactLabel,
    getConfidenceLabel,
    calculateHealthScore
} from './DiagnosticTypes';

export class DebugOutputFormatter {

    /**
     * Generate comprehensive debug output from issues and breakdown
     */
    static format(
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null,
        options: {
            format?: 'text' | 'json' | 'html';
            includeDebugData?: boolean;
            verbose?: boolean;
        } = {}
    ): DebugOutput {
        const { format = 'text', includeDebugData = false, verbose = false } = options;
        
        const healthScore = calculateHealthScore(issues);
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const majorCount = issues.filter(i => i.severity === 'major').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        
        // Determine overall status
        let status: 'PASS' | 'FAIL' | 'WARNING';
        let exitCode: number;
        
        if (criticalCount > 0) {
            status = 'FAIL';
            exitCode = 1;
        } else if (majorCount > 0 || warningCount > 0) {
            status = 'WARNING';
            exitCode = 2;
        } else {
            status = 'PASS';
            exitCode = 0;
        }
        
        // Generate summary
        const summary = this.generateSummary(issues, breakdown, healthScore, status);
        
        // Generate sections
        const failureSummary = this.generateFailureSummary(issues);
        const severityBreakdown = this.generateSeverityBreakdown(issues);
        const componentImpact = this.generateComponentImpact(issues, breakdown);
        const rootCauseAnalysis = this.generateRootCauseAnalysis(breakdown);
        const recommendedActions = this.generateRecommendedActions(issues, breakdown);
        
        // Format based on output type
        let formattedOutput: string;
        switch (format) {
            case 'json':
                formattedOutput = JSON.stringify({
                    status,
                    exitCode,
                    summary,
                    issues,
                    breakdown,
                    healthScore,
                    counts: { critical: criticalCount, major: majorCount, warning: warningCount }
                }, null, 2);
                break;
                
            case 'html':
                formattedOutput = this.generateHTMLOutput(
                    summary, failureSummary, severityBreakdown, componentImpact,
                    rootCauseAnalysis, recommendedActions, issues, breakdown
                );
                break;
                
            default:
                formattedOutput = this.generateTextOutput(
                    summary, failureSummary, severityBreakdown, componentImpact,
                    rootCauseAnalysis, recommendedActions, issues, breakdown, verbose
                );
        }
        
        return {
            summary,
            status,
            exitCode,
            failureSummary,
            severityBreakdown,
            componentImpact,
            rootCauseAnalysis,
            recommendedActions,
            issues,
            breakdown,
            formattedOutput,
            exportFormat: format
        };
    }

    /**
     * Generate summary line
     */
    private static generateSummary(
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null,
        healthScore: number,
        status: 'PASS' | 'FAIL' | 'WARNING'
    ): string {
        const criticalCount = issues.filter(i => i.severity === 'critical').length;
        const majorCount = issues.filter(i => i.severity === 'major').length;
        const warningCount = issues.filter(i => i.severity === 'warning').length;
        
        let statusEmoji = '✅';
        if (status === 'FAIL') statusEmoji = '❌';
        if (status === 'WARNING') statusEmoji = '⚠️';
        
        let summary = `${statusEmoji} Simulation ${status} - `;
        
        if (status === 'PASS') {
            summary += `All checks passed (health score: ${healthScore}%)`;
        } else {
            summary += `${issues.length} issue${issues.length > 1 ? 's' : ''} detected`;
            if (criticalCount > 0) summary += ` [${criticalCount} critical]`;
            if (majorCount > 0) summary += ` [${majorCount} major]`;
            if (warningCount > 0) summary += ` [${warningCount} warnings]`;
        }
        
        if (breakdown) {
            summary += ` | System degradation: ${breakdown.systemDegradationPercent.toFixed(1)}%`;
            summary += ` | Components affected: ${breakdown.componentsAffected}/${breakdown.totalComponents}`;
        }
        
        return summary;
    }

    /**
     * Generate failure summary section
     */
    private static generateFailureSummary(issues: GenesisIssue[]): string {
        if (issues.length === 0) {
            return 'No failures detected. All simulation constraints satisfied.';
        }
        
        const lines: string[] = [];
        lines.push('='.repeat(60));
        lines.push('FAILURE SUMMARY');
        lines.push('='.repeat(60));
        
        // Group by severity
        const bySeverity = {
            critical: issues.filter(i => i.severity === 'critical'),
            major: issues.filter(i => i.severity === 'major'),
            warning: issues.filter(i => i.severity === 'warning'),
            minor: issues.filter(i => i.severity === 'minor'),
            info: issues.filter(i => i.severity === 'info')
        };
        
        Object.entries(bySeverity).forEach(([severity, severityIssues]) => {
            if (severityIssues.length === 0) return;
            
            const header = severity.toUpperCase();
            lines.push(`\n${header} (${severityIssues.length}):`);
            lines.push('-'.repeat(40));
            
            severityIssues.forEach((issue, idx) => {
                lines.push(`  ${idx + 1}. [${issue.issueCode}] ${issue.message}`);
                if (issue.componentId) {
                    lines.push(`     Component: ${issue.componentName || issue.componentId}`);
                }
                if (issue.rootCause) {
                    lines.push(`     Root Cause: ${issue.rootCause}`);
                }
            });
        });
        
        return lines.join('\n');
    }

    /**
     * Generate severity breakdown section
     */
    private static generateSeverityBreakdown(issues: GenesisIssue[]): string {
        const lines: string[] = [];
        lines.push('='.repeat(60));
        lines.push('SEVERITY BREAKDOWN');
        lines.push('='.repeat(60));
        
        const byCategory = new Map<string, GenesisIssue[]>();
        issues.forEach(issue => {
            const existing = byCategory.get(issue.category) || [];
            existing.push(issue);
            byCategory.set(issue.category, existing);
        });
        
        byCategory.forEach((categoryIssues, category) => {
            const icon = getCategoryIcon(category as any);
            const critical = categoryIssues.filter(i => i.severity === 'critical').length;
            const major = categoryIssues.filter(i => i.severity === 'major').length;
            const warning = categoryIssues.filter(i => i.severity === 'warning').length;
            
            lines.push(`\n${icon} ${category.toUpperCase().replace('_', ' ')}:`);
            lines.push(`  Critical: ${critical}  Major: ${major}  Warning: ${warning}`);
        });
        
        return lines.join('\n');
    }

    /**
     * Generate component impact section
     */
    private static generateComponentImpact(
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null
    ): string {
        const lines: string[] = [];
        lines.push('='.repeat(60));
        lines.push('COMPONENT IMPACT ANALYSIS');
        lines.push('='.repeat(60));
        
        // Group by component
        const byComponent = new Map<string, GenesisIssue[]>();
        issues.forEach(issue => {
            if (issue.componentId) {
                const existing = byComponent.get(issue.componentId) || [];
                existing.push(issue);
                byComponent.set(issue.componentId, existing);
            }
        });
        
        if (byComponent.size === 0) {
            lines.push('\nNo component-specific issues detected.');
        } else {
            lines.push('\nAffected Components:');
            lines.push('-'.repeat(40));
            
            // Sort by severity
            const sortedComponents = Array.from(byComponent.entries())
                .sort((a, b) => {
                    const aMax = Math.max(...a[1].map(i => getSeverityOrder(i.severity)));
                    const bMax = Math.max(...b[1].map(i => getSeverityOrder(i.severity)));
                    return bMax - aMax;
                });
            
            sortedComponents.forEach(([compId, compIssues]) => {
                const maxSeverity = compIssues.reduce((max, i) => 
                    getSeverityOrder(i.severity) > max ? getSeverityOrder(i.severity) : max
                , 0);
                
                const severityIndicator = maxSeverity >= 4 ? '🔴' : 
                                         maxSeverity >= 3 ? '🟠' : 
                                         maxSeverity >= 2 ? '🟡' : '🔵';
                
                lines.push(`\n  ${severityIndicator} ${compId}`);
                lines.push(`      Issues: ${compIssues.length}`);
                lines.push(`      Types: ${compIssues.map(i => i.issueCode).join(', ')}`);
            });
        }
        
        if (breakdown) {
            lines.push(`\n\nSystem Overview:`);
            lines.push(`  Total Components: ${breakdown.totalComponents}`);
            lines.push(`  Affected Components: ${breakdown.componentsAffected}`);
            lines.push(`  Degradation: ${breakdown.systemDegradationPercent.toFixed(1)}%`);
            lines.push(`  Failure Type: ${breakdown.isCompleteFailure ? 'Complete System Failure' : breakdown.isPartialFailure ? 'Partial Failure' : 'Degraded Operation'}`);
        }
        
        return lines.join('\n');
    }

    /**
     * Generate root cause analysis section
     */
    private static generateRootCauseAnalysis(breakdown: FailureBreakdown | null): string {
        const lines: string[] = [];
        lines.push('='.repeat(60));
        lines.push('ROOT CAUSE ANALYSIS');
        lines.push('='.repeat(60));
        
        if (!breakdown || breakdown.rootCauseChain.length === 0) {
            lines.push('\nNo root cause analysis available.');
            return lines.join('\n');
        }
        
        lines.push('\nRoot Cause Chain:');
        lines.push('-'.repeat(40));
        
        breakdown.rootCauseChain.forEach((node, idx) => {
            lines.push(`\n  Level ${node.level}: ${node.cause}`);
            lines.push(`    Evidence: ${node.evidence}`);
            if (node.affectedComponents.length > 0) {
                lines.push(`    Affected: ${node.affectedComponents.join(', ')}`);
            }
        });
        
        if (breakdown.cascadingFailures.length > 0) {
            lines.push('\n\nCascading Failures (caused by root causes):');
            lines.push('-'.repeat(40));
            breakdown.cascadingFailures.forEach((failure, idx) => {
                lines.push(`\n  ${idx + 1}. ${failure.message}`);
                lines.push(`     Triggered by: ${failure.rootCause || 'unknown'}`);
            });
        }
        
        return lines.join('\n');
    }

    /**
     * Generate recommended actions section
     */
    private static generateRecommendedActions(
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null
    ): string[] {
        const actions: string[] = [];
        
        actions.push('='.repeat(60));
        actions.push('RECOMMENDED ACTIONS');
        actions.push('='.repeat(60));
        
        // Immediate actions
        const criticalIssues = issues.filter(i => i.severity === 'critical');
        if (criticalIssues.length > 0) {
            actions.push('\n🔴 IMMEDIATE ACTIONS REQUIRED:');
            actions.push('-'.repeat(40));
            
            criticalIssues.forEach((issue, idx) => {
                actions.push(`\n  ${idx + 1}. ${issue.message}`);
                if (issue.suggestedFixes && issue.suggestedFixes.length > 0) {
                    actions.push(`     Suggested fixes:`);
                    issue.suggestedFixes.forEach(fix => {
                        actions.push(`       • ${fix}`);
                    });
                }
            });
        }
        
        // Investigation steps
        const majorIssues = issues.filter(i => i.severity === 'major');
        if (majorIssues.length > 0) {
            actions.push('\n\n🟠 INVESTIGATION NEEDED:');
            actions.push('-'.repeat(40));
            majorIssues.forEach((issue, idx) => {
                actions.push(`\n  ${idx + 1}. ${issue.message}`);
                if (issue.componentId) {
                    actions.push(`     Check: ${issue.componentName || issue.componentId}`);
                }
            });
        }
        
        // Long-term fixes
        const warningIssues = issues.filter(i => i.severity === 'warning');
        if (warningIssues.length > 0) {
            actions.push('\n\n🟡 CONSIDER FOR FUTURE IMPROVEMENT:');
            actions.push('-'.repeat(40));
            
            const uniqueFixes = new Set<string>();
            warningIssues.forEach(issue => {
                issue.suggestedFixes?.forEach(fix => uniqueFixes.add(fix));
            });
            
            Array.from(uniqueFixes).slice(0, 5).forEach((fix, idx) => {
                actions.push(`\n  ${idx + 1}. ${fix}`);
            });
        }
        
        // General recommendations from breakdown
        if (breakdown) {
            if (breakdown.immediateActions.length > 0) {
                actions.push('\n\n🎯 PRIORITY FIXES:');
                actions.push('-'.repeat(40));
                breakdown.immediateActions.slice(0, 3).forEach((action, idx) => {
                    actions.push(`\n  ${idx + 1}. ${action}`);
                });
            }
        }
        
        return actions;
    }

    /**
     * Generate text output (default)
     */
    private static generateTextOutput(
        summary: string,
        failureSummary: string,
        severityBreakdown: string,
        componentImpact: string,
        rootCauseAnalysis: string,
        recommendedActions: string[],
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null,
        verbose: boolean
    ): string {
        const lines: string[] = [];
        lines.push('='.repeat(60));
        lines.push('GENESIS DEBUG OUTPUT');
        lines.push('='.repeat(60));
        lines.push('');
        lines.push(summary);
        lines.push('');
        lines.push(failureSummary);
        lines.push('');
        lines.push(severityBreakdown);
        lines.push('');
        lines.push(componentImpact);
        lines.push('');
        lines.push(rootCauseAnalysis);
        lines.push('');
        lines.push(...recommendedActions);
        
        if (verbose && breakdown) {
            lines.push('');
            lines.push('='.repeat(60));
            lines.push('DETAILED METRICS');
            lines.push('='.repeat(60));
            lines.push(`Health Score: ${calculateHealthScore(issues)}%`);
            lines.push(`System Degradation: ${breakdown.systemDegradationPercent.toFixed(1)}%`);
            lines.push(`Overall Severity: ${breakdown.overallSeverity}`);
            lines.push(`Impact Scope: ${getImpactLabel(breakdown.overallImpact as ImpactScope)}`);
        }
        
        return lines.join('\n');
    }

    /**
     * Generate HTML output
     */
    private static generateHTMLOutput(
        summary: string,
        failureSummary: string,
        severityBreakdown: string,
        componentImpact: string,
        rootCauseAnalysis: string,
        recommendedActions: string[],
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null
    ): string {
        return `
<!DOCTYPE html>
<html>
<head>
    <title>Genesis Debug Report</title>
    <style>
        body { font-family: monospace; background: #1a1a2e; color: #eee; padding: 20px; }
        .header { background: #16213e; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
        .section { background: #16213e; padding: 15px; border-radius: 8px; margin-bottom: 15px; }
        .critical { color: #ff6b6b; }
        .major { color: #ffa502; }
        .warning { color: #ffd93d; }
        .minor { color: #6bcb77; }
        pre { white-space: pre-wrap; }
    </style>
</head>
<body>
    <div class="header">
        <h1>Genesis Debug Report</h1>
        <p>${summary}</p>
    </div>
    <div class="section">
        <h2>Failure Summary</h2>
        <pre>${failureSummary}</pre>
    </div>
    <div class="section">
        <h2>Severity Breakdown</h2>
        <pre>${severityBreakdown}</pre>
    </div>
    <div class="section">
        <h2>Component Impact</h2>
        <pre>${componentImpact}</pre>
    </div>
    <div class="section">
        <h2>Root Cause Analysis</h2>
        <pre>${rootCauseAnalysis}</pre>
    </div>
    <div class="section">
        <h2>Recommended Actions</h2>
        <pre>${recommendedActions.join('\n')}</pre>
    </div>
</body>
</html>`;
    }

    /**
     * Generate compact output for terminal
     */
    static formatCompact(issues: GenesisIssue[]): string {
        const critical = issues.filter(i => i.severity === 'critical');
        const major = issues.filter(i => i.severity === 'major');
        
        if (critical.length === 0 && major.length === 0) {
            return '✅ All checks passed';
        }
        
        const lines: string[] = [];
        
        if (critical.length > 0) {
            lines.push(`❌ ${critical.length} CRITICAL issue${critical.length > 1 ? 's' : ''}:`);
            critical.forEach(i => {
                lines.push(`   • ${i.message}`);
                if (i.suggestedFixes?.length) {
                    lines.push(`     → ${i.suggestedFixes[0]}`);
                }
            });
        }
        
        if (major.length > 0) {
            lines.push(`⚠️  ${major.length} major issue${major.length > 1 ? 's' : ''}:`);
            major.slice(0, 3).forEach(i => {
                lines.push(`   • ${i.message}`);
            });
        }
        
        return lines.join('\n');
    }
}

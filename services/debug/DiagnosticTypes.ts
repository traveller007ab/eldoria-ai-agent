/**
 * Enhanced Diagnostic Types for Genesis Debug System
 * Provides detailed failure analysis, severity levels, and actionable insights
 */

// ============================================================================
// Severity Levels
// ============================================================================

export type FailureSeverity = 
    | 'info'        // Informational, no action needed
    | 'minor'       // Minor issue, low impact
    | 'warning'     // Warning, may need attention
    | 'major'       // Major issue, significant impact
    | 'critical';   // Critical failure, immediate action required

export type FailureCategory = 
    | 'convergence'     // Solver did not converge
    | 'constraint'      // Physical constraint violation
    | 'compatibility'   // Component/fluid incompatibility
    | 'performance'     // Performance degradation
    | 'stability'       // Stability/control issues
    | 'numerical'       // Numerical issues (overflow, NaN)
    | 'topology'        // Graph/topology errors
    | 'configuration'   // Invalid configuration
    | 'physical_limit'; // Exceeded physical limits

export type ImpactScope = 
    | 'component'   // Only affects single component
    | 'subcircuit'  // Affects a subset of system
    | 'system';     // Affects entire system

export type ConfidenceLevel = 
    | 'high'        // >90% confidence
    | 'medium'      // 50-90% confidence
    | 'low';        // <50% confidence

// ============================================================================
// Enhanced Issue Interface
// ============================================================================

export interface GenesisIssue {
    // Identification
    id: string;
    issueCode: string;           // e.g., 'CAVITATION_RISK', 'NON_CONVERGENCE'
    category: FailureCategory;
    
    // Severity Assessment
    severity: FailureSeverity;
    impactScope: ImpactScope;
    confidence: ConfidenceLevel;
    
    // What & Where
    componentId?: string;
    componentName?: string;
    componentType?: string;
    stage?: string;              // 'mechanical', 'fluid', 'thermal', 'initialization'
    
    // Root Cause Analysis
    rootCause?: string;          // Direct cause
    contributingFactors?: string[];  // Secondary causes
    
    // Values & Thresholds
    observedValue: number;
    expectedValue?: number;
    threshold?: number;
    unit?: string;
    
    // Context
    message: string;
    detailedExplanation?: string;
    
    // Resolution
    suggestedFixes?: string[];
    fixPriority?: number;         // 1 = highest priority
    documentationLinks?: string[];
    
    // Debugging Info
    debugData?: Record<string, unknown>;
    stackTrace?: string;
}

// ============================================================================
// Failure Breakdown
// ============================================================================

export interface FailureBreakdown {
    // Overall Assessment
    overallSeverity: FailureSeverity;
    overallImpact: ImpactScope;
    isPartialFailure: boolean;
    isCompleteFailure: boolean;
    
    // Failure Summary
    primaryFailure: GenesisIssue | null;
    secondaryFailures: GenesisIssue[];
    cascadingFailures: GenesisIssue[];
    
    // System Degradation Metrics
    systemDegradationPercent: number;
    componentsAffected: number;
    totalComponents: number;
    
    // Stage Analysis
    stageFailures: {
        initialization: GenesisIssue[];
        mechanical: GenesisIssue[];
        fluid: GenesisIssue[];
        thermal: GenesisIssue[];
        convergence: GenesisIssue[];
    };
    
    // Root Cause Chain
    rootCauseChain: RootCauseNode[];
    
    // Recommendations
    immediateActions: string[];
    investigationSteps: string[];
    longTermFixes: string[];
}

export interface RootCauseNode {
    level: number;
    cause: string;
    evidence: string;
    affectedComponents: string[];
    children?: RootCauseNode[];
}

// ============================================================================
// Simulation Result Enhancement
// ============================================================================

export interface DiagnosticResult {
    // Status
    status: 'healthy' | 'degraded' | 'failed' | 'partial';
    
    // Analysis Results
    issues: GenesisIssue[];
    failureBreakdown: FailureBreakdown | null;
    
    // Metrics
    healthScore: number;           // 0-100
    degradationScore: number;      // 0-100
    failureRiskScore: number;      // 0-100
    
    // Timestamps
    analyzedAt: Date;
    lastHealthyAt?: Date;
    
    // Debug Info
    analysisVersion: string;
    computationTime: number;       // ms
}

// ============================================================================
// Debug Output Formatter Types
// ============================================================================

export interface DebugOutput {
    // Summary
    summary: string;
    status: 'PASS' | 'FAIL' | 'WARNING';
    exitCode: number;
    
    // Sections
    failureSummary: string;
    severityBreakdown: string;
    componentImpact: string;
    rootCauseAnalysis: string;
    recommendedActions: string[];
    
    // Raw Data
    issues: GenesisIssue[];
    breakdown: FailureBreakdown | null;
    
    // Export
    formattedOutput: string;
    exportFormat: 'text' | 'json' | 'html';
}

// ============================================================================
// Validation Result Types
// ============================================================================

export interface ValidationResult {
    isValid: boolean;
    errors: GenesisIssue[];
    warnings: GenesisIssue[];
    suggestions: GenesisIssue[];
    
    // Blueprint Validation
    topologyValid: boolean;
    connectivityValid: boolean;
    parameterValid: boolean;
    
    // Simulation Readiness
    readyToSimulate: boolean;
    blockingIssues: number;
    warningsCount: number;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getSeverityOrder(severity: FailureSeverity): number {
    const order = { info: 0, minor: 1, warning: 2, major: 3, critical: 4 };
    return order[severity];
}

export function getCategoryIcon(category: FailureCategory): string {
    const icons = {
        convergence: '🔄',
        constraint: '⚠️',
        compatibility: '🔀',
        performance: '📉',
        stability: '🎯',
        numerical: '🔢',
        topology: '🔗',
        configuration: '⚙️',
        physical_limit: '🔒'
    };
    return icons[category] || '❓';
}

export function getSeverityColor(severity: FailureSeverity): string {
    const colors = {
        info: 'text-blue-400',
        minor: 'text-gray-400',
        warning: 'text-amber-400',
        major: 'text-orange-400',
        critical: 'text-red-400'
    };
    return colors[severity];
}

export function getImpactLabel(impact: ImpactScope): string {
    const labels = {
        component: 'Component-Level',
        subcircuit: 'Sub-Circuit',
        system: 'Entire System'
    };
    return labels[impact];
}

export function getConfidenceLabel(confidence: ConfidenceLevel): string {
    const labels = {
        high: 'High Confidence',
        medium: 'Medium Confidence',
        low: 'Low Confidence'
    };
    return labels[confidence];
}

export function categorizeIssueByImpact(issues: GenesisIssue[]): {
    component: GenesisIssue[];
    subcircuit: GenesisIssue[];
    system: GenesisIssue[];
} {
    return {
        component: issues.filter(i => i.impactScope === 'component'),
        subcircuit: issues.filter(i => i.impactScope === 'subcircuit'),
        system: issues.filter(i => i.impactScope === 'system')
    };
}

export function sortIssuesBySeverity(issues: GenesisIssue[]): GenesisIssue[] {
    return [...issues].sort((a, b) => 
        getSeverityOrder(b.severity) - getSeverityOrder(a.severity)
    );
}

export function getCriticalIssues(issues: GenesisIssue[]): GenesisIssue[] {
    return issues.filter(i => i.severity === 'critical');
}

export function getWarningIssues(issues: GenesisIssue[]): GenesisIssue[] {
    return issues.filter(i => i.severity === 'warning' || i.severity === 'major');
}

export function calculateHealthScore(issues: GenesisIssue[]): number {
    const criticalCount = issues.filter(i => i.severity === 'critical').length * 20;
    const majorCount = issues.filter(i => i.severity === 'major').length * 10;
    const warningCount = issues.filter(i => i.severity === 'warning').length * 5;
    const minorCount = issues.filter(i => i.severity === 'minor').length * 2;
    
    const penalty = criticalCount + majorCount + warningCount + minorCount;
    return Math.max(0, 100 - penalty);
}

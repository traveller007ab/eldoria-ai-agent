/**
 * Genesis Debug Service
 * Main entry point for comprehensive simulation debugging
 */

import type { 
    MechBlueprint, 
    MechSimulationResult 
} from '../../types';
import type { 
    GenesisIssue, 
    FailureBreakdown, 
    DiagnosticResult,
    DebugOutput,
    ValidationResult
} from './DiagnosticTypes';
import { FailureBreakdownService } from './FailureBreakdownService';
import { DebugOutputFormatter } from './DebugOutputFormatter';
import { DiagnosticService } from '../physics/DiagnosticService';
import { PhysicsConstraintChecker } from '../physics/PhysicsConstraintChecker';
import { ModelAnalyzer } from '../physics/ModelAnalyzer';

export class GenesisDebugService {

    /**
     * Run comprehensive diagnostic analysis on simulation results
     */
    static analyze(
        blueprint: MechBlueprint,
        result: MechSimulationResult,
        options: {
            includeDebugData?: boolean;
            runValidation?: boolean;
        } = {}
    ): DiagnosticResult {
        const startTime = Date.now();
        
        // Collect all issues
        const issues = FailureBreakdownService.collectAllIssues(blueprint, result);
        
        // Generate failure breakdown
        const breakdown = FailureBreakdownService.analyze(blueprint, result, options);
        
        // Calculate health metrics
        const healthScore = this.calculateHealthScore(issues);
        const degradationScore = this.calculateDegradationScore(issues, blueprint);
        const failureRiskScore = this.calculateFailureRiskScore(issues);
        
        // Determine overall status
        const status = this.determineStatus(issues);
        
        const computationTime = Date.now() - startTime;
        
        return {
            status,
            issues,
            failureBreakdown: breakdown,
            healthScore,
            degradationScore,
            failureRiskScore,
            analyzedAt: new Date(),
            analysisVersion: '2.0.0',
            computationTime
        };
    }

    /**
     * Generate debug output for display/export
     */
    static generateDebugOutput(
        blueprint: MechBlueprint,
        result: MechSimulationResult,
        options: {
            format?: 'text' | 'json' | 'html';
            verbose?: boolean;
        } = {}
    ): DebugOutput {
        const analysis = this.analyze(blueprint, result);
        return DebugOutputFormatter.format(
            analysis.issues,
            analysis.failureBreakdown,
            options
        );
    }

    /**
     * Validate blueprint before simulation
     */
    static validateBlueprint(blueprint: MechBlueprint): ValidationResult {
        const issues: GenesisIssue[] = [];
        
        // Check topology
        const topologyValid = this.validateTopology(blueprint);
        
        // Check connectivity
        const connectivityValid = this.validateConnectivity(blueprint);
        
        // Check parameters
        const parameterValid = this.validateParameters(blueprint);
        
        // Collect all potential issues
        const analysis = ModelAnalyzer.analyze(blueprint);
        
        // Generate issues for validation problems
        if (!topologyValid) {
            issues.push({
                id: `topology-${Date.now()}`,
                issueCode: 'INVALID_TOPOLOGY',
                category: 'topology',
                severity: 'critical',
                impactScope: 'system',
                confidence: 'high',
                message: 'Blueprint topology is invalid - missing or duplicate nodes',
                observedValue: 0,
                suggestedFixes: [
                    'Ensure all components are connected properly',
                    'Check for disconnected components',
                    'Verify node connections are complete'
                ],
                fixPriority: 1
            });
        }
        
        if (!connectivityValid) {
            issues.push({
                id: `connectivity-${Date.now()}`,
                issueCode: 'DISCONNECTED_COMPONENTS',
                category: 'topology',
                severity: 'major',
                impactScope: 'subcircuit',
                confidence: 'high',
                message: 'Some components are not connected to the system',
                observedValue: 0,
                suggestedFixes: [
                    'Add connections between disconnected components',
                    'Remove unused components',
                    'Verify flow path continuity'
                ],
                fixPriority: 2
            });
        }
        
        // Check for common configuration issues
        this.checkConfiguration(blueprint).forEach(issue => {
            issues.push(issue);
        });
        
        const blockingIssues = issues.filter(i => i.severity === 'critical' || i.severity === 'major').length;
        const warningsCount = issues.filter(i => i.severity === 'warning').length;
        
        return {
            isValid: topologyValid && connectivityValid && parameterValid && blockingIssues === 0,
            errors: issues.filter(i => i.severity === 'critical' || i.severity === 'major'),
            warnings: issues.filter(i => i.severity === 'warning'),
            suggestions: issues.filter(i => i.severity === 'minor' || i.severity === 'info'),
            topologyValid,
            connectivityValid,
            parameterValid,
            readyToSimulate: blockingIssues === 0 && topologyValid,
            blockingIssues,
            warningsCount
        };
    }

    /**
     * Quick health check for UI display
     */
    static quickHealthCheck(issues: GenesisIssue[]): {
        status: 'healthy' | 'degraded' | 'failed' | 'partial';
        message: string;
        count: { critical: number; major: number; warning: number };
    } {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const major = issues.filter(i => i.severity === 'major').length;
        const warning = issues.filter(i => i.severity === 'warning').length;
        
        let status: 'healthy' | 'degraded' | 'failed' | 'partial';
        let message: string;
        
        if (critical > 0) {
            status = 'failed';
            message = `${critical} critical issue${critical > 1 ? 's' : ''} require${critical === 1 ? 's' : ''} immediate attention`;
        } else if (major > 0) {
            status = 'partial';
            message = `${major} major issue${major > 1 ? 's' : ''} detected`;
        } else if (warning > 0) {
            status = 'degraded';
            message = `${warning} warning${warning > 1 ? 's' : ''} to review`;
        } else {
            status = 'healthy';
            message = 'All systems operational';
        }
        
        return { status, message, count: { critical, major, warning } };
    }

    /**
     * Get actionable recommendations
     */
    static getRecommendations(
        issues: GenesisIssue[],
        breakdown: FailureBreakdown | null
    ): {
        immediate: string[];
        investigation: string[];
        longTerm: string[];
    } {
        const immediate: string[] = [];
        const investigation: string[] = [];
        const longTerm: string[] = [];
        
        // Process critical issues
        const critical = issues.filter(i => i.severity === 'critical');
        critical.forEach(issue => {
            immediate.push(`[CRITICAL] ${issue.message}`);
            issue.suggestedFixes?.forEach(fix => {
                if (!immediate.includes(fix)) immediate.push(`  → ${fix}`);
            });
        });
        
        // Process major issues
        const major = issues.filter(i => i.severity === 'major');
        major.forEach(issue => {
            investigation.push(`[MAJOR] ${issue.message}`);
            issue.suggestedFixes?.forEach(fix => {
                if (!investigation.includes(fix)) investigation.push(`  → ${fix}`);
            });
        });
        
        // Process warnings
        const warnings = issues.filter(i => i.severity === 'warning');
        warnings.slice(0, 5).forEach(issue => {
            longTerm.push(`${issue.message}`);
        });
        
        // Add from breakdown
        if (breakdown) {
            breakdown.immediateActions.forEach(action => {
                if (!immediate.includes(action)) immediate.push(action);
            });
            breakdown.investigationSteps.forEach(step => {
                if (!investigation.includes(step)) investigation.push(step);
            });
            breakdown.longTermFixes.forEach(fix => {
                if (!longTerm.includes(fix)) longTerm.push(fix);
            });
        }
        
        return { immediate, investigation, longTerm };
    }

    // Private helper methods

    private static calculateHealthScore(issues: GenesisIssue[]): number {
        const criticalPenalty = issues.filter(i => i.severity === 'critical').length * 20;
        const majorPenalty = issues.filter(i => i.severity === 'major').length * 10;
        const warningPenalty = issues.filter(i => i.severity === 'warning').length * 5;
        const minorPenalty = issues.filter(i => i.severity === 'minor').length * 2;
        
        return Math.max(0, 100 - criticalPenalty - majorPenalty - warningPenalty - minorPenalty);
    }

    private static calculateDegradationScore(
        issues: GenesisIssue[],
        blueprint: MechBlueprint
    ): number {
        const affectedComponents = new Set<string>();
        issues.forEach(issue => {
            if (issue.componentId) affectedComponents.add(issue.componentId);
        });
        
        if (blueprint.components.length === 0) return 0;
        return (affectedComponents.size / blueprint.components.length) * 100;
    }

    private static calculateFailureRiskScore(issues: GenesisIssue[]): number {
        const critical = issues.filter(i => i.severity === 'critical').length * 30;
        const major = issues.filter(i => i.severity === 'major').length * 20;
        const warning = issues.filter(i => i.severity === 'warning').length * 10;
        
        return Math.min(100, critical + major + warning);
    }

    private static determineStatus(issues: GenesisIssue[]): 
        'healthy' | 'degraded' | 'failed' | 'partial' {
        const critical = issues.filter(i => i.severity === 'critical').length;
        const major = issues.filter(i => i.severity === 'major').length;
        
        if (critical > 0) return 'failed';
        if (major > 0) return 'partial';
        if (issues.length > 0) return 'degraded';
        return 'healthy';
    }

    private static validateTopology(blueprint: MechBlueprint): boolean {
        // Basic topology validation
        if (!blueprint.components || blueprint.components.length === 0) {
            return false;
        }
        
        // Check for duplicate component IDs
        const ids = new Set(blueprint.components.map(c => c.id));
        if (ids.size !== blueprint.components.length) {
            return false;
        }
        
        return true;
    }

    private static validateConnectivity(blueprint: MechBlueprint): boolean {
        if (!blueprint.connections || !blueprint.components) return true;
        
        const connectedComponents = new Set<string>();
        blueprint.connections.forEach(conn => {
            connectedComponents.add(conn.sourceComponentId);
            connectedComponents.add(conn.targetComponentId);
        });
        
        // All components should be connected (except single-component systems)
        if (blueprint.components.length > 1 && 
            connectedComponents.size < blueprint.components.length) {
            return false;
        }
        
        return true;
    }

    private static validateParameters(blueprint: MechBlueprint): boolean {
        for (const comp of blueprint.components || []) {
            // Check for required parameters
            if (!comp.parameterValues) {
                continue;
            }
            
            // Check for NaN or infinity
            for (const [key, value] of Object.entries(comp.parameterValues)) {
                if (typeof value === 'number' && (!Number.isFinite(value) || Number.isNaN(value))) {
                    return false;
                }
            }
        }
        
        return true;
    }

    private static checkConfiguration(blueprint: MechBlueprint): GenesisIssue[] {
        const issues: GenesisIssue[] = [];
        
        // Check for fluid specification
        if (!blueprint.fluidId) {
            issues.push({
                id: `no-fluid-${Date.now()}`,
                issueCode: 'MISSING_FLUID',
                category: 'configuration',
                severity: 'warning',
                impactScope: 'system',
                confidence: 'high',
                stage: 'initialization',
                message: 'No working fluid specified - using default (water)',
                observedValue: 0,
                suggestedFixes: [
                    'Select a working fluid in project settings',
                    'Consider fluid properties for your application'
                ],
                fixPriority: 3
            });
        }
        
        // Check for isolated pumps/turbines without power source/sink
        const hasEngine = blueprint.components?.some(c => 
            c.componentDefinitionId.includes('engine')
        );
        const hasPump = blueprint.components?.some(c => 
            c.componentDefinitionId.includes('pump')
        );
        
        if (hasPump && !hasEngine && !blueprint.components?.some(c => 
            c.componentDefinitionId.includes('motor')
        )) {
            issues.push({
                id: `no-power-${Date.now()}`,
                issueCode: 'NO_POWER_SOURCE',
                category: 'configuration',
                severity: 'warning',
                impactScope: 'subcircuit',
                confidence: 'medium',
                message: 'Pump found without power source (engine or motor)',
                observedValue: 0,
                suggestedFixes: [
                    'Add an engine or motor to drive the pump',
                    'Configure mechanical connection between power source and pump'
                ],
                fixPriority: 3
            });
        }
        
        return issues;
    }
}

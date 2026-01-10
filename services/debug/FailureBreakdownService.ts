/**
 * Failure Breakdown Service
 * Provides detailed root cause analysis and failure breakdown
 */

import type { MechBlueprint, MechSimulationResult } from '../../types';
import type { GenesisIssue, FailureBreakdown, RootCauseNode } from './DiagnosticTypes';
import { DiagnosticService } from '../physics/DiagnosticService';
import { PhysicsConstraintChecker } from '../physics/PhysicsConstraintChecker';
import { ComponentPhysicsRegistry } from '../physics/ComponentPhysics';

export class FailureBreakdownService {

    /**
     * Generate comprehensive failure breakdown from simulation results
     */
    static analyze(
        blueprint: MechBlueprint,
        result: MechSimulationResult,
        config?: {
            includeDebugData?: boolean;
            maxRootCauseDepth?: number;
        }
    ): FailureBreakdown {
        const startTime = Date.now();
        
        // Collect all issues
        const issues = this.collectAllIssues(blueprint, result);
        
        // Categorize by stage
        const stageFailures = this.categorizeByStage(issues, result);
        
        // Identify root causes
        const rootCauseChain = this.identifyRootCauses(issues, blueprint, result);
        
        // Calculate system degradation
        const degradationMetrics = this.calculateDegradation(blueprint, issues);
        
        // Identify cascading failures
        const cascadingFailures = this.identifyCascadingFailures(issues, rootCauseChain);
        
        // Generate recommendations
        const recommendations = this.generateRecommendations(issues, rootCauseChain);
        
        // Build failure breakdown
        const breakdown: FailureBreakdown = {
            overallSeverity: this.determineOverallSeverity(issues),
            overallImpact: this.determineOverallImpact(issues),
            isPartialFailure: issues.length > 0 && issues.some(i => i.severity !== 'critical'),
            isCompleteFailure: issues.some(i => i.severity === 'critical' && i.impactScope === 'system'),
            
            primaryFailure: this.identifyPrimaryFailure(issues),
            secondaryFailures: issues.filter(i => i !== issues.find(p => p.id === breakdown.primaryFailure?.id)),
            cascadingFailures,
            
            systemDegradationPercent: degradationMetrics.degradationPercent,
            componentsAffected: degradationMetrics.componentsAffected,
            totalComponents: blueprint.components.length,
            
            stageFailures,
            rootCauseChain,
            
            immediateActions: recommendations.immediate,
            investigationSteps: recommendations.investigation,
            longTermFixes: recommendations.longTerm
        };

        const computationTime = Date.now() - startTime;
        return breakdown;
    }

    /**
     * Collect all diagnostic issues from multiple sources (public for external access)
     */
    static collectAllIssues(
        blueprint: MechBlueprint,
        result: MechSimulationResult
    ): GenesisIssue[] {
        const issues: GenesisIssue[] = [];
        
        // 1. Standard diagnostic issues
        const standardIssues = DiagnosticService.analyze(blueprint, result);
        standardIssues.forEach(issue => {
            issues.push(this.enhanceIssue(issue, 'standard'));
        });
        
        // 2. Constraint violations
        const constraintResult = PhysicsConstraintChecker.validateBlueprint(
            blueprint as any,
            result,
            blueprint.fluidId || 'water'
        );
        constraintResult.violations.forEach(v => {
            issues.push(this.createIssueFromConstraint(v, 'constraint'));
        });
        
        // 3. Convergence issues (from result diagnostics)
        if (!result.diagnostics.convergence.converged) {
            issues.push(this.createConvergenceIssue(result));
        }
        
        // 4. Balance violations
        if (result.diagnostics.massBalance.status !== 'ok') {
            issues.push(this.createBalanceIssue('mass', result.diagnostics.massBalance));
        }
        if (result.diagnostics.energyBalance.status !== 'ok') {
            issues.push(this.createBalanceIssue('energy', result.diagnostics.energyBalance));
        }
        
        // 5. Constraint violations from result
        result.constraintViolations.forEach(v => {
            issues.push(this.createConstraintViolationIssue(v));
        });
        
        // 6. Numerical issues
        this.checkNumericalIssues(result.variables).forEach(issue => {
            issues.push(issue);
        });
        
        return issues;
    }

    /**
     * Enhance standard issue with additional metadata
     */
    private static enhanceIssue(issue: any, source: string): GenesisIssue {
        const categoryMap: Record<string, any> = {
            'CAVITATION': { category: 'constraint', stage: 'fluid', fixPriority: 1 },
            'EROSION': { category: 'physical_limit', stage: 'fluid', fixPriority: 2 },
            'OVER_TEMP': { category: 'physical_limit', stage: 'thermal', fixPriority: 1 },
            'SURGE_RISK': { category: 'stability', stage: 'fluid', fixPriority: 1 },
            'FLUID_COMPATIBILITY': { category: 'compatibility', stage: 'initialization', fixPriority: 1 },
            'DOMAIN_MISMATCH': { category: 'compatibility', stage: 'initialization', fixPriority: 1 },
            'FUEL_COMPATIBILITY': { category: 'compatibility', stage: 'initialization', fixPriority: 1 }
        };
        
        const mapping = categoryMap[issue.ruleId] || { category: 'constraint', stage: 'unknown', fixPriority: 3 };
        
        return {
            id: issue.id || crypto.randomUUID(),
            issueCode: issue.ruleId || 'UNKNOWN',
            category: mapping.category,
            severity: this.mapSeverity(issue.severity),
            impactScope: issue.componentId ? 'component' : 'system',
            confidence: 'high',
            componentId: issue.componentId,
            stage: mapping.stage,
            observedValue: issue.value || 0,
            threshold: issue.threshold,
            message: issue.message,
            suggestedFixes: this.getSuggestedFixes(issue.ruleId, issue.componentId),
            fixPriority: mapping.fixPriority,
            detailedExplanation: this.getDetailedExplanation(issue, source)
        };
    }

    /**
     * Create issue from constraint violation
     */
    private static createIssueFromConstraint(
        violation: any,
        source: string
    ): GenesisIssue {
        return {
            id: violation.id || crypto.randomUUID(),
            issueCode: violation.ruleId || 'CONSTRAINT_VIOLATION',
            category: 'constraint',
            severity: this.mapConstraintSeverity(violation.severity),
            impactScope: 'component',
            confidence: 'high',
            componentId: violation.componentId,
            stage: this.inferStageFromRule(violation.ruleId),
            observedValue: violation.value,
            threshold: violation.threshold,
            unit: this.getUnitForRule(violation.ruleId),
            message: violation.message,
            suggestedFixes: this.getSuggestedFixes(violation.ruleId, violation.componentId),
            fixPriority: violation.severity === 'critical' ? 1 : 2
        };
    }

    /**
     * Create convergence issue
     */
    private static createConvergenceIssue(result: MechSimulationResult): GenesisIssue {
        return {
            id: `convergence-${Date.now()}`,
            issueCode: 'NON_CONVERGENCE',
            category: 'convergence',
            severity: 'critical',
            impactScope: 'system',
            confidence: 'high',
            stage: 'convergence',
            observedValue: result.diagnostics.convergence.iterations,
            threshold: result.configuration.maxIterations,
            message: `Simulation failed to converge after ${result.diagnostics.convergence.iterations} iterations (residual: ${result.diagnostics.convergence.residual.toExponential(2)})`,
            rootCause: 'Solver unable to find stable solution within tolerance',
            contributingFactors: [
                'Poor initial guess',
                'Strong nonlinearities',
                'Inconsistent boundary conditions',
                'Component mismatch'
            ],
            suggestedFixes: [
                'Review initial conditions and boundary values',
                'Check for component conflicts (e.g., pump vs turbine)',
                'Relax convergence tolerance temporarily',
                'Use different initial guess method'
            ],
            fixPriority: 1,
            detailedExplanation: `The ${result.configuration.method} solver could not achieve the required tolerance of ${result.configuration.tolerance}. The final residual of ${result.diagnostics.convergence.residual.toExponential(2)} exceeds this threshold.`,
            debugData: {
                method: result.configuration.method,
                iterations: result.diagnostics.convergence.iterations,
                residual: result.diagnostics.convergence.residual,
                tolerance: result.configuration.tolerance
            }
        };
    }

    /**
     * Create balance violation issue
     */
    private static createBalanceIssue(
        type: 'mass' | 'energy',
        balance: any
    ): GenesisIssue {
        return {
            id: `${type}-balance-${Date.now()}`,
            issueCode: `${type.toUpperCase()}_BALANCE_VIOLATION`,
            category: 'physical_limit',
            severity: balance.imbalancePercent > 1 ? 'critical' : 'major',
            impactScope: balance.imbalancePercent > 5 ? 'system' : 'subcircuit',
            confidence: 'high',
            stage: 'convergence',
            observedValue: balance.imbalancePercent,
            threshold: 0.1,
            unit: '%',
            message: `${type.charAt(0).toUpperCase() + type.slice(1)} balance violated: ${balance.imbalancePercent.toFixed(4)}% imbalance`,
            rootCause: 'Conservation law not satisfied',
            contributingFactors: [
                'Numerical errors in solver',
                'Insufficient precision',
                'Component model inaccuracies'
            ],
            suggestedFixes: [
                'Refine mesh/discretization',
                'Increase solver precision',
                'Review component models'
            ],
            fixPriority: 2
        };
    }

    /**
     * Create issue from constraint violation in result
     */
    private static createConstraintViolationIssue(violation: any): GenesisIssue {
        return {
            id: violation.id || crypto.randomUUID(),
            issueCode: violation.ruleId || 'CONSTRAINT',
            category: 'constraint',
            severity: violation.severity === 'error' ? 'critical' : 'warning',
            impactScope: 'component',
            confidence: 'high',
            componentId: violation.componentId,
            observedValue: violation.value || 0,
            message: violation.message,
            suggestedFixes: this.getSuggestedFixes(violation.ruleId, violation.componentId)
        };
    }

    /**
     * Check for numerical issues (NaN, Inf, overflow)
     */
    private static checkNumericalIssues(variables: Record<string, number>): GenesisIssue[] {
        const issues: GenesisIssue[] = [];
        
        Object.entries(variables).forEach(([key, value]) => {
            if (Number.isNaN(value)) {
                issues.push({
                    id: `nan-${key}-${Date.now()}`,
                    issueCode: 'NUMERICAL_NAN',
                    category: 'numerical',
                    severity: 'critical',
                    impactScope: 'component',
                    confidence: 'high',
                    componentId: this.extractComponentId(key),
                    stage: 'convergence',
                    observedValue: NaN,
                    message: `Variable '${key}' evaluated to NaN`,
                    rootCause: 'Division by zero or invalid operation',
                    suggestedFixes: [
                        'Check for zero values in denominators',
                        'Review equation expressions',
                        'Verify input parameter ranges'
                    ],
                    fixPriority: 1
                });
            }
            
            if (!Number.isFinite(value) && typeof value === 'number') {
                issues.push({
                    id: `inf-${key}-${Date.now()}`,
                    issueCode: 'NUMERICAL_INF',
                    category: 'numerical',
                    severity: 'critical',
                    impactScope: 'component',
                    confidence: 'high',
                    componentId: this.extractComponentId(key),
                    stage: 'convergence',
                    observedValue: value,
                    message: `Variable '${key}' overflowed to ${value}`,
                    rootCause: 'Numerical overflow from extreme values',
                    suggestedFixes: [
                        'Review input parameter ranges',
                        'Add value clamping',
                        'Check for positive definite requirements'
                    ],
                    fixPriority: 1
                });
            }
        });
        
        return issues;
    }

    /**
     * Categorize issues by simulation stage
     */
    private static categorizeByStage(
        issues: GenesisIssue[],
        result: MechSimulationResult
    ): FailureBreakdown['stageFailures'] {
        return {
            initialization: issues.filter(i => i.stage === 'initialization'),
            mechanical: issues.filter(i => i.stage === 'mechanical'),
            fluid: issues.filter(i => i.stage === 'fluid'),
            thermal: issues.filter(i => i.stage === 'thermal'),
            convergence: issues.filter(i => i.stage === 'convergence' || i.category === 'convergence')
        };
    }

    /**
     * Identify root causes using dependency analysis
     */
    private static identifyRootCauses(
        issues: GenesisIssue[],
        blueprint: MechBlueprint,
        result: MechSimulationResult
    ): RootCauseNode[] {
        const rootCauses: RootCauseNode[] = [];
        
        // Group issues by component
        const issuesByComponent = new Map<string, GenesisIssue[]>();
        issues.forEach(issue => {
            if (issue.componentId) {
                const existing = issuesByComponent.get(issue.componentId) || [];
                existing.push(issue);
                issuesByComponent.set(issue.componentId, existing);
            }
        });
        
        // Identify root cause components (components with issues but not downstream of other problematic components)
        const problematicComponents = new Set(issuesByComponent.keys());
        
        // Check connectivity to find root causes
        blueprint.connections.forEach(conn => {
            if (problematicComponents.has(conn.targetComponentId) && 
                problematicComponents.has(conn.sourceComponentId)) {
                // Target is downstream of source
                // If source has critical issue, it might be the root cause
                const sourceIssues = issuesByComponent.get(conn.sourceComponentId) || [];
                const targetIssues = issuesByComponent.get(conn.targetComponentId) || [];
                
                const sourceCritical = sourceIssues.some(i => i.severity === 'critical');
                const targetCritical = targetIssues.some(i => i.severity === 'critical');
                
                if (sourceCritical && !targetCritical) {
                    // Source is likely root cause
                    sourceIssues.forEach(issue => {
                        if (!rootCauses.find(r => r.cause.includes(issue.componentId || ''))) {
                            rootCauses.push({
                                level: 1,
                                cause: `Primary issue in ${issue.componentName || issue.componentId}`,
                                evidence: issue.message,
                                affectedComponents: [issue.componentId || ''].concat(
                                    this.findDownstreamComponents(issue.componentId || '', blueprint)
                                )
                            });
                        }
                    });
                }
            }
        });
        
        // If no cascading causes found, add direct issues
        if (rootCauses.length === 0) {
            const criticalIssues = issues.filter(i => i.severity === 'critical');
            criticalIssues.forEach((issue, idx) => {
                rootCauses.push({
                    level: idx + 1,
                    cause: issue.rootCause || issue.message,
                    evidence: issue.message,
                    affectedComponents: issue.componentId ? [issue.componentId] : []
                });
            });
        }
        
        return rootCauses;
    }

    /**
     * Find downstream components from a given component
     */
    private static findDownstreamComponents(
        componentId: string,
        blueprint: MechBlueprint
    ): string[] {
        const downstream: string[] = [];
        const visited = new Set<string>();
        
        const traverse = (compId: string) => {
            if (visited.has(compId)) return;
            visited.add(compId);
            
            blueprint.connections
                .filter(c => c.sourceComponentId === compId)
                .forEach(c => {
                    if (!downstream.includes(c.targetComponentId)) {
                        downstream.push(c.targetComponentId);
                        traverse(c.targetComponentId);
                    }
                });
        };
        
        traverse(componentId);
        return downstream;
    }

    /**
     * Identify cascading failures
     */
    private static identifyCascadingFailures(
        issues: GenesisIssue[],
        rootCauses: RootCauseNode[]
    ): GenesisIssue[] {
        // Cascading failures are secondary issues caused by root causes
        const rootCauseIds = new Set<string>();
        rootCauses.forEach(rc => {
            rc.affectedComponents.forEach(id => rootCauseIds.add(id));
        });
        
        return issues.filter(issue => 
            issue.componentId && 
            !rootCauseIds.has(issue.componentId) &&
            issue.severity !== 'critical'
        );
    }

    /**
     * Calculate system degradation metrics
     */
    private static calculateDegradation(
        blueprint: MechBlueprint,
        issues: GenesisIssue[]
    ): { degradationPercent: number; componentsAffected: number } {
        const affectedComponents = new Set<string>();
        issues.forEach(issue => {
            if (issue.componentId) {
                affectedComponents.add(issue.componentId);
            }
        });
        
        const degradationPercent = blueprint.components.length > 0
            ? (affectedComponents.size / blueprint.components.length) * 100
            : 0;
        
        return {
            degradationPercent,
            componentsAffected: affectedComponents.size
        };
    }

    /**
     * Determine overall severity from issues
     */
    private static determineOverallSeverity(issues: GenesisIssue[]): any {
        if (issues.some(i => i.severity === 'critical')) return 'critical';
        if (issues.some(i => i.severity === 'major')) return 'major';
        if (issues.some(i => i.severity === 'warning')) return 'warning';
        if (issues.some(i => i.severity === 'minor')) return 'minor';
        return 'info';
    }

    /**
     * Determine overall impact scope
     */
    private static determineOverallImpact(issues: GenesisIssue[]): any {
        if (issues.some(i => i.impactScope === 'system')) return 'system';
        if (issues.some(i => i.impactScope === 'subcircuit')) return 'subcircuit';
        return 'component';
    }

    /**
     * Identify primary (most severe) failure
     */
    private static identifyPrimaryFailure(issues: GenesisIssue[]): GenesisIssue | null {
        if (issues.length === 0) return null;
        return issues.reduce((prev, curr) => 
            curr.severity === 'critical' ? curr : prev
        , issues[0]);
    }

    /**
     * Generate recommendations based on issues and root causes
     */
    private static generateRecommendations(
        issues: GenesisIssue[],
        rootCauses: RootCauseNode[]
    ): { immediate: string[]; investigation: string[]; longTerm: string[] } {
        const immediate: string[] = [];
        const investigation: string[] = [];
        const longTerm: string[] = [];
        
        // Generate from issues
        issues.forEach(issue => {
            if (issue.suggestedFixes) {
                if (issue.severity === 'critical') {
                    immediate.push(...issue.suggestedFixes);
                } else if (issue.severity === 'major') {
                    investigation.push(...issue.suggestedFixes);
                } else {
                    longTerm.push(...issue.suggestedFixes);
                }
            }
        });
        
        // Generate from root causes
        rootCauses.forEach(rc => {
            investigation.push(`Investigate: ${rc.cause}`);
            investigation.push(`Check affected components: ${rc.affectedComponents.join(', ')}`);
        });
        
        // Deduplicate
        const uniqueImmediate = Array.from(new Set(immediate));
        const uniqueInvestigation = Array.from(new Set(investigation));
        const uniqueLongTerm = Array.from(new Set(longTerm));
        
        return {
            immediate: uniqueImmediate,
            investigation: uniqueInvestigation,
            longTerm: uniqueLongTerm
        };
    }

    // Helper methods
    private static mapSeverity(sev: string): any {
        const map: Record<string, any> = {
            'critical': 'critical',
            'warning': 'warning',
            'info': 'info'
        };
        return map[sev] || 'warning';
    }

    private static mapConstraintSeverity(sev: string): any {
        const map: Record<string, any> = {
            'critical': 'critical',
            'warning': 'warning'
        };
        return map[sev] || 'warning';
    }

    private static inferStageFromRule(ruleId?: string): string {
        if (!ruleId) return 'unknown';
        const lower = ruleId.toLowerCase();
        if (lower.includes('temp') || lower.includes('heat')) return 'thermal';
        if (lower.includes('flow') || lower.includes('pressure') || lower.includes('cavitation')) return 'fluid';
        if (lower.includes('speed') || lower.includes('torque')) return 'mechanical';
        return 'unknown';
    }

    private static getUnitForRule(ruleId?: string): string {
        if (!ruleId) return '';
        const lower = ruleId.toLowerCase();
        if (lower.includes('pressure')) return 'kPa';
        if (lower.includes('temp')) return 'K';
        if (lower.includes('flow')) return 'm³/h';
        if (lower.includes('velocity')) return 'm/s';
        return '';
    }

    private static getSuggestedFixes(ruleId?: string, componentId?: string): string[] {
        if (!ruleId) return ['Review component configuration'];
        
        const fixes: Record<string, string[]> = {
            'CAVITATION': [
                'Increase NPSHa by raising tank elevation',
                'Reduce pump suction line losses',
                'Select pump with lower NPSHr',
                'Check for clogged strainers or valves'
            ],
            'EROSION': [
                'Reduce flow velocity below 3 m/s',
                'Increase pipe diameter',
                'Use erosion-resistant materials',
                'Add flow straighteners'
            ],
            'OVER_TEMP': [
                'Increase cooling capacity',
                'Reduce load or duty cycle',
                'Check cooling system for blockages',
                'Verify temperature sensor calibration'
            ],
            'NON_CONVERGENCE': [
                'Review initial conditions',
                'Check for conflicting component specifications',
                'Relax convergence tolerance',
                'Use different solver method'
            ],
            'NPSH_MARGIN': [
                'Raise tank elevation',
                'Increase suction pipe diameter',
                'Reduce system flow requirements',
                'Select different pump'
            ]
        };
        
        return fixes[ruleId] || ['Review component parameters'];
    }

    private static getDetailedExplanation(issue: any, source: string): string {
        return `[${source.toUpperCase()}] Issue detected at ${issue.componentId || 'system level'}. ` +
               `Value: ${issue.value?.toFixed(2) || 'N/A'}, Threshold: ${issue.threshold?.toFixed(2) || 'N/A'}`;
    }

    private static extractComponentId(variableName: string): string {
        const parts = variableName.split('_');
        return parts[0] || 'unknown';
    }
}

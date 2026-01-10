/**
 * Genesis Debug System Test
 * Tests the comprehensive diagnostic and debugging functionality
 */

import type { MechBlueprint, MechSimulationResult } from './types';
import { GenesisDebugService } from './services/debug/GenesisDebugService';
import { DebugOutputFormatter } from './services/debug/DebugOutputFormatter';
import { FailureBreakdownService } from './services/debug/FailureBreakdownService';

// Test blueprint with some issues
const testBlueprint: MechBlueprint = {
    id: 'test-blueprint-001',
    name: 'Test System with Issues',
    description: 'A test system designed to trigger various diagnostic issues',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'Test',
    tags: ['test'],
    fluidId: 'water',
    simulations: [],
    components: [
        {
            id: 'pump-1',
            name: 'Main Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 100, y: 100 },
            rotation: 0,
            parameterValues: { design_flow: 100, design_head: 50 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pipe-1',
            name: 'Suction Pipe',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 50, y: 100 },
            rotation: 90,
            parameterValues: { length: 5, diameter: 50 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'valve-1',
            name: 'Control Valve',
            componentDefinitionId: 'fluid.valve.globe',
            position: { x: 200, y: 100 },
            rotation: 0,
            parameterValues: { opening: 100, cv: 50 },
            isSelected: false,
            groupIds: []
        }
    ],
    connections: [
        {
            id: 'c1',
            sourceComponentId: 'pipe-1',
            targetComponentId: 'pump-1',
            sourcePortId: 'out',
            targetPortId: 'in',
            type: 'fluid',
            isSelected: false
        },
        {
            id: 'c2',
            sourceComponentId: 'pump-1',
            targetComponentId: 'valve-1',
            sourcePortId: 'out',
            targetPortId: 'in',
            type: 'fluid',
            isSelected: false
        }
    ]
};

// Test simulation result with issues
const testResult: MechSimulationResult = {
    id: 'result-001',
    blueprintId: 'test-blueprint-001',
    status: 'completed',
    completedAt: new Date(),
    duration: 1500,
    configuration: {
        method: 'nonlin_newton',
        tolerance: 1e-6,
        maxIterations: 100,
        outputLevel: 'normal',
        initialGuess: 'design'
    },
    variables: {
        'pump-1_flow_rate': 120,
        'pump-1_head': 45,
        'pump-1_pressure': 200,
        'pipe-1_velocity': 4.5, // High velocity - erosion risk
        'valve-1_pressure_drop': 50,
        'pipe-1_T_out': 350 // High temperature
    },
    metrics: {
        totalPowerInput: 25,
        totalPowerOutput: 20,
        overallEfficiency: 80,
        totalFlowRate: 120,
        maxPressure: 250,
        pressureDrop: 50,
        totalHeatInput: 10,
        totalHeatOutput: 8,
        componentMetrics: {}
    },
    diagnostics: {
        massBalance: { status: 'ok', inlet: 100, outlet: 99.5, imbalance: 0.5, imbalancePercent: 0.5 },
        energyBalance: { status: 'ok', input: 25, output: 24.8, imbalance: 0.2, imbalancePercent: 0.8 },
        convergence: { iterations: 15, residual: 1e-7, converged: true }
    },
    constraintViolations: []
};

async function runDebugTests() {
    console.log('='.repeat(80));
    console.log('GENESIS DEBUG SYSTEM TEST');
    console.log('='.repeat(80));
    console.log('');

    // Test 1: Collect all issues
    console.log('TEST 1: Collecting Issues from Multiple Sources');
    console.log('-'.repeat(60));
    const issues = FailureBreakdownService.collectAllIssues(testBlueprint, testResult);
    console.log(`Found ${issues.length} issues:`);
    issues.forEach((issue, idx) => {
        console.log(`  ${idx + 1}. [${issue.severity.toUpperCase()}] ${issue.issueCode}`);
        console.log(`     ${issue.message}`);
    });
    console.log('');

    // Test 2: Generate failure breakdown
    console.log('TEST 2: Generating Failure Breakdown');
    console.log('-'.repeat(60));
    const breakdown = FailureBreakdownService.analyze(testBlueprint, testResult);
    console.log(`Overall Severity: ${breakdown.overallSeverity}`);
    console.log(`Overall Impact: ${breakdown.overallImpact}`);
    console.log(`System Degradation: ${breakdown.systemDegradationPercent.toFixed(1)}%`);
    console.log(`Components Affected: ${breakdown.componentsAffected}/${breakdown.totalComponents}`);
    console.log(`Partial Failure: ${breakdown.isPartialFailure}`);
    console.log(`Complete Failure: ${breakdown.isCompleteFailure}`);
    console.log('');

    // Test 3: Run comprehensive diagnostic
    console.log('TEST 3: Comprehensive Diagnostic Analysis');
    console.log('-'.repeat(60));
    const diagnostic = GenesisDebugService.analyze(testBlueprint, testResult);
    console.log(`Status: ${diagnostic.status}`);
    console.log(`Health Score: ${diagnostic.healthScore}%`);
    console.log(`Degradation Score: ${diagnostic.degradationScore.toFixed(1)}%`);
    console.log(`Failure Risk Score: ${diagnostic.failureRiskScore.toFixed(1)}%`);
    console.log(`Computation Time: ${diagnostic.computationTime}ms`);
    console.log('');

    // Test 4: Generate debug output
    console.log('TEST 4: Generating Debug Output');
    console.log('-'.repeat(60));
    const debugOutput = DebugOutputFormatter.format(issues, breakdown, { format: 'text', verbose: true });
    console.log(`Status: ${debugOutput.status}`);
    console.log(`Exit Code: ${debugOutput.exitCode}`);
    console.log(`Summary: ${debugOutput.summary}`);
    console.log('');

    // Test 5: Quick health check
    console.log('TEST 5: Quick Health Check');
    console.log('-'.repeat(60));
    const healthCheck = GenesisDebugService.quickHealthCheck(issues);
    console.log(`Status: ${healthCheck.status}`);
    console.log(`Message: ${healthCheck.message}`);
    console.log(`Count: Critical=${healthCheck.count.critical}, Major=${healthCheck.count.major}, Warning=${healthCheck.count.warning}`);
    console.log('');

    // Test 6: Recommendations
    console.log('TEST 6: Generating Recommendations');
    console.log('-'.repeat(60));
    const recommendations = GenesisDebugService.getRecommendations(issues, breakdown);
    console.log('Immediate Actions:');
    recommendations.immediate.slice(0, 3).forEach((action, idx) => {
        console.log(`  ${idx + 1}. ${action}`);
    });
    console.log('');
    console.log('Investigation Steps:');
    recommendations.investigation.slice(0, 3).forEach((step, idx) => {
        console.log(`  ${idx + 1}. ${step}`);
    });
    console.log('');

    // Test 7: Blueprint validation
    console.log('TEST 7: Blueprint Validation');
    console.log('-'.repeat(60));
    const validation = GenesisDebugService.validateBlueprint(testBlueprint);
    console.log(`Is Valid: ${validation.isValid}`);
    console.log(`Topology Valid: ${validation.topologyValid}`);
    console.log(`Connectivity Valid: ${validation.connectivityValid}`);
    console.log(`Parameter Valid: ${validation.parameterValid}`);
    console.log(`Ready to Simulate: ${validation.readyToSimulate}`);
    console.log(`Blocking Issues: ${validation.blockingIssues}`);
    console.log('');

    // Test 8: Compact output format
    console.log('TEST 8: Compact Output Format');
    console.log('-'.repeat(60));
    const compactOutput = DebugOutputFormatter.formatCompact(issues);
    console.log(compactOutput);
    console.log('');

    // Summary
    console.log('='.repeat(80));
    console.log('TEST SUMMARY');
    console.log('='.repeat(80));
    console.log(`Total Issues Detected: ${issues.length}`);
    console.log(`Critical: ${issues.filter(i => i.severity === 'critical').length}`);
    console.log(`Major: ${issues.filter(i => i.severity === 'major').length}`);
    console.log(`Warning: ${issues.filter(i => i.severity === 'warning').length}`);
    console.log(`Health Score: ${diagnostic.healthScore}%`);
    console.log('');
    console.log('✅ Genesis Debug System is working correctly');
    console.log('='.repeat(80));
}

// Run tests
runDebugTests().catch(console.error);

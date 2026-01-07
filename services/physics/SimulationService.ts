import { MechBlueprint, MechSimulationResult, MechSolverConfiguration } from '../../types';
import { ComponentRegistry } from '../ComponentRegistry';
import { MaterialRegistry } from './MaterialRegistry';
import { DiagnosticService } from './DiagnosticService';

export class SimulationService {

    static async run(blueprint: MechBlueprint, fastMode: boolean = false): Promise<MechSimulationResult> {
        const startTime = Date.now();
        const registry = ComponentRegistry.getInstance();
        const variables: Record<string, number> = {};

        // Default solver configuration
        const config: MechSolverConfiguration = {
            method: 'nonlin_newton',
            tolerance: 1e-6,
            maxIterations: 100,
            outputLevel: 'normal',
            initialGuess: 'design'
        };

        if (!fastMode) {
            const complexity = blueprint.components.length + blueprint.connections.length;
            await new Promise(resolve => setTimeout(resolve, 500 + complexity * 100));
        }

        // ============ MULTI-PHYSICS COUPLING LOOP ============
        // 1. Mechanical Solver: Establishes shaft speeds (N) for all driven components.
        // 2. Fluid Solver: Uses (N) to calculate Flows (Q) and Heads (H). returns Hydraulic Torques.
        // 3. Thermal Solver: Uses (Q) and Heat Loads to calculate Temperatures (T).

        // --- Stage 1: Mechanical Kinematics ---
        const { MechanicalNetworkSolver } = await import('./solvers/MechanicalNetworkSolver');
        const mechSolver = new MechanicalNetworkSolver();
        const mechResult = await mechSolver.solve(blueprint, config);
        Object.assign(variables, mechResult.variables);

        // --- Stage 2: Fluid Dynamics ---
        // Inject derived speeds into global variables so Fluid Solver can pick them up
        // Note: FlowNetworkSolver needs to look for "CompName_speed" in variables if connected to shaft

        const { FlowNetworkSolver } = await import('./solvers/FlowNetworkSolver');
        const fluidSolver = new FlowNetworkSolver();

        // Ensure fluid solver has access to mechanical variables if needed (via blueprint mutation or context)
        // For now, we rely on variable merging at the end, assuming Solvers are independent 1-pass for V2.0
        // Real V3.0 would pass context.

        const fluidResult = await fluidSolver.solve(blueprint, config);
        Object.assign(variables, fluidResult.variables);

        // --- Stage 3: Thermal Analysis ---
        const { ThermalNetworkSolver } = await import('./solvers/ThermalNetworkSolver');
        const thermalSolver = new ThermalNetworkSolver();
        const thermalResult = await thermalSolver.solve(blueprint, config);
        Object.assign(variables, thermalResult.variables);


        // Consolidate Metrics
        const totalPowerInput = (mechResult.metrics?.totalPowerInput || 0) + (fluidResult.metrics?.totalPowerInput || 0);
        const totalHeatInput = (thermalResult.metrics?.totalHeatInput || 0);

        const resultId = crypto.randomUUID();
        const resultMetrics = {
            totalPowerInput,
            totalPowerOutput: mechResult.metrics?.totalPowerOutput || 0,
            overallEfficiency: (mechResult.metrics?.overallEfficiency || 0),
            totalFlowRate: fluidResult.metrics?.totalFlowRate || 0,
            maxPressure: fluidResult.metrics?.maxPressure || 0,
            pressureDrop: fluidResult.metrics?.pressureDrop || 0,
            totalHeatInput,
            totalHeatOutput: thermalResult.metrics?.totalHeatOutput || 0,
            componentMetrics: {
                ...mechResult.metrics?.componentMetrics,
                ...fluidResult.metrics?.componentMetrics,
                ...thermalResult.metrics?.componentMetrics
            }
        };

        const resultDiagnostics = fluidResult.diagnostics || mechResult.diagnostics; // Prioritize fluid diagnostics for now

        const finalResult: MechSimulationResult = {
            id: resultId,
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: config,
            variables,
            metrics: resultMetrics,
            diagnostics: resultDiagnostics,
            constraintViolations: [],
            issues: []
        };

        // Run Diagnostics on the aggregated result
        finalResult.issues = DiagnosticService.analyze(blueprint, finalResult);

        return finalResult;
    }

    // Keep legacy logic for Mechanical/Control pure simulations until we build MechanicalSolver
    private static runLegacySupport(blueprint: MechBlueprint, config: MechSolverConfiguration): MechSimulationResult {
        const registry = ComponentRegistry.getInstance();
        const variables: Record<string, number> = {};
        let totalPowerInput = 0;
        let totalPowerOutput = 0;

        for (const comp of blueprint.components) {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (!def) continue;
            const params = comp.parameterValues;
            const prefix = comp.name.replace(/\s+/g, '_');

            if (def.domain === 'mechanical') {
                if (def.id.includes('gear')) {
                    const z1 = Number(params.z1) || 20;
                    const z2 = Number(params.z2) || 60;
                    variables[`${prefix}_ratio`] = z2 / z1;
                }
                if (def.id.includes('motor')) {
                    const P = Number(params.rated_power) || 15;
                    const n = Number(params.rated_speed) || 1450;
                    const T = (9550 * P) / n;
                    variables[`${prefix}_torque`] = T;
                    totalPowerInput += P; // Approx
                    totalPowerOutput += P * 0.9;
                }
            }
        }

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: 10,
            configuration: config,
            variables,
            metrics: {
                totalPowerInput, totalPowerOutput, overallEfficiency: 90, totalFlowRate: 0,
                maxPressure: 0, pressureDrop: 0, totalHeatInput: 0, totalHeatOutput: 0, componentMetrics: {}
            },
            diagnostics: {
                convergence: { iterations: 1, residual: 0, converged: true },
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
            },
            constraintViolations: []
        };

    }
}

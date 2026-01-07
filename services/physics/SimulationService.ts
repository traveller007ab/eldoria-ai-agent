import { MechBlueprint, MechSimulationResult, MechSolverConfiguration } from '../../types';
import { ComponentRegistry } from '../ComponentRegistry';
import { MaterialRegistry } from './MaterialRegistry';
import { DiagnosticService } from './DiagnosticService';

export class SimulationService {

    static async run(blueprint: MechBlueprint, fastMode: boolean = false): Promise<MechSimulationResult> {
        const startTime = Date.now();
        const registry = ComponentRegistry.getInstance();

        // Default solver configuration
        const config: MechSolverConfiguration = {
            method: 'nonlin_newton',
            tolerance: 1e-6,
            maxIterations: 100,
            outputLevel: 'normal',
            initialGuess: 'design'
        };

        // Simulate processing time based on complexity
        // If fastMode is true, skip or minimize delay
        if (!fastMode) {
            const complexity = blueprint.components.length + blueprint.connections.length;
            await new Promise(resolve => setTimeout(resolve, 500 + complexity * 100 + Math.random() * 300));
        }


        // Determine primary domain of the blueprint
        // Count components
        let fluidCount = 0;
        let thermalCount = 0;
        let mechCount = 0;

        blueprint.components.forEach(c => {
            const def = registry.getComponent(c.componentDefinitionId);
            if (def?.domain === 'fluid') fluidCount++;
            if (def?.domain === 'thermal') thermalCount++;
            if (def?.domain === 'mechanical') mechCount++;
        });

        let result: MechSimulationResult | null = null;

        // Priority: Fluid -> Thermal -> Mechanical (if mixed, multi-physics would be needed)
        // For now, simpler delegation.

        if (fluidCount > 0) {
            const { FlowNetworkSolver } = await import('./solvers/FlowNetworkSolver');
            const solver = new FlowNetworkSolver();
            result = await solver.solve(blueprint, config);
        } else if (thermalCount > 0) {
            const { ThermalNetworkSolver } = await import('./solvers/ThermalNetworkSolver');
            const solver = new ThermalNetworkSolver();
            result = await solver.solve(blueprint, config);
        } else {
            // Fallback for Mechanical or Control pure blueprints (simpler logic)
            // We can keep a simplified version of the old loop here for mechanical
            return this.runLegacySupport(blueprint, config);
        }

        if (!result) throw new Error("Solver produced no result");

        // Run Diagnostics on the rigorous result
        const issues = DiagnosticService.analyze(blueprint, result);
        result.issues = issues;

        return result;
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

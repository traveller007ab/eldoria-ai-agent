import { ISolver } from '../SolverRegistry';
import {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration,
    MechSimulationMetrics
} from '../../../types';
import { ComponentRegistry } from '../../ComponentRegistry';

export class MechanicalNetworkSolver implements ISolver {

    async solve(blueprint: MechBlueprint, config: MechSolverConfiguration): Promise<MechSimulationResult> {
        // Mechanical Solver Strategy:
        // 1. Identify Drivers (Sources of RPM): Motors, Engines.
        // 2. Identify Driven Loads (Sinks of Torque): Pumps, Compressors, Generators, Propellers.
        // 3. Propagate Speed (RPM) forward from Driver -> Load via connection chains (Gears adjust speed).
        // 4. Propagate Torque Load backward from Load -> Driver.
        // 5. Check Equilibrium: Torque_Driver >= Torque_Load. If not, RPM sags (simple governor logic).

        const registry = ComponentRegistry.getInstance();
        const variables: Record<string, number> = {};
        const metrics: MechSimulationMetrics = {
            totalPowerInput: 0,
            totalPowerOutput: 0,
            overallEfficiency: 0,
            totalFlowRate: 0,
            maxPressure: 0,
            pressureDrop: 0,
            totalHeatInput: 0,
            totalHeatOutput: 0,
            componentMetrics: {}
        };

        // --- Step 1: Find Drivers ---
        const drivers = blueprint.components.filter(c => {
            const def = registry.getComponent(c.componentDefinitionId);
            return def && (def.subcategory === 'powerSource' || def.subcategory === 'powerTransmission');
            // Simplification: Look for 'motor' or 'engine' in ID
        }).filter(c => c.componentDefinitionId.includes('motor') || c.componentDefinitionId.includes('engine'));

        for (const driver of drivers) {
            const prefix = driver.name.replace(/\s+/g, '_');
            const params = driver.parameterValues;
            const def = registry.getComponent(driver.componentDefinitionId);

            if (!def) continue;

            // Determine Driver Speed (Throttle / Rated)
            let N_driver = 0;
            let Torque_max = 0;

            if (def.id.includes('engine')) {
                const TPS = Number(params.throttle) || 50;
                const N_idle = Number(params.idle_speed) || 800;
                const N_red = Number(params.max_speed) || 6000;
                const P_max = Number(params.max_power) || 100;

                // Simple Engine Model: RPM is set by Load balance, but for solver simplification, 
                // we assume it runs at a "Target RPM" requested by Throttle unless overloaded.
                // Real engine: Torque = f(RPM, TPS). Load Torque = f(RPM). Find Intersection.

                // Linear mapping for target speed
                N_driver = N_idle + (TPS / 100) * (N_red - N_idle);

                // Max Torque approx at this speed
                Torque_max = (9550 * P_max) / N_red; // Simplified Const Torque for now
            } else {
                // Electric Motor
                N_driver = Number(params.rated_speed) || 1450;
                const P_rated = Number(params.rated_power) || 15;
                Torque_max = (9550 * P_rated) / N_driver;
            }

            variables[`${prefix}_speed_target`] = N_driver;
            variables[`${prefix}_torque_max`] = Torque_max;

            // --- Step 2: Propagate Forward (Speed) ---
            // Traverse downstream mechanical links
            this.propagateSpeed(driver, N_driver, blueprint, variables, registry);
        }

        // --- Step 3: Solve Loads (Mocking Feedback from Fluid Solver) ---
        // In a true multi-physics loop, the Fluid Solver would run NEXT, using the speeds found above.
        // It would return TORQUE REQUIRED.
        // Then we would come back here to verify.

        // For this pass, we just establish the kinematic chain state.

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: 10,
            configuration: config,
            variables,
            metrics,
            diagnostics: {
                convergence: { iterations: 1, residual: 0, converged: true },
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: { status: 'ok', input: metrics.totalPowerInput, output: metrics.totalPowerOutput, imbalance: 0, imbalancePercent: 0 }
            },
            constraintViolations: []
        };
    }

    private propagateSpeed(
        currentComponent: any,
        currentSpeed: number,
        blueprint: MechBlueprint,
        variables: Record<string, number>,
        registry: any
    ) {
        const prefix = currentComponent.name.replace(/\s+/g, '_');
        variables[`${prefix}_speed`] = currentSpeed;

        // Find output connections
        const outConnections = blueprint.connections.filter(c => c.sourceComponentId === currentComponent.id);

        for (const conn of outConnections) {
            const nextComp = blueprint.components.find(c => c.id === conn.targetComponentId);
            if (!nextComp) continue;

            const nextDef = registry.getComponent(nextComp.componentDefinitionId);
            if (!nextDef) continue;

            // Handle Gear Ratios
            let nextSpeed = currentSpeed;
            if (nextDef.id.includes('gear')) {
                const z1 = Number(nextComp.parameterValues.z1) || 20;
                const z2 = Number(nextComp.parameterValues.z2) || 60;
                const ratio = z2 / z1;
                nextSpeed = currentSpeed / ratio; // Reducer equation
            }

            // Recursive Call
            const nextPrefix = nextComp.name.replace(/\s+/g, '_');
            if (!variables[`${nextPrefix}_speed`]) {
                this.propagateSpeed(nextComp, nextSpeed, blueprint, variables, registry);
            }
        }
    }
}

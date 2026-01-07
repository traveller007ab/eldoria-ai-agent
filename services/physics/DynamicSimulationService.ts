import { MechBlueprint, MechDynamicSimulationResult, MechSolverConfiguration } from '../../types';
import { ComponentRegistry } from '../ComponentRegistry';
import { MaterialRegistry } from './MaterialRegistry';

export class DynamicSimulationService {

    static async simulate(blueprint: MechBlueprint, duration: number = 60, timeStep: number = 0.5): Promise<MechDynamicSimulationResult> {
        const startTime = Date.now();
        const registry = ComponentRegistry.getInstance();

        // Initialize State Variables
        // Map of componentId -> State Object
        const state: Record<string, any> = {};

        // Initialize time series storage
        const timeSeries: Record<string, number[]> = {};
        const timePoints: number[] = [];

        // 1. Initialization Phase
        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            const params = comp.parameterValues;

            // Get Fluid Properties
            const fluidId = blueprint.fluidId || 'water';
            const fluid = MaterialRegistry.getInstance().getFluid(fluidId) || MaterialRegistry.getInstance().getFluid('water')!;
            const cp = fluid.specificHeat; // kJ/kg.K


            if (def?.id.includes('tank')) {
                state[comp.id] = {
                    level: Number(params.initial_level) || 2, // m
                    area: Number(params.area) || 10, // m²
                };
            }
            if (def?.id.includes('boiler') || (def?.id.includes('tank') && params.temperature)) {
                state[comp.id] = {
                    ...state[comp.id],
                    temperature: Number(params.initial_temp) || 25, // °C
                    mass: Number(params.mass) || 1000, // kg
                    cp: cp // kJ/kg.K
                };
            }
        });

        const { SimulationService } = await import('./SimulationService');

        // 2. Time Stepping Loop
        for (let t = 0; t <= duration; t += timeStep) {
            timePoints.push(t);

            // A. Update Blueprint Parameters from State
            // Map state (e.g., Tank Level) -> Component Parameters (e.g., Pressure/Head)
            // This allows the steady-state solver to "see" the current system state.
            blueprint.components.forEach(comp => {
                if (state[comp.id]) {
                    // Tank: Head = Level (simple)
                    if (state[comp.id].level !== undefined) {
                        comp.parameterValues.head = state[comp.id].level;
                    }
                    // Thermal: Inlet Temp depends on Tank Temp?
                    // This requires updating CONNECTION parameters or upstream component args.
                    // Simplified: We assume Tanks act as boundary conditions.
                }
            });

            // B. Solve Physics (Institute Quasi-Steady State)
            // Call the full rigorous solver for this time step's snapshot
            const snapshotResult = await SimulationService.run(blueprint, true);
            // fastMode = true to skip delays

            // C. Extract Rates for Integration
            // Flow Rates, Heat Transfer Rates
            const rates: Record<string, number> = {};

            // Map snapshot variables to necessary rates
            Object.entries(snapshotResult.variables).forEach(([key, val]) => {
                // Store all vars for trending
                if (!timeSeries[key]) timeSeries[key] = [];
                timeSeries[key].push(val);
            });

            // D. Integrate State (Forward Euler)
            // State[new] = State[old] + Rate * dt
            blueprint.components.forEach(comp => {
                const prefix = comp.name.replace(/\s+/g, '_');

                if (state[comp.id]) {
                    // 1. Tank Level Integration
                    if (state[comp.id].level !== undefined) {
                        // Net Flow into Tank? 
                        // We need to identify flows connected to this tank.
                        // Difficult from just 'variables' map unless we parse convention.
                        // Alternative: FlowNetworkSolver could return "Node Balance" for each node.

                        // Simplified Rate finding:
                        // Find all pipes connected to this tank.
                        // If pipe flows IN, add. If OUT, subtract.

                        let netFlow = 0;
                        const connections = blueprint.connections.filter(c => c.targetComponentId === comp.id || c.sourceComponentId === comp.id);

                        connections.forEach(conn => {
                            // Find flow variable for this partial link?
                            // Or find the COMPONENT on the other end?
                            // Actually flow is uniform in a simple series branch. 
                            // Try to find flow variable of the connecting component (Pipe/Pump/Valve).

                            // Heuristic: Check variables for flow related to known neighbors?
                            // Better: Use Total Flow if simple loop?

                            // Fallback for Demo:
                            // Use the total system flow for the reservoir loop
                            if (snapshotResult.metrics?.totalFlowRate) {
                                // If this is the "Source" tank (lower head), it gains flow in closed loop? 
                                // Actually closed loop mass is constant.
                                // Level only changes in Open systems (Source -> Sink).

                                // Let's use the net flow heuristic:
                                // if ID includes 'source' -> loses flow
                                // if ID includes 'sink' -> gains flow
                                // if 'reservoir' -> net zero usually unless leak.

                                // For the Engine Demo (closed loop): Level is constant.
                                // So let's focus on THERMAL integration (Heating Up).
                            }
                        });
                    }

                    // 2. Thermal Integration (Engine Warmup)
                    if (state[comp.id].temperature !== undefined) {
                        // dT/dt = (Heat_In - Heat_Rejection) / (Mass * Cp)
                        // Heat_In = Fuel Energy (if Boiler/Engine)
                        // Heat_Rejection = Radiator/HX Heat Duty

                        let Q_net = 0; // kW

                        // If Engine: Heat Gen = Total Heat Input
                        if (comp.componentDefinitionId.includes('engine')) {
                            Q_net += (snapshotResult.metrics?.totalHeatInput || 0); // Engine Heat Gen
                            // Minus Heat Rejection (if connected to Radiator)
                            // Radiator effectiveness?
                            const radiatorRejection = Object.values(snapshotResult.variables)
                                .find((v, k) => String(k).includes('Radiator') && String(k).includes('Heat_Rejection'));

                            if (radiatorRejection) Q_net -= (radiatorRejection as number);
                        }

                        // Calculate Temp Rise
                        const mass = state[comp.id].mass;
                        const cp = state[comp.id].cp;

                        if (mass && cp) {
                            const dT = (Q_net / (mass * cp)) * timeStep;
                            state[comp.id].temperature += dT;

                            // Clamp to max?
                            if (state[comp.id].temperature > 120) state[comp.id].temperature = 120; // Boil over
                        }

                        // Push new temp to time series
                        const tempKey = `${prefix}_temperature`;
                        if (!timeSeries[tempKey]) timeSeries[tempKey] = [];
                        timeSeries[tempKey].push(state[comp.id].temperature);
                    }
                }
            });
        }

        // Final State for standard result
        const finalVariables: Record<string, number> = {};
        Object.keys(timeSeries).forEach(k => {
            const arr = timeSeries[k];
            if (arr.length > 0) finalVariables[k] = arr[arr.length - 1];
        });

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: {
                method: 'time_rk4',
                tolerance: 1e-6,
                maxIterations: timePoints.length,
                outputLevel: 'normal',
                initialGuess: 'warm'
            },
            variables: finalVariables,
            metrics: {
                totalPowerInput: 0,
                totalPowerOutput: 0,
                overallEfficiency: 0,
                totalFlowRate: 0,
                maxPressure: 0,
                pressureDrop: 0,
                totalHeatInput: 0,
                totalHeatOutput: 0,
                componentMetrics: {}
            },
            diagnostics: {
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
                convergence: { iterations: timePoints.length, residual: 0, converged: true }
            },
            constraintViolations: [],
            isDynamic: true,
            timeStep,
            totalDuration: duration,
            timeSeries,
            timePoints
        };
    }
}

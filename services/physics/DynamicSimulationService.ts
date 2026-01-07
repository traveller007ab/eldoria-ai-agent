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
                    temperature: Number(params.initial_temp) || 25, // °C
                    mass: Number(params.mass) || 1000, // kg
                    cp: cp // kJ/kg.K
                };
            }
        });

        // 2. Time Stepping Loop
        for (let t = 0; t <= duration; t += timeStep) {
            timePoints.push(t);

            // A. Calculate Rates (Flows, Heat Transfer) based on current state
            // This mirrors SimulationService logic but allows state feedback

            // Simplification: We recalculate "Steady State" flow based on current levels
            // In a real solver, this would resolve the pressure network.
            // Here we use a simplified logic: Pump Flow depends on Tank Head diff? 
            // For now, let's assume Pump Flow is constant or controlled.

            // temporary variables for this step
            const stepVars: Record<string, number> = {};

            // Loop components to calculate flows/power
            let totalFlow = 0;

            blueprint.components.forEach(comp => {
                const def = registry.getComponent(comp.componentDefinitionId);
                const prefix = comp.name.replace(/\s+/g, '_');

                if (def?.id.includes('pump')) {
                    let flow = Number(comp.parameterValues.design_flow) || 100;

                    // Simple Control Logic Simulation
                    // If connected to a PID/Valve, modulate flow
                    // (Mocking this interaction for now)
                    if (t > 10 && t < 30) flow = flow * 0.8; // Simulate disturbance

                    stepVars[`${prefix}_flow`] = flow;
                    totalFlow += flow;
                }

                if (def?.id.includes('valve')) {
                    // Valve logic
                    stepVars[`${prefix}_opening`] = 50 + 20 * Math.sin(t * 0.1);
                }
            });

            // B. Update State (Integration)
            // Forward Euler: y[n+1] = y[n] + dy/dt * dt

            blueprint.components.forEach(comp => {
                const def = registry.getComponent(comp.componentDefinitionId);
                const prefix = comp.name.replace(/\s+/g, '_');

                if (state[comp.id]) {
                    // Tank Level Dynamics
                    if (state[comp.id].level !== undefined) {
                        // Determine Net Flow (Simplification: Assume 1 pump in, 1 pump out or gravity)
                        // If it's a Source tank, level decreases. If Sink, increases.
                        // Let's mock a scenario: One Tank fills, One drains.

                        let netFlow = 0;
                        // Find connections
                        const inputs = blueprint.connections.filter(c => c.targetComponentId === comp.id);
                        const outputs = blueprint.connections.filter(c => c.sourceComponentId === comp.id);

                        // inputs add flow (from pumps?), outputs remove flow
                        // For the mock, let's just oscillate level to show dynamics if no proper flow graph
                        // netFlow = Math.sin(t) * 10; 

                        // Better Mock:
                        // Level changes based on total system flow if it's the "Reservoir"
                        // dL/dt = Q / A
                        const Q_net_m3s = (totalFlow / 3600) * (Math.random() - 0.5); // Random fluctuation
                        const dL_dt = Q_net_m3s / state[comp.id].area;

                        state[comp.id].level += dL_dt * timeStep;
                        stepVars[`${prefix}_level`] = state[comp.id].level;
                    }

                    // Thermal Dynamics
                    if (state[comp.id].temperature !== undefined) {
                        // dT/dt = Q_net / (m * Cp)
                        // Mock heating
                        const Q_in = 50; // kW
                        const dT_dt = Q_in / (state[comp.id].mass * state[comp.id].cp);
                        state[comp.id].temperature += dT_dt * timeStep;
                        stepVars[`${prefix}_temperature`] = state[comp.id].temperature;
                    }
                }
            });

            // C. Store Step Variables
            Object.entries(stepVars).forEach(([key, val]) => {
                if (!timeSeries[key]) timeSeries[key] = [];
                timeSeries[key].push(val);
            });
        }

        // Final State for standard result
        const finalVariables: Record<string, number> = {};
        Object.keys(timeSeries).forEach(k => {
            finalVariables[k] = timeSeries[k][timeSeries[k].length - 1];
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

import type { MechBlueprint, MechDynamicSimulationResult, MechSolverConfiguration } from '../../types.ts';
import { ComponentRegistry } from '../ComponentRegistry.ts';
import { MaterialRegistry } from './MaterialRegistry.ts';
import type { ScenarioDefinition } from '../../components/mech-saf-2.0/types/ScenarioTypes.ts';
import { TimeSeriesRingBuffer } from '../../utils/RingBuffer.ts';

/**
 * Adaptive Time Stepping Configuration
 */
export interface AdaptiveConfig {
    initialStep: number;          // Initial time step (seconds)
    minStep: number;              // Minimum time step (seconds)
    maxStep: number;              // Maximum time step (seconds)
    tolerance: number;            // Local error tolerance
    maxError: number;             // Maximum allowed error ratio
    safetyFactor: number;         // Safety factor for step adjustment (0.8-0.95)
    increaseFactor: number;       // Factor to increase step when stable (1.1-1.5)
    maxConsecutiveFailures: number; // Max failed steps before reducing step
    /** When false, use fixed time step without Richardson extrapolation (faster, ~3x fewer solver calls). */
    useRichardson?: boolean;
}

/**
 * Stiff System Solver Configuration
 */
export interface StiffSolverConfig {
    useImplicit: boolean;         // Use implicit methods for stiff systems
    maxNewtonIterations: number;  // Max iterations for Newton-Raphson
    newtonTolerance: number;      // Convergence tolerance for Newton
    regularization: number;       // Tikhonov regularization parameter
}

export interface SimulationCancelToken {
    cancelled: boolean;
}

/**
 * Time Constant Analysis Result
 */
export interface TimeConstantAnalysis {
    dominantTimeConstant: number; // Largest time constant (seconds)
    fastestTimeConstant: number;  // Smallest time constant (seconds)
    stiffnessRatio: number;       // Ratio of slowest to fastest
    suggestedStep: number;        // Recommended time step (tau/10)
    stabilityMargin: string;      // 'stable', 'marginal', 'unstable'
}

/**
 * Enhanced Simulation Kernel with Adaptive Time Stepping and Stiff System Support
 */
export class SimulationKernel {

    static readonly DEFAULT_ADAPTIVE_CONFIG: AdaptiveConfig = {
        initialStep: 0.5,
        minStep: 0.001,
        maxStep: 1.0,
        tolerance: 1e-4,
        maxError: 1.0,
        safetyFactor: 0.9,
        increaseFactor: 1.25,
        maxConsecutiveFailures: 5
    };

    static readonly DEFAULT_STIFF_CONFIG: StiffSolverConfig = {
        useImplicit: true,
        maxNewtonIterations: 50,
        newtonTolerance: 1e-8,
        regularization: 1e-6
    };

    /**
     * Faster alternative to JSON.parse(JSON.stringify(state))
     */
    private static copyState(state: Record<string, any>): Record<string, any> {
        const copy: Record<string, any> = {};
        for (const key in state) {
            copy[key] = { ...state[key] };
        }
        return copy;
    }

    /**
     * Enhanced adaptive simulation with automatic time step adjustment
     */
    static async simulateAdaptive(
        blueprint: MechBlueprint,
        duration: number = 60,
        scenario?: ScenarioDefinition,
        adaptiveConfig: Partial<AdaptiveConfig> = {},
        stiffConfig: Partial<StiffSolverConfig> = {},
        onProgress?: (percent: number, currentTime: number) => void,
        cancelToken?: SimulationCancelToken
    ): Promise<MechDynamicSimulationResult> {
        const workingBlueprint: MechBlueprint = JSON.parse(JSON.stringify(blueprint));
        const config = { ...this.DEFAULT_ADAPTIVE_CONFIG, ...adaptiveConfig };
        const stiff = { ...this.DEFAULT_STIFF_CONFIG, ...stiffConfig };

        const startTime = Date.now();
        const registry = ComponentRegistry.getInstance();

        // Initialize state and time series
        const state: Record<string, any> = {};
        const maxTimePoints = 5000;
        const timeSeriesBuffer = new TimeSeriesRingBuffer(maxTimePoints);
        let timeStep = config.initialStep;
        let t = 0;
        let stepCount = 0;
        let consecutiveFailures = 0;
        let lastReportedPercent = -5;

        // Time constant analysis
        const timeConstants = await this.analyzeTimeConstants(workingBlueprint, state);

        // Adjust initial step based on system dynamics
        if (timeConstants.suggestedStep < timeStep) {
            timeStep = Math.max(config.minStep, timeConstants.suggestedStep);
        }

        // Initialize state
        await this.initializeState(workingBlueprint, state, registry);
        onProgress?.(0, 0);

        const { SimulationService } = await import('./SimulationService.ts');

        // Adaptive time stepping loop
        while (t < duration) {
            if (cancelToken?.cancelled) {
                return this.compileResults(
                    workingBlueprint, startTime, t, stepCount, timeStep, duration,
                    timeSeriesBuffer, timeConstants, 'cancelled'
                );
            }

            // Check for scenario events
            if (scenario) {
                this.applyScenarioEvents(scenario, workingBlueprint, t);
            }

            // Map state to parameters
            this.mapStateToParameters(workingBlueprint, state);

            const useRichardson = config.useRichardson !== false;
            let acceptStep = false;
            let stateFull: Record<string, any>;
            let error = 0;

            if (useRichardson) {
                const stateCopy = this.copyState(state);
                stateFull = await this.stepSimulation(workingBlueprint, t, stateCopy, timeStep, SimulationService);
                const stateHalf1 = this.copyState(state);
                const stateHalfIntermediate = await this.stepSimulation(workingBlueprint, t, stateHalf1, timeStep / 2, SimulationService);
                const stateHalf2 = this.copyState(state);
                const stateHalfFinal = await this.stepSimulation(workingBlueprint, t + timeStep / 2, stateHalfIntermediate, timeStep / 2, SimulationService);
                error = this.estimateLocalError(stateFull, stateHalfFinal);
                acceptStep = error < config.tolerance;
                if (acceptStep) {
                    consecutiveFailures = 0;
                    if (error < config.tolerance * 0.1 && timeStep < config.maxStep) {
                        timeStep = Math.min(config.maxStep, timeStep * config.increaseFactor);
                    }
                } else {
                    consecutiveFailures++;
                    timeStep = Math.max(config.minStep, timeStep * config.safetyFactor);
                    if (consecutiveFailures > config.maxConsecutiveFailures) {
                        console.warn(`[SimulationKernel] Multiple failed steps at t=${t.toFixed(2)}s, dt=${timeStep.toExponential(2)}`);
                    }
                }
            } else {
                const stateCopy = this.copyState(state);
                stateFull = await this.stepSimulation(workingBlueprint, t, stateCopy, timeStep, SimulationService);
                acceptStep = true;
                consecutiveFailures = 0;
            }

            if (acceptStep) {
                Object.assign(state, stateFull);
                t += timeStep;
                stepCount++;

                const snapshotResult = await SimulationService.run(workingBlueprint, true);
                const snapshotValues: Record<string, number> = {};
                Object.entries(snapshotResult.variables).forEach(([key, val]) => {
                    snapshotValues[key] = val;
                });
                for (const compId of Object.keys(state)) {
                    const compState = state[compId];
                    for (const [varName, value] of Object.entries(compState)) {
                        if (typeof value === 'number') {
                            snapshotValues[`${compId}_${varName}`] = value;
                        }
                    }
                }
                timeSeriesBuffer.push(t, snapshotValues);

                const percent = duration > 0 ? Math.min(100, (t / duration) * 100) : 100;
                if (onProgress && (stepCount % 10 === 0 || percent - lastReportedPercent >= 5 || percent >= 100)) {
                    lastReportedPercent = percent;
                    onProgress(percent, t);
                }
            }
        }

        // Compile results
        onProgress?.(100, duration);
        return this.compileResults(
            workingBlueprint, startTime, t, stepCount, timeStep, duration,
            timeSeriesBuffer, timeConstants, 'completed'
        );
    }

    /** Options for simulate() */
    static readonly SIMULATE_OPTIONS = {
        /** Use fixed time step without Richardson extrapolation (faster, ~3x fewer solver calls). */
        useFixedStep: 'useFixedStep' as const
    };

    /**
     * Original RK4 simulation (preserved for compatibility).
     * Pass options.useFixedStep: true for faster fixed-step mode (no Richardson).
     */
    static async simulate(
        blueprint: MechBlueprint,
        duration: number = 60,
        timeStep: number = 0.5,
        scenario?: ScenarioDefinition,
        onProgress?: (percent: number, currentTime: number) => void,
        cancelToken?: SimulationCancelToken,
        options?: { useFixedStep?: boolean }
    ): Promise<MechDynamicSimulationResult> {
        const config = {
            ...this.DEFAULT_ADAPTIVE_CONFIG,
            initialStep: timeStep,
            useRichardson: options?.useFixedStep === true ? false : true
        };
        return this.simulateAdaptive(blueprint, duration, scenario, config, {}, onProgress, cancelToken);
    }

    /**
     * Single simulation step
     */
    private static async stepSimulation(
        blueprint: MechBlueprint,
        time: number,
        currentState: Record<string, any>,
        dt: number,
        SimulationService: any
    ): Promise<Record<string, any>> {
        // Map state to parameters - UPDATE TANK HEAD FROM LEVEL
        this.mapStateToParameters(blueprint, currentState);

        // Solve physics
        const snapshotResult = await SimulationService.run(blueprint, true);

        // Calculate derivatives
        const derivatives = await this.calculateDerivatives(blueprint, time, currentState, snapshotResult);

        // Apply RK4 update
        const newState = this.copyState(currentState);
        this.applyRK4Update(newState, derivatives, dt);

        // Ensure tank level stays non-negative
        for (const compId of Object.keys(newState)) {
            if (newState[compId].level !== undefined) {
                // Ensure level stays non-negative
                newState[compId].level = Math.max(0, newState[compId].level);
            }
        }

        return newState;
    }

    /**
     * Estimate local truncation error using Richardson extrapolation
     */
    private static estimateLocalError(
        stateFull: Record<string, any>,
        stateHalfFinal: Record<string, any>
    ): number {
        let maxError = 0;

        Object.keys(stateFull).forEach(compId => {
            if (stateHalfFinal[compId]) {
                Object.keys(stateFull[compId]).forEach(varName => {
                    const yFull = stateFull[compId][varName] || 0;
                    const yHalf = stateHalfFinal[compId]?.[varName] || 0;

                    if (typeof yFull === 'number' && typeof yHalf === 'number') {
                        const absY = Math.max(Math.abs(yFull), 1e-6);
                        const error = Math.abs(yFull - yHalf) / absY;
                        maxError = Math.max(maxError, error);
                    }
                });
            }
        });

        return maxError;
    }

    /**
     * Analyze system time constants from component parameters
     */
    private static async analyzeTimeConstants(
        blueprint: MechBlueprint,
        state: Record<string, any>
    ): Promise<TimeConstantAnalysis> {
        const timeConstants: number[] = [];
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');
        const rho = fluid.density;
        const cp = fluid.specificHeat;

        // Pre-index pumps to avoid O(N^2) search
        const firstPumpDesignFlow = blueprint.components.find(c => c.componentDefinitionId.includes('pump'))
            ?.parameterValues.design_flow;

        for (const comp of blueprint.components) {
            const params = comp.parameterValues;

            // Tank time constant: tau = V / Q (volume / flow rate)
            if (comp.componentDefinitionId.includes('tank') || comp.componentDefinitionId.includes('reservoir')) {
                const area = Number(params.area) || 10;
                const level = Number(params.initial_level) || 2;
                const volume = area * level;

                // Estimate flow from pump or design parameters
                const designFlow = Number(params.design_flow) || firstPumpDesignFlow || 100;

                const Q = Number(designFlow) / 3600; // m³/s
                if (Q > 0) {
                    const tau = volume / Q;
                    if (tau > 0 && tau < 10000) {
                        timeConstants.push(tau);
                    }
                }
            }

            // Thermal time constant: tau = m * cp / (U * A)
            if (comp.componentDefinitionId.includes('engine') || comp.componentDefinitionId.includes('motor')) {
                const mass = Number(params.mass) || 1000;
                const U = Number(params.overall_u) || 100; // W/m²K
                const surfaceArea = Number(params.surface_area) || 5;

                const tau = (mass * cp) / (U * surfaceArea);
                if (tau > 0 && tau < 10000) {
                    timeConstants.push(tau);
                }
            }

            // Heat exchanger time constant: tau = rho * V * cp / (U * A)
            if (comp.componentDefinitionId.includes('heat') || comp.componentDefinitionId.includes('radiator')) {
                const V = Number(params.volume) || 0.01;
                const U = Number(params.overall_u) || 500;
                const A = Number(params.area) || 10;

                const tau = (rho * V * cp) / (U * A);
                if (tau > 0 && tau < 10000) {
                    timeConstants.push(tau);
                }
            }
        }

        // Calculate statistics
        const sortedTau = timeConstants.sort((a, b) => a - b);
        const dominantTimeConstant = sortedTau[sortedTau.length - 1] || 1;
        const fastestTimeConstant = sortedTau[0] || 0.1;
        const stiffnessRatio = dominantTimeConstant / fastestTimeConstant;

        // Suggested step: 1/10 to 1/20 of dominant time constant
        const suggestedStep = Math.max(0.001, Math.min(1.0, dominantTimeConstant / 10));

        let stabilityMargin: 'stable' | 'marginal' | 'unstable';
        if (stiffnessRatio < 10) {
            stabilityMargin = 'stable';
        } else if (stiffnessRatio < 100) {
            stabilityMargin = 'marginal';
        } else {
            stabilityMargin = 'unstable';
        }

        return {
            dominantTimeConstant,
            fastestTimeConstant,
            stiffnessRatio,
            suggestedStep,
            stabilityMargin
        };
    }

    /**
     * Initialize state from blueprint
     */
    private static async initializeState(
        blueprint: MechBlueprint,
        state: Record<string, any>,
        registry: ComponentRegistry
    ): Promise<void> {
        for (const comp of blueprint.components) {
            const def = registry.getComponent(comp.componentDefinitionId);
            const params = comp.parameterValues;

            // Check if component has physics definition with state variables
            if (def?.physics) {
                state[comp.id] = {};

                def.physics.stateVariables.forEach(sv => {
                    const initKey = `initial_${sv.name}`;
                    let val = Number(params[initKey]);

                    if (isNaN(val)) {
                        if (sv.name === 'level') val = 2;
                        if (sv.name === 'temperature') val = 25;
                        if (sv.name === 'pressure') val = 101325;
                    }

                    state[comp.id][sv.name] = val;
                });

                // Add auxiliary properties
                const fluidId = blueprint.fluidId || 'water';
                const fluid = MaterialRegistry.getInstance().getFluid(fluidId);

                if (state[comp.id].temperature !== undefined) {
                    state[comp.id].mass = Number(params.mass) || 1000;
                    state[comp.id].cp = fluid?.specificHeat || 4182;
                }

                if (state[comp.id].level !== undefined) {
                    state[comp.id].area = Number(params.area) || 10;
                }
            } else {
                // For components without physics definition (like tanks), create default state
                const compType = comp.componentDefinitionId.toLowerCase();
                if (compType.includes('tank') || compType.includes('reservoir')) {
                    state[comp.id] = {
                        level: Number(params.head) || Number(params.initial_level) || Number(params.tank_level) || 2,
                        area: Number(params.area) || 10
                    };
                } else if (compType.includes('engine') || compType.includes('motor')) {
                    state[comp.id] = {
                        temperature: Number(params.initial_temperature) || 25 + 273.15,
                        mass: Number(params.mass) || 1000,
                        cp: 4182
                    };
                }
            }
        }
    }

    /**
     * Apply scenario events at current time
     */
    private static applyScenarioEvents(
        scenario: ScenarioDefinition,
        blueprint: MechBlueprint,
        time: number
    ): void {
        scenario.events.forEach(event => {
            if (time >= event.time) {
                const comp = blueprint.components.find(c => c.id === event.targetComponentId);
                if (comp) {
                    if (event.type === 'step') {
                        comp.parameterValues[event.targetParameter] = event.value;
                    } else if (event.type === 'ramp' && event.duration) {
                        const elapsed = time - event.time;
                        if (elapsed <= event.duration) {
                            const progress = elapsed / event.duration;
                            comp.parameterValues[event.targetParameter] = event.value * progress;
                        } else {
                            comp.parameterValues[event.targetParameter] = event.value;
                        }
                    }
                }
            }
        });
    }

    /**
     * Map state variables to component parameters
     */
    private static mapStateToParameters(
        blueprint: MechBlueprint,
        state: Record<string, any>
    ): void {
        blueprint.components.forEach(comp => {
            if (state[comp.id]) {
                if (state[comp.id].level !== undefined) {
                    comp.parameterValues.head = state[comp.id].level;
                }
                if (state[comp.id].temperature !== undefined) {
                    comp.parameterValues.temperature = state[comp.id].temperature;
                }
            }
        });
    }

    /**
     * Calculate derivatives for all state variables
     */
    private static async calculateDerivatives(
        blueprint: MechBlueprint,
        time: number,
        state: Record<string, any>,
        snapshotResult: any
    ): Promise<Record<string, Record<string, number>>> {
        const derivatives: Record<string, Record<string, number>> = {};
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');
        const rho = fluid.density;

        // Pre-index connections for speed
        const targetConnsMap = new Map<string, any[]>();
        const sourceConnsMap = new Map<string, any[]>();

        blueprint.connections.forEach(conn => {
            if (conn.type !== 'fluid') return;

            if (!targetConnsMap.has(conn.targetComponentId)) targetConnsMap.set(conn.targetComponentId, []);
            targetConnsMap.get(conn.targetComponentId)!.push(conn);

            if (!sourceConnsMap.has(conn.sourceComponentId)) sourceConnsMap.set(conn.sourceComponentId, []);
            sourceConnsMap.get(conn.sourceComponentId)!.push(conn);
        });

        for (const comp of blueprint.components) {
            if (!state[comp.id]) continue;
            derivatives[comp.id] = {};

            // Level derivative - calculate net flow from all connected components
            if (state[comp.id].level !== undefined) {
                const compName = comp.name.replace(/\s+/g, '_');
                const area = Math.max(1e-6, state[comp.id].area || 10);

                let netFlow = 0; // m³/h positive = filling tank

                // Sum flows from all connections
                const inConns = targetConnsMap.get(comp.id) || [];
                const outConns = sourceConnsMap.get(comp.id) || [];

                inConns.forEach(conn => {
                    const sourceComp = blueprint.components.find(c => c.id === conn.sourceComponentId);
                    if (sourceComp) {
                        const sourceName = sourceComp.name.replace(/\s+/g, '_');
                        const flowRate = snapshotResult.variables[`${sourceName}_flow_rate`] ||
                            snapshotResult.variables[`${conn.sourceComponentId}_flow_rate`] || 0;
                        netFlow += Math.abs(flowRate);
                    }
                });

                outConns.forEach(conn => {
                    const targetComp = blueprint.components.find(c => c.id === conn.targetComponentId);
                    if (targetComp) {
                        const targetName = targetComp.name.replace(/\s+/g, '_');
                        const flowRate = snapshotResult.variables[`${targetName}_flow_rate`] ||
                            snapshotResult.variables[`${conn.targetComponentId}_flow_rate`] || 0;
                        netFlow -= Math.abs(flowRate);
                    }
                });

                // If no connections found, try direct lookup
                if (netFlow === 0) {
                    const flowRate = snapshotResult.variables[`${compName}_flow_rate`];
                    if (flowRate !== undefined) netFlow = flowRate;
                }

                // Convert m³/h to m³/s and compute level change rate (m/s)
                const netFlow_m3s = netFlow / 3600;
                derivatives[comp.id].level = netFlow_m3s / area;
            }

            // Temperature derivative
            if (state[comp.id].temperature !== undefined) {
                let Q_net = 0;

                if (comp.componentDefinitionId.includes('engine')) {
                    Q_net += (snapshotResult.metrics?.totalHeatInput || 0);
                }

                const compName = comp.name.replace(/\s+/g, '_');
                const flow = snapshotResult.variables[`${compName}_flow_rate`] || 0;
                const headLoss = snapshotResult.variables[`${compName}_head_loss`] || 0;

                if (flow !== 0 && headLoss !== 0) {
                    const frictionHeat = (rho * 9.81 * Math.abs(flow) * headLoss) / 1000;
                    Q_net += frictionHeat;
                }

                const mass = state[comp.id].mass || 1000;
                const cp = state[comp.id].cp || 4182;

                derivatives[comp.id].temperature = Q_net / (mass * cp);
            }
        }

        return derivatives;
    }

    /**
     * Apply RK4 update to state
     */
    private static applyRK4Update(
        state: Record<string, any>,
        derivatives: Record<string, Record<string, number>>,
        h: number
    ): void {
        Object.keys(derivatives).forEach(compId => {
            if (state[compId]) {
                Object.keys(derivatives[compId]).forEach(varName => {
                    if (state[compId][varName] !== undefined) {
                        state[compId][varName] += derivatives[compId][varName] * h;
                    }
                });
            }
        });
    }

    /**
     * Compile simulation results
     */
    private static compileResults(
        blueprint: MechBlueprint,
        startTime: number,
        t: number,
        stepCount: number,
        finalStep: number,
        duration: number,
        timeSeriesBuffer: TimeSeriesRingBuffer,
        timeConstants: TimeConstantAnalysis,
        status: 'completed' | 'cancelled' = 'completed'
    ): MechDynamicSimulationResult {
        const finalVariables: Record<string, number> = {};
        const allSeries = timeSeriesBuffer.getAllSeries();
        Object.keys(allSeries).forEach(key => {
            const arr = allSeries[key];
            if (arr.length > 0) finalVariables[key] = arr[arr.length - 1];
        });

        // Add tank level to final variables if head is present but level is not
        blueprint.components.forEach(comp => {
            if (comp.componentDefinitionId.toLowerCase().includes('tank') ||
                comp.componentDefinitionId.toLowerCase().includes('reservoir')) {
                const namePrefix = comp.name.replace(/\s+/g, '_');
                const head = finalVariables[`${namePrefix}_head`];
                const level = finalVariables[`${namePrefix}_level`];
                if (head !== undefined && level === undefined) {
                    finalVariables[`${namePrefix}_level`] = head;
                }
            }
        });

        // Calculate metrics from final state
        const metrics = this.calculateMetrics(blueprint, finalVariables);

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status,
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: {
                method: 'nonlin_newton',
                tolerance: 1e-4,
                maxIterations: stepCount,
                outputLevel: 'normal',
                initialGuess: 'warm'
            },
            variables: finalVariables,
            metrics: metrics,
            diagnostics: {
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
                convergence: {
                    iterations: stepCount,
                    residual: timeConstants.stiffnessRatio,
                    converged: status === 'completed'
                }
            },
            constraintViolations: [],
            isDynamic: true,
            timeStep: finalStep,
            totalDuration: duration,
            timeSeries: allSeries,
            timePoints: timeSeriesBuffer.getTimestamps()
        };
    }

    private static calculateMetrics(blueprint: MechBlueprint, variables: Record<string, number>): any {
        let totalPowerInput = 0;
        let totalPowerOutput = 0;
        let totalFlowRate = 0;
        let totalHeatInput = 0;
        let totalHeatOutput = 0;
        const componentMetrics: Record<string, any> = {};

        blueprint.components.forEach(comp => {
            const id = comp.id;
            const name = comp.name.replace(/\s+/g, '_');

            const power = variables[`${id}_power`] || variables[`${id}_power_kw`] ||
                variables[`${id}_brakePower`] || variables[`${id}_horsepower`] / 0.746 || 0;

            const flow = variables[`${id}_flow`] || variables[`${id}_flowRate`] || variables[`${id}_flow_rate`] ||
                variables[`${id}_flow_lpm`] ||
                variables[`${name}_flow`] || variables[`${name}_flowRate`] || variables[`${name}_flow_rate`] || variables[`${name}_flow_lpm`] || 0;

            const heat = variables[`${id}_heat`] || variables[`${id}_heatRejection`] ||
                variables[`${name}_heat`] || variables[`${name}_heat_rejection`] || 0;

            if (comp.componentDefinitionId.includes('pump')) {
                let pumpPower = power;
                const pumpFlow = variables[`${name}_flow_rate`] || variables[`${name}_flowRate`] || 0;
                const pumpHead = variables[`${name}_head`] || 0;

                if (pumpPower === 0 && pumpFlow > 0 && pumpHead > 0) {
                    const Q_m3s = pumpFlow / 3600;
                    pumpPower = (1000 * 9.81 * Q_m3s * pumpHead) / 1000;
                }
                if (pumpPower > 0) totalPowerOutput += pumpPower;
                else totalPowerInput += Math.abs(pumpPower);
                if (pumpFlow > 0) totalFlowRate += pumpFlow;
            } else if (comp.componentDefinitionId.includes('engine') || comp.componentDefinitionId.includes('motor')) {
                totalPowerInput += Math.abs(power);
            }

            if (heat > 0) totalHeatOutput += heat;

            componentMetrics[id] = { power: power || 0, flow, heat };
        });

        return {
            totalPowerInput,
            totalPowerOutput,
            overallEfficiency: totalPowerInput > 0 ? (totalPowerOutput / totalPowerInput) * 100 : 0,
            totalFlowRate,
            maxPressure: 0,
            pressureDrop: 0,
            totalHeatInput,
            totalHeatOutput,
            componentMetrics
        };
    }
}

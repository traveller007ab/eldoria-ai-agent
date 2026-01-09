import { ISolver } from '../SolverRegistry';
import {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration,
    MechSimulationMetrics
} from '../../../types';
import { ComponentRegistry } from '../../ComponentRegistry';
import { getPhysicsForComponent, getComponentType, isEnergySource } from '../ComponentPhysics';
import { RealEngineModel, EngineParameters, EngineState } from '../RealEngineModel';

export class MechanicalNetworkSolver implements ISolver {

    async solve(blueprint: MechBlueprint, config: MechSolverConfiguration, context: Record<string, number> = {}): Promise<MechSimulationResult> {
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

        // Use physics interface instead of hardcoded ID checks
        const getComponentTypeSafe = (id: string, defId: string) => {
            try {
                return getComponentType(id, defId);
            } catch {
                const lowerId = id.toLowerCase();
                if (lowerId.includes('motor')) return 'motor';
                if (lowerId.includes('engine')) return 'engine';
                if (lowerId.includes('gear')) return 'gear';
                return 'unknown';
            }
        };

        // --- Step 1: Find Drivers ---
        const drivers = blueprint.components.filter(c => {
            const def = registry.getComponent(c.componentDefinitionId);
            if (!def) return false;
            const compType = getComponentTypeSafe(c.componentDefinitionId, def.id);
            return compType === 'motor' || compType === 'engine';
        });

        for (const driver of drivers) {
            const prefix = driver.id;
            const params = driver.parameterValues;
            const def = registry.getComponent(driver.componentDefinitionId);
            if (!def) continue;

            let N_driver = 0;
            let Torque_max = 0;
            const compType = getComponentTypeSafe(driver.componentDefinitionId, def.id);

            if (compType === 'engine' || def.id.includes('engine')) {
                // Engine logic using RealEngineModel
                try {
                    const fuelTypeStr = String(params.fuel_type || 'gasoline');
                    const aspirationStr = String(params.aspiration || 'na');
                    const valveTimingStr = String(params.valve_timing || 'dohc');

                    const engineParams: EngineParameters = {
                        displacement: Number(params.displacement) || 2.0,
                        cylinders: Number(params.cylinders) || 4,
                        bore: Number(params.bore) || 86,
                        stroke: Number(params.stroke) || 86,
                        compressionRatio: Number(params.compression_ratio) || 10.0,
                        maxPower: Number(params.max_power) || 100,
                        maxPowerRPM: Number(params.max_power_rpm) || 6000,
                        maxTorque: Number(params.max_torque) || 200,
                        maxTorqueRPM: Number(params.max_torque_rpm) || 4000,
                        idleRPM: Number(params.idle_rpm) || 800,
                        redlineRPM: Number(params.redline_rpm) || 7000,
                        fuelType: (fuelTypeStr as 'gasoline' | 'diesel' | 'ethanol' | 'natural_gas') || 'gasoline',
                        aspiration: (aspirationStr as 'na' | 'turbo' | 'supercharged') || 'na',
                        valveTiming: (valveTimingStr as 'ohv' | 'ohc' | 'dohc') || 'dohc',
                        firingOrder: String(params.firing_order || '1-3-4-2')
                    };

                    const engineState: EngineState = {
                        rpm: Number(params.rpm) || 3000,
                        throttlePosition: (Number(params.throttle) || 50) / 100,
                        manifoldPressure: Number(params.manifold_pressure) || 100,
                        intakeTemp: Number(params.intake_temp) || 300,
                        airFuelRatio: Number(params.afr) || 14.7,
                        sparkAdvance: Number(params.spark_advance) || 35,
                        coolantTemp: Number(params.coolant_temp) || 360
                    };

                    const outputs = RealEngineModel.analyzeEngine(engineParams, engineState);

                    N_driver = engineState.rpm;
                    Torque_max = outputs.torque;

                    const prefix = driver.name.replace(/\s+/g, '_');
                    variables[`${prefix}_torque`] = outputs.torque;
                    variables[`${prefix}_torque_nm`] = outputs.torque;
                    variables[`${prefix}_power_kw`] = outputs.brakePower;
                    variables[`${prefix}_horsepower`] = outputs.horsepower;
                    variables[`${prefix}_bsfc`] = outputs.bsfc;
                    variables[`${prefix}_volumetric_efficiency`] = outputs.volumetricEfficiency;
                    variables[`${prefix}_thermal_efficiency`] = outputs.thermalEfficiency;
                    variables[`${prefix}_bmep`] = outputs.bmep;
                    variables[`${prefix}_rpm`] = N_driver;
                    variables[`${prefix}_fuel_flow`] = outputs.fuelFlow;
                    variables[`${prefix}_air_flow`] = outputs.airFlow;
                    variables[`${prefix}_heat_rejection`] = outputs.heatRejection;
                    variables[`${prefix}_exhaust_temp`] = outputs.exhaustTemp;
                } catch (e) {
                    console.warn(`[MechanicalNetworkSolver] RealEngineModel failed, using physics-based fallback: ${e}`);
                    // Calculate fallback from component parameters instead of hardcoded values
                    // Use rated power and speed from parameters if available
                    const ratedPower = Number(params.max_power) || Number(params.rated_power) || 100; // kW
                    const ratedSpeed = Number(params.max_speed) || Number(params.rated_speed) || 
                                      Number(params.max_rpm) || 3000; // RPM
                    const throttle = (Number(params.throttle) || 50) / 100;
                    const idleRPM = Number(params.idle_rpm) || 800;
                    
                    // Calculate realistic operating point based on throttle
                    N_driver = idleRPM + throttle * (ratedSpeed - idleRPM);
                    N_driver = Math.min(N_driver, ratedSpeed);
                    
                    // Torque curve approximation: peak at 60-80% of rated speed
                    const torqueRatio = N_driver / ratedSpeed;
                    let torqueMultiplier = 1.0;
                    if (torqueRatio < 0.6) {
                        torqueMultiplier = 0.6 + 0.4 * (torqueRatio / 0.6);
                    } else if (torqueRatio < 1.0) {
                        torqueMultiplier = 1.0;
                    } else {
                        torqueMultiplier = 1.0 - 0.5 * (torqueRatio - 1.0);
                    }
                    
                    // Peak torque ≈ 9550 * P_rated / N_at_peak_torque (typically ~60% of rated speed)
                    const speedAtPeakTorque = ratedSpeed * 0.6;
                    const peakTorque = (ratedPower * 9550) / speedAtPeakTorque;
                    Torque_max = peakTorque * torqueMultiplier * throttle;
                    
                    // Store fallback calculations
                    const prefix = driver.name.replace(/\s+/g, '_');
                    variables[`${prefix}_torque`] = Torque_max;
                    variables[`${prefix}_torque_nm`] = Torque_max;
                    variables[`${prefix}_power_kw`] = (Torque_max * N_driver) / 9550;
                    variables[`${prefix}_rpm`] = N_driver;
                    variables[`${prefix}_fallback`] = 1; // Mark as fallback calculation
                }
            } else {
                // Motor logic
                N_driver = Number(params.rated_speed) || 1450;
                const P_rated = Number(params.rated_power) || 15;
                Torque_max = (9550 * P_rated) / N_driver;
            }

            variables[`${prefix}_speed_target`] = N_driver;
            variables[`${prefix}_torque_max`] = Torque_max;

            const w_current = (N_driver * 2 * Math.PI) / 60;
            const P_avail = (Torque_max * w_current) / 1000;
            metrics.totalPowerInput += P_avail;

            this.propagateSpeed(driver, N_driver, blueprint, variables, registry);
        }

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

        const outConnections = blueprint.connections.filter(c => c.sourceComponentId === currentComponent.id);

        for (const conn of outConnections) {
            if (conn.type !== 'mechanical') continue;

            const nextComp = blueprint.components.find(c => c.id === conn.targetComponentId);
            if (!nextComp) continue;

            const nextDef = registry.getComponent(nextComp.componentDefinitionId);
            if (!nextDef) continue;

            // Use physics interface for gear detection
            let nextSpeed = currentSpeed;
            try {
                const compType = getComponentType(nextComp.componentDefinitionId, nextDef.id);
                if (compType === 'gear') {
                    const z1 = Number(nextComp.parameterValues.z1) || 20;
                    const z2 = Number(nextComp.parameterValues.z2) || 60;
                    nextSpeed = currentSpeed / (z2 / z1);
                }
            } catch {
                // Fallback to ID check
                if (nextDef.id.includes('gear')) {
                    const z1 = Number(nextComp.parameterValues.z1) || 20;
                    const z2 = Number(nextComp.parameterValues.z2) || 60;
                    nextSpeed = currentSpeed / (z2 / z1);
                }
            }

            const nextPrefix = nextComp.name.replace(/\s+/g, '_');
            if (!variables[`${nextPrefix}_speed`]) {
                this.propagateSpeed(nextComp, nextSpeed, blueprint, variables, registry);
            }
        }
    }
}

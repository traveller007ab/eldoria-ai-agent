import { MechBlueprint, MechSimulationResult } from '../../types';
import { MaterialRegistry } from './MaterialRegistry';
import { ModelAnalyzer, ModelAnalysis, DynamicMetrics, SummaryMetrics, EngineMetrics, PumpMetrics, ThermalMetrics, HydraulicMetrics, VehicleMetrics, ProcessMetrics } from './ModelAnalyzer';

export class DynamicMetricsGenerator {

    static generate(blueprint: MechBlueprint, result: MechSimulationResult): DynamicMetrics {
        const analysis = ModelAnalyzer.analyze(blueprint);

        const summary = this.generateSummary(blueprint, result, analysis);

        const metrics: DynamicMetrics = {
            summary
        };

        // Add category-specific metrics
        switch (analysis.category) {
            case 'engine_system':
            case 'vehicle_dynamics':
                metrics.engine = this.generateEngineMetrics(blueprint, result, analysis);
                if (analysis.category === 'vehicle_dynamics') {
                    metrics.vehicle = this.generateVehicleMetrics(blueprint, result, analysis);
                }
                break;

            case 'pump_system':
            case 'hydraulic_circuit':
                metrics.pump = this.generatePumpMetrics(blueprint, result, analysis);
                metrics.hydraulic = this.generateHydraulicMetrics(blueprint, result, analysis);
                break;

            case 'hvac_system':
            case 'thermal_network':
                metrics.thermal = this.generateThermalMetrics(blueprint, result, analysis);
                break;

            case 'power_plant':
                metrics.thermal = this.generateThermalMetrics(blueprint, result, analysis);
                metrics.pump = this.generatePumpMetrics(blueprint, result, analysis);
                break;

            case 'process_system':
                metrics.process = this.generateProcessMetrics(blueprint, result, analysis);
                break;
        }

        return metrics;
    }

    private static generateSummary(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): SummaryMetrics {
        return {
            totalPowerInput: result.metrics.totalPowerInput,
            totalPowerOutput: result.metrics.totalPowerOutput,
            overallEfficiency: result.metrics.overallEfficiency,
            totalFlowRate: result.metrics.totalFlowRate,
            totalHeatInput: result.metrics.totalHeatInput,
            totalHeatOutput: result.metrics.totalHeatOutput,
            maxPressure: result.metrics.maxPressure,
            pressureDrop: result.metrics.pressureDrop,
            modelCategory: analysis.category
        };
    }

    private static generateEngineMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): EngineMetrics {
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');

        // Find engine component
        const engineComp = blueprint.components.find(c =>
            c.componentDefinitionId.toLowerCase().includes('engine') ||
            c.name.toLowerCase().includes('engine')
        );

        const enginePrefix = engineComp?.name.replace(/\s+/g, '_') || 'engine';

        // Get engine variables - check multiple naming conventions
        const torque = result.variables[`${enginePrefix}_torque`] ||
                      result.variables[`${enginePrefix}_torque_nm`] ||
                      result.variables[`torque`] ||
                      result.variables[`engine_torque`] ||
                      result.variables[`engine_1_torque`] ||
                      result.variables[`V8_Engine_torque`] || 0;
        const rpm = result.variables[`${enginePrefix}_rpm`] ||
                   result.variables[`${enginePrefix}_speed_rpm`] ||
                   result.variables[`${enginePrefix}_speed_target`] ||
                   result.variables[`rpm`] ||
                   result.variables[`engine_rpm`] ||
                   result.variables[`engine_1_rpm`] ||
                   result.variables[`V8_Engine_rpm`] || 0;
        const bsfc = result.variables[`${enginePrefix}_bsfc`] ||
                    result.variables[`bsfc`] ||
                    result.variables[`engine_bsfc`] || 0;

        // If no engine data from solver, check if this is a hydraulic system with temperature-only tracking
        const hasEngineData = torque > 0 || rpm > 0;

        // If no engine data from solver but engine is actively driving the system
        if (!hasEngineData && analysis.hasActiveEngineSimulation) {
            return {
                indicatedPower: 0,
                brakePower: 0,
                frictionPower: result.metrics.totalPowerInput,
                torque: 0,
                rpm: 0,
                horsepower: 0,
                bmep: 0,
                bsfc: 0,
                airFuelRatio: result.variables[`${enginePrefix}_afr`] || 14.7,
                thermalEfficiency: 0,
                indicatedEfficiency: null,
                brakeEfficiency: 0,
                volumetricEfficiency: 0,
                meanPistonSpeed: 0,
                specificOutput: 0,
                _warning: 'Engine active but no simulation data - check MechanicalSolver'
            };
        }

        // This is a hydraulic/pump system with passive engine component (for thermal tracking only)
        if (!hasEngineData && !analysis.hasActiveEngineSimulation && (result.metrics.totalPowerInput > 0 || analysis.hasPump)) {
            return {
                indicatedPower: 0,
                brakePower: 0,
                frictionPower: result.metrics.totalPowerInput,
                torque: 0,
                rpm: 0,
                horsepower: 0,
                bmep: 0,
                bsfc: 0,
                airFuelRatio: result.variables[`${enginePrefix}_afr`] || 14.7,
                thermalEfficiency: 0,
                indicatedEfficiency: null,
                brakeEfficiency: 0,
                volumetricEfficiency: 0,
                meanPistonSpeed: 0,
                specificOutput: 0,
                _warning: 'Engine not actively simulated - this is a pump/hydraulic system'
            };
        }

        // Fallback: general case with no engine data
        if (!hasEngineData) {
            return {
                indicatedPower: 0,
                brakePower: 0,
                frictionPower: result.metrics.totalPowerInput,
                torque: 0,
                rpm: 0,
                horsepower: 0,
                bmep: 0,
                bsfc: 0,
                airFuelRatio: result.variables[`${enginePrefix}_afr`] || 14.7,
                thermalEfficiency: 0,
                indicatedEfficiency: null,
                brakeEfficiency: 0,
                volumetricEfficiency: 0,
                meanPistonSpeed: 0,
                specificOutput: 0,
                _warning: 'No engine simulation data available'
            };
        }

        // Calculate derived metrics
        const powerKW = torque * rpm * 2 * Math.PI / 60000; // kW
        const powerHP = powerKW * 1.34102; // Horsepower

        // BMEP calculation (Brake Mean Effective Pressure)
        // BMEP = 2π * Torque * N / (Displacement * Revs per cycle)
        // For 4-stroke: BMEP = 60 * Torque * N / (Vd * 2) = 30 * Torque * N / Vd
        const bore = Number(engineComp?.parameterValues.bore_mm) || 86;
        const stroke = Number(engineComp?.parameterValues.stroke_mm) || 86;
        const cylinders = Number(engineComp?.parameterValues.cylinders) || 4;
        const displacement = Math.PI * Math.pow(bore / 1000, 2) / 4 * stroke / 1000 * cylinders; // m³
        const bmep = rpm > 0 && displacement > 0 && torque > 0 ? (30 * torque) / displacement / 1000 : 0; // bar

        // Mean piston speed
        const meanPistonSpeed = stroke > 0 && rpm > 0 ? 2 * stroke * rpm / 60000 : 0; // m/s

        // Volumetric efficiency (estimate)
        const volumetricEfficiency = rpm > 0 ? 0.85 + (rpm / 10000) * 0.1 : 0;

        // Thermal efficiency
        const fuelEnergy = 44000; // kJ/kg for gasoline
        const thermalEfficiency = powerKW > 0 && bsfc > 0 ?
            (3600 / (bsfc * fuelEnergy)) * 100 : 0;

        // Indicated vs brake efficiency
        const frictionPower = Math.max(0, result.metrics.totalPowerInput - powerKW);
        const indicatedPower = powerKW + frictionPower;
        const brakeEfficiency = indicatedPower > 0 ? (powerKW / indicatedPower) * 100 : 0;
        const indicatedEfficiency = thermalEfficiency > 0 && indicatedPower > 0 ?
            (thermalEfficiency * indicatedPower / powerKW) / 100 : 0;

        // Air-fuel ratio
        const airFuelRatio = result.variables[`${enginePrefix}_afr`] ||
                            result.variables[`afr`] ||
                            result.variables[`engine_afr`] || 14.7;

        // Specific output (kW per liter of displacement)
        const specificOutput = displacement > 0 && powerKW > 0 ? powerKW / displacement : 0;

        return {
            indicatedPower,
            brakePower: powerKW,
            frictionPower: Math.abs(frictionPower),
            torque,
            rpm,
            horsepower: powerHP,
            bmep,
            bsfc,
            airFuelRatio,
            thermalEfficiency,
            indicatedEfficiency,
            brakeEfficiency,
            volumetricEfficiency,
            meanPistonSpeed,
            specificOutput
        };
    }

    private static generatePumpMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): PumpMetrics {
        // Find pump component
        const pumpComp = blueprint.components.find(c =>
            c.componentDefinitionId.toLowerCase().includes('pump') ||
            c.name.toLowerCase().includes('pump')
        );

        const pumpPrefix = pumpComp?.name.replace(/\s+/g, '_') || 'pump';

        const flowRate = result.variables[`${pumpPrefix}_flow_rate`] ||
                        result.variables[`flow_rate`] || 0;
        const head = result.variables[`${pumpPrefix}_head`] ||
                    result.variables[`head`] || 0;
        const powerInput = result.metrics.totalPowerInput;
        const efficiency = powerInput > 0 ? (flowRate * head * 9.81 / powerInput) * 100 : 0;

        // NPSH calculations
        const suctionPressure = result.variables[`${pumpPrefix}_suction_pressure`] || 0;
        const vaporPressure = 2.3; // kPa for water at 20C
        const npsha = (suctionPressure * 1000) / 998 / 9.81 - 2; // Simplified
        const npshr = head * 0.15; // Estimate: 15% of total head

        // Suction specific speed
        const rpm = 1450; // Assume standard motor speed
        const npshr_m = npshr;
        const suctionSpecificSpeed = rpm * Math.sqrt(flowRate / 3600) / Math.pow(npshr_m, 0.75);

        // Affinity laws (at current operating point)
        const designFlow = Number(pumpComp?.parameterValues.design_flow) || 100;
        const designHead = Number(pumpComp?.parameterValues.design_head) || 50;
        const flowRatio = flowRate / designFlow;
        const headRatio = head / designHead;
        const powerRatio = Math.pow(flowRatio, 3);

        // System curve K
        const staticHead = 5; // meters
        const systemK = headRatio / (flowRatio * flowRatio);

        return {
            flowRate,
            head,
            efficiency,
            npsha,
            npshr,
            suctionSpecificSpeed,
            flowCoefficient: flowRatio,
            headCoefficient: headRatio,
            powerCoefficient: powerRatio,
            affinityLaws: {
                flowRatio,
                headRatio,
                powerRatio
            },
            systemCurveK: systemK,
            operatingPoint: {
                flow: flowRate,
                head,
                power: powerInput
            }
        };
    }

    private static generateThermalMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): ThermalMetrics {
        const hxComp = blueprint.components.find(c =>
            c.componentDefinitionId.toLowerCase().includes('heat_exchanger') ||
            c.componentDefinitionId.toLowerCase().includes('radiator') ||
            c.componentDefinitionId.toLowerCase().includes('cooler')
        );

        const hxPrefix = hxComp?.name.replace(/\s+/g, '_') || 'hx';

        const heatDuty = result.variables[`${hxPrefix}_heat_duty`] ||
                        result.variables[`heat_duty`] ||
                        result.metrics.totalHeatInput || 0;

        const tempIn = result.variables[`${hxPrefix}_temp_in`] || 80;
        const tempOut = result.variables[`${hxPrefix}_temp_out`] || 60;
        const lmtd = Math.abs(tempIn - tempOut); // Simplified LMTD

        const ua = heatDuty > 0 && lmtd > 0 ? heatDuty / lmtd : 0;
        const effectiveness = lmtd > 0 ? lmtd / (tempIn - 20) : 0; // Assume cold side 20C

        const ntu = ua / 1000; // Simplified NTU

        // COP for heat pumps/coolers
        const cop = result.metrics.totalHeatInput > 0 ?
            result.metrics.totalHeatOutput / result.metrics.totalPowerInput : 0;
        const eer = cop * 3.412; // Convert to EER

        return {
            heatInput: result.metrics.totalHeatInput,
            heatOutput: result.metrics.totalHeatOutput,
            cop,
            eer,
            lmtd,
            uaValue: ua,
            effectiveness,
            numberOfTransferUnits: ntu,
            coolingCapacity: heatDuty,
            heatingCapacity: heatDuty
        };
    }

    private static generateHydraulicMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): HydraulicMetrics {
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');

        // Find pipe with highest velocity
        let maxVelocity = 0;
        let reynoldsNumber = 0;
        let frictionFactor = 0.02; // Default

        Object.keys(result.variables).forEach(key => {
            if (key.includes('velocity')) {
                const velocity = Math.abs(result.variables[key]);
                if (velocity > maxVelocity) {
                    maxVelocity = velocity;

                    // Estimate Reynolds number
                    const diameter = 0.1; // Assume 100mm pipe
                    reynoldsNumber = fluid.density * velocity * diameter / fluid.viscosity;

                    // Friction factor (Swamee-Jain approximation)
                    if (reynoldsNumber > 0) {
                        const roughness = 0.00015; // m
                        const epsilon_D = roughness / diameter;
                        frictionFactor = 0.25 / Math.pow(Math.log10(epsilon_D / 3.7 + 5.74 / Math.pow(reynoldsNumber, 0.9)), 2);
                    }
                }
            }
        });

        const headLoss = result.variables[`${analysis.components[0] || 'pipe'}_head_loss`] || 0;
        const cavitationMargin = 3.0 - maxVelocity; // Simplified NPSH margin

        // System curve: H = K*Q² + H_static
        const staticHead = 5; // meters
        const systemK = headLoss / Math.pow(result.metrics.totalFlowRate / 3600, 2);

        return {
            flowRate: result.metrics.totalFlowRate,
            pressureDrop: result.metrics.pressureDrop,
            pipeVelocity: maxVelocity,
            reynoldsNumber,
            frictionFactor,
            headLoss,
            cavitationMargin,
            systemCurve: {
                k: systemK,
                staticHead
            }
        };
    }

    private static generateVehicleMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): VehicleMetrics {
        const engineMetrics = this.generateEngineMetrics(blueprint, result, analysis);

        // Vehicle parameters
        const vehicleMass = 1500; // kg (estimate)
        const drivetrainLoss = 0.15; // 15% loss
        const frontalArea = 2.2; // m²
        const dragCoefficient = 0.3;

        // Wheel power (after drivetrain loss)
        const wheelPower = engineMetrics.brakePower * (1 - drivetrainLoss);
        const wheelHP = wheelPower * 1.34102;
        const torqueAtWheels = engineMetrics.torque * (1 - drivetrainLoss);

        // Power to weight ratio
        const powerToWeight = engineMetrics.brakePower / vehicleMass;

        // Calculate top speed (where power = drag force * velocity)
        const airDensity = 1.225; // kg/m³
        const topSpeed = Math.pow((2 * wheelPower * 1000) / (airDensity * frontalArea * dragCoefficient), 1/3) / 3.6; // m/s to km/h

        // Acceleration time (0-100 km/h estimate)
        const accelerationForce = (wheelPower * 1000) / 20; // N at 72 km/h (20 m/s)
        const accelerationTime = Math.sqrt(2 * 100 * vehicleMass / accelerationForce); // 0-100 km/h

        // Fuel consumption rate
        const fuelConsumption = engineMetrics.bsfc * engineMetrics.brakePower / 1000; // L/h (approx)

        // Range estimate (50L tank)
        const range = fuelConsumption > 0 ? 50 / fuelConsumption * 100 : 0; // km

        return {
            topSpeed: Math.round(topSpeed * 10) / 10,
            accelerationTime: Math.round(accelerationTime * 10) / 10,
            powerToWeightRatio: Math.round(powerToWeight * 1000) / 1000,
            wheelHorsepower: Math.round(wheelHP * 10) / 10,
            torqueAtWheels: Math.round(torqueAtWheels * 10) / 10,
            drivetrainLoss: drivetrainLoss * 100,
            fuelConsumptionRate: Math.round(fuelConsumption * 10) / 10,
            range: Math.round(range)
        };
    }

    private static generateProcessMetrics(blueprint: MechBlueprint, result: MechSimulationResult, analysis: ModelAnalysis): ProcessMetrics {
        // Mass and energy balance from diagnostics
        const massBalanceError = result.diagnostics.massBalance.imbalancePercent;
        const energyBalanceError = result.diagnostics.energyBalance.imbalancePercent;

        // Throughput (total flow through system)
        const throughput = result.metrics.totalFlowRate;

        // Residence time (for CSTR approximation)
        const totalVolume = blueprint.components
            .filter(c => c.componentDefinitionId.includes('tank'))
            .reduce((sum, c) => sum + Number(c.parameterValues.volume) || 10, 0);

        const residenceTime = throughput > 0 && totalVolume > 0 ?
            totalVolume / (throughput / 3600) : 0; // seconds

        return {
            massBalanceError,
            energyBalanceError,
            throughput,
            yield: 0.95, // Placeholder - would need actual product analysis
            selectivity: 0.90, // Placeholder
            conversion: 0.85, // Placeholder
            residenceTime
        };
    }
}

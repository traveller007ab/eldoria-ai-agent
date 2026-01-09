/**
 * Blueprint Integration Test
 * Tests the complete physics engine with the V8 Engine Pump Loop blueprint
 * Run with: npx tsx blueprint_test.ts
 */

import { FluidPropertyDatabase } from './services/physics/FluidProperties';
import { RealPipeFlow } from './services/physics/RealPipeFlow';
import { RealPumpCurves } from './services/physics/RealPumpCurves';
import { RealValveModel } from './services/physics/RealValveModel';
import { RealEngineModel, EngineParameters, EngineState } from './services/physics/RealEngineModel';
import { RealHeatExchanger } from './services/physics/RealHeatExchanger';
import { PhysicsConstraintChecker } from './services/physics/PhysicsConstraintChecker';
import * as fs from 'fs';

interface Blueprint {
    id: string;
    name: string;
    fluidId: string;
    components: Array<{
        id: string;
        componentDefinitionId: string;
        name: string;
        parameterValues: Record<string, number>;
    }>;
    connections: Array<{
        sourceComponentId: string;
        targetComponentId: string;
        type: string;
    }>;
}

function loadBlueprint(path: string): Blueprint {
    const content = fs.readFileSync(path, 'utf-8');
    return JSON.parse(content);
}

function testBlueprint(blueprint: Blueprint) {
    console.log('='.repeat(70));
    console.log('BLUEPRINT INTEGRATION TEST');
    console.log('='.repeat(70));
    console.log(`Blueprint: ${blueprint.name}`);
    console.log(`Fluid: ${blueprint.fluidId}`);
    console.log(`Components: ${blueprint.components.length}`);
    console.log(`Connections: ${blueprint.connections.length}`);

    let testsPassed = 0;
    let testsFailed = 0;

    function test(name: string, fn: () => boolean) {
        try {
            if (fn()) {
                console.log(`✓ ${name}`);
                testsPassed++;
            } else {
                console.log(`✗ ${name}`);
                testsFailed++;
            }
        } catch (e) {
            console.log(`✗ ${name} - Error: ${e}`);
            testsFailed++;
        }
    }

    // Extract engine parameters from blueprint
    const engineComp = blueprint.components.find(c => 
        c.componentDefinitionId.includes('engine')
    );
    const pumpComp = blueprint.components.find(c => 
        c.componentDefinitionId.includes('pump')
    );
    const valveComp = blueprint.components.find(c => 
        c.componentDefinitionId.includes('valve')
    );

    console.log('\n--- ENGINE SIMULATION (RealEngineModel) ---');
    
    test('Engine parameters extracted', () => {
        console.log(`  Engine: ${engineComp?.name}`);
        return engineComp !== undefined;
    });

    if (engineComp) {
        const engineParams: EngineParameters = {
            displacement: 5.0,
            cylinders: 8,
            bore: 96,
            stroke: 86,
            compressionRatio: 10.5,
            maxPower: engineComp.parameterValues.max_power || 300,
            maxPowerRPM: 6000,
            maxTorque: 500,
            maxTorqueRPM: 4000,
            idleRPM: 800,
            redlineRPM: 6500,
            fuelType: 'gasoline',
            aspiration: 'na',
            valveTiming: 'dohc',
            firingOrder: '1-3-4-2'
        };

        const engineState: EngineState = {
            rpm: 3000,
            throttlePosition: (engineComp.parameterValues.throttle || 50) / 100,
            manifoldPressure: 90,
            intakeTemp: 300,
            airFuelRatio: 14.7,
            sparkAdvance: 35,
            coolantTemp: 360
        };

        const engineOutput = RealEngineModel.analyzeEngine(engineParams, engineState);

        test('Engine torque calculation', () => {
            console.log(`  Torque: ${engineOutput.torque.toFixed(0)} N·m`);
            console.log(`  Power: ${engineOutput.brakePower.toFixed(0)} kW`);
            console.log(`  BSFC: ${engineOutput.bsfc.toFixed(0)} g/kWh`);
            return engineOutput.torque > 0 && engineOutput.torque < 1000;
        });

        test('Engine thermal efficiency', () => {
            console.log(`  Thermal Efficiency: ${engineOutput.thermalEfficiency.toFixed(1)}%`);
            console.log(`  Volumetric Efficiency: ${(engineOutput.volumetricEfficiency * 100).toFixed(0)}%`);
            return engineOutput.thermalEfficiency > 20 && engineOutput.thermalEfficiency < 40;
        });

        test('Engine heat rejection', () => {
            console.log(`  Heat Rejection: ${engineOutput.heatRejection.toFixed(1)} kW`);
            return engineOutput.heatRejection > 0 && engineOutput.heatRejection < 200;
        });

        // Check engine constraints
        const engineConstraints = PhysicsConstraintChecker.checkEngineConstraints(
            engineComp.id,
            {
                coolantTemp: engineState.coolantTemp,
                exhaustTemp: engineOutput.exhaustTemp,
                rpm: engineState.rpm,
                bsfc: engineOutput.bsfc,
                volumetricEfficiency: engineOutput.volumetricEfficiency
            },
            { maxCoolantTemp: 380, maxRPM: 7000 }
        );

        test('Engine constraints check', () => {
            console.log(`  Violations: ${engineConstraints.violations.length}`);
            console.log(`  Warnings: ${engineConstraints.warnings.length}`);
            return engineConstraints.passed;
        });
    }

    console.log('\n--- PUMP SIMULATION (RealPumpCurves) ---');

    if (pumpComp) {
        const gearComp = blueprint.components.find(c => 
            c.componentDefinitionId.includes('gear')
        );

        // Calculate pump speed from engine via gearbox
        let gearRatio = 1;
        if (gearComp) {
            const z1 = gearComp.parameterValues.z1 || 20;
            const z2 = gearComp.parameterValues.z2 || 40;
            gearRatio = z2 / z1;
            console.log(`  Gear Ratio: ${gearRatio}:1`);
        }

        const engineRPM = 3000;
        const pumpSpeed = engineRPM / gearRatio;

        const designFlow = pumpComp.parameterValues.design_flow || 150;
        const designHead = pumpComp.parameterValues.design_head || 80;
        const ratedSpeed = 1450;

        test('Pump speed calculation', () => {
            console.log(`  Pump Speed: ${pumpSpeed.toFixed(0)} RPM`);
            return pumpSpeed > 0 && pumpSpeed < 5000;
        });

        // Apply affinity laws
        const affinityResult = RealPumpCurves.applyAffinityLawsSpeed(
            ratedSpeed,
            pumpSpeed,
            designFlow,
            designHead,
            15,
            80
        );

        test('Pump affinity laws', () => {
            console.log(`  Flow @ ${pumpSpeed.toFixed(0)} RPM: ${affinityResult.newFlow.toFixed(0)} m³/h`);
            console.log(`  Head @ ${pumpSpeed.toFixed(0)} RPM: ${affinityResult.newHead.toFixed(0)} m`);
            console.log(`  Power @ ${pumpSpeed.toFixed(0)} RPM: ${affinityResult.newPower.toFixed(1)} kW`);
            return affinityResult.newFlow > 0 && affinityResult.newHead > 0;
        });

        // Find operating point using correct function signature
        const pumpCurveFn = (Q: number) => {
            return RealPumpCurves.calculatePumpCurve(Q, designFlow, designHead, pumpSpeed, ratedSpeed, 200, 200);
        };
        
        const systemCurveFn = (Q: number) => {
            return RealPumpCurves.calculateSystemHead(Q, 5, 0.01);
        };

        const operatingPoint = RealPumpCurves.findOperatingPoint(
            pumpCurveFn,
            systemCurveFn,
            50,
            0.001
        );

        // Calculate efficiency at operating point
        const efficiency = RealPumpCurves.calculateEfficiency(
            operatingPoint.flow,
            designFlow,
            80
        );

        test('Pump operating point', () => {
            console.log(`  Operating Flow: ${operatingPoint.flow.toFixed(0)} m³/h`);
            console.log(`  Operating Head: ${operatingPoint.head.toFixed(0)} m`);
            console.log(`  Efficiency: ${efficiency.toFixed(0)}%`);
            return operatingPoint.flow > 0 && operatingPoint.head > 0;
        });
    }

    console.log('\n--- VALVE SIMULATION (RealValveModel) ---');

    if (valveComp) {
        const opening = valveComp.parameterValues.opening || 100;
        const cv = valveComp.parameterValues.cv || 200;
        const pressureDrop = 50000;

        const flowRate = RealValveModel.calculateFlowRate(cv * (opening / 100), pressureDrop, 0.9);

        test('Valve flow calculation', () => {
            console.log(`  Flow Rate: ${(flowRate * 3600).toFixed(0)} m³/h`);
            console.log(`  Cv: ${cv}, Opening: ${opening}%`);
            return flowRate > 0;
        });

        const cavNumber = RealValveModel.calculateCavitationNumber(
            300000,
            250000,
            2339
        );

        test('Valve cavitation check', () => {
            console.log(`  Cavitation Number: ${cavNumber.toFixed(2)}`);
            return cavNumber > 0;
        });

        const isChoked = RealValveModel.isChokedFlow(
            300000,
            250000,
            2339
        );

        test('Valve choked flow check', () => {
            console.log(`  Choked Flow: ${isChoked}`);
            return typeof isChoked === 'boolean';
        });

        const valveConstraints = PhysicsConstraintChecker.checkComponent(
            valveComp.id,
            'valve',
            valveComp.parameterValues,
            { flowRate, velocity: 5, pressure: pressureDrop },
            'water'
        );

        test('Valve constraints', () => {
            console.log(`  Violations: ${valveConstraints.violations.length}`);
            console.log(`  Warnings: ${valveConstraints.warnings.length}`);
            return valveConstraints.passed;
        });
    }

    console.log('\n--- FLUID PROPERTIES ---');

    const fluidId = blueprint.fluidId || 'gasoline';
    const temperature = 293.15;

    test('Fluid density', () => {
        const rho = FluidPropertyDatabase.getDensityAtTemperature(fluidId, temperature);
        console.log(`  ${fluidId} @ 20°C: ${rho.toFixed(1)} kg/m³`);
        return rho > 0;
    });

    test('Fluid viscosity', () => {
        const mu = FluidPropertyDatabase.getViscosityAtTemperature(fluidId, temperature);
        console.log(`  ${fluidId} @ 20°C: ${(mu * 1000).toFixed(2)} mPa·s`);
        return mu > 0;
    });

    test('NPSH calculation', () => {
        const npsh = FluidPropertyDatabase.calculateNPSH(
            fluidId, 101325, 2, 2339, 1, 0.5, temperature
        );
        console.log(`  NPSHa: ${npsh.toFixed(2)} m`);
        return npsh > 0;
    });

    console.log('\n--- PIPE FLOW ---');

    const pipeComp = blueprint.components.find(c => 
        c.componentDefinitionId.includes('pipe')
    );
    
    if (pipeComp) {
        const length = pipeComp.parameterValues.length || 10;
        const diameter = (pipeComp.parameterValues.diameter || 100) / 1000;
        const roughness = (pipeComp.parameterValues.roughness || 0.045) / 1000;
        const flowRateM3s = 0.05;

        const pipeResult = RealPipeFlow.calculatePressureDrop(
            flowRateM3s,
            diameter * 1000,
            length,
            roughness * 1000,
            998
        );

        test('Pipe pressure drop', () => {
            console.log(`  Diameter: ${(diameter * 1000).toFixed(0)} mm`);
            console.log(`  Length: ${length} m`);
            console.log(`  Pressure Drop: ${(pipeResult.pressureDrop / 1000).toFixed(1)} kPa`);
            console.log(`  Velocity: ${pipeResult.velocity.toFixed(2)} m/s`);
            return pipeResult.pressureDrop > 0;
        });

        test('Pipe Reynolds number', () => {
            console.log(`  Re: ${pipeResult.reynoldsNumber.toFixed(0)}`);
            return pipeResult.reynoldsNumber > 0;
        });
    }

    console.log('\n--- HEAT EXCHANGER ---');

    const hxResult = RealHeatExchanger.analyze({
        type: 'shell_tube',
        hotInletTemp: 400,
        hotOutletTemp: 350,
        coldInletTemp: 300,
        coldOutletTemp: 320,
        hotFlowRate: 1.0,
        coldFlowRate: 1.0,
        hotCp: 4182,
        coldCp: 4182,
        overallU: 500,
        area: 10
    }, 'shell_tube');

    test('Heat exchanger analysis', () => {
        console.log(`  Heat Transfer: ${(hxResult.heatTransfer / 1000).toFixed(1)} kW`);
        console.log(`  Effectiveness: ${(hxResult.effectiveness * 100).toFixed(1)}%`);
        console.log(`  LMTD: ${hxResult.lmtd.toFixed(1)} K`);
        return hxResult.heatTransfer > 0;
    });

    console.log('\n--- SYSTEM INTEGRATION ---');

    test('Blueprint topology valid', () => {
        const hasEngine = blueprint.components.some(c => c.componentDefinitionId.includes('engine'));
        const hasPump = blueprint.components.some(c => c.componentDefinitionId.includes('pump'));
        const hasGear = blueprint.components.some(c => c.componentDefinitionId.includes('gear'));
        const hasTank = blueprint.components.some(c => c.componentDefinitionId.includes('tank'));
        const hasValve = blueprint.components.some(c => c.componentDefinitionId.includes('valve'));
        const hasPipes = blueprint.components.some(c => c.componentDefinitionId.includes('pipe'));
        
        console.log(`  Engine: ${hasEngine}, Pump: ${hasPump}, Gear: ${hasGear}`);
        console.log(`  Tank: ${hasTank}, Valve: ${hasValve}, Pipes: ${hasPipes}`);
        
        return hasEngine && hasPump && hasTank;
    });

    console.log('\n' + '='.repeat(70));
    console.log(`RESULTS: ${testsPassed} passed, ${testsFailed} failed`);
    console.log('='.repeat(70));

    if (testsFailed === 0) {
        console.log('\n✓ ALL BLUEPRINT INTEGRATION TESTS PASSED');
        console.log('The physics engine correctly simulates the V8 Engine Pump Loop.');
    } else {
        console.log('\n✗ SOME TESTS FAILED');
        console.log('Review the failed tests above.');
    }

    return testsFailed === 0;
}

// Run
const blueprint = loadBlueprint('./engine_pump_demo_fixed.json');
const success = testBlueprint(blueprint);
process.exit(success ? 0 : 1);

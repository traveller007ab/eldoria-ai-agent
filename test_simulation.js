/**
 * Simulation Test Runner
 * Runs static and dynamic simulations via backend API
 */

const backendUrl = 'http://localhost:3001/api/v1/simulation';

const blueprint = {
    "id": "demo-engine-pump-001",
    "name": "V8 Engine Pump Loop",
    "description": "Demonstration of Multi-Physics: V8 Engine driving a Centrifugal Pump through a Gearbox.",
    "domain": "fluid",
    "version": "1.0.0",
    "createdAt": new Date().toISOString(),
    "updatedAt": new Date().toISOString(),
    "author": "System",
    "fluidId": "water",
    "tags": ["demo", "engine", "pump", "multiphysics"],
    "components": [
        {
            "id": "engine-1",
            "componentDefinitionId": "mechanical.engine.ic",
            "name": "V8 Engine",
            "position": { "x": 100, "y": 100 },
            "rotation": 0,
            "parameterValues": {
                "max_power": 300,
                "max_speed": 6000,
                "idle_speed": 800,
                "throttle": 50
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "gearbox-1",
            "componentDefinitionId": "mechanical.gear.spur",
            "name": "Reduction Gear",
            "position": { "x": 350, "y": 100 },
            "rotation": 0,
            "parameterValues": {
                "z1": 20,
                "z2": 40,
                "module": 5
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "pump-1",
            "componentDefinitionId": "fluid.pump.centrifugal",
            "name": "Main Pump",
            "position": { "x": 600, "y": 100 },
            "rotation": 0,
            "parameterValues": {
                "design_flow": 150,
                "design_head": 80
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "tank-1",
            "componentDefinitionId": "fluid.tank.reservoir",
            "name": "Supply Tank",
            "position": { "x": 600, "y": 400 },
            "rotation": 0,
            "parameterValues": {
                "head": 5,
                "initial_level": 5,
                "area": 10
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "pipe-suction",
            "componentDefinitionId": "fluid.pipe.std",
            "name": "Suction Line",
            "position": { "x": 600, "y": 250 },
            "rotation": 90,
            "parameterValues": {
                "length": 5,
                "diameter": 200,
                "roughness": 0.045
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "valve-discharge",
            "componentDefinitionId": "fluid.valve.globe",
            "name": "Throttle Valve",
            "position": { "x": 800, "y": 100 },
            "rotation": 0,
            "parameterValues": {
                "opening": 100,
                "cv": 200
            },
            "isSelected": false,
            "groupIds": []
        },
        {
            "id": "pipe-return",
            "componentDefinitionId": "fluid.pipe.std",
            "name": "Return Line",
            "position": { "x": 800, "y": 400 },
            "rotation": 0,
            "parameterValues": {
                "length": 20,
                "diameter": 150
            },
            "isSelected": false,
            "groupIds": []
        }
    ],
    "connections": [
        {
            "id": "c1",
            "sourceComponentId": "engine-1",
            "sourcePortId": "shaft_out",
            "targetComponentId": "gearbox-1",
            "targetPortId": "shaft_in",
            "type": "mechanical",
            "isSelected": false
        },
        {
            "id": "c2",
            "sourceComponentId": "gearbox-1",
            "sourcePortId": "shaft_out",
            "targetComponentId": "pump-1",
            "targetPortId": "shaft_in",
            "type": "mechanical",
            "isSelected": false
        },
        {
            "id": "c3",
            "sourceComponentId": "tank-1",
            "sourcePortId": "outlet",
            "targetComponentId": "pipe-suction",
            "targetPortId": "in",
            "type": "fluid",
            "isSelected": false
        },
        {
            "id": "c4",
            "sourceComponentId": "pipe-suction",
            "sourcePortId": "out",
            "targetComponentId": "pump-1",
            "targetPortId": "inlet",
            "type": "fluid",
            "isSelected": false
        },
        {
            "id": "c5",
            "sourceComponentId": "pump-1",
            "sourcePortId": "outlet",
            "targetComponentId": "valve-discharge",
            "targetPortId": "in",
            "type": "fluid",
            "isSelected": false
        },
        {
            "id": "c6",
            "sourceComponentId": "valve-discharge",
            "sourcePortId": "out",
            "targetComponentId": "pipe-return",
            "targetPortId": "in",
            "type": "fluid",
            "isSelected": false
        },
        {
            "id": "c7",
            "sourceComponentId": "pipe-return",
            "sourcePortId": "out",
            "targetComponentId": "tank-1",
            "targetPortId": "inlet",
            "type": "fluid",
            "isSelected": false
        }
    ],
    "simulations": []
};

function formatResult(result, type) {
    console.log('\n' + '='.repeat(80));
    console.log(`${type.toUpperCase()} SIMULATION RESULTS`);
    console.log('='.repeat(80));

    console.log('\n--- Status ---');
    console.log(`Status: ${result.status}`);
    console.log(`Completed: ${result.completedAt}`);
    console.log(`Duration: ${result.duration}ms`);

    console.log('\n--- Configuration ---');
    console.log(`Method: ${result.configuration.method}`);
    console.log(`Tolerance: ${result.configuration.tolerance}`);
    console.log(`Iterations: ${result.configuration.maxIterations}`);

    console.log('\n--- System Metrics ---');
    console.log(`Power Input: ${result.metrics.totalPowerInput.toFixed(2)} kW`);
    console.log(`Power Output: ${result.metrics.totalPowerOutput.toFixed(2)} kW`);
    console.log(`Efficiency: ${result.metrics.overallEfficiency.toFixed(1)}%`);
    console.log(`Total Flow: ${result.metrics.totalFlowRate.toFixed(1)} m³/h`);
    console.log(`Max Pressure: ${result.metrics.maxPressure.toFixed(2)} kPa`);
    console.log(`Pressure Drop: ${result.metrics.pressureDrop.toFixed(2)} kPa`);

    if (result.metrics.totalHeatInput > 0) {
        console.log(`Heat Input: ${result.metrics.totalHeatInput.toFixed(1)} kW`);
        console.log(`Heat Output: ${result.metrics.totalHeatOutput.toFixed(1)} kW`);
    }

    console.log('\n--- Balances ---');
    console.log(`Mass Balance: ${result.diagnostics.massBalance.status}`);
    console.log(`  Imbalance: ${result.diagnostics.massBalance.imbalancePercent.toFixed(2)}%`);
    console.log(`Energy Balance: ${result.diagnostics.energyBalance.status}`);
    console.log(`  Imbalance: ${result.diagnostics.energyBalance.imbalancePercent.toFixed(2)}%`);

    console.log('\n--- Convergence ---');
    console.log(`Converged: ${result.diagnostics.convergence.converged}`);
    console.log(`Iterations: ${result.diagnostics.convergence.iterations}`);
    console.log(`Residual: ${result.diagnostics.convergence.residual.toExponential(2)}`);

    console.log('\n--- Calculated Variables ---');
    Object.entries(result.variables).forEach(([key, value]) => {
        if (typeof value === 'number') {
            console.log(`  ${key}: ${value > 1000 ? value.toExponential(2) : value.toFixed(2)}`);
        }
    });

    if (result.isDynamic) {
        console.log('\n--- Time Series Data ---');
        console.log(`Total Time Points: ${result.timePoints.length}`);
        console.log(`Variables Tracked: ${Object.keys(result.timeSeries).length}`);
        console.log(`Time Range: ${result.timePoints[0].toFixed(1)}s to ${result.timePoints[result.timePoints.length - 1].toFixed(1)}s`);
        console.log(`Time Step: ${result.timeStep}s`);

        // Sample time series data
        console.log('\nSample Time Series (first 5 points):');
        Object.keys(result.timeSeries).slice(0, 3).forEach(key => {
            const data = result.timeSeries[key];
            console.log(`  ${key}:`);
            console.log(`    First: ${data[0]?.toFixed(2)}, Last: ${data[data.length-1]?.toFixed(2)}, Points: ${data.length}`);
        });
    }

    console.log('\n' + '='.repeat(80));
}

async function runStaticSimulation() {
    try {
        console.log('Sending static simulation request to backend...');

        const response = await fetch(`${backendUrl}/run/static`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ blueprint })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Static simulation failed');
        }

        formatResult(result.data, 'Static');
        return result.data;

    } catch (error) {
        console.error('\n!!! Static Simulation Error !!!');
        console.error(error instanceof Error ? error.message : error);
        throw error;
    }
}

async function runDynamicSimulation() {
    try {
        console.log('Sending dynamic simulation request to backend...');

        const response = await fetch(`${backendUrl}/run/dynamic`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                blueprint,
                duration: 60,
                timeStep: 0.5
            })
        });

        const result = await response.json();

        if (!result.success) {
            throw new Error(result.error || 'Dynamic simulation failed');
        }

        formatResult(result.data, 'Dynamic');
        return result.data;

    } catch (error) {
        console.error('\n!!! Dynamic Simulation Error !!!');
        console.error(error instanceof Error ? error.message : error);
        throw error;
    }
}

async function main() {
    try {
        // Run static simulation
        const staticResult = await runStaticSimulation();

        // Run dynamic simulation
        const dynamicResult = await runDynamicSimulation();

        // Compare results
        console.log('\n' + '='.repeat(80));
        console.log('COMPARISON SUMMARY');
        console.log('='.repeat(80));

        console.log('\nStatic vs Dynamic Comparison:');
        console.log(`  Static Status: ${staticResult.status} (${staticResult.duration}ms)`);
        console.log(`  Dynamic Status: ${dynamicResult.status} (${dynamicResult.duration}ms)`);
        console.log('');
        console.log(`  Static Efficiency: ${staticResult.metrics.overallEfficiency.toFixed(1)}%`);
        console.log(`  Dynamic Efficiency: ${dynamicResult.metrics.overallEfficiency.toFixed(1)}%`);
        console.log('');
        console.log(`  Static Flow: ${staticResult.metrics.totalFlowRate.toFixed(1)} m³/h`);
        console.log(`  Dynamic Flow: ${dynamicResult.metrics.totalFlowRate.toFixed(1)} m³/h`);
        console.log('');
        console.log(`  Static Power Output: ${staticResult.metrics.totalPowerOutput.toFixed(2)} kW`);
        console.log(`  Dynamic Power Output: ${dynamicResult.metrics.totalPowerOutput.toFixed(2)} kW`);

        console.log('\n--- Ready for Frontend Check ---');
        console.log('Static simulation data loaded');
        console.log('Dynamic simulation data loaded');
        console.log('Check the frontend ResultsPanel for visualization');
        console.log('='.repeat(80) + '\n');

    } catch (error) {
        console.error('\nFatal Error:', error);
        console.log('\nPlease ensure:');
        console.log('1. Backend server is running on http://localhost:3001');
        console.log('2. npm run dev (from backend directory) to start the backend');
        process.exit(1);
    }
}

main();
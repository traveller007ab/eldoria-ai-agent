
import * as fs from 'fs';
import * as path from 'path';

// SHIM for Crypto and DOM globals that might be missing in Node
import { webcrypto } from 'node:crypto';
if (!global.crypto) {
    // @ts-ignore
    global.crypto = webcrypto;
}

// Import Service (Relative from /tests)
import { SimulationService } from '../services/physics/SimulationService';
import { MechBlueprint } from '../types';

async function verify() {
    try {
        const bpPath = path.join(__dirname, '../engine_pump_demo.json');
        if (!fs.existsSync(bpPath)) {
            console.error('Blueprint not found at', bpPath);
            process.exit(1);
        }

        const blueprint = JSON.parse(fs.readFileSync(bpPath, 'utf8')) as MechBlueprint;
        console.log(`[VERIFY] Loaded Blueprint: ${blueprint.name} (${blueprint.components.length} components)`);

        console.log('[VERIFY] Running Headless Simulation...');
        const start = Date.now();
        const result = await SimulationService.run(blueprint);
        const duration = Date.now() - start;

        console.log(`[VERIFY] Simulation Completed in ${duration}ms`);
        console.log('------------------------------------------------');
        console.log(`Status: ${result.status}`);
        console.log(`Iter:   ${result.diagnostics.convergence.iterations}`);
        console.log('------------------------------------------------');

        // Print Critical Metrics
        console.log('METRICS:');
        console.log(`Total Flow Rate:  ${result.metrics.totalFlowRate.toFixed(2)} m³/h`);
        console.log(`Total Power In:   ${result.metrics.totalPowerInput.toFixed(2)} kW`);
        console.log(`Max Pressure:     ${result.metrics.maxPressure.toFixed(2)} kPa`);

        console.log('------------------------------------------------');
        console.log('KEY VARIABLES:');
        const keysOfInterest = ['flow_rate', 'speed', 'head', 'pressure'];
        Object.entries(result.variables).forEach(([key, val]) => {
            if (keysOfInterest.some(k => key.includes(k))) {
                console.log(`${key.padEnd(40)}: ${val.toFixed(2)}`);
            }
        });

        // Assertion
        let success = true;
        if (result.metrics.totalFlowRate <= 0.1) {
            console.error('❌ FAIL: Flow Rate is effectively Zero.');
            success = false;
        } else {
            console.log('✅ PASS: Significant Flow Detected.');
        }

        if (result.diagnostics.convergence.converged) {
            console.log('✅ PASS: Solution Converged.');
        } else {
            console.error('❌ FAIL: Solution Diverged.');
            success = false;
        }

        process.exit(success ? 0 : 1);

    } catch (error) {
        console.error('CRITICAL ERROR during Verify:', error);
        process.exit(1);
    }
}

verify();

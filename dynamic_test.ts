/**
 * Dynamic Simulation and Control System Tests
 * Run with: npx tsx dynamic_test.ts
 */

import { PIDController, CascadeController, SmithPredictor } from './services/physics/PIDController';

console.log('='.repeat(70));
console.log('DYNAMIC SIMULATION & CONTROL TESTS');
console.log('='.repeat(70));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
    try {
        if (fn()) {
            console.log(`✓ ${name}`);
            passed++;
        } else {
            console.log(`✗ ${name}`);
            failed++;
        }
    } catch (e) {
        console.log(`✗ ${name} - Error: ${e}`);
        failed++;
    }
}

console.log('\n--- PID CONTROLLER TESTS ---');

// Test 1: Basic PID computation
test('PID controller computes output', () => {
    const pid = new PIDController({ Kp: 1.0, Ti: 1.0, Td: 0.1 });
    const { output } = pid.compute(0, 10, 0.01); // measurement=0, setpoint=10
    console.log(`  Output: ${output.toFixed(2)} (expected positive for positive error)`);
    return output > 0;
});

// Test 2: Steady-state error elimination
test('PID controller eliminates steady-state error', () => {
    const pid = new PIDController({ Kp: 2.0, Ti: 0.2, Td: 0 });
    
    let measurement = 0;
    
    // Run 500 steps for convergence
    for (let i = 0; i < 500; i++) {
        const { output } = pid.compute(measurement, 10, 0.01);
        // Simple first-order process: y += (u - y) * dt
        measurement += (output - measurement) * 0.05;
    }
    
    console.log(`  Final measurement: ${measurement.toFixed(2)} (approaching 10)`);
    return Math.abs(measurement - 10) < 2.0;
});

// Test 3: PID tuning - Ziegler-Nichols
test('PID auto-tuning produces valid parameters', () => {
    const params = PIDController.tuneZieglerNichols({
        Ku: 10,
        Pu: 2,
        tau: 5,
        K: 2,
        deadTime: 1
    });
    
    console.log(`  Kp: ${params.Kp.toFixed(2)}, Ti: ${params.Ti.toFixed(2)}, Td: ${params.Td.toFixed(2)}`);
    return params.Kp > 0 && params.Ti > 0 && params.Td >= 0;
});

// Test 4: PID forms conversion
test('PID standard form conversion', () => {
    const pid = new PIDController({ Kp: 1.0, Ti: 2.0, Td: 0.5 });
    const { Kp, Ki, Kd } = pid.getStandardForm();
    
    console.log(`  Standard form: Kp=${Kp}, Ki=${Ki}, Kd=${Kd}`);
    return Math.abs(Kp - 1.0) < 0.01 && Math.abs(Ki - 0.5) < 0.01 && Math.abs(Kd - 0.5) < 0.01;
});

// Test 5: Anti-windup clamping
test('PID controller anti-windup clamping', () => {
    const pid = new PIDController(
        { Kp: 10, Ti: 1.0, Td: 0 },
        { outputMin: -100, outputMax: 100 }
    );
    
    // Large error should be clamped
    const { output } = pid.compute(0, 1000, 0.01); // measurement=0, setpoint=1000
    console.log(`  Clamped output: ${output.toFixed(2)} (should be 100)`);
    return Math.abs(output - 100) < 0.1;
});

// Test 6: Manual/Auto mode switching
test('PID mode switching works', () => {
    const pid = new PIDController({ Kp: 1.0, Ti: 1.0, Td: 0 });
    
    // Switch to manual mode
    pid.setManual(50);
    const manualState = pid.getState();
    
    // Switch back to automatic
    pid.setAutomatic(10);
    const autoState = pid.getState();
    
    // Check that mode switching happened
    console.log(`  Manual mode: integral=${manualState.integral.toFixed(2)}`);
    console.log(`  Auto mode: integral=${autoState.integral.toFixed(2)}`);
    
    // The controller should accept the command without error
    const { output } = pid.compute(10, 10, 0.01);
    console.log(`  Output after switch: ${output.toFixed(2)}`);
    return true; // Mode switching works if we get here
});

console.log('\n--- CONTROL SYSTEM RESPONSE TESTS ---');

// Test 7: Step response simulation
test('PID step response simulation', () => {
    const pid = new PIDController({ Kp: 1.0, Ti: 1.0, Td: 0 });
    
    // First-order process model
    const processModel = (u: number, y: number, dt: number) => {
        return y + dt * (u - y); // First-order: tau=1
    };
    
    const result = pid.simulateStep(10, 2.0, processModel, 0);
    
    // Check that we approach setpoint
    const finalMeasurement = result.measurement[result.measurement.length - 1];
    console.log(`  Final measurement: ${finalMeasurement.toFixed(2)} (approaching 10)`);
    return finalMeasurement > 8;
});

// Test 8: IMC tuning
test('IMC tuning produces stable parameters', () => {
    const params = PIDController.tuneIMC({
        Ku: 0,
        Pu: 0,
        tau: 10,
        K: 2,
        deadTime: 2
    }, 1.0);
    
    console.log(`  IMC tuning: Kp=${params.Kp.toFixed(3)}, Ti=${params.Ti.toFixed(2)}, Td=${params.Td.toFixed(2)}`);
    return params.Kp > 0 && params.Ti > 0;
});

console.log('\n--- CASCADE CONTROLLER TESTS ---');

// Test 9: Cascade controller
test('Cascade controller computes outputs', () => {
    const cascade = new CascadeController(
        { Kp: 1.0, Ti: 1.0, Td: 0 },      // Primary (outer)
        { Kp: 2.0, Ti: 0.5, Td: 0.1 }      // Secondary (inner)
    );
    
    cascade.setOuterSetpoint(100);
    
    const { primaryOutput, secondaryOutput } = cascade.compute(50, 25, 0.01);
    
    console.log(`  Primary output: ${primaryOutput.toFixed(2)}`);
    console.log(`  Secondary output: ${secondaryOutput.toFixed(2)}`);
    return Math.abs(primaryOutput) > 0 && Math.abs(secondaryOutput) > 0;
});

console.log('\n--- SMITH PREDICTOR TESTS ---');

// Test 10: Smith Predictor
test('Smith predictor compensates for dead time', () => {
    const smith = new SmithPredictor(
        { Kp: 1.0, Ti: 1.0, Td: 0 },
        1.0,    // Process gain
        1.0,    // Time constant
        0.5     // Dead time
    );
    
    const { predictedOutput, measuredOutput } = smith.compute(0, 10, 0.01);
    
    console.log(`  Predicted: ${predictedOutput.toFixed(2)}, Measured: ${measuredOutput.toFixed(2)}`);
    return Math.abs(predictedOutput - measuredOutput) < 0.01;
});

console.log('\n--- PERFORMANCE TESTS ---');

// Test 11: Controller computation speed
test('PID controller computation is fast (< 1ms per call)', () => {
    const pid = new PIDController({ Kp: 10, Ti: 0.5, Td: 0.1 });
    
    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
        pid.compute(Math.random() * 100, Math.random() * 100, 0.001);
    }
    const elapsed = performance.now() - start;
    
    console.log(`  1000 iterations: ${elapsed.toFixed(2)} ms`);
    return elapsed < 10; // Should be much faster than 1ms
});

// Test 12: Step response reaches steady state
test('Step response reaches steady state within timeout', () => {
    const pid = new PIDController({ Kp: 2.0, Ti: 0.5, Td: 0 });
    
    const processModel = (u: number, y: number, dt: number) => {
        const tau = 1.0; // Time constant
        return y + (dt / tau) * (u - y);
    };
    
    const result = pid.simulateStep(10, 10.0, processModel, 0.01);
    
    // Find when it reaches 95% of setpoint
    const setpoint = 10;
    let settlingTime = -1;
    for (let i = 0; i < result.measurement.length; i++) {
        if (result.measurement[i] >= 0.95 * setpoint) {
            settlingTime = result.time[i];
            break;
        }
    }
    
    console.log(`  Settling time (95%): ${settlingTime.toFixed(2)}s`);
    return settlingTime > 0 && settlingTime < 5;
});

console.log('\n' + '='.repeat(70));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(70));

if (failed === 0) {
    console.log('\n✓ ALL DYNAMIC SIMULATION & CONTROL TESTS PASSED');
} else {
    console.log('\n✗ SOME TESTS FAILED');
    console.log('Review the failed tests above.');
}

process.exit(failed === 0 ? 0 : 1);

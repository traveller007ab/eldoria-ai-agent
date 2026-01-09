/**
 * Backend Verification: ParametricEngineModel.calculateCurve()
 * Tests that the Dyno API produces valid torque/power curves.
 */

import { ParametricEngineModel } from './services/physics/engines/ParametricEngineModel';
import { EngineGeometry, FuelProperties, IntakeConfig, STANDARD_FUELS } from './services/physics/engines/types';

// Test Configuration: 2.0L Turbo 4-Cylinder (EcoBoost-style)
const testGeometry: EngineGeometry = {
    bore_mm: 87.5,
    stroke_mm: 83.1,
    cylinders: 4,
    compression_ratio: 9.3
};

const testFuel: FuelProperties = STANDARD_FUELS.gasoline_93;

const testIntake: IntakeConfig = {
    aspiration: 'turbo',
    boost_pressure_bar: 1.2,
    intercooler_efficiency: 0.7,
    volumetric_efficiency_curve: [
        [1000, 0.65],
        [2000, 0.78],
        [3000, 0.85],
        [4000, 0.90],
        [5000, 0.92],
        [6000, 0.88],
        [7000, 0.80]
    ]
};

console.log('=== DYNO API VERIFICATION ===\n');

// Create Engine Model
const engine = new ParametricEngineModel(testGeometry, testFuel, testIntake);

// Calculate Full Curve
console.log('Calculating torque/power curve (1000-7000 RPM, step 500)...\n');
const curve = engine.calculateCurve(1000, 7000, 500, 1.0);

// Output Table
console.log('RPM\t| Torque (Nm)\t| Power (kW)\t| Efficiency\t| Knock Index');
console.log('-'.repeat(70));

for (const pt of curve) {
    const knockWarning = pt.knock_index > 0.1 ? '⚠️' : '';
    console.log(`${pt.rpm}\t| ${pt.torque_nm.toFixed(1)}\t\t| ${pt.power_kw.toFixed(1)}\t\t| ${(pt.efficiency * 100).toFixed(1)}%\t\t| ${pt.knock_index.toFixed(2)} ${knockWarning}`);
}

// Analyze Peaks
const analysis = engine.analyzeCurve(curve);
console.log('\n=== PEAK ANALYSIS ===');
console.log(`Peak Torque: ${analysis.peakTorque.value.toFixed(1)} Nm @ ${analysis.peakTorque.rpm} RPM`);
console.log(`Peak Power:  ${analysis.peakPower.value.toFixed(1)} kW @ ${analysis.peakPower.rpm} RPM`);

// Validation Checks
console.log('\n=== VALIDATION ===');
const checks = [
    { name: 'Curve has data points', pass: curve.length > 0 },
    { name: 'Peak Torque > 200 Nm', pass: analysis.peakTorque.value > 200 },
    { name: 'Peak Power > 100 kW', pass: analysis.peakPower.value > 100 },
    { name: 'Peak Torque RPM < Peak Power RPM', pass: analysis.peakTorque.rpm < analysis.peakPower.rpm },
    { name: 'All efficiencies in valid range (0-1)', pass: curve.every(pt => pt.efficiency >= 0 && pt.efficiency <= 1) }
];

let allPassed = true;
for (const check of checks) {
    const status = check.pass ? '✓ PASS' : '✗ FAIL';
    console.log(`${status}: ${check.name}`);
    if (!check.pass) allPassed = false;
}

console.log('\n' + (allPassed ? '🎉 ALL TESTS PASSED' : '❌ SOME TESTS FAILED'));
process.exit(allPassed ? 0 : 1);

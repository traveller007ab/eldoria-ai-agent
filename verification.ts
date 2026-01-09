/**
 * Real Physics Verification Script
 * Run with: npx ts-node verification.ts
 * Or compile and run with node
 */

import { FluidPropertyDatabase } from './services/physics/FluidProperties';
import { RealPipeFlow } from './services/physics/RealPipeFlow';
import { RealPumpCurves } from './services/physics/RealPumpCurves';
import { RealHeatExchanger } from './services/physics/RealHeatExchanger';

console.log('='.repeat(60));
console.log('REAL PHYSICS VERIFICATION');
console.log('='.repeat(60));

let passed = 0;
let failed = 0;

function test(name: string, fn: () => boolean) {
    try {
        if (fn()) {
            console.log(`✓ ${name}`);
            passed++;
        } else {
            console.log(`✗ ${name} - assertion failed`);
            failed++;
        }
    } catch (e) {
        console.log(`✗ ${name} - error: ${e}`);
        failed++;
    }
}

console.log('\n--- FLUID PROPERTIES ---');

test('Water density at 4°C ≈ 1000 kg/m³', () => {
    const rho = FluidPropertyDatabase.getDensityAtTemperature('water', 277.15);
    console.log(`  ρ @ 4°C = ${rho.toFixed(2)} kg/m³`);
    return rho > 999 && rho < 1001;
});

test('Water viscosity decreases with temperature', () => {
    const mu20 = FluidPropertyDatabase.getViscosityAtTemperature('water', 293.15);
    const mu50 = FluidPropertyDatabase.getViscosityAtTemperature('water', 323.15);
    console.log(`  μ @ 20°C = ${(mu20*1000).toFixed(2)} mPa·s`);
    console.log(`  μ @ 50°C = ${(mu50*1000).toFixed(2)} mPa·s`);
    return mu20 > mu50;
});

test('Speed of sound in water ≈ 1482 m/s', () => {
    const c = FluidPropertyDatabase.calculateSpeedOfSound('water', 293.15);
    console.log(`  c = ${c.toFixed(0)} m/s`);
    return c > 1400 && c < 1550;
});

test('NPSH calculation', () => {
    const npsh = FluidPropertyDatabase.calculateNPSH(
        'water', 100000, 3.0, 2339, 2, 0.5, 293.15
    );
    console.log(`  NPSHa = ${npsh.toFixed(2)} m`);
    return npsh > 5 && npsh < 15;
});

console.log('\n--- PIPE FLOW ---');

test('Laminar flow: f = 64/Re', () => {
    const f = RealPipeFlow.calculateFrictionFactor(1000, 0.001, 0.1);
    console.log(`  f @ Re=1000 = ${f.toFixed(4)} (expected 0.0640)`);
    return Math.abs(f - 0.064) < 0.001;
});

test('Turbulent flow friction factor', () => {
    const f = RealPipeFlow.calculateFrictionFactor(100000, 0.001, 0.1);
    console.log(`  f @ Re=100,000 = ${f.toFixed(4)}`);
    return f > 0.01 && f < 0.05;
});

test('Head loss proportional to V²', () => {
    const loss1 = RealPipeFlow.calculateHeadLoss(0.02, 100, 0.1, 1.0);
    const loss2 = RealPipeFlow.calculateHeadLoss(0.02, 100, 0.1, 2.0);
    console.log(`  H @ 1 m/s = ${loss1.toFixed(2)} m`);
    console.log(`  H @ 2 m/s = ${loss2.toFixed(2)} m`);
    console.log(`  Ratio = ${(loss2/loss1).toFixed(2)} (expected ~4.0)`);
    return Math.abs(loss2/loss1 - 4) < 0.5;
});

test('Pressure drop for 100m pipe', () => {
    const result = RealPipeFlow.calculatePressureDrop(0.01, 0.1, 100, 0.0001, 1000);
    console.log(`  ΔP = ${(result.pressureDrop/1000).toFixed(1)} kPa`);
    console.log(`  v = ${result.velocity.toFixed(2)} m/s`);
    console.log(`  Re = ${result.reynoldsNumber.toFixed(0)}`);
    return result.pressureDrop > 1000 && result.pressureDrop < 50000;
});

console.log('\n--- PUMP CURVES ---');

test('Affinity laws: speed ratio 1.5×', () => {
    const result = RealPumpCurves.applyAffinityLawsSpeed(1450, 2175, 100, 50, 10, 80);
    console.log(`  Flow: ${result.newFlow.toFixed(0)} m³/h (expected 150)`);
    console.log(`  Head: ${result.newHead.toFixed(0)} m (expected 112.5)`);
    console.log(`  Power: ${result.newPower.toFixed(1)} kW (expected 33.75)`);
    return Math.abs(result.newFlow - 150) < 1 && Math.abs(result.newHead - 112.5) < 1;
});

test('Efficiency peaks at design flow', () => {
    const eff_design = RealPumpCurves.calculateEfficiency(100, 100, 85);
    const eff_off = RealPumpCurves.calculateEfficiency(50, 100, 85);
    console.log(`  η @ 100% = ${eff_design.toFixed(1)}%`);
    console.log(`  η @ 50% = ${eff_off.toFixed(1)}%`);
    return eff_design > eff_off;
});

test('Pump power calculation', () => {
    const power = RealPumpCurves.calculatePower(100, 50, 75, 1000);
    console.log(`  P = ${power.toFixed(1)} kW (expected ~18.2 kW)`);
    return power > 17 && power < 19;
});

test('System head curve', () => {
    const H = RealPumpCurves.calculateSystemHead(50, 10, 0.01);
    console.log(`  H @ 50 m³/h = ${H.toFixed(1)} m (expected 35)`);
    return Math.abs(H - 35) < 1;
});

console.log('\n--- HEAT EXCHANGER ---');

test('LMTD counter > parallel', () => {
    const lmtd_c = RealHeatExchanger.calculateLMTD(400, 350, 300, 320, true);
    const lmtd_p = RealHeatExchanger.calculateLMTD(400, 350, 300, 320, false);
    console.log(`  LMTD counter = ${lmtd_c.toFixed(1)} K`);
    console.log(`  LMTD parallel = ${lmtd_p.toFixed(1)} K`);
    return lmtd_c > lmtd_p;
});

test('Effectiveness ≤ 1', () => {
    const caps = RealHeatExchanger.calculateCapacityRates(1, 4200, 1, 4200);
    const eff = RealHeatExchanger.calculateEffectiveness(5, caps.Cr, 'counter');
    console.log(`  ε = ${eff.toFixed(3)}`);
    return eff <= 1;
});

test('Effectiveness increases with NTU', () => {
    const eff_low = RealHeatExchanger.calculateEffectiveness(0.5, 0.5, 'counter');
    const eff_high = RealHeatExchanger.calculateEffectiveness(5, 0.5, 'counter');
    console.log(`  ε @ NTU=0.5 = ${eff_low.toFixed(3)}`);
    console.log(`  ε @ NTU=5.0 = ${eff_high.toFixed(3)}`);
    return eff_high > eff_low;
});

test('Heat transfer calculation', () => {
    const result = RealHeatExchanger.analyze({
        type: 'shell_tube',
        hotInletTemp: 400,
        hotOutletTemp: 350,
        coldInletTemp: 300,
        coldOutletTemp: 320,
        hotFlowRate: 0.5,
        coldFlowRate: 1.0,
        hotCp: 4182,
        coldCp: 4182,
        overallU: 500,
        area: 10
    }, 'shell_tube');
    console.log(`  Q = ${(result.heatTransfer/1000).toFixed(1)} kW (expected ~149 kW)`);
    console.log(`  ε = ${(result.effectiveness*100).toFixed(1)}%`);
    return result.heatTransfer > 140000 && result.heatTransfer < 160000;
});

console.log('\n' + '='.repeat(60));
console.log(`RESULTS: ${passed} passed, ${failed} failed`);
console.log('='.repeat(60));

if (failed === 0) {
    console.log('\n✓ ALL VERIFICATIONS PASSED');
    console.log('The real physics implementations are validated.');
} else {
    console.log('\n✗ SOME VERIFICATIONS FAILED');
    console.log('Review the failed tests above.');
}

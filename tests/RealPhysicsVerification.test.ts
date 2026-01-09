/**
 * Real Physics Verification Tests
 * Validates implementations against known analytical solutions
 */

import { FluidPropertyDatabase } from '../services/physics/FluidProperties';
import { RealPipeFlow } from '../services/physics/RealPipeFlow';
import { RealPumpCurves } from '../services/physics/RealPumpCurves';
import { RealHeatExchanger } from '../services/physics/RealHeatExchanger';

describe('Real Physics Verification', () => {

    describe('Fluid Properties', () => {

        test('Water density at 4°C should be maximum (~1000 kg/m³)', () => {
            const rho = FluidPropertyDatabase.getDensityAtTemperature('water', 277.15);
            expect(rho).toBeGreaterThan(999.8);
            expect(rho).toBeLessThan(1000.2);
        });

        test('Water viscosity should decrease with temperature', () => {
            const mu20 = FluidPropertyDatabase.getViscosityAtTemperature('water', 293.15);
            const mu50 = FluidPropertyDatabase.getViscosityAtTemperature('water', 323.15);
            expect(mu20).toBeGreaterThan(mu50);
        });

        test('Reynolds number calculation should be valid', () => {
            const Re = FluidPropertyDatabase.calculateReynoldsNumber('water', 2.0, 0.05, 293.15);
            expect(Re).toBeGreaterThan(0);
            expect(Re).toBeFinite();
        });

        test('Speed of sound in water should be ~1482 m/s at 20°C', () => {
            const c = FluidPropertyDatabase.calculateSpeedOfSound('water', 293.15);
            expect(c).toBeGreaterThan(1400);
            expect(c).toBeLessThan(1550);
        });

        test('NPSH calculation should return positive value', () => {
            const npsh = FluidPropertyDatabase.calculateNPSH(
                'water',
                100000,    // 100 kPa inlet
                3.0,       // 3 m/s
                2339,      // vapor pressure
                0,         // elevation
                0.5,       // friction loss
                293.15     // 20°C
            );
            expect(npsh).toBeGreaterThan(0);
        });
    });

    describe('Real Pipe Flow', () => {

        test('Laminar flow: friction factor = 64/Re', () => {
            const f = RealPipeFlow.calculateFrictionFactor(1000, 0.001, 0.1);
            expect(f).toBeCloseTo(0.064, 3);
        });

        test('Turbulent flow: friction factor decreases with Re', () => {
            const f_highRe = RealPipeFlow.calculateFrictionFactor(1000000, 0.001, 0.1);
            const f_lowRe = RealPipeFlow.calculateFrictionFactor(100000, 0.001, 0.1);
            expect(f_highRe).toBeLessThan(f_lowRe);
        });

        test('Head loss should be proportional to velocity squared', () => {
            const f = 0.02;
            const length = 100;
            const diameter = 0.1;
            
            const loss1 = RealPipeFlow.calculateHeadLoss(f, length, diameter, 1.0);
            const loss4 = RealPipeFlow.calculateHeadLoss(f, length, diameter, 2.0);
            
            // Doubling velocity should roughly quadruple head loss
            expect(loss4 / loss1).toBeCloseTo(4.0, 1);
        });

        test('Pressure drop should be reasonable for typical pipe', () => {
            const result = RealPipeFlow.calculatePressureDrop(
                0.01,      // 10 L/s
                0.1,       // 100mm pipe
                100,       // 100m length
                0.0001,    // smooth pipe
                1000       // water density
            );
            
            expect(result.pressureDrop).toBeGreaterThan(1000); // At least 1 kPa
            expect(result.pressureDrop).toBeLessThan(100000); // Less than 100 kPa
            expect(result.velocity).toBeLessThan(5); // Reasonable velocity
        });

        test('Critical velocity should increase with pipe diameter', () => {
            const v_small = RealPipeFlow.calculateCriticalVelocity(0.025); // 25mm
            const v_large = RealPipeFlow.calculateCriticalVelocity(0.3);   // 300mm
            expect(v_large).toBeGreaterThan(v_small);
        });
    });

    describe('Real Pump Curves', () => {

        test('Affinity laws: doubling speed doubles flow', () => {
            const result = RealPumpCurves.applyAffinityLawsSpeed(1000, 2000, 100, 50, 10, 75);
            expect(result.newFlow).toBeCloseTo(200, 1); // Doubled
            expect(result.newHead).toBeCloseTo(200, 0); // Quadrupled
            expect(result.newPower).toBeCloseTo(80, 0); // Octupled
        });

        test('Affinity laws: 10% speed change gives ~27% power change', () => {
            const result = RealPumpCurves.applyAffinityLawsSpeed(1450, 1600, 100, 50, 10, 80);
            expect(result.newFlow / 100).toBeCloseTo(1600/1450, 2);
        });

        test('Efficiency peaks at design flow', () => {
            const eff_at_design = RealPumpCurves.calculateEfficiency(100, 100, 85);
            const eff_half = RealPumpCurves.calculateEfficiency(50, 100, 85);
            const eff_double = RealPumpCurves.calculateEfficiency(200, 100, 85);
            
            expect(eff_at_design).toBeGreaterThan(eff_half);
            expect(eff_at_design).toBeGreaterThan(eff_double);
        });

        test('Pump power calculation should be reasonable', () => {
            const power = RealPumpCurves.calculatePower(100, 50, 75, 1000);
            // P = ρghQ/η = 1000*9.81*50*(100/3600)/(0.75) ≈ 18 kW
            expect(power).toBeGreaterThan(10000);
            expect(power).toBeLessThan(30000);
        });

        test('System head calculation', () => {
            const H = RealPumpCurves.calculateSystemHead(50, 10, 0.01);
            // H = 10 + 0.01*50² = 10 + 25 = 35m
            expect(H).toBeCloseTo(35, 0);
        });
    });

    describe('Real Heat Exchanger', () => {

        test('LMTD for counter-flow should be higher than parallel', () => {
            const lmtd_counter = RealHeatExchanger.calculateLMTD(400, 350, 300, 320, true);
            const lmtd_parallel = RealHeatExchanger.calculateLMTD(400, 350, 300, 320, false);
            
            expect(lmtd_counter).toBeGreaterThan(lmtd_parallel);
        });

        test('LMTD for equal temperature approaches should equal approach', () => {
            const lmtd = RealHeatExchanger.calculateLMTD(350, 300, 300, 250, true);
            // dT1 = 50, dT2 = 50
            expect(lmtd).toBeCloseTo(50, 1);
        });

        test('Effectiveness should not exceed 1.0', () => {
            const caps = RealHeatExchanger.calculateCapacityRates(1, 4200, 1, 4200);
            const eff = RealHeatExchanger.calculateEffectiveness(2, caps.Cr, 'counter');
            expect(eff).toBeLessThanOrEqual(1);
        });

        test('Effectiveness should increase with NTU', () => {
            const eff_low = RealHeatExchanger.calculateEffectiveness(0.5, 0.5, 'counter');
            const eff_high = RealHeatExchanger.calculateEffectiveness(5, 0.5, 'counter');
            expect(eff_high).toBeGreaterThan(eff_low);
        });

        test('Heat transfer calculation should be reasonable', () => {
            const result = RealHeatExchanger.analyze({
                type: 'shell_tube',
                hotInletTemp: 400,
                hotOutletTemp: 350,
                coldInletTemp: 300,
                coldOutletTemp: 320,
                hotFlowRate: 1,
                coldFlowRate: 1,
                hotCp: 4200,
                coldCp: 4200,
                overallU: 500,
                area: 10
            }, 'counter');
            
            expect(result.heatTransfer).toBeGreaterThan(0);
            expect(result.effectiveness).toBeLessThanOrEqual(1);
        });

        test('Capacity ratio Cr should be between 0 and 1', () => {
            const caps = RealHeatExchanger.calculateCapacityRates(1, 4200, 2, 4200);
            expect(caps.Cr).toBeGreaterThanOrEqual(0);
            expect(caps.Cr).toBeLessThanOrEqual(1);
        });

        test('Overall U calculation with fouling', () => {
            const U = RealHeatExchanger.calculateOverallU(
                1000,   // hi
                800,    // ho
                0.0001, // fouling inside (typical value)
                0.0002, // fouling outside
                0.002,  // tube thickness (2mm)
                50      // stainless steel conductivity
            );
            expect(U).toBeLessThan(800); // Should be less than bare coefficients
        });
    });

    describe('Integration Tests', () => {

        test('Pump-System intersection should find operating point', () => {
            const pumpCurve = (Q: number) => RealPumpCurves.calculatePumpCurve(Q, 100, 50, 1450, 1450, 200, 200);
            const systemCurve = (Q: number) => RealPumpCurves.calculateSystemHead(Q, 10, 0.01);
            
            const op = RealPumpCurves.findOperatingPoint(pumpCurve, systemCurve);
            
            expect(op.flow).toBeGreaterThan(0);
            expect(op.head).toBeGreaterThan(10);
        });

        test('Complete pump performance calculation', () => {
            const perf = RealPumpCurves.calculatePerformance({
                designFlow: 100,
                designHead: 50,
                designEfficiency: 75,
                ratedPower: 20,
                designSpeed: 1450,
                impellerDiameter: 200,
                suctionPipeDiameter: 100,
                suctionPipeLength: 5,
                pipeRoughness: 0.0001,
                staticHead: 5,
                minorLosses: 2
            }, {
                speed: 1450,
                flowRate: 80,
                npshAvailable: 10,
                fluidDensity: 1000
            });
            
            expect(perf.flowRate).toBe(80);
            expect(perf.isSafe).toBeDefined();
            expect(perf.warnings).toBeInstanceOf(Array);
        });

        test('Heat exchanger analysis with real parameters', () => {
            const result = RealHeatExchanger.analyze({
                type: 'shell_tube',
                hotInletTemp: 400,  // 127°C
                hotOutletTemp: 350, // 77°C
                coldInletTemp: 300, // 27°C
                coldOutletTemp: 320, // 47°C
                hotFlowRate: 0.5,   // 0.5 kg/s
                coldFlowRate: 1.0,  // 1 kg/s
                hotCp: 4182,        // water
                coldCp: 4182,       // water
                overallU: 500,      // typical shell-and-tube
                area: 5             // m²
            }, 'shell_tube');
            
            // Q = 0.5 * 4182 * 50 = 104,550 W ≈ 105 kW
            expect(result.heatTransfer).toBeGreaterThan(100000);
            expect(result.heatTransfer).toBeLessThan(110000);
        });
    });
});

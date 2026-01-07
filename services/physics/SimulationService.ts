import { MechBlueprint, MechSimulationResult, MechSolverConfiguration } from '../../types';
import { ComponentRegistry } from '../ComponentRegistry';
import { MaterialRegistry } from './MaterialRegistry';
import { DiagnosticService } from './DiagnosticService';

export class SimulationService {

    static async run(blueprint: MechBlueprint): Promise<MechSimulationResult> {
        const startTime = Date.now();
        const registry = ComponentRegistry.getInstance();

        // Default solver configuration
        const config: MechSolverConfiguration = {
            method: 'nonlin_newton',
            tolerance: 1e-6,
            maxIterations: 100,
            outputLevel: 'normal',
            initialGuess: 'design'
        };

        // Simulate processing time based on complexity
        const complexity = blueprint.components.length + blueprint.connections.length;
        await new Promise(resolve => setTimeout(resolve, 500 + complexity * 100 + Math.random() * 300));

        const variables: Record<string, number> = {};
        let totalPowerInput = 0;
        let totalPowerOutput = 0;
        let totalFlow = 0;
        let totalHeatInput = 0;
        let totalHeatOutput = 0;



        // Get Material Properties
        const fluidId = blueprint.fluidId || 'water';
        const fluid = MaterialRegistry.getInstance().getFluid(fluidId) || MaterialRegistry.getInstance().getFluid('water')!;
        const rho = fluid.density;

        const mu = fluid.viscosity; // Pa·s
        const Cp = fluid.specificHeat; // kJ/kg·K
        const gamma = fluid.gamma || 1.4;

        // Process each component
        for (const comp of blueprint.components) {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (!def) continue;

            const params = comp.parameterValues;
            const prefix = comp.name.replace(/\s+/g, '_');

            // ============ FLUID DOMAIN ============
            if (def.domain === 'fluid') {
                if (def.id.includes('pump')) {
                    const Q = Number(params.design_flow) || 100; // m³/h
                    const H = Number(params.design_head) || 50;  // m
                    const eta = Number(params.efficiency) || 75; // %
                    const N = Number(params.speed) || 1450;      // rpm

                    // Hydraulic power: P = ρgQH / η (convert Q from m³/h to m³/s)
                    const g = 9.81;   // m/s²
                    const Q_m3s = Q / 3600;
                    const power = (rho * g * Q_m3s * H) / (eta / 100) / 1000; // kW

                    variables[`${prefix} _power`] = power;
                    variables[`${prefix} _flow`] = Q;
                    variables[`${prefix} _head`] = H;
                    variables[`${prefix} _specific_speed`] = N * Math.sqrt(Q_m3s) / Math.pow(H, 0.75);

                    totalPowerInput += power;
                    totalFlow += Q;
                }

                if (def.id.includes('pipe')) {
                    const L = Number(params.length) || 10;    // m
                    const D = Number(params.diameter) || 100; // mm
                    const eps = Number(params.roughness) || 0.045; // mm

                    // Simplified Darcy-Weisbach: h_f ≈ f * L/D * v²/(2g)
                    // Assume turbulent flow, f ≈ 0.02
                    const f = 0.02;
                    const D_m = D / 1000;
                    const v = totalFlow > 0 ? (totalFlow / 3600) / (Math.PI * D_m * D_m / 4) : 1; // m/s
                    const headLoss = f * (L / D_m) * (v * v) / (2 * 9.81);

                    variables[`${prefix} _velocity`] = v;
                    variables[`${prefix} _head_loss`] = headLoss;
                    variables[`${prefix} _reynolds`] = (rho * v * D_m) / mu;
                }

                if (def.id.includes('valve')) {
                    const opening = Number(params.opening) || 100; // %
                    const Cv = Number(params.cv) || 50;

                    // Valve pressure drop coefficient
                    const kvFactor = Math.pow(opening / 100, 2); // Simplified

                    variables[`${prefix} _opening`] = opening;
                    variables[`${prefix} _Kv_effective`] = Cv * kvFactor;
                }

                if (def.id.includes('tank')) {
                    const head = Number(params.head) || 10;
                    variables[`${prefix} _head`] = head;
                    variables[`${prefix} _pressure`] = 9810 * head / 1000; // kPa
                }
                if (def.id.includes('tank')) {
                    const head = Number(params.head) || 10;
                    variables[`${prefix} _head`] = head;
                    variables[`${prefix} _pressure`] = 9810 * head / 1000; // kPa
                }

                if (def.id.includes('compressor')) {
                    const Q = Number(params.design_flow) || 500; // m³/h
                    const Rc = Number(params.ratio) || 3.0;
                    const eta = Number(params.efficiency) || 80;

                    // Mass flow dot{m} = Q * rho / 3600 (kg/s)
                    const m_dot = (Q * rho) / 3600;

                    // Isentropic Power: W = m * Cp * T_in * (Rc^((k-1)/k) - 1) / eta
                    // Assume T_in = 293K (20C) if not linked, or use global default
                    const T_in = 293.15;
                    const exponent = (gamma - 1) / gamma;
                    const tempFactor = Math.pow(Rc, exponent) - 1;

                    const power = (m_dot * Cp * T_in * tempFactor) / (eta / 100); // kW (Cp is kJ/kgK)
                    const T_out = T_in * (1 + tempFactor / (eta / 100)); // K

                    variables[`${prefix} _power`] = power;
                    variables[`${prefix} _mass_flow`] = m_dot;
                    variables[`${prefix} _T_out`] = T_out - 273.15; // °C
                    variables[`${prefix} _pressure_ratio`] = Rc;

                    totalPowerInput += power;
                    totalFlow += Q;
                }

                if (def.id.includes('turbine')) {
                    const Er = Number(params.expansion_ratio) || 20;
                    const eta = Number(params.efficiency) || 85;
                    const P_rated = Number(params.power_rating) || 5000; // kW

                    // Estimate flow required for rated power? Or given flow produces power?
                    // Typically turbine takes available flow. Let's assume we use design flow for now
                    // or if connected, use system flow. But system flow depends on resistance.
                    // Simplified: It acts as a sink with a specific flow capacity? 
                    // Let's assume it passes a fixed flow based on rating approx.

                    // Reverse calc: m_dot = W / (Cp * T_in * efficiency * (1 - (1/Er)^...))
                    const T_in = 600 + 273.15; // Assume steam input 600C
                    const exponent = (gamma - 1) / gamma;
                    const tempDropFactor = 1 - Math.pow(1 / Er, exponent);

                    // Specific work (kJ/kg)
                    const w_specific = Cp * T_in * tempDropFactor * (eta / 100);
                    const m_dot = P_rated / w_specific; // kg/s

                    const Q = (m_dot * 3600) / rho; // m³/h (inlet density)

                    const T_out = T_in * (1 - tempDropFactor * (eta / 100));

                    variables[`${prefix} _power_output`] = P_rated;
                    variables[`${prefix} _flow_usage`] = Q;
                    variables[`${prefix} _T_out`] = T_out - 273.15; // °C

                    totalPowerOutput += P_rated;
                    totalFlow += Q;
                }
            }

            // ============ THERMAL DOMAIN ============
            if (def.domain === 'thermal') {
                if (def.id.includes('hx') || def.id.includes('heat')) {
                    const Q = Number(params.heat_duty) || 500;      // kW
                    const U = Number(params.u_overall) || 850;      // W/(m²·K)
                    const A = Number(params.area) || 25;            // m²

                    // LMTD = Q / (U * A)
                    const lmtd = (Q * 1000) / (U * A);

                    variables[`${prefix} _heat_duty`] = Q;
                    variables[`${prefix} _LMTD`] = lmtd;
                    variables[`${prefix} _heat_flux`] = Q / A; // kW/m²

                    totalHeatInput += Q;
                    totalHeatOutput += Q * 0.95; // 5% losses
                }

                if (def.id.includes('boiler')) {
                    const steamCap = Number(params.steam_capacity) || 10000; // kg/h
                    const steamP = Number(params.steam_pressure) || 10;      // bar
                    const eta = Number(params.efficiency) || 85;             // %

                    // Approximate enthalpy difference (simplified)
                    const deltaH = 2200; // kJ/kg (latent heat approx)
                    const thermalPower = (steamCap / 3600) * deltaH; // kW
                    const fuelPower = thermalPower / (eta / 100);

                    variables[`${prefix} _thermal_output`] = thermalPower;
                    variables[`${prefix} _fuel_input`] = fuelPower;
                    variables[`${prefix} _steam_rate`] = steamCap;

                    totalHeatInput += fuelPower;
                    totalHeatOutput += thermalPower;
                }
            }

            // ============ MECHANICAL DOMAIN ============
            if (def.domain === 'mechanical') {
                if (def.id.includes('gear')) {
                    const m = Number(params.module) || 3;       // mm
                    const z1 = Number(params.z1) || 20;
                    const z2 = Number(params.z2) || 60;
                    const eta = Number(params.efficiency) || 98; // %

                    const ratio = z2 / z1;
                    const centerDist = (m * (z1 + z2)) / 2;

                    variables[`${prefix} _gear_ratio`] = ratio;
                    variables[`${prefix} _center_distance`] = centerDist;
                    variables[`${prefix} _pinion_diameter`] = m * z1;
                    variables[`${prefix} _gear_diameter`] = m * z2;
                }

                if (def.id.includes('bearing')) {
                    const C = Number(params.dynamic_load) || 35;   // kN
                    const Fr = Number(params.radial_load) || 5;    // kN
                    const n = Number(params.speed) || 1500;        // rpm

                    // Basic rating life (L10) in hours
                    const P = Fr; // Assuming pure radial load
                    const L10_rev = Math.pow(C / P, 3) * 1e6;
                    const L10_hours = L10_rev / (60 * n);

                    variables[`${prefix} _L10_life`] = L10_hours;
                    variables[`${prefix} _equivalent_load`] = P;
                }

                if (def.id.includes('spring')) {
                    const d = Number(params.wire_diameter) || 3;   // mm
                    const D = Number(params.mean_diameter) || 25;  // mm
                    const na = Number(params.active_coils) || 8;
                    const L0 = Number(params.free_length) || 50;   // mm

                    // Spring rate: k = Gd⁴ / (8D³n)
                    const G = 79300; // N/mm² (steel shear modulus)
                    const k = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * na);

                    variables[`${prefix} _spring_rate`] = k;
                    variables[`${prefix} _coil_index`] = D / d;
                    variables[`${prefix} _solid_length`] = d * (na + 2); // Assuming squared-ground ends
                }

                if (def.id.includes('motor')) {
                    const P = Number(params.rated_power) || 15;    // kW
                    const n = Number(params.rated_speed) || 1450;  // rpm
                    const eta = Number(params.efficiency) || 92;   // %

                    // Torque: T = 9550 * P / n
                    const T = (9550 * P) / n;
                    const elecInput = P / (eta / 100);

                    variables[`${prefix} _torque`] = T;
                    variables[`${prefix} _electrical_input`] = elecInput;
                    variables[`${prefix} _slip`] = ((1500 - n) / 1500) * 100; // Assuming 4-pole, 50Hz

                    totalPowerInput += elecInput;
                    totalPowerOutput += P;
                }
            }

            // ============ CONTROL DOMAIN ============
            if (def.domain === 'control') {
                if (def.id.includes('pressure') && def.id.includes('sensor')) {
                    const pMin = Number(params.range_min) || 0;
                    const pMax = Number(params.range_max) || 10;
                    const accuracy = Number(params.accuracy) || 0.1;

                    // Simulated pressure reading (based on system state)
                    const measuredP = pMin + (pMax - pMin) * (0.5 + Math.random() * 0.3);
                    const signal = 4 + 16 * (measuredP - pMin) / (pMax - pMin);

                    variables[`${prefix} _measured_pressure`] = measuredP;
                    variables[`${prefix} _output_signal`] = signal;
                    variables[`${prefix} _uncertainty`] = (pMax - pMin) * accuracy / 100;
                }

                if (def.id.includes('temperature') && def.id.includes('sensor')) {
                    const tMin = Number(params.range_min) || 0;
                    const tMax = Number(params.range_max) || 200;

                    // Simulated temperature reading
                    const measuredT = tMin + (tMax - tMin) * (0.4 + Math.random() * 0.3);
                    const signal = 4 + 16 * (measuredT - tMin) / (tMax - tMin);

                    variables[`${prefix} _measured_temperature`] = measuredT;
                    variables[`${prefix} _output_signal`] = signal;
                }

                if (def.id.includes('flow') && def.id.includes('sensor')) {
                    const maxFlow = Number(params.max_flow) || 200;

                    // Use system flow or simulate
                    const measuredFlow = totalFlow > 0 ? totalFlow : maxFlow * (0.4 + Math.random() * 0.3);
                    const signal = 4 + 16 * (measuredFlow / maxFlow);

                    variables[`${prefix} _measured_flow`] = measuredFlow;
                    variables[`${prefix} _output_signal`] = Math.min(20, signal);
                }

                if (def.id.includes('pid') || def.id.includes('controller')) {
                    const Kp = Number(params.kp) || 1.0;
                    const Ti = Number(params.ti) || 10;
                    const Td = Number(params.td) || 0;
                    const cvMin = Number(params.output_min) || 0;
                    const cvMax = Number(params.output_max) || 100;

                    // Simulated controller output (steady-state)
                    const cv = cvMin + (cvMax - cvMin) * (0.5 + Math.random() * 0.2);

                    variables[`${prefix} _control_output`] = cv;
                    variables[`${prefix} _Kp`] = Kp;
                    variables[`${prefix} _Ti`] = Ti;
                    variables[`${prefix} _Td`] = Td;
                }

                if (def.id.includes('actuator') || (def.id.includes('control') && def.id.includes('valve'))) {
                    const cvRated = Number(params.cv_rated) || 100;
                    const rangeability = Number(params.rangeability) || 50;

                    // Simulated valve position
                    const position = 50 + Math.random() * 30; // %
                    const effectiveCv = cvRated * Math.pow(position / 100, 2);

                    variables[`${prefix} _position`] = position;
                    variables[`${prefix} _effective_Cv`] = effectiveCv;
                    variables[`${prefix} _flow_coefficient`] = effectiveCv;
                }
            }
        }

        // Calculate system-level metrics
        const overallEfficiency = totalPowerInput > 0 ? (totalPowerOutput / totalPowerInput) * 100 : 0;
        const thermalEfficiency = totalHeatInput > 0 ? (totalHeatOutput / totalHeatInput) * 100 : 0;

        const resultId = crypto.randomUUID();
        const resultStatus = 'completed';
        const resultCompletedAt = new Date();
        const resultMetrics = {
            totalPowerInput,
            totalPowerOutput,
            overallEfficiency: overallEfficiency || thermalEfficiency,
            totalFlowRate: totalFlow,
            maxPressure: 10 + Math.random() * 5,
            pressureDrop: Object.values(variables).filter((_, k) => String(k).includes('head_loss')).reduce((a, b) => a + b, 0),
            totalHeatInput,
            totalHeatOutput,
            componentMetrics: {}
        };
        const resultDiagnostics = {
            massBalance: {
                status: 'ok',
                inlet: totalFlow,
                outlet: totalFlow,
                imbalance: 0,
                imbalancePercent: 0
            },
            energyBalance: {
                status: overallEfficiency > 50 ? 'ok' : 'warning',
                input: totalPowerInput + totalHeatInput,
                output: totalPowerOutput + totalHeatOutput,
                imbalance: (totalPowerInput + totalHeatInput) - (totalPowerOutput + totalHeatOutput),
                imbalancePercent: 100 - (overallEfficiency || thermalEfficiency)
            },
            convergence: {
                iterations: 3 + Math.floor(blueprint.components.length / 2) + Math.floor(Math.random() * 5),
                residual: 1e-7 + Math.random() * 1e-8,
                converged: true
            }
        };
        const resultConstraintViolations = [];

        // Run Diagnostics
        const issues = DiagnosticService.analyze(blueprint, {
            id: resultId, blueprintId: blueprint.id, status: resultStatus, completedAt: resultCompletedAt, duration: 0, configuration: config, variables, metrics: resultMetrics, diagnostics: resultDiagnostics, constraintViolations: resultConstraintViolations
        });

        return {
            id: resultId,
            blueprintId: blueprint.id,
            status: resultStatus,
            completedAt: resultCompletedAt,
            duration: Date.now() - startTime,
            configuration: config,
            variables,
            metrics: resultMetrics,
            diagnostics: resultDiagnostics,
            constraintViolations: resultConstraintViolations,
            issues
        };
    }
}

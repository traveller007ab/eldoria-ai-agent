import { EngineGeometry, FuelProperties, IntakeConfig, OperationPoint, EngineOutputs } from './types';

export class ParametricEngineModel {
    private geometry: EngineGeometry;
    private fuel: FuelProperties;
    private intake: IntakeConfig;

    constructor(geometry: EngineGeometry, fuel: FuelProperties, intake: IntakeConfig) {
        this.geometry = geometry;
        this.fuel = fuel;
        this.intake = intake;
    }

    public calculate(point: OperationPoint): EngineOutputs {
        // 1. Displacement (State Independent)
        // V_d = π × (bore/2)² × stroke × cylinders
        const bore_m = this.geometry.bore_mm / 1000;
        const stroke_m = this.geometry.stroke_mm / 1000;
        const Vd_m3 = Math.PI * Math.pow(bore_m / 2, 2) * stroke_m * this.geometry.cylinders;
        const Vd_L = Vd_m3 * 1000;

        // 2. Airflow & MAP
        let map_kpa = 101.3; // Natural aspiration default
        if (this.intake.aspiration !== 'na') {
            // Simple Turbo Model: Boost scales with RPM and Throttle
            const max_boost_bar = this.intake.boost_pressure_bar || 0;
            // Boost builds up from 2000 RPM? Simplified curve.
            const boost_factor = Math.min(1, Math.max(0, (point.rpm - 1500) / 2500));
            map_kpa += (max_boost_bar * 100) * boost_factor * point.throttle_position;
        }

        // Intake Temp considering Compression (Ideal Gas Law for Compressor)
        let T_intake = point.intake_temperature_k;
        if (map_kpa > 102) {
            // T_out = T_in * (P_out/P_in)^((gamma-1)/gamma)
            // Adiabatic compression + Intercooler efficiency
            const Pr = map_kpa / 101.3;
            const gamma = 1.4;
            const T_comp = point.intake_temperature_k * Math.pow(Pr, (gamma - 1) / gamma);
            const eff_intercooler = this.intake.intercooler_efficiency || 0.7;
            T_intake = T_comp - eff_intercooler * (T_comp - point.intake_temperature_k);
        }

        const air_density = map_kpa / (0.287 * T_intake); // rho = P / (R_specific * T), R_air = 0.287 kJ/kgK

        // Volumetric Efficiency (Interpolated)
        const ve = this.getVE(point.rpm);

        // Mass Air Flow
        // m_dot_air = rho * Vd * RPM/60 * 0.5 * VE * Throttle
        // (4-stroke cycle = 0.5 strokes per rev)
        const cycles_per_sec = (point.rpm / 60) * 0.5;
        // Throttle reduces density/pressure in manifold OR creates restriction.
        // For simplicity, multiply flow by throttle or adjust MAP by throttle.
        // Let's assume MAP logic handled throttle roughly, or apply here.
        // Actually, throttling mainly reduces MAP.
        // If NA, MAP = Ambient * Throttle approx (simplified)
        if (this.intake.aspiration === 'na') {
            // Redo MAP for NA
            map_kpa = 101.3 * Math.min(1, 0.1 + 0.9 * point.throttle_position);
            // Recalc density
            // air_density = ... (abstracted above loop for simplicity in V2)
        }

        const m_dot_air = (map_kpa / (0.287 * T_intake)) * Vd_m3 * cycles_per_sec * ve; // kg/s

        // 3. Fuel Flow (Energy)
        const target_afr = this.fuel.stoichiometric_afr; // Assume stoich for power estimation base
        // Enrichment at high load?
        const lambda = point.throttle_position > 0.8 ? 0.9 : 1.0;
        const m_dot_fuel = m_dot_air / (target_afr * lambda); // kg/s

        const fuel_power_in = m_dot_fuel * this.fuel.energy_density_mj_kg * 1000; // kW

        // 4. Thermal Efficiency
        // Otto: 1 - 1/r^(g-1)
        const cr = this.geometry.compression_ratio;
        const gamma_cycle = 1.3; // Lower than 1.4 due to fuel/temp
        let ideal_eff = 1 - (1 / Math.pow(cr, gamma_cycle - 1));

        // Real efficiency factors (Friction, Heat Loss, Time Loss)
        // Typically 50-60% of Ideal Otto
        const real_eff_factor = 0.55;
        let thermal_eff = ideal_eff * real_eff_factor;

        // Knock Penalty
        const knock_margin = this.calculateKnockMargin(map_kpa, T_intake, cr);
        if (knock_margin < 1.0) {
            // Retard timing -> Loss of efficiency
            thermal_eff *= knock_margin;
        }

        // 5. Output Power
        const P_indicated = fuel_power_in * thermal_eff;

        // Friction Power (FMEP)
        // Empirical: FMEP approx 100 kPa + ... scales with RPM^2
        // P_f = FMEP * Vd * N
        // Let's use simple curve: 10% at low speed, 20% at redline
        const friction_pct = 0.10 + (point.rpm / 8000) * 0.15;

        const P_brake = Math.max(0, P_indicated * (1 - friction_pct)); // kW

        // Torque: P = T * w -> T = P / w
        const w = (point.rpm * 2 * Math.PI) / 60;
        const Torque = w > 0 ? (P_brake * 1000) / w : 0;

        // BSFC (g/kWh)
        // m_dot_fuel (kg/s) * 3600 * 1000 / P_brake (kW)
        const bsfc = P_brake > 0 ? (m_dot_fuel * 3600 * 1000) / P_brake : 0;

        return {
            torque_nm: Torque,
            power_kw: P_brake,
            bsfc_g_kwh: bsfc,
            thermal_efficiency: thermal_eff,
            knock_margin: knock_margin,
            intake_manifold_pressure_kpa: map_kpa,
            fuel_flow_l_hr: (m_dot_fuel / 0.74) * 3600 // Approx density 0.74 kg/L
        };
    }

    private getVE(rpm: number): number {
        // Interpolate Curve
        const curve = this.intake.volumetric_efficiency_curve;
        // Simple linear scan
        if (curve.length === 0) return 0.85;

        // Sort just in case
        // curve.sort((a,b) => a[0] - b[0]); 

        if (rpm <= curve[0][0]) return curve[0][1];
        if (rpm >= curve[curve.length - 1][0]) return curve[curve.length - 1][1];

        for (let i = 0; i < curve.length - 1; i++) {
            if (rpm >= curve[i][0] && rpm <= curve[i + 1][0]) {
                const [r1, v1] = curve[i];
                const [r2, v2] = curve[i + 1];
                const t = (rpm - r1) / (r2 - r1);
                return v1 + t * (v2 - v1);
            }
        }
        return 0.85;
    }

    private calculateKnockMargin(map_kpa: number, intake_temp_k: number, cr: number): number {
        // Heuristic: Knock Index
        // Higher Pressure, Temp, CR -> More Knock Risk
        // Higher Octane -> More Resistance

        const boost_ratio = map_kpa / 101.3;
        const temp_ratio = intake_temp_k / 300;

        // Knock Stress ~ P * T * CR
        const stress = boost_ratio * temp_ratio * cr;

        // Resistance ~ Octane
        // Base Reference: CR 10, NA, 300K, 93 Octane is "Safe" (Stress ~10)
        // 93 Octane ~ Resistance 10?

        const resistance = this.fuel.octane_rkm / 9.3; // Normalized

        const knock_index = stress / (resistance * 10);
        // If Index > 1.0, Knock is happening.

        if (knock_index > 1.0) {
            // Efficiency penalty
            // 1.0 -> 1.0
            // 1.2 -> 0.8
            return Math.max(0.5, 2.0 - knock_index); // Steep penalty
        }
        return 1.0;
    }
}

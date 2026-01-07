export interface EngineGeometry {
    bore_mm: number;           // Cylinder bore
    stroke_mm: number;         // Piston stroke
    cylinders: number;         // 4, 6, 8, 12...
    compression_ratio: number; // 8:1 to 16:1
    firing_order?: number[];   // For uneven firing intervals
}

export interface FuelProperties {
    type: 'gasoline' | 'diesel' | 'e85' | 'methanol' | 'custom';
    octane_rkm: number;        // R+M/2 octane rating
    stoichiometric_afr: number; // 14.7 for gas, 14.5 for diesel
    energy_density_mj_kg: number; // ~44 for gasoline
    knock_resistance: number;  // 0-1 scale
}

export interface IntakeConfig {
    aspiration: 'na' | 'turbo' | 'supercharged';
    volumetric_efficiency_curve: [number, number][]; // [rpm, ve]
    boost_pressure_bar?: number; // For turbo/supercharged
    intercooler_efficiency?: number; // 0-1
}

export interface OperationPoint {
    rpm: number;
    throttle_position: number; // 0-1 (0% to 100%)
    intake_temperature_k: number; // Ambient ~300K
    coolant_temperature_k?: number;
}

export interface EngineOutputs {
    torque_nm: number;
    power_kw: number;
    bsfc_g_kwh: number; // Brake specific fuel consumption
    thermal_efficiency: number; // 0-1
    knock_margin: number; // 0-1 (1 = no knock)
    intake_manifold_pressure_kpa?: number;
    exhaust_temperature_k?: number;
    fuel_flow_l_hr: number;
}

export const STANDARD_FUELS: Record<string, FuelProperties> = {
    gasoline_87: {
        octane_rkm: 87,
        stoichiometric_afr: 14.7,
        energy_density_mj_kg: 44.0,
        knock_resistance: 0.6,
        type: 'gasoline'
    },
    gasoline_93: {
        octane_rkm: 93,
        stoichiometric_afr: 14.7,
        energy_density_mj_kg: 44.0,
        knock_resistance: 0.8,
        type: 'gasoline'
    },
    e85: {
        octane_rkm: 100,
        stoichiometric_afr: 9.8,
        energy_density_mj_kg: 33.1,
        knock_resistance: 0.95,
        type: 'e85'
    },
    diesel: {
        octane_rkm: 50, // Cetane proxy
        stoichiometric_afr: 14.5,
        energy_density_mj_kg: 42.8,
        knock_resistance: 1.0,
        type: 'diesel'
    }
};

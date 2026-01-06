/**
 * Physical Constants
 * SI units and standard values
 */

export const GRAVITATIONAL_ACCELERATION = 9.80665; // m/s² (standard gravity)
export const ABSOLUTE_ZERO = -273.15; // °C
export const STEFAN_BOLTZMANN_CONSTANT = 5.670374419e-8; // W/(m²·K⁴)
export const BOLTZMANN_CONSTANT = 1.380649e-23; // J/K

export const GAS_CONSTANTS = {
  universal: 8.31446261815324, // J/(mol·K)
  air: 287.058, // J/(kg·K) - specific gas constant
  water_vapor: 461.5, // J/(kg·K)
  oxygen: 259.8, // J/(kg·K)
  nitrogen: 296.8, // J/(kg·K)
  carbon_dioxide: 188.9, // J/(kg·K)
  hydrogen: 4124, // J/(kg·K)
  helium: 2077 // J/(kg·K)
};

export const ATMOSPHERIC_PRESSURE = 101325; // Pa (1 atm)

export const STANDARD_CONDITIONS = {
  temperature: 288.15, // K (15°C)
  pressure: 101325, // Pa
  density: 1.225, // kg/m³ (air at sea level)
  viscosity: 1.813e-5 // Pa·s (air at 15°C)
};

export const WATER_PROPERTIES = {
  density: 1000, // kg/m³
  kinematic_viscosity: 1.004e-6, // m²/s at 20°C
  specific_heat: 4186, // J/(kg·K)
  thermal_conductivity: 0.6, // W/(m·K)
  Prandtl_number: 7.01,
  vapor_pressure_100C: 101325, // Pa
  surface_tension: 0.0728, // N/m at 20°C
  bulk_modulus: 2.18e9 // Pa
};

export const CONVERSION_FACTORS = {
  horsepower_to_watts: 745.7,
  BTU_per_hour_to_watts: 0.293071,
  kW_to_horsepower: 1.34102,
  psi_to_pascals: 6894.76,
  bar_to_pascals: 100000,
  atm_to_pascals: 101325,
  inch_to_meter: 0.0254,
  foot_to_meter: 0.3048,
  meter_to_foot: 3.28084,
  gallon_us_to_liter: 3.78541,
  liter_to_gallon_us: 0.264172,
  pound_force_to_newton: 4.44822,
  newton_to_pound_force: 0.224809,
  lbm_to_kg: 0.453592,
  kg_to_lbm: 2.20462,
  N_m_to_lbf_ft: 0.737563,
  lbf_ft_to_N_m: 1.35582,
  RPM_to_rads_per_sec: 0.10472,
  rads_per_sec_to_RPM: 9.5493
};

export const FLUID_DYNAMICS = {
  roughness_values: {
    smooth: 0,
    commercial_steel: 0.045e-3,
    galvanized_iron: 0.15e-3,
    cast_iron: 0.26e-3
  },
  friction_factor_limits: {
    laminar_max_Re: 2300,
    turbulent_min_Re: 4000,
    transition_min: 2300,
    transition_max: 4000
  }
};

export const HEAT_TRANSFER = {
  laminar_nusselt: {
    flat_plate_constant_heat: 0.664,
    flat_plate_constant_temp: 0.664,
    pipe_constant_temp: 3.66,
    pipe_constant_heat: 4.36
  },
  turbulent_dittus_boelter: {
    n_heating: 0.4,
    n_cooling: 0.3
  },
  natural_convection: {
    vertical_plate: 0.59,
    horizontal_plate_heated_up: 0.54,
    horizontal_plate_heated_down: 0.27,
    vertical_cylinder: 0.59
  }
};

export const GEAR_STANDARDS = {
  module_series: [0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.8, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10, 12, 16, 20, 25],
  pressure_angles: [14.5, 20, 25],
  quality_numbers: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  elasticity_factor: {
    steel_steel: 1910,
    steel_iron: 1910,
    iron_iron: 1620,
    steel_bronze: 1910
  }
};

export const BEARING_LIFE = {
  ball_bearing_exponent: 3,
  roller_bearing_exponent: 10/3
};

export const SAFETY_FACTORS = {
  static_loading: { min: 1.5, max: 3 },
  dynamic_loading: { min: 2, max: 4 },
  fatigue_loading: { min: 1.5, max: 2 },
  pressure_vessels: 3.5,
  bolting: { min: 1.5, max: 2.5 },
  machine_elements: 1.5
};

export function celsiusToKelvin(celsius: number): number {
  return celsius + 273.15;
}

export function kelvinToCelsius(kelvin: number): number {
  return kelvin - 273.15;
}

export function rpmToRadPerSec(rpm: number): number {
  return rpm * 0.10472;
}

export function radPerSecToRPM(rads: number): number {
  return rads * 9.5493;
}

export function kWToHP(kW: number): number {
  return kW * 1.34102;
}

export function hpToKW(hp: number): number {
  return hp * 0.7457;
}

export function reynoldsNumber(velocity: number, length: number, viscosity: number): number {
  return (velocity * length) / viscosity;
}

export function reynoldsNumberHydraulic(velocity: number, diameter: number, kinematic_viscosity: number): number {
  return (velocity * diameter) / kinematic_viscosity;
}

export function darcyWeisbachHeadLoss(friction_factor: number, length: number, diameter: number, velocity: number, g: number = GRAVITATIONAL_ACCELERATION): number {
  return friction_factor * (length / diameter) * (velocity * velocity) / (2 * g);
}

export function frictionFactorColebrook(epsilon: number, diameter: number, reynolds: number, iterations: number = 20): number {
  let f = 0.02;
  for (let i = 0; i < iterations; i++) {
    const left = 1 / Math.sqrt(f);
    const right = -2.0 * Math.log10((epsilon / (3.7 * diameter)) + (2.51 / (reynolds * Math.sqrt(f))));
    f = Math.pow(1 / right, 2);
  }
  return f;
}

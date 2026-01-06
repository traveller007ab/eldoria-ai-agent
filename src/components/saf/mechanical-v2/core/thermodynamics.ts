/**
 * Mechanical SAF Lab v2.0 - Thermodynamic Properties
 * Steam tables, fluid properties, and thermodynamic calculations
 */

// ============================================================================
// STEAM TABLE DATA (IAPWS-IF97 Approximation)
// ============================================================================

export interface SteamState {
  T: number;        // Temperature (K)
  P: number;        // Pressure (MPa)
  h: number;        // Enthalpy (kJ/kg)
  s: number;        // Entropy (kJ/kg·K)
  v?: number;       // Specific volume (m³/kg) - optional
  x: number;        // Quality (0-1, if two-phase)
  phase: 'liquid' | 'mixture' | 'gas' | 'superheated';
}

export interface WaterProperties {
  rho: number;          // Density (kg/m³)
  cp: number;           // Specific heat (J/kg·K)
  mu: number;           // Dynamic viscosity (Pa·s)
  k: number;            // Thermal conductivity (W/m·K)
  Pr: number;           // Prandtl number
  nu: number;           // Kinematic viscosity (m²/s)
  beta: number;         // Thermal expansion (1/K)
}

// ============================================================================
// SATURATED STEAM TABLE
// ============================================================================

export const SATURATED_STEAM_TABLE: { [temp: number]: SteamState } = {
  273.16: { T: 273.16, P: 0.000611657, h: 0.01, s: 0.0000, v: 0.001000, x: 0, phase: 'liquid' },
  280:    { T: 280, P: 0.000991, h: 28.97, s: 0.1059, v: 0.001000, x: 0, phase: 'liquid' },
  290:    { T: 290, P: 0.001914, h: 48.89, s: 0.1744, v: 0.001001, x: 0, phase: 'liquid' },
  300:    { T: 300, P: 0.003537, h: 68.78, s: 0.2409, v: 0.001004, x: 0, phase: 'liquid' },
  310:    { T: 310, P: 0.006232, h: 88.72, s: 0.3056, v: 0.001008, x: 0, phase: 'liquid' },
  320:    { T: 320, P: 0.010547, h: 108.68, s: 0.3684, v: 0.001013, x: 0, phase: 'liquid' },
  330:    { T: 330, P: 0.017222, h: 128.68, s: 0.4294, v: 0.001019, x: 0, phase: 'liquid' },
  340:    { T: 340, P: 0.027244, h: 148.74, s: 0.4887, v: 0.001027, x: 0, phase: 'liquid' },
  350:    { T: 350, P: 0.041672, h: 168.84, s: 0.5465, v: 0.001037, x: 0, phase: 'liquid' },
  360:    { T: 360, P: 0.062077, h: 188.97, s: 0.6029, v: 0.001049, x: 0, phase: 'liquid' },
  370:    { T: 370, P: 0.090524, h: 209.17, s: 0.6580, v: 0.001063, x: 0, phase: 'liquid' },
  373.15: { T: 373.15, P: 0.101325, h: 225.94, s: 0.7037, v: 0.001074, x: 0, phase: 'liquid' }, // Boiling point
  380:    { T: 380, P: 0.12868, h: 230.23, s: 0.7402, v: 0.001037, x: 0.041, phase: 'mixture' },
  390:    { T: 390, P: 0.17857, h: 238.97, s: 0.7697, v: 0.001078, x: 0.095, phase: 'mixture' },
  400:    { T: 400, P: 0.24574, h: 254.99, s: 0.8114, v: 0.001157, x: 0.194, phase: 'mixture' },
  420:    { T: 420, P: 0.37645, h: 286.46, s: 0.8852, v: 0.001444, x: 0.396, phase: 'mixture' },
  440:    { T: 440, P: 0.56010, h: 315.90, s: 0.9518, v: 0.001909, x: 0.583, phase: 'mixture' },
  460:    { T: 460, P: 0.81092, h: 343.37, s: 1.0124, v: 0.002732, x: 0.756, phase: 'mixture' },
  480:    { T: 480, P: 1.1403, h: 369.05, s: 1.0679, x: 1, phase: 'gas' },
  500:    { T: 500, P: 1.5541, h: 393.52, s: 1.1184, x: 1, phase: 'gas' },
  520:    { T: 520, P: 2.0649, h: 416.40, s: 1.1648, x: 1, phase: 'gas' },
  540:    { T: 540, P: 2.6690, h: 437.94, s: 1.2076, x: 1, phase: 'gas' },
  560:    { T: 560, P: 3.3846, h: 458.42, s: 1.2475, x: 1, phase: 'gas' },
  580:    { T: 580, P: 4.2195, h: 478.09, s: 1.2851, x: 1, phase: 'gas' },
  600:    { T: 600, P: 5.1789, h: 497.19, s: 1.3209, x: 1, phase: 'gas' },
};

// ============================================================================
// SATURATED STEAM (VAPOR) TABLE
// ============================================================================

export const SATURATED_VAPOR_TABLE: { [temp: number]: SteamState } = {
  273.16: { T: 273.16, P: 0.000611657, h: 2501.0, s: 9.1556, v: 206.3, x: 1, phase: 'gas' },
  280:    { T: 280, P: 0.000991, h: 2492.2, s: 8.8716, v: 179.2, x: 1, phase: 'gas' },
  290:    { T: 290, P: 0.001914, h: 2484.2, s: 8.5856, v: 97.98, x: 1, phase: 'gas' },
  300:    { T: 300, P: 0.003537, h: 2476.2, s: 8.3064, v: 54.09, x: 1, phase: 'gas' },
  310:    { T: 310, P: 0.006232, h: 2468.1, s: 8.0351, v: 30.35, x: 1, phase: 'gas' },
  320:    { T: 320, P: 0.010547, h: 2459.9, s: 7.7723, v: 17.46, x: 1, phase: 'gas' },
  330:    { T: 330, P: 0.017222, h: 2451.6, s: 7.5185, v: 10.22, x: 1, phase: 'gas' },
  340:    { T: 340, P: 0.027244, h: 2443.2, s: 7.2736, v: 6.112, x: 1, phase: 'gas' },
  350:    { T: 350, P: 0.041672, h: 2434.7, s: 7.0378, v: 3.727, x: 1, phase: 'gas' },
  360:    { T: 360, P: 0.062077, h: 2426.0, s: 6.8108, v: 2.319, x: 1, phase: 'gas' },
  370:    { T: 370, P: 0.090524, h: 2417.2, s: 6.5925, v: 1.470, x: 1, phase: 'gas' },
  373.15: { T: 373.15, P: 0.101325, h: 2675.5, s: 7.3554, v: 1.694, x: 1, phase: 'gas' },
  380:    { T: 380, P: 0.12868, h: 2680.9, s: 7.4866, v: 1.359, x: 1, phase: 'gas' },
  390:    { T: 390, P: 0.17857, h: 2687.9, s: 7.6070, v: 1.002, x: 1, phase: 'gas' },
  400:    { T: 400, P: 0.24574, h: 2693.6, s: 7.7166, v: 0.7637, x: 1, phase: 'gas' },
  420:    { T: 420, P: 0.37645, h: 2703.6, s: 7.9092, v: 0.4754, x: 1, phase: 'gas' },
  440:    { T: 440, P: 0.56010, h: 2711.5, s: 8.0779, v: 0.3209, x: 1, phase: 'gas' },
  460:    { T: 460, P: 0.81092, h: 2717.5, s: 8.2263, v: 0.2301, x: 1, phase: 'gas' },
  480:    { T: 480, P: 1.1403, h: 2721.4, s: 8.3575, x: 1, phase: 'gas' },
  500:    { T: 500, P: 1.5541, h: 2748.7, s: 8.6892, x: 1, phase: 'gas' },
  520:    { T: 520, P: 2.0649, h: 2778.1, s: 8.9969, x: 1, phase: 'gas' },
  540:    { T: 540, P: 2.6690, h: 2809.3, s: 9.2833, x: 1, phase: 'gas' },
  560:    { T: 560, P: 3.3846, h: 2842.5, s: 9.5504, x: 1, phase: 'gas' },
  580:    { T: 580, P: 4.2195, h: 2877.8, s: 9.8001, x: 1, phase: 'gas' },
  600:    { T: 600, P: 5.1789, h: 2915.0, s: 10.034, x: 1, phase: 'gas' },
};

// ============================================================================
// SUPERHEATED STEAM TABLE (at 0.1 MPa)
// ============================================================================

export const SUPERHEATED_STEAM_01MPa: { [temp: number]: SteamState } = {
  400: { T: 400, P: 0.1, h: 3278.2, s: 8.4479, v: 3.418, x: 1, phase: 'superheated' },
  450: { T: 450, P: 0.1, h: 3375.1, s: 8.6892, v: 3.889, x: 1, phase: 'superheated' },
  500: { T: 500, P: 0.1, h: 3478.5, s: 8.9391, v: 4.356, x: 1, phase: 'superheated' },
  550: { T: 550, P: 0.1, h: 3582.3, s: 9.1578, v: 4.822, x: 1, phase: 'superheated' },
  600: { T: 600, P: 0.1, h: 3685.6, s: 9.3713, v: 5.285, x: 1, phase: 'superheated' },
};

// ============================================================================
// THERMODYNAMIC FUNCTIONS
// ============================================================================

/**
 * Get saturated water properties at a given temperature
 */
export function getSaturatedWater(T_K: number): SteamState | null {
  const temps = Object.keys(SATURATED_STEAM_TABLE).map(Number).sort((a, b) => a - b);
  
  // Find nearest temperature
  let T_low = temps[0];
  let T_high = temps[temps.length - 1];
  
  for (let i = 0; i < temps.length - 1; i++) {
    if (T_K >= temps[i] && T_K <= temps[i + 1]) {
      T_low = temps[i];
      T_high = temps[i + 1];
      break;
    }
  }
  
  const stateLow = SATURATED_STEAM_TABLE[T_low];
  const stateHigh = SATURATED_STEAM_TABLE[T_high];
  
  // Linear interpolation
  const t = (T_K - T_low) / (T_high - T_low);
  
  return {
    T: T_K,
    P: stateLow.P + t * (stateHigh.P - stateLow.P),
    h: stateLow.h + t * (stateHigh.h - stateLow.h),
    s: stateLow.s + t * (stateHigh.s - stateLow.s),
    v: stateLow.v + t * (stateHigh.v - stateLow.v),
    x: t, // Approximate quality based on interpolation
    phase: t < 0.5 ? 'liquid' : 'mixture',
  };
}

/**
 * Get saturated steam properties at a given temperature
 */
export function getSaturatedSteam(T_K: number): SteamState | null {
  const temps = Object.keys(SATURATED_VAPOR_TABLE).map(Number).sort((a, b) => a - b);
  
  let T_low = temps[0];
  let T_high = temps[temps.length - 1];
  
  for (let i = 0; i < temps.length - 1; i++) {
    if (T_K >= temps[i] && T_K <= temps[i + 1]) {
      T_low = temps[i];
      T_high = temps[i + 1];
      break;
    }
  }
  
  const stateLow = SATURATED_VAPOR_TABLE[T_low];
  const stateHigh = SATURATED_VAPOR_TABLE[T_high];
  
  const t = (T_K - T_low) / (T_high - T_low);
  
  return {
    T: T_K,
    P: stateLow.P + t * (stateHigh.P - stateLow.P),
    h: stateLow.h + t * (stateHigh.h - stateLow.h),
    s: stateLow.s + t * (stateHigh.s - stateLow.s),
    v: stateLow.v + t * (stateHigh.v - stateLow.v),
    x: 1,
    phase: t < 1 ? 'gas' : 'superheated',
  };
}

/**
 * Calculate enthalpy of water/steam mixture
 */
export function mixtureEnthalpy(T_K: number, x: number): number {
  const water = getSaturatedWater(T_K);
  const steam = getSaturatedSteam(T_K);
  
  if (!water || !steam) return 0;
  
  // h = (1-x)*h_f + x*h_g
  return (1 - x) * water.h + x * steam.h;
}

/**
 * Calculate entropy of water/steam mixture
 */
export function mixtureEntropy(T_K: number, x: number): number {
  const water = getSaturatedWater(T_K);
  const steam = getSaturatedSteam(T_K);
  
  if (!water || !steam) return 0;
  
  // s = (1-x)*s_f + x*s_g
  return (1 - x) * water.s + x * steam.s;
}

/**
 * Calculate quality from enthalpy
 */
export function qualityFromEnthalpy(T_K: number, h: number): number {
  const water = getSaturatedWater(T_K);
  const steam = getSaturatedSteam(T_K);
  
  if (!water || !steam) return 0;
  
  const h_fg = steam.h - water.h;
  if (h_fg === 0) return 0;
  
  return Math.max(0, Math.min(1, (h - water.h) / h_fg));
}

/**
 * Calculate quality from entropy
 */
export function qualityFromEntropy(T_K: number, s: number): number {
  const water = getSaturatedWater(T_K);
  const steam = getSaturatedSteam(T_K);
  
  if (!water || !steam) return 0;
  
  const s_fg = steam.s - water.s;
  if (s_fg === 0) return 0;
  
  return Math.max(0, Math.min(1, (s - water.s) / s_fg));
}

// ============================================================================
// RANKINE CYCLE CALCULATIONS
// ============================================================================

export interface RankineCycleState {
  T1: number;      // Condenser temperature (K)
  P1: number;      // Condenser pressure (MPa)
  T2: number;      // Boiler saturation temperature (K)
  P2: number;      // Boiler pressure (MPa)
  T3: number;      // Superheat temperature (K)
  x4: number;      // Turbine exit quality
  eta_turbine: number;
  eta_pump: number;
}

export interface RankineCycleResults {
  Q_boiler: number;      // Heat added in boiler (kJ/kg)
  W_turbine: number;     // Turbine work (kJ/kg)
  W_pump: number;        // Pump work (kJ/kg)
  Q_condenser: number;   // Heat rejected (kJ/kg)
  eta_thermal: number;   // Thermal efficiency
  eta_carnot: number;    // Carnot efficiency
}

export function analyzeRankineCycle(state: RankineCycleState): RankineCycleResults {
  const { T1, P1, T2, P2, T3, x4, eta_turbine, eta_pump } = state;
  
  // Point 1: Condenser outlet (saturated liquid)
  const p1 = getSaturatedWater(T1);
  const h1 = p1?.h ?? 225.94;
  const s1 = p1?.s ?? 0.7037;
  const v1 = p1?.v ?? 0.001074;
  
  // Pump work (incompressible liquid assumption)
  // W_pump = v * (P2 - P1)
  const W_pump_kJkg = v1 * (P2 - P1) * 1000; // Convert MPa* m³/kg to kJ/kg
  
  // Point 2: Boiler inlet (compressed liquid)
  const h2 = h1 + W_pump_kJkg / eta_pump;
  
  // Point 3: Turbine outlet (after expansion)
  const s3 = s1; // Isentropic expansion assumption
  
  // Get steam properties at T2, P2
  const p2_sat = getSaturatedSteam(T2);
  const s_g = p2_sat?.s ?? 7.3594;
  
  // Check if still in superheated region
  let h3: number;
  let T_actual = T2;
  
  if (T3 > T2) {
    // Superheated region - use superheated table at P2
    // Simplified: assume h3 based on s3 and superheat
    const h_superheat_factor = 1 + 0.001 * (T3 - T2);
    h3 = (p2_sat?.h ?? 2675.5) * h_superheat_factor;
    T_actual = T3;
  } else {
    // Saturated region - use quality
    const p2_water = getSaturatedWater(T2);
    const h_f = p2_water?.h ?? 225.94;
    const h_g = p2_sat?.h ?? 2675.5;
    h3 = h_f + s3 * (h_g - h_f) / s_g; // Approximate
  }
  
  // Isentropic turbine work
  const W_turbine_isen = h2 - h3;
  
  // Actual turbine work
  const W_turbine = W_turbine_isen * eta_turbine;
  
  // Point 4: Condenser inlet
  const h4 = h2 - W_turbine;
  
  // Quality at turbine exit
  const x4_calc = qualityFromEnthalpy(T1, h4);
  
  // Heat added in boiler
  const p2_water = getSaturatedWater(T2);
  const h2_sat = p2_water?.h ?? 225.94;
  const Q_boiler = h2_sat - h2 + (p2_sat?.h ?? 2675.5) - h2_sat;
  
  // Heat rejected in condenser
  const Q_condenser = h4 - h1;
  
  // Thermal efficiency
  const eta_thermal = (W_turbine - W_pump_kJkg) / Q_boiler;
  
  // Carnot efficiency (based on T_avg)
  const T_avg = (T1 + T2) / 2;
  const eta_carnot = 1 - T1 / T_avg;
  
  return {
    Q_boiler: Math.abs(Q_boiler),
    W_turbine: Math.abs(W_turbine),
    W_pump: Math.abs(W_pump_kJkg),
    Q_condenser: Math.abs(Q_condenser),
    eta_thermal: Math.max(0, eta_thermal),
    eta_carnot,
  };
}

// ============================================================================
// WATER PROPERTIES CALCULATOR
// ============================================================================

export function getWaterProperties(T_K: number, P_MPa: number = 0.1): WaterProperties {
  // Simplified water property correlations
  const T_C = T_K - 273.15;
  
  // Density (kg/m³) - temperature dependent
  const rho = 1000 - 0.173 * T_C + 0.00043 * T_C * T_C;
  
  // Specific heat (J/kg·K)
  const cp = 4210 - 2.5 * T_C + 0.006 * T_C * T_C;
  
  // Dynamic viscosity (Pa·s)
  const mu = 0.001 / (1 + 0.037 * T_C + 0.00022 * T_C * T_C) * 1000;
  
  // Thermal conductivity (W/m·K)
  const k = 0.56 + 0.0018 * T_C;
  
  // Prandtl number
  const Pr = (mu * cp) / k / 1000;
  
  // Kinematic viscosity (m²/s)
  const nu = mu / rho;
  
  // Thermal expansion (1/K) - approximate
  const beta = 0.0002 + 0.00001 * T_C;
  
  return { rho, cp, mu, k, Pr, nu, beta };
}

// ============================================================================
// GAS PROPERTIES
// ============================================================================

export function getAirProperties(T_K: number): WaterProperties {
  const T_C = T_K - 273.15;
  
  const rho = 1.225 * (273.15 / T_K); // Ideal gas approximation
  const cp = 1005; // J/kg·K (approximately constant)
  const mu = 1.81e-5 * Math.pow(T_K / 273.15, 0.7);
  const k = 0.026 * Math.pow(T_K / 273.15, 0.8);
  const Pr = 0.71; // Approximately constant
  const nu = mu / rho;
  const beta = 1 / T_K;
  
  return { rho, cp, mu, k, Pr, nu, beta };
}

// ============================================================================
// NON-DIMENSIONAL NUMBERS
// ============================================================================

export function reynoldsNumber(rho: number, v: number, D: number, mu: number): number {
  return (rho * v * D) / mu;
}

export function nusseltNumber(h: number, D: number, k: number): number {
  return (h * D) / k;
}

export function prandtlNumber(cp: number, mu: number, k: number): number {
  return (cp * mu) / k;
}

export function grashofNumber(beta: number, DT: number, g: number, nu: number, D: number): number {
  return (g * beta * DT * Math.pow(D, 3)) / (nu * nu);
}

export function rayleighNumber(Gr: number, Pr: number): number {
  return Gr * Pr;
}

export function frictionFactorColebrook(Re: number, epsilon: number, D: number): number {
  if (Re < 2300) return 64 / Math.max(Re, 1);
  
  const epsilon_D = epsilon / D;
  const f_guess = 0.02;
  
  // Newton-Raphson iteration for Colebrook equation
  let f = f_guess;
  for (let i = 0; i < 20; i++) {
    const f_old = f;
    const term1 = epsilon_D / 3.7;
    const term2 = 2.51 / (Re * Math.sqrt(f));
    const f_calc = 1 / Math.pow(-2 * Math.log10(term1 + term2), 2);
    f = 0.5 * (f + f_calc);
    if (Math.abs(f - f_old) < 1e-6) break;
  }
  
  return f;
}

// ============================================================================
// EXPORT
// ============================================================================

export const Thermodynamics = {
  // Steam tables
  getSaturatedWater,
  getSaturatedSteam,
  mixtureEnthalpy,
  mixtureEntropy,
  qualityFromEnthalpy,
  qualityFromEntropy,
  
  // Cycle analysis
  analyzeRankineCycle,
  
  // Fluid properties
  getWaterProperties,
  getAirProperties,
  
  // Non-dimensional numbers
  reynoldsNumber,
  nusseltNumber,
  prandtlNumber,
  grashofNumber,
  rayleighNumber,
  frictionFactorColebrook,
};

export default Thermodynamics;

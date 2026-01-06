/**
 * Mechanical SAF Lab v2.0 - Extended Component Library
 * Heat Transfer, Machine Elements, and Control Systems
 */

import {
  ComponentDefinition,
  PortDefinition,
  ParameterDefinition,
  EquationDefinition,
  ConstraintDefinition,
} from '../../types';
import {
  ComponentBase,
  SystemContext,
  registerComponent,
} from '../../core/ComponentBase';

// ============================================================================
// COMMON CONSTANTS
// ============================================================================

const FLUID_SYSTEM_CONSTANTS = {
  density: 998,
  viscosity: 1.002e-3,
  specificHeat: 4182,
  thermalConductivity: 0.598,
  gravity: 9.81,
  atmosphericPressure: 101325,
};

const AIR_PROPERTIES = {
  density: 1.225,
  viscosity: 1.81e-5,
  specificHeat: 1005,
  thermalConductivity: 0.026,
};

// ============================================================================
// PLATE HEAT EXCHANGER
// ============================================================================

export const PLATE_HE_DEFINITION: ComponentDefinition = {
  id: 'heatTransfer.heatExchanger.plate',
  version: '1.0.0',
  domain: 'heatTransfer',
  subcategory: 'heatExchanger',
  name: 'Plate Heat Exchanger',
  description: 'Gasketed plate heat exchanger for compact heat transfer',
  tags: ['heat exchanger', 'heat transfer', 'plate', 'compact'],
  
  ports: [
    {
      id: 'hot_in',
      name: 'Hot Inlet',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_h', name: 'Hot Mass Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'T_h,in', name: 'Hot Inlet Temp', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.3, side: 'left' },
    },
    {
      id: 'hot_out',
      name: 'Hot Outlet',
      type: 'output',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_h', name: 'Hot Mass Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'T_h,out', name: 'Hot Outlet Temp', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.3, side: 'right' },
    },
    {
      id: 'cold_in',
      name: 'Cold Inlet',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_c', name: 'Cold Mass Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'T_c,in', name: 'Cold Inlet Temp', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.7, side: 'left' },
    },
    {
      id: 'cold_out',
      name: 'Cold Outlet',
      type: 'output',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_c', name: 'Cold Mass Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'T_c,out', name: 'Cold Outlet Temp', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.7, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'A',
      name: 'Heat Transfer Area',
      symbol: 'A',
      unit: 'm²',
      dataType: 'number',
      value: 20,
      source: 'design',
      description: 'Total heat transfer area',
      designRange: { min: 1, max: 5000 },
      display: { precision: 1 },
    },
    {
      id: 'U',
      name: 'Overall Heat Transfer Coefficient',
      symbol: 'U',
      unit: 'W/(m²·K)',
      dataType: 'number',
      value: 3000,
      source: 'design',
      description: 'Overall heat transfer coefficient (plate)',
      designRange: { min: 1000, max: 8000 },
      display: { precision: 0 },
    },
    {
      id: 'N',
      name: 'Number of Plates',
      symbol: 'N',
      unit: '-',
      dataType: 'number',
      value: 40,
      source: 'calculated',
      description: 'Number of heat transfer plates',
      display: { precision: 0 },
    },
    {
      id: 'Q',
      name: 'Heat Transfer Rate',
      symbol: 'Q',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'effectiveness',
      name: 'Effectiveness',
      symbol: 'ε',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'heat_rate',
      name: 'Heat Transfer Rate',
      expression: 'Q = U * A * LMTD',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'ntu_effectiveness',
      name: 'NTU-Effectiveness',
      expression: 'ε = 1 - exp(-NTU * (1 - C_r)) for C_r < 1',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    { id: 'U_valid', name: 'Valid U', expression: 'U > 1000', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('heatTransfer.heatExchanger.plate')
export class PlateHeatExchanger extends ComponentBase {
  constructor(definition: ComponentDefinition = PLATE_HE_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const A = this.getParameterValueOrDefault('A', 20) as number;
    const U = this.getParameterValueOrDefault('U', 3000) as number;
    
    const m_dot_h = this.getParameterValue('m_dot_h') as number ?? 1.0;
    const T_h_in = this.getParameterValue('T_h_in') as number ?? 350;
    const m_dot_c = this.getParameterValue('m_dot_c') as number ?? 1.5;
    const T_c_in = this.getParameterValue('T_c_in') as number ?? 300;
    
    const cp = FLUID_SYSTEM_CONSTANTS.specificHeat;
    const C_h = m_dot_h * cp;
    const C_c = m_dot_c * cp;
    const C_min = Math.min(C_h, C_c);
    const C_max = Math.max(C_h, C_c);
    const C_r = C_min / C_max;
    
    // NTU method for plate HEs
    const NTU = U * A / C_min;
    
    // Effectiveness for counter-flow arrangement
    let effectiveness = 0;
    if (C_r < 1) {
      effectiveness = (1 - Math.exp(-NTU * (1 - C_r))) / (1 - C_r * Math.exp(-NTU * (1 - C_r)));
    } else {
      effectiveness = NTU / (1 + NTU);
    }
    
    // Heat transfer
    const Q_max = C_min * (T_h_in - T_c_in);
    const Q_W = effectiveness * Q_max;
    
    // Outlet temperatures
    const T_h_out = T_h_in - Q_W / (m_dot_h * cp);
    const T_c_out = T_c_in + Q_W / (m_dot_c * cp);
    
    // Number of plates (approximate)
    const plate_area = 0.5; // m² per plate typical
    const N = Math.ceil(A / plate_area);
    
    this.setComputedValue('Q', Q_W / 1000);
    this.setComputedValue('effectiveness', effectiveness * 100);
    this.setComputedValue('N', N);
    this.setComputedValue('NTU', NTU);
    this.setComputedValue('T_h_out', T_h_out);
    this.setComputedValue('T_c_out', T_c_out);
  }
}

// ============================================================================
// AIR-COOLED HEAT EXCHANGER
// ============================================================================

export const AIR_COOLED_HE_DEFINITION: ComponentDefinition = {
  id: 'heatTransfer.heatExchanger.airCooled',
  version: '1.0.0',
  domain: 'heatTransfer',
  subcategory: 'heatExchanger',
  name: 'Air-Cooled Heat Exchanger',
  description: 'Fin-fan heat exchanger using ambient air for cooling',
  tags: ['heat exchanger', 'heat transfer', 'air cooled', 'fin fan'],
  
  ports: [
    {
      id: 'fluid_in',
      name: 'Fluid Inlet',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'T_in', name: 'Inlet Temp', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'fluid_out',
      name: 'Fluid Outlet',
      type: 'output',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'T_out', name: 'Outlet Temp', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'A',
      name: 'Surface Area',
      symbol: 'A',
      unit: 'm²',
      dataType: 'number',
      value: 100,
      source: 'design',
      designRange: { min: 10, max: 10000 },
      display: { precision: 1 },
    },
    {
      id: 'U',
      name: 'Overall U',
      symbol: 'U',
      unit: 'W/(m²·K)',
      dataType: 'number',
      value: 150,
      source: 'design',
      designRange: { min: 50, max: 500 },
      display: { precision: 0 },
    },
    {
      id: 'T_air',
      name: 'Ambient Air Temp',
      symbol: 'T_air',
      unit: 'K',
      dataType: 'number',
      value: 298,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'V_air',
      name: 'Air Velocity',
      symbol: 'V_air',
      unit: 'm/s',
      dataType: 'number',
      value: 3,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'Q',
      name: 'Heat Transfer Rate',
      symbol: 'Q',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'approach',
      name: 'Approach Temperature',
      symbol: 'ΔT_app',
      unit: 'K',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    { id: 'heat_rate', name: 'Heat Rate', expression: 'Q = U * A * LMTD', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'approach', name: 'Approach', expression: 'ΔT_app = T_out - T_air', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'approach_min', name: 'Min Approach', expression: 'approach > 5', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('heatTransfer.heatExchanger.airCooled')
export class AirCooledHeatExchanger extends ComponentBase {
  constructor(definition: ComponentDefinition = AIR_COOLED_HE_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const A = this.getParameterValueOrDefault('A', 100) as number;
    const U = this.getParameterValueOrDefault('U', 150) as number;
    const T_air = this.getParameterValueOrDefault('T_air', 298) as number;
    
    const m_dot = this.getParameterValue('m_dot') as number ?? 1.0;
    const T_in = this.getParameterValue('T_in') as number ?? 350;
    
    const cp = FLUID_SYSTEM_CONSTANTS.specificHeat;
    
    // Air-side heat transfer coefficient approximation
    const V_air = this.getParameterValueOrDefault('V_air', 3) as number;
    const h_air = 10 + 25 * Math.pow(V_air, 0.6); // Simplified correlation
    
    // Overall U (limited by air side)
    const U_actual = 1 / (1/h_air + 1/U);
    
    // LMTD for single-pass cross-flow (simplified)
    const LMTD = (T_in - T_air) * 0.7; // Approximate correction factor
    
    // Heat transfer
    const Q_W = U_actual * A * LMTD;
    
    // Outlet temperature
    const T_out = T_in - Q_W / (m_dot * cp);
    
    // Approach temperature
    const approach = T_out - T_air;
    
    this.setComputedValue('Q', Q_W / 1000);
    this.setComputedValue('T_out', T_out);
    this.setComputedValue('approach', approach);
    this.setComputedValue('U_actual', U_actual);
  }
}

// ============================================================================
// SPUR GEAR
// ============================================================================

export const SPUR_GEAR_DEFINITION: ComponentDefinition = {
  id: 'machineElement.powerTransmission.spurGear',
  version: '1.0.0',
  domain: 'machineElement',
  subcategory: 'powerTransmission',
  name: 'Spur Gear',
  description: 'Straight-cut cylindrical gear for power transmission',
  tags: ['gear', 'machine element', 'power transmission', 'spur'],
  
  ports: [
    {
      id: 'input',
      name: 'Input Shaft',
      type: 'input',
      domain: 'mechanical',
      variables: [
        { symbol: 'τ_in', name: 'Input Torque', unit: 'N·m', direction: 'in' },
        { symbol: 'ω_in', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'output',
      name: 'Output Shaft',
      type: 'output',
      domain: 'mechanical',
      variables: [
        { symbol: 'τ_out', name: 'Output Torque', unit: 'N·m', direction: 'out' },
        { symbol: 'ω_out', name: 'Angular Velocity', unit: 'rad/s', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'N1',
      name: 'Number of Teeth (Driver)',
      symbol: 'N₁',
      unit: '-',
      dataType: 'number',
      value: 20,
      source: 'design',
      designRange: { min: 12, max: 200 },
      display: { precision: 0 },
    },
    {
      id: 'N2',
      name: 'Number of Teeth (Driven)',
      symbol: 'N₂',
      unit: '-',
      dataType: 'number',
      value: 40,
      source: 'design',
      designRange: { min: 12, max: 200 },
      display: { precision: 0 },
    },
    {
      id: 'm',
      name: 'Module',
      symbol: 'm',
      unit: 'mm',
      dataType: 'number',
      value: 2.5,
      source: 'design',
      standardSizes: [0.5, 0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10],
      display: { precision: 2 },
    },
    {
      id: 'eta',
      name: 'Efficiency',
      symbol: 'η',
      unit: '%',
      dataType: 'number',
      value: 98,
      source: 'constant',
      display: { precision: 1 },
    },
    {
      id: 'ratio',
      name: 'Gear Ratio',
      symbol: 'i',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 3 },
    },
    {
      id: 'center_dist',
      name: 'Center Distance',
      symbol: 'a',
      unit: 'mm',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'power',
      name: 'Transmitted Power',
      symbol: 'P',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 2 },
    },
  ],
  
  equations: [
    { id: 'ratio', name: 'Gear Ratio', expression: 'i = N₂ / N₁', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'center_dist', name: 'Center Distance', expression: 'a = m * (N₁ + N₂) / 2', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'torque', name: 'Torque Ratio', expression: 'τ_out = τ_in * i * η', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'speed', name: 'Speed Ratio', expression: 'ω_out = ω_in / i', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'teeth_min', name: 'Min Teeth', expression: 'N1 >= 12', type: 'designRule', severity: 'warning' },
    { id: 'ratio_max', name: 'Max Ratio', expression: 'ratio < 10', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('machineElement.powerTransmission.spurGear')
export class SpurGear extends ComponentBase {
  constructor(definition: ComponentDefinition = SPUR_GEAR_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const N1 = this.getParameterValueOrDefault('N1', 20) as number;
    const N2 = this.getParameterValueOrDefault('N2', 40) as number;
    const m = this.getParameterValueOrDefault('m', 2.5) as number;
    const eta = this.getParameterValueOrDefault('eta', 0.98) as number;
    
    const tau_in = this.getParameterValue('tau_in') as number ?? 100;
    const omega_in = this.getParameterValue('omega_in') as number ?? 150;
    
    // Gear ratio
    const ratio = N2 / N1;
    
    // Center distance
    const center_dist = m * (N1 + N2) / 2;
    
    // Output torque and speed
    const tau_out = tau_in * ratio * eta;
    const omega_out = omega_in / ratio;
    
    // Power
    const power_W = tau_out * omega_out;
    const power_kW = power_W / 1000;
    
    this.setComputedValue('ratio', ratio);
    this.setComputedValue('center_dist', center_dist);
    this.setComputedValue('tau_out', tau_out);
    this.setComputedValue('omega_out', omega_out);
    this.setComputedValue('power', power_kW);
  }
}

// ============================================================================
// DEEP GROOVE BALL BEARING
// ============================================================================

export const BALL_BEARING_DEFINITION: ComponentDefinition = {
  id: 'machineElement.bearings.deepGrooveBall',
  version: '1.0.0',
  domain: 'machineElement',
  subcategory: 'bearings',
  name: 'Deep Groove Ball Bearing',
  description: 'Standard radial ball bearing for high-speed applications',
  tags: ['bearing', 'machine element', 'ball bearing', 'rotating'],
  
  ports: [
    {
      id: 'shaft',
      name: 'Shaft',
      type: 'input',
      domain: 'mechanical',
      variables: [
        { symbol: 'F_r', name: 'Radial Load', unit: 'N', direction: 'in' },
        { symbol: 'F_a', name: 'Axial Load', unit: 'N', direction: 'in' },
        { symbol: 'ω', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 0, side: 'top' },
    },
    {
      id: 'housing',
      name: 'Housing',
      type: 'output',
      domain: 'mechanical',
      variables: [
        { symbol: 'F_r', name: 'Radial Reaction', unit: 'N', direction: 'out' },
        { symbol: 'F_a', name: 'Axial Reaction', unit: 'N', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 1, side: 'bottom' },
    },
  ],
  
  parameters: [
    {
      id: 'd',
      name: 'Bore Diameter',
      symbol: 'd',
      unit: 'mm',
      dataType: 'number',
      value: 25,
      source: 'design',
      standardSizes: [5, 6, 7, 8, 9, 10, 12, 15, 17, 20, 25, 30, 35, 40, 45, 50, 55, 60, 65, 70],
      display: { precision: 0 },
    },
    {
      id: 'D',
      name: 'Outer Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 52,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'C',
      name: 'Basic Dynamic Load Rating',
      symbol: 'C',
      unit: 'kN',
      dataType: 'number',
      value: 14.8,
      source: 'lookup',
      display: { precision: 1 },
    },
    {
      id: 'C0',
      name: 'Basic Static Load Rating',
      symbol: 'C₀',
      unit: 'kN',
      dataType: 'number',
      value: 7.8,
      source: 'lookup',
      display: { precision: 1 },
    },
    {
      id: 'L10',
      name: 'L10 Life',
      symbol: 'L₁₀',
      unit: 'M rev',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'life_hours',
      name: 'Life (Hours)',
      symbol: 'Lₕ',
      unit: 'h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 0 },
    },
  ],
  
  equations: [
    { id: 'equivalent_load', name: 'Equivalent Load', expression: 'P = X*F_r + Y*F_a', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'life_l10', name: 'L10 Life', expression: 'L10 = (C/P)^3', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'life_hours', name: 'Life in Hours', expression: 'Lh = L10 * 10^6 / (60 * n)', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'life_min', name: 'Min Life', expression: 'life_hours > 10000', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('machineElement.bearings.deepGrooveBall')
export class DeepGrooveBallBearing extends ComponentBase {
  constructor(definition: ComponentDefinition = BALL_BEARING_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const d = this.getParameterValueOrDefault('d', 25) as number;
    const C = this.getParameterValueOrDefault('C', 14.8) as number;
    const C0 = this.getParameterValueOrDefault('C0', 7.8) as number;
    
    const F_r = this.getParameterValue('F_r') as number ?? 500;
    const F_a = this.getParameterValue('F_a') as number ?? 100;
    const omega = this.getParameterValue('omega') as number ?? 150;
    
    // Outer diameter (approximate for deep groove ball bearing)
    const D = d * 2.2 + 12;
    
    // Equivalent dynamic load (simplified - assumes X=1, Y=0 for typical radial load)
    const Fa_Fr = F_a / F_r;
    let X = 1;
    let Y = 0;
    
    if (Fa_Fr > 0.2) {
      Y = 0.57;
    }
    
    const P = X * F_r + Y * F_a;
    
    // L10 life in millions of revolutions
    const L10 = Math.pow((C * 1000) / P, 3);
    
    // Life in hours
    const n = omega * 60 / (2 * Math.PI); // rpm
    const life_hours = (L10 * 1e6) / (60 * n);
    
    this.setComputedValue('D', D);
    this.setComputedValue('L10', L10);
    this.setComputedValue('life_hours', life_hours);
    this.setComputedValue('equivalent_load', P);
  }
}

// ============================================================================
// COMPRESSION SPRING
// ============================================================================

export const COMPRESSION_SPRING_DEFINITION: ComponentDefinition = {
  id: 'machineElement.springs.compression',
  version: '1.0.0',
  domain: 'machineElement',
  subcategory: 'springs',
  name: 'Compression Spring',
  description: 'Helical compression spring for mechanical loads',
  tags: ['spring', 'machine element', 'compression', 'helical'],
  
  ports: [
    {
      id: 'input',
      name: 'Load Input',
      type: 'input',
      domain: 'mechanical',
      variables: [
        { symbol: 'F', name: 'Axial Force', unit: 'N', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 0, side: 'top' },
    },
    {
      id: 'output',
      name: 'Base',
      type: 'output',
      domain: 'mechanical',
      variables: [
        { symbol: 'F', name: 'Reaction Force', unit: 'N', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 1, side: 'bottom' },
    },
  ],
  
  parameters: [
    {
      id: 'd',
      name: 'Wire Diameter',
      symbol: 'd',
      unit: 'mm',
      dataType: 'number',
      value: 3,
      source: 'design',
      designRange: { min: 0.5, max: 20 },
      display: { precision: 2 },
    },
    {
      id: 'D',
      name: 'Mean Coil Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 25,
      source: 'design',
      designRange: { min: 10, max: 200 },
      display: { precision: 1 },
    },
    {
      id: 'N',
      name: 'Active Coils',
      symbol: 'N',
      unit: '-',
      dataType: 'number',
      value: 10,
      source: 'design',
      designRange: { min: 3, max: 50 },
      display: { precision: 0 },
    },
    {
      id: 'G',
      name: 'Shear Modulus',
      symbol: 'G',
      unit: 'GPa',
      dataType: 'number',
      value: 79.3,
      source: 'constant',
      display: { precision: 1 },
    },
    {
      id: 'k',
      name: 'Spring Rate',
      symbol: 'k',
      unit: 'N/mm',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 2 },
    },
    {
      id: 'delta',
      name: 'Deflection',
      symbol: 'δ',
      unit: 'mm',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 2 },
    },
    {
      id: 'tau',
      name: 'Shear Stress',
      symbol: 'τ',
      unit: 'MPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    { id: 'spring_rate', name: 'Spring Rate', expression: 'k = G*d^4 / (8*D^3*N)', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'deflection', name: 'Deflection', expression: 'δ = F/k', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'stress', name: 'Shear Stress', expression: 'τ = 8*F*D / (π*d^3)', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'solid_height', name: 'Solid Height', expression: 'H_solid = d * (N + 2)', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'stress_max', name: 'Max Stress', expression: 'tau < 800', type: 'designRule', severity: 'warning' },
    { id: 'index_range', name: 'Spring Index', expression: 'D/d > 4 && D/d < 20', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('machineElement.springs.compression')
export class CompressionSpring extends ComponentBase {
  constructor(definition: ComponentDefinition = COMPRESSION_SPRING_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const d_mm = this.getParameterValueOrDefault('d', 3) as number;
    const D_mm = this.getParameterValueOrDefault('D', 25) as number;
    const N = this.getParameterValueOrDefault('N', 10) as number;
    const G_GPa = this.getParameterValueOrDefault('G', 79.3) as number;
    
    const F = this.getParameterValue('F') as number ?? 100;
    
    const d = d_mm / 1000;
    const D = D_mm / 1000;
    const G = G_GPa * 1e9;
    
    // Spring rate (N/m)
    const k_Nm = (G * Math.pow(d, 4)) / (8 * Math.pow(D, 3) * N);
    const k_Nmm = k_Nm * 1000;
    
    // Deflection
    const delta_m = F / k_Nm;
    const delta_mm = delta_m * 1000;
    
    // Shear stress
    const tau_Pa = (8 * F * D) / (Math.PI * Math.pow(d, 3));
    const tau_MPa = tau_Pa / 1e6;
    
    // Solid height
    const solid_height_mm = d_mm * (N + 2);
    
    this.setComputedValue('k', k_Nmm);
    this.setComputedValue('delta', delta_mm);
    this.setComputedValue('tau', tau_MPa);
    this.setComputedValue('solid_height', solid_height_mm);
    this.setComputedValue('spring_index', D_mm / d_mm);
  }
}

// ============================================================================
// PID CONTROLLER
// ============================================================================

export const PID_CONTROLLER_DEFINITION: ComponentDefinition = {
  id: 'control.controllers.pid',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'controllers',
  name: 'PID Controller',
  description: 'Proportional-Integral-Derivative feedback controller',
  tags: ['controller', 'control', 'PID', 'feedback'],
  
  ports: [
    {
      id: 'setpoint',
      name: 'Setpoint',
      type: 'input',
      domain: 'signal',
      variables: [
        { symbol: 'SP', name: 'Setpoint', unit: '-', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.3, side: 'left' },
    },
    {
      id: 'feedback',
      name: 'Feedback',
      type: 'input',
      domain: 'signal',
      variables: [
        { symbol: 'PV', name: 'Process Variable', unit: '-', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.7, side: 'left' },
    },
    {
      id: 'output',
      name: 'Control Output',
      type: 'output',
      domain: 'signal',
      variables: [
        { symbol: 'CO', name: 'Control Output', unit: '-', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'Kc',
      name: 'Proportional Gain',
      symbol: 'Kc',
      unit: '-',
      dataType: 'number',
      value: 2.0,
      source: 'design',
      designRange: { min: 0.01, max: 100 },
      display: { precision: 2 },
    },
    {
      id: 'Ti',
      name: 'Integral Time',
      symbol: 'Tᵢ',
      unit: 's',
      dataType: 'number',
      value: 10,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'Td',
      name: 'Derivative Time',
      symbol: 'T_d',
      unit: 's',
      dataType: 'number',
      value: 2.5,
      source: 'design',
      display: { precision: 2 },
    },
    {
      id: 'SP',
      name: 'Setpoint',
      symbol: 'SP',
      unit: '-',
      dataType: 'number',
      value: 50,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'PV',
      name: 'Process Variable',
      symbol: 'PV',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 2 },
    },
    {
      id: 'error',
      name: 'Error',
      symbol: 'e',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 3 },
    },
    {
      id: 'CO',
      name: 'Control Output',
      symbol: 'CO',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'integral',
      name: 'Integral Term',
      symbol: 'I',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 3 },
    },
    {
      id: 'derivative',
      name: 'Derivative Term',
      symbol: 'D',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 3 },
    },
  ],
  
  equations: [
    { id: 'pid', name: 'PID Algorithm', expression: 'CO = Kc * (e + (1/Ti)*∫e dt + Td*de/dt)', type: 'algebraic', solutionMethod: 'numerical' },
    { id: 'error', name: 'Error', expression: 'e = SP - PV', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'output_range', name: 'Output Limits', expression: 'CO >= 0 && CO <= 100', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('control.controllers.pid')
export class PIDController extends ComponentBase {
  private integral: number = 0;
  private prevError: number = 0;
  
  constructor(definition: ComponentDefinition = PID_CONTROLLER_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Kc = this.getParameterValueOrDefault('Kc', 2.0) as number;
    const Ti = this.getParameterValueOrDefault('Ti', 10) as number;
    const Td = this.getParameterValueOrDefault('Td', 2.5) as number;
    const SP = this.getParameterValueOrDefault('SP', 50) as number;
    
    const PV = this.getParameterValue('PV') as number ?? 25;
    const dt = this.getParameterValue('dt') as number ?? 0.1;
    
    // Error
    const error = SP - PV;
    
    // Integral term
    this.integral += error * dt;
    
    // Derivative term
    const derivative = (error - this.prevError) / dt;
    this.prevError = error;
    
    // PID output
    let CO = Kc * (error + (1/Ti) * this.integral + Td * derivative);
    
    // Clamp output
    CO = Math.max(0, Math.min(100, CO));
    
    this.setComputedValue('PV', PV);
    this.setComputedValue('error', error);
    this.setComputedValue('CO', CO);
    this.setComputedValue('integral', this.integral);
    this.setComputedValue('derivative', derivative);
  }
  
  public reset(): void {
    this.integral = 0;
    this.prevError = 0;
  }
}

// ============================================================================
// TEMPERATURE SENSOR
// ============================================================================

export const TEMPERATURE_SENSOR_DEFINITION: ComponentDefinition = {
  id: 'control.sensors.temperature',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'sensors',
  name: 'Temperature Sensor',
  description: 'RTD temperature sensor with 4-20mA output',
  tags: ['sensor', 'control', 'temperature', 'RTD'],
  
  ports: [
    {
      id: 'input',
      name: 'Process Temperature',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'T', name: 'Temperature', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'output',
      name: 'Signal Output',
      type: 'output',
      domain: 'signal',
      variables: [
        { symbol: 'I', name: 'Current', unit: 'mA', direction: 'out' },
        { symbol: 'PV', name: 'Process Variable', unit: '-', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'T_min',
      name: 'Min Temperature',
      symbol: 'T_min',
      unit: 'K',
      dataType: 'number',
      value: 273,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'T_max',
      name: 'Max Temperature',
      symbol: 'T_max',
      unit: 'K',
      dataType: 'number',
      value: 423,
      source: 'design',
      display: { precision: 1 },
    },
    {
      id: 'I_min',
      name: 'Min Current',
      symbol: 'I_min',
      unit: 'mA',
      dataType: 'number',
      value: 4,
      source: 'constant',
      display: { precision: 0 },
    },
    {
      id: 'I_max',
      name: 'Max Current',
      symbol: 'I_max',
      unit: 'mA',
      dataType: 'number',
      value: 20,
      source: 'constant',
      display: { precision: 0 },
    },
    {
      id: 'I',
      name: 'Output Current',
      symbol: 'I',
      unit: 'mA',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
    {
      id: 'PV',
      name: 'Scaled Output',
      symbol: 'PV',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    { id: 'current', name: 'Current Output', expression: 'I = I_min + (T - T_min)/(T_max - T_min) * (I_max - I_min)', type: 'algebraic', solutionMethod: 'analytic' },
    { id: 'scaled', name: 'Scaled Output', expression: 'PV = (I - I_min) / (I_max - I_min) * 100', type: 'algebraic', solutionMethod: 'analytic' },
  ],
  
  constraints: [
    { id: 'range_check', name: 'Range Check', expression: 'T >= T_min && T <= T_max', type: 'designRule', severity: 'warning' },
  ],
};

@registerComponent('control.sensors.temperature')
export class TemperatureSensor extends ComponentBase {
  constructor(definition: ComponentDefinition = TEMPERATURE_SENSOR_DEFINITION, position?: { x: number; y: number }, name?: string) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const T_min = this.getParameterValueOrDefault('T_min', 273) as number;
    const T_max = this.getParameterValueOrDefault('T_max', 423) as number;
    const I_min = this.getParameterValueOrDefault('I_min', 4) as number;
    const I_max = this.getParameterValueOrDefault('I_max', 20) as number;
    
    const T = this.getParameterValue('T') as number ?? 298;
    
    // Clamp temperature to range
    const T_clamped = Math.max(T_min, Math.min(T_max, T));
    
    // Current output (4-20mA)
    const I = I_min + (T_clamped - T_min) / (T_max - T_min) * (I_max - I_min);
    
    // Scaled output (0-100%)
    const PV = (I - I_min) / (I_max - I_min) * 100;
    
    this.setComputedValue('I', I);
    this.setComputedValue('PV', PV);
    this.setComputedValue('T_clamped', T_clamped);
  }
}

// ============================================================================
// EXPORT
// ============================================================================

export const EXTENDED_COMPONENT_CATALOG: Record<string, ComponentDefinition> = {
  'heatTransfer.heatExchanger.plate': PLATE_HE_DEFINITION,
  'heatTransfer.heatExchanger.airCooled': AIR_COOLED_HE_DEFINITION,
  'machineElement.powerTransmission.spurGear': SPUR_GEAR_DEFINITION,
  'machineElement.bearings.deepGrooveBall': BALL_BEARING_DEFINITION,
  'machineElement.springs.compression': COMPRESSION_SPRING_DEFINITION,
  'control.controllers.pid': PID_CONTROLLER_DEFINITION,
  'control.sensors.temperature': TEMPERATURE_SENSOR_DEFINITION,
};

export function getExtendedComponentDefinition(id: string): ComponentDefinition | undefined {
  return EXTENDED_COMPONENT_CATALOG[id];
}

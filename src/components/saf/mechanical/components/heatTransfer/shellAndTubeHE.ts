/**
 * Shell and Tube Heat Exchanger
 * Industrial standard heat exchanger
 */

import { 
  MechanicalComponent, 
  MechanicalDomain, 
  SubDomain,
  PortVariable,
  GoverningEquation,
  ComponentConstraint,
  FailureMode,
  MaterialSpecification,
  createComponentId 
} from '../../types';

const PORT_HOT: PortVariable[] = [
  { symbol: 'ṁ_h', name: 'Hot Mass Flow', unit: 'kg/s', direction: 'in' },
  { symbol: 'T_h_in', name: 'Hot Inlet Temp', unit: 'K', direction: 'in' },
  { symbol: 'T_h_out', name: 'Hot Outlet Temp', unit: 'K', direction: 'out' },
  { symbol: 'P_h', name: 'Hot Pressure', unit: 'Pa', direction: 'in' }
];

const PORT_COLD: PortVariable[] = [
  { symbol: 'ṁ_c', name: 'Cold Mass Flow', unit: 'kg/s', direction: 'in' },
  { symbol: 'T_c_in', name: 'Cold Inlet Temp', unit: 'K', direction: 'in' },
  { symbol: 'T_c_out', name: 'Cold Outlet Temp', unit: 'K', direction: 'out' },
  { symbol: 'P_c', name: 'Cold Pressure', unit: 'Pa', direction: 'in' }
];

export const ShellAndTubeHeatExchanger: MechanicalComponent = {
  id: createComponentId('he'),
  name: 'Shell & Tube Heat Exchanger',
  category: 'heatTransfer' as MechanicalDomain,
  subcategory: 'heatExchanger' as SubDomain,
  manufacturer: 'Generic',
  model: 'STHE-Series',
  
  description: 'TEMA E-style shell and tube heat exchanger for industrial applications.',
  tags: ['heatexchanger', 'shell', 'tube', 'thermal', 'industrial'],
  
  geometry: {
    type: 'parametrized',
    dimensions: {
      shellDiameter: 0.4,
      tubeLength: 4,
      tubeOuterDiameter: 0.019,
      tubeInnerDiameter: 0.016,
      tubeCount: 100,
      baffleSpacing: 0.3,
      shellPasses: 1,
      tubePasses: 2
    },
    mass: 500,
    surfaceArea: 24
  },
  
  ports: [
    { id: 'hot_inlet', name: 'Hot Inlet', type: 'input', domain: 'fluid', variables: PORT_HOT, state: 'disconnected' },
    { id: 'hot_outlet', name: 'Hot Outlet', type: 'output', domain: 'fluid', variables: PORT_HOT, state: 'disconnected' },
    { id: 'cold_inlet', name: 'Cold Inlet', type: 'input', domain: 'fluid', variables: PORT_COLD, state: 'disconnected' },
    { id: 'cold_outlet', name: 'Cold Outlet', type: 'output', domain: 'fluid', variables: PORT_COLD, state: 'disconnected' }
  ],
  
  parameters: [
    { name: 'Overall U', symbol: 'U', value: 500, unit: 'W/(m²·K)', designRange: { min: 100, max: 2000 }, description: 'Overall heat transfer coefficient' },
    { name: 'Surface Area', symbol: 'A', value: 24, unit: 'm²', description: 'Heat transfer surface area' },
    { name: 'LMTD', symbol: 'LMTD', value: 20, unit: 'K', source: 'calculated' as any, description: 'Log mean temperature difference' },
    { name: 'Effectiveness', symbol: 'ε', value: 0.75, unit: '', designRange: { min: 0.1, max: 0.95 }, description: 'Heat exchanger effectiveness' },
    { name: 'Shell Diameter', symbol: 'Ds', value: 0.4, unit: 'm', description: 'Shell inner diameter' },
    { name: 'Tube Length', symbol: 'L', value: 4, unit: 'm', standardSizes: [2, 3, 4, 5, 6, 8] },
    { name: 'Tube OD', symbol: 'd_o', value: 0.019, unit: 'm', description: 'Tube outer diameter' },
    { name: 'Tube ID', symbol: 'd_i', value: 0.016, unit: 'm', description: 'Tube inner diameter' },
    { name: 'Tube Count', symbol: 'Nt', value: 100, unit: '', description: 'Number of tubes' },
    { name: 'Tube Passes', symbol: 'Np', value: 2, unit: '', description: 'Number of tube passes' },
    { name: 'Fouling Factor', symbol: 'Rf', value: 0.0001, unit: 'm²·K/W', description: 'Combined fouling factor' },
    { name: 'Max Pressure Shell', symbol: 'P_shell_max', value: 1000000, unit: 'Pa', description: 'Maximum shell side pressure' },
    { name: 'Max Pressure Tube', symbol: 'P_tube_max', value: 1000000, unit: 'Pa', description: 'Maximum tube side pressure' }
  ],
  
  states: [
    { name: 'Heat Transfer Rate', symbol: 'Q', value: 0, unit: 'kW', source: 'calculated' },
    { name: 'Hot Outlet Temp', symbol: 'T_h_out', value: 0, unit: 'K', source: 'calculated' },
    { name: 'Cold Outlet Temp', symbol: 'T_c_out', value: 0, unit: 'K', source: 'calculated' },
    { name: 'LMTD', symbol: 'LMTD', value: 0, unit: 'K', source: 'calculated' },
    { name: 'Hot Side Pressure Drop', symbol: 'ΔP_shell', value: 0, unit: 'kPa', source: 'calculated' },
    { name: 'Cold Side Pressure Drop', symbol: 'ΔP_tube', value: 0, unit: 'kPa', source: 'calculated' }
  ],
  
  equations: [
    { id: 'heat_transfer', name: 'Heat Transfer Rate', domain: 'heatTransfer' as MechanicalDomain, expression: 'Q = U * A * LMTD', type: 'algebraic' },
    { id: 'lmtd', name: 'Log Mean Temperature Difference', domain: 'heatTransfer' as MechanicalDomain, expression: 'LMTD = (ΔT1 - ΔT2) / ln(ΔT1/ΔT2)', type: 'algebraic' },
    { id: 'effectiveness_epsilon', name: 'Effectiveness-NTU Method', domain: 'heatTransfer' as MechanicalDomain, expression: 'Q = ε * Q_max', type: 'algebraic' },
    { id: 'energy_balance', name: 'Energy Balance', domain: 'heatTransfer' as MechanicalDomain, expression: 'ṁ_h * cp_h * (T_h_in - T_h_out) = ṁ_c * cp_c * (T_c_out - T_c_in)', type: 'algebraic' },
    { id: 'ntu', name: 'NTU Method', domain: 'heatTransfer' as MechanicalDomain, expression: 'NTU = U*A / C_min', type: 'algebraic' },
    { id: 'effectiveness_counter', name: 'Effectiveness (Counter Flow)', domain: 'heatTransfer' as MechanicalDomain, expression: 'ε = (1 - exp(-NTU*(1-Cr))) / (1 - Cr*exp(-NTU*(1-Cr)))', type: 'algebraic' },
    { id: 'effectiveness_parallel', name: 'Effectiveness (Parallel Flow)', domain: 'heatTransfer' as MechanicalDomain, expression: 'ε = (1 - exp(-NTU*(1+Cr))) / (1 + Cr)', type: 'algebraic' }
  ],
  
  constraints: [
    { id: 'temp_crossover', name: 'Temperature Crossover Prevention', expression: 'T_h_out > T_c_in', type: 'inequality', severity: 'error', description: 'Hot outlet must be warmer than cold inlet' },
    { id: 'max_pressure_shell', name: 'Maximum Shell Pressure', expression: 'P_h < P_shell_max', type: 'inequality', severity: 'error' },
    { id: 'max_pressure_tube', name: 'Maximum Tube Pressure', expression: 'P_c < P_tube_max', type: 'inequality', severity: 'error' },
    { id: 'min_lmtd', name: 'Minimum LMTD', expression: 'LMTD > 5', type: 'inequality', severity: 'warning' },
    { id: 'max_pressure_drop', name: 'Maximum Pressure Drop', expression: 'ΔP_shell < 50', type: 'inequality', severity: 'warning' }
  ],
  
  failureModes: [
    { id: 'tube_leakage', name: 'Tube Leakage', description: 'Cross-contamination between streams', criterion: 'T_h_out changes unexpectedly', factors: ['corrosion', 'erosion', 'vibration'], mitigation: 'Tube inspection, proper material selection', severity: 'critical', occurrenceRating: 3, detectionRating: 4 },
    { id: 'tube_plugging', name: 'Tube Plugging', description: 'Blockage of tubes', criterion: 'Flow < Expected', factors: ['fouling', 'scaling'], mitigation: 'Cleaning, chemical treatment', severity: 'major', occurrenceRating: 5, detectionRating: 3 },
    { id: 'baffle_damage', name: 'Baffle Damage', description: 'Loss of baffle integrity', criterion: 'Pressure drop pattern change', factors: ['flow_induced_vibration', 'corrosion'], mitigation: 'Support rods, proper design', severity: 'major', occurrenceRating: 3, detectionRating: 4 },
    { id: 'fouling', name: 'Fouling', description: 'Reduced heat transfer', criterion: 'U decreases over time', factors: ['fluid_quality', 'temperature', 'velocity'], mitigation: 'Cleaning schedule, proper velocity', severity: 'minor', occurrenceRating: 7, detectionRating: 2 },
    { id: 'tube_vibration', name: 'Flow-Induced Vibration', description: 'Tube damage from flow', criterion: 'Vibration > Limit', factors: ['flow_velocity', 'baffle_cut', 'tube_spacing'], mitigation: 'Anti-vibration baffles, proper design', severity: 'critical', occurrenceRating: 4, detectionRating: 5 }
  ],
  
  material: { name: 'Carbon Steel', type: 'metal' as any, source: 'catalog', designation: 'ASTM A53', density: 7850, youngsModulus: 200, yieldStrength: 250, thermalConductivity: 50 } as MaterialSpecification,
  
  cost: { purchaseCost: 25000, purchaseCostCurrency: 'USD', installationFactor: 1.4, maintenanceRate: 0.03, expectedLife: 25 },
  
  references: ['TEMA Standards', 'API 660 - Shell-and-Tube Heat Exchangers']
};

export default ShellAndTubeHeatExchanger;

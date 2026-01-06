/**
 * Control Valve Component
 * Flow regulation with characterized flow coefficient
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

const PORT_FLUID: PortVariable[] = [
  { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
  { symbol: 'P₁', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
  { symbol: 'P₂', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
  { symbol: 'T', name: 'Temperature', unit: 'K', direction: 'in' },
  { symbol: 'ρ', name: 'Density', unit: 'kg/m³', direction: 'in' }
];

const PORT_SIGNAL: PortVariable[] = [
  { symbol: 'm', name: 'Position Signal', unit: '%', direction: 'in' },
  { symbol: 'y', name: 'Actual Position', unit: '%', direction: 'out' }
];

export const ControlValve: MechanicalComponent = {
  id: createComponentId('valve'),
  name: 'Control Valve',
  category: 'fluid' as MechanicalDomain,
  subcategory: 'internalFlow' as SubDomain,
  manufacturer: 'Generic',
  model: 'CV-Series',
  
  description: 'Globe-style control valve for precise flow regulation.',
  tags: ['valve', 'control', 'flow', 'regulation'],
  
  geometry: {
    type: 'parametrized',
    dimensions: {
      nominalDiameter: 0.05,
      faceToFace: 0.2,
     CvMax: 40,
      travel: 20,
      portDiameter: 0.04
    },
    mass: 8
  },
  
  ports: [
    { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: PORT_FLUID, state: 'disconnected' },
    { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: PORT_FLUID, state: 'disconnected' },
    { id: 'signal', name: 'Control Signal', type: 'input', domain: 'signal', variables: PORT_SIGNAL, state: 'disconnected' }
  ],
  
  parameters: [
    { name: 'Maximum Cv', symbol: 'Cv_max', value: 40, unit: 'gpm/√psi', description: 'Maximum flow coefficient' },
    { name: 'Nominal Diameter', symbol: 'DN', value: 50, unit: 'mm', standardSizes: [15, 20, 25, 40, 50, 80, 100, 150, 200] },
    { name: 'Characteristic', symbol: 'char', value: 'equal', unit: '', standardSizes: ['equal', 'linear', 'quick_open'], description: 'Flow characteristic' },
    { name: 'Rangeability', symbol: 'R', value: 50, unit: '', description: 'Max Cv / Min controllable Cv' },
    { name: 'Stem Travel', symbol: 'travel', value: 20, unit: 'mm', description: 'Total stem travel' },
    { name: 'Fail Position', symbol: 'fail', value: 'close', unit: '', standardSizes: ['close', 'open', 'stay'], description: 'Position on signal loss' },
    { name: 'Actuator Type', symbol: 'act', value: 'pneumatic', unit: '', standardSizes: ['pneumatic', 'electric', 'hydraulic'] },
    { name: 'Seat Leakage', symbol: 'leak', value: 0.01, unit: '% of Cv', description: 'Seat leakage class' },
    { name: 'Kv Factor', symbol: 'Kv', value: 34, unit: 'm³/h', description: 'European flow coefficient' }
  ],
  
  states: [
    { name: 'Flow Coefficient', symbol: 'Cv', value: 0, unit: 'gpm/√psi', source: 'calculated' },
    { name: 'Flow Rate', symbol: 'Q', value: 0, unit: 'm³/h', source: 'calculated' },
    { name: 'Pressure Drop', symbol: 'ΔP', value: 0, unit: 'kPa', source: 'calculated' },
    { name: 'Trim Position', symbol: 'y', value: 0, unit: '%', source: 'calculated' },
    { name: 'Authority', symbol: 'a', value: 0.5, unit: '', source: 'calculated' }
  ],
  
  equations: [
    { id: 'cv_flow', name: 'Cv Flow Equation', domain: 'fluid' as MechanicalDomain, expression: 'Cv = Q * √(SG/ΔP)', type: 'algebraic' },
    { id: 'equal_percent', name: 'Equal Percentage Characteristic', domain: 'fluid' as MechanicalDomain, expression: 'Cv/Cv_max = R^((y/100)-1)', type: 'algebraic' },
    { id: 'linear', name: 'Linear Characteristic', domain: 'fluid' as MechanicalDomain, expression: 'Cv/Cv_max = y/100', type: 'algebraic' },
    { id: 'quick_open', name: 'Quick Opening Characteristic', domain: 'fluid' as MechanicalDomain, expression: 'Cv/Cv_max = √(y/100)', type: 'algebraic' },
    { id: 'pressure_drop', name: 'Pressure Drop', domain: 'fluid' as MechanicalDomain, expression: 'ΔP = (Q/Cv)² * SG', type: 'algebraic' },
    { id: 'valve_authority', name: 'Valve Authority', domain: 'fluid' as MechanicalDomain, expression: 'a = ΔP_valve / (ΔP_valve + ΔP_system)', type: 'algebraic' }
  ],
  
  constraints: [
    { id: 'min_controllable', name: 'Minimum Controllable Flow', expression: 'Q > Q_max / R', type: 'inequality', severity: 'warning' },
    { id: 'max_pressure_drop', name: 'Maximum Pressure Drop', expression: 'ΔP < 50', type: 'inequality', severity: 'warning' },
    { id: 'cavitation_limit', name: 'Cavitation Limit', expression: 'P₁ - P_v > 2 * (P₁ - P₂)', type: 'inequality', severity: 'warning' },
    { id: 'choked_flow', name: 'Choked Flow Check', expression: 'ΔP < P₁ / 2', type: 'inequality', severity: 'info' }
  ],
  
  failureModes: [
    { id: 'plugging', name: 'Plugging', description: 'Flow blockage from debris', criterion: 'Flow < Expected', calculation: 'Compare actual vs expected flow', factors: ['fluid_quality', 'filtration'], mitigation: 'Strainers, regular cleaning', severity: 'major', occurrenceRating: 4, detectionRating: 3 },
    { id: 'seat_wear', name: 'Seat Wear', description: 'Increased leakage', criterion: 'Leakage > Class', calculation: 'Measure seat leakage', factors: ['cycle_count', 'fluid_abrasiveness'], mitigation: 'Hard seat materials', severity: 'minor', occurrenceRating: 5, detectionRating: 4 },
    { id: 'actuator_failure', name: 'Actuator Failure', description: 'Position not responding', criterion: 'y ≠ m', calculation: 'Compare signal to position', factors: ['power', 'mechanical_linkage'], mitigation: 'Regular testing', severity: 'critical', occurrenceRating: 3, detectionRating: 5 },
    { id: 'cavitation_damage', name: 'Cavitation Damage', description: 'Trim erosion', criterion: 'P₁ - P₂ > Critical', calculation: 'Check cavitation parameter', factors: ['pressure_drop', 'temperature'], mitigation: 'Cavitation control trim', severity: 'major', occurrenceRating: 4, detectionRating: 4 }
  ],
  
  material: { name: 'Cast Iron', type: 'metal' as any, source: 'catalog', designation: 'ASTM A126', density: 7200, youngsModulus: 110, yieldStrength: 280, ultimateStrength: 290 } as MaterialSpecification,
  
  cost: { purchaseCost: 2000, purchaseCostCurrency: 'USD', installationFactor: 1.3, maintenanceRate: 0.05, expectedLife: 15 },
  
  references: ['ISA-75.01.01 - Flow Equations', 'IEC 60534-2-1 - Sizing']
};

export default ControlValve;

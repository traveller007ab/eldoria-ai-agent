/**
 * Centrifugal Compressor Component
 * Dynamic compression for gas applications
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

const PORT_INLET: PortVariable[] = [
  { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
  { symbol: 'P₁', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
  { symbol: 'T₁', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
  { symbol: 'ρ₁', name: 'Inlet Density', unit: 'kg/m³', direction: 'in' },
  { symbol: 'R', name: 'Gas Constant', unit: 'J/(kg·K)', direction: 'in' }
];

const PORT_OUTLET: PortVariable[] = [
  { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
  { symbol: 'P₂', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
  { symbol: 'T₂', name: 'Outlet Temperature', unit: 'K', direction: 'out' },
  { symbol: 'ρ₂', name: 'Outlet Density', unit: 'kg/m³', direction: 'out' }
];

const PORT_SHAFT: PortVariable[] = [
  { symbol: 'ω', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
  { symbol: 'τ', name: 'Torque', unit: 'N·m', direction: 'in' },
  { symbol: 'Ẇ', name: 'Shaft Power', unit: 'W', direction: 'in' }
];

export const CentrifugalCompressor: MechanicalComponent = {
  id: createComponentId('compressor'),
  name: 'Centrifugal Compressor',
  category: 'fluid' as MechanicalDomain,
  subcategory: 'turbomachinery' as SubDomain,
  manufacturer: 'Generic',
  model: 'CC-Series',
  
  description: 'Radial-flow centrifugal compressor for gas compression in industrial applications.',
  tags: ['compressor', 'centrifugal', 'fluid', 'turbomachinery', 'gas'],
  
  geometry: {
    type: 'parametrized',
    shape: 'cylinder',
    dimensions: {
      impellerDiameter: 0.4,
      eyeDiameter: 0.15,
      bladeWidth: 0.025,
      numberOfBlades: 15,
      diffuserWidth: 0.03,
      housingDiameter: 0.5,
      housingLength: 0.6
    },
    mass: 150,
    momentOfInertia: { xx: 3, yy: 3, zz: 5 }
  },
  
  ports: [
    { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: PORT_INLET, state: 'disconnected', description: 'Gas inlet' },
    { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: PORT_OUTLET, state: 'disconnected', description: 'Compressed gas outlet' },
    { id: 'shaft', name: 'Shaft', type: 'input', domain: 'mechanical', variables: PORT_SHAFT, state: 'disconnected', description: 'Power input' }
  ],
  
  parameters: [
    { name: 'Rotational Speed', symbol: 'N', value: 3000, unit: 'rpm', designRange: { min: 1000, max: 15000 }, isDesignVariable: true, description: 'Impeller speed' },
    { name: 'Design Flow Rate', symbol: 'ṁ_design', value: 0.5, unit: 'kg/s', designRange: { min: 0.01, max: 10 }, description: 'Mass flow at design point' },
    { name: 'Pressure Ratio', symbol: 'PR', value: 3.0, unit: '', designRange: { min: 1.1, max: 10 }, isDesignVariable: true, description: 'Discharge/Inlet pressure ratio' },
    { name: 'Isentropic Efficiency', symbol: 'η_is', value: 0.82, unit: 'dimensionless', standardSizes: [0.75, 0.8, 0.85, 0.88, 0.9], description: 'Isentropic efficiency' },
    { name: 'Polytropic Efficiency', symbol: 'η_poly', value: 0.85, unit: 'dimensionless', description: 'Polytropic efficiency' },
    { name: 'Impeller Diameter', symbol: 'D', value: 0.4, unit: 'm', standardSizes: [0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5], description: 'Impeller tip diameter' },
    { name: 'Eye Diameter Ratio', symbol: 'Deye_D', value: 0.375, unit: '', description: 'Eye to impeller diameter ratio' },
    { name: 'Inlet Temperature', symbol: 'T₁', value: 288, unit: 'K', description: 'Design inlet temperature' },
    { name: 'Inlet Pressure', symbol: 'P₁', value: 101325, unit: 'Pa', description: 'Design inlet pressure' },
    { name: 'Gas Constant', symbol: 'R', value: 287, unit: 'J/(kg·K)', description: 'Specific gas constant (air)' },
    { name: 'Specific Heat Ratio', symbol: 'k', value: 1.4, unit: '', description: 'Ratio of specific heats' },
    { name: 'Surge Line Flow', symbol: 'ṁ_surge', value: 0.3, unit: 'kg/s', description: 'Mass flow at surge' },
    { name: 'Stonewall Flow', symbol: 'ṁ_choke', value: 0.8, unit: 'kg/s', description: 'Mass flow at choke' },
    { name: 'Maximum Speed', symbol: 'N_max', value: 5000, unit: 'rpm', description: 'Maximum allowable speed' }
  ],
  
  states: [
    { name: 'Flow Coefficient', symbol: 'φ', value: 0.04, unit: '', source: 'calculated', description: 'Q/(ωD³)' },
    { name: 'Head Coefficient', symbol: 'ψ', value: 0.85, unit: '', source: 'calculated', description: 'ΔH/(ω²D²)' },
    { name: 'Work Coefficient', symbol: 'λ', value: 0.9, unit: '', source: 'calculated', description: 'Work input coefficient' },
    { name: 'Outlet Temperature', symbol: 'T₂', value: 0, unit: 'K', source: 'calculated', description: 'Discharge temperature' },
    { name: 'Outlet Pressure', symbol: 'P₂', value: 0, unit: 'Pa', source: 'calculated', description: 'Discharge pressure' },
    { name: 'Power', symbol: 'Ẇ', value: 0, unit: 'kW', source: 'calculated', description: 'Shaft power required' },
    { name: 'Surge Margin', symbol: 'SM', value: 0, unit: '%', source: 'calculated', description: 'Surge margin percentage' }
  ],
  
  equations: [
    { id: 'pressure_ratio_temp', name: 'Temperature from Pressure Ratio', domain: 'thermodynamic' as MechanicalDomain, expression: 'T₂ = T₁ * (1 + (PR^((k-1)/k) - 1) / η_is)', type: 'algebraic', description: 'Isentropic temperature rise' },
    { id: 'head_compressor', name: 'Compressor Head', domain: 'fluid' as MechanicalDomain, expression: 'ΔH = cp * (T₂ - T₁)', type: 'algebraic', description: 'Enthalpy rise' },
    { id: 'power_compressor', name: 'Compressor Power', domain: 'thermodynamic' as MechanicalDomain, expression: 'Ẇ = ṁ * cp * (T₂ - T₁) / η_is', type: 'algebraic', description: 'Shaft power' },
    { id: 'flow_coefficient', name: 'Flow Coefficient', domain: 'fluid' as MechanicalDomain, expression: 'φ = ṁ / (ρ₁ * ω * D³)', type: 'algebraic', description: 'Dimensionless flow' },
    { id: 'head_coefficient', name: 'Head Coefficient', domain: 'fluid' as MechanicalDomain, expression: 'ψ = ΔH / (ω² * D²)', type: 'algebraic', description: 'Dimensionless head' },
    { id: 'surge_line', name: 'Surge Line', domain: 'fluid' as MechanicalDomain, expression: 'PR = 1 + 4.5 * φ - 10 * φ²', type: 'empirical', description: 'Surge boundary' },
    { id: 'choke_line', name: 'Choke Line', domain: 'fluid' as MechanicalDomain, expression: 'φ = 0.08', type: 'empirical', description: 'Choke boundary' },
    { id: 'isentropic_work', name: 'Isentropic Work', domain: 'thermodynamic' as MechanicalDomain, expression: 'W_is = cp * T₁ * (PR^((k-1)/k) - 1)', type: 'algebraic', description: 'Isentropic work per kg' },
    { id: 'actual_work', name: 'Actual Work', domain: 'thermodynamic' as MechanicalDomain, expression: 'W_actual = W_is / η_is', type: 'algebraic', description: 'Actual work per kg' },
    { id: 'outlet_density', name: 'Outlet Density', domain: 'fluid' as MechanicalDomain, expression: 'ρ₂ = P₂ / (R * T₂)', type: 'algebraic', description: 'Outlet density' }
  ],
  
  constraints: [
    { id: 'surge_prevention', name: 'Surge Margin', expression: 'ṁ > 1.1 * ṁ_surge', type: 'inequality', severity: 'error', description: 'Must operate above surge line' },
    { id: 'choke_prevention', name: 'Choke Prevention', expression: 'ṁ < 0.95 * ṁ_choke', type: 'inequality', severity: 'warning', description: 'Must operate below choke line' },
    { id: 'max_speed', name: 'Maximum Speed', expression: 'N < N_max', type: 'inequality', severity: 'error', description: 'Speed limit' },
    { id: 'max_pressure_ratio', name: 'Maximum Pressure Ratio', expression: 'PR < 8', type: 'inequality', severity: 'warning', description: 'Pressure ratio limit' },
    { id: 'min_flow_coefficient', name: 'Minimum Flow Coefficient', expression: 'φ > 0.02', type: 'inequality', severity: 'warning', description: 'Minimum flow for stability' }
  ],
  
  failureModes: [
    { id: 'surge', name: 'Surge', description: 'Flow reversal due to excessive pressure ratio at low flow', criterion: 'ṁ < ṁ_surge', factors: ['flow_rate', 'pressure_ratio', 'compressor_characteristics'], mitigation: 'Anti-surge control, recycle valve', severity: 'critical', occurrenceRating: 5, detectionRating: 6 },
    { id: 'rotor_dynamics', name: 'Rotor Dynamic Issues', description: 'Vibration from imbalance, misalignment, or critical speeds', criterion: 'N close to critical speed', factors: ['speed', 'imbalance', 'misalignment'], mitigation: 'Balance, align, avoid critical speeds', severity: 'critical', occurrenceRating: 4, detectionRating: 5 },
    { id: 'bearing_failure', name: 'Bearing Failure', description: 'Premature bearing wear', criterion: 'L10 < required', factors: ['load', 'lubrication', 'speed'], mitigation: 'Proper lubrication, maintenance', severity: 'major', occurrenceRating: 5, detectionRating: 4 },
    { id: 'seal_wear', name: 'Seal Wear', description: 'Gas leakage past seals', criterion: 'leakage > limit', factors: ['speed', 'temperature', 'particles'], mitigation: 'Filtration, proper seals', severity: 'major', occurrenceRating: 4, detectionRating: 3 }
  ],
  
  material: { name: 'Steel 4140', type: 'metal' as any, designation: 'AISI 4140', density: 7850, youngsModulus: 205, yieldStrength: 415, ultimateStrength: 655, thermalConductivity: 42, specificHeat: 460 } as MaterialSpecification,
  
  cost: { purchaseCost: 15000, purchaseCostCurrency: 'USD', installationFactor: 1.5, maintenanceRate: 0.08, expectedLife: 20, warrantyPeriod: 2 },
  
  references: ['API 617 - Axial and Centrifugal Compressors', 'ASME PTC-10 - Compressor Performance Testing']
};

export default CentrifugalCompressor;

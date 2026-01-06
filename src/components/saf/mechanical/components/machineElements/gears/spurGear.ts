/**
 * Spur Gear Component
 * Basic parallel axis gear
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
} from '../../../types';

const PORT_SHAFT: PortVariable[] = [
  { symbol: 'ω₁', name: 'Input Speed', unit: 'rad/s', direction: 'in' },
  { symbol: 'τ₁', name: 'Input Torque', unit: 'N·m', direction: 'in' },
  { symbol: 'ω₂', name: 'Output Speed', unit: 'rad/s', direction: 'out' },
  { symbol: 'τ₂', name: 'Output Torque', unit: 'N·m', direction: 'out' }
];

export const SpurGear: MechanicalComponent = {
  id: createComponentId('gear_spur'),
  name: 'Spur Gear',
  category: 'machineElement' as MechanicalDomain,
  subcategory: 'powerTransmission' as SubDomain,
  manufacturer: 'Generic',
  model: 'SG-Series',
  
  description: 'Involute spur gear for parallel shaft power transmission.',
  tags: ['gear', 'spur', 'transmission', 'power'],
  
  geometry: {
    type: 'parametrized',
    dimensions: {
      pitchDiameter: 0.1,
      outsideDiameter: 0.108,
      rootDiameter: 0.091,
      faceWidth: 0.02,
      boreDiameter: 0.02,
      pressureAngle: 20,
      numberOfTeeth: 24,
      module: 0.005,
      addendum: 0.00125,
      dedendum: 0.001875
    },
    mass: 0.8
  },
  
  ports: [
    { id: 'input_shaft', name: 'Input Shaft', type: 'input', domain: 'mechanical', variables: PORT_SHAFT, state: 'disconnected' },
    { id: 'output_shaft', name: 'Output Shaft', type: 'output', domain: 'mechanical', variables: PORT_SHAFT, state: 'disconnected' }
  ],
  
  parameters: [
    { name: 'Number of Teeth', symbol: 'z', value: 24, designRange: { min: 12, max: 200 }, unit: '' },
    { name: 'Module', symbol: 'm', value: 0.005, unit: 'm', standardSizes: [0.002, 0.003, 0.004, 0.005, 0.006, 0.008, 0.01] },
    { name: 'Pressure Angle', symbol: 'α', value: 20, unit: 'deg', standardSizes: [14.5, 20, 25] },
    { name: 'Face Width', symbol: 'b', value: 0.02, unit: 'm', designRange: { min: 0.005, max: 0.1 } },
    { name: 'Design Torque', symbol: 'T', value: 100, unit: 'N·m', designRange: { min: 1, max: 10000 } },
    { name: 'Design Speed', symbol: 'n', value: 1000, unit: 'rpm', designRange: { min: 10, max: 10000 } },
    { name: 'Quality Number', symbol: 'Qv', value: 6, unit: '', standardSizes: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12] },
    { name: 'Safety Factor', symbol: 'SF', value: 1.5, unit: '', designRange: { min: 1.0, max: 3.0 } },
    { name: 'Overload Factor', symbol: 'Ko', value: 1.25, unit: '' },
    { name: 'Dynamic Factor', symbol: 'Kv', value: 1.0, unit: '' },
    { name: 'Load Distribution Factor', symbol: 'Km', value: 1.3, unit: '' }
  ],
  
  states: [
    { name: 'Tangential Force', symbol: 'Ft', value: 0, unit: 'N', source: 'calculated' },
    { name: 'Radial Force', symbol: 'Fr', value: 0, unit: 'N', source: 'calculated' },
    { name: 'Gear Ratio', symbol: 'i', value: 1, unit: '', source: 'specified' as any },
    { name: 'Pitch Line Velocity', symbol: 'V', value: 0, unit: 'm/s', source: 'calculated' },
    { name: 'Bending Stress', symbol: 'σb', value: 0, unit: 'MPa', source: 'calculated' },
    { name: 'Contact Stress', symbol: 'σc', value: 0, unit: 'MPa', source: 'calculated' },
    { name: 'Lewis Form Factor', symbol: 'Y', value: 0.32, unit: '', source: 'calculated' }
  ],
  
  equations: [
    { id: 'pitch_diameter', name: 'Pitch Diameter', domain: 'solidMechanics' as MechanicalDomain, expression: 'd = m * z', type: 'algebraic' },
    { id: 'speed_ratio', name: 'Speed Ratio', domain: 'solidMechanics' as MechanicalDomain, expression: 'ω₂ = ω₁ * z₁ / z₂', type: 'algebraic' },
    { id: 'torque_ratio', name: 'Torque Ratio', domain: 'solidMechanics' as MechanicalDomain, expression: 'τ₂ = τ₁ * z₂ / z₁', type: 'algebraic' },
    { id: 'tangential_force', name: 'Tangential Force', domain: 'solidMechanics' as MechanicalDomain, expression: 'Ft = 2 * T / d', type: 'algebraic' },
    { id: 'radial_force', name: 'Radial Force', domain: 'solidMechanics' as MechanicalDomain, expression: 'Fr = Ft * tan(α)', type: 'algebraic' },
    { id: 'pitch_velocity', name: 'Pitch Line Velocity', domain: 'solidMechanics' as MechanicalDomain, expression: 'V = π * d * n / 60', type: 'algebraic' },
    { id: 'lewis_bending', name: 'Lewis Bending Stress', domain: 'solidMechanics' as MechanicalDomain, expression: 'σb = Ft * Ko * Kv * Km / (b * m * Y)', type: 'algebraic' },
    { id: 'agma_contact', name: 'AGMA Contact Stress', domain: 'solidMechanics' as MechanicalDomain, expression: 'σc = Cp * sqrt(Ft * Ko * Kv * Km / (b * d * I))', type: 'algebraic' }
  ],
  
  constraints: [
    { id: 'bending_strength', name: 'Bending Strength', expression: 'σb * SF < Sb', type: 'inequality', severity: 'error' },
    { id: 'contact_strength', name: 'Contact Strength', expression: 'σc * SF < Sc', type: 'inequality', severity: 'error' },
    { id: 'min_teeth', name: 'Minimum Teeth', expression: 'z >= 12', type: 'inequality', severity: 'warning' },
    { id: 'face_width_ratio', name: 'Face Width Ratio', expression: 'b >= 9 * m', type: 'inequality', severity: 'warning' }
  ],
  
  failureModes: [
    { id: 'bending_fatigue', name: 'Bending Fatigue', description: 'Tooth root cracking', criterion: 'σb > Allowable', factors: ['load', 'cycles', 'stress_concentration'], mitigation: 'Increase face width, shot peening', severity: 'critical', occurrenceRating: 5, detectionRating: 4 },
    { id: 'pitting', name: 'Pitting', description: 'Surface fatigue spalling', criterion: 'σc > Allowable', factors: ['lubrication', 'hardness', 'load'], mitigation: 'Increase hardness, proper lubrication', severity: 'critical', occurrenceRating: 6, detectionRating: 4 },
    { id: 'scoring', name: 'Scoring', description: 'Adhesive wear', criterion: 'pV > Limit', factors: ['lubrication', 'sliding_velocity', 'load'], mitigation: 'EP lubricants, proper clearance', severity: 'major', occurrenceRating: 4, detectionRating: 5 }
  ],
  
  material: { name: 'Steel 4140', type: 'metal' as any, source: 'catalog', designation: 'AISI 4140', density: 7850, youngsModulus: 205, yieldStrength: 415, ultimateStrength: 655 } as MaterialSpecification,
  
  cost: { purchaseCost: 80, purchaseCostCurrency: 'USD', installationFactor: 1.2, maintenanceRate: 0.01, expectedLife: 15 },
  
  references: ['AGMA 2001 - Fundamental Rating Factors']
};

export default SpurGear;

/**
 * Deep Groove Ball Bearing
 * Common industrial bearing
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
  { symbol: 'ω', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
  { symbol: 'Fr', name: 'Radial Load', unit: 'N', direction: 'in' },
  { symbol: 'Fa', name: 'Axial Load', unit: 'N', direction: 'in' },
  { symbol: 'L10', name: 'Rating Life', unit: 'hours', direction: 'out' }
];

export const DeepGrooveBallBearing: MechanicalComponent = {
  id: createComponentId('bearing'),
  name: 'Deep Groove Ball Bearing',
  category: 'machineElement' as MechanicalDomain,
  subcategory: 'powerTransmission' as SubDomain,
  manufacturer: 'Generic',
  model: '6000-Series',
  
  description: 'Deep groove ball bearing for radial and axial loads.',
  tags: ['bearing', 'ball', 'rolling_element', 'rotating'],
  
  geometry: {
    type: 'parametrized',
    dimensions: {
      boreDiameter: 0.01,
      outerDiameter: 0.026,
      width: 0.008,
      ballDiameter: 0.004,
      numberOfBalls: 8,
      pitchDiameter: 0.018
    },
    mass: 0.02
  },
  
  ports: [
    { id: 'shaft', name: 'Shaft Interface', type: 'input', domain: 'mechanical', variables: PORT_SHAFT, state: 'disconnected' }
  ],
  
  parameters: [
    { name: 'Bore Diameter', symbol: 'd', value: 10, unit: 'mm', standardSizes: [5, 6, 7, 8, 9, 10, 12, 15, 17, 20, 25, 30, 35, 40, 45, 50] },
    { name: 'Outer Diameter', symbol: 'D', value: 26, unit: 'mm' },
    { name: 'Width', symbol: 'B', value: 8, unit: 'mm' },
    { name: 'Dynamic Load Rating', symbol: 'C', value: 4550, unit: 'N', description: 'Basic dynamic load rating' },
    { name: 'Static Load Rating', symbol: 'C0', value: 1970, unit: 'N', description: 'Basic static load rating' },
    { name: 'Limiting Speed', symbol: 'ng', value: 32000, unit: 'rpm', description: 'Grease lubrication limit' },
    { name: 'Design Life', symbol: 'L_design', value: 20000, unit: 'hours', description: 'Target design life' },
    { name: 'Reliability', symbol: 'R', value: 0.9, unit: '', standardSizes: [0.9, 0.95, 0.99], description: 'Reliability factor' },
    { name: 'Radial Load', symbol: 'Fr', value: 500, unit: 'N', designRange: { min: 10, max: 2000 } },
    { name: 'Axial Load', symbol: 'Fa', value: 100, unit: 'N', designRange: { min: 0, max: 1000 } },
    { name: 'Speed', symbol: 'n', value: 1000, unit: 'rpm', designRange: { min: 10, max: 30000 } },
    { name: 'Preload', symbol: 'Fp', value: 0, unit: 'N', description: 'Axial preload' }
  ],
  
  states: [
    { name: 'Equivalent Dynamic Load', symbol: 'P', value: 0, unit: 'N', source: 'calculated' },
    { name: 'L10 Life', symbol: 'L10', value: 0, unit: 'hours', source: 'calculated' },
    { name: 'Life Adjustment Factor', symbol: 'a1', value: 1, unit: '', source: 'calculated' },
    { name: 'Speed Factor', symbol: 'fn', value: 1, unit: '', source: 'calculated' },
    { name: 'Load Factor', symbol: 'fp', value: 1, unit: '', source: 'calculated' },
    { name: 'Static Safety Factor', symbol: 'fs', value: 0, unit: '', source: 'calculated' }
  ],
  
  equations: [
    { id: 'equivalent_load', name: 'Equivalent Dynamic Load', domain: 'solidMechanics' as MechanicalDomain, expression: 'P = X * Fr + Y * Fa', type: 'algebraic' },
    { id: 'l10_life', name: 'L10 Life (million revs)', domain: 'solidMechanics' as MechanicalDomain, expression: 'L10 = (C/P)^3', type: 'algebraic' },
    { id: 'l10_hours', name: 'L10 Life (hours)', domain: 'solidMechanics' as MechanicalDomain, expression: 'L10h = L10 * 10^6 / (60 * n)', type: 'algebraic' },
    { id: 'reliability_factor', name: 'Reliability Factor', domain: 'solidMechanics' as MechanicalDomain, expression: 'a1 = ln(1/R)^(1/1.17)', type: 'algebraic' },
    { id: 'speed_factor', name: 'Speed Factor', domain: 'solidMechanics' as MechanicalDomain, expression: 'fn = (ng/n)^0.3', type: 'algebraic' },
    { id: 'axial_factor', name: 'Axial Load Factor', domain: 'solidMechanics' as MechanicalDomain, expression: 'Fa/C0 determines Y factor', type: 'algebraic' },
    { id: 'static_safety', name: 'Static Safety Factor', domain: 'solidMechanics' as MechanicalDomain, expression: 'fs = C0 / P0', type: 'algebraic' }
  ],
  
  constraints: [
    { id: 'life_requirement', name: 'Life Requirement', expression: 'L10h >= L_design', type: 'inequality', severity: 'error' },
    { id: 'speed_limit', name: 'Speed Limit', expression: 'n < ng', type: 'inequality', severity: 'error' },
    { id: 'static_safety_min', name: 'Minimum Static Safety', expression: 'fs > 1.5', type: 'inequality', severity: 'warning' },
    { id: 'load_rating', name: 'Dynamic Load Rating', expression: 'P < C', type: 'inequality', severity: 'error' }
  ],
  
  failureModes: [
    { id: 'fatigue', name: 'Rolling Element Fatigue', description: 'Spalling from cyclic stress', criterion: 'L10 < Required', factors: ['load', 'speed', 'lubrication'], mitigation: 'Proper sizing, lubrication', severity: 'critical', occurrenceRating: 5, detectionRating: 4 },
    { id: 'wear', name: 'Abrasive Wear', description: 'Progressive wear from particles', criterion: 'Clearance increases', factors: ['contamination', 'lubrication'], mitigation: 'Seals, clean lubrication', severity: 'minor', occurrenceRating: 6, detectionRating: 3 },
    { id: 'corrosion', name: 'Corrosion', description: 'Rust and pitting', criterion: 'Surface oxidation', factors: ['moisture', 'corrosive_environment'], mitigation: 'Proper seals, corrosion resistant', severity: 'minor', occurrenceRating: 4, detectionRating: 3 },
    { id: 'brinelling', name: 'Brinelling', description: 'Permanent indentation', criterion: 'Static load > Limit', factors: ['shock_loads', 'storage'], mitigation: 'Proper handling, static load limits', severity: 'minor', occurrenceRating: 3, detectionRating: 4 },
    { id: 'false_brinelling', name: 'False Brinelling', description: 'Fretting wear at rest', criterion: 'Vibration at low speed', factors: ['vibration', '微动'], mitigation: 'Proper storage, anti-fretting measures', severity: 'minor', occurrenceRating: 4, detectionRating: 3 }
  ],
  
  material: { name: 'Chrome Steel', type: 'metal' as any, source: 'catalog', designation: 'AISI 52100', density: 7810, youngsModulus: 210, yieldStrength: 2200, hardness: 60 },
  
  cost: { purchaseCost: 15, purchaseCostCurrency: 'USD', installationFactor: 1.1, maintenanceRate: 0.01, expectedLife: 10 },
  
  references: ['ISO 281 - Dynamic Load Ratings', 'SKF General Catalogue']
};

export default DeepGrooveBallBearing;

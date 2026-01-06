/**
 * Centrifugal Pump Component
 * Complete pump model with performance curves and NPSH analysis
 */

import { 
  MechanicalComponent, 
  MechanicalDomain, 
  SubDomain,
  PortVariable,
  GoverningEquation,
  ComponentConstraint,
  PerformanceMap,
  FailureMode,
  MaterialSpecification,
  createComponentId 
} from '../../types';

const PORT_INPUT_FLUID: PortVariable[] = [
  { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
  { symbol: 'P₁', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
  { symbol: 'T₁', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
  { symbol: 'ρ', name: 'Density', unit: 'kg/m³', direction: 'in' },
  { symbol: 'μ', name: 'Dynamic Viscosity', unit: 'Pa·s', direction: 'in' },
  { symbol: 'v₁', name: 'Inlet Velocity', unit: 'm/s', direction: 'in' }
];

const PORT_OUTPUT_FLUID: PortVariable[] = [
  { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
  { symbol: 'P₂', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
  { symbol: 'T₂', name: 'Outlet Temperature', unit: 'K', direction: 'out' },
  { symbol: 'v₂', name: 'Outlet Velocity', unit: 'm/s', direction: 'out' }
];

const PORT_SHAFT: PortVariable[] = [
  { symbol: 'ω', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
  { symbol: 'τ', name: 'Torque', unit: 'N·m', direction: 'in' },
  { symbol: 'Ẇ', name: 'Shaft Power', unit: 'W', direction: 'in' }
];

export const CentrifugalPump: MechanicalComponent = {
  id: createComponentId('pump'),
  name: 'Centrifugal Pump',
  category: 'fluid' as MechanicalDomain,
  subcategory: 'turbomachinery' as SubDomain,
  manufacturer: 'Generic',
  model: 'CP-Series',
  
  description: 'Radial-flow centrifugal pump for moving fluids in industrial applications.',
  tags: ['pump', 'centrifugal', 'fluid', 'turbomachinery', 'industrial'],
  
  geometry: {
    type: 'parametrized',
    shape: 'cylinder',
    dimensions: {
      impellerDiameter: 0.3,
      eyeDiameter: 0.1,
      bladeWidth: 0.02,
      numberOfBlades: 7,
      voluteWidth: 0.05,
      housingLength: 0.4,
      inletDiameter: 0.08,
      outletDiameter: 0.06
    },
    mass: 25,
    momentOfInertia: { xx: 0.5, yy: 0.5, zz: 0.8 }
  },
  
  ports: [
    { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: PORT_INPUT_FLUID, state: 'disconnected', description: 'Fluid inlet port' },
    { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: PORT_OUTPUT_FLUID, state: 'disconnected', description: 'Fluid outlet port' },
    { id: 'shaft', name: 'Shaft', type: 'input', domain: 'mechanical', variables: PORT_SHAFT, state: 'disconnected', description: 'Power input from motor' }
  ],
  
  parameters: [
    { name: 'Rotational Speed', symbol: 'N', value: 1800, unit: 'rpm', designRange: { min: 500, max: 10000 }, isDesignVariable: true, description: 'Rotational speed of the impeller' },
    { name: 'Design Flow Rate', symbol: 'Q_design', value: 0.05, unit: 'm³/s', designRange: { min: 0.001, max: 1 }, description: 'Volumetric flow rate at best efficiency point' },
    { name: 'Design Head', symbol: 'H_design', value: 20, unit: 'm', designRange: { min: 1, max: 200 }, description: 'Head developed at best efficiency point' },
    { name: 'Best Efficiency Point', symbol: 'η_BEP', value: 0.82, unit: 'dimensionless', standardSizes: [0.7, 0.75, 0.8, 0.85, 0.9, 0.92], description: 'Maximum pump efficiency' },
    { name: 'Efficiency at Part Load', symbol: 'η_70', value: 0.75, unit: 'dimensionless', description: 'Efficiency at 70% of BEP flow' },
    { name: 'Efficiency at Overload', symbol: 'η_120', value: 0.78, unit: 'dimensionless', description: 'Efficiency at 120% of BEP flow' },
    { name: 'NPSHr', symbol: 'NPSHr', value: 2.5, unit: 'm', description: 'Net Positive Suction Head required' },
    { name: 'Suction Specific Speed', symbol: 'SSS', value: 12000, unit: 'rpm·gpm^0.5/ft^0.75', description: 'Suction specific speed' },
    { name: 'Impeller Diameter', symbol: 'D', value: 0.3, unit: 'm', standardSizes: [0.1, 0.15, 0.2, 0.25, 0.3, 0.35, 0.4, 0.45, 0.5], description: 'Outer diameter of the impeller' },
    { name: 'Eye Diameter', symbol: 'D_eye', value: 0.1, unit: 'm', description: 'Inlet eye diameter of the impeller' },
    { name: 'Number of Blades', symbol: 'Z', value: 7, unit: '', standardSizes: [5, 6, 7, 8, 9, 10], description: 'Number of impeller blades' },
    { name: 'Blade Width at Outlet', symbol: 'b₂', value: 0.02, unit: 'm', description: 'Blade width at impeller outlet' },
    { name: 'Rotational Inertia', symbol: 'J', value: 0.5, unit: 'kg·m²', description: 'Polar moment of inertia of rotating assembly' },
    { name: 'Maximum Allowable Speed', symbol: 'N_max', value: 4000, unit: 'rpm', description: 'Maximum safe operating speed' },
    { name: 'Minimum Flow Factor', symbol: 'Q_min_factor', value: 0.3, unit: 'dimensionless', description: 'Minimum continuous flow as fraction of BEP' },
    { name: 'Maximum Flow Factor', symbol: 'Q_max_factor', value: 1.5, unit: 'dimensionless', description: 'Maximum continuous flow as fraction of BEP' }
  ],
  
  states: [
    { name: 'Flow Coefficient', symbol: 'φ', value: 0.065, unit: 'dimensionless', source: 'calculated', description: 'Q / (ω * D³)' },
    { name: 'Head Coefficient', symbol: 'ψ', value: 0.85, unit: 'dimensionless', source: 'calculated', description: 'gH / (ω² * D²)' },
    { name: 'Power Coefficient', symbol: 'σ', value: 0.055, unit: 'dimensionless', source: 'calculated', description: 'P / (ρ * ω³ * D⁵)' },
    { name: 'Net Positive Suction Head', symbol: 'NPSHa', value: 0, unit: 'm', source: 'calculated', description: 'Available NPSH at suction flange' },
    { name: 'Throttle Position', symbol: 'θ', value: 1.0, unit: 'dimensionless', source: 'specified', description: 'Valve position' },
    { name: 'Suction Velocity', symbol: 'v_suction', value: 0, unit: 'm/s', source: 'calculated', description: 'Velocity at pump inlet' },
    { name: 'Discharge Velocity', symbol: 'v_discharge', value: 0, unit: 'm/s', source: 'calculated', description: 'Velocity at pump discharge' }
  ],
  
  equations: [
    { id: 'affinity_law_flow', name: 'Affinity Law - Flow', domain: 'fluid' as MechanicalDomain, expression: 'Q₂ = Q₁ * (N₂/N₁) * (D₂/D₁)³', latex: 'Q_2 = Q_1 (N_2/N_1) (D_2/D_1)^3', type: 'algebraic', solutionMethod: 'lookup' },
    { id: 'affinity_law_head', name: 'Affinity Law - Head', domain: 'fluid' as MechanicalDomain, expression: 'H₂ = H₁ * (N₂/N₁)² * (D₂/D₁)²', latex: 'H_2 = H_1 (N_2/N_1)^2 (D_2/D_1)^2', type: 'algebraic', solutionMethod: 'lookup' },
    { id: 'affinity_law_power', name: 'Affinity Law - Power', domain: 'fluid' as MechanicalDomain, expression: 'P₂ = P₁ * (N₂/N₁)³ * (D₂/D₁)⁵', latex: 'P_2 = P_1 (N_2/N_1)^3 (D_2/D_1)^5', type: 'algebraic', solutionMethod: 'lookup' },
    { id: 'efficiency_correction', name: 'Efficiency vs Flow', domain: 'fluid' as MechanicalDomain, expression: 'η = η_BEP * (1 - ((Q/Q_BEP - 1)² * 0.15))', type: 'algebraic' },
    { id: 'npsha_static', name: 'NPSHa - Static Head', domain: 'fluid' as MechanicalDomain, expression: 'NPSHa_static = (z_suction + P_atm/(ρ*g))', latex: 'NPSH_{a,static} = z_{suction} + P_{atm}/(ρg)', type: 'algebraic' },
    { id: 'npsha_velocity', name: 'NPSHa - Velocity Head', domain: 'fluid' as MechanicalDomain, expression: 'NPSHa_velocity = v₁²/(2*g)', latex: 'NPSH_{a,vel} = v_1^2/(2g)', type: 'algebraic' },
    { id: 'npsha_friction', name: 'NPSHa - Friction Losses', domain: 'fluid' as MechanicalDomain, expression: 'NPSHa_friction = h_f / g', type: 'algebraic' },
    { id: 'pump_head', name: 'Total Dynamic Head', domain: 'fluid' as MechanicalDomain, expression: 'H = (P₂ - P₁)/(ρ*g) + (v₂² - v₁²)/(2*g) + (z₂ - z₁)', latex: 'H = (P_2 - P_1)/(ρg) + (v_2^2 - v_1^2)/(2g) + Δz', type: 'algebraic' },
    { id: 'hydraulic_power', name: 'Hydraulic Power', domain: 'fluid' as MechanicalDomain, expression: 'Ẇ_hyd = ρ * g * Q * H', latex: '\\dot{W}_{hyd} = ρ g Q H', type: 'algebraic' },
    { id: 'shaft_power', name: 'Shaft Power', domain: 'fluid' as MechanicalDomain, expression: 'Ẇ_shaft = Ẇ_hyd / η', latex: '\\dot{W}_{shaft} = \\dot{W}_{hyd}/η', type: 'algebraic' },
    { id: 'torque', name: 'Shaft Torque', domain: 'fluid' as MechanicalDomain, expression: 'τ = Ẇ_shaft / ω', latex: 'τ = \\dot{W}_{shaft}/ω', type: 'algebraic' },
    { id: 'suction_specific_speed', name: 'Suction Specific Speed', domain: 'fluid' as MechanicalDomain, expression: 'SSS = N * √Q / NPSHr^0.75', latex: 'SSS = N √Q / NPSH_r^{0.75}', type: 'algebraic' },
    { id: 'flow_coefficient', name: 'Flow Coefficient', domain: 'fluid' as MechanicalDomain, expression: 'φ = Q / (ω * D³)', latex: 'φ = Q/(ω D^3)', type: 'algebraic' },
    { id: 'head_coefficient', name: 'Head Coefficient', domain: 'fluid' as MechanicalDomain, expression: 'ψ = g * H / (ω² * D²)', latex: 'ψ = gH/(ω^2 D^2)', type: 'algebraic' }
  ],
  
  constraints: [
    { id: 'cavitation', name: 'Cavitation Prevention', expression: 'NPSHa > NPSHr * 1.1', type: 'inequality', severity: 'error', description: 'Available NPSH must exceed required NPSH with 10% margin' },
    { id: 'max_speed', name: 'Maximum Speed Limit', expression: 'N < N_max', type: 'inequality', severity: 'error', description: 'Rotational speed must not exceed maximum' },
    { id: 'min_flow', name: 'Minimum Flow Limit', expression: 'Q > Q_min_factor * Q_design', type: 'inequality', severity: 'warning', description: 'Flow below minimum can cause overheating' },
    { id: 'max_flow', name: 'Maximum Flow Limit', expression: 'Q < Q_max_factor * Q_design', type: 'inequality', severity: 'warning', description: 'Flow above maximum can cause NPSH issues' },
    { id: 'suction_velocity', name: 'Suction Velocity Limit', expression: 'v₁ < 3', type: 'inequality', severity: 'warning', description: 'Suction velocity should not exceed 3 m/s' },
    { id: 'specific_speed_range', name: 'Specific Speed Range', expression: '500 < SSS < 12000', type: 'inequality', severity: 'info', description: 'Suction specific speed outside typical range' }
  ],
  
  performanceMaps: [
    { id: 'pump_curve', name: 'Pump Head-Capacity Curve', xVariable: 'flow_rate', yVariable: 'rotational_speed', zVariable: 'head', xUnits: 'm³/h', yUnits: 'rpm', zUnits: 'm', data: [[]], xRange: { min: 0, max: 150 }, yRange: { min: 1000, max: 3600 }, interpolation: 'bilinear' },
    { id: 'efficiency_map', name: 'Efficiency Contour Map', xVariable: 'flow_rate', yVariable: 'rotational_speed', zVariable: 'efficiency', xUnits: 'm³/h', yUnits: 'rpm', zUnits: 'dimensionless', data: [[]], xRange: { min: 0, max: 150 }, yRange: { min: 1000, max: 3600 }, interpolation: 'bilinear' },
    { id: 'power_curve', name: 'Power-Capacity Curve', xVariable: 'flow_rate', yVariable: 'rotational_speed', zVariable: 'power', xUnits: 'm³/h', yUnits: 'rpm', zUnits: 'kW', data: [[]], xRange: { min: 0, max: 150 }, yRange: { min: 1000, max: 3600 }, interpolation: 'bilinear' }
  ],
  
  failureModes: [
    { id: 'cavitation_damage', name: 'Cavitation Damage', description: 'Vapor bubble collapse causes pitting of impeller', criterion: 'NPSHa < NPSHr', calculation: 'NPSHa - NPSHr', factors: ['suction_conditions', 'temperature', 'inlet_pressure'], mitigation: 'Increase suction pressure, reduce temperature', severity: 'critical', occurrenceRating: 6, detectionRating: 5 },
    { id: 'bearing_failure', name: 'Bearing Failure', description: 'Premature bearing wear', criterion: 'L10 < required_life', calculation: '(C/P)^3', factors: ['load', 'speed', 'lubrication'], mitigation: 'Proper lubrication, alignment', severity: 'major', occurrenceRating: 5, detectionRating: 4 },
    { id: 'seal_leakage', name: 'Seal Leakage', description: 'Mechanical seal failure', criterion: 'leakage > allowable', calculation: 'Measured leakage', factors: ['pressure', 'temperature'], mitigation: 'Proper seal selection', severity: 'major', occurrenceRating: 4, detectionRating: 3 },
    { id: 'vibration', name: 'Excessive Vibration', description: 'Vibration from imbalance or cavitation', criterion: 'vibration > limit', calculation: 'Peak velocity', factors: ['imbalance', 'misalignment', 'cavitation'], mitigation: 'Balance rotor, align coupling', severity: 'major', occurrenceRating: 5, detectionRating: 4 },
    { id: 'dry_run', name: 'Dry Running Damage', description: 'Running without fluid causes rapid failure', criterion: 'flow = 0 for extended period', calculation: 'Operating time at zero flow', factors: ['inlet_blockage', 'valve_closure'], mitigation: 'Low flow protection', severity: 'critical', occurrenceRating: 3, detectionRating: 6 }
  ],
  
  material: { name: 'Cast Iron', type: 'metal', designation: 'ASTM A48 Class 40', density: 7200, youngsModulus: 110, yieldStrength: 280, ultimateStrength: 290, thermalConductivity: 55, specificHeat: 460 } as MaterialSpecification,
  
  cost: { purchaseCost: 2500, purchaseCostCurrency: 'USD', installationFactor: 1.5, maintenanceRate: 0.05, expectedLife: 20, warrantyPeriod: 2, sparePartsCost: 0.02 },
  
  references: ['HI 9.6.4 - Rotodynamic Pumps', 'API 610 - Centrifugal Pumps']
};

export default CentrifugalPump;

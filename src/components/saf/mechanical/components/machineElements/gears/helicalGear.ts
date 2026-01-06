/**
 * Helical Gear Component
 * Complete gear model with bending and contact stress analysis
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

// ═══════════════════════════════════════════════════════════════
// SHAFT PORTS
// ═══════════════════════════════════════════════════════════════

const PORT_INPUT_SHAFT: PortVariable[] = [
  { symbol: 'ω₁', name: 'Input Speed', unit: 'rad/s', direction: 'in', description: 'Angular velocity of input shaft' },
  { symbol: 'τ₁', name: 'Input Torque', unit: 'N·m', direction: 'in', description: 'Torque on input shaft' },
  { symbol: 'P₁', name: 'Input Power', unit: 'W', direction: 'in', description: 'Mechanical power input' }
];

const PORT_OUTPUT_SHAFT: PortVariable[] = [
  { symbol: 'ω₂', name: 'Output Speed', unit: 'rad/s', direction: 'out', description: 'Angular velocity of output shaft' },
  { symbol: 'τ₂', name: 'Output Torque', unit: 'N·m', direction: 'out', description: 'Torque on output shaft' },
  { symbol: 'P₂', name: 'Output Power', unit: 'W', direction: 'out', description: 'Mechanical power output' }
];

export const HelicalGear: MechanicalComponent = {
  id: createComponentId('gear'),
  name: 'Helical Gear',
  category: 'machineElement' as MechanicalDomain,
  subcategory: 'powerTransmission' as SubDomain,
  manufacturer: 'Generic',
  model: 'HG-Series',
  
  description: 'Helical gear for smooth, high-speed power transmission. Features angled teeth for quieter operation and higher load capacity compared to spur gears.',
  tags: ['gear', 'helical', 'transmission', 'power', 'machineElement'],
  
  geometry: {
    type: 'parametrized',
    shape: 'cylinder',
    dimensions: {
      pitchDiameter: 0.1,              // m
      outsideDiameter: 0.108,           // m
      rootDiameter: 0.091,              // m
      faceWidth: 0.02,                  // m
      hubDiameter: 0.04,                // m
      hubLength: 0.015,                 // m
      boreDiameter: 0.02,               // m
      pressureAngle: 20,                // degrees
      helixAngle: 15,                   // degrees
      numberOfTeeth: 24,
      module: 0.005,                    // m
      addendum: 0.00125,                // m
      dedendum: 0.001875,               // m
      wholeDepth: 0.003125,             // m
      clearance: 0.000625               // m
    },
    mass: 1.2,                           // kg
    momentOfInertia: { xx: 0.01, yy: 0.01, zz: 0.02 }
  },
  
  ports: [
    {
      id: 'input_shaft',
      name: 'Input Shaft',
      type: 'input',
      domain: 'mechanical',
      variables: PORT_INPUT_SHAFT,
      state: 'disconnected',
      description: 'Power input from driving gear/motor'
    },
    {
      id: 'output_shaft',
      name: 'Output Shaft',
      type: 'output',
      domain: 'mechanical',
      variables: PORT_OUTPUT_SHAFT,
      state: 'disconnected',
      description: 'Power output to driven load'
    }
  ],
  
  parameters: [
    // ═══ GEOMETRY PARAMETERS ═══
    { name: 'Number of Teeth', symbol: 'z', value: 24, unit: '',
      designRange: { min: 12, max: 200 }, isDesignVariable: true,
      description: 'Total number of teeth on the gear' },
    { name: 'Module', symbol: 'm', value: 0.005, unit: 'm',
      standardSizes: [0.002, 0.003, 0.004, 0.005, 0.006, 0.008, 0.01, 0.012, 0.016, 0.02],
      description: 'Pitch circle diameter per tooth (m)' },
    { name: 'Pressure Angle', symbol: 'α', value: 20, unit: 'deg',
      standardSizes: [14.5, 20, 25],
      description: 'Angle between line of action and tangent to pitch circle' },
    { name: 'Helix Angle', symbol: 'β', value: 15, unit: 'deg',
      designRange: { min: 0, max: 45 },
      description: 'Angle of the helix measured from the axial direction' },
    { name: 'Face Width', symbol: 'b', value: 0.02, unit: 'm',
      designRange: { min: 0.005, max: 0.2 }, isDesignVariable: true,
      description: 'Width of the gear tooth face' },
    { name: 'Pitch Diameter', symbol: 'd', value: 0.12, unit: 'm',
      description: 'Diameter of the pitch circle',
      source: 'calculated' },
    { name: 'Outside Diameter', symbol: 'dₐ', value: 0.13, unit: 'm',
      description: 'Diameter to the tips of teeth',
      source: 'calculated' },
    
    // ═══ MATERIAL PARAMETERS ═══
    { name: 'Material', symbol: 'Mat', value: 4140, unit: '', description: 'Gear material selection' },
    { name: 'Surface Hardness', symbol: 'H', value: 55, unit: 'HRC',
      description: 'Case hardness after heat treatment' },
    { name: 'Core Hardness', symbol: 'H_core', value: 300, unit: 'HB',
      description: 'Core hardness before case hardening' },
    { name: 'Surface Finish', symbol: 'Ra', value: 0.8, unit: 'μm',
      standardSizes: [0.2, 0.4, 0.8, 1.6, 3.2],
      description: 'Surface roughness arithmetic average' },
    
    // ═══ LOAD PARAMETERS ═══
    { name: 'Design Torque', symbol: 'T', value: 100, unit: 'N·m',
      designRange: { min: 1, max: 10000 }, isDesignVariable: true,
      description: 'Maximum transmitted torque' },
    { name: 'Design Power', symbol: 'P', value: 5000, unit: 'W',
      description: 'Maximum transmitted power' },
    { name: 'Design Speed', symbol: 'n', value: 1000, unit: 'rpm',
      designRange: { min: 10, max: 10000 }, isDesignVariable: true,
      description: 'Operating speed' },
    { name: 'Overload Factor', symbol: 'Kₒ', value: 1.25, unit: '',
      standardSizes: [1.0, 1.25, 1.5, 2.0],
      description: 'Application overload factor' },
    { name: 'Dynamic Factor', symbol: 'Kᵥ', value: 1.0, unit: '',
      description: 'Velocity/dynamic factor' },
    { name: 'Load Distribution Factor', symbol: 'Kₘ', value: 1.3, unit: '',
      description: 'Factor for non-uniform load distribution' },
    
    // ═══ QUALITY & SAFETY PARAMETERS ═══
    { name: 'Quality Number', symbol: 'Qᵥ', value: 6, unit: '',
      standardSizes: [3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
      description: 'AGMA quality number for gear manufacturing' },
    { name: 'Safety Factor (Bending)', symbol: 'SF_b', value: 1.5, unit: '',
      designRange: { min: 1.0, max: 3.0 }, isDesignVariable: true,
      description: 'Safety factor against bending fatigue' },
    { name: 'Safety Factor (Contact)', symbol: 'SF_c', value: 1.5, unit: '',
      designRange: { min: 1.0, max: 3.0 }, isDesignVariable: true,
      description: 'Safety factor against contact fatigue' },
    
    // ═══ LIFE PARAMETERS ═══
    { name: 'Design Life', symbol: 'L₁₀', value: 10000, unit: 'hours',
      designRange: { min: 100, max: 100000 },
      description: 'Target design life in hours (L10 life)' },
    { name: 'Reliability', symbol: 'R', value: 0.99, unit: '',
      standardSizes: [0.9, 0.95, 0.99, 0.999],
      description: 'Target reliability for life calculations' }
  ],
  
  states: [
    { name: 'Tangential Force', symbol: 'F_t', value: 0, unit: 'N', source: 'calculated',
      description: 'Tangential load on the gear tooth' },
    { name: 'Radial Force', symbol: 'F_r', value: 0, unit: 'N', source: 'calculated',
      description: 'Radial component of the tooth load' },
    { name: 'Axial Force', symbol: 'F_a', value: 0, unit: 'N', source: 'calculated',
      description: 'Axial thrust from helical teeth' },
    { name: 'Total Force', symbol: 'F_total', value: 0, unit: 'N', source: 'calculated',
      description: 'Vector sum of all forces' },
    { name: 'Bending Stress', symbol: 'σ_b', value: 0, unit: 'MPa', source: 'calculated',
      description: 'Maximum bending stress at tooth root' },
    { name: 'Contact Stress', symbol: 'σ_c', value: 0, unit: 'MPa', source: 'calculated',
      description: 'Hertzian contact stress at pitch point' },
    { name: 'Bending Stress Number', symbol: 'S_b', value: 0, unit: 'MPa', source: 'calculated',
      description: 'Allowable bending stress adjusted for conditions' },
    { name: 'Contact Stress Number', symbol: 'S_c', value: 0, unit: 'MPa', source: 'calculated',
      description: 'Allowable contact stress adjusted for conditions' },
    { name: 'Pitch Line Velocity', symbol: 'V', value: 0, unit: 'm/s', source: 'calculated',
      description: 'Velocity at the pitch circle' },
    { name: 'Gear Ratio', symbol: 'i', value: 1.0, unit: '',
      description: 'Speed ratio (for mating gear)',
      source: 'specified' },
    { name: 'Lewis Form Factor', symbol: 'Y', value: 0.32, unit: '', source: 'calculated',
      description: 'Geometry factor for bending stress' },
    { name: 'Geometry Factor (Contact)', symbol: 'I', value: 0.12, unit: '', source: 'calculated',
      description: 'Geometry factor for contact stress' }
  ],
  
  equations: [
    // ═══ GEOMETRY EQUATIONS ═══
    {
      id: 'pitch_diameter',
      name: 'Pitch Diameter',
      domain: 'solidMechanics',
      expression: 'd = m * z',
      latex: 'd = m z',
      type: 'algebraic',
      description: 'Pitch circle diameter based on module and teeth'
    },
    {
      id: 'normal_module',
      name: 'Normal Module',
      domain: 'solidMechanics',
      expression: 'm_n = m * cos(β)',
      latex: 'm_n = m \\cos \\beta',
      type: 'algebraic',
      description: 'Module in the normal plane'
    },
    {
      id: 'transverse_pressure_angle',
      name: 'Transverse Pressure Angle',
      domain: 'solidMechanics',
      expression: 'tan(α_t) = tan(α_n) / cos(β)',
      latex: '\\tan \\alpha_t = \\frac{\\tan \\alpha_n}{\\cos \\beta}',
      type: 'algebraic',
      description: 'Pressure angle in transverse plane'
    },
    {
      id: 'addendum',
      name: 'Addendum',
      domain: 'solidMechanics',
      expression: 'a = m',
      latex: 'a = m',
      type: 'algebraic',
      description: 'Addendum (standard = module)'
    },
    {
      id: 'dedendum',
      name: 'Dedendum',
      domain: 'solidMechanics',
      expression: 'd_f = 1.25 * m',
      latex: 'd_f = 1.25 m',
      type: 'algebraic',
      description: 'Dedendum (standard = 1.25 × module)'
    },
    
    // ═══ FORCE EQUATIONS ═══
    {
      id: 'tangential_force',
      name: 'Tangential Force',
      domain: 'solidMechanics',
      expression: 'F_t = 2 * T / d',
      latex: 'F_t = \\frac{2T}{d}',
      type: 'algebraic',
      description: 'Tangential force on the gear tooth'
    },
    {
      id: 'radial_force',
      name: 'Radial Force',
      domain: 'solidMechanics',
      expression: 'F_r = F_t * tan(α_t)',
      latex: 'F_r = F_t \\tan \\alpha_t',
      type: 'algebraic',
      description: 'Radial component of tooth load'
    },
    {
      id: 'axial_force',
      name: 'Axial Force',
      domain: 'solidMechanics',
      expression: 'F_a = F_t * tan(β)',
      latex: 'F_a = F_t \\tan \\beta',
      type: 'algebraic',
      description: 'Axial thrust from helical teeth'
    },
    {
      id: 'total_force',
      name: 'Total Resultant Force',
      domain: 'solidMechanics',
      expression: 'F_total = sqrt(F_t² + F_r² + F_a²)',
      latex: 'F_{total} = \\sqrt{F_t^2 + F_r^2 + F_a^2}',
      type: 'algebraic',
      description: 'Vector sum of all force components'
    },
    
    // ═══ KINEMATIC EQUATIONS ═══
    {
      id: 'pitch_line_velocity',
      name: 'Pitch Line Velocity',
      domain: 'solidMechanics',
      expression: 'V = π * d * n / 60',
      latex: 'V = \\frac{\\pi d n}{60}',
      type: 'algebraic',
      description: 'Linear velocity at pitch circle (n in rpm)'
    },
    {
      id: 'speed_ratio',
      name: 'Speed Ratio',
      domain: 'solidMechanics',
      expression: 'i = n₁ / n₂ = z₂ / z₁ = τ₂ / τ₁',
      latex: 'i = \\frac{n_1}{n_2} = \\frac{z_2}{z_1} = \\frac{\\tau_2}{\\tau_1}',
      type: 'algebraic',
      description: 'Gear ratio relationships'
    },
    {
      id: 'power_torque_speed',
      name: 'Power-Torque Relationship',
      domain: 'solidMechanics',
      expression: 'P = 2π * n * T / 60 = τ * ω',
      latex: 'P = \\frac{2\\pi n T}{60} = \\tau \\omega',
      type: 'algebraic',
      description: 'Relationship between power, torque, and speed'
    },
    
    // ═══ BENDING STRESS (AGMA) ═══
    {
      id: 'agma_bending_stress',
      name: 'AGMA Bending Stress',
      domain: 'solidMechanics',
      expression: 'σ_b = (F_t * K_o * K_m * K_v * K_s) / (b * m * Y)',
      latex: '\\sigma_b = \\frac{F_t K_o K_m K_v K_s}{b m Y}',
      type: 'algebraic',
      description: 'Bending stress using AGMA method'
    },
    {
      id: 'lewis_form_factor',
      name: 'Lewis Form Factor',
      domain: 'solidMechanics',
      expression: 'Y = 0.484 - 0.004 * z_eff (for α=20°, β=0°)',
      latex: 'Y \\approx 0.484 - 0.004 z_{eff}',
      type: 'algebraic',
      description: 'Geometry factor for Lewis bending equation'
    },
    {
      id: 'geometry_factor_y',
      name: 'Geometry Factor Y',
      domain: 'solidMechanics',
      expression: 'Y = Y_β * Y_I * K_o * K_m * K_B / K_v',
      latex: 'Y = Y_\\beta Y_I K_o K_m K_B / K_v',
      type: 'algebraic',
      description: 'Complete geometry factor for bending stress'
    },
    
    // ═══ CONTACT STRESS (AGMA) ═══
    {
      id: 'agma_contact_stress',
      name: 'AGMA Contact Stress',
      domain: 'solidMechanics',
      expression: 'σ_c = C_p * sqrt((F_t * K_o * K_m * K_v * K_s * C_s) / (b * d * I))',
      latex: '\\sigma_c = C_p \\sqrt{\\frac{F_t K_o K_m K_v K_s C_s}{b d I}}',
      type: 'algebraic',
      description: 'Hertzian contact stress using AGMA method'
    },
    {
      id: 'elastic_coefficient',
      name: 'Elastic Coefficient Cp',
      domain: 'solidMechanics',
      expression: 'C_p = sqrt(1 / (π * ((1-ν₁²)/E₁ + (1-ν₂²)/E₂)))',
      latex: 'C_p = \\sqrt{\\frac{1}{\\pi \\left[\\frac{1-\\nu_1^2}{E_1} + \\frac{1-\\nu_2^2}{E_2}\\right]}}',
      type: 'algebraic',
      description: 'Elastic coefficient for contact stress'
    },
    {
      id: 'geometry_factor_i',
      name: 'Geometry Factor I',
      domain: 'solidMechanics',
      expression: 'I = cos(α_t) * cos(β) / (2 * (1/√(1) + 1/√(1)))',
      latex: 'I = \\frac{\\cos \\alpha_t \\cos \\beta}{2 \\left(\\frac{1}{\\sqrt{d_1}} + \\frac{1}{\\sqrt{d_2}}\\right)}',
      type: 'algebraic',
      description: 'Geometry factor for contact stress'
    },
    
    // ═══ ALLOWABLE STRESS ═══
    {
      id: 'allowable_bending',
      name: 'Allowable Bending Stress',
      domain: 'solidMechanics',
      expression: 'S_b = S_f * K_R * K_O / (K_T * K_M)',
      latex: 'S_b = \\frac{S_f K_R K_O}{K_T K_M}',
      type: 'algebraic',
      description: 'Allowable bending stress with application factors'
    },
    {
      id: 'allowable_contact',
      name: 'Allowable Contact Stress',
      domain: 'solidMechanics',
      expression: 'S_c = S_c\' * C_H * K_R / K_O',
      latex: 'S_c = \\frac{S_c\' C_H K_R}{K_O}',
      type: 'algebraic',
      description: 'Allowable contact stress with application factors'
    },
    
    // ═══ LIFE CALCULATIONS ═══
    {
      id: 'bending_life',
      name: 'Bending Fatigue Life',
      domain: 'solidMechanics',
      expression: 'L₁₀ = (S_f / σ_b)^9 * 10^6 cycles',
      latex: 'L_{10} = \\left(\\frac{S_f}{\\sigma_b}\\right)^9 \\times 10^6',
      type: 'algebraic',
      description: 'L10 life in millions of cycles for bending'
    },
    {
      id: 'contact_life',
      name: 'Contact Fatigue Life',
      domain: 'solidMechanics',
      expression: 'L₁₀ = (S_c\' / σ_c)^3 * 10^6 cycles',
      latex: 'L_{10} = \\left(\\frac{S_c\'}{\\sigma_c}\\right)^3 \\times 10^6',
      type: 'algebraic',
      description: 'L10 life in millions of cycles for contact'
    },
    
    // ═══ DYNAMIC FACTOR ═══
    {
      id: 'dynamic_factor',
      name: 'AGMA Dynamic Factor',
      domain: 'solidMechanics',
      expression: 'K_v = ((A + sqrt(V)) / A)^B',
      latex: 'K_v = \\left(\\frac{A + \\sqrt{V}}{A}\\right)^B',
      type: 'algebraic',
      description: 'Velocity factor for gear accuracy'
    }
  ],
  
  constraints: [
    {
      id: 'bending_strength',
      name: 'Bending Strength Limit',
      expression: 'σ_b * SF_b < S_b',
      type: 'inequality',
      severity: 'error',
      description: 'Bending stress must not exceed allowable stress with safety factor',
      relatedParameters: ['σ_b', 'SF_b', 'S_b']
    },
    {
      id: 'contact_strength',
      name: 'Contact Strength Limit',
      expression: 'σ_c * SF_c < S_c',
      type: 'inequality',
      severity: 'error',
      description: 'Contact stress must not exceed allowable stress with safety factor',
      relatedParameters: ['σ_c', 'SF_c', 'S_c']
    },
    {
      id: 'min_teeth',
      name: 'Minimum Tooth Count',
      expression: 'z >= 12',
      type: 'inequality',
      severity: 'warning',
      description: 'Minimum 12 teeth to avoid undercutting with standard pressure angle',
      relatedParameters: ['z']
    },
    {
      id: 'face_width_ratio',
      name: 'Face Width Ratio',
      expression: 'b >= 9 * m',
      type: 'inequality',
      severity: 'warning',
      description: 'Minimum face width for proper load distribution',
      relatedParameters: ['b', 'm']
    },
    {
      id: 'pitch_velocity_limit',
      name: 'Maximum Pitch Line Velocity',
      expression: 'V < 25',
      type: 'inequality',
      severity: 'warning',
      description: 'Maximum recommended pitch line velocity (m/s)',
      relatedParameters: ['V']
    },
    {
      id: 'helix_angle_range',
      name: 'Helix Angle Range',
      expression: 'β <= 45',
      type: 'inequality',
      severity: 'info',
      description: 'Helix angle typically limited to 45° for manufacturability',
      relatedParameters: ['β']
    },
    {
      id: 'overlap_ratio',
      name: 'Minimum Transverse Contact Ratio',
      expression: 'ε_α >= 1.2',
      type: 'inequality',
      severity: 'warning',
      description: 'Minimum contact ratio for smooth operation',
      relatedParameters: []
    }
  ],
  
  failureModes: [
    {
      id: 'bending_fatigue',
      name: 'Bending Fatigue (Tooth Root)',
      description: 'Cyclic bending stresses cause crack initiation and propagation at tooth root, leading to tooth break',
      criterion: 'σ_b > S_f / SF_b',
      calculation: 'Calculate σ_b using AGMA equation, compare to S_f',
      factors: ['load_magnitude', 'stress_concentration', 'surface_finish', 'residual_stress', 'corrosion'],
      mitigation: 'Increase face width, use larger module, shot peening, improve surface finish, use through-hardened steel',
      severity: 'critical',
      occurrenceRating: 5,
      detectionRating: 4,
      rpn: 100
    },
    {
      id: 'pitting',
      name: 'Pitting (Contact Fatigue)',
      description: 'Cyclic Hertzian contact stresses cause material spalling on tooth surface, starting at pitch line',
      criterion: 'σ_c > S_c\' / SF_c',
      calculation: 'Calculate σ_c using AGMA equation, compare to S_c\'',
      factors: ['contact_pressure', 'lubrication', 'hardness', 'surface_finish', 'contaminants'],
      mitigation: 'Increase hardness, improve lubrication, use proper oil filtration, case-hardened steel',
      severity: 'critical',
      occurrenceRating: 6,
      detectionRating: 4,
      rpn: 144
    },
    {
      id: 'scoring',
      name: 'Scoring (Adhesive Wear)',
      description: 'High sliding velocities and pressures cause adhesive wear and material transfer between teeth',
      criterion: 'p_v > p_max',
      calculation: 'Contact pressure times sliding velocity exceeds limit',
      factors: ['sliding_velocity', 'contact_pressure', 'lubrication', 'temperature', 'material_compatibility'],
      mitigation: 'Use EP lubricants, reduce sliding velocity, improve surface finish, apply anti-scuff coatings',
      severity: 'major',
      occurrenceRating: 4,
      detectionRating: 5,
      rpn: 100
    },
    {
      id: 'wear',
      name: 'Abrasive/Adhesive Wear',
      description: 'Progressive material loss due to particle abrasion or metal-to-metal contact',
      criterion: 'wear_rate > acceptable',
      calculation: 'Measure dimensional changes over time',
      factors: ['contaminants', 'lubrication', 'hardness', 'operating_conditions'],
      mitigation: 'Filtration, proper lubrication, hardened surfaces, sealed gearboxes',
      severity: 'minor',
      occurrenceRating: 5,
      detectionRating: 3,
      rpn: 75
    },
    {
      id: 'tooth_breakage',
      name: 'Tooth Breakage (Impact)',
      description: 'Sudden fracture of one or more teeth due to shock loading or fatigue crack propagation',
      criterion: 'overload > strength',
      calculation: 'Peak overload torque exceeds material strength',
      factors: ['shock_loads', 'foreign_objects', 'crack_propagation', 'stress_concentration'],
      mitigation: 'Impact-resistant design, crack detection, proper lubrication, smooth startups',
      severity: 'critical',
      occurrenceRating: 2,
      detectionRating: 6,
      rpn: 72
    }
  ],
  
  material: {
    name: 'AISI 4140 Steel',
    type: 'metal',
    designation: 'AISI 4140',
    density: 7850,
    youngsModulus: 205,
    shearModulus: 80,
    poissonsRatio: 0.29,
    yieldStrength: 415,       // MPa (annealed)
    ultimateStrength: 655,    // MPa
    fatigueLimit: 275,        // MPa (estimated)
    thermalConductivity: 42,
    specificHeat: 460
  } as MaterialSpecification,
  
  cost: {
    purchaseCost: 150,
    purchaseCostCurrency: 'USD',
    installationFactor: 1.2,
    maintenanceRate: 0.01,
    expectedLife: 15,
    warrantyPeriod: 1,
    sparePartsCost: 0.01
  },
  
  references: [
    'AGMA 2001-B96 - Fundamental Rating Factors and Calculation Methods for Involute Spur and Helical Gears',
    'AGMA 2003-B97 - Rating the Pitting Resistance and Bending Strength of Generated Spur and Helical Gears',
    'Shigley\'s Mechanical Engineering Design',
    'Fundamentals of Gear Design by Dudley'
  ]
};

export default HelicalGear;

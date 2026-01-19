/**
 * Mechanical SAF Lab v2.0 - Fluid System Components
 * Pumps, Pipes, Valves, and Hydraulic Components
 * 
 * MVP: Core fluid system components with physics-based calculations.
 */

import {
  ComponentDefinition,
  PortDefinition,
  ParameterDefinition,
  EquationDefinition,
  ConstraintDefinition,
  PerformanceMap,
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
  density: 998,          // kg/m³ at 20°C
  viscosity: 1.002e-3,   // Pa·s
  specificHeat: 4182,    // J/(kg·K)
  thermalConductivity: 0.598,  // W/(m·K)
  gravity: 9.81,         // m/s²
  atmosphericPressure: 101325, // Pa
};

// ============================================================================
// CENTRIFUGAL PUMP
// ============================================================================

export const CENTRIFUGAL_PUMP_DEFINITION: ComponentDefinition = {
  id: 'fluid.pump.centrifugal',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'turbomachinery',
  name: 'Centrifugal Pump',
  description: 'Radial flow pump for moving fluids in industrial applications',
  tags: ['pump', 'fluid', 'turbomachinery', 'centrifugal'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
        { symbol: 'T_in', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
        { symbol: 'T_out', name: 'Outlet Temperature', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
    {
      id: 'shaft',
      name: 'Shaft',
      type: 'input',
      domain: 'mechanical',
      variables: [
        { symbol: 'τ', name: 'Torque', unit: 'N·m', direction: 'in' },
        { symbol: 'ω', name: 'Angular Velocity', unit: 'rad/s', direction: 'in' },
      ],
      state: 'disconnected',
      required: false,
      position: { x: 0.5, y: 0, side: 'top' },
    },
  ],
  
  parameters: [
    {
      id: 'Q_design',
      name: 'Design Flow Rate',
      symbol: 'Q_design',
      unit: 'm³/h',
      dataType: 'number',
      value: 100,
      source: 'design',
      description: 'Design point volumetric flow rate',
      designRange: { min: 1, max: 10000 },
      display: { precision: 1 },
    },
    {
      id: 'H_design',
      name: 'Design Head',
      symbol: 'H_design',
      unit: 'm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Design point head (pressure rise)',
      designRange: { min: 1, max: 500 },
      display: { precision: 1 },
    },
    {
      id: 'eta_BEP',
      name: 'Best Efficiency Point',
      symbol: 'η_BEP',
      unit: '-',
      dataType: 'number',
      value: 0.75,
      source: 'design',
      description: 'Maximum efficiency at design point',
      designRange: { min: 0.5, max: 0.95 },
      display: { precision: 2, format: 'percent' },
    },
    {
      id: 'N',
      name: 'Rotational Speed',
      symbol: 'N',
      unit: 'rpm',
      dataType: 'number',
      value: 1450,
      source: 'design',
      description: 'Rotational speed',
      designRange: { min: 300, max: 3600 },
      display: { precision: 0 },
    },
    {
      id: 'NPSHr',
      name: 'Required NPSH',
      symbol: 'NPSHr',
      unit: 'm',
      dataType: 'number',
      value: 3.0,
      source: 'design',
      description: 'Net Positive Suction Head required',
      designRange: { min: 0.5, max: 20 },
      display: { precision: 2 },
    },
    {
      id: 'D2',
      name: 'Impeller Diameter',
      symbol: 'D₂',
      unit: 'mm',
      dataType: 'number',
      value: 200,
      source: 'calculated',
      description: 'Outer impeller diameter',
      display: { precision: 0 },
    },
    {
      id: 'power',
      name: 'Shaft Power',
      symbol: 'P',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Required shaft power',
      display: { precision: 2 },
    },
    {
      id: 'efficiency',
      name: 'Efficiency',
      symbol: 'η',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Operating efficiency',
      display: { precision: 1, format: 'percent' },
    },
  ],
  
  equations: [
    {
      id: 'power_calc',
      name: 'Power Calculation',
      expression: 'P = (ρ * g * Q * H) / η',
      latex: 'P = \\frac{\\rho g Q H}{\\eta}',
      description: 'Calculate shaft power from flow, head, and efficiency',
      assumptions: ['Incompressible flow', 'Steady state'],
      source: 'Pump Handbook, Equation 2.1',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'affinity_flow',
      name: 'Flow Affinity Law',
      expression: 'Q2 = Q1 * (N2 / N1)',
      description: 'Flow varies linearly with speed',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'affinity_head',
      name: 'Head Affinity Law',
      expression: 'H2 = H1 * (N2 / N1)^2',
      description: 'Head varies with square of speed ratio',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'affinity_power',
      name: 'Power Affinity Law',
      expression: 'P2 = P1 * (N2 / N1)^3',
      description: 'Power varies with cube of speed ratio',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'npsh_constraint',
      name: 'NPSH Available > Required',
      expression: 'NPSHa > NPSHr + 0.5',
      type: 'inequality',
      severity: 'error',
      description: 'Must have margin between available and required NPSH',
      relatedParameters: ['NPSHr'],
    },
    {
      id: 'efficiency_min',
      name: 'Minimum Efficiency',
      expression: 'eta_BEP > 0.5',
      type: 'designRule',
      severity: 'warning',
      description: 'Efficiency should be above 50%',
    },
  ],
};

@registerComponent('fluid.pump.centrifugal')
export class CentrifugalPump extends ComponentBase {
  constructor(
    definition: ComponentDefinition = CENTRIFUGAL_PUMP_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  /**
   * Compute pump performance
   * Calculates head, power, and efficiency based on operating point
   */
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Q_design = this.getParameterValueOrDefault('Q_design', 100) as number;
    const H_design = this.getParameterValueOrDefault('H_design', 50) as number;
    const eta_BEP = this.getParameterValueOrDefault('eta_BEP', 0.75) as number;
    const N = this.getParameterValueOrDefault('N', 1450) as number;
    
    // Get operating flow rate (from simulation or default to design)
    const Q_operating = this.getParameterValue('Q_operating') as number ?? Q_design;
    
    // Calculate flow ratio (non-dimensional)
    const flowRatio = Q_operating / Q_design;
    
    // Simplified pump curve: Head vs Flow
    // H = H_design * (1 - 0.5 * (Q/Q_design - 1)^2)
    // This creates a parabolic curve peaking at design point
    const headRatio = 1 - 0.5 * Math.pow(flowRatio - 1, 2);
    const H_operating = H_design * Math.max(0, headRatio);
    
    // Efficiency curve: peaks at design point
    // η = η_BEP * (1 - 0.5 * (Q/Q_design - 1)^2)
    const efficiencyRatio = 1 - 0.5 * Math.pow(flowRatio - 1, 2);
    const eta_operating = eta_BEP * Math.max(0.1, efficiencyRatio);
    
    // Calculate power
    const rho = FLUID_SYSTEM_CONSTANTS.density;
    const g = FLUID_SYSTEM_CONSTANTS.gravity;
    const Q_m3s = Q_operating / 3600; // Convert m³/h to m³/s
    
    const power_W = (rho * g * Q_m3s * H_operating) / eta_operating;
    const power_kW = power_W / 1000;
    
    // Calculate impeller diameter (simplified)
    // D₂ ≈ 84.6 * sqrt(Q/N)^0.5 * H^0.25 (rough approximation)
    const D2_mm = 84.6 * Math.sqrt(Q_design / N) * Math.pow(H_design, 0.25);
    
    // Update computed values
    this.setComputedValue('head', H_operating);
    this.setComputedValue('efficiency', eta_operating * 100);
    this.setComputedValue('power', power_kW);
    this.setComputedValue('D2', D2_mm);
    this.setComputedValue('flowRatio', flowRatio);
    
    // Update parameter values
    this.parameterValues.set('power', power_kW);
    this.parameterValues.set('efficiency', eta_operating * 100);
    this.parameterValues.set('D2', D2_mm);
  }
  
  /**
   * Get pump curve data for charting
   * Returns H-Q curve points
   */
  public getPumpCurve(points: number = 20): { Q: number[]; H: number[]; eta: number[] } {
    const Q_design = this.getParameterValueOrDefault('Q_design', 100) as number;
    const H_design = this.getParameterValueOrDefault('H_design', 50) as number;
    const eta_BEP = this.getParameterValueOrDefault('eta_BEP', 0.75) as number;
    
    const Q: number[] = [];
    const H: number[] = [];
    const eta: number[] = [];
    
    // Generate curve from 0.3 to 1.4 of design flow
    const minFlow = 0.3 * Q_design;
    const maxFlow = 1.4 * Q_design;
    const step = (maxFlow - minFlow) / (points - 1);
    
    for (let i = 0; i < points; i++) {
      const flow = minFlow + step * i;
      const flowRatio = flow / Q_design;
      
      // Head curve
      const headRatio = 1 - 0.5 * Math.pow(flowRatio - 1, 2);
      const head = H_design * Math.max(0, headRatio);
      
      // Efficiency curve
      const effRatio = 1 - 0.5 * Math.pow(flowRatio - 1, 2);
      const efficiency = eta_BEP * Math.max(0.1, effRatio);
      
      Q.push(flow);
      H.push(head);
      eta.push(efficiency * 100);
    }
    
    return { Q, H, eta };
  }
}

// ============================================================================
// STRAIGHT PIPE
// ============================================================================

export const STRAIGHT_PIPE_DEFINITION: ComponentDefinition = {
  id: 'fluid.pipe.straight',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Straight Pipe',
  description: 'Circular straight pipe for fluid transport',
  tags: ['pipe', 'fluid', 'piping', 'conduit'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
        { symbol: 'T_in', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
        { symbol: 'T_out', name: 'Outlet Temperature', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Nominal Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Pipe inner diameter',
      standardSizes: [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200, 250, 300],
      display: { precision: 0 },
    },
    {
      id: 'L',
      name: 'Pipe Length',
      symbol: 'L',
      unit: 'm',
      dataType: 'number',
      value: 10,
      source: 'design',
      description: 'Total pipe length',
      designRange: { min: 0.1, max: 1000 },
      display: { precision: 1 },
    },
    {
      id: 'epsilon',
      name: 'Roughness',
      symbol: 'ε',
      unit: 'mm',
      dataType: 'number',
      value: 0.045,
      source: 'design',
      description: 'Pipe surface roughness (commercial steel)',
      display: { precision: 3 },
    },
    {
      id: 'f',
      name: 'Friction Factor',
      symbol: 'f',
      unit: '-',
      dataType: 'number',
      value: 0.02,
      source: 'calculated',
      description: 'Darcy friction factor',
      display: { precision: 4 },
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across pipe',
      display: { precision: 2 },
    },
    {
      id: 'velocity',
      name: 'Flow Velocity',
      symbol: 'v',
      unit: 'm/s',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Average flow velocity',
      display: { precision: 2 },
    },
    {
      id: 'Re',
      name: 'Reynolds Number',
      symbol: 'Re',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Flow regime indicator',
      display: { precision: 0 },
    },
  ],
  
  equations: [
    {
      id: 'darcy_weisbach',
      name: 'Darcy-Weisbach',
      expression: 'dP = f * (L/D) * (ρ * v² / 2)',
      latex: '\\Delta P = f \\frac{L}{D} \\frac{\\rho v^2}{2}',
      description: 'Calculate pressure drop using Darcy-Weisbach equation',
      assumptions: ['Steady flow', 'Incompressible fluid'],
      source: 'White, Fluid Mechanics, Equation 8.44',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'velocity_calc',
      name: 'Velocity',
      expression: 'v = Q / A = (4 * ṁ) / (ρ * π * D²)',
      description: 'Calculate average velocity from flow rate',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'reynolds',
      name: 'Reynolds Number',
      expression: 'Re = (ρ * v * D) / μ',
      latex: 'Re = \\frac{\\rho v D}{\\mu}',
      description: 'Flow regime characterization',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'colebrook',
      name: 'Colebrook-White',
      expression: '1/sqrt(f) = -2 * log10(ε/(3.7*D) + 2.51/(Re*sqrt(f)))',
      description: 'Implicit equation for friction factor',
      type: 'algebraic',
      solutionMethod: 'iterative',
    },
  ],
  
  constraints: [
    {
      id: 'velocity_max',
      name: 'Maximum Velocity',
      expression: 'velocity < 3.0',
      type: 'inequality',
      severity: 'warning',
      description: 'Velocity should be below 3 m/s to prevent erosion',
      relatedParameters: ['velocity'],
    },
    {
      id: 're_turbulent',
      name: 'Turbulent Flow Check',
      expression: 'Re > 4000',
      type: 'designRule',
      severity: 'info',
      description: 'Flow should be turbulent for accurate friction calculation',
      relatedParameters: ['Re'],
    },
  ],
};

@registerComponent('fluid.pipe.straight')
export class StraightPipe extends ComponentBase {
  constructor(
    definition: ComponentDefinition = STRAIGHT_PIPE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  /**
   * Compute pipe flow characteristics
   */
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const D_mm = this.getParameterValueOrDefault('D', 50) as number;
    const L = this.getParameterValueOrDefault('L', 10) as number;
    const epsilon_mm = this.getParameterValueOrDefault('epsilon', 0.045) as number;
    
    const D_m = D_mm / 1000; // Convert to meters
    const epsilon_m = epsilon_mm / 1000;
    
    // Get flow rate (from simulation or default)
    const m_dot = this.getParameterValue('m_dot') as number ?? 1.0; // kg/s
    
    // Fluid properties
    const rho = FLUID_SYSTEM_CONSTANTS.density;
    const mu = FLUID_SYSTEM_CONSTANTS.viscosity;
    
    // Calculate cross-sectional area
    const A = (Math.PI * Math.pow(D_m, 2)) / 4;
    
    // Calculate velocity
    const v = Math.abs(m_dot) / (rho * A);
    
    // Calculate Reynolds number
    const Re = (rho * v * D_m) / mu;
    
    // Calculate friction factor (Colebrook-White or Swamee-Jain approximation)
    const f = this.calculateFrictionFactor(Re, epsilon_m, D_m);
    
    // Calculate pressure drop (Darcy-Weisbach)
    const dP_Pa = f * (L / D_m) * (rho * Math.pow(v, 2) / 2);
    const dP_kPa = dP_Pa / 1000;
    
    // Update computed values
    this.setComputedValue('velocity', v);
    this.setComputedValue('Re', Re);
    this.setComputedValue('f', f);
    this.setComputedValue('dP', dP_kPa);
    
    // Update parameter values
    this.parameterValues.set('velocity', v);
    this.parameterValues.set('Re', Re);
    this.parameterValues.set('f', f);
    this.parameterValues.set('dP', dP_kPa);
  }
  
  /**
   * Calculate friction factor using Swamee-Jain approximation
   * (explicit form of Colebrook-White)
   */
  private calculateFrictionFactor(Re: number, epsilon: number, D: number): number {
    if (Re < 2300) {
      // Laminar flow
      return 64 / Math.max(Re, 1);
    }
    
    // Turbulent flow - Swamee-Jain approximation
    const epsilon_D = epsilon / D;
    
    // Handle transition regime
    if (Re < 4000) {
      // Blend between laminar and turbulent
      const f_laminar = 64 / Re;
      const f_turbulent = 0.25 / Math.pow(Math.log10(epsilon_D / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
      const blend = (Re - 2300) / 1700;
      return f_laminar * (1 - blend) + f_turbulent * blend;
    }
    
    // Fully turbulent
    return 0.25 / Math.pow(Math.log10(epsilon_D / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
  }
}

// ============================================================================
// CONTROL VALVE
// ============================================================================

export const CONTROL_VALVE_DEFINITION: ComponentDefinition = {
  id: 'fluid.valve.control',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Control Valve',
  description: 'Globe-style control valve for flow regulation',
  tags: ['valve', 'fluid', 'piping', 'control'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'Cv',
      name: 'Flow Coefficient',
      symbol: 'Cᵥ',
      unit: 'm³/h',
      dataType: 'number',
      value: 40,
      source: 'design',
      description: 'Valve flow coefficient at 100% open',
      designRange: { min: 0.1, max: 1000 },
      display: { precision: 1 },
    },
    {
      id: 'opening',
      name: 'Valve Opening',
      symbol: 'opening',
      unit: '%',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Current valve opening percentage',
      designRange: { min: 0, max: 100 },
      display: { precision: 0 },
    },
    {
      id: 'characteristic',
      name: 'Flow Characteristic',
      symbol: 'char',
      unit: '-',
      dataType: 'string',
      value: 'equal_percentage',
      source: 'design',
      description: 'Valve flow characteristic curve',
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across valve',
      display: { precision: 2 },
    },
    {
      id: 'flow',
      name: 'Flow Rate',
      symbol: 'Q',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current flow rate through valve',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'flow_coefficient',
      name: 'Flow Coefficient',
      expression: 'Q = Cv * sqrt(ΔP / SG)',
      description: 'Basic flow equation for valves',
      assumptions: ['Turbulent flow', 'Liquid service'],
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'equal_percentage',
      name: 'Equal Percentage Characteristic',
      expression: 'f = R^(L - 1)',
      description: 'Equal percentage flow characteristic',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'linear',
      name: 'Linear Characteristic',
      expression: 'f = L',
      description: 'Linear flow characteristic',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'Cv_min',
      name: 'Minimum Cv',
      expression: 'Cv > 0',
      type: 'designRule',
      severity: 'error',
      description: 'Flow coefficient must be positive',
    },
    {
      id: 'opening_range',
      name: 'Valid Opening',
      expression: 'opening >= 0 && opening <= 100',
      type: 'designRule',
      severity: 'error',
      description: 'Opening must be between 0 and 100%',
    },
  ],
};

@registerComponent('fluid.valve.control')
export class ControlValve extends ComponentBase {
  constructor(
    definition: ComponentDefinition = CONTROL_VALVE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  /**
   * Compute valve flow characteristics
   */
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Cv_full = this.getParameterValueOrDefault('Cv', 40) as number;
    const opening = this.getParameterValueOrDefault('opening', 50) as number;
    const characteristic = this.getParameterValueOrDefault('characteristic', 'equal_percentage') as string;
    
    // Get pressure drop (from simulation or assume a value)
    const dP = this.getParameterValue('dP') as number ?? 50; // kPa default
    
    // Calculate effective Cv based on opening and characteristic
    const L = opening / 100; // Normalized opening (0 to 1)
    const effectiveCv = this.calculateEffectiveCv(Cv_full, L, characteristic);
    
    // Calculate flow rate (in m³/h)
    // Q = Cv * sqrt(ΔP) for water (SG = 1)
    const flow_m3h = effectiveCv * Math.sqrt(Math.max(0, dP));
    
    // Convert to kg/s for consistency
    const flow_kg_s = flow_m3h * FLUID_SYSTEM_CONSTANTS.density / 3600;
    
    // Update computed values
    this.setComputedValue('flow', flow_m3h);
    this.setComputedValue('effectiveCv', effectiveCv);
    this.setComputedValue('L', L);
    
    // Update parameter values
    this.parameterValues.set('flow', flow_m3h);
  }
  
  /**
   * Calculate effective Cv based on valve characteristic
   */
  private calculateEffectiveCv(Cv_full: number, L: number, characteristic: string): number {
    // L is normalized opening (0 to 1)
    
    switch (characteristic) {
      case 'equal_percentage':
        // Equal percentage: flow changes by equal percentages for equal stem movements
        // R is rangeability, typically 20-50 for control valves
        const R = 50;
        // f(L) = R^(L-1)
        // At L=0, f=1/R; At L=1, f=1
        return Cv_full * Math.pow(R, L - 1) / Math.pow(R, -1);
      
      case 'linear':
        // Linear: flow proportional to stem position
        return Cv_full * L;
      
      case 'quick_open':
        // Quick opening: flow increases rapidly near fully open
        // Simplified model: f(L) = sqrt(L)
        return Cv_full * Math.sqrt(L);
      
      default:
        return Cv_full * L;
    }
  }
  
  /**
   * Get flow characteristic curve data
   */
  public getCharacteristicCurve(points: number = 20): { opening: number[]; flow: number[] } {
    const Cv_full = this.getParameterValueOrDefault('Cv', 40) as number;
    const characteristic = this.getParameterValueOrDefault('characteristic', 'equal_percentage') as string;
    const dP = 100; // Assume constant pressure drop for curve
    
    const opening: number[] = [];
    const flow: number[] = [];
    
    for (let i = 0; i < points; i++) {
      const L = i / (points - 1);
      const effectiveCv = this.calculateEffectiveCv(Cv_full, L, characteristic);
      const flow_m3h = effectiveCv * Math.sqrt(dP);
      
      opening.push(L * 100);
      flow.push(flow_m3h);
    }
    
    return { opening, flow };
  }
}

// ============================================================================
// BALL VALVE (On/Off)
// ============================================================================

export const BALL_VALVE_DEFINITION: ComponentDefinition = {
  id: 'fluid.valve.ball',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Ball Valve',
  description: 'Full port ball valve for isolation',
  tags: ['valve', 'fluid', 'piping', 'isolation', 'ball'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Nominal Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Valve port diameter',
      display: { precision: 0 },
    },
    {
      id: 'Cv_open',
      name: 'Cv (Fully Open)',
      symbol: 'Cᵥ,open',
      unit: 'm³/h',
      dataType: 'number',
      value: 120,
      source: 'design',
      description: 'Flow coefficient when fully open',
      display: { precision: 0 },
    },
    {
      id: 'state',
      name: 'Valve State',
      symbol: 'state',
      unit: '-',
      dataType: 'string',
      value: 'open',
      source: 'design',
      description: 'Current valve position',
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across valve',
      display: { precision: 2 },
    },
  ],
  
  equations: [
    {
      id: 'flow_calc',
      name: 'Flow Calculation',
      expression: 'Q = Cv * sqrt(ΔP / SG)',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'state_valid',
      name: 'Valid State',
      expression: 'state == "open" || state == "closed"',
      type: 'designRule',
      severity: 'error',
      description: 'State must be open or closed',
    },
  ],
};

@registerComponent('fluid.valve.ball')
export class BallValve extends ComponentBase {
  constructor(
    definition: ComponentDefinition = BALL_VALVE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Cv_open = this.getParameterValueOrDefault('Cv_open', 120) as number;
    const state = this.getParameterValueOrDefault('state', 'open') as string;
    const dP = this.getParameterValue('dP') as number ?? 20; // kPa
    
    // Calculate effective Cv based on state
    let effectiveCv = 0;
    if (state === 'open') {
      effectiveCv = Cv_open;
    } else if (state === 'closed') {
      effectiveCv = 0;
    }
    
    // Calculate flow
    const flow_m3h = effectiveCv * Math.sqrt(Math.max(0, dP));
    
    this.setComputedValue('flow', flow_m3h);
    this.setComputedValue('effectiveCv', effectiveCv);
  }
}

// ============================================================================
// HEAT EXCHANGER (Shell and Tube - Simplified)
// ============================================================================

export const SHELL_TUBE_HE_DEFINITION: ComponentDefinition = {
  id: 'heatTransfer.heatExchanger.shellTube',
  version: '1.0.0',
  domain: 'heatTransfer',
  subcategory: 'heatExchanger',
  name: 'Shell and Tube Heat Exchanger',
  description: 'Counter-flow shell and tube heat exchanger',
  tags: ['heat exchanger', 'heat transfer', 'shell tube', 'thermal'],
  
  ports: [
    {
      id: 'hot_in',
      name: 'Hot Inlet',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_h', name: 'Hot Mass Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'T_h,in', name: 'Hot Inlet Temp', unit: 'K', direction: 'in' },
        { symbol: 'P_h,in', name: 'Hot Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.25, side: 'left' },
    },
    {
      id: 'hot_out',
      name: 'Hot Outlet',
      type: 'output',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_h', name: 'Hot Mass Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'T_h,out', name: 'Hot Outlet Temp', unit: 'K', direction: 'out' },
        { symbol: 'P_h,out', name: 'Hot Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.25, side: 'right' },
    },
    {
      id: 'cold_in',
      name: 'Cold Inlet',
      type: 'input',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_c', name: 'Cold Mass Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'T_c,in', name: 'Cold Inlet Temp', unit: 'K', direction: 'in' },
        { symbol: 'P_c,in', name: 'Cold Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.75, side: 'left' },
    },
    {
      id: 'cold_out',
      name: 'Cold Outlet',
      type: 'output',
      domain: 'thermal',
      variables: [
        { symbol: 'ṁ_c', name: 'Cold Mass Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'T_c,out', name: 'Cold Outlet Temp', unit: 'K', direction: 'out' },
        { symbol: 'P_c,out', name: 'Cold Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.75, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'A',
      name: 'Heat Transfer Area',
      symbol: 'A',
      unit: 'm²',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Total heat transfer surface area',
      designRange: { min: 1, max: 10000 },
      display: { precision: 1 },
    },
    {
      id: 'U',
      name: 'Overall Heat Transfer Coefficient',
      symbol: 'U',
      unit: 'W/(m²·K)',
      dataType: 'number',
      value: 500,
      source: 'design',
      description: 'Overall heat transfer coefficient',
      designRange: { min: 50, max: 2000 },
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
      description: 'Actual heat transfer rate',
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
      description: 'Heat exchanger effectiveness',
      display: { precision: 1 },
    },
    {
      id: 'LMTD',
      name: 'Log Mean Temperature Difference',
      symbol: 'LMTD',
      unit: 'K',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Log mean temperature difference',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'heat_rate',
      name: 'Heat Transfer Rate',
      expression: 'Q = U * A * LMTD',
      latex: 'Q = U A \\Delta T_{lm}',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'lmtd',
      name: 'Log Mean Temperature Difference',
      expression: 'LMTD = (ΔT1 - ΔT2) / ln(ΔT1 / ΔT2)',
      latex: '\\Delta T_{lm} = \\frac{\\Delta T_1 - \\Delta T_2}{\\ln(\\Delta T_1 / \\Delta T_2)}',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'effectiveness',
      name: 'Effectiveness',
      expression: 'ε = Q / Q_max',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'U_positive',
      name: 'Positive U',
      expression: 'U > 0',
      type: 'designRule',
      severity: 'error',
      description: 'Heat transfer coefficient must be positive',
    },
    {
      id: 'A_positive',
      name: 'Positive Area',
      expression: 'A > 0',
      type: 'designRule',
      severity: 'error',
      description: 'Heat transfer area must be positive',
    },
  ],

};

// ============================================================================
// STEAM TURBINE (NEW)
// ============================================================================

export const STEAM_TURBINE_DEFINITION: ComponentDefinition = {
  id: 'fluid.turbine.steam',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'turbomachinery',
  name: 'Steam Turbine',
  description: 'Impulse/reaction steam turbine for power generation. Converts thermal energy in steam to mechanical work.',
  tags: ['turbine', 'steam', 'power generation', 'expander', 'energy conversion'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Steam Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P₁', name: 'Inlet Pressure', unit: 'MPa', direction: 'in' },
        { symbol: 'T₁', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
        { symbol: 'h₁', name: 'Inlet Enthalpy', unit: 'kJ/kg', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.4, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Exhaust',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P₂', name: 'Outlet Pressure', unit: 'MPa', direction: 'out' },
        { symbol: 'T₂', name: 'Outlet Temperature', unit: 'K', direction: 'out' },
        { symbol: 'h₂', name: 'Outlet Enthalpy', unit: 'kJ/kg', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.4, side: 'right' },
    },
    {
      id: 'shaft',
      name: 'Shaft Output',
      type: 'output',
      domain: 'mechanical',
      variables: [
        { symbol: 'Ẇ', name: 'Power', unit: 'kW', direction: 'out' },
        { symbol: 'N', name: 'Rotational Speed', unit: 'rpm', direction: 'out' },
        { symbol: 'τ', name: 'Torque', unit: 'N·m', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 1, side: 'bottom' },
    },
  ],
  
  parameters: [
    {
      id: 'W_turb',
      name: 'Turbine Power',
      symbol: 'Ẇ',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Actual power output from turbine',
      display: { precision: 1 },
    },
    {
      id: 'W_isentropic',
      name: 'Isentropic Power',
      symbol: 'Ẇs',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Power output if expansion were isentropic',
      display: { precision: 1 },
    },
    {
      id: 'eta_isentropic',
      name: 'Isentropic Efficiency',
      symbol: 'η_is',
      unit: '%',
      dataType: 'number',
      value: 85,
      source: 'design',
      description: 'Ratio of actual work to isentropic work',
      designRange: { min: 70, max: 95 },
      display: { precision: 1 },
    },
    {
      id: 'eta_mechanical',
      name: 'Mechanical Efficiency',
      symbol: 'η_m',
      unit: '%',
      dataType: 'number',
      value: 98,
      source: 'design',
      description: 'Accounts for bearing losses and friction',
      designRange: { min: 90, max: 99 },
      display: { precision: 1 },
    },
    {
      id: 'N',
      name: 'Rotational Speed',
      symbol: 'N',
      unit: 'rpm',
      dataType: 'number',
      value: 3000,
      source: 'design',
      description: 'Turbine rotational speed',
      designRange: { min: 500, max: 36000 },
      display: { precision: 0 },
    },
    {
      id: 'inlet_pressure',
      name: 'Inlet Pressure',
      symbol: 'P₁',
      unit: 'MPa',
      dataType: 'number',
      value: 10,
      source: 'design',
      description: 'Steam pressure at turbine inlet',
      designRange: { min: 0.1, max: 20 },
      display: { precision: 2 },
    },
    {
      id: 'inlet_temperature',
      name: 'Inlet Temperature',
      symbol: 'T₁',
      unit: 'K',
      dataType: 'number',
      value: 773,
      source: 'design',
      description: 'Steam temperature at turbine inlet (500°C = 773K)',
      designRange: { min: 373, max: 873 },
      display: { precision: 0 },
    },
    {
      id: 'outlet_pressure',
      name: 'Outlet Pressure',
      symbol: 'P₂',
      unit: 'MPa',
      dataType: 'number',
      value: 0.01,
      source: 'design',
      description: 'Exhaust pressure (typically near vacuum for max efficiency)',
      designRange: { min: 0.005, max: 1 },
      display: { precision: 3 },
    },
    {
      id: 'm_dot',
      name: 'Mass Flow Rate',
      symbol: 'ṁ',
      unit: 'kg/s',
      dataType: 'number',
      value: 10,
      source: 'design',
      description: 'Steam mass flow rate through turbine',
      designRange: { min: 0.1, max: 100 },
      display: { precision: 2 },
    },
    {
      id: 'pressure_ratio',
      name: 'Pressure Ratio',
      symbol: 'PR',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Ratio of outlet to inlet pressure',
      display: { precision: 3 },
    },
    {
      id: 'enthalpy_drop',
      name: 'Enthalpy Drop',
      symbol: 'Δh',
      unit: 'kJ/kg',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Actual enthalpy drop across turbine',
      display: { precision: 1 },
    },
    {
      id: 'enthalpy_drop_isentropic',
      name: 'Isentropic Enthalpy Drop',
      symbol: 'Δh_s',
      unit: 'kJ/kg',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Isentropic enthalpy drop',
      display: { precision: 1 },
    },
    {
      id: 'specific_work',
      name: 'Specific Work',
      symbol: 'w',
      unit: 'kJ/kg',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Work output per unit mass of steam',
      display: { precision: 1 },
    },
    {
      id: 'heat_rate',
      name: 'Heat Rate',
      symbol: 'HR',
      unit: 'kJ/kWh',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Heat input per unit work output',
      display: { precision: 0 },
    },
    {
      id: 'exhaust_quality',
      name: 'Exhaust Quality',
      symbol: 'x₂',
      unit: '%',
      dataType: 'number',
      value: 100,
      source: 'calculated',
      description: 'Steam quality at exhaust (100% = saturated steam)',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'pressure_ratio_calc',
      name: 'Pressure Ratio',
      expression: 'PR = P_outlet / P_inlet',
      description: 'Calculate pressure ratio from inlet and outlet pressures',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'work_calc',
      name: 'Turbine Work',
      expression: 'W = ṁ * (h1 - h2)',
      latex: '\\dot{W} = \\dot{m} (h_1 - h_2)',
      description: 'Actual work output is mass flow times actual enthalpy drop',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'isentropic_work_calc',
      name: 'Isentropic Work',
      expression: 'W_s = ṁ * (h1 - h2s)',
      description: 'Isentropic work if expansion occurred without losses',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'efficiency_calc',
      name: 'Isentropic Efficiency',
      expression: 'eta_is = (h1 - h2) / (h1 - h2s) * 100',
      latex: '\\eta_{is} = \\frac{h_1 - h_2}{h_1 - h_{2s}} \\times 100\\%',
      description: 'Ratio of actual work to isentropic work',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'specific_work_calc',
      name: 'Specific Work',
      expression: 'w = (h1 - h2)',
      latex: 'w = h_1 - h_2',
      description: 'Work output per unit mass',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'pressure_valid',
      name: 'Valid Pressure Ratio',
      expression: 'P_inlet > P_outlet',
      type: 'designRule',
      severity: 'error',
      description: 'Inlet pressure must be greater than outlet pressure for power generation',
    },
    {
      id: 'efficiency_valid',
      name: 'Efficiency Range',
      expression: 'eta_is >= 70 && eta_is <= 95',
      type: 'designRule',
      severity: 'warning',
      description: 'Isentropic efficiency should be between 70% and 95%',
    },
    {
      id: 'temperature_valid',
      name: 'Valid Temperature',
      expression: 'T_inlet >= 373 && T_inlet <= 873',
      type: 'designRule',
      severity: 'warning',
      description: 'Inlet temperature should be between 100°C and 600°C',
    },
  ],
};

@registerComponent('fluid.turbine.steam')
export class SteamTurbine extends ComponentBase {
  constructor(
    definition: ComponentDefinition = STEAM_TURBINE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name || 'Steam Turbine');
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const eta_is = this.getParameterValueOrDefault('eta_isentropic', 85) as number;
    const eta_m = this.getParameterValueOrDefault('eta_mechanical', 98) as number;
    const P1 = this.getParameterValueOrDefault('inlet_pressure', 10) as number;
    const T1 = this.getParameterValueOrDefault('inlet_temperature', 773) as number;
    const P2 = this.getParameterValueOrDefault('outlet_pressure', 0.01) as number;
    const m_dot = this.getParameterValueOrDefault('m_dot', 10) as number;
    
    // Steam properties lookup (simplified - use steam tables for accuracy)
    const h1 = this.getSteamEnthalpy(P1, T1);
    const s1 = this.getSteamEntropy(P1, T1);
    
    // Isentropic expansion to P2
    const h2s = this.getIsentropicEnthalpy(P2, s1);
    
    // Actual enthalpy drop
    const h2 = h1 - (eta_is / 100) * (h1 - h2s);
    
    // Outlet temperature (estimate)
    const T2 = this.getSteamTemperature(P2, h2);
    
    // Outlet quality
    const x2 = this.getSteamQuality(P2, h2);
    
    // Calculate works
    const w_actual = h1 - h2;
    const w_isentropic = h1 - h2s;
    
    // Power outputs
    const W_isentropic = m_dot * w_isentropic;
    const W_actual = m_dot * w_actual;
    const W_mechanical = W_actual * (eta_m / 100);
    
    // Torque (Nm) = Power (W) / angular velocity (rad/s)
    const N = this.getParameterValueOrDefault('N', 3000) as number;
    const omega = (2 * Math.PI * N) / 60;
    const torque = W_mechanical * 1000 / omega; // Convert kW to W
    
    // Heat rate (kJ/kWh) = Heat in / Work out
    // For steam turbine, heat in ≈ h1 - h_condensate (simplified)
    const h_condense = 191; // Enthalpy of saturated liquid at 0.01 MPa
    const heat_in = m_dot * (h1 - h_condense);
    const heat_rate = heat_in > 0 ? (heat_in / W_mechanical) * 3600 : 0;
    
    // Pressure ratio
    const PR = P2 / P1;
    
    // Update computed values
    this.setComputedValue('W_turb', W_mechanical);
    this.setComputedValue('W_isentropic', W_isentropic);
    this.setComputedValue('enthalpy_drop', w_actual);
    this.setComputedValue('enthalpy_drop_isentropic', w_isentropic);
    this.setComputedValue('pressure_ratio', PR);
    this.setComputedValue('specific_work', w_actual);
    this.setComputedValue('heat_rate', heat_rate);
    this.setComputedValue('exhaust_quality', x2 * 100);
    this.setComputedValue('T_out', T2);
    this.setComputedValue('torque', torque);
    this.setComputedValue('eta_actual', eta_is * eta_m / 100);
    
    // Update parameter values
    this.parameterValues.set('W_turb', W_mechanical);
    this.parameterValues.set('W_isentropic', W_isentropic);
    this.parameterValues.set('enthalpy_drop', w_actual);
    this.parameterValues.set('enthalpy_drop_isentropic', w_isentropic);
    this.parameterValues.set('pressure_ratio', PR);
    this.parameterValues.set('specific_work', w_actual);
    this.parameterValues.set('heat_rate', heat_rate);
    this.parameterValues.set('exhaust_quality', x2 * 100);
  }
  
  /**
   * Simplified steam enthalpy lookup
   * For accurate results, use IAPWS-IF97 library
   */
  private getSteamEnthalpy(P: number, T: number): number {
    // P in MPa, T in K
    // Superheated steam approximation
    const T_sat = this.getSaturationTemperature(P);
    
    if (T <= T_sat) {
      // Saturated or subcooled - use saturation properties
      return 419 + 2.1 * T; // Rough linearization
    }
    
    // Superheated - use polynomial approximation
    const h_sat_g = 2675 + 2.3 * (T_sat - 273); // Saturated vapor at Tsat
    const cp_sup = 2.08; // Specific heat of superheated steam (kJ/kg·K)
    return h_sat_g + cp_sup * (T - T_sat);
  }
  
  /**
   * Simplified steam entropy lookup
   */
  private getSteamEntropy(P: number, T: number): number {
    const T_sat = this.getSaturationTemperature(P);
    
    if (T <= T_sat) {
      // Saturated
      return 6.5 + 0.001 * (T - 273);
    }
    
    // Superheated
    const s_sat_g = 7.35 + 0.001 * (T_sat - 273);
    const cp_sup = 2.08;
    return s_sat_g + cp_sup * Math.log(T / T_sat);
  }
  
  /**
   * Get enthalpy at outlet for isentropic expansion
   */
  private getIsentropicEnthalpy(P2: number, s1: number): number {
    // Find temperature where saturated vapor has entropy s1
    const T_sat2 = this.getSaturationTemperature(P2);
    const s_sat_g = 6.5 + 0.001 * (T_sat2 - 273);
    
    if (s1 <= s_sat_g) {
      // Two-phase region
      const s_f = 1.3 + 0.001 * (T_sat2 - 273);
      const s_g = s_sat_g;
      const h_f = 419 + 2.1 * T_sat2;
      const h_fg = 2257 + 1.8 * (T_sat2 - 273);
      const x = (s1 - s_f) / (s_g - s_f);
      return h_f + x * h_fg;
    }
    
    // Superheated region
    const h_sat_g = 2675 + 2.3 * (T_sat2 - 273);
    const cp_sup = 2.08;
    const T2_approx = T_sat2 * Math.exp((s1 - s_sat_g) / cp_sup);
    return h_sat_g + cp_sup * (T2_approx - T_sat2);
  }
  
  /**
   * Get temperature from pressure and enthalpy
   */
  private getSteamTemperature(P: number, h: number): number {
    const T_sat = this.getSaturationTemperature(P);
    const h_f = 419 + 2.1 * T_sat;
    const h_g = 2675 + 2.3 * (T_sat - 273);
    
    if (h <= h_f) {
      return 273 + (h - 419) / 4.18; // Subcooled water
    }
    
    if (h >= h_g) {
      // Superheated
      return T_sat + (h - h_g) / 2.08;
    }
    
    // Two-phase - return saturation temperature
    return T_sat;
  }
  
  /**
   * Get steam quality from pressure and enthalpy
   */
  private getSteamQuality(P: number, h: number): number {
    const T_sat = this.getSaturationTemperature(P);
    const h_f = 419 + 2.1 * T_sat;
    const h_fg = 2257 + 1.8 * (T_sat - 273);
    const h_g = h_f + h_fg;
    
    if (h < h_f) return 0; // Subcooled
    if (h > h_g) return 1; // Superheated
    
    return (h - h_f) / h_fg;
  }
  
  /**
   * Get saturation temperature from pressure (MPa)
   * Antoine equation approximation for water
   */
  private getSaturationTemperature(P: number): number {
    // Simplified saturation temperature calculation
    // For P in MPa, returns T in K
    if (P >= 22.064) {
      return 647.096; // Critical point
    }
    
    // Approximate using steam table data points
    const steamTable: Record<number, number> = {
      0.01: 319,
      0.1: 373,
      0.5: 425,
      1.0: 453,
      2.0: 485,
      5.0: 537,
      10.0: 584,
      15.0: 617,
      20.0: 641,
    };
    
    const pressures = Object.keys(steamTable).map(Number).sort((a, b) => a - b);
    
    // Find surrounding pressures
    let P_lower = pressures[0];
    let P_upper = pressures[pressures.length - 1];
    
    for (let i = 0; i < pressures.length - 1; i++) {
      if (P >= pressures[i] && P <= pressures[i + 1]) {
        P_lower = pressures[i];
        P_upper = pressures[i + 1];
        break;
      }
    }
    
    // Linear interpolation
    const T_lower = steamTable[P_lower];
    const T_upper = steamTable[P_upper];
    const ratio = (P - P_lower) / (P_upper - P_lower);
    
    return T_lower + ratio * (T_upper - T_lower);
  }
}

// ============================================================================
// CENTRIFUGAL COMPRESSOR
// ============================================================================

export const CENTRIFUGAL_COMPRESSOR_DEFINITION: ComponentDefinition = {
  id: 'fluid.compressor.centrifugal',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'turbomachinery',
  name: 'Centrifugal Compressor',
  description: 'Dynamic compressor for gas compression. Increases gas pressure by converting kinetic energy to pressure.',
  tags: ['compressor', 'gas', 'compression', 'turbomachinery', 'pressure'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Suction',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P₁', name: 'Inlet Pressure', unit: 'MPa', direction: 'in' },
        { symbol: 'T₁', name: 'Inlet Temperature', unit: 'K', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Discharge',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P₂', name: 'Discharge Pressure', unit: 'MPa', direction: 'out' },
        { symbol: 'T₂', name: 'Discharge Temperature', unit: 'K', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
    {
      id: 'shaft',
      name: 'Shaft Input',
      type: 'input',
      domain: 'mechanical',
      variables: [
        { symbol: 'Ẇ', name: 'Power', unit: 'kW', direction: 'in' },
        { symbol: 'N', name: 'Speed', unit: 'rpm', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0.5, y: 1, side: 'bottom' },
    },
  ],
  
  parameters: [
    {
      id: 'W_comp',
      name: 'Compressor Power',
      symbol: 'Ẇ',
      unit: 'kW',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Power input to compressor',
      display: { precision: 1 },
    },
    {
      id: 'pressure_ratio',
      name: 'Pressure Ratio',
      symbol: 'PR',
      unit: '-',
      dataType: 'number',
      value: 3,
      source: 'design',
      description: 'Ratio of discharge to suction pressure',
      designRange: { min: 1.1, max: 10 },
      display: { precision: 2 },
    },
    {
      id: 'eta_isentropic',
      name: 'Isentropic Efficiency',
      symbol: 'η_is',
      unit: '%',
      dataType: 'number',
      value: 80,
      source: 'design',
      description: 'Ratio of isentropic work to actual work',
      designRange: { min: 70, max: 90 },
      display: { precision: 1 },
    },
    {
      id: 'eta_mechanical',
      name: 'Mechanical Efficiency',
      symbol: 'η_m',
      unit: '%',
      dataType: 'number',
      value: 95,
      source: 'design',
      description: 'Accounts for bearing losses',
      designRange: { min: 85, max: 98 },
      display: { precision: 1 },
    },
    {
      id: 'N',
      name: 'Rotational Speed',
      symbol: 'N',
      unit: 'rpm',
      dataType: 'number',
      value: 3000,
      source: 'design',
      description: 'Compressor rotational speed',
      designRange: { min: 500, max: 30000 },
      display: { precision: 0 },
    },
    {
      id: 'inlet_pressure',
      name: 'Inlet Pressure',
      symbol: 'P₁',
      unit: 'MPa',
      dataType: 'number',
      value: 0.1,
      source: 'design',
      description: 'Suction pressure',
      designRange: { min: 0.05, max: 1 },
      display: { precision: 3 },
    },
    {
      id: 'inlet_temperature',
      name: 'Inlet Temperature',
      symbol: 'T₁',
      unit: 'K',
      dataType: 'number',
      value: 293,
      source: 'design',
      description: 'Suction temperature (20°C = 293K)',
      designRange: { min: 250, max: 350 },
      display: { precision: 0 },
    },
    {
      id: 'm_dot',
      name: 'Mass Flow Rate',
      symbol: 'ṁ',
      unit: 'kg/s',
      dataType: 'number',
      value: 1,
      source: 'design',
      description: 'Gas mass flow rate',
      designRange: { min: 0.1, max: 50 },
      display: { precision: 2 },
    },
    {
      id: 'molecular_weight',
      name: 'Molecular Weight',
      symbol: 'M',
      unit: 'kg/kmol',
      dataType: 'number',
      value: 29,
      source: 'design',
      description: 'Gas molecular weight (29 = air)',
      designRange: { min: 2, max: 100 },
      display: { precision: 1 },
    },
    {
      id: 'discharge_temperature',
      name: 'Discharge Temperature',
      symbol: 'T₂',
      unit: 'K',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Gas temperature after compression',
      display: { precision: 1 },
    },
    {
      id: 'work_isentropic',
      name: 'Isentropic Work',
      symbol: 'w_s',
      unit: 'kJ/kg',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Work if compression were isentropic',
      display: { precision: 1 },
    },
    {
      id: 'work_actual',
      name: 'Actual Work',
      symbol: 'w',
      unit: 'kJ/kg',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Actual work input per unit mass',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'pressure_ratio_calc',
      name: 'Pressure Ratio',
      expression: 'PR = P2 / P1',
      description: 'Calculate pressure ratio from inlet and outlet pressures',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'isentropic_work',
      name: 'Isentropic Work',
      expression: 'w_s = (k / (k-1)) * R_specific * T1 * (PR^((k-1)/k) - 1)',
      description: 'Isentropic work for ideal gas compression',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'actual_work',
      name: 'Actual Work',
      expression: 'w = w_s / (eta_is / 100)',
      description: 'Actual work accounting for isentropic efficiency',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'power_calc',
      name: 'Power Input',
      expression: 'W = ṁ * w / 1000',
      description: 'Total power input from shaft',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'pressure_valid',
      name: 'Valid Pressure Ratio',
      expression: 'PR > 1',
      type: 'designRule',
      severity: 'error',
      description: 'Pressure ratio must be greater than 1 for compression',
    },
    {
      id: 'efficiency_valid',
      name: 'Efficiency Range',
      expression: 'eta_is >= 70 && eta_is <= 90',
      type: 'designRule',
      severity: 'warning',
      description: 'Isentropic efficiency should be between 70% and 90%',
    },
  ],
};

@registerComponent('fluid.compressor.centrifugal')
export class CentrifugalCompressor extends ComponentBase {
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const gamma = 1.4; // Specific heat ratio for diatomic gases
    const R_universal = 8.314;
    
    const eta_is = this.getParameterValueOrDefault('eta_isentropic', 80) as number;
    const eta_m = this.getParameterValueOrDefault('eta_mechanical', 95) as number;
    const P1 = this.getParameterValueOrDefault('inlet_pressure', 0.1) as number;
    const T1 = this.getParameterValueOrDefault('inlet_temperature', 293) as number;
    const PR = this.getParameterValueOrDefault('pressure_ratio', 3) as number;
    const M = this.getParameterValueOrDefault('molecular_weight', 29) as number;
    const m_dot = this.getParameterValueOrDefault('m_dot', 1) as number;
    
    const R_specific = R_universal / M; // J/kg·K
    
    // Isentropic work (kJ/kg)
    const w_isentropic = (gamma / (gamma - 1)) * R_specific * T1 * (Math.pow(PR, (gamma - 1) / gamma) - 1) / 1000;
    
    // Actual work (kJ/kg)
    const w_actual = w_isentropic / (eta_is / 100);
    
    // Power input (kW)
    const W_isentropic = m_dot * w_isentropic;
    const W_actual = m_dot * w_actual;
    const W_shaft = W_actual / (eta_m / 100);
    
    // Discharge temperature using isentropic relation
    const T2 = T1 * Math.pow(PR, (gamma - 1) / gamma);
    
    // Update computed values
    this.setComputedValue('W_comp', W_shaft);
    this.setComputedValue('work_isentropic', w_isentropic);
    this.setComputedValue('work_actual', w_actual);
    this.setComputedValue('discharge_temperature', T2);
    
    // Update parameter values
    this.parameterValues.set('W_comp', W_shaft);
    this.parameterValues.set('work_isentropic', w_isentropic);
    this.parameterValues.set('work_actual', w_actual);
    this.parameterValues.set('discharge_temperature', T2);
  }
}

// ============================================================================
// STORAGE TANK
// ============================================================================

export const STORAGE_TANK_DEFINITION: ComponentDefinition = {
  id: 'fluid.tank.storage',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Storage Tank',
  description: 'Vertical cylindrical storage tank for liquids. Provides volume storage and buffering.',
  tags: ['tank', 'storage', 'volume', 'buffer', 'liquid'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ_in', name: 'Inlet Flow', unit: 'kg/s', direction: 'in' },
        { symbol: 'P', name: 'Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: false,
      position: { x: 0, y: 0.3, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ_out', name: 'Outlet Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'P', name: 'Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.7, side: 'right' },
    },
    {
      id: 'vent',
      name: 'Vent',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ_v', name: 'Vapor Flow', unit: 'kg/s', direction: 'out' },
      ],
      state: 'disconnected',
      required: false,
      position: { x: 0.5, y: 0, side: 'top' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Diameter',
      symbol: 'D',
      unit: 'm',
      dataType: 'number',
      value: 2,
      source: 'design',
      description: 'Tank inner diameter',
      designRange: { min: 0.5, max: 20 },
      display: { precision: 2 },
    },
    {
      id: 'L',
      name: 'Liquid Level',
      symbol: 'h',
      unit: 'm',
      dataType: 'number',
      value: 3,
      source: 'design',
      description: 'Current liquid level',
      designRange: { min: 0, max: 20 },
      display: { precision: 2 },
    },
    {
      id: 'L_max',
      name: 'Maximum Level',
      symbol: 'h_max',
      unit: 'm',
      dataType: 'number',
      value: 5,
      source: 'design',
      description: 'Maximum liquid level before overflow',
      designRange: { min: 1, max: 30 },
      display: { precision: 2 },
    },
    {
      id: 'volume',
      name: 'Tank Volume',
      symbol: 'V',
      unit: 'm³',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Total tank volume',
      display: { precision: 2 },
    },
    {
      id: 'volume_liquid',
      name: 'Liquid Volume',
      symbol: 'V_liq',
      unit: 'm³',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current liquid volume',
      display: { precision: 2 },
    },
    {
      id: 'head_pressure',
      name: 'Head Pressure',
      symbol: 'P_head',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Hydrostatic pressure at bottom',
      display: { precision: 1 },
    },
    {
      id: 'retention_time',
      name: 'Hydraulic Retention Time',
      symbol: 'τ',
      unit: 'min',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Average time liquid spends in tank',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'tank_volume',
      name: 'Tank Volume',
      expression: 'V = π * (D/2)² * L_max',
      latex: 'V = \\pi (D/2)^2 h_{max}',
      description: 'Total volume of cylindrical tank',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'liquid_volume',
      name: 'Liquid Volume',
      expression: 'V_liq = π * (D/2)² * h',
      latex: 'V_{liq} = \\pi (D/2)^2 h',
      description: 'Current liquid volume based on level',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'head_pressure_calc',
      name: 'Head Pressure',
      expression: 'P_head = ρ * g * h / 1000',
      description: 'Hydrostatic pressure at tank bottom',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'level_valid',
      name: 'Level Within Range',
      expression: 'h >= 0 && h <= L_max',
      type: 'designRule',
      severity: 'error',
      description: 'Liquid level must be between 0 and maximum',
    },
    {
      id: 'diameter_valid',
      name: 'Valid Diameter',
      expression: 'D > 0',
      type: 'designRule',
      severity: 'error',
      description: 'Diameter must be positive',
    },
  ],
};

@registerComponent('fluid.tank.storage')
export class StorageTank extends ComponentBase {
  private rho = FLUID_SYSTEM_CONSTANTS.density; // 998 kg/m³
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const D = this.getParameterValueOrDefault('D', 2) as number;
    const h = this.getParameterValueOrDefault('L', 3) as number;
    const h_max = this.getParameterValueOrDefault('L_max', 5) as number;
    
    // Tank volume
    const V = Math.PI * Math.pow(D / 2, 2) * h_max;
    
    // Liquid volume
    const V_liq = Math.PI * Math.pow(D / 2, 2) * h;
    
    // Head pressure (kPa)
    const P_head = (this.rho * 9.81 * h) / 1000;
    
    // Hydraulic retention time (min)
    const m_dot_in = this.getParameterValue('m_dot_in') as number ?? 0;
    const m_dot_out = this.getParameterValue('m_dot_out') as number ?? m_dot_in;
    const avg_flow = (m_dot_in + m_dot_out) / 2;
    let retention_time = 0;
    if (avg_flow > 0) {
      retention_time = (V_liq * this.rho) / avg_flow / 60;
    }
    
    // Update computed values
    this.setComputedValue('volume', V);
    this.setComputedValue('volume_liquid', V_liq);
    this.setComputedValue('head_pressure', P_head);
    this.setComputedValue('retention_time', retention_time);
    this.setComputedValue('fill_percent', (h / h_max) * 100);
    
    // Update parameter values
    this.parameterValues.set('volume', V);
    this.parameterValues.set('volume_liquid', V_liq);
    this.parameterValues.set('head_pressure', P_head);
    this.parameterValues.set('retention_time', retention_time);
  }
}

// ============================================================================
// PID CONTROLLER
// ============================================================================

export const PID_CONTROLLER_DEFINITION: ComponentDefinition = {
  id: 'control.controller.pid',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'controllers',
  name: 'PID Controller',
  description: 'Proportional-Integral-Derivative feedback controller for process regulation.',
  tags: ['control', 'PID', 'feedback', 'regulation', 'process'],
  
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
      name: 'Output',
      type: 'output',
      domain: 'signal',
      variables: [
        { symbol: 'CO', name: 'Control Output', unit: '%', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'Kp',
      name: 'Proportional Gain',
      symbol: 'Kₚ',
      unit: '-',
      dataType: 'number',
      value: 1,
      source: 'design',
      description: 'Proportional controller gain',
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
      description: 'Integral time constant (0 to disable integral)',
      designRange: { min: 0, max: 1000 },
      display: { precision: 1 },
    },
    {
      id: 'Td',
      name: 'Derivative Time',
      symbol: 'T_d',
      unit: 's',
      dataType: 'number',
      value: 0,
      source: 'design',
      description: 'Derivative time constant (0 to disable derivative)',
      designRange: { min: 0, max: 100 },
      display: { precision: 2 },
    },
    {
      id: 'output_min',
      name: 'Output Minimum',
      symbol: 'OP_min',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'design',
      description: 'Minimum controller output',
      display: { precision: 0 },
    },
    {
      id: 'output_max',
      name: 'Output Maximum',
      symbol: 'OP_max',
      unit: '%',
      dataType: 'number',
      value: 100,
      source: 'design',
      description: 'Maximum controller output',
      display: { precision: 0 },
    },
    {
      id: 'output',
      name: 'Controller Output',
      symbol: 'CO',
      unit: '%',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current controller output',
      display: { precision: 1 },
    },
    {
      id: 'error',
      name: 'Error',
      symbol: 'e',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current error (SP - PV)',
      display: { precision: 3 },
    },
    {
      id: 'integral',
      name: 'Integral Term',
      symbol: 'I',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current integral term',
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
      description: 'Current derivative term',
      display: { precision: 3 },
    },
  ],
  
  equations: [
    {
      id: 'pid_equation',
      name: 'PID Output',
      expression: 'CO = Kp * (e + (1/Ti) * ∫e dt + Td * de/dt)',
      latex: 'CO = K_p \\left( e + \\frac{1}{T_i} \\int e \\, dt + T_d \\frac{de}{dt} \\right)',
      description: 'Standard PID control equation (parallel form)',
      type: 'ode',
      solutionMethod: 'numerical',
    },
  ],

  constraints: [],
};

@registerComponent('control.controller.pid')
export class PIDController extends ComponentBase {
  private integral: number = 0;
  private prevError: number = 0;
  private prevTime: number = 0;
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Kp = this.getParameterValueOrDefault('Kp', 1) as number;
    const Ti = this.getParameterValueOrDefault('Ti', 10) as number;
    const Td = this.getParameterValueOrDefault('Td', 0) as number;
    const outMin = this.getParameterValueOrDefault('output_min', 0) as number;
    const outMax = this.getParameterValueOrDefault('output_max', 100) as number;
    
    const setpoint = this.getParameterValue('setpoint') as number ?? 50;
    const feedback = this.getParameterValue('feedback') as number ?? 50;
    
    const error = setpoint - feedback;
    
    const now = Date.now();
    const dt = this.prevTime > 0 ? (now - this.prevTime) / 1000 : 0.1;
    this.prevTime = now;
    
    // Integral term (with anti-windup)
    const integralMax = (outMax - outMin) / (2 * Kp); // Approximate limit
    this.integral += error * dt;
    this.integral = Math.max(-integralMax, Math.min(integralMax, this.integral));
    
    // Derivative term (on error, with filtering)
    const derivative = dt > 0 ? (error - this.prevError) / dt : 0;
    this.prevError = error;
    
    // PI-D form (derivative on measurement to reduce noise)
    const derivative_measured = dt > 0 ? (feedback - (this.getParameterValue('prev_feedback') as number ?? feedback)) / dt : 0;
    
    // Calculate output terms
    const proportional = Kp * error;
    const integral = Ti > 0 ? Kp * this.integral / Ti : 0;
    const derivative_term = Kp * Td * derivative_measured;
    
    let output = proportional + integral + derivative_term;
    
    // Clamp output
    output = Math.max(outMin, Math.min(outMax, output));
    
    // Update computed values
    this.setComputedValue('output', output);
    this.setComputedValue('error', error);
    this.setComputedValue('integral', this.integral);
    this.setComputedValue('derivative', derivative_term);
    this.setComputedValue('proportional', proportional);
    this.setComputedValue('proportional_band', Kp > 0 ? 100 / Kp : 0);
    
    // Update parameter values
    this.parameterValues.set('output', output);
    this.parameterValues.set('error', error);
    this.parameterValues.set('integral', this.integral);
    this.parameterValues.set('derivative', derivative_term);
  }
}

// ============================================================================
// TEMPERATURE SENSOR
// ============================================================================

export const TEMPERATURE_SENSOR_DEFINITION: ComponentDefinition = {
  id: 'control.sensor.temperature',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'sensors',
  name: 'Temperature Sensor',
  description: 'Measures process temperature and outputs standardized signal.',
  tags: ['sensor', 'temperature', 'measurement', 'process'],
  
  ports: [
    {
      id: 'input',
      name: 'Process Connection',
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
        { symbol: 'PV', name: 'Process Variable', unit: '-', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'range_min',
      name: 'Range Minimum',
      symbol: 'T_min',
      unit: 'K',
      dataType: 'number',
      value: 273,
      source: 'design',
      description: 'Minimum measurable temperature',
      display: { precision: 0 },
    },
    {
      id: 'range_max',
      name: 'Range Maximum',
      symbol: 'T_max',
      unit: 'K',
      dataType: 'number',
      value: 423,
      source: 'design',
      description: 'Maximum measurable temperature',
      display: { precision: 0 },
    },
    {
      id: 'signal_type',
      name: 'Signal Type',
      symbol: 'sig',
      unit: '-',
      dataType: 'string',
      value: '4-20mA',
      source: 'design',
      description: 'Output signal type (4-20mA, 0-10V, 0-100%)',
    },
    {
      id: 'reading',
      name: 'Sensor Reading',
      symbol: 'PV',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Normalized sensor output',
      display: { precision: 3 },
    },
    {
      id: 'temperature',
      name: 'Measured Temperature',
      symbol: 'T',
      unit: 'K',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Measured process temperature',
      display: { precision: 1 },
    },
    {
      id: 'error',
      name: 'Measurement Error',
      symbol: 'ε',
      unit: 'K',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Measurement error from nominal',
      display: { precision: 2 },
    },
  ],
  
  equations: [
    {
      id: 'signal_conversion',
      name: 'Signal to Temperature',
      expression: 'PV = (T - T_min) / (T_max - T_min)',
      description: 'Convert temperature to normalized signal (0-1)',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],

  constraints: [],
};

@registerComponent('control.sensor.temperature')
export class TemperatureSensor extends ComponentBase {
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const T_min = this.getParameterValueOrDefault('range_min', 273) as number;
    const T_max = this.getParameterValueOrDefault('range_max', 423) as number;
    
    const T_actual = this.getParameterValue('T') as number ?? 293;
    
    // Calculate normalized output (0-1)
    const range = T_max - T_min;
    let PV = 0;
    if (range > 0) {
      PV = (T_actual - T_min) / range;
      PV = Math.max(0, Math.min(1, PV)); // Clamp
    }
    
    // Measurement error (±0.5% of span typical)
    const span = T_max - T_min;
    const error = (Math.random() - 0.5) * 0.01 * span;
    
    // Update computed values
    this.setComputedValue('reading', PV);
    this.setComputedValue('temperature', T_actual);
    this.setComputedValue('error', error);
    this.setComputedValue('T', T_actual); // Pass through
    
    // For signal type 4-20mA: PV_4_20mA = 4 + 16 * PV
    // For signal type 0-10V: PV_0_10V = 10 * PV
    
    this.parameterValues.set('reading', PV);
    this.parameterValues.set('temperature', T_actual);
    this.parameterValues.set('error', error);
  }
}

// ============================================================================
// PRESSURE SENSOR
// ============================================================================

export const PRESSURE_SENSOR_DEFINITION: ComponentDefinition = {
  id: 'control.sensor.pressure',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'sensors',
  name: 'Pressure Sensor',
  description: 'Measures process pressure and outputs standardized signal.',
  tags: ['sensor', 'pressure', 'measurement', 'process'],
  
  ports: [
    {
      id: 'input',
      name: 'Process Connection',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'P', name: 'Pressure', unit: 'Pa', direction: 'in' },
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
        { symbol: 'PV', name: 'Process Variable', unit: '-', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'range_min',
      name: 'Range Minimum',
      symbol: 'P_min',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'design',
      description: 'Minimum measurable pressure',
      display: { precision: 0 },
    },
    {
      id: 'range_max',
      name: 'Range Maximum',
      symbol: 'P_max',
      unit: 'kPa',
      dataType: 'number',
      value: 1000,
      source: 'design',
      description: 'Maximum measurable pressure',
      display: { precision: 0 },
    },
    {
      id: 'reading',
      name: 'Sensor Reading',
      symbol: 'PV',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Normalized sensor output',
      display: { precision: 3 },
    },
    {
      id: 'pressure',
      name: 'Measured Pressure',
      symbol: 'P',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Measured process pressure',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'signal_conversion',
      name: 'Signal to Pressure',
      expression: 'PV = (P - P_min) / (P_max - P_min)',
      description: 'Convert pressure to normalized signal',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],

  constraints: [],
};

@registerComponent('control.sensor.pressure')
export class PressureSensor extends ComponentBase {
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const P_min = this.getParameterValueOrDefault('range_min', 0) as number;
    const P_max = this.getParameterValueOrDefault('range_max', 1000) as number;
    
    const P_Pa = this.getParameterValue('P') as number ?? 101325;
    const P_kPa = P_Pa / 1000;
    
    // Calculate normalized output (0-1)
    const range = P_max - P_min;
    let PV = 0;
    if (range > 0) {
      PV = (P_kPa - P_min) / range;
      PV = Math.max(0, Math.min(1, PV));
    }
    
    // Update computed values
    this.setComputedValue('reading', PV);
    this.setComputedValue('pressure', P_kPa);
    this.setComputedValue('P', P_kPa);
    
    this.parameterValues.set('reading', PV);
    this.parameterValues.set('pressure', P_kPa);
  }
}

// ============================================================================
// FLOW SENSOR
// ============================================================================

export const FLOW_SENSOR_DEFINITION: ComponentDefinition = {
  id: 'control.sensor.flow',
  version: '1.0.0',
  domain: 'control',
  subcategory: 'sensors',
  name: 'Flow Sensor',
  description: 'Measures fluid flow rate and outputs standardized signal.',
  tags: ['sensor', 'flow', 'measurement', 'process'],
  
  ports: [
    {
      id: 'input',
      name: 'Flow Connection',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow', unit: 'kg/s', direction: 'in' },
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
        { symbol: 'PV', name: 'Process Variable', unit: '-', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'range_min',
      name: 'Range Minimum',
      symbol: 'Q_min',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'design',
      description: 'Minimum measurable flow',
      display: { precision: 1 },
    },
    {
      id: 'range_max',
      name: 'Range Maximum',
      symbol: 'Q_max',
      unit: 'm³/h',
      dataType: 'number',
      value: 100,
      source: 'design',
      description: 'Maximum measurable flow',
      display: { precision: 1 },
    },
    {
      id: 'reading',
      name: 'Sensor Reading',
      symbol: 'PV',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Normalized sensor output',
      display: { precision: 3 },
    },
    {
      id: 'flow',
      name: 'Measured Flow',
      symbol: 'Q',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Measured flow rate',
      display: { precision: 2 },
    },
  ],
  
  equations: [
    {
      id: 'signal_conversion',
      name: 'Signal to Flow',
      expression: 'PV = (Q - Q_min) / (Q_max - Q_min)',
      description: 'Convert flow to normalized signal',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],

  constraints: [],
};

@registerComponent('control.sensor.flow')
export class FlowSensor extends ComponentBase {
  private rho = 998; // kg/m³ (water)
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Q_min = this.getParameterValueOrDefault('range_min', 0) as number;
    const Q_max = this.getParameterValueOrDefault('range_max', 100) as number;
    
    const m_dot = this.getParameterValue('m_dot') as number ?? 0;
    const Q = (m_dot / this.rho) * 3600; // Convert kg/s to m³/h
    
    // Calculate normalized output (0-1)
    const range = Q_max - Q_min;
    let PV = 0;
    if (range > 0) {
      PV = (Q - Q_min) / range;
      PV = Math.max(0, Math.min(1, PV));
    }
    
    // Update computed values
    this.setComputedValue('reading', PV);
    this.setComputedValue('flow', Q);
    
    this.parameterValues.set('reading', PV);
    this.parameterValues.set('flow', Q);
  }
}

export const GATE_VALVE_DEFINITION: ComponentDefinition = {
  id: 'fluid.valve.gate',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Gate Valve',
  description: 'Full bore gate valve for isolation service',
  tags: ['valve', 'fluid', 'piping', 'isolation', 'gate'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Nominal Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Valve port diameter',
      standardSizes: [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200],
      display: { precision: 0 },
    },
    {
      id: 'Cv_open',
      name: 'Cv (Fully Open)',
      symbol: 'Cᵥ,open',
      unit: 'm³/h',
      dataType: 'number',
      value: 150,
      source: 'design',
      description: 'Flow coefficient when fully open (full bore)',
      display: { precision: 0 },
    },
    {
      id: 'opening',
      name: 'Valve Opening',
      symbol: 'opening',
      unit: '%',
      dataType: 'number',
      value: 100,
      source: 'design',
      description: 'Current valve opening percentage',
      designRange: { min: 0, max: 100 },
      display: { precision: 0 },
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across valve',
      display: { precision: 2 },
    },
    {
      id: 'flow',
      name: 'Flow Rate',
      symbol: 'Q',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current flow rate through valve',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'gate_flow',
      name: 'Flow Calculation',
      expression: 'Q = Cv * sqrt(ΔP)',
      description: 'Gate valve flow equation',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'opening_range',
      name: 'Valid Opening',
      expression: 'opening >= 0 && opening <= 100',
      type: 'designRule',
      severity: 'error',
      description: 'Opening must be between 0 and 100%',
    },
  ],
};

@registerComponent('fluid.valve.gate')
export class GateValve extends ComponentBase {
  constructor(
    definition: ComponentDefinition = GATE_VALVE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Cv_open = this.getParameterValueOrDefault('Cv_open', 150) as number;
    const opening = this.getParameterValueOrDefault('opening', 100) as number;
    const dP = this.getParameterValue('dP') as number ?? 10; // kPa
    
    // Gate valve: Cv increases with opening squared (approximation)
    const L = opening / 100;
    const effectiveCv = Cv_open * Math.pow(L, 2);
    
    const flow_m3h = effectiveCv * Math.sqrt(Math.max(0, dP));
    
    this.setComputedValue('flow', flow_m3h);
    this.setComputedValue('effectiveCv', effectiveCv);
    this.parameterValues.set('flow', flow_m3h);
  }
}

// ============================================================================
// GLOBE VALVE
// ============================================================================

export const GLOBE_VALVE_DEFINITION: ComponentDefinition = {
  id: 'fluid.valve.globe',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Globe Valve',
  description: 'Globe-style valve for throttling and regulation',
  tags: ['valve', 'fluid', 'piping', 'throttling', 'globe'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Nominal Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Valve body diameter',
      display: { precision: 0 },
    },
    {
      id: 'Cv_max',
      name: 'Maximum Cv',
      symbol: 'Cᵥ,max',
      unit: 'm³/h',
      dataType: 'number',
      value: 60,
      source: 'design',
      description: 'Maximum flow coefficient at full open',
      designRange: { min: 0.1, max: 500 },
      display: { precision: 1 },
    },
    {
      id: 'opening',
      name: 'Valve Opening',
      symbol: 'opening',
      unit: '%',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Current valve opening percentage',
      designRange: { min: 0, max: 100 },
      display: { precision: 0 },
    },
    {
      id: 'characteristic',
      name: 'Flow Characteristic',
      symbol: 'char',
      unit: '-',
      dataType: 'string',
      value: 'equal_percentage',
      source: 'design',
      description: 'Valve flow characteristic curve',
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across valve',
      display: { precision: 2 },
    },
    {
      id: 'flow',
      name: 'Flow Rate',
      symbol: 'Q',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current flow rate through valve',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'globe_flow',
      name: 'Flow Calculation',
      expression: 'Q = Cv * sqrt(ΔP)',
      description: 'Globe valve flow equation',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'Cv_positive',
      name: 'Positive Cv',
      expression: 'Cv_max > 0',
      type: 'designRule',
      severity: 'error',
      description: 'Maximum Cv must be positive',
    },
  ],
};

@registerComponent('fluid.valve.globe')
export class GlobeValve extends ComponentBase {
  constructor(
    definition: ComponentDefinition = GLOBE_VALVE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Cv_max = this.getParameterValueOrDefault('Cv_max', 60) as number;
    const opening = this.getParameterValueOrDefault('opening', 50) as number;
    const characteristic = this.getParameterValueOrDefault('characteristic', 'equal_percentage') as string;
    const dP = this.getParameterValue('dP') as number ?? 50; // kPa
    
    const L = opening / 100;
    let effectiveCv: number;
    
    // Globe valves typically have equal percentage characteristic
    switch (characteristic) {
      case 'equal_percentage':
        const R = 30; // Rangeability
        effectiveCv = Cv_max * Math.pow(R, L - 1) / Math.pow(R, -1);
        break;
      case 'linear':
        effectiveCv = Cv_max * L;
        break;
      default:
        effectiveCv = Cv_max * L;
    }
    
    const flow_m3h = effectiveCv * Math.sqrt(Math.max(0, dP));
    
    this.setComputedValue('flow', flow_m3h);
    this.setComputedValue('effectiveCv', effectiveCv);
    this.parameterValues.set('flow', flow_m3h);
  }
}

// ============================================================================
// CHECK VALVE
// ============================================================================

export const CHECK_VALVE_DEFINITION: ComponentDefinition = {
  id: 'fluid.valve.check',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Check Valve',
  description: 'Swing check valve for preventing backflow',
  tags: ['valve', 'fluid', 'piping', 'backflow', 'check'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Nominal Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Valve diameter',
      display: { precision: 0 },
    },
    {
      id: 'Cr',
      name: 'Cracking Pressure',
      symbol: 'P_cr',
      unit: 'kPa',
      dataType: 'number',
      value: 2,
      source: 'design',
      description: 'Minimum pressure to open valve',
      designRange: { min: 0.1, max: 20 },
      display: { precision: 1 },
    },
    {
      id: 'Cv',
      name: 'Flow Coefficient',
      symbol: 'Cᵥ',
      unit: 'm³/h',
      dataType: 'number',
      value: 80,
      source: 'design',
      description: 'Flow coefficient when fully open',
      display: { precision: 0 },
    },
    {
      id: 'state',
      name: 'Valve State',
      symbol: 'state',
      unit: '-',
      dataType: 'string',
      value: 'open',
      source: 'calculated',
      description: 'Current valve position (open/closed)',
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across valve',
      display: { precision: 2 },
    },
    {
      id: 'flow',
      name: 'Flow Rate',
      symbol: 'Q',
      unit: 'm³/h',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Current flow rate through valve',
      display: { precision: 1 },
    },
  ],
  
  equations: [
    {
      id: 'check_flow',
      name: 'Flow Calculation',
      expression: 'Q = Cv * sqrt(ΔP)',
      description: 'Check valve flow when open',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'Cr_positive',
      name: 'Positive Cracking Pressure',
      expression: 'Cr > 0',
      type: 'designRule',
      severity: 'warning',
      description: 'Cracking pressure should be positive',
    },
  ],
};

@registerComponent('fluid.valve.check')
export class CheckValve extends ComponentBase {
  constructor(
    definition: ComponentDefinition = CHECK_VALVE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const Cv = this.getParameterValueOrDefault('Cv', 80) as number;
    const Cr = this.getParameterValueOrDefault('Cr', 2) as number;
    const dP = this.getParameterValue('dP') as number ?? 10; // kPa
    
    // Check valve opens if pressure drop exceeds cracking pressure
    const isOpen = dP > Cr;
    const effectiveCv = isOpen ? Cv : 0;
    
    const flow_m3h = effectiveCv * Math.sqrt(Math.max(0, dP));
    
    this.setComputedValue('flow', flow_m3h);
    this.setComputedValue('effectiveCv', effectiveCv);
    this.parameterValues.set('flow', flow_m3h);
    this.parameterValues.set('state', isOpen ? 'open' : 'closed');
  }
}

// ============================================================================
// ELBOW (90°)
// ============================================================================

export const ELBOW_DEFINITION: ComponentDefinition = {
  id: 'fluid.pipe.elbow',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Elbow (90°)',
  description: 'Standard 90-degree pipe elbow fitting',
  tags: ['pipe', 'fluid', 'piping', 'fitting', 'elbow', 'bend'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet',
      name: 'Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
  ],
  
  parameters: [
    {
      id: 'D',
      name: 'Pipe Diameter',
      symbol: 'D',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Pipe inner diameter',
      standardSizes: [15, 20, 25, 32, 40, 50, 65, 80, 100, 150, 200],
      display: { precision: 0 },
    },
    {
      id: 'radius_ratio',
      name: 'Radius Ratio',
      symbol: 'R/D',
      unit: '-',
      dataType: 'number',
      value: 1.5,
      source: 'design',
      description: 'Bend radius to diameter ratio (1.5 = long radius)',
      designRange: { min: 1, max: 3 },
      display: { precision: 1 },
    },
    {
      id: 'K',
      name: 'Loss Coefficient',
      symbol: 'K',
      unit: '-',
      dataType: 'number',
      value: 0.3,
      source: 'calculated',
      description: 'Minor loss coefficient',
      display: { precision: 3 },
    },
    {
      id: 'dP',
      name: 'Pressure Drop',
      symbol: 'ΔP',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop across elbow',
      display: { precision: 2 },
    },
    {
      id: 'velocity',
      name: 'Flow Velocity',
      symbol: 'v',
      unit: 'm/s',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Flow velocity',
      display: { precision: 2 },
    },
  ],
  
  equations: [
    {
      id: 'minor_loss',
      name: 'Minor Loss',
      expression: 'dP = K * (ρ * v² / 2)',
      latex: '\\Delta P = K \\frac{\\rho v^2}{2}',
      description: 'Calculate pressure loss using minor loss coefficient',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'k_value',
      name: 'K Value Correlation',
      expression: 'K = 0.2 + 1.0 / (0.55 + 2.3 * (R/D)^-1.5)',
      description: 'Elbow loss coefficient (Miller)',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'radius_valid',
      name: 'Valid Radius Ratio',
      expression: 'radius_ratio >= 1 && radius_ratio <= 3',
      type: 'designRule',
      severity: 'warning',
      description: 'Radius ratio should be between 1 and 3',
    },
  ],
};

@registerComponent('fluid.pipe.elbow')
export class Elbow extends ComponentBase {
  constructor(
    definition: ComponentDefinition = ELBOW_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const D_mm = this.getParameterValueOrDefault('D', 50) as number;
    const radius_ratio = this.getParameterValueOrDefault('radius_ratio', 1.5) as number;
    
    const D_m = D_mm / 1000;
    const m_dot = this.getParameterValue('m_dot') as number ?? 1.0; // kg/s
    
    const rho = FLUID_SYSTEM_CONSTANTS.density;
    const mu = FLUID_SYSTEM_CONSTANTS.viscosity;
    
    // Calculate velocity
    const A = (Math.PI * Math.pow(D_m, 2)) / 4;
    const v = Math.abs(m_dot) / (rho * A);
    
    // Calculate K value using empirical correlation (Miller)
    // K = 0.2 + 1.0 / (0.55 + 2.3 * (R/D)^-1.5)
    const K = 0.2 + 1.0 / (0.55 + 2.3 * Math.pow(radius_ratio, -1.5));
    
    // Calculate pressure drop
    const dP_Pa = K * (rho * Math.pow(v, 2)) / 2;
    const dP_kPa = dP_Pa / 1000;
    
    // Calculate Reynolds number
    const Re = (rho * v * D_m) / mu;
    
    this.setComputedValue('K', K);
    this.setComputedValue('dP', dP_kPa);
    this.setComputedValue('velocity', v);
    this.setComputedValue('Re', Re);
    
    this.parameterValues.set('K', K);
    this.parameterValues.set('dP', dP_kPa);
    this.parameterValues.set('velocity', v);
  }
}

// ============================================================================
// TEE (Flow Through Run)
// ============================================================================

export const TEE_DEFINITION: ComponentDefinition = {
  id: 'fluid.pipe.tee',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'Tee (Through Run)',
  description: 'Pipe tee with flow passing through the run (branch closed)',
  tags: ['pipe', 'fluid', 'piping', 'fitting', 'tee', 'junction'],
  
  ports: [
    {
      id: 'inlet',
      name: 'Inlet (Run)',
      type: 'input',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'in' },
        { symbol: 'P_in', name: 'Inlet Pressure', unit: 'Pa', direction: 'in' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 0, y: 0.5, side: 'left' },
    },
    {
      id: 'outlet_run',
      name: 'Outlet (Run)',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ', name: 'Mass Flow Rate', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_out', name: 'Outlet Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: true,
      position: { x: 1, y: 0.5, side: 'right' },
    },
    {
      id: 'outlet_branch',
      name: 'Branch Outlet',
      type: 'output',
      domain: 'fluid',
      variables: [
        { symbol: 'ṁ_b', name: 'Branch Flow', unit: 'kg/s', direction: 'out' },
        { symbol: 'P_b', name: 'Branch Pressure', unit: 'Pa', direction: 'out' },
      ],
      state: 'disconnected',
      required: false,
      position: { x: 0.5, y: 1, side: 'top' },
    },
  ],
  
  parameters: [
    {
      id: 'D_run',
      name: 'Run Diameter',
      symbol: 'D_run',
      unit: 'mm',
      dataType: 'number',
      value: 50,
      source: 'design',
      description: 'Run pipe diameter',
      display: { precision: 0 },
    },
    {
      id: 'D_branch',
      name: 'Branch Diameter',
      symbol: 'D_branch',
      unit: 'mm',
      dataType: 'number',
      value: 40,
      source: 'design',
      description: 'Branch pipe diameter',
      display: { precision: 0 },
    },
    {
      id: 'K_run',
      name: 'Loss Coeff (Run)',
      symbol: 'K_run',
      unit: '-',
      dataType: 'number',
      value: 0.2,
      source: 'calculated',
      description: 'Minor loss coefficient for flow through run',
      display: { precision: 3 },
    },
    {
      id: 'K_branch',
      name: 'Loss Coeff (Branch)',
      symbol: 'K_branch',
      unit: '-',
      dataType: 'number',
      value: 1.0,
      source: 'calculated',
      description: 'Minor loss coefficient for flow into branch',
      display: { precision: 3 },
    },
    {
      id: 'dP_run',
      name: 'Pressure Drop (Run)',
      symbol: 'ΔP_run',
      unit: 'kPa',
      dataType: 'number',
      value: 0,
      source: 'calculated',
      description: 'Pressure drop through run',
      display: { precision: 2 },
    },
    {
      id: 'branch_fraction',
      name: 'Branch Flow Fraction',
      symbol: 'f_b',
      unit: '-',
      dataType: 'number',
      value: 0,
      source: 'design',
      description: 'Fraction of flow going to branch (0 to 1)',
      designRange: { min: 0, max: 1 },
      display: { precision: 2 },
    },
  ],
  
  equations: [
    {
      id: 'tee_loss_run',
      name: 'Run Loss',
      expression: 'dP_run = K_run * (ρ * v² / 2)',
      description: 'Pressure loss for flow through run',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
    {
      id: 'tee_loss_branch',
      name: 'Branch Loss',
      expression: 'dP_b = K_branch * (ρ * v² / 2)',
      description: 'Pressure loss for flow into branch',
      type: 'algebraic',
      solutionMethod: 'analytic',
    },
  ],
  
  constraints: [
    {
      id: 'fraction_range',
      name: 'Valid Fraction',
      expression: 'branch_fraction >= 0 && branch_fraction <= 1',
      type: 'designRule',
      severity: 'error',
      description: 'Branch fraction must be between 0 and 1',
    },
  ],
};

@registerComponent('fluid.pipe.tee')
export class Tee extends ComponentBase {
  constructor(
    definition: ComponentDefinition = TEE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const D_run_mm = this.getParameterValueOrDefault('D_run', 50) as number;
    const D_branch_mm = this.getParameterValueOrDefault('D_branch', 40) as number;
    const branch_fraction = this.getParameterValueOrDefault('branch_fraction', 0.2) as number;
    
    const D_run_m = D_run_mm / 1000;
    const m_dot = this.getParameterValue('m_dot') as number ?? 1.0; // kg/s
    
    const rho = FLUID_SYSTEM_CONSTANTS.density;
    
    // Calculate flow distribution
    const m_dot_run = m_dot * (1 - branch_fraction);
    const m_dot_branch = m_dot * branch_fraction;
    
    // Calculate velocities
    const A_run = (Math.PI * Math.pow(D_run_m, 2)) / 4;
    const v_run = Math.abs(m_dot_run) / (rho * A_run);
    
    // K values for tee (flow through run with branch taking flow)
    const K_run = 0.2;
    const K_branch = 1.0;
    
    // Calculate pressure drops
    const dP_run_Pa = K_run * (rho * Math.pow(v_run, 2)) / 2;
    const dP_run_kPa = dP_run_Pa / 1000;
    
    const A_branch = (Math.PI * Math.pow(D_branch_mm / 1000, 2)) / 4;
    const v_branch = Math.abs(m_dot_branch) / (rho * A_branch);
    const dP_branch_Pa = K_branch * (rho * Math.pow(v_branch, 2)) / 2;
    
    this.setComputedValue('K_run', K_run);
    this.setComputedValue('K_branch', K_branch);
    this.setComputedValue('dP_run', dP_run_kPa);
    this.setComputedValue('dP_branch', dP_branch_Pa / 1000);
    this.setComputedValue('velocity_run', v_run);
    this.setComputedValue('velocity_branch', v_branch);
    this.setComputedValue('flow_run', m_dot_run * 3600 / rho);
    this.setComputedValue('flow_branch', m_dot_branch * 3600 / rho);
    
    this.parameterValues.set('K_run', K_run);
    this.parameterValues.set('K_branch', K_branch);
    this.parameterValues.set('dP_run', dP_run_kPa);
  }
}

// ============================================================================
// EXPORT COMPONENT CATALOG
// ============================================================================

export const COMPONENT_CATALOG: Record<string, ComponentDefinition> = {
  // Turbomachinery
  'fluid.pump.centrifugal': CENTRIFUGAL_PUMP_DEFINITION,
  'fluid.turbine.steam': STEAM_TURBINE_DEFINITION,
  'fluid.compressor.centrifugal': CENTRIFUGAL_COMPRESSOR_DEFINITION,
  
  // Pipes & Fittings
  'fluid.pipe.straight': STRAIGHT_PIPE_DEFINITION,
  'fluid.pipe.elbow': ELBOW_DEFINITION,
  'fluid.pipe.tee': TEE_DEFINITION,
  
  // Valves
  'fluid.valve.control': CONTROL_VALVE_DEFINITION,
  'fluid.valve.ball': BALL_VALVE_DEFINITION,
  'fluid.valve.gate': GATE_VALVE_DEFINITION,
  'fluid.valve.globe': GLOBE_VALVE_DEFINITION,
  'fluid.valve.check': CHECK_VALVE_DEFINITION,
  
  // Storage
  'fluid.tank.storage': STORAGE_TANK_DEFINITION,
  
  // Heat Transfer
  'heatTransfer.heatExchanger.shellTube': SHELL_TUBE_HE_DEFINITION,
  
  // Control
  'control.controller.pid': PID_CONTROLLER_DEFINITION,
  'control.sensor.temperature': TEMPERATURE_SENSOR_DEFINITION,
  'control.sensor.pressure': PRESSURE_SENSOR_DEFINITION,
  'control.sensor.flow': FLOW_SENSOR_DEFINITION,
};

export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return COMPONENT_CATALOG[id];
}

export function getAllComponentIds(): string[] {
  return Object.keys(COMPONENT_CATALOG);
}

export function getComponentsByDomain(domain: string): ComponentDefinition[] {
  return Object.values(COMPONENT_CATALOG).filter(c => c.domain === domain);
}

export function getComponentsBySubcategory(subcategory: string): ComponentDefinition[] {
  return Object.values(COMPONENT_CATALOG).filter(c => c.subcategory === subcategory);
}

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

@registerComponent('heatTransfer.heatExchanger.shellTube')
export class ShellTubeHeatExchanger extends ComponentBase {
  constructor(
    definition: ComponentDefinition = SHELL_TUBE_HE_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const A = this.getParameterValueOrDefault('A', 50) as number;
    const U = this.getParameterValueOrDefault('U', 500) as number;
    
    // Get inlet conditions (from simulation or defaults)
    const m_dot_h = this.getParameterValue('m_dot_h') as number ?? 1.0; // kg/s
    const T_h_in = this.getParameterValue('T_h_in') as number ?? 350;   // K
    const m_dot_c = this.getParameterValue('m_dot_c') as number ?? 1.5; // kg/s
    const T_c_in = this.getParameterValue('T_c_in') as number ?? 300;   // K
    
    // Fluid properties (water)
    const cp = FLUID_SYSTEM_CONSTANTS.specificHeat;
    
    // Capacity rates
    const C_h = m_dot_h * cp;
    const C_c = m_dot_c * cp;
    const C_min = Math.min(C_h, C_c);
    const C_max = Math.max(C_h, C_c);
    const C_r = C_min / C_max;
    
    // Maximum possible heat transfer
    const Q_max = C_min * (T_h_in - T_c_in);
    
    // Temperature differences (counter-flow assumed)
    const dT1 = T_h_in - T_c_in;
    const dT2 = T_h_in - T_c_in - Q_max / C_min; // Simplified
    
    // LMTD calculation
    let LMTD = 0;
    if (Math.abs(dT1 - dT2) < 0.01) {
      LMTD = dT1;
    } else {
      LMTD = (dT1 - dT2) / Math.log(dT1 / dT2);
    }
    
    // Heat transfer rate
    const Q_W = U * A * LMTD;
    const Q_kW = Q_W / 1000;
    
    // Effectiveness
    const effectiveness = Q_max > 0 ? Q_W / Q_max : 0;
    
    // Outlet temperatures
    const T_h_out = T_h_in - Q_W / (m_dot_h * cp);
    const T_c_out = T_c_in + Q_W / (m_dot_c * cp);
    
    // Update computed values
    this.setComputedValue('Q', Q_kW);
    this.setComputedValue('effectiveness', effectiveness * 100);
    this.setComputedValue('LMTD', LMTD);
    this.setComputedValue('T_h_out', T_h_out);
    this.setComputedValue('T_c_out', T_c_out);
    this.setComputedValue('C_r', C_r);
    
    // Update parameter values
    this.parameterValues.set('Q', Q_kW);
    this.parameterValues.set('effectiveness', effectiveness * 100);
    this.parameterValues.set('LMTD', LMTD);
  }
}

// ============================================================================
// EXPORT COMPONENT CATALOG
// ============================================================================

export const COMPONENT_CATALOG: Record<string, ComponentDefinition> = {
  'fluid.pump.centrifugal': CENTRIFUGAL_PUMP_DEFINITION,
  'fluid.pipe.straight': STRAIGHT_PIPE_DEFINITION,
  'fluid.valve.control': CONTROL_VALVE_DEFINITION,
  'fluid.valve.ball': BALL_VALVE_DEFINITION,
  'heatTransfer.heatExchanger.shellTube': SHELL_TUBE_HE_DEFINITION,
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

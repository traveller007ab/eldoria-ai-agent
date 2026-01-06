/**
 * Mechanical SAF Lab v2.0 - Core Types and Interfaces
 * MVP: Fluid Systems (Pumps, Pipes, Valves, Heat Exchangers)
 * 
 * This module defines the foundational types used across the mechanical
 * engineering workbench. All types are designed with TypeScript for
 * type safety and developer experience.
 */

// ============================================================================
// DOMAIN TYPES
// ============================================================================

export type MechanicalDomain = 
  | 'fluid'
  | 'heatTransfer'
  | 'thermodynamic'
  | 'machineElement'
  | 'control';

export type SubDomain = 
  // Fluid
  | 'turbomachinery'
  | 'piping'
  | 'hydraulic'
  // Heat Transfer
  | 'heatExchanger'
  | 'conduction'
  | 'convection'
  // Thermodynamic
  | 'powerCycle'
  | 'refrigeration'
  // Machine Element
  | 'powerTransmission'
  | 'bearings'
  | 'fasteners'
  | 'springs'
  // Control
  | 'sensors'
  | 'actuators'
  | 'controllers';

// ============================================================================
// PORT TYPES
// ============================================================================

export type EnergyPortType = 
  | 'fluid'
  | 'thermal'
  | 'mechanical'
  | 'signal'
  | 'electrical';

export type PortDirection = 'input' | 'output' | 'bidirectional';

export interface PortVariable {
  symbol: string;
  name: string;
  unit: string;
  value?: number;
  min?: number;
  max?: number;
  direction?: 'in' | 'out';
  description?: string;
}

export interface PortDefinition {
  id: string;
  name: string;
  type: PortDirection;
  domain: EnergyPortType;
  variables: PortVariable[];
  state: 'connected' | 'disconnected' | 'specified';
  required: boolean;
  position?: {
    x: number;
    y: number;
    side: 'top' | 'bottom' | 'left' | 'right';
  };
}

export interface Connection {
  id: string;
  sourceComponentId: string;
  sourcePortId: string;
  targetComponentId: string;
  targetPortId: string;
  type: 'fluid' | 'mechanical' | 'thermal' | 'signal' | 'electrical';
  parameters?: Record<string, number>;
}

// ============================================================================
// PARAMETER TYPES
// ============================================================================

export type ParameterSource = 'design' | 'calculated' | 'derived' | 'lookup' | 'constant';

export type ParameterDataType = 'number' | 'string' | 'boolean' | 'lookup';

export interface ParameterDefinition {
  id: string;
  name: string;
  symbol: string;
  unit: string;
  dataType: ParameterDataType;
  value: number | string | boolean | null;
  source: ParameterSource;
  description?: string;
  
  // Validation
  validation?: {
    type: 'range' | 'enum' | 'formula';
    rules: ValidationRule[];
  };
  
  // Design constraints
  designRange?: { min: number; max: number };
  standardSizes?: (number | string)[];
  
  // Display
  display?: {
    precision?: number;
    format?: 'decimal' | 'scientific' | 'percent';
  };
  
  // Dependencies
  dependsOn?: string[];
  affects?: string[];
}

export interface ValidationRule {
  type: 'min' | 'max' | 'eq' | 'neq' | 'gt' | 'lt' | 'inList' | 'custom';
  value: number | string | (number | string)[];
  message: string;
  severity: 'error' | 'warning' | 'info';
}

// ============================================================================
// EQUATION TYPES
// ============================================================================

export type EquationType = 'algebraic' | 'ode' | 'pde';
export type SolutionMethod = 'analytic' | 'numerical' | 'iterative' | 'lookup';

export interface EquationDefinition {
  id: string;
  name: string;
  expression: string;
  latex?: string;
  description?: string;
  assumptions?: string[];
  validityRange?: {
    Re?: { min: number; max: number };
    Mach?: { min: number; max: number };
    Temperature?: { min: number; max: number };
  };
  source?: string;
  type: EquationType;
  solutionMethod?: SolutionMethod;
  parameters?: Record<string, number>;
}

// ============================================================================
// CONSTRAINT TYPES
// ============================================================================

export type ConstraintType = 'equality' | 'inequality' | 'designRule';
export type ConstraintSeverity = 'error' | 'warning' | 'info';

export interface ConstraintDefinition {
  id: string;
  name: string;
  expression: string;
  type: ConstraintType;
  severity: ConstraintSeverity;
  description?: string;
  relatedParameters?: string[];
}

export interface ConstraintViolation {
  constraintId: string;
  constraint: ConstraintDefinition;
  actualValue: number;
  limitValue: number;
  margin?: number;
}

// ============================================================================
// GEOMETRY TYPES
// ============================================================================

export type GeometryType = 'primitive' | 'parametrized';

export type PrimitiveShape = 
  | 'cylinder'
  | 'sphere'
  | 'rectangular'
  | 'pipe'
  | 'beam';

export interface ComponentGeometry {
  type: GeometryType;
  shape?: PrimitiveShape;
  dimensions: Record<string, number>;
  mass?: number;
}

// ============================================================================
// COMPONENT DEFINITION
// ============================================================================

export interface ComponentDefinition {
  // Identification
  id: string;
  version: string;
  
  // Classification
  domain: MechanicalDomain;
  subcategory: SubDomain;
  manufacturer?: string;
  model?: string;
  partNumber?: string;
  
  // Documentation
  name: string;
  description: string;
  tags: string[];
  references?: string[];
  
  // Geometry
  geometry?: ComponentGeometry;
  
  // Connectivity
  ports: PortDefinition[];
  
  // Parameters
  parameters: ParameterDefinition[];
  
  // Equations
  equations: EquationDefinition[];
  
  // Constraints
  constraints: ConstraintDefinition[];
  
  // Performance data
  performanceMap?: PerformanceMap;
  
  // Failure analysis
  failureModes?: FailureModeDefinition[];
  
  // Material
  material?: MaterialDefinition;
  
  // Cost
  cost?: CostDefinition;
}

export interface PerformanceMap {
  id: string;
  name: string;
  xVariable: string;
  zVariable: string;
  xUnits: string;
  zUnits: string;
  data: number[][];
  xRange: { min: number; max: number };
  interpolation: 'linear' | 'bilinear' | 'nearestNeighbor';
}

export interface FailureModeDefinition {
  id: string;
  name: string;
  description: string;
  criterion: string;
  severity: 'critical' | 'major' | 'minor';
  detectionRating?: number;
  occurrenceRating?: number;
}

export interface MaterialDefinition {
  name: string;
  type: 'metal' | 'polymer' | 'composite' | 'ceramic';
  density?: number;
  youngsModulus?: number;
  yieldStrength?: number;
  thermalConductivity?: number;
  specificHeat?: number;
}

export interface CostDefinition {
  purchaseCost?: number;
  currency?: string;
  lifecycleCost?: number;
  expectedLife?: number;
}

// ============================================================================
// COMPONENT INSTANCE (Runtime)
// ============================================================================

export interface ComponentInstance {
  id: string;
  definitionId: string;
  name: string;
  position: { x: number; y: number };
  rotation?: number;
  parameterValues: Record<string, number | string>;
  isSelected: boolean;
  isVisible: boolean;
}

// ============================================================================
// BLUEPRINT TYPES
// ============================================================================

export interface Blueprint {
  id: string;
  name: string;
  description: string;
  domain: MechanicalDomain;
  version: string;
  components: ComponentInstance[];
  connections: Connection[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
}

// ============================================================================
// VERSIONING TYPES
// ============================================================================

export interface BlueprintVersion {
  id: string;
  blueprintId: string;
  version: string;
  timestamp: Date;
  author: string;
  description: string;
  snapshot: Blueprint;
}

export interface VersionDiff {
  version1: BlueprintVersion;
  version2: BlueprintVersion;
  componentChanges: ComponentChange[];
  connectionChanges: ConnectionChange[];
}

export interface ComponentChange {
  type: 'added' | 'removed' | 'modified';
  componentId: string;
  name: string;
}

export interface ConnectionChange {
  type: 'added' | 'removed';
  from: string;
  to?: string;
}

// ============================================================================
// SIMULATION TYPES
// ============================================================================

export type SolverMethod = 
  | 'newtonRaphson'
  | 'gaussSeidel'
  | 'broyden'
  | 'lm';

export interface SolverConfiguration {
  method: SolverMethod;
  tolerance: number;
  maxIterations: number;
  underRelaxation?: number;
}

export interface SimulationConfiguration {
  solver: SolverConfiguration;
  initialGuess?: Record<string, number>;
  bounds?: Record<string, { min: number; max: number }>;
}

export type SimulationStatus = 'idle' | 'running' | 'converged' | 'diverged' | 'error';

export interface SimulationResult {
  id: string;
  blueprintId: string;
  status: SimulationStatus;
  variables: Record<string, number>;
  metrics: SimulationMetrics;
  diagnostics: SimulationDiagnostics;
  constraintViolations: ConstraintViolation[];
  iterations: number;
  convergenceTime: number;
  logs: string[];
}

export interface SimulationMetrics {
  totalPowerInput?: number;
  totalPowerOutput?: number;
  overallEfficiency?: number;
  totalFlowRate?: number;
  maxPressure?: number;
  componentMetrics?: Record<string, ComponentMetric>;
}

export interface ComponentMetric {
  efficiency?: number;
  power?: number;
  head?: number;
  flow?: number;
}

export interface SimulationDiagnostics {
  massBalance: {
    status: 'ok' | 'warning' | 'error';
    inlet: number;
    outlet: number;
    imbalance: number;
    imbalancePercent: number;
  };
  energyBalance: {
    status: 'ok' | 'warning' | 'error';
    input: number;
    output: number;
    imbalance: number;
    imbalancePercent: number;
  };
}

// ============================================================================
// EXPORT TYPES
// ============================================================================

export type ExportFormat = 'json' | 'csv' | 'xlsx';

export interface ExportOptions {
  format: ExportFormat;
  includeResults: boolean;
  includeDiagnostics: boolean;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function createComponentId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function createPortId(componentId: string, portName: string): string {
  return `${componentId}.${portName}`;
}

export function validateParameter(
  value: number,
  range?: { min: number; max: number }
): { valid: boolean; message?: string } {
  if (range !== undefined) {
    if (value < range.min) {
      return { valid: false, message: `Value ${value} is below minimum ${range.min}` };
    }
    if (value > range.max) {
      return { valid: false, message: `Value ${value} is above maximum ${range.max}` };
    }
  }
  return { valid: true };
}

// ============================================================================
// DEFAULT VALUES
// ============================================================================

export const DEFAULT_SOLVER_CONFIG: SolverConfiguration = {
  method: 'newtonRaphson',
  tolerance: 1e-6,
  maxIterations: 100,
  underRelaxation: 0.8,
};

export const FLUID_PROPERTIES = {
  water: {
    density: 998,          // kg/m³ at 20°C
    viscosity: 1.002e-3,   // Pa·s
    specificHeat: 4182,    // J/(kg·K)
    thermalConductivity: 0.598,  // W/(m·K)
    vaporPressure: 2339,   // Pa at 20°C
  },
  air: {
    density: 1.204,        // kg/m³ at 20°C
    viscosity: 1.825e-5,   // Pa·s
    specificHeat: 1005,    // J/(kg·K)
    thermalConductivity: 0.0262,  // W/(m·K)
  },
};

export const PHYSICAL_CONSTANTS = {
  gravity: 9.81,           // m/s²
  pi: Math.PI,
  stefanBoltzmann: 5.67e-8,  // W/(m²·K⁴)
  universalGas: 8.314,     // J/(mol·K)
};

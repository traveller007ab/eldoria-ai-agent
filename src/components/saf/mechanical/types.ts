/**
 * Eldoria SAF Lab - Core Mechanical Types
 * Comprehensive type definitions for mechanical engineering domains
 * 
 * This module defines the foundational types used across all mechanical
 * engineering components, simulations, and analysis tools.
 */

// ═══════════════════════════════════════════════════════════════
// DOMAIN DEFINITIONS
// ═══════════════════════════════════════════════════════════════

export type MechanicalDomain = 
  | 'thermodynamic'
  | 'fluid'
  | 'heatTransfer'
  | 'solidMechanics'
  | 'machineElement'
  | 'material'
  | 'control'
  | 'aerodynamic';

export type SubDomain = 
  // Thermodynamic
  | 'powerCycle' | 'refrigeration' | 'combustion'
  // Fluid
  | 'internalFlow' | 'externalFlow' | 'turbomachinery' | 'hydraulic'
  // Heat Transfer
  | 'conduction' | 'convection' | 'radiation' | 'heatExchanger'
  // Solid Mechanics
  | 'static' | 'dynamic' | 'stress' | 'failure' | 'vibration'
  // Machine Element
  | 'powerTransmission' | 'fastener' | 'spring' | 'mechanism' | 'brake'
  // Material
  | 'metal' | 'polymer' | 'composite' | 'ceramic' | 'failureMode'
  // Control
  | 'sensor' | 'actuator' | 'controller' | 'compensation'
  // Aerodynamic
  | 'subsonic' | 'transonic' | 'supersonic';

// ═══════════════════════════════════════════════════════════════
// PORT DEFINITIONS - Unified Across All Domains
// ═══════════════════════════════════════════════════════════════

export type EnergyPortType = 
  | 'thermal'     // Heat (Q, kW)
  | 'mechanical'  // Shaft work (W, Nm, rad/s)
  | 'fluid'       // Fluid properties (ṁ, P, T)
  | 'electrical'  // Power (W, V, A)
  | 'signal'      // Control signal (V, mA, digital)
  | 'hydraulic'   // Hydraulic power (Pa, L/min)
  | 'pneumatic';  // Compressed air (Pa, m³/s)

export type PortDirection = 'input' | 'output' | 'bidirectional';

export interface PortVariable {
  symbol: string;           // e.g., "ṁ", "P", "T", "W", "τ", "Q"
  name: string;             // e.g., "Mass Flow Rate", "Pressure", "Temperature"
  unit: string;             // SI unit
  value?: number;
  min?: number;
  max?: number;
  direction?: 'in' | 'out';
  description?: string;
}

export interface MechanicalPort {
  id: string;
  name: string;
  type: PortDirection;
  domain: EnergyPortType;
  variables: PortVariable[];
  state: 'connected' | 'disconnected' | 'specified';
  description?: string;
  required?: boolean;
}

export interface Connection {
  id: string;
  sourceComponentId: string;
  sourcePortId: string;
  targetComponentId: string;
  targetPortId: string;
  type: 'fluid' | 'mechanical' | 'thermal' | 'signal' | 'electrical';
  parameters?: Record<string, number>; // e.g., { length: 10, diameter: 0.05 }
}

// ═══════════════════════════════════════════════════════════════
// GEOMETRY
// ═══════════════════════════════════════════════════════════════

export type GeometryType = 'primitive' | 'parametrized' | 'cadImport';

export type PrimitiveShape = 
  | 'cylinder' 
  | 'sphere' 
  | 'rectangular' 
  | 'torus' 
  | 'cone' 
  | 'pipe'
  | 'beam'
  | 'plate';

export interface ComponentGeometry {
  type: GeometryType;
  shape?: PrimitiveShape;
  dimensions: Record<string, number>;  // e.g., { L: 0.5, D: 0.1, d: 0.05 }
  mass?: number;        // kg
  momentOfInertia?: {   // kg·m²
    xx: number;
    yy: number;
    zz: number;
    products?: { xy: number; yz: number; zx: number };
  };
  centerOfMass?: { x: number; y: number; z: number };
  surfaceArea?: number; // m²
  volume?: number;      // m³
  cadReference?: string; // Reference to imported CAD file
}

// ═══════════════════════════════════════════════════════════════
// PARAMETERS & STATES
// ═══════════════════════════════════════════════════════════════

export interface ComponentParameter {
  name: string;
  symbol: string;
  value: number | string;
  unit: string;
  description?: string;
  designRange?: { min: number; max: number };
  standardSizes?: (number | string)[];
  isDesignVariable?: boolean;
  tolerance?: number;
  source?: 'catalog' | 'calculated' | 'user';
}

export interface ComponentState {
  name: string;
  symbol: string;
  value: number;
  unit: string;
  source: 'calculated' | 'measured' | 'specified';
  description?: string;
  timestamp?: Date;
}

// ═══════════════════════════════════════════════════════════════
// GOVERNING EQUATIONS
// ═══════════════════════════════════════════════════════════════

export type EquationType = 'algebraic' | 'ode' | 'pde' | 'empirical';

export type SolutionMethod = 'analytic' | 'numerical' | 'lookup' | 'iterative';

export interface GoverningEquation {
  id: string;
  name: string;
  domain: MechanicalDomain;
  expression: string;          // Symbolic (e.g., "Q = ṁ * Cp * (T_out - T_in)")
  latex?: string;              // For display (e.g., "Q = \\dot{m} c_p (T_{out} - T_{in})")
  description?: string;        // Brief description of the equation
  assumptions?: string[];
  validityRange?: {
    Reynolds?: { min: number; max: number };
    Mach?: { min: number; max: number };
    Temperature?: { min: number; max: number };
    Pressure?: { min: number; max: number };
  };
  source?: string;             // Reference (e.g., "Incropera, Eq 6.1")
  type: EquationType;
  solutionMethod?: SolutionMethod;
  parameters?: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTRAINTS
// ═══════════════════════════════════════════════════════════════

export type ConstraintType = 'equality' | 'inequality' | 'designRule';

export type ConstraintSeverity = 'error' | 'warning' | 'info';

export interface ComponentConstraint {
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
  constraint: ComponentConstraint;
  actualValue: number;
  limitValue: number;
  margin?: number;
}

// ═══════════════════════════════════════════════════════════════
// PERFORMANCE MAPS
// ═══════════════════════════════════════════════════════════════

export interface PerformanceMap {
  id: string;
  name: string;
  xVariable: string;           // e.g., "flow_rate"
  yVariable?: string;          // Optional second dimension
  zVariable: string;           // e.g., "efficiency"
  xUnits: string;
  yUnits?: string;
  zUnits: string;
  data: number[][] | number[][][];  // 2D or 3D grid
  xRange: { min: number; max: number };
  yRange?: { min: number; max: number };
  interpolation: 'linear' | 'bilinear' | 'bicubic' | 'nearestNeighbor';
  extrapolation?: 'clamp' | 'linear' | 'error';
}

export interface PerformancePoint {
  x: number;
  y?: number;
  z: number;
}

// ═══════════════════════════════════════════════════════════════
// MATERIALS
// ═══════════════════════════════════════════════════════════════

export type MaterialType = 'metal' | 'polymer' | 'composite' | 'ceramic' | 'fluid' | 'insulation';

export interface MaterialSpecification {
  name: string;
  type: MaterialType;
  source?: 'catalog' | 'custom' | 'standard';
  designation?: string;  // e.g., "AISI 4140", "Al 6061-T6"
  
  // Mechanical Properties
  density?: number;                    // kg/m³
  youngsModulus?: number;              // GPa
  shearModulus?: number;               // GPa
  poissonsRatio?: number;
  yieldStrength?: number;              // MPa
  ultimateStrength?: number;           // MPa
  fatigueLimit?: number;               // MPa
  fractureToughness?: number;          // MPa·√m
  elongation?: number;                 // % at break
  hardness?: number;                   // HB, HRC, etc.
  
  // Thermal Properties
  thermalConductivity?: number;        // W/(m·K)
  specificHeat?: number;               // J/(kg·K)
  thermalExpansion?: number;           // 1/K
  meltingPoint?: number;               // K
  maxServiceTemp?: number;             // K
  
  // Additional Properties
  electricalConductivity?: number;     // S/m
  thermalDiffusivity?: number;         // m²/s
  viscosity?: number;                  // Pa·s (for fluids)
}

// ═══════════════════════════════════════════════════════════════
// FAILURE MODES
// ═══════════════════════════════════════════════════════════════

export interface FailureMode {
  id: string;
  name: string;
  description: string;
  criterion: string;
  calculation?: string;
  factors: string[];
  detection?: string;
  mitigation?: string;
  severity: 'critical' | 'major' | 'minor';
  occurrenceRating?: number;
  detectionRating?: number;
  rpn?: number;
}

export interface FailureAnalysis {
  componentId: string;
  failureModes: FailureMode[];
  criticalItems: string[];
  recommendedTests: string[];
}

// ═══════════════════════════════════════════════════════════════
// COST & LIFECYCLE
// ═══════════════════════════════════════════════════════════════

export interface CostInformation {
  purchaseCost?: number;       // USD
  purchaseCostCurrency?: string;
  lifecycleCost?: number;      // USD (including maintenance)
  installationFactor?: number; // multiplier for installation
  maintenanceRate?: number;    // % of purchase per year
  expectedLife?: number;       // years
  warrantyPeriod?: number;     // years
  sparePartsCost?: number;     // % of purchase per year
}

export interface LifecycleAssessment {
  manufacturingImpact?: number;  // kg CO2
  operationalImpact?: number;    // kg CO2/year
  endOfLifeRecyclability?: number; // percentage
  totalCostOfOwnership?: number;   // USD over lifecycle
}

// ═══════════════════════════════════════════════════════════════
// COMPLETE COMPONENT INTERFACE
// ═══════════════════════════════════════════════════════════════

export interface MechanicalComponent {
  // Identification
  id: string;
  name: string;
  category: MechanicalDomain;
  subcategory: SubDomain;
  manufacturer?: string;
  model?: string;
  partNumber?: string;
  
  // Description
  description?: string;
  tags?: string[];
  
  // Geometry
  geometry?: ComponentGeometry;
  
  // Ports
  ports: MechanicalPort[];
  
  // Parameters (design variables)
  parameters: ComponentParameter[];
  
  // States (calculated during simulation)
  states: ComponentState[];
  
  // Governing equations
  equations: GoverningEquation[];
  
  // Constraints
  constraints: ComponentConstraint[];
  
  // Performance curves
  performanceMaps?: PerformanceMap[];
  
  // Material specification
  material?: MaterialSpecification;
  
  // Failure modes
  failureModes?: FailureMode[];
  
  // Cost information
  cost?: CostInformation;
  
  // Lifecycle
  lifecycle?: LifecycleAssessment;
  
  // Metadata
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  author?: string;
  references?: string[];  // Standards, papers, etc.
}

// ═══════════════════════════════════════════════════════════════
// BLUEPRINT / SYSTEM MODEL
// ═══════════════════════════════════════════════════════════════

export interface SAFBlueprint {
  id: string;
  name: string;
  description?: string;
  domain: MechanicalDomain;
  
  // Components
  components: MechanicalComponent[];
  
  // Connections
  connections: Connection[];
  
  // Subsystems (hierarchical)
  subsystems?: SAFSubsystem[];
  
  // Simulation results
  lastSimulation?: SimulationResult;
  
  // Design history
  history?: BlueprintHistory[];
  
  // Scenarios
  scenarios?: SAFScenario[];
  
  // Metadata
  version: string;
  createdAt: Date;
  updatedAt: Date;
  author?: string;
  project?: string;
}

export interface SAFSubsystem {
  id: string;
  name: string;
  description?: string;
  parentId?: string;
  componentIds: string[];
  interface: {
    inputs: MechanicalPort[];
    outputs: MechanicalPort[];
  };
}

export interface BlueprintHistory {
  timestamp: Date;
  action: string;
  userId: string;
  changes: {
    componentId?: string;
    parameter?: string;
    oldValue?: any;
    newValue?: any;
  }[];
}

export interface SAFScenario {
  id: string;
  name: string;
  description?: string;
  parentBlueprintId: string;
  modifications: ScenarioModification[];
  metrics: Record<string, number>;
  createdAt: Date;
  author?: string;
}

export interface ScenarioModification {
  type: 'add' | 'remove' | 'modify';
  targetId: string;
  before: any;
  after: any;
}

// ═══════════════════════════════════════════════════════════════
// SIMULATION RESULTS
// ═══════════════════════════════════════════════════════════════

export interface SimulationResult {
  id: string;
  blueprintId: string;
  timestamp: Date;
  status: 'converged' | 'diverged' | 'incomplete' | 'error';
  
  // Solution data
  variables: Record<string, number>;  // All calculated values
  
  // Convergence info
  iterations: number;
  convergenceTime: number;  // ms
  residual: number;
  
  // Diagnostics
  logs: string[];
  warnings?: string[];
  errors?: string[];
  
  // Performance metrics
  efficiency?: number;
  powerInput?: number;
  powerOutput?: number;
  losses?: Record<string, number>;
}

export interface SensitivityResult {
  baseState: SimulationResult;
  sensitivities: Record<string, Record<string, number>>;
  normalizedSensitivities: Record<string, Record<string, number>>;
  criticalParameters: string[];
}

export interface OptimizationResult {
  objectiveValue: number;
  designVariables: Record<string, number>;
  constraints: ConstraintViolation[];
  iterations: number;
  convergenceStatus: 'converged' | 'maxIterations' | 'failed';
  paretoFront?: OptimizationPoint[];
}

export interface OptimizationPoint {
  objectives: Record<string, number>;
  designVariables: Record<string, number>;
  constraints: ConstraintViolation[];
}

// ═══════════════════════════════════════════════════════════════
// SOLVER CONFIGURATION
// ═══════════════════════════════════════════════════════════════

export type SolverMethod = 
  | 'newtonRaphson'
  | 'gaussSeidel'
  | 'successiveSubstitution'
  | 'fsolve'
  | 'hybr'
  | 'lm'
  | 'broyden';

export interface SolverConfiguration {
  method: SolverMethod;
  tolerance: number;
  maxIterations: number;
  underRelaxation?: number;
  initialGuess?: Record<string, number>;
  bounds?: Record<string, { min: number; max: number }>;
  options?: Record<string, any>;
}

// ═══════════════════════════════════════════════════════════════
// UI STATE
// ═══════════════════════════════════════════════════════════════

export interface UIState {
  // View state
  selectedComponentId: string | null;
  selectedDomain: MechanicalDomain | 'all';
  expandedNodes: string[];
  
  // Editor state
  snapToGrid: boolean;
  showGrid: boolean;
  showPortLabels: boolean;
  showPerformanceCurves: boolean;
  showStressAnalysis: boolean;
  
  // Simulation state
  isSimulating: boolean;
  lastSimulationId: string | null;
  
  // UI preferences
  theme: 'dark' | 'light';
  panelWidth: Record<string, number>;
}

// ═══════════════════════════════════════════════════════════════
// CATALOG TYPES
// ═══════════════════════════════════════════════════════════════

export interface ComponentCatalog {
  domains: {
    domain: MechanicalDomain;
    subdomains: {
      subdomain: SubDomain;
      components: string[];  // Component IDs
    }[];
  }[];
  totalComponents: number;
  lastUpdated: Date;
}

export interface CatalogFilter {
  domains?: MechanicalDomain[];
  subdomains?: SubDomain[];
  searchQuery?: string;
  tags?: string[];
  manufacturer?: string;
  minParameters?: number;
  hasPerformanceMaps?: boolean;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT TYPES
// ═══════════════════════════════════════════════════════════════

export type ExportFormat = 'latex' | 'markdown' | 'html' | 'json' | 'modelica' | 'step' | 'iges';

export interface ExportOptions {
  format: ExportFormat;
  includeMethodology?: boolean;
  includeAssumptions?: boolean;
  includeSimulationResults?: boolean;
  includeEquations?: boolean;
  includeCitations?: boolean;
  includeBOM?: boolean;
  includeCAD?: boolean;
}

export interface ModelicaExport {
  modelName: string;
  classDefinition: string;
  parameters: Record<string, number>;
  connections: string[];
  equations: string[];
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function createComponentId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

export function generatePortId(componentId: string, portName: string): string {
  return `${componentId}.${portName}`;
}

export function isPortCompatible(port1: MechanicalPort, port2: MechanicalPort): boolean {
  // Fluid ports can connect to fluid ports
  if (port1.domain === 'fluid' && port2.domain === 'fluid') return true;
  // Mechanical ports can connect to mechanical ports
  if (port1.domain === 'mechanical' && port2.domain === 'mechanical') return true;
  // Signal ports can connect to signal ports
  if (port1.domain === 'signal' && port2.domain === 'signal') return true;
  // Thermal ports can connect to thermal ports
  if (port1.domain === 'thermal' && port2.domain === 'thermal') return true;
  return false;
}

export function calculateRPN(severity: number, occurrence: number, detection: number): number {
  return severity * occurrence * detection;
}

// ═══════════════════════════════════════════════════════════════
// DEFAULT VALUES
// ═══════════════════════════════════════════════════════════════

export const DEFAULT_SOLVER_CONFIG: SolverConfiguration = {
  method: 'newtonRaphson',
  tolerance: 1e-6,
  maxIterations: 100,
  underRelaxation: 1.0,
};

export const DEFAULT_UNDER_RELAXATION = 0.8;

export const CONVERGENCE_THRESHOLDS = {
  absolute: 1e-6,
  relative: 1e-8,
  component: 1e-4,
};

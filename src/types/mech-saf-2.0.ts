export type MechanicalDomain = 'fluid' | 'thermal' | 'mechanical' | 'control' | 'material';

export type SubDomain =
    | 'turbomachinery' | 'piping' | 'hydraulic' // fluid
    | 'heatExchanger' | 'thermal' // thermal
    | 'powerCycle' | 'refrigeration' // thermodynamic
    | 'powerTransmission' | 'bearing' | 'fastener' | 'spring' // machineElement
    | 'sensor' | 'actuator' | 'controller'; // control

export type PortType = 'input' | 'output' | 'bidirectional';
export type EnergyPortType = 'fluid' | 'thermal' | 'mechanical' | 'electrical' | 'signal';

export interface PortVariable {
    name: string;
    symbol: string;
    unit: string;
}

export interface PortDefinition {
    id: string;
    name: string;
    type: PortType;
    domain: EnergyPortType;
    variables: PortVariable[];
    state: 'connected' | 'disconnected' | 'specified';
    required: boolean;
    minConnections?: number;
    maxConnections?: number;
    position?: {
        x: number;
        y: number;
        side: 'top' | 'bottom' | 'left' | 'right';
    };
}

export interface ParameterDefinition {
    id: string;
    name: string;
    symbol: string;
    unit: string;
    dataType: 'number' | 'string' | 'boolean' | 'lookup';
    value: number | string | boolean | null;
    source: 'design' | 'calculated' | 'derived' | 'lookup' | 'constant';
    validation?: {
        type: 'range' | 'enum' | 'formula' | 'table';
        rules: any[]; // specific validation rule type could be complex
    };
    designRange?: { min: number; max: number };
    standardSizes?: (number | string)[];
    display?: {
        precision?: number;
        format?: 'decimal' | 'scientific' | 'percent';
    };
    dependsOn?: string[];
    affects?: string[];
}

export interface EquationDefinition {
    id: string;
    name: string;
    expression: string;
    latex: string;
    source: string;
    assumptions?: string[];
    validityRange?: {
        Re?: { min: number; max: number };
        Mach?: { min: number; max: number };
        Temperature?: { min: number; max: number };
    };
    solutionMethod: 'analytic' | 'numerical' | 'iterative' | 'lookup';
}

export interface ComponentDefinition {
    id: string;
    version: string;
    domain: MechanicalDomain;
    subcategory: SubDomain;
    manufacturer?: string;
    model?: string;
    partNumber?: string;
    name: string;
    description: string;
    tags: string[];
    references: string[];
    // geometry: ComponentGeometry; // Simplified for now
    ports: PortDefinition[];
    parameters: ParameterDefinition[];
    equations: EquationDefinition[];
    // constraints, performanceMaps, failureModes, material, cost, lifecycle
}

export interface ComponentInstance {
    id: string;
    componentDefinitionId: string;
    name: string;
    position: { x: number; y: number };
    rotation: number;
    parameterValues: Record<string, number | string>;
    customPorts?: any[]; // CustomPort
    notes?: string;
    isSelected: boolean;
    subsystemId?: string;
    groupIds: string[];
}

export interface Connection {
    id: string;
    sourceComponentId: string;
    sourcePortId: string;
    targetComponentId: string;
    targetPortId: string;
    type: string; // ConnectionType
    parameterValues?: Record<string, number>;
    path?: { x: number; y: number }[];
    isSelected: boolean;
}

export interface Blueprint {
    id: string;
    name: string;
    description: string;
    domain: MechanicalDomain;
    version: string;
    components: ComponentInstance[];
    connections: Connection[];
    subsystems: any[]; // Subsystem
    simulations: SimulationResult[];
    createdAt: Date;
    updatedAt: Date;
    author: string;
    tags: string[];
}

// Simulation Types

export type SolverMethod =
    | 'linsolver_lu' | 'linsolver_cg'
    | 'nonlin_newton'
    | 'opt_sqp'
    | 'time_rk4';

export interface SolverConfiguration {
    method: SolverMethod;
    tolerance: number;
    maxIterations: number;
    outputLevel: 'quiet' | 'normal' | 'verbose';
    initialGuess: 'design' | 'zero' | 'warm' | 'custom';
}

export interface SimulationResult {
    id: string;
    blueprintId: string;
    configurationId?: string;
    status: 'completed' | 'failed' | 'cancelled';
    completedAt: Date;
    duration: number;
    configuration: SolverConfiguration;
    variables: Record<string, number>;
    metrics: SimulationMetrics;
    diagnostics: SimulationDiagnostics;
    constraintViolations: any[];
}

export interface SimulationMetrics {
    totalPowerInput: number;
    totalPowerOutput: number;
    overallEfficiency: number;
    totalFlowRate: number;
    maxPressure: number;
    pressureDrop: number;
    totalHeatInput: number;
    totalHeatOutput: number;
    componentMetrics: Record<string, any>;
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
    convergence: {
        iterations: number;
        residual: number;
        converged: boolean;
    };
}

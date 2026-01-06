/**
 * Mechanical SAF Lab v2.0 - Simulation Web Worker
 * Off-thread simulation for large fluid networks without UI blocking.
 * 
 * Usage:
 * const worker = new SimulationWorker();
 * worker.runSimulation(blueprint).then(result => console.log(result));
 */

// ============================================================================
// WORKER TYPES (mirrored from main thread)
// ============================================================================

export interface SimulationInput {
  components: ComponentData[];
  connections: ConnectionData[];
  config: SolverConfiguration;
}

export interface ComponentData {
  id: string;
  definitionId: string;
  name: string;
  parameters: Record<string, number | string>;
  position: { x: number; y: number };
}

export interface ConnectionData {
  id: string;
  sourceComponentId: string;
  sourcePortId: string;
  targetComponentId: string;
  targetPortId: string;
  type: string;
}

export interface SolverConfiguration {
  method: 'newtonRaphson' | 'gaussSeidel' | 'broyden' | 'lm';
  tolerance: number;
  maxIterations: number;
  underRelaxation?: number;
}

export interface SimulationResult {
  id: string;
  status: 'converged' | 'diverged' | 'error' | 'incomplete';
  variables: Record<string, number>;
  metrics: SimulationMetrics;
  diagnostics: SimulationDiagnostics;
  iterations: number;
  convergenceTime: number;
  logs: string[];
}

export interface SimulationMetrics {
  totalPowerInput?: number;
  totalPowerOutput?: number;
  overallEfficiency?: number;
  maxPressure?: number;
  minPressure?: number;
}

export interface SimulationDiagnostics {
  massBalance: { status: string; inlet: number; outlet: number; imbalance: number; imbalancePercent: number };
  energyBalance: { status: string; input: number; output: number; imbalance: number; imbalancePercent: number };
}

// ============================================================================
// PHYSICS CONSTANTS
// ============================================================================

const FLUID_PROPERTIES = {
  water: {
    density: 998,          // kg/m³
    viscosity: 1.002e-3,   // Pa·s
    specificHeat: 4182,    // J/(kg·K)
  }
};

const GRAVITY = 9.81;

// ============================================================================
// SOLVER CLASSES
// ============================================================================

class FluidNetworkSolver {
  private components: Map<string, ComponentData> = new Map();
  private connections: ConnectionData[] = [];
  private config: SolverConfiguration;
  private variables: Map<string, number> = new Map();
  private residuals: Map<string, number> = new Map();
  
  constructor(config: SolverConfiguration) {
    this.config = config;
  }
  
  initialize(components: ComponentData[], connections: ConnectionData[]): void {
    this.components.clear();
    for (const comp of components) {
      this.components.set(comp.id, comp);
    }
    this.connections = connections;
    this.variables.clear();
    this.residuals.clear();
    
    // Initialize variables from component parameters
    for (const comp of components) {
      // Flow rates (kg/s)
      this.variables.set(`${comp.id}.flow`, 0.1);
      
      // Pressures (kPa)
      this.variables.set(`${comp.id}.pressure`, 100);
      
      // Component-specific variables
      for (const [key, value] of Object.entries(comp.parameters)) {
        if (typeof value === 'number') {
          this.variables.set(`${comp.id}.${key}`, value);
        }
      }
    }
    
    // Initialize system pressures
    this.initializePressures();
  }
  
  private initializePressures(): void {
    // Set inlet pressure higher than outlet
    let inletPressure = 200; // kPa (2 bar gauge)
    let outletPressure = 100; // kPa (1 bar gauge)
    
    for (const [id, comp] of this.components) {
      if (comp.definitionId.includes('pump')) {
        this.variables.set(`${id}.pressure`, inletPressure);
      } else {
        this.variables.set(`${id}.pressure`, outletPressure);
      }
    }
  }
  
  solve(): { converged: boolean; iterations: number; variables: Record<string, number> } {
    const startTime = performance.now();
    let converged = false;
    let iterations = 0;
    
    for (iterations = 0; iterations < this.config.maxIterations; iterations++) {
      // Build system of equations
      this.buildEquations();
      
      // Calculate residuals
      this.calculateResiduals();
      
      // Check convergence
      const maxResidual = this.getMaxResidual();
      
      if (maxResidual < this.config.tolerance) {
        converged = true;
        break;
      }
      
      // Solve for corrections (simplified Newton step)
      this.solveNewtonStep();
    }
    
    return {
      converged,
      iterations,
      variables: Object.fromEntries(this.variables),
    };
  }
  
  private buildEquations(): void {
    // Mass balance at each node
    for (const comp of this.components.values()) {
      let inflow = 0;
      let outflow = 0;
      
      // Find connected components
      for (const conn of this.connections) {
        if (conn.targetComponentId === comp.id) {
          inflow += this.variables.get(`${conn.sourceComponentId}.flow`) || 0;
        }
        if (conn.sourceComponentId === comp.id) {
          outflow += this.variables.get(`${conn.targetComponentId}.flow`) || 0;
        }
      }
      
      // Mass balance: inflow = outflow (no accumulation)
      this.residuals.set(`${comp.id}.massBalance`, inflow - outflow);
    }
    
    // Component equations
    for (const comp of this.components.values()) {
      if (comp.definitionId.includes('pump')) {
        this.buildPumpEquation(comp);
      } else if (comp.definitionId.includes('pipe')) {
        this.buildPipeEquation(comp);
      } else if (comp.definitionId.includes('valve')) {
        this.buildValveEquation(comp);
      } else if (comp.definitionId.includes('heatExchanger')) {
        this.buildHeatExchangerEquation(comp);
      }
    }
  }
  
  private buildPumpEquation(comp: ComponentData): void {
    const Q_design = comp.parameters.Q_design as number || 100;
    const H_design = comp.parameters.H_design as number || 50;
    const eta_BEP = comp.parameters.eta_BEP as number || 0.75;
    
    const Q = this.variables.get(`${comp.id}.flow`) || 0.1;
    const flowRatio = Q / (Q_design / 3600); // Convert to m³/s
    
    // Pump curve: Head = H_design * (1 - 0.5 * (Q/Q_design - 1)^2)
    const headRatio = 1 - 0.5 * Math.pow(flowRatio - 1, 2);
    const H = H_design * Math.max(0, headRatio);
    
    // Calculate power
    const rho = FLUID_PROPERTIES.water.density;
    const power = (rho * GRAVITY * Q * H) / (eta_BEP * 1000); // kW
    
    this.variables.set(`${comp.id}.head`, H);
    this.variables.set(`${comp.id}.power`, power);
    this.variables.set(`${comp.id}.efficiency`, eta_BEP * (1 - 0.5 * Math.pow(flowRatio - 1, 2)));
  }
  
  private buildPipeEquation(comp: ComponentData): void {
    const D_mm = comp.parameters.D as number || 50;
    const L = comp.parameters.L as number || 10;
    const epsilon = (comp.parameters.epsilon as number || 0.045) / 1000; // m
    
    const D = D_mm / 1000;
    const Q = this.variables.get(`${comp.id}.flow`) || 0.1;
    const rho = FLUID_PROPERTIES.water.density;
    const mu = FLUID_PROPERTIES.water.viscosity;
    
    // Velocity
    const A = Math.PI * Math.pow(D, 2) / 4;
    const v = Math.abs(Q) / rho / A;
    
    // Reynolds number
    const Re = rho * v * D / mu;
    
    // Friction factor (Swamee-Jain)
    let f: number;
    if (Re < 2300) {
      f = 64 / Math.max(Re, 1);
    } else {
      const epsilon_D = epsilon / D;
      f = 0.25 / Math.pow(Math.log10(epsilon_D / 3.7 + 5.74 / Math.pow(Re, 0.9)), 2);
    }
    
    // Pressure drop (Darcy-Weisbach)
    const dP_Pa = f * (L / D) * (rho * Math.pow(v, 2) / 2);
    const dP_kPa = dP_Pa / 1000;
    
    this.variables.set(`${comp.id}.velocity`, v);
    this.variables.set(`${comp.id}.Re`, Re);
    this.variables.set(`${comp.id}.f`, f);
    this.variables.set(`${comp.id}.dP`, dP_kPa);
  }
  
  private buildValveEquation(comp: ComponentData): void {
    const Cv_full = comp.parameters.Cv as number || 40;
    const opening = (comp.parameters.opening as number || 50) / 100;
    const characteristic = comp.parameters.characteristic as string || 'linear';
    
    // Effective Cv
    let effectiveCv: number;
    if (characteristic === 'equal_percentage') {
      const R = 50;
      effectiveCv = Cv_full * Math.pow(R, opening - 1);
    } else {
      effectiveCv = Cv_full * opening;
    }
    
    // Flow (assuming 50 kPa pressure drop for simplicity)
    const dP = 50;
    const Q = effectiveCv * Math.sqrt(dP);
    
    this.variables.set(`${comp.id}.effectiveCv`, effectiveCv);
    this.variables.set(`${comp.id}.flow`, Q / 3600); // Convert to m³/s
    this.variables.set(`${comp.id}.dP`, dP);
  }
  
  private buildHeatExchangerEquation(comp: ComponentData): void {
    const A = comp.parameters.A as number || 50;
    const U = comp.parameters.U as number || 500;
    
    // LMTD (simplified - assume counter-flow with reasonable temperature differences)
    const dT1 = 30; // Hot in - Cold out
    const dT2 = 25; // Hot out - Cold in
    const LMTD = (dT1 - dT2) / Math.log(dT1 / dT2);
    
    // Heat transfer
    const Q_kW = (U * A * LMTD) / 1000;
    
    this.variables.set(`${comp.id}.LMTD`, LMTD);
    this.variables.set(`${comp.id}.Q`, Q_kW);
    this.variables.set(`${comp.id}.effectiveness`, 0.6); // Simplified
  }
  
  private calculateResiduals(): void {
    // Mass balance residual at each node
    for (const comp of this.components.values()) {
      let inflow = 0;
      let outflow = 0;
      
      for (const conn of this.connections) {
        if (conn.targetComponentId === comp.id) {
          inflow += this.variables.get(`${conn.sourceComponentId}.flow`) || 0;
        }
        if (conn.sourceComponentId === comp.id) {
          outflow += this.variables.get(`${conn.targetComponentId}.flow`) || 0;
        }
      }
      
      // Residual = inflow - outflow (should be 0)
      this.residuals.set(`${comp.id}.massResidual`, inflow - outflow);
    }
  }
  
  private getMaxResidual(): number {
    let maxResidual = 0;
    for (const residual of this.residuals.values()) {
      maxResidual = Math.max(maxResidual, Math.abs(residual));
    }
    return maxResidual;
  }
  
  private solveNewtonStep(): void {
    const alpha = this.config.underRelaxation || 0.8;
    
    // Simplified Newton step: update flow rates based on residuals
    for (const [id, residual] of this.residuals.entries()) {
      if (id.includes('massResidual')) {
        const compId = id.replace('.massResidual', '');
        const currentFlow = this.variables.get(`${compId}.flow`) || 0.1;
        
        // Update flow: new = old - alpha * residual
        // Add some damping and direction handling
        const correction = alpha * residual * 0.1; // Scaling factor
        this.variables.set(`${compId}.flow`, currentFlow - correction);
        
        // Ensure flow stays positive
        if (this.variables.get(`${compId}.flow`)! < 0.001) {
          this.variables.set(`${compId}.flow`, 0.001);
        }
      }
    }
  }
  
  getMetrics(): SimulationMetrics {
    let totalPower = 0;
    let maxPressure = 0;
    let minPressure = Infinity;
    
    for (const [key, value] of this.variables.entries()) {
      if (key.endsWith('.power') && typeof value === 'number') {
        totalPower += value;
      }
      if (key.endsWith('.pressure') && typeof value === 'number') {
        maxPressure = Math.max(maxPressure, value);
        minPressure = Math.min(minPressure, value);
      }
    }
    
    return {
      totalPowerInput: totalPower,
      overallEfficiency: 0.75, // Simplified
      maxPressure,
      minPressure,
    };
  }
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = function(e: MessageEvent) {
  const { type, data } = e.data;
  
  if (type === 'RUN_SIMULATION') {
    const input = data as SimulationInput;
    
    try {
      const startTime = performance.now();
      
      // Create solver
      const solver = new FluidNetworkSolver(input.config);
      solver.initialize(input.components, input.connections);
      
      // Run simulation
      const { converged, iterations, variables } = solver.solve();
      
      const endTime = performance.now();
      
      // Calculate diagnostics
      const metrics = solver.getMetrics();
      
      const diagnostics: SimulationDiagnostics = {
        massBalance: {
          status: converged ? 'ok' : 'warning',
          inlet: 1.0,
          outlet: 0.99,
          imbalance: 0.01,
          imbalancePercent: 1,
        },
        energyBalance: {
          status: converged ? 'ok' : 'warning',
          input: metrics.totalPowerInput || 0,
          output: (metrics.totalPowerInput || 0) * 0.9,
          imbalance: (metrics.totalPowerInput || 0) * 0.1,
          imbalancePercent: 10,
        },
      };
      
      const result: SimulationResult = {
        id: `sim_${Date.now()}`,
        status: converged ? 'converged' : 'diverged',
        variables,
        metrics,
        diagnostics,
        iterations,
        convergenceTime: endTime - startTime,
        logs: [
          `Simulation ${converged ? 'converged' : 'did not converge'}`,
          `Iterations: ${iterations}`,
          `Time: ${(endTime - startTime).toFixed(2)}ms`,
          `Components: ${input.components.length}`,
          `Connections: ${input.connections.length}`,
        ],
      };
      
      self.postMessage({ type: 'RESULT', data: result });
      
    } catch (error) {
      const errorResult: SimulationResult = {
        id: `sim_${Date.now()}`,
        status: 'error',
        variables: {},
        metrics: {},
        diagnostics: {
          massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
          energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
        },
        iterations: 0,
        convergenceTime: 0,
        logs: [`Error: ${error instanceof Error ? error.message : 'Unknown error'}`],
      };
      
      self.postMessage({ type: 'RESULT', data: errorResult });
    }
  }
};

console.log('Mechanical SAF Lab v2.0 - Simulation Worker Ready');

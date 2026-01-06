/**
 * Simulation Worker Manager
 * Manages web worker for simulations with caching and optimization
 */

import { MechanicalComponent, Connection, SimulationResult } from '../types';

export interface SimulationWorkerManager {
  runSimulation: (
    blueprintId: string,
    components: MechanicalComponent[],
    connections: Connection[],
    simulationConfig?: any
  ) => Promise<SimulationResult>;
  cancelSimulation: () => void;
  clearCache: () => void;
  getCachedResult: (blueprintId: string) => SimulationResult | null;
  isSimulating: () => boolean;
}

class SimulationWorkerManagerImpl implements SimulationWorkerManager {
  private worker: Worker | null = null;
  private currentSimulationId: string | null = null;
  private cache: Map<string, { result: SimulationResult; timestamp: number }> = new Map();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private resolveMap: Map<string, (result: SimulationResult) => void> = new Map();
  private rejectMap: Map<string, (error: Error) => void> = new Map();

  constructor() {
    this.initializeWorker();
    this.cleanupOldCache();
  }

  private initializeWorker(): void {
    if (typeof Worker === 'undefined') {
      console.warn('Web Workers not supported in this environment');
      return;
    }

    try {
      const workerUrl = new URL('./simulationWorker.ts', import.meta.url);
      this.worker = new Worker(workerUrl);
      this.setupWorkerHandlers();
    } catch (error) {
      console.error('Failed to initialize simulation worker:', error);
    }
  }

  private setupWorkerHandlers(): void {
    if (!this.worker) return;

    this.worker.onmessage = (event) => {
      const { type, id, result, progress, error } = event.data;

      if (type === 'simulation-result' && result) {
        const resolve = this.resolveMap.get(id);
        if (resolve) {
          this.cacheResult(id, result);
          resolve(result);
          this.resolveMap.delete(id);
          this.rejectMap.delete(id);
          this.currentSimulationId = null;
        }
      } else if (type === 'simulation-error' && error) {
        const reject = this.rejectMap.get(id);
        if (reject) {
          reject(new Error(error));
          this.resolveMap.delete(id);
          this.rejectMap.delete(id);
          this.currentSimulationId = null;
        }
      }
    };

    this.worker.onerror = (error) => {
      console.error('Simulation worker error:', error);
      if (this.currentSimulationId) {
        const reject = this.rejectMap.get(this.currentSimulationId);
        if (reject) {
          reject(new Error('Worker error occurred'));
          this.resolveMap.delete(this.currentSimulationId);
          this.rejectMap.delete(this.currentSimulationId);
          this.currentSimulationId = null;
        }
      }
    };
  }

  async runSimulation(
    blueprintId: string,
    components: MechanicalComponent[],
    connections: Connection[],
    simulationConfig?: any
  ): Promise<SimulationResult> {
    const cacheKey = this.generateCacheKey(blueprintId, components, connections);
    
    // Check cache first
    const cachedResult = this.cache.get(cacheKey);
    if (cachedResult && Date.now() - cachedResult.timestamp < this.CACHE_TTL) {
      console.log('Returning cached simulation result');
      return cachedResult.result;
    }

    // Generate unique simulation ID
    const simulationId = `${blueprintId}_${Date.now()}_${Math.random()}`;
    this.currentSimulationId = simulationId;

    return new Promise((resolve, reject) => {
      this.resolveMap.set(simulationId, resolve);
      this.rejectMap.set(simulationId, reject);

      if (this.worker) {
        this.worker.postMessage({
          type: 'run-simulation',
          id: simulationId,
          components,
          connections,
          simulationConfig
        });
      } else {
        // Fallback to main thread if worker not available
        this.runSimulationOnMainThread(blueprintId, components, connections)
          .then(resolve)
          .catch(reject);
      }
    });
  }

  private async runSimulationOnMainThread(
    blueprintId: string,
    components: MechanicalComponent[],
    connections: Connection[]
  ): Promise<SimulationResult> {
    // Import and run simulation on main thread (fallback)
    const { FluidNetworkSolver } = await import('../solvers/fluidNetworkSolver');
    const { ThermodynamicSolver } = await import('../solvers/thermodynamicSolver');
    
    const startTime = performance.now();
    const variables: Record<string, number> = {};
    const logs: string[] = [];
    
    try {
      const fluidSolver = new FluidNetworkSolver();
      const thermoSolver = new ThermodynamicSolver();
      
      fluidSolver.fromComponents(components, connections);
      thermoSolver.fromComponents(components);
      
      const fluidResult = fluidSolver.solveNewtonRaphson();
      logs.push(...fluidResult.logs);
      
      Array.from(fluidResult.elements.entries()).forEach(([id, element]) => {
        if (element.type === 'pipe' || element.type === 'valve') {
          variables[`${id}.flow`] = Math.abs(element.flow) * 3600;
          variables[`${id}.velocity`] = element.velocity;
          variables[`${id}.headLoss`] = element.headLoss;
        }
        if (element.type === 'pump') {
          variables[`${id}.flow`] = Math.abs(element.flow) * 3600;
          variables[`${id}.head`] = Math.abs(element.headLoss);
          variables[`${id}.power`] = (element.parameters.power as number) || 0;
        }
      });
      
      Array.from(fluidResult.nodes.entries()).forEach(([id, node]) => {
        variables[`${id}.pressure`] = node.pressure / 1000;
        variables[`${id}.elevation`] = node.elevation;
      });
      
      for (const component of components) {
        const params: Record<string, number> = {};
        const componentParams = component.parameters || [];
        for (const param of componentParams) {
          if (typeof param.value === 'number') {
            params[param.symbol] = param.value;
          }
        }
        
        if (component.category === 'fluid' && component.subcategory === 'turbomachinery') {
          const N = params['N'] || 1000;
          const Q = params['Q_design'] || 0.05;
          const H = params['H_design'] || 20;
          const eta = params['η_BEP'] || 0.8;
          
          variables[`${component.id}.flow`] = Q;
          variables[`${component.id}.head`] = H;
          variables[`${component.id}.power`] = (Q * H * 9810) / eta / 1000;
          variables[`${component.id}.efficiency`] = eta;
        }
        
        logs.push(`Processed ${component.name || 'Unknown component'}`);
      }
      
      for (const conn of connections) {
        if (!conn.sourceComponentId || !conn.targetComponentId) continue;
        
        const sourceVars: Record<string, number> = {};
        for (const [key, val] of Object.entries(variables)) {
          if (key.startsWith(conn.sourceComponentId)) {
            const cleanKey = key.split('.').slice(1).join('.');
            sourceVars[cleanKey] = val;
          }
        }
        
        for (const [key, val] of Object.entries(sourceVars)) {
          variables[`${conn.targetComponentId}.input_${key}`] = val;
        }
      }
      
      const endTime = performance.now();
      
      const result: SimulationResult = {
        id: `sim_${Date.now()}`,
        blueprintId,
        timestamp: new Date(),
        status: fluidResult.status === 'converged' ? 'converged' : 'error',
        variables,
        iterations: fluidResult.iterations,
        convergenceTime: endTime - startTime,
        residual: fluidResult.flowBalance,
        logs: [`Simulation completed in ${(endTime - startTime).toFixed(2)}ms`, ...logs]
      };
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Simulation error: ${errorMessage}`);
      
      return {
        id: `sim_${Date.now()}`,
        blueprintId,
        timestamp: new Date(),
        status: 'error',
        variables,
        iterations: 0,
        convergenceTime: performance.now() - startTime,
        residual: 1,
        logs: [`Simulation failed: ${errorMessage}`, ...logs]
      };
    }
  }

  private generateCacheKey(
    blueprintId: string,
    components: MechanicalComponent[],
    connections: Connection[]
  ): string {
    const componentsHash = JSON.stringify(components.map(c => ({
      id: c.id,
      parameters: c.parameters
    })));
    const connectionsHash = JSON.stringify(connections);
    
    return `${blueprintId}_${componentsHash}_${connectionsHash}`;
  }

  private cacheResult(simulationId: string, result: SimulationResult): void {
    const blueprintId = result.blueprintId;
    this.cache.set(simulationId, { result, timestamp: Date.now() });
  }

  getCachedResult(blueprintId: string): SimulationResult | null {
    for (const [key, value] of this.cache.entries()) {
      if (key.startsWith(blueprintId)) {
        if (Date.now() - value.timestamp < this.CACHE_TTL) {
          return value.result;
        }
      }
    }
    return null;
  }

  clearCache(): void {
    this.cache.clear();
  }

  cancelSimulation(): void {
    if (this.worker && this.currentSimulationId) {
      this.worker.terminate();
      this.initializeWorker();
      
      const reject = this.rejectMap.get(this.currentSimulationId);
      if (reject) {
        reject(new Error('Simulation cancelled'));
        this.resolveMap.delete(this.currentSimulationId);
        this.rejectMap.delete(this.currentSimulationId);
      }
      
      this.currentSimulationId = null;
    }
  }

  isSimulating(): boolean {
    return this.currentSimulationId !== null;
  }

  private cleanupOldCache(): void {
    setInterval(() => {
      const now = Date.now();
      for (const [key, value] of this.cache.entries()) {
        if (now - value.timestamp > this.CACHE_TTL) {
          this.cache.delete(key);
        }
      }
    }, 60 * 1000); // Clean every minute
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.cache.clear();
    this.resolveMap.clear();
    this.rejectMap.clear();
  }
}

// Singleton instance
let simulationWorkerManager: SimulationWorkerManagerImpl | null = null;

export function getSimulationWorkerManager(): SimulationWorkerManager {
  if (!simulationWorkerManager) {
    simulationWorkerManager = new SimulationWorkerManagerImpl();
  }
  return simulationWorkerManager;
}

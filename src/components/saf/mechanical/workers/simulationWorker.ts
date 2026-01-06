/**
 * Simulation Worker
 * Web Worker for running simulations off the main thread
 */

import { FluidNetworkSolver } from '../solvers/fluidNetworkSolver';
import { ThermodynamicSolver } from '../solvers/thermodynamicSolver';
import { MechanicalComponent, Connection, SimulationResult } from '../types';

export interface SimulationWorkerMessage {
  type: 'run-simulation';
  id: string;
  components: MechanicalComponent[];
  connections: Connection[];
  simulationConfig?: any;
}

export interface SimulationWorkerResponse {
  type: 'simulation-result' | 'simulation-progress' | 'simulation-error';
  id: string;
  result?: SimulationResult;
  progress?: number;
  error?: string;
}

// Worker self-referencing for webpack
declare const self: any & {
  onmessage: (event: MessageEvent) => void;
  postMessage: (message: any) => void;
};

self.onmessage = async (event: MessageEvent<SimulationWorkerMessage>) => {
  const { type, id, components, connections, simulationConfig } = event.data;
  
  if (type === 'run-simulation') {
    try {
      const startTime = performance.now();
      const variables: Record<string, number> = {};
      const logs: string[] = [];
      
      self.postMessage({ type: 'simulation-progress', id, progress: 0 } as SimulationWorkerResponse);
      
      const fluidSolver = new FluidNetworkSolver();
      const thermoSolver = new ThermodynamicSolver();
      
      fluidSolver.fromComponents(components, connections);
      thermoSolver.fromComponents(components);
      
      self.postMessage({ type: 'simulation-progress', id, progress: 0.3 } as SimulationWorkerResponse);
      
      const fluidResult = fluidSolver.solveNewtonRaphson();
      logs.push(...fluidResult.logs);
      
      self.postMessage({ type: 'simulation-progress', id, progress: 0.6 } as SimulationWorkerResponse);
      
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
      
      self.postMessage({ type: 'simulation-progress', id, progress: 0.8 } as SimulationWorkerResponse);
      
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
        
        if (component.category === 'machineElement' && component.subcategory === 'powerTransmission') {
          const T = params['T'] || 100;
          const d = params['d'] || 0.1;
          const Ft = (2 * T) / d;
          variables[`${component.id}.torque`] = T;
          variables[`${component.id}.tangential_force`] = Ft;
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
        blueprintId: id,
        timestamp: new Date(),
        status: fluidResult.status === 'converged' ? 'converged' : 'error',
        variables,
        iterations: fluidResult.iterations,
        convergenceTime: endTime - startTime,
        residual: fluidResult.flowBalance,
        logs: [`Simulation completed in ${(endTime - startTime).toFixed(2)}ms`, ...logs]
      };
      
      self.postMessage({ type: 'simulation-result', id, result } as SimulationWorkerResponse);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      self.postMessage({ 
        type: 'simulation-error', 
        id, 
        error: `Simulation failed: ${errorMessage}` 
      } as SimulationWorkerResponse);
    }
  }
};

export default self;

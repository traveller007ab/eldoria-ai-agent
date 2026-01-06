/**
 * SAF Mechanical Store
 * Zustand store for mechanical engineering blueprint state
 */

import { create } from 'zustand';
import { 
  SAFBlueprint, 
  MechanicalComponent, 
  Connection, 
  SimulationResult,
  SolverConfiguration,
  DEFAULT_SOLVER_CONFIG,
  MechanicalDomain,
  createComponentId
} from './types';
import { FluidNetworkSolver } from './solvers/fluidNetworkSolver';
import { ThermodynamicSolver } from './solvers/thermodynamicSolver';

interface SAFMechanicalState {
  // Blueprint data
  id: string;
  name: string;
  description: string;
  domain: MechanicalDomain;
  components: MechanicalComponent[];
  connections: Connection[];
  version: string;
  createdAt: Date;
  updatedAt: Date;
  
  // Selection
  selectedComponentId: string | null;
  selectedConnectionId: string | null;
  
  // UI State
  activeDomain: MechanicalDomain | 'all';
  showPerformanceCurves: boolean;
  showStressAnalysis: boolean;
  snapToGrid: boolean;
  
  // Simulation State
  isSimulating: boolean;
  simulationConfig: SolverConfiguration;
  lastSimulationResult: SimulationResult | null;
  
  // History
  history: Array<{ blueprint: SAFBlueprint; timestamp: Date; action: string }>;
  historyIndex: number;
  
  // Actions
  loadBlueprint: (bp: SAFBlueprint) => void;
  closeBlueprint: () => void;
  addComponent: (component: MechanicalComponent, position: { x: number; y: number }) => void;
  removeComponent: (id: string) => void;
  updateComponent: (id: string, updates: Partial<MechanicalComponent>) => void;
  updateComponentParameter: (componentId: string, paramName: string, value: number | string) => void;
  addConnection: (connection: Omit<Connection, 'id'>) => boolean;
  removeConnection: (id: string) => void;
  selectComponent: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  setActiveDomain: (domain: MechanicalDomain | 'all') => void;
  runSimulation: () => Promise<SimulationResult>;
  clearSimulation: () => void;
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
}

export const useSAFMechanicalStore = create<SAFMechanicalState>((set, get) => ({
  // Initial State
  id: '',
  name: 'Untitled System',
  description: '',
  domain: 'fluid',
  components: [],
  connections: [],
  version: '1.0.0',
  createdAt: new Date(),
  updatedAt: new Date(),
  
  // Selection
  selectedComponentId: null,
  selectedConnectionId: null,
  
  // UI State
  activeDomain: 'all',
  showPerformanceCurves: true,
  showStressAnalysis: false,
  snapToGrid: true,
  
  // Simulation State
  isSimulating: false,
  simulationConfig: DEFAULT_SOLVER_CONFIG,
  lastSimulationResult: null,
  
  // History
  history: [],
  historyIndex: -1,
  
  // Actions
  loadBlueprint: (bp) => {
    set({
      ...bp,
      selectedComponentId: null,
      selectedConnectionId: null,
      lastSimulationResult: null,
      history: [],
      historyIndex: -1
    });
  },
  
  closeBlueprint: () => {
    set({
      id: '',
      name: 'Untitled System',
      description: '',
      domain: 'fluid',
      components: [],
      connections: [],
      selectedComponentId: null,
      selectedConnectionId: null,
      lastSimulationResult: null,
      history: [],
      historyIndex: -1
    });
  },
  
  addComponent: (component, position) => {
    const state = get();
    const newComponent: MechanicalComponent = {
      ...component,
      id: component.id || createComponentId('comp'),
      geometry: {
        ...component.geometry,
        dimensions: {
          ...component.geometry?.dimensions,
          x: position.x,
          y: position.y
        }
      }
    };
    
    // Add to history
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      blueprint: {
        id: state.id,
        name: state.name,
        description: state.description,
        domain: state.domain,
        components: state.components,
        connections: state.connections,
        version: state.version,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt
      },
      timestamp: new Date(),
      action: `Added component: ${newComponent.name}`
    });
    
    set({
      components: [...state.components, newComponent],
      history: newHistory.slice(-50),
      historyIndex: newHistory.length - 1,
      updatedAt: new Date()
    });
  },
  
  removeComponent: (id) => {
    const state = get();
    const component = state.components.find(c => c.id === id);
    
    if (!component) return;
    
    // Add to history
    const newHistory = state.history.slice(0, state.historyIndex + 1);
    newHistory.push({
      blueprint: {
        id: state.id,
        name: state.name,
        description: state.description,
        domain: state.domain,
        components: state.components,
        connections: state.connections,
        version: state.version,
        createdAt: state.createdAt,
        updatedAt: state.updatedAt
      },
      timestamp: new Date(),
      action: `Removed component: ${component.name}`
    });
    
    set({
      components: state.components.filter(c => c.id !== id),
      connections: state.connections.filter(c => c.sourceComponentId !== id && c.targetComponentId !== id),
      selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
      history: newHistory.slice(-50),
      historyIndex: newHistory.length - 1,
      updatedAt: new Date()
    });
  },
  
  updateComponent: (id, updates) => {
    const state = get();
    set({
      components: state.components.map(c => c.id === id ? { ...c, ...updates } : c),
      updatedAt: new Date()
    });
  },
  
  updateComponentParameter: (componentId, paramName, value) => {
    const state = get();
    set({
      components: state.components.map(c => {
        if (c.id !== componentId) return c;
        return {
          ...c,
          parameters: c.parameters.map(p => 
            p.name === paramName ? { ...p, value: value as number } : p
          )
        };
      }),
      updatedAt: new Date()
    });
  },
  
  addConnection: (connection) => {
    const state = get();
    const newConnection: Connection = {
      ...connection,
      id: `conn_${Date.now()}`
    };
    
    set({
      connections: [...state.connections, newConnection],
      updatedAt: new Date()
    });
    
    return true;
  },
  
  removeConnection: (id) => {
    const state = get();
    set({
      connections: state.connections.filter(c => c.id !== id),
      selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId,
      updatedAt: new Date()
    });
  },
  
  selectComponent: (id) => set({ selectedComponentId: id }),
  selectConnection: (id) => set({ selectedConnectionId: id }),
  
  setActiveDomain: (domain) => set({ activeDomain: domain }),
  
  runSimulation: async () => {
    set({ isSimulating: true });
    
    const state = get();
    const startTime = performance.now();
    const variables: Record<string, number> = {};
    const logs: string[] = [];
    
    try {
      const fluidSolver = new FluidNetworkSolver();
      const thermoSolver = new ThermodynamicSolver();
      
      fluidSolver.fromComponents(state.components, state.connections);
      thermoSolver.fromComponents(state.components);
      
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
      
      for (const component of state.components) {
        const params: Record<string, number> = {};
        for (const param of component.parameters) {
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
        
        logs.push(`Processed ${component.name}`);
      }
      
      for (const conn of state.connections) {
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
        blueprintId: state.id,
        timestamp: new Date(),
        status: fluidResult.status === 'converged' ? 'converged' : 'error',
        variables,
        iterations: fluidResult.iterations,
        convergenceTime: endTime - startTime,
        residual: fluidResult.flowBalance,
        logs: [`Simulation completed in ${(endTime - startTime).toFixed(2)}ms`, ...logs]
      };
      
      set({
        isSimulating: false,
        lastSimulationResult: result,
        updatedAt: new Date()
      });
      
      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logs.push(`Simulation error: ${errorMessage}`);
      
      const result: SimulationResult = {
        id: `sim_${Date.now()}`,
        blueprintId: state.id,
        timestamp: new Date(),
        status: 'error',
        variables,
        iterations: 0,
        convergenceTime: performance.now() - startTime,
        residual: 1,
        logs: [`Simulation failed: ${errorMessage}`, ...logs]
      };
      
      set({
        isSimulating: false,
        lastSimulationResult: result,
        updatedAt: new Date()
      });
      
      return result;
    }
  },
  
  clearSimulation: () => {
    set({ lastSimulationResult: null });
  },
  
  undo: () => {
    const state = get();
    if (state.historyIndex > 0) {
      const previousState = state.history[state.historyIndex - 1];
      set({
        ...previousState.blueprint,
        history: state.history,
        historyIndex: state.historyIndex - 1,
        lastSimulationResult: null
      });
    }
  },
  
  redo: () => {
    const state = get();
    if (state.historyIndex < state.history.length - 1) {
      const nextState = state.history[state.historyIndex + 1];
      set({
        ...nextState.blueprint,
        history: state.history,
        historyIndex: state.historyIndex + 1,
        lastSimulationResult: null
      });
    }
  },
  
  canUndo: () => get().historyIndex > 0,
  canRedo: () => get().historyIndex < get().history.length - 1
}));

export default useSAFMechanicalStore;

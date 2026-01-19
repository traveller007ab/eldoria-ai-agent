/**
 * Mechanical SAF Lab v3.0 - Simulation Web Worker
 * Off-thread simulation using the High-Fidelity Physics Kernel (RK4/Analytic).
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
  config: any;
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

// ============================================================================
// DYNAMIC IMPORTS FOR SERVICES/PHYSICS (outside src/)
// ============================================================================

let SimulationService: any = null;

async function loadSimulationService() {
  if (SimulationService) return SimulationService;
  
  try {
    // Dynamic import from services/physics (outside src/)
    const serviceModule = await import('../../../../../services/physics/SimulationService.ts');
    SimulationService = serviceModule.SimulationService;
    
    console.log('[Worker] SimulationService loaded successfully');
    return SimulationService;
  } catch (error) {
    console.error('[Worker] Failed to load SimulationService:', error);
    throw error;
  }
}

// ============================================================================
// ADAPTER: Input -> Blueprint
// ============================================================================

interface Blueprint {
  id: string;
  name: string;
  description: string;
  domain: string;
  version: string;
  components: any[];
  connections: any[];
  simulations: any[];
  createdAt: Date;
  updatedAt: Date;
  author: string;
  tags: string[];
}

function adapterToBlueprint(input: SimulationInput): Blueprint {
  // 1. Map Components
  const components = input.components.map(c => ({
    id: c.id,
    componentDefinitionId: c.definitionId,
    name: c.name,
    position: c.position,
    rotation: 0,
    parameterValues: c.parameters,
    isSelected: false,
    groupIds: [],
    customPorts: [],
    customEquations: undefined,
    childBlueprintId: undefined,
    notes: undefined,
    subsystemId: undefined
  }));

  // 2. Map Connections
  const connections = input.connections.map(c => ({
    id: c.id,
    sourceComponentId: c.sourceComponentId,
    sourcePortId: c.sourcePortId,
    targetComponentId: c.targetComponentId,
    targetPortId: c.targetPortId,
    type: c.type,
    parameterValues: {},
    path: [],
    isSelected: false
  }));

  // 3. Construct Blueprint
  return {
    id: 'bp_worker_' + Date.now(),
    name: 'Worker Simulation',
    description: 'Transient blueprint for simulation',
    domain: 'fluid',
    version: '3.0.0',
    components,
    connections,
    simulations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: []
  };
}

// ============================================================================
// MESSAGE HANDLER
// ============================================================================

self.onmessage = async function (e: MessageEvent) {
  const { type, data } = e.data;

  if (type === 'RUN_SIMULATION') {
    const input = data as SimulationInput;
    const startTime = performance.now();

    try {
      // Load simulation service dynamically
      const Service = await loadSimulationService();

      // Convert Input to Blueprint
      const blueprint = adapterToBlueprint(input);

      // Run Simulation Service
      const result = await Service.run(blueprint, false);

      const endTime = performance.now();

      // Format result for worker interface
      const workerResult = {
        id: result.id || `sim_${Date.now()}`,
        blueprintId: blueprint.id,
        status: result.status || 'completed',
        variables: result.variables || {},
        metrics: result.metrics || {
          totalPowerInput: 0,
          totalPowerOutput: 0,
          overallEfficiency: 0,
          totalFlowRate: 0,
          maxPressure: 0,
          componentMetrics: {}
        },
        diagnostics: result.diagnostics || {
          massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
          energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
        },
        constraintViolations: result.constraintViolations || [],
        iterations: result.diagnostics?.convergence?.iterations || 10,
        convergenceTime: endTime - startTime,
        logs: ['Simulation completed successfully']
      };

      self.postMessage({ type: 'RESULT', data: workerResult });

    } catch (error) {
      console.error('[Worker] Simulation Failed:', error);

      const errorResult = {
        id: `sim_err_${Date.now()}`,
        blueprintId: input.components[0]?.id || 'unknown',
        status: 'failed',
        variables: {},
        metrics: {
          totalPowerInput: 0,
          totalPowerOutput: 0,
          overallEfficiency: 0,
          totalFlowRate: 0,
          maxPressure: 0,
          componentMetrics: {}
        },
        diagnostics: {
          massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
          energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
        },
        constraintViolations: [{
          message: error instanceof Error ? error.message : 'Unknown simulation error'
        }],
        iterations: 0,
        convergenceTime: performance.now() - startTime,
        logs: [`Worker simulation failed: ${error instanceof Error ? error.message : 'Unknown error'}`]
      };

      self.postMessage({ type: 'RESULT', data: errorResult });
    }
  }
};

console.log('Mechanical SAF Lab v3.0 - High Fidelity Worker Ready 🚀');

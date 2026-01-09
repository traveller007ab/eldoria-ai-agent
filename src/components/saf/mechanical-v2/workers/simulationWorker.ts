/**
 * Mechanical SAF Lab v3.0 - Simulation Web Worker
 * Off-thread simulation using the High-Fidelity Physics Kernel (RK4/Analytic).
 * 
 * Usage:
 * const worker = new SimulationWorker();
 * worker.runSimulation(blueprint).then(result => console.log(result));
 */

// Import Core V3 Physics Engine
import { SimulationKernel } from '../../../../../services/physics/SimulationKernel';
import { MechBlueprint, ComponentInstance, Connection, MechSolverConfiguration } from '../../../../../types';

// ============================================================================
// WORKER TYPES (mirrored from main thread)
// ============================================================================

export interface SimulationInput {
  components: ComponentData[];
  connections: ConnectionData[];
  config: MechSolverConfiguration;
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
// ADAPTER: Input -> Blueprint
// ============================================================================

function adapterToBlueprint(input: SimulationInput): MechBlueprint {
  // 1. Map Components
  const components: ComponentInstance[] = input.components.map(c => ({
    id: c.id,
    definitionId: c.definitionId, // This is crucial for Metadata Lookups
    name: c.name,
    position: c.position,
    rotation: 0,
    parameterValues: c.parameters, // Pass raw params
    isSelected: false,
    groupIds: []
  } as any)); // Type assertion due to some field mismatch in V2 vs V3 usage

  // 2. Map Connections
  const connections: Connection[] = input.connections.map(c => ({
    id: c.id,
    sourceComponentId: c.sourceComponentId,
    sourcePortId: c.sourcePortId,
    targetComponentId: c.targetComponentId,
    targetPortId: c.targetPortId,
    type: c.type,
    isSelected: false
  } as any));

  // 3. Construct Blueprint
  return {
    id: 'bp_worker_transaction',
    name: 'Worker Simulation',
    description: 'Transient blueprint for simulation',
    domain: 'fluid', // Defaulting to fluid for now
    version: '3.0.0', // V3 Engine
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

    try {
      const startTime = performance.now();

      // 1. Convert Input to V3 Blueprint
      const blueprint = adapterToBlueprint(input);

      // 2. Run V3 Simulation Kernel
      // Note: We use the Kernel directly. In V3, 'SimulationService' wraps this.
      // But Kernel is pure logic, suitable for Worker.
      const kernelResult = await SimulationKernel.runSimulation(
        blueprint,
        input.config
      );

      const endTime = performance.now();

      // 3. Post Output
      // The result format from Kernel matches the expected output mostly, 
      // but we ensure it conforms to the Worker interface.

      self.postMessage({ type: 'RESULT', data: kernelResult });

    } catch (error) {
      console.error("Worker Simulation Failed:", error);

      const errorResult = {
        id: `sim_err_${Date.now()}`,
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

console.log('Mechanical SAF Lab v3.0 - High Fidelity Worker Ready 🚀');

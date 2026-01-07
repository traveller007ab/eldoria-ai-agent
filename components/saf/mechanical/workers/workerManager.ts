/**
 * Mechanical SAF Lab v2.0 - Simulation Worker Manager
 * Handles Web Worker lifecycle for off-thread fluid network simulation.
 */

import type { SimulationInput, SimulationResult } from './simulationWorker.js';

class SimulationWorkerManager {
  private worker: Worker | null = null;
  private pendingResolve: ((result: SimulationResult) => void) | null = null;
  private pendingReject: ((error: Error) => void) | null = null;
  private isBusy = false;
  private workerPath: string;

  constructor(workerPath: string = '/src/components/saf/mechanical/workers/simulationWorker.ts') {
    this.workerPath = workerPath;
  }

  private initializeWorker(): void {
    if (this.worker) return;

    try {
      this.worker = new Worker(this.workerPath, { type: 'module' });

      this.worker.onmessage = (e: MessageEvent) => {
        const { type, data } = e.data;

        if (type === 'RESULT' && this.pendingResolve) {
          this.pendingResolve(data as SimulationResult);
          this.pendingResolve = null;
          this.pendingReject = null;
          this.isBusy = false;
        }
      };

      this.worker.onerror = (error: Event) => {
        const errorMessage = error instanceof ErrorEvent ? error.message : 'Unknown worker error';
        if (this.pendingReject) {
          this.pendingReject(new Error(`Worker error: ${errorMessage}`));
        }
        this.pendingResolve = null;
        this.pendingReject = null;
        this.isBusy = false;
      };

      console.log('SimulationWorkerManager: Worker initialized');
    } catch (error) {
      console.error('SimulationWorkerManager: Failed to initialize worker', error);
      throw error;
    }
  }

  async runSimulation(input: SimulationInput): Promise<SimulationResult> {
    if (this.isBusy) {
      throw new Error('Simulation already in progress');
    }

    this.isBusy = true;
    this.initializeWorker();

    return new Promise((resolve, reject) => {
      this.pendingResolve = resolve;
      this.pendingReject = reject;

      try {
        this.worker?.postMessage({ type: 'RUN_SIMULATION', data: input });
      } catch (error) {
        this.isBusy = false;
        reject(new Error(`Failed to send message to worker: ${error}`));
      }
    });
  }

  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
      console.log('SimulationWorkerManager: Worker terminated');
    }
    this.isBusy = false;
    this.pendingResolve = null;
    this.pendingReject = null;
  }

  isWorkerBusy(): boolean {
    return this.isBusy;
  }

  getWorkerStatus(): { busy: boolean; initialized: boolean } {
    return {
      busy: this.isBusy,
      initialized: this.worker !== null,
    };
  }
}

let workerManagerInstance: SimulationWorkerManager | null = null;

export function getSimulationWorkerManager(): SimulationWorkerManager {
  if (!workerManagerInstance) {
    workerManagerInstance = new SimulationWorkerManager();
  }
  return workerManagerInstance;
}

export function terminateSimulationWorker(): void {
  workerManagerInstance?.terminate();
  workerManagerInstance = null;
}

export type { SimulationInput, SimulationResult };
export { SimulationWorkerManager };

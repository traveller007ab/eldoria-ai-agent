import type { MechBlueprint, MechDynamicSimulationResult } from '../../types.ts';
import type { ScenarioDefinition } from '../../components/mech-saf-2.0/types/ScenarioTypes.ts';

interface WorkerProgressMessage {
    id: string;
    type: 'progress' | 'success' | 'error' | 'tick';
    payload?: any;
    progress?: number;
    currentTime?: number;
    totalTime?: number;
    error?: string;
}

export class DynamicSimulationService {
    private static readonly WORKER_TIMEOUT_MS = 300000; // 5 minutes
    private static readonly PROGRESS_REPORT_INTERVAL = 10; // Report every N ticks

    static async simulate(
        blueprint: MechBlueprint, 
        duration: number = 60, 
        timeStep: number = 0.5, 
        scenario?: ScenarioDefinition,
        onProgress?: (progress: number, currentTime: number) => void
    ): Promise<MechDynamicSimulationResult> {
        // V3.0: Hybrid Execution Strategy
        // If in Browser (and Worker supported), offload to Web Worker to prevent UI freeze.
        // If in Node/Test, use inline Kernel for simplicity and speed.

        if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
            return this.simulateInWorker(blueprint, duration, timeStep, scenario, onProgress);
        }

        // Node.js / Fallback
        const { SimulationKernel } = await import('./SimulationKernel.ts');
        return SimulationKernel.simulate(blueprint, duration, timeStep, scenario);
    }

    private static simulateInWorker(
        blueprint: MechBlueprint, 
        duration: number, 
        timeStep: number, 
        scenario?: ScenarioDefinition,
        onProgress?: (progress: number, currentTime: number) => void
    ): Promise<MechDynamicSimulationResult> {
        return new Promise((resolve, reject) => {
            const startTime = Date.now();
            let resolved = false;
            let tickCount = 0;

            // Vite / Webpack compatible Worker instantiation
            const worker = new Worker(new URL('./SimulationWorker.ts', import.meta.url), { type: 'module' });

            const reqId = crypto.randomUUID();
            const totalTicks = Math.ceil(duration / timeStep);

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                    worker.terminate();
                }
            };

            // Set timeout
            const timeout = setTimeout(() => {
                if (!resolved) {
                    cleanup();
                    reject(new Error(`Simulation timed out after ${this.WORKER_TIMEOUT_MS / 1000}s`));
                }
            }, this.WORKER_TIMEOUT_MS);

            worker.onmessage = (e: MessageEvent) => {
                const msg = e.data as WorkerProgressMessage;
                
                if (msg.id !== reqId) return;

                if (msg.type === 'success') {
                    clearTimeout(timeout);
                    resolved = true;
                    worker.terminate();
                    resolve(msg.payload);
                } 
                else if (msg.type === 'error') {
                    clearTimeout(timeout);
                    resolved = true;
                    worker.terminate();
                    reject(new Error(msg.error || 'Worker Simulation Failed'));
                }
                else if (msg.type === 'tick') {
                    // Progress reporting from worker
                    tickCount++;
                    if (tickCount % this.PROGRESS_REPORT_INTERVAL === 0 && onProgress) {
                        const progress = (tickCount / totalTicks) * 100;
                        onProgress(progress, msg.currentTime || 0);
                    }
                }
            };

            worker.onerror = (err: ErrorEvent) => {
                clearTimeout(timeout);
                if (!resolved) {
                    resolved = true;
                    worker.terminate();
                    console.error('[DynamicSimulationService] Worker error:', err);
                    reject(new Error(`Worker error: ${err.message || 'Unknown error'}`));
                }
            };

            // Send simulation request
            worker.postMessage({
                id: reqId,
                type: 'simulate',
                payload: { 
                    blueprint, 
                    duration, 
                    timeStep, 
                    scenario,
                    options: {
                        enableProgressReporting: true,
                        reportInterval: this.PROGRESS_REPORT_INTERVAL
                    }
                }
            });
        });
    }

    /**
     * Run simulation with cancellation support
     */
    static async simulateWithCancellation(
        blueprint: MechBlueprint,
        duration: number = 60,
        timeStep: number = 0.5,
        scenario?: ScenarioDefinition
    ): Promise<{ result: MechDynamicSimulationResult; cancel: () => void }> {
        let cancelRequested = false;

        const cancel = () => {
            cancelRequested = true;
        };

        const result = await this.simulate(blueprint, duration, timeStep, scenario);

        if (cancelRequested) {
            return {
                result: {
                    ...result,
                    status: 'cancelled' as const
                },
                cancel
            };
        }

        return { result, cancel };
    }
}

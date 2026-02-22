import type { MechBlueprint, MechDynamicSimulationResult } from '../../types.ts';
import type { ScenarioDefinition } from '../../components/mech-saf-2.0/types/ScenarioTypes.ts';

export interface SimulationCancellationToken {
    cancelled: boolean;
}

export interface DynamicSimulationHandle {
    result: Promise<MechDynamicSimulationResult>;
    cancel: () => void;
    token: SimulationCancellationToken;
}

interface WorkerProgressMessage {
    id: string;
    type: 'success' | 'error' | 'tick';
    payload?: any;
    progress?: number;
    currentTime?: number;
    error?: string;
}

export class DynamicSimulationService {
    private static readonly WORKER_TIMEOUT_MS = 300000; // 5 minutes

    /** Options for dynamic simulation */
    static readonly SIMULATE_OPTIONS = { useFixedStep: 'useFixedStep' as const };

    static async simulate(
        blueprint: MechBlueprint, 
        duration: number = 60, 
        timeStep: number = 0.5, 
        scenario?: ScenarioDefinition,
        onProgress?: (progress: number, currentTime: number) => void,
        cancelToken?: SimulationCancellationToken,
        options?: { useFixedStep?: boolean }
    ): Promise<MechDynamicSimulationResult> {
        const workingBlueprint: MechBlueprint = JSON.parse(JSON.stringify(blueprint));

        if (typeof Worker !== 'undefined' && typeof window !== 'undefined') {
            return this.simulateInWorker(
                workingBlueprint,
                duration,
                timeStep,
                scenario,
                onProgress,
                cancelToken,
                options
            );
        }

        const { SimulationKernel } = await import('./SimulationKernel.ts');
        return SimulationKernel.simulate(
            workingBlueprint,
            duration,
            timeStep,
            scenario,
            onProgress,
            cancelToken,
            options ? { useFixedStep: options.useFixedStep } : undefined
        );
    }

    private static simulateInWorker(
        blueprint: MechBlueprint, 
        duration: number, 
        timeStep: number, 
        scenario?: ScenarioDefinition,
        onProgress?: (progress: number, currentTime: number) => void,
        cancelToken?: SimulationCancellationToken,
        options?: { useFixedStep?: boolean }
    ): Promise<MechDynamicSimulationResult> {
        return new Promise((resolve, reject) => {
            let resolved = false;
            let cancelSent = false;

            // Vite / Webpack compatible Worker instantiation
            const worker = new Worker(new URL('./SimulationWorker.ts', import.meta.url), { type: 'module' });

            const reqId = crypto.randomUUID();
            const cancelWatcher = cancelToken
                ? setInterval(() => {
                    if (resolved) return;
                    if (cancelToken.cancelled && !cancelSent) {
                        cancelSent = true;
                        worker.postMessage({
                            id: reqId,
                            type: 'cancel'
                        });
                    }
                }, 75)
                : null;

            const cleanup = () => {
                if (!resolved) {
                    resolved = true;
                }
                if (cancelWatcher) clearInterval(cancelWatcher);
                worker.terminate();
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
                    cleanup();
                    resolve(msg.payload);
                } 
                else if (msg.type === 'error') {
                    clearTimeout(timeout);
                    cleanup();
                    reject(new Error(msg.error || 'Worker Simulation Failed'));
                }
                else if (msg.type === 'tick') {
                    onProgress?.(msg.progress ?? 0, msg.currentTime ?? 0);
                }
            };

            worker.onerror = (err: ErrorEvent) => {
                clearTimeout(timeout);
                if (!resolved) {
                    cleanup();
                    console.error('[DynamicSimulationService] Worker error:', err);
                    reject(new Error(`Worker error: ${err.message || 'Unknown error'}`));
                }
            };

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
                        useFixedStep: options?.useFixedStep
                    }
                }
            });
        });
    }

    /**
     * Run simulation with cancellation support
     */
    static simulateWithCancellation(
        blueprint: MechBlueprint,
        duration: number = 60,
        timeStep: number = 0.5,
        scenario?: ScenarioDefinition,
        onProgress?: (progress: number, currentTime: number) => void,
        options?: { useFixedStep?: boolean }
    ): DynamicSimulationHandle {
        const token: SimulationCancellationToken = { cancelled: false };

        const cancel = () => {
            token.cancelled = true;
        };

        const result = this.simulate(blueprint, duration, timeStep, scenario, onProgress, token, options);

        return { result, cancel, token };
    }
}

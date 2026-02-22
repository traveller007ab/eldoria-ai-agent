
import { SimulationKernel } from './SimulationKernel';

// Worker Entry Point

console.log('SAF Lab Physics Worker Started');

const activeCancelTokens = new Map<string, { cancelled: boolean }>();

self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;

    if (type === 'cancel') {
        const token = activeCancelTokens.get(id);
        if (token) {
            token.cancelled = true;
        }
        return;
    }

    if (type === 'simulate') {
        const cancelToken = { cancelled: false };
        activeCancelTokens.set(id, cancelToken);

        try {
            const { blueprint, duration, timeStep, scenario, options } = payload;

            console.log(`[Worker] Starting Simulation ${blueprint.id}`);
            
            // Check if we should report progress
            const reportProgress = options?.enableProgressReporting || false;
            const onProgress = reportProgress
                ? (progress: number, currentTime: number) => {
                    self.postMessage({
                        id,
                        type: 'tick',
                        progress,
                        currentTime
                    });
                }
                : undefined;

            const result = await SimulationKernel.simulate(
                blueprint,
                duration,
                timeStep,
                scenario,
                onProgress,
                cancelToken,
                options ? { useFixedStep: options.useFixedStep } : undefined
            );

            self.postMessage({
                id,
                type: 'success',
                payload: result
            });
        } catch (error: any) {
            console.error('[Worker] Simulation Failed', error);
            self.postMessage({
                id,
                type: 'error',
                error: error.message
            });
        } finally {
            activeCancelTokens.delete(id);
        }
    }
};

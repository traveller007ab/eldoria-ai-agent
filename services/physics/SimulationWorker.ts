
import { SimulationKernel } from './SimulationKernel';

// Worker Entry Point

console.log('SAF Lab Physics Worker Started');

self.onmessage = async (e: MessageEvent) => {
    const { id, type, payload } = e.data;

    if (type === 'simulate') {
        try {
            const { blueprint, duration, timeStep, scenario, options } = payload;

            console.log(`[Worker] Starting Simulation ${blueprint.id}`);
            
            // Check if we should report progress
            const reportProgress = options?.enableProgressReporting || false;
            const reportInterval = options?.reportInterval || 10;

            // Monkey-patch the SimulationKernel to add progress reporting
            // This is a simple approach - for production, we'd want a cleaner integration
            if (reportProgress) {
                const originalPostMessage = self.postMessage.bind(self);
                let tickCount = 0;
                
                self.postMessage = (msg: any) => {
                    if (msg.type === 'success') {
                        // Don't override the final success message
                        originalPostMessage(msg);
                    } else {
                        // Add tick progress
                        tickCount++;
                        if (tickCount % reportInterval === 0) {
                            originalPostMessage({
                                ...msg,
                                type: 'tick',
                                currentTime: tickCount * timeStep
                            });
                        }
                    }
                };
            }

            const result = await SimulationKernel.simulate(blueprint, duration, timeStep, scenario);

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
        }
    }
};

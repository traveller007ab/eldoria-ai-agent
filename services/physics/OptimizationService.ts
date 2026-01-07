import { MechBlueprint, MechSimulationResult } from '../../types';
import { SimulationService } from './SimulationService';

export interface OptimizationConfig {
    targetComponentId: string;
    targetVariable: string; // e.g., 'flow_rate', 'pressure'
    targetValue: number;
    adjustComponentId: string;
    adjustParameter: string; // e.g., 'speed', 'opening'
    minAdjust: number;
    maxAdjust: number;
    tolerance: number;
    maxIterations: number;
}

export interface OptimizationResult {
    converged: boolean;
    iterations: number;
    finalValue: number;
    finalParameter: number;
    error: number;
    history: { iteration: number; parameter: number; value: number; error: number }[];
    simulationResult: MechSimulationResult | null;
}

export class OptimizationService {

    static async goalSeek(blueprint: MechBlueprint, config: OptimizationConfig): Promise<OptimizationResult> {
        let iterations = 0;
        const history: OptimizationResult['history'] = [];

        // Initial points for Secant Method
        let x0 = config.minAdjust;
        let x1 = config.maxAdjust;

        // Evaluate x0
        let y0 = await this.evaluate(blueprint, config, x0);
        history.push({ iteration: 0, parameter: x0, value: y0, error: y0 - config.targetValue });

        if (Math.abs(y0 - config.targetValue) < config.tolerance) {
            return this.buildResult(true, iterations, y0, x0, y0 - config.targetValue, history, blueprint, config);
        }

        // Evaluate x1
        let y1 = await this.evaluate(blueprint, config, x1);
        history.push({ iteration: 1, parameter: x1, value: y1, error: y1 - config.targetValue });

        if (Math.abs(y1 - config.targetValue) < config.tolerance) {
            return this.buildResult(true, iterations, y1, x1, y1 - config.targetValue, history, blueprint, config);
        }

        // Secant Method Loop
        let x_prev = x0;
        let y_prev = y0;
        let x_curr = x1;
        let y_curr = y1;

        while (iterations < config.maxIterations) {
            iterations++;

            // Avoid division by zero
            if (Math.abs(y_curr - y_prev) < 1e-9) {
                // Fallback to bisection or slight perturbation
                x_curr += (config.maxAdjust - config.minAdjust) * 0.01;
            } else {
                // Secant formula: x_new = x_curr - y_err_curr * (x_curr - x_prev) / (y_err_curr - y_err_prev)
                // But we want y to be target. Let f(x) = evaluate(x) - target.
                // x_new = x_curr - (y_curr - target) * (x_curr - x_prev) / ((y_curr - target) - (y_prev - target))
                //       = x_curr - (y_curr - target) * (x_curr - x_prev) / (y_curr - y_prev)

                const f_curr = y_curr - config.targetValue;
                const f_prev = y_prev - config.targetValue;

                const x_new = x_curr - f_curr * (x_curr - x_prev) / (f_curr - f_prev);

                // Constrain x_new
                let x_next = Math.max(config.minAdjust, Math.min(config.maxAdjust, x_new));

                // Check convergence
                if (Math.abs(x_next - x_curr) < 1e-4) {
                    // Parameter converged
                }

                x_prev = x_curr;
                y_prev = y_curr;
                x_curr = x_next;
            }

            const y_new = await this.evaluate(blueprint, config, x_curr);
            history.push({ iteration: iterations + 1, parameter: x_curr, value: y_new, error: y_new - config.targetValue });

            if (Math.abs(y_new - config.targetValue) < config.tolerance) {
                return this.buildResult(true, iterations, y_new, x_curr, y_new - config.targetValue, history, blueprint, config);
            }

            y_curr = y_new;
        }

        return this.buildResult(false, iterations, y_curr, x_curr, y_curr - config.targetValue, history, blueprint, config);
    }

    private static async evaluate(initialBlueprint: MechBlueprint, config: OptimizationConfig, paramValue: number): Promise<number> {
        // Create a deep copy or modified version of the blueprint
        const blueprint = JSON.parse(JSON.stringify(initialBlueprint)) as MechBlueprint;

        // Update the parameter
        const comp = blueprint.components.find(c => c.id === config.adjustComponentId);
        if (comp) {
            comp.parameterValues[config.adjustParameter] = paramValue.toString();
        }

        // Run simulation
        // Note: SimulationService might be slow with its artificial delay. 
        // For optimization, we might bypass the delay or use a fast mode if available.
        // Since we can't easily change the delay in SimulationService without editing it, we accept it for now.
        const result = await SimulationService.run(blueprint);

        // Extract target variable
        // The variables are flat, e.g., "Pump_1_flow".
        // We need to construct the key.
        // Assuming config passes the exact key or we reconstruct it.
        // But the user might know the component ID "pump-1" and variable "flow".
        // The simulation uses name-based keys "Pump_1_flow".

        // Let's find the correct key in 'variables'.
        // We look for a key that contains both component name (sanitized) and target variable.
        const compName = blueprint.components.find(c => c.id === config.targetComponentId)?.name.replace(/\s+/g, '_');
        const key = `${compName}_${config.targetVariable}`;

        return result.variables[key] || 0;
    }

    private static async buildResult(
        converged: boolean,
        iterations: number,
        val: number,
        param: number,
        error: number,
        history: OptimizationResult['history'],
        baseBlueprint: MechBlueprint,
        config: OptimizationConfig
    ): Promise<OptimizationResult> {
        // Run one last time to get full result object
        const finalBlueprint = JSON.parse(JSON.stringify(baseBlueprint)) as MechBlueprint;
        const comp = finalBlueprint.components.find(c => c.id === config.adjustComponentId);
        if (comp) {
            comp.parameterValues[config.adjustParameter] = param.toString();
        }
        const simResult = await SimulationService.run(finalBlueprint);

        return {
            converged,
            iterations,
            finalValue: val,
            finalParameter: param,
            error,
            history,
            simulationResult: simResult
        };
    }
}

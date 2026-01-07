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

        // Brent's Method Implementation
        // Adapted for goal seek: f(x) = evaluate(x) - target = 0

        let a = config.minAdjust;
        let b = config.maxAdjust;
        let fa = (await this.evaluate(blueprint, config, a)) - config.targetValue;
        let fb = (await this.evaluate(blueprint, config, b)) - config.targetValue;

        history.push({ iteration: 0, parameter: a, value: fa + config.targetValue, error: fa });
        history.push({ iteration: 0, parameter: b, value: fb + config.targetValue, error: fb });

        if (fa * fb >= 0) {
            // Root not bracketed or multiple roots. Fallback to heuristic or fail.
            // For engineering systems (monotonic), this implies target is outside range.
            return this.buildResult(false, iterations, fb + config.targetValue, b, fb, history, blueprint, config);
        }

        if (Math.abs(fa) < Math.abs(fb)) {
            [a, b] = [b, a];
            [fa, fb] = [fb, fa];
        }

        let c = a;
        let fc = fa;
        let d = 0; // Stepsize
        let s = b;
        let fs = fb;
        let mflag = true;

        while (iterations < config.maxIterations && Math.abs(b - a) > config.tolerance && Math.abs(fb) > config.tolerance) {
            iterations++;

            // Inverse quadratic interpolation or Secant
            if (fa !== fc && fb !== fc) {
                // Inverse quadratic
                const s1 = (a * fb * fc) / ((fa - fb) * (fa - fc));
                const s2 = (b * fa * fc) / ((fb - fa) * (fb - fc));
                const s3 = (c * fa * fb) / ((fc - fa) * (fc - fb));
                s = s1 + s2 + s3;
            } else {
                // Secant
                s = b - fb * (b - a) / (fb - fa);
            }

            // Check if s is reasonable (within bounds and bracketed)
            // Condition 1: s betwen (3a+b)/4 and b
            const cond1 = !((s > (3 * a + b) / 4 && s < b) || (s < (3 * a + b) / 4 && s > b));
            // Condition 2: Step size shrinking?
            const cond2 = mflag && Math.abs(s - b) >= Math.abs(b - c) / 2;
            const cond3 = !mflag && Math.abs(s - b) >= Math.abs(c - d) / 2;
            const cond4 = mflag && Math.abs(b - c) < Math.abs(config.tolerance);
            const cond5 = !mflag && Math.abs(c - d) < Math.abs(config.tolerance);

            if (cond1 || cond2 || cond3 || cond4 || cond5) {
                // Bisection fallback
                s = (a + b) / 2;
                mflag = true;
            } else {
                mflag = false;
            }

            fs = (await this.evaluate(blueprint, config, s)) - config.targetValue;
            history.push({ iteration: iterations, parameter: s, value: fs + config.targetValue, error: fs });
            d = c;
            c = b;
            fc = fb;

            if (fa * fs < 0) {
                b = s;
                fb = fs;
            } else {
                a = s;
                fa = fs;
            }

            if (Math.abs(fa) < Math.abs(fb)) {
                [a, b] = [b, a];
                [fa, fb] = [fb, fa];
            }
        }

        return this.buildResult(iterations < config.maxIterations, iterations, fb + config.targetValue, b, fb, history, blueprint, config);

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
        // Use fastMode to bypass artificial delays
        const result = await SimulationService.run(blueprint, true);

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

import type { MechBlueprint, MechSimulationResult } from '../../types';

export interface MonteCarloConfig {
    samples: number;
    parameters: MonteCarloParameter[];
    outputs: string[];
    distributionType: 'normal' | 'uniform' | 'lognormal' | 'triangular';
    correlationMatrix?: number[][];
    seed?: number;
}

export interface MonteCarloParameter {
    id: string;
    componentId: string;
    nominalValue: number;
    uncertainty: number;
    distributionType?: 'normal' | 'uniform' | 'lognormal' | 'triangular';
    min?: number;
    max?: number;
    shape?: number;
}

export interface MonteCarloResult {
    samples: number;
    inputs: Record<string, number[]>;
    outputs: Record<string, MonteCarloOutput>;
    correlations: Record<string, Record<string, number>>;
    probabilityOfFailure: number;
    reliabilityIndex: number;
    summary: MonteCarloSummary;
}

export interface MonteCarloOutput {
    mean: number;
    stdDev: number;
    variance: number;
    coefficientOfVariation: number;
    min: number;
    max: number;
    percentile5: number;
    percentile25: number;
    median: number;
    percentile75: number;
    percentile95: number;
    skewness: number;
    kurtosis: number;
    distributionFit: 'normal' | 'lognormal' | 'uniform' | 'unknown';
    histogram: { value: number; frequency: number }[];
    cdf: { value: number; probability: number }[];
}

export interface MonteCarloSummary {
    totalSamples: number;
    validSamples: number;
    failedSamples: number;
    averageComputeTimeMs: number;
    convergenceStatus: 'converged' | 'not_converged' | 'insufficient_samples';
    recommendations: string[];
}

export interface MonteCarloProgress {
    currentSample: number;
    totalSamples: number;
    percentComplete: number;
    elapsedMs: number;
    estimatedRemainingMs: number;
    currentMean?: Record<string, number>;
    currentStdDev?: Record<string, number>;
}

type ProgressCallback = (progress: MonteCarloProgress) => void;

export class MonteCarloService {
    private blueprint: MechBlueprint;
    private evaluateSimulation: (params: Record<string, number>) => Promise<MechSimulationResult>;
    private seed: number;

    constructor(
        blueprint: MechBlueprint,
        evaluateSimulation: (params: Record<string, number>) => Promise<MechSimulationResult>,
        seed?: number
    ) {
        this.blueprint = blueprint;
        this.evaluateSimulation = evaluateSimulation;
        this.seed = seed || Math.floor(Math.random() * 2147483647);
    }

    async runMonteCarlo(config: MonteCarloConfig, onProgress?: ProgressCallback): Promise<MonteCarloResult> {
        const startTime = Date.now();
        const inputData: Record<string, number[]> = {};
        const outputData: Record<string, number[]> = {};
        
        for (const param of config.parameters) {
            inputData[param.id] = [];
        }
        for (const output of config.outputs) {
            outputData[output] = [];
        }

        let failedSamples = 0;
        const validSamples: number[] = [];

        for (let i = 0; i < config.samples; i++) {
            const sampleParams: Record<string, number> = {};
            const iterationSeed = this.seed + i;

            for (const param of config.parameters) {
                const value = this.generateSample(param, iterationSeed + param.id.length);
                sampleParams[param.id] = value;
                inputData[param.id].push(value);
            }

            try {
                const result = await this.evaluateSimulation(sampleParams);
                for (const output of config.outputs) {
                    const value = result.variables[output] || (result.metrics as any)[output] || 0;
                    outputData[output].push(value);
                }
                validSamples.push(i);
            } catch (error) {
                failedSamples++;
                for (const output of config.outputs) {
                    outputData[output].push(NaN);
                }
            }

            if (onProgress && (i + 1) % 10 === 0) {
                const elapsed = Date.now() - startTime;
                const samplesPerMs = (i + 1) / elapsed;
                const estimatedRemaining = (config.samples - i - 1) / samplesPerMs;

                onProgress({
                    currentSample: i + 1,
                    totalSamples: config.samples,
                    percentComplete: ((i + 1) / config.samples) * 100,
                    elapsedMs: elapsed,
                    estimatedRemainingMs: estimatedRemaining
                });
            }
        }

        const correlations = this.calculateCorrelations(inputData, outputData);
        const outputs: Record<string, MonteCarloOutput> = {};
        
        for (const output of config.outputs) {
            outputs[output] = this.analyzeOutput(outputData[output]);
        }

        const probabilityOfFailure = this.calculateProbabilityOfFailure(outputs);
        const reliabilityIndex = this.calculateReliabilityIndex(outputs);

        const summary = this.generateSummary(config.samples, validSamples.length, failedSamples, startTime);

        return {
            samples: config.samples,
            inputs: inputData,
            outputs,
            correlations,
            probabilityOfFailure,
            reliabilityIndex,
            summary
        };
    }

    private generateSample(param: MonteCarloParameter, seedOffset: number): number {
        const seed = this.seed + seedOffset;
        const rng = this.seededRandom(seed);
        const type = param.distributionType || 'normal';

        switch (type) {
            case 'normal': {
                const u1 = rng();
                const u2 = rng();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                return param.nominalValue + z * param.uncertainty;
            }
            case 'uniform':
                return param.min! + rng() * (param.max! - param.min!);
            case 'lognormal': {
                const sigma = Math.sqrt(Math.log(1 + (param.uncertainty / param.nominalValue) ** 2));
                const mu = Math.log(param.nominalValue) - 0.5 * sigma ** 2;
                const u1 = rng();
                const u2 = rng();
                const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
                return Math.exp(mu + sigma * z);
            }
            case 'triangular': {
                const a = param.min!;
                const b = param.max!;
                const c = param.shape || param.nominalValue;
                const u = rng();
                if (u < (c - a) / (b - a)) {
                    return a + Math.sqrt(u * (b - a) * (c - a));
                }
                return b - Math.sqrt((1 - u) * (b - a) * (b - c));
            }
            default:
                return param.nominalValue;
        }
    }

    private seededRandom(seed: number): () => number {
        let s = seed;
        return function() {
            s = Math.sin(s * 9999) * 10000;
            return s - Math.floor(s);
        };
    }

    private analyzeOutput(values: number[]): MonteCarloOutput {
        const validValues = values.filter(v => !isNaN(v));
        const n = validValues.length;

        if (n === 0) {
            return {
                mean: 0, stdDev: 0, variance: 0, coefficientOfVariation: 0,
                min: 0, max: 0, percentile5: 0, percentile25: 0, median: 0,
                percentile75: 0, percentile95: 0, skewness: 0, kurtosis: 0,
                distributionFit: 'unknown', histogram: [], cdf: []
            };
        }

        const sorted = [...validValues].sort((a, b) => a - b);
        const mean = validValues.reduce((a, b) => a + b, 0) / n;
        const variance = validValues.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n;
        const stdDev = Math.sqrt(variance);

        const percentile = (arr: number[], p: number) => {
            const index = Math.ceil(p / 100 * arr.length) - 1;
            return arr[Math.max(0, Math.min(index, arr.length - 1))];
        };

        const skewness = validValues.reduce((sum, v) => sum + ((v - mean) / stdDev) ** 3, 0) / n;
        const kurtosis = validValues.reduce((sum, v) => sum + ((v - mean) / stdDev) ** 4, 0) / n - 3;

        const histogram = this.createHistogram(validValues, 20);
        const cdf = this.createCDF(sorted);

        const distributionFit = this.fitDistribution(validValues);

        return {
            mean,
            stdDev,
            variance,
            coefficientOfVariation: stdDev / Math.abs(mean),
            min: sorted[0],
            max: sorted[n - 1],
            percentile5: percentile(sorted, 5),
            percentile25: percentile(sorted, 25),
            median: percentile(sorted, 50),
            percentile75: percentile(sorted, 75),
            percentile95: percentile(sorted, 95),
            skewness,
            kurtosis,
            distributionFit,
            histogram,
            cdf
        };
    }

    private createHistogram(values: number[], bins: number): { value: number; frequency: number }[] {
        const min = Math.min(...values);
        const max = Math.max(...values);
        const binWidth = (max - min) / bins;
        
        const histogram: { value: number; frequency: number }[] = Array.from({ length: bins }, (_, i) => ({
            value: min + (i + 0.5) * binWidth,
            frequency: 0
        }));

        for (const v of values) {
            const binIndex = Math.min(Math.floor((v - min) / binWidth), bins - 1);
            histogram[binIndex].frequency++;
        }

        return histogram;
    }

    private createCDF(sorted: number[]): { value: number; probability: number }[] {
        return sorted.map((v, i) => ({
            value: v,
            probability: (i + 1) / sorted.length
        }));
    }

    private fitDistribution(values: number[]): 'normal' | 'lognormal' | 'uniform' | 'unknown' {
        const n = values.length;
        const sorted = [...values].sort((a, b) => a - b);
        const mean = values.reduce((a, b) => a + b, 0) / n;
        const stdDev = Math.sqrt(values.reduce((sum, v) => sum + (v - mean) ** 2, 0) / n);

        const ksNormal = this.ksTest(values, 'normal', { mean, stdDev });
        const ksLognormal = this.ksTest(values.filter(v => v > 0), 'lognormal', { mean: Math.log(mean), stdDev: stdDev });
        const ksUniform = this.ksTest(values, 'uniform', { min: sorted[0], max: sorted[n - 1] });

        const minStat = Math.min(ksNormal, ksLognormal, ksUniform);

        if (minStat === ksNormal) return 'normal';
        if (minStat === ksLognormal) return 'lognormal';
        if (minStat === ksUniform) return 'uniform';
        return 'unknown';
    }

    private ksTest(values: number[], type: string, params: Record<string, number>): number {
        const sorted = [...values].sort((a, b) => a - b);
        const n = sorted.length;
        let maxD = 0;

        for (let i = 0; i < n; i++) {
            const x = sorted[i];
            const empiricalCDF = (i + 1) / n;
            let theoreticalCDF = 0;

            switch (type) {
                case 'normal': {
                    const z = (x - params.mean!) / params.stdDev!;
                    theoreticalCDF = 0.5 * (1 + this.erf(z / Math.sqrt(2)));
                    break;
                }
                case 'lognormal': {
                    const z = (Math.log(x) - params.mean!) / params.stdDev!;
                    theoreticalCDF = 0.5 * (1 + this.erf(z / Math.sqrt(2)));
                    break;
                }
                case 'uniform': {
                    theoreticalCDF = (x - params.min!) / (params.max! - params.min!);
                    break;
                }
            }

            const d = Math.abs(empiricalCDF - theoreticalCDF);
            maxD = Math.max(maxD, d);
        }

        return maxD;
    }

    private erf(x: number): number {
        const a1 = 0.254829592;
        const a2 = -0.284496736;
        const a3 = 1.421413741;
        const a4 = -1.453152027;
        const a5 = 1.061405429;
        const p = 0.3275911;

        const sign = x < 0 ? -1 : 1;
        x = Math.abs(x);

        const t = 1.0 / (1.0 + p * x);
        const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

        return sign * y;
    }

    private calculateCorrelations(inputs: Record<string, number[]>, outputs: Record<string, number[]>): Record<string, Record<string, number>> {
        const correlations: Record<string, Record<string, number>> = {};
        const allKeys = Object.keys(inputs).reduce((acc, k) => ({ ...acc, [k]: true }), {} as Record<string, boolean>);
        
        Object.keys(outputs).forEach(outputKey => {
            correlations[outputKey] = {};
            Object.keys(inputs).forEach(inputKey => {
                const corr = this.pearsonCorrelation(inputs[inputKey], outputs[outputKey]);
                correlations[outputKey][inputKey] = corr;
            });
        });

        return correlations;
    }

    private pearsonCorrelation(x: number[], y: number[]): number {
        const n = Math.min(x.length, y.length);
        if (n === 0) return 0;

        const validX: number[] = [];
        const validY: number[] = [];
        
        for (let i = 0; i < n; i++) {
            if (!isNaN(x[i]) && !isNaN(y[i])) {
                validX.push(x[i]);
                validY.push(y[i]);
            }
        }

        const m = validX.length;
        if (m === 0) return 0;

        const meanX = validX.reduce((a, b) => a + b, 0) / m;
        const meanY = validY.reduce((a, b) => a + b, 0) / m;

        let numerator = 0;
        let denomX = 0;
        let denomY = 0;

        for (let i = 0; i < m; i++) {
            const dx = validX[i] - meanX;
            const dy = validY[i] - meanY;
            numerator += dx * dy;
            denomX += dx * dx;
            denomY += dy * dy;
        }

        if (denomX === 0 || denomY === 0) return 0;

        return numerator / Math.sqrt(denomX * denomY);
    }

    private calculateProbabilityOfFailure(outputs: Record<string, MonteCarloOutput>): number {
        let failureCount = 0;
        let totalCritical = 0;

        for (const [key, output] of Object.entries(outputs)) {
            if (key.toLowerCase().includes('pressure') && output.max > 100) {
                totalCritical++;
                const valuesAboveLimit = output.histogram.filter(h => h.value > 100).reduce((sum, h) => sum + h.frequency, 0);
                failureCount += valuesAboveLimit / output.histogram.reduce((sum, h) => sum + h.frequency, 0);
            }
            if (key.toLowerCase().includes('temperature') && output.max > 150) {
                totalCritical++;
                const valuesAboveLimit = output.histogram.filter(h => h.value > 150).reduce((sum, h) => sum + h.frequency, 0);
                failureCount += valuesAboveLimit / output.histogram.reduce((sum, h) => sum + h.frequency, 0);
            }
            if (key.toLowerCase().includes('npsh') && output.percentile5 < 3) {
                totalCritical++;
                const valuesBelowLimit = output.histogram.filter(h => h.value < 3).reduce((sum, h) => sum + h.frequency, 0);
                failureCount += valuesBelowLimit / output.histogram.reduce((sum, h) => sum + h.frequency, 0);
            }
        }

        return totalCritical > 0 ? failureCount / totalCritical : 0;
    }

    private calculateReliabilityIndex(outputs: Record<string, MonteCarloOutput>): number {
        let reliabilitySum = 0;
        let count = 0;

        for (const [key, output] of Object.entries(outputs)) {
            if (key.toLowerCase().includes('efficiency') || key.toLowerCase().includes('power')) {
                const beta = (output.mean - output.min) / output.stdDev;
                reliabilitySum += beta;
                count++;
            }
        }

        return count > 0 ? reliabilitySum / count : 0;
    }

    private generateSummary(total: number, valid: number, failed: number, startTime: number): MonteCarloSummary {
        const avgComputeTime = (Date.now() - startTime) / total;
        const failureRate = failed / total;
        
        const recommendations: string[] = [];
        
        if (failureRate > 0.1) {
            recommendations.push("High failure rate detected. Consider relaxing constraints or increasing sample tolerance.");
        }
        if (avgComputeTime > 100) {
            recommendations.push("Compute time per sample is high. Consider using simplified models or parallel processing.");
        }
        if (valid < 100) {
            recommendations.push("Low sample count. Increase samples for more reliable statistics.");
        }

        return {
            totalSamples: total,
            validSamples: valid,
            failedSamples: failed,
            averageComputeTimeMs: avgComputeTime,
            convergenceStatus: valid > 1000 ? 'converged' : 'insufficient_samples',
            recommendations
        };
    }
}

export const MONTE_CARLO_PRESETS: Record<string, MonteCarloConfig> = {
    basic_uncertainty: {
        samples: 100,
        parameters: [
            { id: 'flow_demand', componentId: 'pump', nominalValue: 100, uncertainty: 10, distributionType: 'normal' },
            { id: 'head_required', componentId: 'system', nominalValue: 50, uncertainty: 5, distributionType: 'normal' }
        ],
        outputs: ['efficiency', 'power', 'npsh_margin'],
        distributionType: 'normal'
    },
    component_tolerance: {
        samples: 500,
        parameters: [
            { id: 'pipe_diameter', componentId: 'pipe', nominalValue: 100, uncertainty: 2, distributionType: 'uniform', min: 98, max: 102 },
            { id: 'pump_speed', componentId: 'pump', nominalValue: 1450, uncertainty: 50, distributionType: 'normal' },
            { id: 'valve_cv', componentId: 'valve', nominalValue: 100, uncertainty: 10, distributionType: 'lognormal' }
        ],
        outputs: ['flow', 'head', 'pressure_drop'],
        distributionType: 'lognormal'
    },
    worst_case: {
        samples: 1000,
        parameters: [
            { id: 'ambient_temp', componentId: 'environment', nominalValue: 25, uncertainty: 15, distributionType: 'triangular', min: 0, max: 50, shape: 35 },
            { id: 'fluid_viscosity', componentId: 'fluid', nominalValue: 1, uncertainty: 0.5, distributionType: 'uniform', min: 0.5, max: 1.5 }
        ],
        outputs: ['npsh_available', 'efficiency', 'power'],
        distributionType: 'triangular'
    }
};

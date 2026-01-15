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

export interface SensitivityInput {
    parameter: string;
    label: string;
    baseValue: number;
    perturbation: number;
}

export interface SensitivityOutput {
    metric: string;
    label: string;
    baseValue: number;
    elasticity: number;
    lowValue: number;
    highValue: number;
    changePercent: number;
}

export interface SensitivityResult {
    inputs: SensitivityInput[];
    outputs: SensitivityOutput[];
    tornadoData: {
        parameter: string;
        impact: number;
        direction: 'positive' | 'negative';
    }[];
    mostSensitive: {
        parameter: string;
        elasticity: number;
        affectedMetrics: string[];
    };
}

export interface OptimizationTarget {
    componentId: string;
    componentType: 'pump' | 'heat_exchanger' | 'pipe' | 'valve' | 'motor' | 'engine';
    parameters: Record<string, number>;
    constraints: Record<string, { min?: number; max?: number }>;
}

export interface OptimizationResult {
    componentId: string;
    optimizedParameters: Record<string, number>;
    efficiency: number;
    margin: number;
    warnings: string[];
}

export interface ComponentOptimizerConfig {
    safetyFactor: number;
    efficiencyTarget: number;
    maxIterations: number;
    tolerance: number;
}

const DEFAULT_CONFIG: ComponentOptimizerConfig = {
    safetyFactor: 1.1,
    efficiencyTarget: 0.75,
    maxIterations: 100,
    tolerance: 0.001
};

export class ComponentOptimizer {
    private config: ComponentOptimizerConfig;

    constructor(config: Partial<ComponentOptimizerConfig> = {}) {
        this.config = { ...DEFAULT_CONFIG, ...config };
    }

    optimizePump(
        blueprint: Record<string, unknown>,
        componentId: string,
        requiredFlow: number,
        requiredHead: number,
        fluidDensity: number = 1000
    ): OptimizationResult {
        const warnings: string[] = [];
        const designFlow = requiredFlow * this.config.safetyFactor;
        const designHead = requiredHead * this.config.safetyFactor;
        const pumpPower = (fluidDensity * 9.81 * designFlow / 3600 * designHead) / 1000;
        const npshAvailable = 5.0;
        const npshRequired = 2 + 0.1 * designFlow;
        
        if (npshAvailable < npshRequired) {
            warnings.push(`NPSH available (${npshAvailable.toFixed(2)}m) is below recommended (${npshRequired.toFixed(2)}m)`);
        }

        const efficiency = Math.max(0.3, 0.85 - Math.random() * 0.3);
        if (efficiency < this.config.efficiencyTarget) {
            warnings.push(`Estimated efficiency (${(efficiency * 100).toFixed(1)}%) below target (${(this.config.efficiencyTarget * 100).toFixed(1)}%)`);
        }

        const margin = 0.15;

        return {
            componentId,
            optimizedParameters: {
                designFlow: designFlow,
                designHead: designHead,
                requiredPower: pumpPower,
                efficiency: efficiency,
                npshAvailable: npshAvailable
            },
            efficiency,
            margin,
            warnings
        };
    }

    optimizeHeatExchanger(
        blueprint: Record<string, unknown>,
        componentId: string,
        requiredDuty: number,
        hotInletTemp: number,
        coldInletTemp: number
    ): OptimizationResult {
        const warnings: string[] = [];
        const lmtd = ((hotInletTemp - coldInletTemp) - Math.log((hotInletTemp + 50) / (coldInletTemp + 50))) / 2;
        const area = requiredDuty / (lmtd * 500);
        const effectiveness = Math.min(0.85, requiredDuty / (5000 * (hotInletTemp - coldInletTemp)));

        if (effectiveness < 0.6) {
            warnings.push('Heat exchanger may be undersized for required duty');
        }

        return {
            componentId,
            optimizedParameters: {
                area: area,
                lmtd: lmtd,
                effectiveness: effectiveness,
                duty: requiredDuty
            },
            efficiency: effectiveness,
            margin: Math.abs(1 - area / (requiredDuty / (lmtd * 500))),
            warnings
        };
    }

    optimizeMotor(
        blueprint: Record<string, unknown>,
        componentId: string,
        requiredPower: number,
        voltage: number = 415
    ): OptimizationResult {
        const motorPower = requiredPower * this.config.safetyFactor;
        const standardSizes = [0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30];
        const selectedSize = standardSizes.find(s => s >= motorPower) || standardSizes[standardSizes.length - 1];
        const eff = 0.85 + (selectedSize / 30) * 0.1;
        const margin = (selectedSize - requiredPower) / requiredPower;

        return {
            componentId,
            optimizedParameters: {
                ratedPower: selectedSize,
                voltage: voltage,
                current: selectedSize / (Math.sqrt(3) * voltage * eff * 0.9),
                efficiency: eff
            },
            efficiency: eff,
            margin,
            warnings: []
        };
    }

    optimizePipe(
        blueprint: Record<string, unknown>,
        componentId: string,
        flowRate: number,
        maxVelocity: number = 2.5
    ): OptimizationResult {
        const area = flowRate / (maxVelocity * 3600);
        const diameter = Math.sqrt(4 * area / Math.PI) * 1000;
        const standardSizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300];
        const selectedSize = standardSizes.find(s => s >= diameter) || standardSizes[standardSizes.length - 1];
        const actualVelocity = flowRate / (3600 * Math.PI * Math.pow(selectedSize / 1000, 2) / 4);
        const velocityMargin = (maxVelocity - actualVelocity) / maxVelocity;

        return {
            componentId,
            optimizedParameters: {
                nominalDiameter: selectedSize,
                actualDiameter: selectedSize / 1000,
                actualVelocity: actualVelocity,
                flowRate: flowRate,
                maxVelocity: maxVelocity
            },
            efficiency: Math.min(1, velocityMargin + 0.5),
            margin: velocityMargin,
            warnings: actualVelocity > maxVelocity ? ['Velocity exceeds recommended maximum'] : []
        };
    }
}

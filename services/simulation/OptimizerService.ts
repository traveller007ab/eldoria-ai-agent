import type { MechBlueprint, MechSimulationResult } from '../../types';

export interface OptimizationConfig {
    method: 'grid' | 'genetic' | 'gradient';
    objective: string;
    parameters: OptimizationParameter[];
    constraints?: OptimizationConstraint[];
    maxIterations?: number;
    populationSize?: number;
    convergenceTolerance?: number;
}

export interface OptimizationParameter {
    id: string;
    componentId: string;
    min: number;
    max: number;
    step?: number;
    initialValue?: number;
}

export interface OptimizationConstraint {
    type: 'less_than' | 'greater_than' | 'equals';
    metric: string;
    value: number;
    penaltyWeight: number;
}

export interface OptimizationResult {
    success: boolean;
    optimalValue: number;
    optimalParameters: Record<string, number>;
    objectiveValue: number;
    iterations: number;
    evaluations: number;
    convergenceHistory: number[];
    feasible: boolean;
    constraintViolations: string[];
}

export interface OptimizationProgress {
    currentIteration: number;
    currentValue: number;
    bestValue: number;
    currentParameters: Record<string, number>;
    elapsedMs: number;
}

type ProgressCallback = (progress: OptimizationProgress) => void;

export class OptimizerService {
    private blueprint: MechBlueprint;
    private evaluateSimulation: (params: Record<string, number>) => Promise<MechSimulationResult>;

    constructor(
        blueprint: MechBlueprint,
        evaluateSimulation: (params: Record<string, number>) => Promise<MechSimulationResult>
    ) {
        this.blueprint = blueprint;
        this.evaluateSimulation = evaluateSimulation;
    }

    async optimize(config: OptimizationConfig, onProgress?: ProgressCallback): Promise<OptimizationResult> {
        switch (config.method) {
            case 'grid':
                return this.gridSearch(config, onProgress);
            case 'genetic':
                return this.geneticAlgorithm(config, onProgress);
            case 'gradient':
                return this.gradientDescent(config, onProgress);
            default:
                throw new Error(`Unknown optimization method: ${config.method}`);
        }
    }

    private async gridSearch(config: OptimizationConfig, onProgress?: ProgressCallback): Promise<OptimizationResult> {
        const startTime = Date.now();
        const convergenceHistory: number[] = [];
        let bestValue = Infinity;
        let bestParams: Record<string, number> = {};
        let evaluations = 0;
        const constraintViolations: string[] = [];

        const generateGridPoints = (params: OptimizationParameter[], indices: number[], depth: number = 0): Record<string, number>[] => {
            if (depth === params.length) {
                return [{}];
            }

            const param = params[depth];
            const points: Record<string, number>[] = [];
            const step = param.step || (param.max - param.min) / 10;

            for (let value = param.min; value <= param.max; value += step) {
                const subPoints = generateGridPoints(params, indices, depth + 1);
                for (const sub of subPoints) {
                    points.push({ ...sub, [param.id]: value });
                }
            }

            return points;
        };

        const gridPoints = generateGridPoints(config.parameters);
        const totalEvaluations = gridPoints.length;

        for (let i = 0; i < gridPoints.length; i++) {
            const params = gridPoints[i];
            evaluations++;

            try {
                const result = await this.evaluateSimulation(params);
                const objectiveValue = this.calculateObjective(result, config.objective);
                const constraintsMet = this.checkConstraints(result, config.constraints || []);

                convergenceHistory.push(objectiveValue);

                if (objectiveValue < bestValue && constraintsMet.feasible) {
                    bestValue = objectiveValue;
                    bestParams = params;
                    constraintViolations.length = 0;
                } else if (!constraintsMet.feasible) {
                    constraintViolations.push(...constraintsMet.violations);
                }

                if (onProgress) {
                    onProgress({
                        currentIteration: i + 1,
                        currentValue: objectiveValue,
                        bestValue,
                        currentParameters: params,
                        elapsedMs: Date.now() - startTime
                    });
                }
            } catch (error) {
                evaluations++;
            }
        }

        return {
            success: bestValue !== Infinity,
            optimalValue: bestValue,
            optimalParameters: bestParams,
            objectiveValue: bestValue,
            iterations: totalEvaluations,
            evaluations,
            convergenceHistory,
            feasible: constraintViolations.length === 0,
            constraintViolations
        };
    }

    private async geneticAlgorithm(config: OptimizationConfig, onProgress?: ProgressCallback): Promise<OptimizationResult> {
        const startTime = Date.now();
        const popSize = config.populationSize || 20;
        const maxIter = config.maxIterations || 50;
        const convergenceHistory: number[] = [];
        let bestValue = Infinity;
        let bestParams: Record<string, number> = {};
        let evaluations = 0;
        const constraintViolations: string[] = [];

        interface Individual {
            genes: Record<string, number>;
            fitness: number;
            feasible: boolean;
        }

        const createIndividual = (): Individual => {
            const genes: Record<string, number> = {};
            for (const param of config.parameters) {
                genes[param.id] = param.min + Math.random() * (param.max - param.min);
            }
            return { genes, fitness: Infinity, feasible: false };
        };

        const evaluateIndividual = async (individual: Individual): Promise<void> => {
            try {
                const result = await this.evaluateSimulation(individual.genes);
                const objectiveValue = this.calculateObjective(result, config.objective);
                const constraints = this.checkConstraints(result, config.constraints || []);

                individual.fitness = objectiveValue;
                individual.feasible = constraints.feasible;

                if (constraints.feasible && objectiveValue < bestValue) {
                    bestValue = objectiveValue;
                    bestParams = { ...individual.genes };
                    constraintViolations.length = 0;
                } else if (!constraints.feasible) {
                    individual.fitness = objectiveValue + constraints.penalty;
                }

                evaluations++;
            } catch (error) {
                individual.fitness = Infinity;
                evaluations++;
            }
        };

        const crossover = (parent1: Individual, parent2: Individual): Individual => {
            const child: Individual = {
                genes: {},
                fitness: Infinity,
                feasible: false
            };
            for (const param of config.parameters) {
                child.genes[param.id] = Math.random() < 0.5 ? parent1.genes[param.id] : parent2.genes[param.id];
            }
            return child;
        };

        const mutate = (individual: Individual, rate: number = 0.1): void => {
            for (const param of config.parameters) {
                if (Math.random() < rate) {
                    const range = param.max - param.min;
                    individual.genes[param.id] = Math.max(param.min, Math.min(param.max,
                        individual.genes[param.id] + (Math.random() - 0.5) * range * 0.2
                    ));
                }
            }
        };

        let population: Individual[] = Array.from({ length: popSize }, createIndividual);

        for (let iter = 0; iter < maxIter; iter++) {
            await Promise.all(population.map(ind => evaluateIndividual(ind)));
            convergenceHistory.push(bestValue);

            if (onProgress) {
                onProgress({
                    currentIteration: iter + 1,
                    currentValue: population[0].fitness,
                    bestValue,
                    currentParameters: population[0].genes,
                    elapsedMs: Date.now() - startTime
                });
            }

            population.sort((a, b) => a.fitness - b.fitness);

            const elite = population.slice(0, Math.floor(popSize * 0.1));
            const newPopulation: Individual[] = [...elite];

            while (newPopulation.length < popSize) {
                const parent1 = population[Math.floor(Math.random() * Math.floor(popSize * 0.5))];
                const parent2 = population[Math.floor(Math.random() * Math.floor(popSize * 0.5))];
                let child = crossover(parent1, parent2);
                mutate(child, 0.1);
                newPopulation.push(child);
            }

            population = newPopulation;
        }

        await Promise.all(population.map(ind => evaluateIndividual(ind)));

        return {
            success: bestValue !== Infinity,
            optimalValue: bestValue,
            optimalParameters: bestParams,
            objectiveValue: bestValue,
            iterations: maxIter,
            evaluations,
            convergenceHistory,
            feasible: constraintViolations.length === 0,
            constraintViolations
        };
    }

    private async gradientDescent(config: OptimizationConfig, onProgress?: ProgressCallback): Promise<OptimizationResult> {
        const startTime = Date.now();
        const maxIter = config.maxIterations || 100;
        const tol = config.convergenceTolerance || 1e-6;
        const convergenceHistory: number[] = [];
        let bestValue = Infinity;
        let bestParams: Record<string, number> = {};
        let evaluations = 0;
        const constraintViolations: string[] = [];

        const currentParams: Record<string, number> = {};
        for (const param of config.parameters) {
            currentParams[param.id] = param.initialValue || (param.min + param.max) / 2;
        }

        let learningRate = 0.01;
        let gradientNorm = Infinity;

        for (let iter = 0; iter < maxIter && gradientNorm > tol; iter++) {
            const gradients: Record<string, number> = {};
            const epsilon = 0.001;

            for (const param of config.parameters) {
                const paramsPlus = { ...currentParams };
                paramsPlus[param.id] += epsilon;
                const resultPlus = await this.evaluateSimulation(paramsPlus);
                const valuePlus = this.calculateObjective(resultPlus, config.objective);

                const paramsMinus = { ...currentParams };
                paramsMinus[param.id] -= epsilon;
                const resultMinus = await this.evaluateSimulation(paramsMinus);
                const valueMinus = this.calculateObjective(resultMinus, config.objective);

                gradients[param.id] = (valuePlus - valueMinus) / (2 * epsilon);
                evaluations += 2;
            }

            evaluations++;
            const currentResult = await this.evaluateSimulation(currentParams);
            const currentValue = this.calculateObjective(currentResult, config.objective);
            convergenceHistory.push(currentValue);

            if (currentValue < bestValue) {
                bestValue = currentValue;
                bestParams = { ...currentParams };
            }

            gradientNorm = Math.sqrt(
                Object.values(gradients).reduce((sum, g) => sum + g * g, 0)
            );

            for (const param of config.parameters) {
                currentParams[param.id] -= learningRate * gradients[param.id];
                currentParams[param.id] = Math.max(param.min, Math.min(param.max, currentParams[param.id]));
            }

            if (onProgress) {
                onProgress({
                    currentIteration: iter + 1,
                    currentValue,
                    bestValue,
                    currentParameters: currentParams,
                    elapsedMs: Date.now() - startTime
                });
            }
        }

        return {
            success: bestValue !== Infinity,
            optimalValue: bestValue,
            optimalParameters: bestParams,
            objectiveValue: bestValue,
            iterations: maxIter,
            evaluations,
            convergenceHistory,
            feasible: constraintViolations.length === 0,
            constraintViolations
        };
    }

    private calculateObjective(result: MechSimulationResult, objective: string): number {
        switch (objective.toLowerCase()) {
            case 'efficiency':
                return -result.metrics.overallEfficiency;
            case 'power':
                return -result.metrics.totalPowerOutput;
            case 'flow':
                return -result.metrics.totalFlowRate;
            case 'pressure_drop':
                return result.metrics.pressureDrop;
            case 'cost':
                return (result.metrics as any).cost || 0;
            case 'npsh_margin':
                const npshAvail = (result.metrics as any).npshAvailable || 0;
                const npshReq = (result.metrics as any).npshRequired || 0;
                return -(npshAvail - npshReq);
            default:
                return result.metrics.overallEfficiency ? -result.metrics.overallEfficiency : 0;
        }
    }

    private checkConstraints(
        result: MechSimulationResult,
        constraints: OptimizationConstraint[]
    ): { feasible: boolean; violations: string[]; penalty: number } {
        const violations: string[] = [];
        let penalty = 0;

        for (const constraint of constraints) {
            const value = result.variables[constraint.metric] || (result.metrics as any)[constraint.metric] || 0;
            let violated = false;

            switch (constraint.type) {
                case 'less_than':
                    violated = value > constraint.value;
                    break;
                case 'greater_than':
                    violated = value < constraint.value;
                    break;
                case 'equals':
                    violated = Math.abs(value - constraint.value) > constraint.value * 0.1;
                    break;
            }

            if (violated) {
                violations.push(`${constraint.metric} ${constraint.type} ${constraint.value} (actual: ${value.toFixed(2)})`);
                penalty += constraint.penaltyWeight * Math.abs(value - constraint.value);
            }
        }

        return { feasible: violations.length === 0, violations, penalty };
    }
}

export const OPTIMIZATION_PRESETS: Record<string, Partial<OptimizationConfig>> = {
    max_efficiency: {
        method: 'genetic',
        objective: 'efficiency',
        maxIterations: 100,
        populationSize: 30
    },
    min_power: {
        method: 'gradient',
        objective: 'power',
        maxIterations: 50
    },
    max_flow: {
        method: 'grid',
        objective: 'flow'
    },
    npsh_margin: {
        method: 'genetic',
        objective: 'npsh_margin',
        constraints: [
            { type: 'greater_than', metric: 'npshMargin', value: 3, penaltyWeight: 100 }
        ]
    }
};

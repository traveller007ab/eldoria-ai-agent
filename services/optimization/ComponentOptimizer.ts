import { MechBlueprint, MechComponentInstance } from '../../types';

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
        blueprint: MechBlueprint,
        componentId: string,
        requiredFlow: number,
        requiredHead: number,
        fluidDensity: number = 1000
    ): OptimizationResult {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
            return {
                componentId,
                optimizedParameters: {},
                efficiency: 0,
                margin: 0,
                warnings: [`Component ${componentId} not found`]
            };
        }

        const warnings: string[] = [];
        const pumpParams = component.parameterValues;

        const designFlow = requiredFlow * this.config.safetyFactor;
        const designHead = requiredHead * this.config.safetyFactor;

        const pumpPower = (fluidDensity * 9.81 * designFlow / 3600 * designHead) / 1000;

        const npshAvailable = this.calculateNPSH(blueprint, componentId);
        const npshRequired = 2 + 0.1 * designFlow;
        if (npshAvailable < npshRequired) {
            warnings.push(`NPSH available (${npshAvailable.toFixed(2)}m) is below recommended (${npshRequired.toFixed(2)}m)`);
        }

        const efficiency = this.estimatePumpEfficiency(designFlow, designHead);

        if (efficiency < this.config.efficiencyTarget) {
            warnings.push(`Estimated efficiency (${(efficiency * 100).toFixed(1)}%) below target (${(this.config.efficiencyTarget * 100).toFixed(1)}%)`);
        }

        const bestEfficiencyPoint = designFlow * 0.8;
        const margin = Math.abs(designFlow - bestEfficiencyPoint) / designFlow;

        return {
            componentId,
            optimizedParameters: {
                design_flow: Math.round(designFlow * 100) / 100,
                design_head: Math.round(designHead * 100) / 100,
                rated_power: Math.round(pumpPower * 1.2 * 100) / 100,
                efficiency: Math.round(efficiency * 1000) / 1000
            },
            efficiency,
            margin,
            warnings
        };
    }

    optimizeHeatExchanger(
        blueprint: MechBlueprint,
        componentId: string,
        hotFlow: number,
        coldFlow: number,
        hotInletTemp: number,
        hotOutletTemp: number,
        coldInletTemp: number
    ): OptimizationResult {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
            return {
                componentId,
                optimizedParameters: {},
                efficiency: 0,
                margin: 0,
                warnings: [`Component ${componentId} not found`]
            };
        }

        const warnings: string[] = [];
        const cpHot = 4.18;
        const cpCold = 4.18;

        const qLoad = hotFlow * cpHot * (hotInletTemp - hotOutletTemp) / 3600;
        const coldOutletTemp = coldInletTemp + qLoad / (coldFlow * cpCold / 3600);

        const lmtd = this.calculateLMTD(hotInletTemp, hotOutletTemp, coldInletTemp, coldOutletTemp);
        const effectiveness = 0.75;

        const requiredArea = qLoad / (effectiveness * lmtd * 500);

        if (requiredArea < 1) {
            warnings.push('Very small heat exchanger required - verify calculations');
        }

        const capacityMargin = requiredArea * 0.2;
        const margin = capacityMargin / requiredArea;

        return {
            componentId,
            optimizedParameters: {
                area: Math.round(requiredArea * 1.2 * 100) / 100,
                htc: 500,
                effectiveness
            },
            efficiency: effectiveness,
            margin,
            warnings
        };
    }

    optimizePipe(
        blueprint: MechBlueprint,
        componentId: string,
        requiredFlow: number,
        maxVelocity: number = 3,
        roughness: number = 0.00015
    ): OptimizationResult {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
            return {
                componentId,
                optimizedParameters: {},
                efficiency: 0,
                margin: 0,
                warnings: [`Component ${componentId} not found`]
            };
        }

        const warnings: string[] = [];
        const flowM3h = requiredFlow / 3600;
        const minDiameter = Math.sqrt(4 * flowM3h / (Math.PI * maxVelocity));

        const standardDiameters = [0.05, 0.08, 0.1, 0.15, 0.2, 0.25, 0.3, 0.4, 0.5];
        const selectedDiameter = standardDiameters.find(d => d >= minDiameter) || standardDiameters[standardDiameters.length - 1];

        const actualVelocity = (4 * flowM3h) / (Math.PI * selectedDiameter * selectedDiameter);

        if (actualVelocity > 3) {
            warnings.push(`Velocity ${actualVelocity.toFixed(2)} m/s exceeds recommended 3 m/s`);
        }

        const headLoss = this.calculateHeadLoss(flowM3h, selectedDiameter, 100, roughness);

        return {
            componentId,
            optimizedParameters: {
                diameter: selectedDiameter * 1000,
                length: Number(component.parameterValues?.length) || 100,
                roughness: roughness * 1000
            },
            efficiency: 1 - (headLoss / 10),
            margin: (selectedDiameter - minDiameter) / minDiameter,
            warnings
        };
    }

    optimizeMotor(
        blueprint: MechBlueprint,
        componentId: string,
        loadPower: number,
        efficiency: number = 0.9,
        serviceFactor: number = 1.15
    ): OptimizationResult {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
            return {
                componentId,
                optimizedParameters: {},
                efficiency: 0,
                margin: 0,
                warnings: [`Component ${componentId} not found`]
            };
        }

        const warnings: string[] = [];
        const requiredPower = loadPower / efficiency;
        const designPower = requiredPower * serviceFactor;

        const standardPowers = [0.75, 1.1, 1.5, 2.2, 3, 4, 5.5, 7.5, 11, 15, 18.5, 22, 30, 37, 45, 55, 75, 90, 110, 132, 160, 200, 250, 315, 355, 400];
        const selectedPower = standardPowers.find(p => p >= designPower) || standardPowers[standardPowers.length - 1];

        const actualServiceFactor = selectedPower / requiredPower;
        if (actualServiceFactor < serviceFactor) {
            warnings.push('Selected motor has lower service factor than recommended');
        }

        const margin = (selectedPower - designPower) / designPower;

        return {
            componentId,
            optimizedParameters: {
                power_kw: selectedPower,
                efficiency: efficiency,
                voltage: 400,
                rpm: 1450
            },
            efficiency: efficiency,
            margin,
            warnings
        };
    }

    optimizeEngine(
        blueprint: MechBlueprint,
        componentId: string,
        requiredPower: number,
        fuelType: 'gasoline' | 'diesel' | 'ng' = 'diesel'
    ): OptimizationResult {
        const component = blueprint.components.find(c => c.id === componentId);
        if (!component) {
            return {
                componentId,
                optimizedParameters: {},
                efficiency: 0,
                margin: 0,
                warnings: [`Component ${componentId} not found`]
            };
        }

        const warnings: string[] = [];
        const bsfc = fuelType === 'diesel' ? 0.22 : 0.28;
        const designPower = requiredPower * 1.2;
        const fuelConsumption = designPower * bsfc;

        const boreStrokeRatio = 1.0;
        const bore = Math.cbrt((designPower * 1000) / (6.28 * 33 * boreStrokeRatio * 0.85 * 0.9 * 100));
        const stroke = bore / boreStrokeRatio;

        const compressionRatio = fuelType === 'diesel' ? 18 : 10;

        return {
            componentId,
            optimizedParameters: {
                cylinders: 4,
                bore_mm: Math.round(bore * 10) / 10,
                stroke_mm: Math.round(stroke * 10) / 10,
                compression_ratio: compressionRatio,
                redline_rpm: 5000,
                fuel_consumption: Math.round(fuelConsumption * 100) / 100
            },
            efficiency: 0.38,
            margin: 0.2,
            warnings
        };
    }

    private calculateNPSH(blueprint: MechBlueprint, pumpId: string): number {
        const pump = blueprint.components.find(c => c.id === pumpId);
        if (!pump) return 0;

        const atmosphericPressure = 10.3;
        const vaporPressure = 2.3;
        const staticHead = 2;

        return atmosphericPressure - vaporPressure + staticHead;
    }

    private estimatePumpEfficiency(flow: number, head: number): number {
        const specificSpeed = 1000 * Math.pow(flow, 0.5) / Math.pow(head, 0.75);

        if (specificSpeed < 500) return 0.55;
        if (specificSpeed < 1000) return 0.65;
        if (specificSpeed < 2000) return 0.75;
        if (specificSpeed < 4000) return 0.80;
        return 0.82;
    }

    private calculateLMTD(t1: number, t2: number, t3: number, t4: number): number {
        const dt1 = t1 - t4;
        const dt2 = t2 - t3;

        if (Math.abs(dt1 - dt2) < 0.1) return dt1;

        return (dt1 - dt2) / Math.log(dt1 / dt2);
    }

    private calculateHeadLoss(flow: number, diameter: number, length: number, roughness: number): number {
        const velocity = flow / (Math.PI * diameter * diameter / 4);
        const reynolds = velocity * diameter / 0.000001;

        const f = roughness / (3.7 * diameter);
        const darcy = 0.079 / Math.pow(reynolds, 0.25);

        return darcy * (length / diameter) * (velocity * velocity) / (2 * 9.81);
    }

    applyOptimizations(
        blueprint: MechBlueprint,
        targets: OptimizationTarget[]
    ): { blueprint: MechBlueprint; results: OptimizationResult[] } {
        const results: OptimizationResult[] = [];

        for (const target of targets) {
            let result: OptimizationResult;

            switch (target.componentType) {
                case 'pump':
                    result = this.optimizePump(
                        blueprint,
                        target.componentId,
                        target.parameters.requiredFlow || 0,
                        target.parameters.requiredHead || 0
                    );
                    break;

                case 'heat_exchanger':
                    result = this.optimizeHeatExchanger(
                        blueprint,
                        target.componentId,
                        target.parameters.hotFlow || 0,
                        target.parameters.coldFlow || 0,
                        target.parameters.hotInletTemp || 0,
                        target.parameters.hotOutletTemp || 0,
                        target.parameters.coldInletTemp || 0
                    );
                    break;

                case 'pipe':
                    result = this.optimizePipe(
                        blueprint,
                        target.componentId,
                        target.parameters.requiredFlow || 0
                    );
                    break;

                case 'motor':
                    result = this.optimizeMotor(
                        blueprint,
                        target.componentId,
                        target.parameters.loadPower || 0
                    );
                    break;

                case 'engine':
                    result = this.optimizeEngine(
                        blueprint,
                        target.componentId,
                        target.parameters.requiredPower || 0
                    );
                    break;

                default:
                    result = {
                        componentId: target.componentId,
                        optimizedParameters: {},
                        efficiency: 0,
                        margin: 0,
                        warnings: ['Unknown component type']
                    };
            }

            results.push(result);

            const component = blueprint.components.find(c => c.id === target.componentId);
            if (component) {
                component.parameterValues = {
                    ...component.parameterValues,
                    ...result.optimizedParameters
                };
            }
        }

        return { blueprint, results };
    }
}

export const componentOptimizer = new ComponentOptimizer();

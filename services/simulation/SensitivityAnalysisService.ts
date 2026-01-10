import type { MechBlueprint } from '../../types';

export interface SensitivityInput {
    parameter: string;
    label: string;
    baseValue: number;
    perturbation: number; // ±percent (e.g., 0.1 = ±10%)
}

export interface SensitivityOutput {
    metric: string;
    label: string;
    baseValue: number;
    elasticity: number; // %Δoutput / %Δinput
    lowValue: number;   // Result at -perturbation
    highValue: number;  // Result at +perturbation
    changePercent: number;
}

export interface SensitivityResult {
    inputs: SensitivityInput[];
    outputs: SensitivityOutput[];
    tornadoData: {
        parameter: string;
        impact: number;  // Range of output variation
        direction: 'positive' | 'negative';
    }[];
    mostSensitive: {
        parameter: string;
        elasticity: number;
        affectedMetrics: string[];
    };
}

export class SensitivityAnalysisService {
    private blueprint: MechBlueprint;

    constructor(blueprint: MechBlueprint) {
        this.blueprint = blueprint;
    }

    analyze(
        inputs: SensitivityInput[],
        outputMetrics: { key: string; label: string }[]
    ): SensitivityResult {
        // For now, calculate theoretical sensitivities based on component types
        // In full implementation, would run simulations at ±perturbation

        const outputs: SensitivityOutput[] = [];
        const tornadoData: SensitivityResult['tornadoData'] = [];

        for (const input of inputs) {
            const lowValue = input.baseValue * (1 - input.perturbation);
            const highValue = input.baseValue * (1 + input.perturbation);

            for (const metric of outputMetrics) {
                const sensitivity = this.calculateSensitivity(input.parameter, metric.key, input.baseValue);
                const baseVal = this.getBaseMetricValue(metric.key);
                
                outputs.push({
                    metric: metric.key,
                    label: metric.label,
                    baseValue: baseVal,
                    elasticity: sensitivity.elasticity,
                    lowValue: baseVal * (1 - sensitivity.elasticity * input.perturbation),
                    highValue: baseVal * (1 + sensitivity.elasticity * input.perturbation),
                    changePercent: Math.abs(sensitivity.elasticity) * input.perturbation * 100
                });

                tornadoData.push({
                    parameter: input.label,
                    impact: Math.abs(sensitivity.elasticity) * input.perturbation * 100,
                    direction: sensitivity.direction
                });
            }
        }

        // Find most sensitive parameter
        const sortedOutputs = [...outputs].sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
        const mostSensitive = sortedOutputs[0];

        return {
            inputs,
            outputs,
            tornadoData: tornadoData.sort((a, b) => b.impact - a.impact),
            mostSensitive: {
                parameter: mostSensitive?.label || '',
                elasticity: Math.abs(mostSensitive?.elasticity || 0),
                affectedMetrics: outputs
                    .filter(o => Math.abs(o.elasticity) > 0.1)
                    .map(o => o.label)
            }
        };
    }

    private calculateSensitivity(
        parameter: string,
        metric: string,
        baseValue: number
    ): { elasticity: number; direction: 'positive' | 'negative' } {
        // Theoretical sensitivities based on component physics
        
        // Pump parameters affect flow, head, power
        if (parameter.includes('pump') || parameter.includes('speed') || parameter.includes('flow')) {
            if (metric.includes('flow') || metric.includes('Flow')) {
                return { elasticity: 1.0, direction: 'positive' }; // Q ∝ N
            }
            if (metric.includes('head') || metric.includes('Head')) {
                return { elasticity: 2.0, direction: 'positive' }; // H ∝ N²
            }
            if (metric.includes('power') || metric.includes('Power')) {
                return { elasticity: 3.0, direction: 'positive' }; // P ∝ N³
            }
            if (metric.includes('efficiency') || metric.includes('Efficiency')) {
                return { elasticity: 0.1, direction: 'positive' };
            }
        }

        // Valve parameters affect flow
        if (parameter.includes('valve') || parameter.includes('throttle') || parameter.includes('opening')) {
            if (metric.includes('flow') || metric.includes('Flow')) {
                return { elasticity: 0.5, direction: 'positive' }; // Approximate valve law
            }
            if (metric.includes('head') || metric.includes('Head')) {
                return { elasticity: -0.5, direction: 'negative' }; // Higher flow = lower head
            }
        }

        // Pipe diameter affects flow and head loss
        if (parameter.includes('diameter') || parameter.includes('pipe')) {
            if (metric.includes('flow') || metric.includes('Flow')) {
                return { elasticity: 2.63, direction: 'positive' }; // Q ∝ D^2.63 (Hazen-Williams)
            }
            if (metric.includes('head_loss') || metric.includes('Head Loss')) {
                return { elasticity: -4.87, direction: 'negative' }; // Loss ∝ 1/D^4.87
            }
        }

        // Engine parameters
        if (parameter.includes('engine') || parameter.includes('rpm') || parameter.includes('speed')) {
            if (metric.includes('power') || metric.includes('Power')) {
                return { elasticity: 1.0, direction: 'positive' }; // P ∝ N (approximately)
            }
            if (metric.includes('torque') || metric.includes('Torque')) {
                return { elasticity: 0.5, direction: 'positive' }; // Torque roughly constant at partial load
            }
            if (metric.includes('fuel') || metric.includes('Fuel')) {
                return { elasticity: 1.0, direction: 'positive' };
            }
        }

        // Heat transfer parameters
        if (parameter.includes('heat') || parameter.includes('temperature') || parameter.includes('area')) {
            if (metric.includes('temperature') || metric.includes('Temperature')) {
                return { elasticity: 0.5, direction: 'positive' };
            }
            if (metric.includes('heat') || metric.includes('Heat')) {
                return { elasticity: 1.0, direction: 'positive' };
            }
        }

        // Default sensitivity
        return { elasticity: 0.3, direction: 'positive' };
    }

    private getBaseMetricValue(metric: string): number {
        // Return typical base values for metrics
        const baseValues: Record<string, number> = {
            flow: 100,
            Flow: 100,
            Flow_Rate: 100,
            head: 50,
            Head: 50,
            power: 25,
            Power: 25,
            efficiency: 75,
            Efficiency: 75,
            temperature: 80,
            Temperature: 80,
            torque: 100,
            Torque: 100,
            fuel: 10,
            Fuel: 10,
            heat: 50,
            Heat: 50,
            head_loss: 5,
            Head_Loss: 5
        };

        return baseValues[metric] || 50;
    }
}

// Preset sensitivity analyses for common scenarios
export const SENSITIVITY_PRESETS: Record<string, {
    name: string;
    description: string;
    inputs: SensitivityInput[];
    outputs: { key: string; label: string }[];
}> = {
    pump_system: {
        name: 'Pump System Sensitivity',
        description: 'Analyze how pump and pipe changes affect system performance',
        inputs: [
            { parameter: 'pump_speed', label: 'Pump Speed', baseValue: 1450, perturbation: 0.1 },
            { parameter: 'pipe_diameter', label: 'Pipe Diameter', baseValue: 100, perturbation: 0.1 },
            { parameter: 'valve_opening', label: 'Valve Opening', baseValue: 100, perturbation: 0.1 }
        ],
        outputs: [
            { key: 'flow', label: 'Flow Rate' },
            { key: 'head', label: 'System Head' },
            { key: 'power', label: 'Pump Power' },
            { key: 'efficiency', label: 'Efficiency' }
        ]
    },
    engine_cooling: {
        name: 'Engine Cooling Sensitivity',
        description: 'Analyze thermal management system sensitivity',
        inputs: [
            { parameter: 'coolant_flow', label: 'Coolant Flow', baseValue: 50, perturbation: 0.1 },
            { parameter: 'radiator_area', label: 'Radiator Area', baseValue: 2, perturbation: 0.1 },
            { parameter: 'ambient_temp', label: 'Ambient Temperature', baseValue: 25, perturbation: 0.1 }
        ],
        outputs: [
            { key: 'temperature', label: 'Engine Temperature' },
            { key: 'heat', label: 'Heat Rejection' },
            { key: 'flow', label: 'Coolant Flow' }
        ]
    },
    power_system: {
        name: 'Power System Sensitivity',
        description: 'Analyze powertrain efficiency sensitivity',
        inputs: [
            { parameter: 'engine_rpm', label: 'Engine RPM', baseValue: 3000, perturbation: 0.1 },
            { parameter: 'load', label: 'System Load', baseValue: 100, perturbation: 0.1 },
            { parameter: 'gear_ratio', label: 'Gear Ratio', baseValue: 3, perturbation: 0.1 }
        ],
        outputs: [
            { key: 'power', label: 'Output Power' },
            { key: 'torque', label: 'Output Torque' },
            { key: 'efficiency', label: 'System Efficiency' },
            { key: 'fuel', label: 'Fuel Consumption' }
        ]
    }
};

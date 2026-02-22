import type { MechBlueprint, MechSimulationResult } from '../../types';
import { SimulationService } from '../physics/SimulationService';

export interface SensitivityInput {
    parameter: string;
    label: string;
    baseValue: number;
    perturbation: number; // +/-percent (e.g., 0.1 = +/-10%)
}

export interface SensitivityOutput {
    parameter?: string;
    metric: string;
    label: string;
    baseValue: number;
    elasticity: number; // %delta output / %delta input
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

interface ResolvedParameterPath {
    componentId: string;
    paramName: string;
}

type SimulationRunner = (blueprint: MechBlueprint) => Promise<MechSimulationResult>;

export class SensitivityAnalysisService {
    private blueprint: MechBlueprint;

    constructor(blueprint: MechBlueprint) {
        this.blueprint = blueprint;
    }

    async analyze(
        inputs: SensitivityInput[],
        outputMetrics: { key: string; label: string }[],
        onProgress?: (current: number, total: number) => void
    ): Promise<SensitivityResult> {
        return this.analyzeWithSimulations(
            inputs,
            outputMetrics,
            async (bp) => SimulationService.run(bp, true),
            onProgress
        );
    }

    async analyzeWithSimulations(
        inputs: SensitivityInput[],
        outputMetrics: { key: string; label: string }[],
        simulationRunner: SimulationRunner,
        onProgress?: (current: number, total: number) => void
    ): Promise<SensitivityResult> {
        const baseBlueprint = this.cloneBlueprint(this.blueprint);
        const baseResult = await simulationRunner(baseBlueprint);
        const baseValues: Record<string, number> = {};
        for (const metric of outputMetrics) {
            baseValues[metric.key] = this.getMetricFromResult(baseResult, metric.key);
        }

        const outputs: SensitivityOutput[] = [];
        const tornadoMap = new Map<string, { impact: number; direction: 'positive' | 'negative' }>();
        const parameterMetricMap = new Map<string, Set<string>>();
        const parameterElasticityMap = new Map<string, number>();

        const totalRuns = 1 + inputs.length * 2;
        let runIndex = 1;
        onProgress?.(runIndex, totalRuns);

        for (const input of inputs) {
            const resolvedPath = this.resolveParameter(input.parameter);
            if (!resolvedPath) {
                for (const metric of outputMetrics) {
                    outputs.push({
                        parameter: input.label,
                        metric: metric.key,
                        label: metric.label,
                        baseValue: baseValues[metric.key] ?? 0,
                        elasticity: 0,
                        lowValue: baseValues[metric.key] ?? 0,
                        highValue: baseValues[metric.key] ?? 0,
                        changePercent: 0
                    });
                }
                tornadoMap.set(input.label, { impact: 0, direction: 'positive' });
                continue;
            }

            const baseParamValue = this.getParameterValue(baseBlueprint, resolvedPath, input.baseValue);
            const perturbation = Math.max(0.0001, Math.abs(input.perturbation || 0.1));

            const lowBlueprint = this.cloneBlueprint(baseBlueprint);
            const highBlueprint = this.cloneBlueprint(baseBlueprint);
            this.setParameterValue(lowBlueprint, resolvedPath, baseParamValue * (1 - perturbation));
            this.setParameterValue(highBlueprint, resolvedPath, baseParamValue * (1 + perturbation));

            const lowResult = await simulationRunner(lowBlueprint);
            runIndex += 1;
            onProgress?.(runIndex, totalRuns);

            const highResult = await simulationRunner(highBlueprint);
            runIndex += 1;
            onProgress?.(runIndex, totalRuns);

            for (const metric of outputMetrics) {
                const baseMetricValue = baseValues[metric.key] ?? this.getMetricFromResult(baseResult, metric.key);
                const lowMetricValue = this.getMetricFromResult(lowResult, metric.key);
                const highMetricValue = this.getMetricFromResult(highResult, metric.key);

                const deltaOutputCentral = (highMetricValue - lowMetricValue) / 2;
                const elasticity = (Math.abs(baseMetricValue) > 1e-9)
                    ? (deltaOutputCentral / baseMetricValue) / perturbation
                    : 0;
                const impact = Math.abs(elasticity) * perturbation * 100;

                outputs.push({
                    parameter: input.label,
                    metric: metric.key,
                    label: metric.label,
                    baseValue: baseMetricValue,
                    elasticity,
                    lowValue: lowMetricValue,
                    highValue: highMetricValue,
                    changePercent: impact
                });

                const existingTornado = tornadoMap.get(input.label);
                if (!existingTornado || impact > existingTornado.impact) {
                    tornadoMap.set(input.label, {
                        impact,
                        direction: elasticity >= 0 ? 'positive' : 'negative'
                    });
                }

                if (!parameterMetricMap.has(input.label)) {
                    parameterMetricMap.set(input.label, new Set<string>());
                }
                parameterMetricMap.get(input.label)!.add(metric.label);

                const existingElasticity = parameterElasticityMap.get(input.label) ?? 0;
                if (Math.abs(elasticity) > Math.abs(existingElasticity)) {
                    parameterElasticityMap.set(input.label, elasticity);
                }
            }
        }

        const tornadoData = Array.from(tornadoMap.entries())
            .map(([parameter, data]) => ({
                parameter,
                impact: data.impact,
                direction: data.direction
            }))
            .sort((a, b) => b.impact - a.impact);

        const mostSensitiveParameter = tornadoData[0]?.parameter || '';
        const mostSensitiveElasticity = parameterElasticityMap.get(mostSensitiveParameter) ?? 0;
        const affectedMetrics = Array.from(parameterMetricMap.get(mostSensitiveParameter) ?? []);

        return {
            inputs,
            outputs,
            tornadoData,
            mostSensitive: {
                parameter: mostSensitiveParameter,
                elasticity: mostSensitiveElasticity,
                affectedMetrics
            }
        };
    }

    private cloneBlueprint(blueprint: MechBlueprint): MechBlueprint {
        return JSON.parse(JSON.stringify(blueprint)) as MechBlueprint;
    }

    private resolveParameter(parameter: string): ResolvedParameterPath | null {
        const parts = parameter.split(/[.:]/).filter(Boolean);
        const aliasMap: Record<string, string> = {
            pump_speed: 'speed',
            impeller_diameter: 'diameter',
            design_flow: 'design_flow',
            design_head: 'design_head',
            throttle_opening: 'opening',
            valve_opening: 'opening',
            valve_cv: 'cv',
            coolant_flow: 'design_flow',
            engine_rpm: 'speed',
            radiator_area: 'area',
            ambient_temp: 'ambient_temperature',
            pipe_diameter: 'diameter'
        };

        const componentHint = parts.length > 1 ? parts[0].toLowerCase() : parameter.toLowerCase();
        const directParam = parts.length > 1 ? parts[1] : parameter;
        const paramCandidates = Array.from(new Set([
            directParam,
            aliasMap[parameter],
            parameter.split('_').slice(1).join('_'),
            parameter.split('_').pop()
        ].filter(Boolean) as string[]));

        for (const candidate of paramCandidates) {
            const exactMatches = this.blueprint.components.filter((comp) => Object.prototype.hasOwnProperty.call(comp.parameterValues, candidate));
            if (exactMatches.length > 0) {
                const hinted = exactMatches.find((comp) =>
                    comp.name.toLowerCase().includes(componentHint) ||
                    comp.componentDefinitionId.toLowerCase().includes(componentHint)
                );
                return {
                    componentId: (hinted || exactMatches[0]).id,
                    paramName: candidate
                };
            }
        }

        for (const comp of this.blueprint.components) {
            const keys = Object.keys(comp.parameterValues);
            const fuzzyKey = keys.find((key) => paramCandidates.some((candidate) => key.toLowerCase().includes(candidate.toLowerCase())));
            if (fuzzyKey) {
                return { componentId: comp.id, paramName: fuzzyKey };
            }
        }

        return null;
    }

    private getParameterValue(
        blueprint: MechBlueprint,
        path: ResolvedParameterPath,
        fallbackValue: number
    ): number {
        const component = blueprint.components.find((comp) => comp.id === path.componentId);
        if (!component) return fallbackValue;
        const raw = component.parameterValues[path.paramName];
        const parsed = Number(raw);
        return Number.isFinite(parsed) ? parsed : fallbackValue;
    }

    private setParameterValue(
        blueprint: MechBlueprint,
        path: ResolvedParameterPath,
        value: number
    ): void {
        const component = blueprint.components.find((comp) => comp.id === path.componentId);
        if (!component) return;
        component.parameterValues[path.paramName] = value;
    }

    private getMetricFromResult(result: MechSimulationResult, key: string): number {
        const metricKey = key.toLowerCase();

        if (metricKey.includes('efficiency')) {
            return Number(result.metrics?.overallEfficiency ?? 0);
        }
        if (metricKey.includes('flow')) {
            const flowMetric = Number(result.metrics?.totalFlowRate ?? 0);
            return flowMetric !== 0 ? flowMetric : this.aggregateVariableValues(result.variables, ['flow_rate', 'flow'], 'sum_abs');
        }
        if (metricKey.includes('head_loss') || metricKey.includes('loss')) {
            return this.aggregateVariableValues(result.variables, ['head_loss', 'loss'], 'sum_abs');
        }
        if (metricKey.includes('head')) {
            return this.aggregateVariableValues(result.variables, ['head'], 'max');
        }
        if (metricKey.includes('power')) {
            const input = Number(result.metrics?.totalPowerInput ?? 0);
            const output = Number(result.metrics?.totalPowerOutput ?? 0);
            return output > 0 ? output : input;
        }
        if (metricKey.includes('pressure')) {
            const maxPressure = Number(result.metrics?.maxPressure ?? 0);
            return maxPressure !== 0 ? maxPressure : this.aggregateVariableValues(result.variables, ['pressure'], 'max');
        }
        if (metricKey.includes('temperature')) {
            return this.aggregateVariableValues(result.variables, ['temperature', 'temp'], 'max');
        }
        if (metricKey.includes('torque')) {
            return this.aggregateVariableValues(result.variables, ['torque'], 'max');
        }
        if (metricKey.includes('fuel')) {
            return this.aggregateVariableValues(result.variables, ['fuel'], 'sum_abs');
        }
        if (metricKey.includes('heat')) {
            return Number(result.metrics?.totalHeatOutput ?? result.metrics?.totalHeatInput ?? 0);
        }

        return this.aggregateVariableValues(result.variables, [metricKey], 'first');
    }

    private aggregateVariableValues(
        variables: Record<string, number>,
        hints: string[],
        mode: 'sum_abs' | 'max' | 'first'
    ): number {
        const matches = Object.entries(variables)
            .filter(([name]) => hints.some((hint) => name.toLowerCase().includes(hint.toLowerCase())))
            .map(([, value]) => Number(value))
            .filter((value) => Number.isFinite(value));

        if (matches.length === 0) return 0;
        if (mode === 'first') return matches[0];
        if (mode === 'max') return Math.max(...matches);
        return matches.reduce((sum, value) => sum + Math.abs(value), 0);
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

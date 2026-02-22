import type { MechBlueprint, MechSimulationResult } from '../../types';
import { SimulationService } from '../physics/SimulationService';

export interface ParametricSweepConfig {
    parameter: string;
    values: number[];
    unit: string;
    label: string;
}

export interface ParametricSweepResult {
    config: ParametricSweepConfig;
    results: SweepResult[];
    bestEfficiencyPoint: {
        value: number;
        efficiency: number;
        flow: number;
        head: number;
    };
    pumpCurve: { flow: number; head: number }[];
}

export interface SweepResult {
    parameterValue: number;
    flow: number;
    head: number;
    power: number;
    efficiency: number;
    npshAvailable: number;
    npshRequired: number;
    suctionEnergy: number;
    dischargeEnergy: number;
    flowVelocity: number;
    reynoldsNumber: number;
    frictionFactor: number;
    headLoss: number;
    status: 'ok' | 'warning' | 'error';
    warnings: string[];
}

interface ResolvedParameterPath {
    componentId: string;
    paramName: string;
}

type SimulationRunner = (blueprint: MechBlueprint) => Promise<MechSimulationResult>;

export class ParametricSweepService {
    private blueprint: MechBlueprint;
    private results: Map<number, SweepResult> = new Map();

    constructor(blueprint: MechBlueprint) {
        this.blueprint = blueprint;
    }

    async runSweep(
        config: ParametricSweepConfig,
        onProgress?: (current: number, total: number) => void
    ): Promise<ParametricSweepResult> {
        return this.runSweepWithSimulations(
            config,
            async (bp) => SimulationService.run(bp, true),
            onProgress
        );
    }

    async runSweepWithSimulations(
        config: ParametricSweepConfig,
        simulationRunner: SimulationRunner,
        onProgress?: (current: number, total: number) => void
    ): Promise<ParametricSweepResult> {
        this.results.clear();
        const sweepResults: SweepResult[] = [];

        const resolvedPath = this.resolveParameter(config.parameter);
        if (!resolvedPath) {
            for (const value of config.values) {
                const failed: SweepResult = {
                    parameterValue: value,
                    flow: 0,
                    head: 0,
                    power: 0,
                    efficiency: 0,
                    npshAvailable: 0,
                    npshRequired: 0,
                    suctionEnergy: 0,
                    dischargeEnergy: 0,
                    flowVelocity: 0,
                    reynoldsNumber: 0,
                    frictionFactor: 0,
                    headLoss: 0,
                    status: 'error',
                    warnings: [`Parameter "${config.parameter}" could not be resolved to any component parameter.`]
                };
                this.results.set(value, failed);
                sweepResults.push(failed);
            }
            return this.buildSweepResult(config, sweepResults);
        }

        const baseBlueprint = this.cloneBlueprint(this.blueprint);
        const baseParamValue = this.getParameterValue(baseBlueprint, resolvedPath, 100);

        for (let i = 0; i < config.values.length; i++) {
            const parameterPercent = config.values[i];
            const sweepBlueprint = this.cloneBlueprint(baseBlueprint);
            const appliedValue = baseParamValue * (parameterPercent / 100);
            this.setParameterValue(sweepBlueprint, resolvedPath, appliedValue);

            let pointResult: SweepResult;
            try {
                const simulationResult = await simulationRunner(sweepBlueprint);
                pointResult = this.toSweepPoint(parameterPercent, simulationResult);
            } catch (error) {
                pointResult = {
                    parameterValue: parameterPercent,
                    flow: 0,
                    head: 0,
                    power: 0,
                    efficiency: 0,
                    npshAvailable: 0,
                    npshRequired: 0,
                    suctionEnergy: 0,
                    dischargeEnergy: 0,
                    flowVelocity: 0,
                    reynoldsNumber: 0,
                    frictionFactor: 0,
                    headLoss: 0,
                    status: 'error',
                    warnings: [error instanceof Error ? error.message : String(error)]
                };
            }

            this.results.set(parameterPercent, pointResult);
            sweepResults.push(pointResult);
            onProgress?.(i + 1, config.values.length);
        }

        return this.buildSweepResult(config, sweepResults);
    }

    private buildSweepResult(config: ParametricSweepConfig, results: SweepResult[]): ParametricSweepResult {
        const bestEfficiency = this.findBestEfficiency(results);
        const pumpCurve = this.generatePumpCurve(results);

        return {
            config,
            results,
            bestEfficiencyPoint: bestEfficiency,
            pumpCurve
        };
    }

    private toSweepPoint(parameterValue: number, result: MechSimulationResult): SweepResult {
        const flow = this.getMetric(result, 'flow');
        const head = this.getMetric(result, 'head');
        const efficiency = this.getMetric(result, 'efficiency');
        const power = this.getMetric(result, 'power');
        const npshAvailable = this.getMetric(result, 'npsh_available');
        const npshRequired = this.getMetric(result, 'npsh_required');
        const suctionEnergy = this.getMetric(result, 'suction_energy');
        const dischargeEnergy = this.getMetric(result, 'discharge_energy');
        const flowVelocity = this.getMetric(result, 'flow_velocity');
        const reynoldsNumber = this.getMetric(result, 'reynolds');
        const frictionFactor = this.getMetric(result, 'friction_factor');
        const headLoss = this.getMetric(result, 'head_loss');

        const warningMessages = (result.issues || []).map((issue) => issue.message);
        const status: 'ok' | 'warning' | 'error' =
            result.status !== 'completed'
                ? 'error'
                : warningMessages.length > 0
                    ? 'warning'
                    : 'ok';

        return {
            parameterValue,
            flow,
            head,
            power,
            efficiency,
            npshAvailable,
            npshRequired,
            suctionEnergy,
            dischargeEnergy,
            flowVelocity,
            reynoldsNumber,
            frictionFactor,
            headLoss,
            status,
            warnings: warningMessages
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
            valve_cv: 'cv',
            system_resistance: 'roughness'
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

    private getMetric(result: MechSimulationResult, key: string): number {
        const metricKey = key.toLowerCase();
        if (metricKey === 'flow') {
            const flowMetric = Number(result.metrics?.totalFlowRate ?? 0);
            return flowMetric !== 0 ? flowMetric : this.aggregateVariables(result.variables, ['flow_rate', 'flow'], 'sum_abs');
        }
        if (metricKey === 'head') {
            return this.aggregateVariables(result.variables, ['head'], 'max');
        }
        if (metricKey === 'power') {
            const output = Number(result.metrics?.totalPowerOutput ?? 0);
            const input = Number(result.metrics?.totalPowerInput ?? 0);
            return output > 0 ? output : input;
        }
        if (metricKey === 'efficiency') {
            return Number(result.metrics?.overallEfficiency ?? 0);
        }
        if (metricKey === 'npsh_available') {
            return this.aggregateVariables(result.variables, ['npsh_available', 'npsha'], 'first');
        }
        if (metricKey === 'npsh_required') {
            return this.aggregateVariables(result.variables, ['npsh_required', 'npshr'], 'first');
        }
        if (metricKey === 'suction_energy') {
            return this.aggregateVariables(result.variables, ['suction_energy', 'suction'], 'first');
        }
        if (metricKey === 'discharge_energy') {
            return this.aggregateVariables(result.variables, ['discharge_energy', 'discharge'], 'first');
        }
        if (metricKey === 'flow_velocity') {
            return this.aggregateVariables(result.variables, ['velocity'], 'max');
        }
        if (metricKey === 'reynolds') {
            return this.aggregateVariables(result.variables, ['reynolds'], 'max');
        }
        if (metricKey === 'friction_factor') {
            return this.aggregateVariables(result.variables, ['friction_factor', 'darcy_f'], 'first');
        }
        if (metricKey === 'head_loss') {
            return this.aggregateVariables(result.variables, ['head_loss', 'loss'], 'sum_abs');
        }
        return 0;
    }

    private aggregateVariables(
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

    private findBestEfficiency(results: SweepResult[]): {
        value: number;
        efficiency: number;
        flow: number;
        head: number;
    } {
        const valid = results.filter((result) => result.status !== 'error');
        const pool = valid.length > 0 ? valid : results;
        const best = pool.reduce((winner, current) => {
            return current.efficiency > winner.efficiency ? current : winner;
        }, pool[0]);

        return {
            value: best?.parameterValue ?? 0,
            efficiency: best?.efficiency ?? 0,
            flow: best?.flow ?? 0,
            head: best?.head ?? 0
        };
    }

    private generatePumpCurve(results: SweepResult[]): { flow: number; head: number }[] {
        return [...results]
            .filter((result) => result.status !== 'error')
            .sort((a, b) => a.flow - b.flow)
            .map((result) => ({ flow: result.flow, head: result.head }));
    }

    getResultsForValue(value: number): SweepResult | undefined {
        return this.results.get(value);
    }

    getAllResults(): SweepResult[] {
        return Array.from(this.results.values());
    }
}

export function generateSweepValues(
    parameter: string,
    baseValue: number,
    minPercent: number = 50,
    maxPercent: number = 150,
    steps: number = 11
): number[] {
    const values: number[] = [];
    const step = (maxPercent - minPercent) / (steps - 1);

    for (let i = 0; i < steps; i++) {
        const percent = minPercent + i * step;
        values.push(Math.round(percent));
    }

    return values;
}

export const SWEEP_PRESETS: Record<string, { parameter: string; label: string; unit: string }> = {
    pump_speed: { parameter: 'pump_speed', label: 'Pump Speed', unit: 'RPM' },
    impeller_diameter: { parameter: 'impeller_diameter', label: 'Impeller Diameter', unit: 'mm' },
    design_flow: { parameter: 'design_flow', label: 'Design Flow', unit: 'm³/h' },
    design_head: { parameter: 'design_head', label: 'Design Head', unit: 'm' },
    throttle_opening: { parameter: 'throttle_opening', label: 'Throttle Opening', unit: '%' },
    valve_cv: { parameter: 'valve_cv', label: 'Valve Cv', unit: '' },
    system_resistance: { parameter: 'system_resistance', label: 'System Resistance', unit: '%' }
};

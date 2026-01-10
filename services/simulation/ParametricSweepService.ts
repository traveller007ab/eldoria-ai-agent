import type { MechBlueprint } from '../../types';

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

export class ParametricSweepService {
    private blueprint: MechBlueprint;
    private results: Map<number, SweepResult> = new Map();

    constructor(blueprint: MechBlueprint) {
        this.blueprint = blueprint;
    }

    async runSweep(config: ParametricSweepConfig): Promise<ParametricSweepResult> {
        this.results.clear();

        // For now, simulate sweep results based on pump affinity laws
        // In real implementation, would run actual simulation for each point
        const baseResult = await this.getBaseResult();
        
        const sweepResults: SweepResult[] = config.values.map(value => {
            const result = this.calculateSweepPoint(value, config.parameter, baseResult);
            this.results.set(value, result);
            return result;
        });

        const bestEfficiency = this.findBestEfficiency(sweepResults);
        const pumpCurve = this.generatePumpCurve(sweepResults);

        return {
            config,
            results: sweepResults,
            bestEfficiencyPoint: bestEfficiency,
            pumpCurve
        };
    }

    private async getBaseResult(): Promise<Record<string, number>> {
        // Would run actual simulation in full implementation
        return {
            flow: 100,      // m³/h
            head: 50,       // m
            power: 25,      // kW
            efficiency: 75, // %
            npshAvailable: 15, // m
            npshRequired: 3,   // m
            suctionEnergy: 5,
            dischargeEnergy: 50,
            flowVelocity: 2.5, // m/s
            reynoldsNumber: 500000,
            frictionFactor: 0.02,
            headLoss: 2.5
        };
    }

    private calculateSweepPoint(
        value: number,
        parameter: string,
        base: Record<string, number>
    ): SweepResult {
        const ratio = value / 100; // Normalize to 100%

        // Apply affinity laws
        const flow = base.flow * ratio;
        const head = base.head * (ratio * ratio);
        const power = base.power * (ratio * ratio * ratio);

        // Calculate efficiency (parabolic, peaks at 80-90% flow)
        const efficiencyPeak = 0.85;
        const efficiencyDrop = Math.pow(ratio - efficiencyPeak, 2) * 50;
        const efficiency = Math.min(90, Math.max(40, base.efficiency - efficiencyDrop));

        // Recalculate dependent parameters
        const flowVelocity = flow / 60; // Simplified
        const reynoldsNumber = base.reynoldsNumber * ratio;
        const frictionFactor = 0.02 * (1 + 0.5 * (1 - ratio)); // Increases at low flow
        const headLoss = base.headLoss * (ratio * ratio);

        const npshRequired = 2 + 0.5 * (1 - ratio); // Higher at low flow
        const suctionEnergy = base.suctionEnergy;
        const dischargeEnergy = base.head * ratio;

        // Determine status and warnings
        const warnings: string[] = [];
        let status: 'ok' | 'warning' | 'error' = 'ok';

        if (efficiency < 50) {
            warnings.push('Low efficiency region');
            status = 'warning';
        }
        if (ratio < 0.5) {
            warnings.push('Risk of surge at low flow');
            status = 'warning';
        }
        if (npshRequired > base.npshAvailable) {
            warnings.push('NPSH margin insufficient');
            status = 'error';
        }
        if (flowVelocity > 3) {
            warnings.push('High velocity - check erosion');
            status = 'warning';
        }
        if (ratio < 0.3) {
            warnings.push('Severe low flow - not recommended');
            status = 'error';
        }

        return {
            parameterValue: value,
            flow,
            head,
            power,
            efficiency,
            npshAvailable: base.npshAvailable,
            npshRequired,
            suctionEnergy,
            dischargeEnergy,
            flowVelocity,
            reynoldsNumber,
            frictionFactor,
            headLoss,
            status,
            warnings
        };
    }

    private findBestEfficiency(results: SweepResult[]): {
        value: number;
        efficiency: number;
        flow: number;
        head: number;
    } {
        let best = results[0];
        for (const r of results) {
            if (r.efficiency > best.efficiency) {
                best = r;
            }
        }
        return {
            value: best.parameterValue,
            efficiency: best.efficiency,
            flow: best.flow,
            head: best.head
        };
    }

    private generatePumpCurve(results: SweepResult[]): { flow: number; head: number }[] {
        // Sort by flow and extract pump curve points
        return results
            .sort((a, b) => a.flow - b.flow)
            .map(r => ({ flow: r.flow, head: r.head }));
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

/**
 * GenesisKernel: Unified SAF Physics Engine
 * 
 * Consolidates all simulation logic:
 * - Topological solving (from SAFEngine.ts)
 * - Validation utilities (from engine.ts)
 * - Formula evaluation (from engine.ts)
 * - Rankine cycle calculations (for mechanical domain)
 * - Circular dependency detection
 * 
 * This is the ONE source of truth for client-side physics.
 */

import { DeepSAFBlueprint, DeepSAFComponent, SAFHistoryEntry, SAFParameter } from './types';

// ============================================
// PHYSICS CONSTANTS
// ============================================

const GRAVITY = 9.81;
const AMBIENT_TEMP = 293.15; // 20°C in Kelvin
const STEFAN_BOLTZMANN = 5.67e-8; // W/(m²·K⁴)

// ============================================
// TYPES
// ============================================

interface SimulationContext {
    vars: Record<string, number>;
    logs: string[];
}

export interface SimulationResult {
    vars: Record<string, number>;
    logs: string[];
    success: boolean;
    solveTimeMs: number;
}

// ============================================
// VALIDATION UTILITIES
// ============================================

/**
 * Validate a numeric result - guards against NaN, Infinity, and extreme values
 */
export function validateNumericResult(value: number, fallback: number = 0, min?: number, max?: number): number {
    if (!Number.isFinite(value)) {
        console.warn(`[GenesisKernel] Invalid result (${value}), using fallback ${fallback}`);
        return fallback;
    }
    if (min !== undefined && value < min) return min;
    if (max !== undefined && value > max) return max;
    return Math.round(value * 1000) / 1000;
}

/**
 * Validate a parameter value against its constraints
 */
export function validateParameter(param: SAFParameter, newValue: number | string): { valid: boolean; value: number | string; error?: string } {
    if (typeof newValue === 'string') {
        return { valid: true, value: newValue };
    }

    if (!Number.isFinite(newValue)) {
        return { valid: false, value: param.value, error: `Invalid number: ${newValue}` };
    }

    if (param.min !== undefined && newValue < param.min) {
        return { valid: false, value: param.min, error: `Value ${newValue} below minimum ${param.min}` };
    }
    if (param.max !== undefined && newValue > param.max) {
        return { valid: false, value: param.max, error: `Value ${newValue} above maximum ${param.max}` };
    }

    return { valid: true, value: newValue };
}

/**
 * Sanitize formula expression to prevent injection
 */
function sanitizeExpression(expr: string): string {
    return expr.replace(/[^0-9+\-*/.() _]/g, '');
}

// ============================================
// FORMULA EVALUATION
// ============================================

/**
 * Evaluate a formula with component context
 */
export function evaluateFormula(
    formula: string,
    component: DeepSAFComponent,
    allComponents: DeepSAFComponent[]
): number {
    if (!formula || formula.trim() === '') return 0;

    try {
        let expression = formula.toLowerCase();

        // Handle component references like "boiler.heat_input"
        const componentRefRegex = /(\w+)\.(\w+)/g;
        expression = expression.replace(componentRefRegex, (match, compName, paramName) => {
            const refComp = allComponents.find(c =>
                c.id.toLowerCase() === compName || c.name.toLowerCase() === compName
            );
            if (!refComp) return '0';

            const param = refComp.parameters?.find(p =>
                p.name.toLowerCase().replace(/\s+/g, '_') === paramName
            );
            if (param && typeof param.value === 'number') {
                return String(param.value);
            }

            const output = refComp.outputs?.find(o =>
                o.name.toLowerCase().replace(/\s+/g, '_') === paramName
            );
            if (output && typeof output.value === 'number') {
                return String(output.value);
            }

            return '0';
        });

        // Replace local parameter references
        component.parameters?.forEach(param => {
            if (typeof param.value === 'number') {
                const key = param.name.toLowerCase().replace(/\s+/g, '_');
                expression = expression.replace(new RegExp(`\\b${key}\\b`, 'g'), String(param.value));
            }
        });

        const sanitized = sanitizeExpression(expression);

        if (/^[\d\s+\-*/.()]+$/.test(sanitized)) {
            const result = eval(sanitized);
            return validateNumericResult(result, 0);
        }

        return 0;
    } catch (e) {
        console.error('[GenesisKernel] Formula evaluation error:', { formula, error: e });
        return 0;
    }
}

// ============================================
// MAIN SOLVER CLASS
// ============================================

export class GenesisKernel {

    /**
     * Solves the system state using topological sort.
     * This is the main entry point for real-time simulation.
     */
    static solve(blueprint: DeepSAFBlueprint): SimulationResult {
        const startTime = performance.now();
        const ctx: SimulationContext = { vars: {}, logs: [] };
        const { components, flows } = blueprint;

        if (!components || components.length === 0) {
            return { vars: {}, logs: ['No components to simulate'], success: true, solveTimeMs: 0 };
        }

        // 1. Build Adjacency Graph & In-Degree Map (Kahn's Algorithm)
        const adj = new Map<string, string[]>();
        const inDegree = new Map<string, number>();
        const componentMap = new Map<string, DeepSAFComponent>();

        components.forEach(c => {
            adj.set(c.id, []);
            inDegree.set(c.id, 0);
            componentMap.set(c.id, c);
        });

        flows.forEach(f => {
            if (adj.has(f.from) && inDegree.has(f.to)) {
                adj.get(f.from)?.push(f.to);
                inDegree.set(f.to, (inDegree.get(f.to) || 0) + 1);
            }
        });

        // 2. Topological Sort
        const queue: string[] = [];
        components.forEach(c => {
            if ((inDegree.get(c.id) || 0) === 0) {
                queue.push(c.id);
            }
        });

        const sortedOrder: string[] = [];

        while (queue.length > 0) {
            const u = queue.shift()!;
            sortedOrder.push(u);

            const neighbors = adj.get(u) || [];
            neighbors.forEach(v => {
                inDegree.set(v, (inDegree.get(v) || 0) - 1);
                if (inDegree.get(v) === 0) {
                    queue.push(v);
                }
            });
        }

        // Cycle Detection
        if (sortedOrder.length !== components.length) {
            ctx.logs.push('[WARN] Circular dependency detected. Approximating via relaxation.');
            components.forEach(c => {
                if (!sortedOrder.includes(c.id)) sortedOrder.push(c.id);
            });
        }

        // 3. Execute Components in Order
        sortedOrder.forEach(id => {
            const comp = componentMap.get(id);
            if (!comp) return;

            try {
                this.evaluateComponent(comp, blueprint, ctx);
            } catch (e: any) {
                ctx.logs.push(`[ERROR] ${comp.name}: ${e.message}`);
                ctx.vars[`${id}.status`] = 0;
            }
        });

        const solveTimeMs = performance.now() - startTime;
        ctx.logs.push(`[INFO] Solved ${components.length} components in ${solveTimeMs.toFixed(2)}ms`);

        return { ...ctx, success: true, solveTimeMs };
    }

    /**
     * Evaluate a single component based on its type.
     * Implements transfer functions for: source, transform, store, sink
     */
    /**
     * Evaluate a single component based on its type.
     * Implements transfer functions for: source, transform, store, sink
     */
    private static evaluateComponent(comp: DeepSAFComponent, bp: DeepSAFBlueprint, ctx: SimulationContext) {
        const inputs = this.collectInputs(comp.id, bp, ctx);
        const params = this.getParams(comp, bp.components);

        let output = 0; // The primary flow/power/signal

        // Base state is mixing incoming streams, or ambient if no input
        let temp = inputs.wAvgTemp !== undefined ? inputs.wAvgTemp : (params.temp || AMBIENT_TEMP);
        let pressure = inputs.maxPressure !== undefined ? inputs.maxPressure : (params.pressure || 101325); // Pa

        let efficiency = params.efficiency || 1.0;
        const totalInput = inputs.totalFlow;

        // Transfer Functions by Component Type
        // Note: component.type is 'core' | 'subcore' | 'micro', but name-based heuristics also apply
        const compType = comp.type as string;
        const nameLower = comp.name.toLowerCase();

        // Determine behavior by type OR name pattern
        const isSource = compType === 'core' || nameLower.includes('source') || nameLower.includes('battery') || nameLower.includes('solar');
        const isSink = compType === 'micro' || nameLower.includes('sink') || nameLower.includes('load') || nameLower.includes('drain');
        const isStore = nameLower.includes('tank') || nameLower.includes('store') || nameLower.includes('accumulator');

        if (isSource) {
            // Sources generate constant output and set their own state
            output = params.capacity || params.flow || params.power || params.value || 100;
            // Sources dictate their own temp/pressure if specified
            if (params.temp) temp = params.temp;
            if (params.pressure) pressure = params.pressure;
        } else if (isSink) {
            // Sinks consume input
            output = 0;
            ctx.vars[`${comp.id}.consumed`] = totalInput;
        } else if (isStore) {
            // Storage acts as buffer (passthrough in steady-state)
            output = Math.min(totalInput, params.capacity || 1000);
        } else {
            // Transforms apply efficiency (subcore default)
            output = totalInput * efficiency;
            // Waste heat calculation: Energy lost adds to temperature
            // Q_waste = P_in * (1 - eff)
            // dT = Q / (m * Cp). Assuming Cp ~ 4186 (Water) or 1000 (Air). Simplified factor here.
            if (totalInput > 0) {
                const wasteHeat = totalInput * (1 - efficiency);
                const massFlow = Math.max(totalInput, 0.1); // Avoid div/0
                temp += (wasteHeat / massFlow) * 0.1; // 0.1 is arbitrary thermal susceptibility factor
            }
        }

        // Handle component name patterns for smart behavior

        // Fan/Pump: Flow = Speed × Base, Adds Pressure
        if (nameLower.includes('fan') || nameLower.includes('pump')) {
            const speed = params.speed || params.rpm || 100;
            output = (speed / 100) * (params.baseFlow || totalInput || 50);
            pressure += (params.head || 1000); // Add pressure head
        }

        // Motor: Torque = Power / Speed
        if (nameLower.includes('motor')) {
            const power = params.power || totalInput;
            const rpm = params.rpm || 1000;
            output = power;
            ctx.vars[`${comp.id}.torque`] = (power * 9549) / rpm; // N·m
        }

        // Heat Exchanger: Q = U × A × ΔT
        if (nameLower.includes('heat') || nameLower.includes('exchanger')) {
            const area = params.area || 1;
            const targetTemp = params.targetTemp || AMBIENT_TEMP; // If set, acts as thermostat
            const deltaT = params.deltaT || (temp - targetTemp);
            const U = params.U || 50; // W/(m²·K)

            // Heat Transfer
            const Q = U * area * deltaT;
            // Update Temp: T_out = T_in - Q/(m*Cp)
            // Simplified: temp changes towards target
            if (totalInput > 0) {
                temp -= Q / (totalInput * 4.18); // Assuming water-ish Cp
            }
            output = Math.abs(Q);
        }

        // Store Results
        ctx.vars[`${comp.id}.output`] = validateNumericResult(output, 0);
        ctx.vars[`${comp.id}.temp`] = validateNumericResult(temp, AMBIENT_TEMP);
        ctx.vars[`${comp.id}.pressure`] = validateNumericResult(pressure, 101325);
        ctx.vars[`${comp.id}.efficiency`] = efficiency;
        ctx.vars[`${comp.id}.input`] = totalInput;

        // Map to named outputs
        comp.outputs?.forEach(o => {
            ctx.vars[`${comp.id}.${o.name}`] = output;
        });
    }

    private static collectInputs(targetId: string, bp: DeepSAFBlueprint, ctx: SimulationContext): { totalFlow: number, wAvgTemp?: number, maxPressure?: number } {
        const inputs = bp.flows.filter(f => f.to === targetId);

        if (inputs.length === 0) {
            return { totalFlow: 0 };
        }

        let totalFlow = 0;
        let weightedTempSum = 0;
        let totalTempMass = 0;
        let maxPressure = 0;

        inputs.forEach(f => {
            const flow = ctx.vars[`${f.from}.output`] || 0;
            const temp = ctx.vars[`${f.from}.temp`];
            const pressure = ctx.vars[`${f.from}.pressure`];

            totalFlow += flow;

            if (temp !== undefined) {
                weightedTempSum += temp * flow;
                totalTempMass += flow;
            }

            if (pressure !== undefined) {
                maxPressure = Math.max(maxPressure, pressure);
            }
        });

        const wAvgTemp = totalTempMass > 0 ? weightedTempSum / totalTempMass : undefined;

        return {
            totalFlow,
            wAvgTemp,
            maxPressure: maxPressure > 0 ? maxPressure : undefined
        };
    }

    private static getParams(comp: DeepSAFComponent, allComponents: DeepSAFComponent[]): Record<string, number> {
        const p: Record<string, number> = {};
        comp.parameters?.forEach(param => {
            if (typeof param.value === 'number') {
                p[param.name] = param.value;
            } else if (typeof param.value === 'string') {
                // Try parsing as float first
                const f = parseFloat(param.value);
                if (!isNaN(f) && param.value.trim() === f.toString()) {
                    p[param.name] = f;
                } else {
                    // It's a formula! Evaluate it.
                    p[param.name] = evaluateFormula(param.value, comp, allComponents);
                }
            }
        });
        return p;
    }

    /**
     * Detect circular dependencies in the blueprint
     */
    static detectCircularDependencies(blueprint: DeepSAFBlueprint): string[][] {
        const cycles: string[][] = [];
        const visited = new Set<string>();
        const recursionStack = new Set<string>();

        function dfs(nodeId: string, path: string[]): void {
            visited.add(nodeId);
            recursionStack.add(nodeId);
            path.push(nodeId);

            const outgoing = blueprint.flows.filter(f => f.from === nodeId);

            for (const edge of outgoing) {
                if (!visited.has(edge.to)) {
                    dfs(edge.to, [...path]);
                } else if (recursionStack.has(edge.to)) {
                    const cycleStart = path.indexOf(edge.to);
                    cycles.push([...path.slice(cycleStart), edge.to]);
                }
            }

            recursionStack.delete(nodeId);
        }

        for (const comp of blueprint.components) {
            if (!visited.has(comp.id)) {
                dfs(comp.id, []);
            }
        }

        return cycles;
    }

    /**
     * Rankine Cycle specific calculations (for mechanical domain)
     */
    static calculateRankineOutputs(blueprint: DeepSAFBlueprint): DeepSAFBlueprint {
        const boiler = blueprint.components.find(c => c.id === 'boiler' || c.name.toLowerCase().includes('boiler'));
        const turbine = blueprint.components.find(c => c.id === 'turbine' || c.name.toLowerCase().includes('turbine'));
        const condenser = blueprint.components.find(c => c.id === 'condenser' || c.name.toLowerCase().includes('condenser'));
        const pump = blueprint.components.find(c => c.id === 'pump' || c.name.toLowerCase().includes('pump'));

        if (!boiler || !turbine) {
            return blueprint; // Not a Rankine cycle
        }

        const heatInput = (boiler.parameters?.find(p => p.name === 'Heat Input')?.value as number) || 1000;
        const turbineEff = ((turbine.parameters?.find(p => p.name === 'Isentropic Efficiency')?.value as number) || 85) / 100;
        const pumpEff = pump ? ((pump.parameters?.find(p => p.name === 'Pump Efficiency')?.value as number) || 75) / 100 : 0.75;

        const enthalpyDrop = 800;
        const massFlow = heatInput / (enthalpyDrop + 200);
        const turbinePower = massFlow * enthalpyDrop * turbineEff;
        const pumpWork = massFlow * 10 / pumpEff;
        const netWork = turbinePower - pumpWork;
        const cycleEfficiency = (netWork / heatInput) * 100;

        // Update component outputs
        const updatedComponents = blueprint.components.map(comp => {
            if (comp === boiler) {
                return {
                    ...comp,
                    outputs: comp.outputs?.map(o =>
                        o.name === 'Steam Mass Flow' ? { ...o, value: Number(massFlow.toFixed(2)) } : o
                    )
                };
            }
            if (comp === turbine) {
                return {
                    ...comp,
                    outputs: comp.outputs?.map(o =>
                        o.name === 'Power Output' ? { ...o, value: Number(turbinePower.toFixed(1)) } : o
                    )
                };
            }
            return comp;
        });

        return { ...blueprint, components: updatedComponents };
    }
}

// Default export for backwards compatibility
export default GenesisKernel;

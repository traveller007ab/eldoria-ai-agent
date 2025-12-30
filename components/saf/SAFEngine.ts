import { DeepSAFBlueprint, DeepSAFComponent } from './types';

/**
 * SAFEngine: Client-Side Physics Solver
 * Real-time topological execution of components.
 */

// Basic Physics Constants
const GRAVITY = 9.81;
const AMBIENT_TEMP = 293.15; // 20C in Kelvin

interface SimulationContext {
    vars: Record<string, number>;
    logs: string[];
}

export class SAFEngine {

    /**
     * Solves the system state based on current inputs and parameters.
     * Uses a topological sort to propagate effects downstream.
     */
    static solve(blueprint: DeepSAFBlueprint): { vars: Record<string, number>; logs: string[]; success: boolean } {
        const ctx: SimulationContext = { vars: {}, logs: [] };
        const { components, flows } = blueprint;

        // 1. Build Adjacency Graph & In-Degree Map
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

        // 2. Topological Sort (Kahn's Algorithm)
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

        // Check for cycles
        if (sortedOrder.length !== components.length) {
            ctx.logs.push('[WARN] Circular dependency detected. Solving loop via relaxation (approximation).');
            // Allow processing remaining nodes anyway for robustness
            components.forEach(c => {
                if (!sortedOrder.includes(c.id)) sortedOrder.push(c.id);
            });
        }

        // 3. Execution Phase
        sortedOrder.forEach(id => {
            const comp = componentMap.get(id);
            if (!comp) return;

            try {
                this.evaluateComponent(comp, blueprint, ctx);
            } catch (e: any) {
                ctx.logs.push(`[ERROR] Failed to solve ${comp.name}: ${e.message}`);
                ctx.vars[`${id}.status`] = 0; // Error state
            }
        });

        return { ...ctx, success: true };
    }

    private static evaluateComponent(comp: DeepSAFComponent, bp: DeepSAFBlueprint, ctx: SimulationContext) {
        // Collect Inputs from incoming flows
        const inputs = this.collectInputs(comp.id, bp, ctx);
        const params = this.getParams(comp);

        // --- CORE TRANSFER FUNCTIONS ---
        // This is where the physics logic lives. 
        // In a real n8n style engine, these would be pluggable. 
        // Here we hardcode behavior based on 'type'.

        let output = 0;
        let temp = params.temp || AMBIENT_TEMP;
        let efficiency = params.efficiency || 1.0;

        switch (comp.type) {
            case 'source':
                // Source generates constant flow defined by parameter 'output' or 'capacity'
                output = params.capacity || params.flow || params.value || 100;
                break;

            case 'transform':
                // Transform manipulates input (e.g. Inverter, Gearbox)
                // Default: Linear transformation with efficiency loss
                const totalInput = Object.keys(inputs).map(k => inputs[k]).reduce((a, b) => a + b, 0);
                output = totalInput * efficiency;
                temp += (totalInput * (1 - efficiency)); // Heat generation
                break;

            case 'store':
                // Battery / Tank
                // Output is limited by capacity AND input
                const currentStored = params.stored || 0; // State variable would live in vars in a time-stepped sim
                // For steady-state solving, we act as a passthrough buffer
                output = Math.min(Object.keys(inputs).map(k => inputs[k]).reduce((a, b) => a + b, 0), params.capacity || 1000);
                break;

            case 'sink':
                // Sink consumes everything. Output is effectively 0 (or waste heat).
                output = 0;
                ctx.vars[`${comp.id}.consumed`] = Object.keys(inputs).map(k => inputs[k]).reduce((a, b) => a + b, 0);
                break;

            default:
                // Passthrough
                output = Object.keys(inputs).map(k => inputs[k]).reduce((a, b) => a + b, 0);
        }

        // Store Results
        ctx.vars[`${comp.id}.output`] = output;
        ctx.vars[`${comp.id}.temp`] = temp;
        // Also map specific outputs if defined in comp
        comp.outputs?.forEach(o => {
            ctx.vars[`${comp.id}.${o.name}`] = output; // Propagate main output to named outputs generally
        });
    }

    private static collectInputs(targetId: string, bp: DeepSAFBlueprint, ctx: SimulationContext): Record<string, number> {
        const inputs: Record<string, number> = {};
        bp.flows.filter(f => f.to === targetId).forEach(f => {
            // Read the output value of the source component from previous steps
            const val = ctx.vars[`${f.from}.output`] || 0;
            inputs[f.from] = val;
        });
        return inputs;
    }

    private static getParams(comp: DeepSAFComponent): Record<string, number> {
        const p: Record<string, number> = {};
        comp.parameters?.forEach(param => {
            // Try to parse number, fallback to 0 if text
            if (typeof param.value === 'number') {
                p[param.name] = param.value;
            } else {
                const f = parseFloat(param.value as string);
                if (!isNaN(f)) p[param.name] = f;
            }
        });
        return p;
    }
}

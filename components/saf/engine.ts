/**
 * SAF Calculation Engine - Real-time cascading effect propagation
 * When a parameter changes, recalculates all dependent outputs
 */

import { DeepSAFBlueprint, DeepSAFComponent, SAFHistoryEntry } from './types';

/**
 * Evaluate a simple formula with component context
 * Supports basic arithmetic and component references
 */
export function evaluateFormula(
    formula: string,
    component: DeepSAFComponent,
    allComponents: DeepSAFComponent[]
): number {
    // For now, implement basic formula evaluation
    // Future: Use mathjs for full expression support

    try {
        // Replace parameter references with values
        let expression = formula.toLowerCase();

        // Handle component references like "boiler.heat_input"
        const componentRefRegex = /(\w+)\.(\w+)/g;
        expression = expression.replace(componentRefRegex, (match, compName, paramName) => {
            const refComp = allComponents.find(c =>
                c.id.toLowerCase() === compName || c.name.toLowerCase() === compName
            );
            if (!refComp) return '0';

            // Check parameters
            const param = refComp.parameters?.find(p =>
                p.name.toLowerCase().replace(/\s+/g, '_') === paramName
            );
            if (param) return String(param.value);

            // Check outputs
            const output = refComp.outputs?.find(o =>
                o.name.toLowerCase().replace(/\s+/g, '_') === paramName
            );
            if (output) return String(output.value);

            return '0';
        });

        // Replace local parameter references
        component.parameters?.forEach(param => {
            const key = param.name.toLowerCase().replace(/\s+/g, '_');
            expression = expression.replace(new RegExp(key, 'g'), String(param.value));
        });

        // Basic math evaluation (safe subset)
        // Only allow numbers, operators, parentheses
        if (/^[\d\s+\-*/.()]+$/.test(expression)) {
            return eval(expression);
        }

        // If formula contains unknown tokens, return current value or calculate simple estimate
        return 0;
    } catch (e) {
        console.warn('Formula evaluation error:', formula, e);
        return 0;
    }
}

/**
 * Propagate effects through the component graph
 * When a parameter changes, recalculate all affected outputs
 */
export function propagateEffects(
    blueprint: DeepSAFBlueprint,
    changedComponentId: string,
    changedParam: string,
    oldValue: any,
    newValue: any
): { updatedBlueprint: DeepSAFBlueprint; effects: SAFHistoryEntry } {
    const effects: SAFHistoryEntry = {
        timestamp: new Date().toISOString(),
        changes: [{
            componentId: changedComponentId,
            parameter: changedParam,
            oldValue,
            newValue,
        }],
        effects: [],
    };

    // Build dependency graph
    const dependencyMap = new Map<string, string[]>();
    blueprint.flows.forEach(flow => {
        const deps = dependencyMap.get(flow.to) || [];
        deps.push(flow.from);
        dependencyMap.set(flow.to, deps);
    });

    // BFS to find all affected components
    const affected = new Set<string>();
    const queue = [changedComponentId];

    // Find downstream components
    while (queue.length > 0) {
        const currentId = queue.shift()!;

        // Find components that depend on current
        blueprint.flows.forEach(flow => {
            if (flow.from === currentId && !affected.has(flow.to)) {
                affected.add(flow.to);
                queue.push(flow.to);
            }
        });
    }

    // Recalculate outputs for affected components
    const updatedComponents = blueprint.components.map(comp => {
        // Recalculate outputs for the changed component and affected components
        if (comp.id === changedComponentId || affected.has(comp.id)) {
            const updatedOutputs = comp.outputs?.map(output => {
                if (output.formula) {
                    const oldOutputValue = output.value;
                    const newOutputValue = evaluateFormula(
                        output.formula,
                        comp,
                        blueprint.components
                    );

                    if (oldOutputValue !== newOutputValue) {
                        effects.effects.push({
                            componentId: comp.id,
                            output: output.name,
                            oldValue: oldOutputValue,
                            newValue: newOutputValue,
                        });
                    }

                    return { ...output, value: newOutputValue || output.value };
                }
                return output;
            });

            return { ...comp, outputs: updatedOutputs };
        }
        return comp;
    });

    const updatedBlueprint: DeepSAFBlueprint = {
        ...blueprint,
        components: updatedComponents,
        history: [...(blueprint.history || []), effects],
        updated_at: new Date().toISOString(),
    };

    return { updatedBlueprint, effects };
}

/**
 * Simple Rankine Cycle specific calculations
 * More accurate thermodynamic calculations
 */
export function calculateRankineOutputs(blueprint: DeepSAFBlueprint): DeepSAFBlueprint {
    const boiler = blueprint.components.find(c => c.id === 'boiler');
    const turbine = blueprint.components.find(c => c.id === 'turbine');
    const condenser = blueprint.components.find(c => c.id === 'condenser');
    const pump = blueprint.components.find(c => c.id === 'pump');

    if (!boiler || !turbine || !condenser || !pump) {
        return blueprint;
    }

    // Get parameters
    const heatInput = (boiler.parameters?.find(p => p.name === 'Heat Input')?.value as number) || 1000;
    const turbineEff = ((turbine.parameters?.find(p => p.name === 'Isentropic Efficiency')?.value as number) || 85) / 100;
    const pumpEff = ((pump.parameters?.find(p => p.name === 'Pump Efficiency')?.value as number) || 75) / 100;

    // Simplified calculations (real would use steam tables)
    const enthalpyDrop = 800; // Approximate kJ/kg for typical conditions
    const massFlow = heatInput / (enthalpyDrop + 200); // Approximate
    const turbinePower = massFlow * enthalpyDrop * turbineEff;
    const pumpWork = massFlow * 10 / pumpEff; // Approximate
    const netWork = turbinePower - pumpWork;
    const heatRejection = heatInput - netWork;
    const cycleEfficiency = (netWork / heatInput) * 100;

    // Update outputs
    const updatedComponents = blueprint.components.map(comp => {
        if (comp.id === 'boiler') {
            return {
                ...comp,
                outputs: comp.outputs?.map(o =>
                    o.name === 'Steam Mass Flow' ? { ...o, value: Number(massFlow.toFixed(2)) } : o
                )
            };
        }
        if (comp.id === 'turbine') {
            return {
                ...comp,
                outputs: comp.outputs?.map(o =>
                    o.name === 'Power Output' ? { ...o, value: Number(turbinePower.toFixed(1)) } : o
                )
            };
        }
        if (comp.id === 'pump') {
            return {
                ...comp,
                outputs: comp.outputs?.map(o =>
                    o.name === 'Work Input' ? { ...o, value: Number(pumpWork.toFixed(1)) } : o
                )
            };
        }
        if (comp.id === 'condenser') {
            return {
                ...comp,
                outputs: comp.outputs?.map(o =>
                    o.name === 'Outlet Quality' ? { ...o, value: 0 } : o
                )
            };
        }
        return comp;
    });

    return {
        ...blueprint,
        components: updatedComponents,
    };
}

/**
 * Detect circular dependencies in the component graph
 */
export function detectCircularDependencies(blueprint: DeepSAFBlueprint): string[][] {
    const cycles: string[][] = [];
    const visited = new Set<string>();
    const recursionStack = new Set<string>();

    function dfs(nodeId: string, path: string[]): void {
        visited.add(nodeId);
        recursionStack.add(nodeId);
        path.push(nodeId);

        // Find outgoing edges
        const outgoing = blueprint.flows.filter(f => f.from === nodeId);

        for (const edge of outgoing) {
            if (!visited.has(edge.to)) {
                dfs(edge.to, [...path]);
            } else if (recursionStack.has(edge.to)) {
                // Found a cycle
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

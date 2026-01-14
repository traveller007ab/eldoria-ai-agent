/**
 * Derivation Tracer
 * 
 * Tracks the lineage of every calculated value, enabling "click to explain"
 * functionality. When you hover over any result, you can see exactly how
 * it was calculated.
 */

import type {
    DerivationChain,
    DerivationStep,
    SemanticEquation
} from '../../src/components/saf/mechanical/SemanticComponent';
import type { GoverningEquation, SimulationResult } from '../../src/components/saf/mechanical/types';

// ═══════════════════════════════════════════════════════════════
// DERIVATION CONTEXT
// ═══════════════════════════════════════════════════════════════

interface CalculationNode {
    id: string;
    symbol: string;
    name: string;
    value: number;
    unit: string;
    equation?: GoverningEquation;
    inputs: string[];  // IDs of upstream nodes
    componentId?: string;
    timestamp: number;
}

interface DerivationContext {
    nodes: Map<string, CalculationNode>;
    rootNodes: Set<string>;  // User inputs and constants
}

// ═══════════════════════════════════════════════════════════════
// DERIVATION TRACER
// ═══════════════════════════════════════════════════════════════

export class DerivationTracer {
    private context: DerivationContext;

    constructor() {
        this.context = {
            nodes: new Map(),
            rootNodes: new Set()
        };
    }

    /**
     * Record a user-specified input value (no calculation).
     */
    recordInput(
        id: string,
        symbol: string,
        name: string,
        value: number,
        unit: string,
        componentId?: string
    ): void {
        this.context.nodes.set(id, {
            id,
            symbol,
            name,
            value,
            unit,
            inputs: [],
            componentId,
            timestamp: Date.now()
        });
        this.context.rootNodes.add(id);
    }

    /**
     * Record a calculated value with its equation and inputs.
     */
    recordCalculation(
        id: string,
        symbol: string,
        name: string,
        value: number,
        unit: string,
        equation: GoverningEquation,
        inputIds: string[],
        componentId?: string
    ): void {
        // Validate inputs exist
        const validInputs = inputIds.filter(inputId => this.context.nodes.has(inputId));

        this.context.nodes.set(id, {
            id,
            symbol,
            name,
            value,
            unit,
            equation,
            inputs: validInputs,
            componentId,
            timestamp: Date.now()
        });
    }

    /**
     * Build the complete derivation chain for a value.
     */
    getDerivation(targetId: string): DerivationChain | null {
        const targetNode = this.context.nodes.get(targetId);
        if (!targetNode) return null;

        // Collect all steps via BFS backwards from target
        const steps: DerivationStep[] = [];
        const visited = new Set<string>();
        const queue: string[] = [targetId];
        const assumptions = new Set<string>();

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            const node = this.context.nodes.get(currentId);
            if (!node) continue;

            // If this node has a calculation, create a step
            if (node.equation && node.inputs.length > 0) {
                const inputs = node.inputs.map(inputId => {
                    const inputNode = this.context.nodes.get(inputId);
                    return {
                        symbol: inputNode?.symbol || inputId,
                        value: inputNode?.value || 0,
                        unit: inputNode?.unit || '',
                        source: this.context.rootNodes.has(inputId) ? 'parameter' as const : 'calculated' as const,
                        derivedFrom: this.context.rootNodes.has(inputId) ? undefined : inputId
                    };
                });

                steps.unshift({  // Add to front to maintain order
                    equation: node.equation,
                    inputs,
                    output: {
                        symbol: node.symbol,
                        value: node.value,
                        unit: node.unit
                    },
                    explanation: this.generateStepExplanation(node, inputs)
                });

                // Collect assumptions from equation
                if (node.equation.assumptions) {
                    node.equation.assumptions.forEach(a => assumptions.add(a));
                }

                // Queue upstream nodes
                node.inputs.forEach(inputId => queue.push(inputId));
            }
        }

        // Calculate sensitivities (approximate via finite difference)
        const sensitiveTo = this.calculateSensitivities(targetId);

        return {
            result: {
                name: targetNode.name,
                symbol: targetNode.symbol,
                value: targetNode.value,
                unit: targetNode.unit
            },
            steps,
            summary: this.generateSummary(targetNode, steps),
            assumptions: Array.from(assumptions),
            sensitiveTo
        };
    }

    /**
     * Get all values that depend on a given input.
     */
    getDependents(inputId: string): string[] {
        const dependents: string[] = [];

        for (const [id, node] of this.context.nodes) {
            if (node.inputs.includes(inputId)) {
                dependents.push(id);
            }
        }

        return dependents;
    }

    /**
     * Clear all recorded calculations.
     */
    clear(): void {
        this.context.nodes.clear();
        this.context.rootNodes.clear();
    }

    /**
     * Get the count of tracked values.
     */
    getStats(): { totalNodes: number; rootNodes: number; calculatedNodes: number } {
        return {
            totalNodes: this.context.nodes.size,
            rootNodes: this.context.rootNodes.size,
            calculatedNodes: this.context.nodes.size - this.context.rootNodes.size
        };
    }

    // ═══════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═══════════════════════════════════════════════════════════════

    private generateStepExplanation(
        node: CalculationNode,
        inputs: DerivationStep['inputs']
    ): string {
        const eq = node.equation;
        if (!eq) return '';

        // Build natural language explanation
        const inputList = inputs.map(i => `${i.symbol} = ${i.value.toPrecision(4)} ${i.unit}`).join(', ');

        return `Using ${eq.name}: with ${inputList}, we get ${node.symbol} = ${node.value.toPrecision(4)} ${node.unit}`;
    }

    private generateSummary(node: CalculationNode, steps: DerivationStep[]): string {
        if (steps.length === 0) {
            return `${node.name} is a user-specified input value.`;
        }

        if (steps.length === 1) {
            return `${node.name} was calculated directly using ${steps[0].equation.name}.`;
        }

        const equationNames = steps.map(s => s.equation.name);
        return `${node.name} was calculated through ${steps.length} steps: ${equationNames.join(' → ')}.`;
    }

    private calculateSensitivities(targetId: string): DerivationChain['sensitiveTo'] {
        const targetNode = this.context.nodes.get(targetId);
        if (!targetNode) return [];

        const sensitivities: { parameter: string; elasticity: number }[] = [];

        // Find all root nodes that affect this target
        const rootsAffecting = this.findAffectingRoots(targetId);

        // For each root, estimate elasticity
        for (const rootId of rootsAffecting) {
            const rootNode = this.context.nodes.get(rootId);
            if (!rootNode) continue;

            // Use chain rule approximation
            // In a real implementation, this would use automatic differentiation
            const elasticity = this.estimateElasticity(rootId, targetId);

            if (Math.abs(elasticity) > 0.01) {
                sensitivities.push({
                    parameter: rootNode.name,
                    elasticity
                });
            }
        }

        // Sort by absolute elasticity
        return sensitivities.sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
    }

    private findAffectingRoots(targetId: string): string[] {
        const roots: string[] = [];
        const visited = new Set<string>();
        const queue = [targetId];

        while (queue.length > 0) {
            const currentId = queue.shift()!;
            if (visited.has(currentId)) continue;
            visited.add(currentId);

            if (this.context.rootNodes.has(currentId)) {
                roots.push(currentId);
                continue;
            }

            const node = this.context.nodes.get(currentId);
            if (node) {
                node.inputs.forEach(inputId => queue.push(inputId));
            }
        }

        return roots;
    }

    private estimateElasticity(rootId: string, targetId: string): number {
        // Simplified elasticity estimation
        // In production, use proper automatic differentiation
        const root = this.context.nodes.get(rootId);
        const target = this.context.nodes.get(targetId);

        if (!root || !target || root.value === 0 || target.value === 0) {
            return 0;
        }

        // Count hops between root and target as a proxy for dependency strength
        const hops = this.countHops(rootId, targetId);
        if (hops === 0) return 0;

        // Simple decay model: elasticity decreases with hops
        return 1 / hops;
    }

    private countHops(fromId: string, toId: string): number {
        const visited = new Map<string, number>();
        const queue: { id: string; depth: number }[] = [{ id: toId, depth: 0 }];

        while (queue.length > 0) {
            const { id, depth } = queue.shift()!;

            if (id === fromId) return depth;
            if (visited.has(id)) continue;
            visited.set(id, depth);

            const node = this.context.nodes.get(id);
            if (node) {
                node.inputs.forEach(inputId => {
                    queue.push({ id: inputId, depth: depth + 1 });
                });
            }
        }

        return 0;
    }
}

// ═══════════════════════════════════════════════════════════════
// SINGLETON INSTANCE
// ═══════════════════════════════════════════════════════════════

export const globalTracer = new DerivationTracer();

export default DerivationTracer;

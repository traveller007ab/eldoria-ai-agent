/**
 * Component Narrative Service
 * 
 * Generates natural language explanations for components, equations,
 * and simulation results. The "voice" of the Living Mathematics Engine.
 */

import type {
    SemanticComponent,
    SemanticEquation,
    DerivationChain,
    DerivationStep,
    ComponentNarrative,
    FluidStream
} from '../../src/components/saf/mechanical/SemanticComponent';
import type {
    MechanicalComponent,
    GoverningEquation,
    SimulationResult
} from '../../src/components/saf/mechanical/types';

// ═══════════════════════════════════════════════════════════════
// NARRATIVE GENERATION
// ═══════════════════════════════════════════════════════════════

export class ComponentNarrativeService {

    /**
     * Generate a plain English explanation of what a component does.
     */
    static describeComponent(component: MechanicalComponent): string {
        const domain = this.domainToReadable(component.category);
        const name = component.name || component.id;

        let description = `**${name}** is a ${domain} component`;

        // Add port information
        const inputs = component.ports.filter(p => p.type === 'input').length;
        const outputs = component.ports.filter(p => p.type === 'output').length;

        if (inputs > 0 || outputs > 0) {
            description += ` with ${inputs} input${inputs !== 1 ? 's' : ''} and ${outputs} output${outputs !== 1 ? 's' : ''}`;
        }

        // Add key parameters
        const keyParams = component.parameters.slice(0, 3);
        if (keyParams.length > 0) {
            const paramList = keyParams.map(p => `${p.name}: ${p.value} ${p.unit}`).join(', ');
            description += `. Key parameters: ${paramList}`;
        }

        return description + '.';
    }

    /**
     * Explain an equation in plain English.
     */
    static explainEquation(eq: GoverningEquation): string {
        const parts: string[] = [];

        parts.push(`**${eq.name}**`);

        if (eq.description) {
            parts.push(eq.description);
        }

        parts.push(`Formula: \`${eq.expression}\``);

        if (eq.assumptions && eq.assumptions.length > 0) {
            parts.push(`Assumptions: ${eq.assumptions.join('; ')}`);
        }

        if (eq.source) {
            parts.push(`Reference: ${eq.source}`);
        }

        return parts.join('\n\n');
    }

    /**
     * Generate a derivation explanation for a calculated value.
     */
    static explainDerivation(chain: DerivationChain): string {
        const lines: string[] = [];

        lines.push(`## How ${chain.result.name} (${chain.result.symbol}) = ${chain.result.value.toFixed(4)} ${chain.result.unit} was calculated\n`);

        if (chain.summary) {
            lines.push(chain.summary + '\n');
        }

        lines.push('### Calculation Steps\n');

        chain.steps.forEach((step, index) => {
            lines.push(`**Step ${index + 1}: ${step.equation.name}**`);
            lines.push(`\`${step.equation.expression}\``);

            // Show inputs
            const inputStr = step.inputs.map(i => `${i.symbol} = ${i.value} ${i.unit}`).join(', ');
            lines.push(`Inputs: ${inputStr}`);

            // Show output
            lines.push(`Result: ${step.output.symbol} = ${step.output.value.toFixed(4)} ${step.output.unit}`);

            if (step.explanation) {
                lines.push(`*${step.explanation}*`);
            }

            lines.push('');
        });

        // Sensitivity information
        if (chain.sensitiveTo && chain.sensitiveTo.length > 0) {
            lines.push('### Sensitivity Analysis\n');
            lines.push('This result is most sensitive to:');
            chain.sensitiveTo.slice(0, 3).forEach(s => {
                const direction = s.elasticity > 0 ? 'increases' : 'decreases';
                lines.push(`- **${s.parameter}**: ${Math.abs(s.elasticity).toFixed(2)}% change in result per 1% change in parameter (${direction} result)`);
            });
        }

        // Assumptions
        if (chain.assumptions && chain.assumptions.length > 0) {
            lines.push('\n### Assumptions');
            chain.assumptions.forEach(a => lines.push(`- ${a}`));
        }

        return lines.join('\n');
    }

    /**
     * Generate a diagnostic explanation for a simulation failure.
     */
    static explainSimulationFailure(result: SimulationResult, components: MechanicalComponent[]): string {
        const lines: string[] = [];

        lines.push(`## Simulation ${result.status === 'diverged' ? 'Diverged' : 'Failed'}\n`);

        if (result.errors && result.errors.length > 0) {
            lines.push('### Errors Detected\n');
            result.errors.forEach(e => lines.push(`❌ ${e}`));
            lines.push('');
        }

        if (result.warnings && result.warnings.length > 0) {
            lines.push('### Warnings\n');
            result.warnings.forEach(w => lines.push(`⚠️ ${w}`));
            lines.push('');
        }

        // Analyze likely causes
        lines.push('### Likely Causes\n');

        if (result.residual > 1e6) {
            lines.push('- **Numerical instability**: Very large residual suggests possible open circuit or missing boundary condition');
        }

        if (result.iterations >= 100) {
            lines.push('- **Convergence failure**: Solver reached max iterations. Consider relaxing tolerance or adjusting initial conditions');
        }

        // Check for common issues
        const pumps = components.filter(c => c.subcategory === 'turbomachinery');
        const valves = components.filter(c => c.tags?.includes('valve'));

        if (pumps.length > 0 && valves.every(v => {
            const openParam = v.parameters.find(p => p.symbol === 'opening');
            return openParam && openParam.value === 0;
        })) {
            lines.push('- **Deadhead condition**: Pump operating against closed valve — no flow possible');
        }

        lines.push('\n### Recommended Actions\n');
        lines.push('1. Check that all circuits have at least one pressure source (pump, reservoir, or specified pressure)');
        lines.push('2. Verify all valves are at least partially open');
        lines.push('3. Ensure fluid properties are reasonable (non-zero density and viscosity)');

        return lines.join('\n');
    }

    /**
     * Explain a fluid stream mismatch.
     */
    static explainStreamMismatch(stream1: FluidStream, stream2: FluidStream): string {
        if (stream1.circuitId !== stream2.circuitId) {
            return `❌ **Circuit Mismatch**: Cannot connect "${stream1.circuitName}" (${stream1.fluid.name}) to "${stream2.circuitName}" (${stream2.fluid.name}). These are separate fluid circuits that should not mix.`;
        }

        if (stream1.fluid.id !== stream2.fluid.id) {
            return `❌ **Fluid Mismatch**: ${stream1.fluid.name} cannot flow into a circuit containing ${stream2.fluid.name}. This would cause contamination.`;
        }

        return '✅ Streams are compatible.';
    }

    /**
     * Generate a "what-if" explanation for a parameter change.
     */
    static explainParameterImpact(
        parameterName: string,
        oldValue: number,
        newValue: number,
        affectedResults: { name: string; oldValue: number; newValue: number; unit: string }[]
    ): string {
        const lines: string[] = [];
        const changePercent = ((newValue - oldValue) / oldValue * 100).toFixed(1);
        const direction = newValue > oldValue ? 'increased' : 'decreased';

        lines.push(`## Impact of Changing ${parameterName}\n`);
        lines.push(`Parameter ${direction} by ${Math.abs(parseFloat(changePercent))}%\n`);

        lines.push('### Affected Outputs\n');

        affectedResults.forEach(r => {
            const resultChange = ((r.newValue - r.oldValue) / r.oldValue * 100).toFixed(1);
            const resultDirection = r.newValue > r.oldValue ? '↑' : '↓';
            lines.push(`- **${r.name}**: ${r.oldValue.toFixed(2)} → ${r.newValue.toFixed(2)} ${r.unit} (${resultDirection} ${Math.abs(parseFloat(resultChange))}%)`);
        });

        return lines.join('\n');
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    private static domainToReadable(domain: string): string {
        const map: Record<string, string> = {
            'thermodynamic': 'thermodynamic',
            'fluid': 'fluid mechanics',
            'heatTransfer': 'heat transfer',
            'solidMechanics': 'structural mechanics',
            'machineElement': 'machine element',
            'material': 'material',
            'control': 'control system',
            'aerodynamic': 'aerodynamic'
        };
        return map[domain] || domain;
    }
}

export default ComponentNarrativeService;

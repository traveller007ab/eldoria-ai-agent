/**
 * SAF Render Utilities - Export blueprints to various formats
 * Mermaid diagrams, code scaffolding, thesis sections
 */

import { DeepSAFBlueprint, DeepSAFComponent, FLOW_STYLES, COMPONENT_STYLES } from './types';

// ============================================
// MERMAID DIAGRAM GENERATION
// ============================================

export function blueprintToMermaid(blueprint: DeepSAFBlueprint): string {
    const lines: string[] = [];
    lines.push('graph TD');
    lines.push('');
    lines.push('%% Components');

    // Add nodes
    for (const comp of blueprint.components) {
        const style = COMPONENT_STYLES[comp.type];
        const label = comp.name.replace(/"/g, "'");
        lines.push(`    ${comp.id}["${label}"]`);
    }

    lines.push('');
    lines.push('%% Flows');

    // Add edges
    for (const flow of blueprint.flows) {
        const style = FLOW_STYLES[flow.type];
        const arrow = flow.type === 'control' ? '-->' : flow.type === 'signal' ? '-..->' : '-->';
        const label = flow.label ? `|${flow.label}|` : '';
        lines.push(`    ${flow.from} ${arrow}${label} ${flow.to}`);
    }

    lines.push('');
    lines.push('%% Styling');

    // Add class definitions
    lines.push('    classDef core fill:#22d3ee20,stroke:#22d3ee,color:#22d3ee');
    lines.push('    classDef subcore fill:#a855f720,stroke:#a855f7,color:#a855f7');
    lines.push('    classDef micro fill:#10b98120,stroke:#10b981,color:#10b981');

    // Apply classes to nodes
    const coreNodes = blueprint.components.filter(c => c.type === 'core').map(c => c.id).join(',');
    const subcoreNodes = blueprint.components.filter(c => c.type === 'subcore').map(c => c.id).join(',');
    const microNodes = blueprint.components.filter(c => c.type === 'micro').map(c => c.id).join(',');

    if (coreNodes) lines.push(`    class ${coreNodes} core`);
    if (subcoreNodes) lines.push(`    class ${subcoreNodes} subcore`);
    if (microNodes) lines.push(`    class ${microNodes} micro`);

    return lines.join('\n');
}

// ============================================
// CODE SCAFFOLDING GENERATION
// ============================================

export function blueprintToTypeScript(blueprint: DeepSAFBlueprint): string {
    const lines: string[] = [];

    lines.push(`/**`);
    lines.push(` * ${blueprint.project_name}`);
    lines.push(` * Generated from SAF Blueprint`);
    lines.push(` * Domain: ${blueprint.domain}`);
    lines.push(` * Version: ${blueprint.version}`);
    lines.push(` */`);
    lines.push('');

    // Generate interfaces for each component
    for (const comp of blueprint.components) {
        lines.push(`// ============================================`);
        lines.push(`// ${comp.name.toUpperCase()}`);
        lines.push(`// ============================================`);
        lines.push('');

        // Interface for parameters
        if (comp.parameters && comp.parameters.length > 0) {
            lines.push(`interface ${toPascalCase(comp.id)}Params {`);
            for (const param of comp.parameters) {
                const type = typeof param.value === 'number' ? 'number' : 'string';
                lines.push(`    /** ${param.name} (${param.unit || 'unit'}) */`);
                lines.push(`    ${toCamelCase(param.name)}: ${type};`);
            }
            lines.push(`}`);
            lines.push('');
        }

        // Interface for outputs
        if (comp.outputs && comp.outputs.length > 0) {
            lines.push(`interface ${toPascalCase(comp.id)}Outputs {`);
            for (const output of comp.outputs) {
                lines.push(`    /** ${output.name} (${output.unit || 'unit'}) */`);
                lines.push(`    ${toCamelCase(output.name)}: number;`);
            }
            lines.push(`}`);
            lines.push('');
        }

        // Class implementation with validation
        lines.push(`class ${toPascalCase(comp.id)} {`);
        lines.push(`    private params: ${toPascalCase(comp.id)}Params;`);
        lines.push('');
        lines.push(`    constructor(params: ${toPascalCase(comp.id)}Params) {`);
        lines.push(`        this.params = params;`);
        lines.push(`    }`);
        lines.push('');
        lines.push(`    /** Validates numeric results - guards against NaN/Infinity */`);
        lines.push(`    private validate(value: number, fallback = 0): number {`);
        lines.push(`        return Number.isFinite(value) ? Math.round(value * 1000) / 1000 : fallback;`);
        lines.push(`    }`);
        lines.push('');
        lines.push(`    calculate(): ${toPascalCase(comp.id)}Outputs {`);
        lines.push(`        const params = this.params;`);
        lines.push(`        const outputs: Partial<${toPascalCase(comp.id)}Outputs> = {};`);

        comp.outputs?.forEach(output => {
            if (output.formula) {
                // Convert formula to TS-compatible expression
                let tsFormula = output.formula.toLowerCase()
                    .replace(/\b(\w+)\b/g, (match) => {
                        const isParam = comp.parameters?.some(p => p.name.toLowerCase().replace(/\s+/g, '_') === match);
                        return isParam ? `params.${toCamelCase(match)}` : match;
                    });
                lines.push(`        // ${output.name}: ${output.formula}`);
                lines.push(`        outputs.${toCamelCase(output.name)} = this.validate(${tsFormula});`);
            } else {
                lines.push(`        outputs.${toCamelCase(output.name)} = ${typeof output.value === 'number' ? output.value : `"${output.value}"`}; // Static`);
            }
        });

        lines.push('');
        lines.push(`        return outputs as ${toPascalCase(comp.id)}Outputs;`);
        lines.push(`    }`);
        lines.push(`}`);
        lines.push('');
    }

    // Generate system class
    lines.push(`// ============================================`);
    lines.push(`// SYSTEM INTEGRATION`);
    lines.push(`// ============================================`);
    lines.push('');
    lines.push(`class ${toPascalCase(blueprint.project_name.replace(/\s+/g, ''))}System {`);
    for (const comp of blueprint.components) {
        lines.push(`    private ${toCamelCase(comp.id)}: ${toPascalCase(comp.id)};`);
    }
    lines.push('');
    lines.push(`    constructor() {`);
    lines.push(`        // Initialize components`);
    lines.push(`    }`);
    lines.push('');
    lines.push(`    simulate(): void {`);
    lines.push(`        // Run simulation step`);
    lines.push(`    }`);
    lines.push(`}`);

    return lines.join('\n');
}

// ============================================
// THESIS SECTION GENERATION
// ============================================

export function blueprintToThesisSection(blueprint: DeepSAFBlueprint): string {
    const lines: string[] = [];

    lines.push(`## System Analysis: ${blueprint.project_name}`);
    lines.push('');
    lines.push(`### Overview`);
    lines.push('');
    lines.push(`This section presents the systematic decomposition and analysis of the ${blueprint.project_name} using the Structurally Adaptive Framework (SAF). The system operates in the ${blueprint.domain} domain and consists of ${blueprint.components.length} interconnected components.`);
    lines.push('');

    lines.push(`### System Components`);
    lines.push('');
    lines.push(`The system comprises the following functional units:`);
    lines.push('');

    for (const comp of blueprint.components) {
        lines.push(`#### ${comp.name} (${comp.type.charAt(0).toUpperCase() + comp.type.slice(1)})`);
        lines.push('');
        if (comp.description) {
            lines.push(comp.description);
            lines.push('');
        }

        if (comp.parameters && comp.parameters.length > 0) {
            lines.push(`**Parameters:**`);
            lines.push('');
            lines.push(`| Parameter | Value | Unit |`);
            lines.push(`|-----------|-------|------|`);
            for (const param of comp.parameters) {
                lines.push(`| ${param.name} | ${param.value} | ${param.unit || '-'} |`);
            }
            lines.push('');
        }

        if (comp.outputs && comp.outputs.length > 0) {
            lines.push(`**Outputs:**`);
            lines.push('');
            for (const output of comp.outputs) {
                lines.push(`- **${output.name}**: ${output.value} ${output.unit || ''}`);
                if (output.formula) {
                    lines.push(`  - *Formula*: \`${output.formula}\``);
                }
            }
            lines.push('');
        }
    }

    lines.push(`### System Flows`);
    lines.push('');
    lines.push(`The components are interconnected through the following ${blueprint.flows.length} flows:`);
    lines.push('');
    lines.push(`| From | To | Flow Type | Description |`);
    lines.push(`|------|-----|-----------|-------------|`);
    for (const flow of blueprint.flows) {
        const fromComp = blueprint.components.find(c => c.id === flow.from)?.name || flow.from;
        const toComp = blueprint.components.find(c => c.id === flow.to)?.name || flow.to;
        lines.push(`| ${fromComp} | ${toComp} | ${flow.type} | ${flow.label || flow.parameter || '-'} |`);
    }
    lines.push('');

    lines.push(`### Conclusion`);
    lines.push('');
    lines.push(`The SAF decomposition reveals a ${blueprint.components.filter(c => c.type === 'core').length}-core, ${blueprint.components.filter(c => c.type === 'subcore').length}-subcore, ${blueprint.components.filter(c => c.type === 'micro').length}-micro architecture with clear flow pathways. This modular structure enables targeted optimization and impact analysis.`);

    return lines.join('\n');
}

// ============================================
// HELPER FUNCTIONS
// ============================================

function toPascalCase(str: string): string {
    return str
        .replace(/[-_\s]+/g, ' ')
        .split(' ')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
        .join('');
}

function toCamelCase(str: string): string {
    const pascal = toPascalCase(str);
    return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

/**
 * Prompt Schema Library - Index
 * 
 * Exports all prompt schemas and provides helpers for searching and composing prompts.
 */

import safDeconstruct from './saf_deconstruct.json';
import competitiveAnalysis from './competitive_analysis.json';
import thesisChapter from './thesis_chapter.json';
import codeAudit from './code_audit.json';
import safTopology from './saf_topology.json';
import safPhysicsModel from './saf_physics_model.json';
import safInitialState from './saf_initial_state.json';
import safScenarioInjector from './saf_scenario_injector.json';
// Living Mathematics Engine schemas
import safMolecularSystem from './saf_molecular_system.json';
import safDiagnosis from './saf_diagnosis.json';
import safOptimization from './saf_optimization.json';
import safWhatif from './saf_whatif.json';

export interface PromptVariable {
    name: string;
    type: 'string' | 'number' | 'textarea' | 'select';
    required?: boolean;
    label: string;
    placeholder?: string;
    options?: string[];
    default?: string;
}

export interface PromptSchema {
    id: string;
    name: string;
    category: string;
    tags: string[];
    description: string;
    variables: PromptVariable[];
    prompt_template?: string;
    user_prompt_template?: string;
    system_prompt?: string;
    output_format: string;
    icon: string;
    temperature?: number;
    max_tokens?: number;
}

// All available schemas
export const promptSchemas: PromptSchema[] = [
    safDeconstruct as PromptSchema,
    competitiveAnalysis as PromptSchema,
    thesisChapter as PromptSchema,
    codeAudit as PromptSchema,
    safTopology as PromptSchema,
    safPhysicsModel as PromptSchema,
    safInitialState as PromptSchema,
    safScenarioInjector as PromptSchema,
    // Living Mathematics Engine schemas
    safMolecularSystem as PromptSchema,
    safDiagnosis as PromptSchema,
    safOptimization as PromptSchema,
    safWhatif as PromptSchema,
];

// Get all unique categories
export function getCategories(): string[] {
    return [...new Set(promptSchemas.map(s => s.category))];
}

// Find schema by ID
export function getSchemaById(id: string): PromptSchema | undefined {
    return promptSchemas.find(s => s.id === id);
}

// Search schemas by query (name, description, tags, category)
export function searchSchemas(query: string): PromptSchema[] {
    if (!query.trim()) return promptSchemas;

    const lower = query.toLowerCase();
    return promptSchemas.filter(s =>
        s.name.toLowerCase().includes(lower) ||
        s.description.toLowerCase().includes(lower) ||
        s.category.toLowerCase().includes(lower) ||
        s.tags.some(t => t.toLowerCase().includes(lower))
    );
}

// Get schemas by category
export function getSchemasByCategory(category: string): PromptSchema[] {
    return promptSchemas.filter(s => s.category === category);
}

// Simple Handlebars-like template compiler
// Supports {{var}}, {{#var}}content{{/var}} (if exists), {{^var}}content{{/var}} (if not exists)
export function composePrompt(schema: PromptSchema, variables: Record<string, string>): string {
    let result = schema.prompt_template;

    // Handle conditional blocks: {{#var}}content{{/var}} (show if var exists)
    result = result.replace(/\{\{#(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, varName, content) => {
        return variables[varName]?.trim() ? content.replace(new RegExp(`\\{\\{${varName}\\}\\}`, 'g'), variables[varName]) : '';
    });

    // Handle inverse blocks: {{^var}}content{{/var}} (show if var doesn't exist)
    result = result.replace(/\{\{\^(\w+)\}\}([\s\S]*?)\{\{\/\1\}\}/g, (_, varName, content) => {
        return !variables[varName]?.trim() ? content : '';
    });

    // Replace simple variables: {{var}}
    result = result.replace(/\{\{(\w+)\}\}/g, (_, varName) => {
        return variables[varName] || '';
    });

    return result.trim();
}

// Generate a brief summary of available schemas for AI context
export function getSchemaSummaryForAI(): string {
    return promptSchemas.map(s =>
        `- **${s.name}** (id: ${s.id}, category: ${s.category}): ${s.description}`
    ).join('\n');
}

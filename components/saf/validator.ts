import { DeepSAFBlueprint } from './types';

/**
 * Validates a parsed JSON object against the DeepSAFBlueprint schema.
 * Throws detailed errors if validation fails.
 */
export function validateBlueprint(data: any): DeepSAFBlueprint {
    if (!data) throw new Error('Blueprint data is null or undefined.');
    if (typeof data !== 'object') throw new Error('Blueprint must be an object.');

    // 1. Top-level fields
    if (!data.project_name || typeof data.project_name !== 'string') {
        throw new Error('Missing or invalid "project_name".');
    }

    // 2. Components
    if (!Array.isArray(data.components)) {
        throw new Error('Missing "components" array.');
    }

    const componentIds = new Set<string>();

    data.components.forEach((comp: any, index: number) => {
        if (!comp.id || typeof comp.id !== 'string') {
            throw new Error(`Component at index ${index} missing valid "id".`);
        }
        if (componentIds.has(comp.id)) {
            throw new Error(`Duplicate component ID found: "${comp.id}".`);
        }
        componentIds.add(comp.id);

        if (!comp.name || typeof comp.name !== 'string') {
            throw new Error(`Component "${comp.id}" missing valid "name".`);
        }
        if (!['core', 'subcore', 'micro'].includes(comp.type)) {
            throw new Error(`Component "${comp.id}" has invalid type "${comp.type}". Must be core/subcore/micro.`);
        }

        // Ensure arrays exist
        if (!comp.dependencies) comp.dependencies = [];
        if (!comp.parameters) comp.parameters = [];
        if (!comp.outputs) comp.outputs = [];
    });

    // 3. Flows
    if (!Array.isArray(data.flows)) {
        // Auto-fix if missing, but ideally strictly require or default to empty
        data.flows = [];
    }

    data.flows.forEach((flow: any, index: number) => {
        if (!flow.from || !flow.to) {
            throw new Error(`Flow at index ${index} missing "from" or "to" definitions.`);
        }
        if (!componentIds.has(flow.from)) {
            throw new Error(`Flow source "${flow.from}" does not exist in components.`);
        }
        if (!componentIds.has(flow.to)) {
            throw new Error(`Flow target "${flow.to}" does not exist in components.`);
        }
    });

    // 4. Defaults for optional fields
    return {
        project_name: data.project_name,
        version: data.version || '1.0',
        domain: ['mechanical', 'governance', 'ai_agents', 'creative'].includes(data.domain) ? data.domain : 'custom',
        components: data.components,
        flows: data.flows,
        created_at: data.created_at || new Date().toISOString(),
        description: data.description || '',
        constraints: Array.isArray(data.constraints) ? data.constraints : [],
    };
}

/**
 * PromptMemoryService
 * 
 * Manages the persistence of prompt variable values and recent schema usage
 * to provide a context-aware experience.
 */

const MEMORY_KEY = 'eldoria-prompt-memory';
const MAX_VALUES_PER_VAR = 10;
const MAX_RECENT_SCHEMAS = 5;

export interface PromptMemory {
    history: Record<string, Record<string, string[]>>; // schemaId -> variableName -> values[]
    recentSchemas: string[]; // List of recently used schema IDs
}

const getMemory = (): PromptMemory => {
    try {
        const stored = localStorage.getItem(MEMORY_KEY);
        if (stored) {
            return JSON.parse(stored);
        }
    } catch (e) {
        console.error('[PromptMemory] Failed to load memory:', e);
    }
    return { history: {}, recentSchemas: [] };
};

const saveMemory = (memory: PromptMemory) => {
    try {
        localStorage.setItem(MEMORY_KEY, JSON.stringify(memory));
    } catch (e) {
        console.error('[PromptMemory] Failed to save memory:', e);
    }
};

/**
 * Save values used for a specific schema
 */
export const saveValues = (schemaId: string, values: Record<string, string>) => {
    const memory = getMemory();

    // 1. Update history
    if (!memory.history[schemaId]) {
        memory.history[schemaId] = {};
    }

    Object.entries(values).forEach(([varName, value]) => {
        const trimmed = value.trim();
        if (!trimmed) return;

        if (!memory.history[schemaId][varName]) {
            memory.history[schemaId][varName] = [];
        }

        // Deduplicate and move to top
        const existing = memory.history[schemaId][varName];
        const filtered = existing.filter(v => v !== trimmed);
        const updated = [trimmed, ...filtered].slice(0, MAX_VALUES_PER_VAR);

        memory.history[schemaId][varName] = updated;
    });

    // 2. Update recent schemas
    const filteredSchemas = memory.recentSchemas.filter(id => id !== schemaId);
    memory.recentSchemas = [schemaId, ...filteredSchemas].slice(0, MAX_RECENT_SCHEMAS);

    saveMemory(memory);
};

/**
 * Get recent values for a specific variable in a schema
 */
export const getRecentValues = (schemaId: string, varName: string): string[] => {
    const memory = getMemory();
    return memory.history[schemaId]?.[varName] || [];
};

/**
 * Get the list of recently used schema IDs
 */
export const getRecentSchemas = (): string[] => {
    return getMemory().recentSchemas;
};

/**
 * Clear all prompt history
 */
export const clearMemory = () => {
    localStorage.removeItem(MEMORY_KEY);
};

/**
 * Get a summary of recent prompt usage for AI context
 */
export const getMemorySummary = (): string => {
    const memory = getMemory();
    if (memory.recentSchemas.length === 0) return "No recent prompt usage.";

    return memory.recentSchemas.map(id => {
        const vars = memory.history[id] || {};
        const varSummary = Object.entries(vars)
            .map(([name, vals]) => `${name}: ${vals[0]}`)
            .join(', ');
        return `Used ${id}${varSummary ? ` with ${varSummary}` : ''}`;
    }).join('; ');
};

export const PromptMemoryService = {
    saveValues,
    getRecentValues,
    getRecentSchemas,
    getMemorySummary,
    clearMemory
};

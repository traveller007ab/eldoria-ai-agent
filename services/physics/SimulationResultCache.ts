import type { MechBlueprint, MechSimulationResult, MechSolverConfiguration } from '../../types';

export interface SimulationCacheKey {
    blueprintId: string;
    blueprintHash: string;
    configHash: string;
    contextHash: string;
}

export interface CachedSimulationResult {
    result: MechSimulationResult;
    timestamp: number;
    hitCount: number;
    ttl: number;
}

export interface SimulationCacheConfig {
    defaultTTL: number;
    maxCacheSize: number;
    enableCompression: boolean;
}

export class SimulationResultCache {
    private cache: Map<string, CachedSimulationResult>;
    private config: SimulationCacheConfig;
    private accessOrder: string[];

    constructor(config?: Partial<SimulationCacheConfig>) {
        this.config = {
            defaultTTL: config?.defaultTTL || 5 * 60 * 1000, // 5 minutes
            maxCacheSize: config?.maxCacheSize || 100,
            enableCompression: config?.enableCompression || false
        };
        this.cache = new Map();
        this.accessOrder = [];

        // Clean expired entries periodically
        setInterval(() => this.cleanExpired(), 60 * 1000);
    }

    generateCacheKey(
        blueprint: MechBlueprint,
        config: MechSolverConfiguration,
        context: Record<string, number> = {}
    ): SimulationCacheKey {
        const blueprintStr = JSON.stringify({
            components: blueprint.components.map(c => ({
                id: c.id,
                defId: c.componentDefinitionId,
                params: c.parameterValues,
                pos: c.position
            })),
            connections: blueprint.connections.map(c => ({
                id: c.id,
                source: c.sourceComponentId,
                target: c.targetComponentId,
                fluid: c.fluidId
            })),
            fluidId: blueprint.fluidId
        });

        const configStr = JSON.stringify({
            method: config.method,
            tolerance: config.tolerance,
            maxIterations: config.maxIterations
        });

        const contextStr = JSON.stringify(context);

        return {
            blueprintId: blueprint.id,
            blueprintHash: this.hashString(blueprintStr),
            configHash: this.hashString(configStr),
            contextHash: this.hashString(contextStr)
        };
    }

    get(key: SimulationCacheKey): MechSimulationResult | null {
        const cacheKey = this.getCacheKeyString(key);
        const cached = this.cache.get(cacheKey);

        if (!cached) return null;

        const age = Date.now() - cached.timestamp;
        if (age > cached.ttl) {
            this.cache.delete(cacheKey);
            this.accessOrder = this.accessOrder.filter(k => k !== cacheKey);
            return null;
        }

        // Update access order for LRU
        this.accessOrder = this.accessOrder.filter(k => k !== cacheKey);
        this.accessOrder.push(cacheKey);
        cached.hitCount++;

        return cached.result;
    }

    set(key: SimulationCacheKey, result: MechSimulationResult, ttl?: number): void {
        const cacheKey = this.getCacheKeyString(key);

        // Evict oldest entries if cache is full
        while (this.cache.size >= this.config.maxCacheSize && this.accessOrder.length > 0) {
            const oldestKey = this.accessOrder.shift()!;
            this.cache.delete(oldestKey);
        }

        this.cache.set(cacheKey, {
            result: this.cloneResult(result),
            timestamp: Date.now(),
            hitCount: 0,
            ttl: ttl || this.config.defaultTTL
        });

        this.accessOrder.push(cacheKey);
    }

    invalidate(blueprintId: string): number {
        let removed = 0;
        const keysToDelete: string[] = [];

        this.cache.forEach((_, key) => {
            if (key.startsWith(blueprintId)) {
                keysToDelete.push(key);
            }
        });

        for (const key of keysToDelete) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
            removed++;
        }

        return removed;
    }

    invalidateAll(): void {
        this.cache.clear();
        this.accessOrder = [];
    }

    getStats(): { size: number; hits: number; misses: number; hitRate: number } {
        let totalHits = 0;
        let totalMisses = 0;

        this.cache.forEach(cached => {
            totalHits += cached.hitCount;
        });

        return {
            size: this.cache.size,
            hits: totalHits,
            misses: totalMisses,
            hitRate: totalHits + totalMisses > 0 ? totalHits / (totalHits + totalMisses) : 0
        };
    }

    private getCacheKeyString(key: SimulationCacheKey): string {
        return `${key.blueprintId}:${key.blueprintHash}:${key.configHash}:${key.contextHash}`;
    }

    private hashString(str: string): string {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(36);
    }

    private cloneResult(result: MechSimulationResult): MechSimulationResult {
        return {
            ...result,
            completedAt: new Date(result.completedAt),
            variables: { ...result.variables },
            metrics: {
                ...result.metrics,
                componentMetrics: { ...result.metrics.componentMetrics }
            },
            diagnostics: {
                ...result.diagnostics,
                massBalance: { ...result.diagnostics.massBalance },
                energyBalance: { ...result.diagnostics.energyBalance },
                convergence: { ...result.diagnostics.convergence }
            },
            constraintViolations: [...result.constraintViolations]
        };
    }

    private cleanExpired(): void {
        const now = Date.now();
        const keysToDelete: string[] = [];

        this.cache.forEach((cached, key) => {
            if (now - cached.timestamp > cached.ttl) {
                keysToDelete.push(key);
            }
        });

        for (const key of keysToDelete) {
            this.cache.delete(key);
            this.accessOrder = this.accessOrder.filter(k => k !== key);
        }
    }
}

export const simulationCache = new SimulationResultCache();

export async function getCachedSimulation(
    blueprint: MechBlueprint,
    config: MechSolverConfiguration,
    context: Record<string, number> = {}
): Promise<MechSimulationResult | null> {
    const key = simulationCache.generateCacheKey(blueprint, config, context);
    return simulationCache.get(key);
}

export function cacheSimulation(
    blueprint: MechBlueprint,
    config: MechSolverConfiguration,
    result: MechSimulationResult,
    context: Record<string, number> = {},
    ttl?: number
): void {
    const key = simulationCache.generateCacheKey(blueprint, config, context);
    simulationCache.set(key, result, ttl);
}

export function invalidateBlueprintCache(blueprintId: string): number {
    return simulationCache.invalidate(blueprintId);
}

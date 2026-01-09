import type { MechComponentDefinition, MechanicalDomain } from '../types.ts';
import { fluidComponents } from '../data/component-library/fluid-components.ts';
import { thermalComponents } from '../data/component-library/thermal-components.ts';
import { mechanicalComponents } from '../data/component-library/mechanical-components.ts';
import { controlComponents } from '../data/component-library/control-components.ts';

export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private components: Map<string, MechComponentDefinition> = new Map();

    private constructor() {
        this.loadDefinitions();
    }

    public static getInstance(): ComponentRegistry {
        if (!ComponentRegistry.instance) {
            ComponentRegistry.instance = new ComponentRegistry();
        }
        return ComponentRegistry.instance;
    }

    private loadDefinitions() {
        // Load all component domains
        [
            ...fluidComponents,
            ...thermalComponents,
            ...mechanicalComponents,
            ...controlComponents
        ].forEach(comp => {
            this.components.set(comp.id, comp);
        });
    }

    public getComponent(id: string): MechComponentDefinition | undefined {
        return this.components.get(id);
    }

    public getAllComponents(): MechComponentDefinition[] {
        return Array.from(this.components.values());
    }

    public getComponentsByDomain(domain: MechanicalDomain): MechComponentDefinition[] {
        return this.getAllComponents().filter(c => c.domain === domain);
    }

    public getComponentsBySubcategory(subcategory: string): MechComponentDefinition[] {
        return this.getAllComponents().filter(c => c.subcategory === subcategory);
    }

    public searchComponents(query: string): MechComponentDefinition[] {
        const q = query.toLowerCase();
        return this.getAllComponents().filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q)) ||
            c.subcategory.toLowerCase().includes(q)
        );
    }

    public getDomainStats(): Record<MechanicalDomain, number> {
        const stats: Record<string, number> = {};
        this.getAllComponents().forEach(c => {
            stats[c.domain] = (stats[c.domain] || 0) + 1;
        });
        return stats as Record<MechanicalDomain, number>;
    }

    public getTotalComponentCount(): number {
        return this.components.size;
    }
}

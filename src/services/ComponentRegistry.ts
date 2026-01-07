import { ComponentDefinition, MechanicalDomain, SubDomain } from '../types/mech-saf-2.0';
import { fluidComponents } from '../data/component-library/fluid-components';

export class ComponentRegistry {
    private static instance: ComponentRegistry;
    private components: Map<string, ComponentDefinition> = new Map();

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
        // Load fluid components
        fluidComponents.forEach(comp => {
            this.components.set(comp.id, comp);
        });

        // TODO: Load thermal, mechanical, etc.
    }

    public getComponent(id: string): ComponentDefinition | undefined {
        return this.components.get(id);
    }

    public getAllComponents(): ComponentDefinition[] {
        return Array.from(this.components.values());
    }

    public getComponentsByDomain(domain: MechanicalDomain): ComponentDefinition[] {
        return this.getAllComponents().filter(c => c.domain === domain);
    }

    public searchComponents(query: string): ComponentDefinition[] {
        const q = query.toLowerCase();
        return this.getAllComponents().filter(c =>
            c.name.toLowerCase().includes(q) ||
            c.description.toLowerCase().includes(q) ||
            c.tags.some(t => t.toLowerCase().includes(q))
        );
    }
}

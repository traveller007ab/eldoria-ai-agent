export interface FluidProperties {
    id: string;
    name: string;
    density: number; // kg/m³
    viscosity: number; // Pa·s (dynamic)
    specificHeat: number; // kJ/kg·K
    bulkModulus: number; // Pa
    gamma?: number; // Ratio of specific heats (Cp/Cv) for gases
    type: 'liquid' | 'gas';
    tags?: string[]; // Semantic tags: 'combustible', 'coolant', 'lubricant'
    isCustom?: boolean; // Flag for user-defined fluids
}

export class MaterialRegistry {
    private static instance: MaterialRegistry;
    private fluids: Map<string, FluidProperties> = new Map();
    private customFluids: Map<string, FluidProperties> = new Map();
    private readonly CUSTOM_PREFIX = 'custom_';

    private constructor() {
        this.registerDefaults();
    }

    static getInstance(): MaterialRegistry {
        if (!MaterialRegistry.instance) {
            MaterialRegistry.instance = new MaterialRegistry();
        }
        return MaterialRegistry.instance;
    }

    getAllFluids(): FluidProperties[] {
        return Array.from(this.fluids.values()).concat(Array.from(this.customFluids.values()));
    }

    getBuiltInFluids(): FluidProperties[] {
        return Array.from(this.fluids.values());
    }

    getCustomFluids(): FluidProperties[] {
        return Array.from(this.customFluids.values());
    }

    getFluid(id: string): FluidProperties {
        if (id.startsWith(this.CUSTOM_PREFIX)) {
            return this.customFluids.get(id) || this.fluids.get('water')!;
        }
        return this.fluids.get(id) || this.fluids.get('water')!;
    }

    isCustomFluid(id: string): boolean {
        return id.startsWith(this.CUSTOM_PREFIX) && this.customFluids.has(id);
    }

    registerCustomFluid(fluid: Omit<FluidProperties, 'id' | 'isCustom'>): string {
        const id = `${this.CUSTOM_PREFIX}${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        const customFluid: FluidProperties = {
            ...fluid,
            id,
            isCustom: true
        };
        this.customFluids.set(id, customFluid);
        return id;
    }

    updateCustomFluid(id: string, updates: Partial<Omit<FluidProperties, 'id' | 'isCustom'>>): boolean {
        if (!this.isCustomFluid(id)) {
            return false;
        }
        const existing = this.customFluids.get(id);
        if (existing) {
            this.customFluids.set(id, { ...existing, ...updates });
            return true;
        }
        return false;
    }

    removeCustomFluid(id: string): boolean {
        if (!this.isCustomFluid(id)) {
            return false;
        }
        return this.customFluids.delete(id);
    }

    clearCustomFluids(): void {
        this.customFluids.clear();
    }

    private registerDefaults() {
        // Liquids
        this.register({
            id: 'water',
            name: 'Water (20°C)',
            density: 998,
            viscosity: 0.001, // 1 cP
            specificHeat: 4.18,
            bulkModulus: 2.2e9,
            type: 'liquid',
            tags: ['coolant']
        });

        this.register({
            id: 'diesel',
            name: 'Diesel Fuel',
            density: 832,
            viscosity: 0.004,
            specificHeat: 2.0,
            bulkModulus: 1.5e9,
            type: 'liquid',
            tags: ['combustible', 'fuel']
        });

        this.register({
            id: 'gasoline',
            name: 'Gasoline / Petrol',
            density: 740,
            viscosity: 0.0006,
            specificHeat: 2.22,
            bulkModulus: 1.0e9,
            type: 'liquid',
            tags: ['combustible', 'fuel', 'volatile']
        });

        this.register({
            id: 'kerosene',
            name: 'Kerosene (Jet A-1)',
            density: 810,
            viscosity: 0.00164,
            specificHeat: 2.01,
            bulkModulus: 1.3e9,
            type: 'liquid',
            tags: ['combustible', 'fuel']
        });

        this.register({
            id: 'seawater',
            name: 'Sea Water',
            density: 1025,
            viscosity: 0.00107,
            specificHeat: 3.99,
            bulkModulus: 2.3e9,
            type: 'liquid',
            tags: ['coolant', 'corrosive']
        });

        this.register({
            id: 'crude_oil',
            name: 'Crude Oil (Heavy)',
            density: 930,
            viscosity: 0.1, // Very viscous
            specificHeat: 1.8,
            bulkModulus: 1.6e9,
            type: 'liquid',
            tags: ['combustible', 'viscous', 'dirty']
        });

        this.register({
            id: 'lh2',
            name: 'Liquid Hydrogen',
            density: 71,
            viscosity: 1.3e-5,
            specificHeat: 9.4, // High Cp
            bulkModulus: 0.2e9, // Compressible
            type: 'liquid',
            tags: ['fuel', 'combustible', 'cryogenic', 'volatile']
        });

        this.register({
            id: 'oil_iso46',
            name: 'Hydraulic Oil (ISO VG 46)',
            density: 875,
            viscosity: 0.046,
            specificHeat: 1.67,
            bulkModulus: 1.5e9,
            type: 'liquid',
            tags: ['lubricant']
        });

        this.register({
            id: 'glycol_50',
            name: 'Ethylene Glycol (50%)',
            density: 1060,
            viscosity: 0.003,
            specificHeat: 3.4,
            bulkModulus: 2.5e9,
            type: 'liquid',
            tags: ['coolant', 'antifreeze']
        });

        // Gases
        this.register({
            id: 'air',
            name: 'Air (STP)',
            density: 1.225,
            viscosity: 1.81e-5,
            specificHeat: 1.005,
            bulkModulus: 101325,
            gamma: 1.4,
            type: 'gas',
            tags: ['pneumatic', 'gas']
        });

        this.register({
            id: 'steam',
            name: 'Steam (10 bar)',
            density: 5.15,
            viscosity: 1.2e-5,
            specificHeat: 2.0,
            bulkModulus: 1e6,
            gamma: 1.33,
            type: 'gas'
        });
    }

    register(fluid: FluidProperties) {
        this.fluids.set(fluid.id, fluid);
    }
}

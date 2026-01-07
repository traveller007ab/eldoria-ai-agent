export interface FluidProperties {
    id: string;
    name: string;
    density: number; // kg/m³
    viscosity: number; // Pa·s (dynamic)
    specificHeat: number; // kJ/kg·K
    bulkModulus: number; // Pa
    gamma?: number; // Ratio of specific heats (Cp/Cv) for gases
    type: 'liquid' | 'gas';
}

export class MaterialRegistry {
    private static instance: MaterialRegistry;
    private fluids: Map<string, FluidProperties> = new Map();

    private constructor() {
        this.registerDefaults();
    }

    static getInstance(): MaterialRegistry {
        if (!MaterialRegistry.instance) {
            MaterialRegistry.instance = new MaterialRegistry();
        }
        return MaterialRegistry.instance;
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
            type: 'liquid'
        });

        this.register({
            id: 'oil_iso46',
            name: 'Hydraulic Oil (ISO VG 46)',
            density: 875,
            viscosity: 0.046,
            specificHeat: 1.67,
            bulkModulus: 1.5e9,
            type: 'liquid'
        });

        this.register({
            id: 'glycol_50',
            name: 'Ethylene Glycol (50%)',
            density: 1060,
            viscosity: 0.003,
            specificHeat: 3.4,
            bulkModulus: 2.5e9,
            type: 'liquid'
        });

        // Gases
        this.register({
            id: 'air',
            name: 'Air (STP)',
            density: 1.225,
            viscosity: 1.81e-5,
            specificHeat: 1.005,
            specificHeat: 1.005,
            bulkModulus: 101325,
            gamma: 1.4,
            type: 'gas'
        });

        this.register({
            id: 'steam',
            name: 'Steam (10 bar)',
            density: 5.15,
            viscosity: 1.2e-5,
            specificHeat: 2.0,
            specificHeat: 2.0,
            bulkModulus: 1e6,
            gamma: 1.33,
            type: 'gas'
        });
    }

    register(fluid: FluidProperties) {
        this.fluids.set(fluid.id, fluid);
    }

    getFluid(id: string): FluidProperties | undefined {
        return this.fluids.get(id);
    }

    getAllFluids(): FluidProperties[] {
        return Array.from(this.fluids.values());
    }
}

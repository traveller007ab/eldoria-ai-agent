/**
 * Real Fluid Properties Library
 * Based on NIST Chemistry WebBook and standard engineering references
 */

export interface FluidProperties {
    name: string;
    density: number;           // kg/m³ at 20°C
    viscosity: number;         // Pa·s at 20°C
    specificHeat: number;      // J/(kg·K)
    thermalConductivity: number; // W/(m·K)
    vaporPressure: number;     // Pa at 20°C
    surfaceTension: number;    // N/m at 20°C
    bulkModulus: number;       // Pa
    gamma: number;             // Ratio of specific heats (for gases)
    molecularWeight: number;   // kg/kmol
}

export interface TemperatureProperty {
    temperature: number;       // K
    density: number;           // kg/m³
    viscosity: number;         // Pa·s
    specificHeat: number;      // J/(kg·K)
    thermalConductivity: number; // W/(m·K)
    vaporPressure: number;     // Pa
}

export class FluidPropertyDatabase {
    private static fluids: Map<string, FluidProperties> = new Map([
        ['water', {
            name: 'Water',
            density: 998.2,
            viscosity: 1.002e-3,
            specificHeat: 4182,
            thermalConductivity: 0.598,
            vaporPressure: 2339,
            surfaceTension: 0.0728,
            bulkModulus: 2.18e9,
            gamma: 1.0,
            molecularWeight: 18.015
        }],
        ['gasoline', {
            name: 'Gasoline',
            density: 745,
            viscosity: 0.29e-3,
            specificHeat: 2100,
            thermalConductivity: 0.14,
            vaporPressure: 75000,
            surfaceTension: 0.022,
            bulkModulus: 1.1e9,
            gamma: 1.05,
            molecularWeight: 114
        }],
        ['diesel', {
            name: 'Diesel',
            density: 832,
            viscosity: 2.5e-3,
            specificHeat: 2100,
            thermalConductivity: 0.14,
            vaporPressure: 100,
            surfaceTension: 0.027,
            bulkModulus: 1.6e9,
            gamma: 1.05,
            molecularWeight: 170
        }],
        ['air', {
            name: 'Air',
            density: 1.204,
            viscosity: 1.825e-5,
            specificHeat: 1006,
            thermalConductivity: 0.0257,
            vaporPressure: 0,
            surfaceTension: 0,
            bulkModulus: 1.41e5,
            gamma: 1.4,
            molecularWeight: 28.97
        }],
        ['glycol', {
            name: 'Ethylene Glycol',
            density: 1113,
            viscosity: 16.1e-3,
            specificHeat: 2380,
            thermalConductivity: 0.26,
            vaporPressure: 10,
            surfaceTension: 0.048,
            bulkModulus: 2.7e9,
            gamma: 1.0,
            molecularWeight: 62.07
        }],
        ['oil', {
            name: 'Hydraulic Oil',
            density: 880,
            viscosity: 32e-3,
            specificHeat: 1900,
            thermalConductivity: 0.14,
            vaporPressure: 1,
            surfaceTension: 0.035,
            bulkModulus: 1.5e9,
            gamma: 1.0,
            molecularWeight: 300
        }]
    ]);

    static getFluid(fluidId: string): FluidProperties | undefined {
        return this.fluids.get(fluidId.toLowerCase());
    }

    static getAllFluids(): string[] {
        return Array.from(this.fluids.keys());
    }

    /**
     * Get density at a given temperature using polynomial approximation
     * Based on NIST data for water
     */
    static getDensityAtTemperature(fluidId: string, temperatureK: number): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 1000; // Default

        // Water density variation with temperature (simplified)
        if (fluidId.toLowerCase() === 'water') {
            const T = temperatureK - 273.15; // °C
            if (T >= 0 && T <= 100) {
                // Empirical correlation for water density
                return 999.842594 + 6.793952e-2 * T - 9.095035e-3 * T * T 
                       + 1.001685e-4 * Math.pow(T, 3) - 1.822305e-6 * Math.pow(T, 4)
                       + 4.399744e-9 * Math.pow(T, 5) - 5.582289e-12 * Math.pow(T, 6);
            }
        }

        // Linear approximation for other fluids
        return fluid.density * (1 - 0.0005 * (temperatureK - 293.15));
    }

    /**
     * Get dynamic viscosity at a given temperature
     * Uses Arrhenius-type equation for liquids
     */
    static getViscosityAtTemperature(fluidId: string, temperatureK: number): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 0.001;

        if (fluidId.toLowerCase() === 'water') {
            // Vogel-Fulcher-Tammann equation for water viscosity
            const T = temperatureK;
            if (T > 234 && T < 373) {
                const A = -1.943;
                const B = 251.3;
                const C = -120.1;
                return Math.exp(A + B / (T - C)) * 1e-3; // Pa·s
            }
        }

        // Simplified Arrhenius-type for other fluids
        const T_ref = 293.15;
        const activationEnergy = 20000; // J/mol (typical for liquids)
        const R = 8.314;
        return fluid.viscosity * Math.exp(activationEnergy / R * (1 / temperatureK - 1 / T_ref));
    }

    /**
     * Calculate Reynolds number
     * Re = ρVD/μ
     */
    static calculateReynoldsNumber(
        fluidId: string,
        velocity: number,      // m/s
        diameter: number,      // m
        temperatureK: number   // K
    ): number {
        const rho = this.getDensityAtTemperature(fluidId, temperatureK);
        const mu = this.getViscosityAtTemperature(fluidId, temperatureK);
        return (rho * velocity * diameter) / mu;
    }

    /**
     * Calculate Prandtl number
     * Pr = μ * Cp / k
     */
    static calculatePrandtlNumber(
        fluidId: string,
        temperatureK: number
    ): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 7; // Water at 20°C

        const mu = this.getViscosityAtTemperature(fluidId, temperatureK);
        const cp = fluid.specificHeat;
        const k = fluid.thermalConductivity;

        return (mu * cp) / k;
    }

    /**
     * Calculate kinematic viscosity
     * ν = μ / ρ
     */
    static calculateKinematicViscosity(
        fluidId: string,
        temperatureK: number
    ): number {
        const rho = this.getDensityAtTemperature(fluidId, temperatureK);
        const mu = this.getViscosityAtTemperature(fluidId, temperatureK);
        return mu / rho;
    }

    /**
     * Calculate speed of sound in fluid
     * c = sqrt(K/ρ) for liquids
     * c = sqrt(γRT/M) for ideal gases
     */
    static calculateSpeedOfSound(
        fluidId: string,
        temperatureK: number,
        pressurePa: number = 101325
    ): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 1480; // Water default

        if (fluid.gamma > 1.01) {
            // Gas - ideal gas law
            const R = 8314.46; // J/(kmol·K)
            const c = Math.sqrt((fluid.gamma * R * temperatureK) / fluid.molecularWeight);
            return c;
        } else {
            // Liquid - bulk modulus
            return Math.sqrt(fluid.bulkModulus / fluid.density);
        }
    }

    /**
     * Calculate NPSH (Net Positive Suction Head)
     * NPSH = (P_inlet/ρg) + (V_inlet²/2g) - (P_vap/ρg) - h_f
     */
    static calculateNPSH(
        fluidId: string,
        inletPressurePa: number,
        inletVelocity: number,
        vaporPressurePa: number,
        elevationM: number,
        frictionLossM: number,
        temperatureK: number
    ): number {
        const rho = this.getDensityAtTemperature(fluidId, temperatureK);
        const g = 9.80665;

        const pressureHead = inletPressurePa / (rho * g);
        const velocityHead = (inletVelocity * inletVelocity) / (2 * g);
        const vaporHead = vaporPressurePa / (rho * g);

        return pressureHead + velocityHead - vaporHead - elevationM - frictionLossM;
    }

    /**
     * Calculate cavitation number
     * σ = (P - P_vap) / (0.5ρV²)
     */
    static calculateCavitationNumber(
        fluidId: string,
        pressurePa: number,
        velocity: number,
        temperatureK: number
    ): number {
        const rho = this.getDensityAtTemperature(fluidId, temperatureK);
        const vaporPressure = this.getVaporPressure(fluidId, temperatureK);

        return (pressurePa - vaporPressure) / (0.5 * rho * velocity * velocity);
    }

    /**
     * Get vapor pressure at temperature (Antoine equation approximation)
     */
    static getVaporPressure(fluidId: string, temperatureK: number): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 2000;

        if (fluidId.toLowerCase() === 'water') {
            // Antoine equation for water
            const T = temperatureK - 273.15; // °C
            if (T > 0 && T < 100) {
                const A = 8.07131;
                const B = 1730.63;
                const C = 233.426;
                const log10P = A - B / (C + T);
                return Math.pow(10, log10P) * 133.322; // Convert mmHg to Pa
            }
        }

        return fluid.vaporPressure;
    }

    /**
     * Calculate thermal expansion coefficient
     * β = -(1/V)(∂V/∂T)_P
     */
    static getThermalExpansionCoefficient(fluidId: string, temperatureK: number): number {
        const fluid = this.fluids.get(fluidId.toLowerCase());
        if (!fluid) return 0.0002; // Water approximate

        // Simplified values (1/K)
        const expansionCoeffs: Record<string, number> = {
            'water': 0.000207,
            'gasoline': 0.00095,
            'diesel': 0.00075,
            'glycol': 0.00057,
            'oil': 0.0007
        };

        return expansionCoeffs[fluidId.toLowerCase()] || 0.0005;
    }
}

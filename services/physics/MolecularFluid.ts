/**
 * Molecular Fluid Service
 * 
 * Handles composition-based fluid definitions where properties are
 * CALCULATED from molecular species rather than looked up from tables.
 */

import type { MolecularFluid, ChemicalSpecies, FluidStream } from '../../src/components/saf/mechanical/SemanticComponent';

// ═══════════════════════════════════════════════════════════════
// SPECIES DATABASE
// ═══════════════════════════════════════════════════════════════

export const COMMON_SPECIES: Record<string, ChemicalSpecies> = {
    H2O: {
        formula: 'H2O',
        name: 'Water',
        molecularWeight: 18.015,
        critical: { temperature: 647.1, pressure: 22.064e6 },
        standardPhase: 'liquid'
    },
    C2H6O2: {
        formula: 'C2H6O2',
        name: 'Ethylene Glycol',
        molecularWeight: 62.07,
        critical: { temperature: 720, pressure: 8.2e6 },
        standardPhase: 'liquid'
    },
    C3H8O2: {
        formula: 'C3H8O2',
        name: 'Propylene Glycol',
        molecularWeight: 76.09,
        critical: { temperature: 676, pressure: 6.1e6 },
        standardPhase: 'liquid'
    },
    CH4: {
        formula: 'CH4',
        name: 'Methane',
        molecularWeight: 16.04,
        critical: { temperature: 190.6, pressure: 4.6e6 },
        standardPhase: 'gas'
    },
    C8H18: {
        formula: 'C8H18',
        name: 'Octane (Gasoline)',
        molecularWeight: 114.23,
        critical: { temperature: 568.7, pressure: 2.49e6 },
        standardPhase: 'liquid'
    },
    C12H26: {
        formula: 'C12H26',
        name: 'Dodecane (Diesel)',
        molecularWeight: 170.33,
        critical: { temperature: 658, pressure: 1.82e6 },
        standardPhase: 'liquid'
    },
    C2H5OH: {
        formula: 'C2H5OH',
        name: 'Ethanol',
        molecularWeight: 46.07,
        critical: { temperature: 514, pressure: 6.14e6 },
        standardPhase: 'liquid'
    },
    N2: {
        formula: 'N2',
        name: 'Nitrogen',
        molecularWeight: 28.01,
        critical: { temperature: 126.2, pressure: 3.39e6 },
        standardPhase: 'gas'
    },
    O2: {
        formula: 'O2',
        name: 'Oxygen',
        molecularWeight: 32.0,
        critical: { temperature: 154.6, pressure: 5.04e6 },
        standardPhase: 'gas'
    },
    CO2: {
        formula: 'CO2',
        name: 'Carbon Dioxide',
        molecularWeight: 44.01,
        critical: { temperature: 304.1, pressure: 7.38e6 },
        standardPhase: 'gas'
    },
    NH3: {
        formula: 'NH3',
        name: 'Ammonia',
        molecularWeight: 17.03,
        critical: { temperature: 405.4, pressure: 11.3e6 },
        standardPhase: 'gas'
    },
    R134a: {
        formula: 'CH2FCF3',
        name: 'R-134a Refrigerant',
        molecularWeight: 102.03,
        critical: { temperature: 374.2, pressure: 4.06e6 },
        standardPhase: 'gas'
    }
};

// Pure fluid property data at 25°C, 1 atm
const PURE_FLUID_PROPERTIES: Record<string, { density: number; viscosity: number; specificHeat: number; thermalConductivity: number }> = {
    H2O: { density: 997, viscosity: 0.00089, specificHeat: 4186, thermalConductivity: 0.606 },
    C2H6O2: { density: 1113, viscosity: 0.0161, specificHeat: 2400, thermalConductivity: 0.256 },
    C3H8O2: { density: 1036, viscosity: 0.042, specificHeat: 2500, thermalConductivity: 0.200 },
    CH4: { density: 0.657, viscosity: 0.000011, specificHeat: 2220, thermalConductivity: 0.034 },
    C8H18: { density: 703, viscosity: 0.00054, specificHeat: 2220, thermalConductivity: 0.128 },
    C12H26: { density: 750, viscosity: 0.00134, specificHeat: 2210, thermalConductivity: 0.140 },
    C2H5OH: { density: 789, viscosity: 0.00109, specificHeat: 2440, thermalConductivity: 0.171 },
    N2: { density: 1.145, viscosity: 0.0000178, specificHeat: 1040, thermalConductivity: 0.026 },
    O2: { density: 1.308, viscosity: 0.0000205, specificHeat: 919, thermalConductivity: 0.027 },
    CO2: { density: 1.815, viscosity: 0.0000149, specificHeat: 844, thermalConductivity: 0.017 },
};

// ═══════════════════════════════════════════════════════════════
// MOLECULAR FLUID SERVICE
// ═══════════════════════════════════════════════════════════════

export class MolecularFluidService {

    /**
     * Create a pure fluid from a single species.
     */
    static createPureFluid(speciesFormula: string, temperature = 298.15, pressure = 101325): MolecularFluid {
        const species = COMMON_SPECIES[speciesFormula];
        if (!species) {
            throw new Error(`Unknown species: ${speciesFormula}`);
        }

        const props = this.calculateProperties([{ species, fraction: 1, basis: 'mass' }], temperature, pressure);

        return {
            id: `fluid_${speciesFormula}_${Date.now()}`,
            name: species.name,
            composition: [{ species, fraction: 1, basis: 'mass' }],
            properties: props,
            conditions: { temperature, pressure },
            tags: this.inferTags(species)
        };
    }

    /**
     * Create a mixture from multiple species.
     */
    static createMixture(
        components: { formula: string; fraction: number }[],
        name: string,
        basis: 'mass' | 'mole' = 'mass',
        temperature = 298.15,
        pressure = 101325
    ): MolecularFluid {
        const composition = components.map(c => {
            const species = COMMON_SPECIES[c.formula];
            if (!species) throw new Error(`Unknown species: ${c.formula}`);
            return { species, fraction: c.fraction, basis };
        });

        // Normalize fractions
        const totalFraction = composition.reduce((sum, c) => sum + c.fraction, 0);
        composition.forEach(c => c.fraction /= totalFraction);

        const props = this.calculateProperties(composition, temperature, pressure);

        return {
            id: `mixture_${Date.now()}`,
            name,
            composition,
            properties: props,
            conditions: { temperature, pressure },
            tags: this.inferMixtureTags(composition)
        };
    }

    /**
     * Calculate mixture properties using mixing rules.
     */
    static calculateProperties(
        composition: { species: ChemicalSpecies; fraction: number; basis: 'mass' | 'mole' }[],
        temperature: number,
        pressure: number
    ): MolecularFluid['properties'] {
        // Convert to mass fractions if needed
        const massFractions = composition.map(c => {
            if (c.basis === 'mass') return c.fraction;
            // Convert mole to mass fraction
            const totalMass = composition.reduce((sum, comp) =>
                sum + comp.fraction * comp.species.molecularWeight, 0);
            return (c.fraction * c.species.molecularWeight) / totalMass;
        });

        // Calculate mixture properties using linear mixing (simple approach)
        // For more accuracy, use Grunberg-Nissan for viscosity, etc.
        let density = 0;
        let viscosity = 0;
        let specificHeat = 0;
        let thermalConductivity = 0;

        composition.forEach((c, i) => {
            const pureProps = PURE_FLUID_PROPERTIES[c.species.formula];
            if (!pureProps) return;

            const w = massFractions[i];

            // Volume-weighted density (harmonic mean for liquids)
            density += w / pureProps.density;

            // Mass-weighted specific heat
            specificHeat += w * pureProps.specificHeat;

            // Logarithmic mixing for viscosity (Arrhenius)
            viscosity += w * Math.log(pureProps.viscosity);

            // Linear mixing for thermal conductivity
            thermalConductivity += w * pureProps.thermalConductivity;
        });

        density = 1 / density;  // Invert for harmonic mean
        viscosity = Math.exp(viscosity);  // Exp for Arrhenius

        // Temperature correction (simplified)
        const tempRatio = 298.15 / temperature;
        viscosity *= Math.pow(tempRatio, 1.5);  // Approximate Andrade equation

        // Pressure correction for liquids (minimal)
        const pressureRatio = pressure / 101325;
        density *= (1 + 0.00001 * (pressureRatio - 1));

        return {
            density,
            viscosity,
            specificHeat,
            thermalConductivity
        };
    }

    /**
     * Update fluid properties for new conditions.
     */
    static updateConditions(fluid: MolecularFluid, temperature: number, pressure: number): MolecularFluid {
        const newProps = this.calculateProperties(fluid.composition, temperature, pressure);

        return {
            ...fluid,
            properties: newProps,
            conditions: { temperature, pressure }
        };
    }

    /**
     * Create a common coolant mixture.
     */
    static createCoolant(glycolPercentage: number, type: 'ethylene' | 'propylene' = 'ethylene'): MolecularFluid {
        const glycolFormula = type === 'ethylene' ? 'C2H6O2' : 'C3H8O2';
        const waterFraction = (100 - glycolPercentage) / 100;
        const glycolFraction = glycolPercentage / 100;

        return this.createMixture(
            [
                { formula: 'H2O', fraction: waterFraction },
                { formula: glycolFormula, fraction: glycolFraction }
            ],
            `${glycolPercentage}% ${type === 'ethylene' ? 'Ethylene' : 'Propylene'} Glycol Coolant`,
            'mass'
        );
    }

    /**
     * Create E10 or E85 gasoline-ethanol blend.
     */
    static createGasolineBlend(ethanolPercentage: number): MolecularFluid {
        return this.createMixture(
            [
                { formula: 'C8H18', fraction: (100 - ethanolPercentage) / 100 },
                { formula: 'C2H5OH', fraction: ethanolPercentage / 100 }
            ],
            `E${ethanolPercentage} Gasoline`,
            'mass'
        );
    }

    /**
     * Estimate freeze point of glycol-water mixture (simplified Horvath equation).
     */
    static estimateFreezePoint(fluid: MolecularFluid): number | null {
        const glycol = fluid.composition.find(c =>
            c.species.formula === 'C2H6O2' || c.species.formula === 'C3H8O2'
        );
        const water = fluid.composition.find(c => c.species.formula === 'H2O');

        if (!glycol || !water) return null;

        const glycolPercent = glycol.fraction * 100;

        // Simplified freeze point depression (approximately linear up to ~60%)
        if (glycolPercent <= 60) {
            return 273.15 - (glycolPercent * 0.6);  // Approximate K
        }

        // Above 60%, freeze point rises again
        return 273.15 - 36 + (glycolPercent - 60) * 0.5;
    }

    // ═══════════════════════════════════════════════════════════════
    // HELPER METHODS
    // ═══════════════════════════════════════════════════════════════

    private static inferTags(species: ChemicalSpecies): MolecularFluid['tags'] {
        const tags: MolecularFluid['tags'] = [];

        if (['CH4', 'C8H18', 'C12H26', 'C2H5OH'].includes(species.formula)) {
            tags.push('combustible', 'flammable');
        }

        if (['H2O', 'C2H6O2', 'C3H8O2'].includes(species.formula)) {
            tags.push('coolant');
        }

        if (['C8H18', 'C12H26'].includes(species.formula)) {
            tags.push('lubricant');
        }

        if (species.formula === 'O2') {
            tags.push('oxidizer');
        }

        if (species.formula === 'NH3') {
            tags.push('toxic', 'corrosive');
        }

        return tags;
    }

    private static inferMixtureTags(composition: { species: ChemicalSpecies; fraction: number }[]): MolecularFluid['tags'] {
        const allTags = new Set<MolecularFluid['tags'][number]>();

        composition.forEach(c => {
            this.inferTags(c.species).forEach(t => allTags.add(t));
        });

        return Array.from(allTags);
    }
}

export default MolecularFluidService;

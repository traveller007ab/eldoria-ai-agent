/**
 * Reaction Engine
 * 
 * Handles chemical reactions in the system, tracking species through
 * the flowsheet and calculating reaction products, heat release, and
 * composition changes.
 */

import type { ChemicalReaction, ChemicalSpecies, FluidStream, MolecularFluid } from '../../src/components/saf/mechanical/SemanticComponent';
import { COMMON_SPECIES } from './MolecularFluid';

// ═══════════════════════════════════════════════════════════════
// COMMON REACTIONS DATABASE
// ═══════════════════════════════════════════════════════════════

export const COMMON_REACTIONS: Record<string, ChemicalReaction> = {
    methane_combustion: {
        id: 'rxn_methane_combustion',
        name: 'Methane Combustion',
        equation: 'CH₄ + 2O₂ → CO₂ + 2H₂O',
        reactants: [
            { species: COMMON_SPECIES.CH4, stoichiometry: 1 },
            { species: COMMON_SPECIES.O2, stoichiometry: 2 }
        ],
        products: [
            { species: COMMON_SPECIES.CO2, stoichiometry: 1 },
            { species: COMMON_SPECIES.H2O, stoichiometry: 2 }
        ],
        thermodynamics: {
            heatOfReaction: -890400,  // J/mol (exothermic)
            activationEnergy: 125000
        },
        type: 'combustion',
        conditions: { minTemperature: 813, ignitionSource: true }
    },

    octane_combustion: {
        id: 'rxn_octane_combustion',
        name: 'Octane Combustion (Gasoline)',
        equation: '2C₈H₁₈ + 25O₂ → 16CO₂ + 18H₂O',
        reactants: [
            { species: COMMON_SPECIES.C8H18, stoichiometry: 2 },
            { species: COMMON_SPECIES.O2, stoichiometry: 25 }
        ],
        products: [
            { species: COMMON_SPECIES.CO2, stoichiometry: 16 },
            { species: COMMON_SPECIES.H2O, stoichiometry: 18 }
        ],
        thermodynamics: {
            heatOfReaction: -5470000,  // J/mol (per 2 mol octane)
        },
        type: 'combustion',
        conditions: { minTemperature: 533, ignitionSource: true }
    },

    ethanol_combustion: {
        id: 'rxn_ethanol_combustion',
        name: 'Ethanol Combustion',
        equation: 'C₂H₅OH + 3O₂ → 2CO₂ + 3H₂O',
        reactants: [
            { species: COMMON_SPECIES.C2H5OH, stoichiometry: 1 },
            { species: COMMON_SPECIES.O2, stoichiometry: 3 }
        ],
        products: [
            { species: COMMON_SPECIES.CO2, stoichiometry: 2 },
            { species: COMMON_SPECIES.H2O, stoichiometry: 3 }
        ],
        thermodynamics: {
            heatOfReaction: -1367000,  // J/mol
        },
        type: 'combustion',
        conditions: { minTemperature: 636, ignitionSource: true }
    },

    diesel_combustion: {
        id: 'rxn_diesel_combustion',
        name: 'Diesel Combustion (Dodecane)',
        equation: '2C₁₂H₂₆ + 37O₂ → 24CO₂ + 26H₂O',
        reactants: [
            { species: COMMON_SPECIES.C12H26, stoichiometry: 2 },
            { species: COMMON_SPECIES.O2, stoichiometry: 37 }
        ],
        products: [
            { species: COMMON_SPECIES.CO2, stoichiometry: 24 },
            { species: COMMON_SPECIES.H2O, stoichiometry: 26 }
        ],
        thermodynamics: {
            heatOfReaction: -7513000,  // J/mol (per 2 mol dodecane)
        },
        type: 'combustion',
        conditions: { minTemperature: 483, ignitionSource: true }
    }
};

// ═══════════════════════════════════════════════════════════════
// REACTION ENGINE
// ═══════════════════════════════════════════════════════════════

export interface ReactionResult {
    reaction: ChemicalReaction;
    extent: number;  // mol/s - extent of reaction
    heatRelease: number;  // W

    /** What was consumed */
    consumed: { species: ChemicalSpecies; molarFlow: number; massFlow: number }[];

    /** What was produced */
    produced: { species: ChemicalSpecies; molarFlow: number; massFlow: number }[];

    /** Resulting stream composition */
    outletComposition: MolecularFluid['composition'];

    /** Warnings or issues */
    warnings: string[];
}

export class ReactionEngine {

    /**
     * Calculate the result of a combustion reaction.
     */
    static calculateCombustion(
        fuel: MolecularFluid,
        fuelMassFlow: number,  // kg/s
        airExcess: number = 1.15  // 15% excess air
    ): ReactionResult {
        const warnings: string[] = [];

        // Find the dominant fuel species
        const fuelSpecies = fuel.composition[0]?.species;
        if (!fuelSpecies) {
            throw new Error('No fuel species found');
        }

        // Find the appropriate reaction
        let reaction: ChemicalReaction | null = null;
        if (fuelSpecies.formula === 'CH4') {
            reaction = COMMON_REACTIONS.methane_combustion;
        } else if (fuelSpecies.formula === 'C8H18') {
            reaction = COMMON_REACTIONS.octane_combustion;
        } else if (fuelSpecies.formula === 'C2H5OH') {
            reaction = COMMON_REACTIONS.ethanol_combustion;
        } else if (fuelSpecies.formula === 'C12H26') {
            reaction = COMMON_REACTIONS.diesel_combustion;
        }

        if (!reaction) {
            throw new Error(`No combustion reaction defined for ${fuelSpecies.name}`);
        }

        // Calculate molar flow of fuel
        const fuelMolarFlow = fuelMassFlow / (fuelSpecies.molecularWeight / 1000);  // mol/s

        // Calculate stoichiometric air requirement
        const o2Requirement = reaction.reactants.find(r => r.species.formula === 'O2')!;
        const fuelStoich = reaction.reactants.find(r => r.species.formula === fuelSpecies.formula)!;

        const o2MolarFlow = fuelMolarFlow * (o2Requirement.stoichiometry / fuelStoich.stoichiometry);
        const airMolarFlow = o2MolarFlow / 0.21 * airExcess;  // Air is ~21% O2

        // Calculate extent of reaction (limited by fuel as limiting reactant)
        const extent = fuelMolarFlow / fuelStoich.stoichiometry;

        // Heat release
        const heatRelease = -extent * reaction.thermodynamics.heatOfReaction;  // Positive = exothermic

        // Consumed species
        const consumed = reaction.reactants.map(r => ({
            species: r.species,
            molarFlow: extent * r.stoichiometry,
            massFlow: extent * r.stoichiometry * (r.species.molecularWeight / 1000)
        }));

        // Produced species
        const produced = reaction.products.map(p => ({
            species: p.species,
            molarFlow: extent * p.stoichiometry,
            massFlow: extent * p.stoichiometry * (p.species.molecularWeight / 1000)
        }));

        // Calculate outlet composition (products + excess air)
        const excessO2Molar = o2MolarFlow * airExcess - o2MolarFlow;
        const n2Molar = airMolarFlow * 0.79;

        const totalOutletMolar =
            produced.reduce((sum, p) => sum + p.molarFlow, 0) +
            excessO2Molar +
            n2Molar;

        const outletComposition: MolecularFluid['composition'] = [
            ...produced.map(p => ({
                species: p.species,
                fraction: p.molarFlow / totalOutletMolar,
                basis: 'mole' as const
            })),
            {
                species: COMMON_SPECIES.O2,
                fraction: excessO2Molar / totalOutletMolar,
                basis: 'mole' as const
            },
            {
                species: COMMON_SPECIES.N2,
                fraction: n2Molar / totalOutletMolar,
                basis: 'mole' as const
            }
        ];

        // Check for issues
        if (airExcess < 1.0) {
            warnings.push('Insufficient air: incomplete combustion expected');
        }

        return {
            reaction,
            extent,
            heatRelease,
            consumed,
            produced,
            outletComposition,
            warnings
        };
    }

    /**
     * Estimate adiabatic flame temperature from combustion.
     */
    static estimateFlameTemperature(
        fuel: MolecularFluid,
        fuelMassFlow: number,
        airExcess: number = 1.15,
        inletTemperature: number = 298.15
    ): number {
        const result = this.calculateCombustion(fuel, fuelMassFlow, airExcess);

        // Simplified: assume constant Cp of flue gas ≈ 1100 J/(kg·K)
        const flueGasCp = 1100;
        const flueGasMassFlow =
            result.produced.reduce((sum, p) => sum + p.massFlow, 0) +
            fuelMassFlow * airExcess * (1 / 0.21) * 0.79 * (28 / 1000);  // N2

        const deltaT = result.heatRelease / (flueGasMassFlow * flueGasCp);

        return inletTemperature + deltaT;
    }

    /**
     * Calculate Lower Heating Value (LHV) of a fuel.
     */
    static calculateLHV(fuel: MolecularFluid): number {
        const fuelSpecies = fuel.composition[0]?.species;
        if (!fuelSpecies) return 0;

        // LHV values in MJ/kg
        const lhvData: Record<string, number> = {
            'CH4': 50.0,
            'C8H18': 44.4,
            'C12H26': 43.0,
            'C2H5OH': 26.8,
        };

        // For mixtures, use mass-weighted average
        let totalLHV = 0;
        for (const comp of fuel.composition) {
            const lhv = lhvData[comp.species.formula] || 0;
            totalLHV += comp.fraction * lhv;
        }

        return totalLHV;
    }

    /**
     * Generate a human-readable reaction summary.
     */
    static summarizeReaction(result: ReactionResult): string {
        const lines: string[] = [];

        lines.push(`## ${result.reaction.name}`);
        lines.push(`\`${result.reaction.equation}\`\n`);

        lines.push('### Consumed');
        result.consumed.forEach(c => {
            lines.push(`- ${c.species.name}: ${(c.massFlow * 3600).toFixed(2)} kg/h`);
        });

        lines.push('\n### Produced');
        result.produced.forEach(p => {
            lines.push(`- ${p.species.name}: ${(p.massFlow * 3600).toFixed(2)} kg/h`);
        });

        lines.push(`\n### Heat Release: ${(result.heatRelease / 1000).toFixed(1)} kW`);

        if (result.warnings.length > 0) {
            lines.push('\n### Warnings');
            result.warnings.forEach(w => lines.push(`⚠️ ${w}`));
        }

        return lines.join('\n');
    }
}

export default ReactionEngine;

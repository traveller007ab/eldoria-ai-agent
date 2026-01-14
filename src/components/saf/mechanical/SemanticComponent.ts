/**
 * Eldoria SAF Lab - Semantic Component Types
 * 
 * The Living Mathematics Layer: Components that understand themselves.
 * This extends MechanicalComponent with narrative, explanation, and
 * self-awareness capabilities.
 */

import type {
    MechanicalComponent,
    GoverningEquation,
    FailureMode,
    ComponentParameter,
    ComponentState,
    MechanicalDomain
} from './types';

// ═══════════════════════════════════════════════════════════════
// NARRATIVE & EXPLANATION
// ═══════════════════════════════════════════════════════════════

/**
 * A natural language narrative about a component or equation.
 * Used to generate explanations and documentation.
 */
export interface ComponentNarrative {
    /** What this component does in plain English */
    purpose: string;

    /** How it works (physical principle) */
    mechanism: string;

    /** When to use this component */
    useCases: string[];

    /** Common mistakes or misconceptions */
    caveats?: string[];

    /** Related components that often work together */
    relatedComponents?: string[];
}

/**
 * An explanation trace showing how a value was derived.
 * Enables "click to explain" functionality.
 */
export interface DerivationStep {
    /** The equation used in this step */
    equation: GoverningEquation;

    /** Input values with their sources */
    inputs: {
        symbol: string;
        value: number;
        unit: string;
        source: 'parameter' | 'calculated' | 'upstream' | 'constant';
        derivedFrom?: string; // ID of upstream calculation
    }[];

    /** The output of this step */
    output: {
        symbol: string;
        value: number;
        unit: string;
    };

    /** Natural language explanation of this step */
    explanation: string;
}

/**
 * Complete derivation chain for a calculated value.
 */
export interface DerivationChain {
    /** The final result being explained */
    result: {
        name: string;
        symbol: string;
        value: number;
        unit: string;
    };

    /** Ordered steps from inputs to result */
    steps: DerivationStep[];

    /** Summary explanation */
    summary: string;

    /** Assumptions that affect this calculation */
    assumptions: string[];

    /** Parameters that most affect this result (sensitivity) */
    sensitiveTo: {
        parameter: string;
        elasticity: number; // % change in result per % change in parameter
    }[];
}

// ═══════════════════════════════════════════════════════════════
// SEMANTIC COMPONENT
// ═══════════════════════════════════════════════════════════════

/**
 * A component that knows its own physics and can explain itself.
 * Extends MechanicalComponent with semantic awareness.
 */
export interface SemanticComponent extends MechanicalComponent {
    /** Natural language description of the component */
    narrative: ComponentNarrative;

    /** 
     * Equations with enhanced metadata for explanation.
     * Override the base equations with richer type.
     */
    semanticEquations: SemanticEquation[];

    /** 
     * Known failure modes with detection and mitigation strategies.
     * Override base failureModes with richer type.
     */
    semanticFailureModes: SemanticFailureMode[];

    /** 
     * Derivation chains for all calculated states.
     * Populated after simulation.
     */
    derivations?: Record<string, DerivationChain>;
}

/**
 * An equation with enhanced semantic metadata.
 */
export interface SemanticEquation extends GoverningEquation {
    /** Plain English explanation of what this equation calculates */
    narrative: string;

    /** Physical law or principle this equation embodies */
    principle: string;

    /** When this equation applies vs. alternatives */
    applicability: string;

    /** What happens if this equation is violated */
    violationConsequence?: string;

    /** Related equations that should be consistent */
    relatedEquations?: string[];
}

/**
 * A failure mode with enhanced explanation and guidance.
 */
export interface SemanticFailureMode extends FailureMode {
    /** What the user would observe if this failure occurs */
    symptoms: string[];

    /** Root causes that lead to this failure */
    rootCauses: string[];

    /** How to prevent this failure */
    preventiveMeasures: string[];

    /** Equations that predict proximity to this failure */
    predictiveIndicators?: {
        equation: string;
        warningThreshold: number;
        criticalThreshold: number;
        unit: string;
    }[];
}

// ═══════════════════════════════════════════════════════════════
// FLUID STREAM (MULTI-FLUID SUPPORT)
// ═══════════════════════════════════════════════════════════════

/**
 * A chemical species in a fluid composition.
 */
export interface ChemicalSpecies {
    /** Chemical formula (e.g., "H2O", "C2H6O2", "CH4") */
    formula: string;

    /** Common name */
    name: string;

    /** Molecular weight (g/mol) */
    molecularWeight: number;

    /** Critical properties */
    critical?: {
        temperature: number;  // K
        pressure: number;     // Pa
    };

    /** Phase at standard conditions */
    standardPhase: 'solid' | 'liquid' | 'gas';
}

/**
 * A composition-based fluid definition.
 * Properties are CALCULATED from molecular composition.
 */
export interface MolecularFluid {
    id: string;
    name: string;

    /** Composition as mass or mole fractions */
    composition: {
        species: ChemicalSpecies;
        fraction: number;
        basis: 'mass' | 'mole';
    }[];

    /** Calculated properties at current conditions */
    properties: {
        density: number;          // kg/m³
        viscosity: number;        // Pa·s
        specificHeat: number;     // J/(kg·K)
        thermalConductivity: number; // W/(m·K)
        vaporPressure?: number;   // Pa
        surfaceTension?: number;  // N/m
    };

    /** Conditions at which properties are calculated */
    conditions: {
        temperature: number;  // K
        pressure: number;     // Pa
    };

    /** Tags for compatibility checking */
    tags: ('combustible' | 'corrosive' | 'toxic' | 'flammable' | 'oxidizer' | 'coolant' | 'lubricant')[];
}

/**
 * A fluid stream in a specific circuit.
 */
export interface FluidStream {
    id: string;

    /** The fluid in this stream */
    fluid: MolecularFluid;

    /** Which circuit/loop this stream belongs to */
    circuitId: string;
    circuitName: string;

    /** Current phase */
    phase: 'liquid' | 'gas' | 'two-phase' | 'supercritical';

    /** Flow conditions */
    state: {
        massFlow: number;      // kg/s
        temperature: number;   // K
        pressure: number;      // Pa
        quality?: number;      // For two-phase (0-1)
        enthalpy?: number;     // J/kg
        entropy?: number;      // J/(kg·K)
    };
}

// ═══════════════════════════════════════════════════════════════
// CHEMICAL REACTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * A chemical reaction occurring in a component.
 */
export interface ChemicalReaction {
    id: string;
    name: string;

    /** Reaction equation (e.g., "CH4 + 2O2 → CO2 + 2H2O") */
    equation: string;

    /** Reactants with stoichiometry */
    reactants: {
        species: ChemicalSpecies;
        stoichiometry: number;
    }[];

    /** Products with stoichiometry */
    products: {
        species: ChemicalSpecies;
        stoichiometry: number;
    }[];

    /** Thermodynamic data */
    thermodynamics: {
        heatOfReaction: number;     // J/mol (negative = exothermic)
        activationEnergy?: number;  // J/mol
        equilibriumConstant?: number;
    };

    /** Reaction type */
    type: 'combustion' | 'oxidation' | 'reduction' | 'neutralization' | 'synthesis' | 'decomposition' | 'electrochemical';

    /** Conditions required for reaction */
    conditions?: {
        minTemperature?: number;
        catalyst?: string;
        ignitionSource?: boolean;
    };
}

// ═══════════════════════════════════════════════════════════════
// COMPONENT WITH MULTI-STREAM SUPPORT
// ═══════════════════════════════════════════════════════════════

/**
 * Extends SemanticComponent with multi-fluid stream handling.
 */
export interface MultiStreamComponent extends SemanticComponent {
    /** Inlet streams (can have multiple) */
    inletStreams: FluidStream[];

    /** Outlet streams (can have multiple) */
    outletStreams: FluidStream[];

    /** How streams interact in this component */
    streamInteraction: 'separate' | 'mixing' | 'heat-transfer' | 'mass-transfer' | 'reaction';

    /** Reactions occurring in this component */
    reactions?: ChemicalReaction[];
}

// ═══════════════════════════════════════════════════════════════
// EXPLANATION ENGINE INTERFACE
// ═══════════════════════════════════════════════════════════════

/**
 * Interface for generating explanations about the model.
 */
export interface ExplanationEngine {
    /**
     * Explain how a value was calculated.
     */
    explainValue(componentId: string, stateSymbol: string): DerivationChain;

    /**
     * Explain why a component is in a particular state.
     */
    explainState(componentId: string): string;

    /**
     * Generate a warning explanation for a failure mode.
     */
    explainFailureRisk(componentId: string, failureModeId: string): {
        risk: 'low' | 'medium' | 'high' | 'critical';
        explanation: string;
        recommendations: string[];
    };

    /**
     * Answer a natural language question about the model.
     */
    askQuestion(question: string): Promise<{
        answer: string;
        relevantComponents: string[];
        relevantEquations: string[];
        confidence: number;
    }>;
}

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Check if two fluid streams are compatible for connection.
 */
export function areStreamsCompatible(stream1: FluidStream, stream2: FluidStream): {
    compatible: boolean;
    reason?: string;
} {
    // Same circuit check
    if (stream1.circuitId !== stream2.circuitId) {
        return {
            compatible: false,
            reason: `Circuit mismatch: "${stream1.circuitName}" cannot connect to "${stream2.circuitName}"`
        };
    }

    // Same fluid check
    if (stream1.fluid.id !== stream2.fluid.id) {
        return {
            compatible: false,
            reason: `Fluid mismatch: ${stream1.fluid.name} cannot flow into ${stream2.fluid.name} circuit`
        };
    }

    return { compatible: true };
}

/**
 * Generate a simple narrative from an equation.
 */
export function generateEquationNarrative(eq: GoverningEquation): string {
    return `${eq.name}: ${eq.description || eq.expression}`;
}

/**
 * SAF Lab Physics Services
 * 
 * Export all physics-related services for the Living Mathematics Engine.
 */

// Narrative & Explanation
export { ComponentNarrativeService } from './ComponentNarrative';

// Derivation Tracking
export { DerivationTracer, globalTracer } from './DerivationTracer';

// Molecular Fluids
export { MolecularFluidService, COMMON_SPECIES } from './MolecularFluid';

// Chemical Reactions
export { ReactionEngine, COMMON_REACTIONS } from './ReactionEngine';
export type { ReactionResult } from './ReactionEngine';

// Model Query Engine (NL → Physics)
export { ModelQueryEngine } from './ModelQueryEngine';
export type { QueryResult, QueryContext, QueryIntent } from './ModelQueryEngine';

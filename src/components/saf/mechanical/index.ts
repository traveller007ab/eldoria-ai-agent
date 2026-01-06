/**
 * Mechanical SAF Module Index
 * Main entry point for all mechanical engineering components
 */

// Types
export * from './types';

// Components
export * from './components/catalog';

// Materials
export * from './materials/metals';

// Constants
export * from './constants/physicalConstants';

// Solvers
export type { FluidNetworkSolver } from './solvers/fluidNetworkSolver';
export type { FluidNetworkResult, FluidNode, FluidElement } from './solvers/fluidNetworkSolver';
export type { SolverOptions as FluidSolverOptions } from './solvers/fluidNetworkSolver';

export type { ThermodynamicSolver } from './solvers/thermodynamicSolver';
export type { CycleResult, HeatExchangerResult, ThermodynamicState } from './solvers/thermodynamicSolver';
export type { SolverOptions as ThermoSolverOptions } from './solvers/thermodynamicSolver';

// UI Components
export * from './ui/MechanicalGraphEditor';
export * from './ui/MechanicalNode';
export * from './ui/ComponentPalette';
export * from './ui/PropertiesPanel';

// Lab View
export { MechanicalSAFLab } from './MechanicalSAFLab';

// Store
export * from './store';

/**
 * Mechanical SAF Lab v2.0 - Index
 * Main export for the mechanical engineering workbench.
 */

// Main Component - Default Export
export { default as MechanicalSAFLab } from './MechanicalSAFLab';
export { MechanicalSAFLab as MechSAFLab } from './MechanicalSAFLab';

// Core Classes and Store
export { ComponentBase, ComponentFactory } from './core/ComponentBase';
export { useMechanicalSAFStore } from './core/store';

// Component Classes (for direct instantiation)
export { CentrifugalPump } from './components/fluid';
export { StraightPipe } from './components/fluid';
export { ControlValve } from './components/fluid';
export { BallValve } from './components/fluid';
export { ShellTubeHeatExchanger } from './components/fluid';

// UI Components
export { ComponentPalette } from './ui/palette/ComponentPalette';
export { PropertiesPanel } from './ui/properties/PropertiesPanel';

// Canvas
export { NODE_TYPES, EDGE_TYPES } from './ui/canvas/MechanicalCanvas';

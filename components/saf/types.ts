/**
 * DeepSAF Types - Extended SAF Blueprint Schema
 * Supports recursive decomposition, live parameter editing, and cascading effects
 */

// ============================================
// COMPONENT PARAMETERS & OUTPUTS
// ============================================

export interface SAFParameter {
    name: string;
    value: number | string;
    unit?: string;
    min?: number;
    max?: number;
    formula?: string; // e.g., "parent.efficiency * 0.95"
    description?: string;
}

export interface SAFOutput {
    name: string;
    value: number | string;
    unit?: string;
    formula?: string; // Derivation formula
    description?: string;
}

// ============================================
// COMPONENTS (Recursive)
// ============================================

export interface DeepSAFComponent {
    id: string;
    name: string;
    type: 'core' | 'subcore' | 'micro';

    // Expandable sub-components (recursive)
    children?: DeepSAFComponent[];

    // Editable parameters
    parameters?: SAFParameter[];

    // Calculated outputs
    outputs?: SAFOutput[];

    // Optional custom symbolic equations for this component.
    // These are forwarded to the Genesis simulation kernel and can reference
    // connection/state variables like "<flow_id>.P", "<flow_id>.T", "<flow_id>.m"
    // as well as global constants from the simulation request.
    equations?: string[];

    // Dependencies on other components
    dependencies: string[];

    // Metadata
    description?: string;
    icon?: string;
    color?: string;

    // Position for node graph
    position?: { x: number; y: number };
}

// ============================================
// FLOWS (Connections)
// ============================================

export type SAFFlowType = 'data' | 'energy' | 'material' | 'control' | 'signal';

export interface DeepSAFFlow {
    id: string;
    from: string;
    to: string;
    type: SAFFlowType;
    parameter?: string; // What flows (e.g., "steam_mass_flow")
    label?: string;
}

// ============================================
// CONSTRAINTS
// ============================================

export interface SAFConstraint {
    name: string;
    expression: string; // e.g., "total_efficiency <= 1.0"
    type: 'equality' | 'inequality' | 'range';
}

// ============================================
// HISTORY TRACKING
// ============================================

export interface SAFHistoryEntry {
    timestamp: string;
    changes: {
        componentId: string;
        parameter: string;
        oldValue: any;
        newValue: any;
    }[];
    effects: {
        componentId: string;
        output: string;
        oldValue: any;
        newValue: any;
    }[];
}

// ============================================
// MAIN BLUEPRINT
// ============================================

export interface DeepSAFSimulationSnapshot {
    timestamp: string;
    system_vars: Record<string, number>;
    logs: string[];
}

export interface SAFScenario {
    id: string;
    name: string;
    components: DeepSAFComponent[];
    flows: DeepSAFFlow[];
}

export interface SAFSweepPoint {
    value: number;
    system_vars: Record<string, number>;
}

export interface SAFSweepResult {
    parameterPath: string; // e.g. "boiler.Heat Input"
    min: number;
    max: number;
    steps: number;
    points: SAFSweepPoint[];
    timestamp: string;
}

export interface DeepSAFBlueprint {
    project_name: string;
    version: string;
    domain: 'mechanical' | 'governance' | 'ai_agents' | 'creative' | 'custom';

    components: DeepSAFComponent[];
    flows: DeepSAFFlow[];

    // Global constraints
    constraints?: SAFConstraint[];

    // Change history for undo/redo
    history?: SAFHistoryEntry[];

    // Last simulation snapshot from Genesis Engine
    last_simulation?: DeepSAFSimulationSnapshot;

    // Saved operating scenarios
    scenarios?: SAFScenario[];

    // Stored sweep runs
    sweeps?: SAFSweepResult[];

    // Metadata
    description?: string;
    created_at?: string;
    updated_at?: string;

    // Research documentation
    research_notes?: {
        methodology: string;
        assumptions: string;
        citations: string[];
        observations: string;
        nextSteps: string;
        tags: string[];
        timestamp: string;
        author?: string;
    };
}

// ============================================
// UI STATE
// ============================================

export interface SAFWorkbenchState {
    activeBlueprint: DeepSAFBlueprint | null;
    selectedNodeId: string | null;
    expandedNodes: string[]; // IDs of expanded nodes showing children
    breadcrumbs: string[]; // Trail for deep navigation
    isCalculating: boolean;
    lastEffects: SAFHistoryEntry | null;
}

// ============================================
// FLOW TYPE STYLING
// ============================================

export const FLOW_STYLES: Record<SAFFlowType, { color: string; strokeWidth: number; dashArray?: string }> = {
    energy: { color: '#ef4444', strokeWidth: 3 }, // Thick red
    control: { color: '#3b82f6', strokeWidth: 2, dashArray: '5,5' }, // Dashed blue
    data: { color: '#6b7280', strokeWidth: 1 }, // Thin gray
    material: { color: '#10b981', strokeWidth: 2 }, // Green
    signal: { color: '#f59e0b', strokeWidth: 2, dashArray: '2,2' }, // Dotted orange
};

// ============================================
// COMPONENT TYPE STYLING
// ============================================

export const COMPONENT_STYLES: Record<'core' | 'subcore' | 'micro', { borderColor: string; glow: string }> = {
    core: { borderColor: '#06b6d4', glow: 'rgba(6,182,212,0.5)' }, // Cyan
    subcore: { borderColor: '#a855f7', glow: 'rgba(168,85,247,0.3)' }, // Purple
    micro: { borderColor: '#10b981', glow: 'rgba(16,185,129,0.2)' }, // Emerald
};

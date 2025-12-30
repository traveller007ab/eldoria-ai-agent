
import { create } from 'zustand';
import { DeepSAFBlueprint, DeepSAFComponent, DeepSAFFlow } from '../components/saf/types';

// ============================================
// TYPES (The Contract)
// ============================================

export interface SAFValidationIssue {
    id: string;
    targetId: string; // The node/edge ID causing the issue
    type: 'error' | 'warning' | 'info';
    message: string;
}

export interface SAFState {
    // World State
    blueprint: DeepSAFBlueprint | null;
    selectedId: string | null;
    validationIssues: SAFValidationIssue[];

    // UI State
    isSimulationRunning: boolean;
    activePanel: 'properties' | 'data' | 'ai' | null;

    // Actions
    loadBlueprint: (bp: DeepSAFBlueprint) => void;
    closeBlueprint: () => void;
    addNode: (type: 'core' | 'subcore' | 'micro', position: { x: number; y: number }) => void;
    updateNodePosition: (id: string, position: { x: number; y: number }) => void;
    selectNode: (id: string | null) => void;

    // The "Physics Language Server" Logic
    connectNodes: (sourceId: string, targetId: string) => boolean; // Returns false if invalid
    runPhysicsValidation: () => void;
    updateParameter: (id: string, paramName: string, value: string | number) => void;
    runSimulation: () => Promise<void>;
}

// ============================================
// THE STORE
// ============================================

export const useSAFStore = create<SAFState>((set, get) => ({
    blueprint: null,
    selectedId: null,
    validationIssues: [],
    isSimulationRunning: false,
    activePanel: 'properties',

    loadBlueprint: (bp) => set({ blueprint: bp, validationIssues: [] }),
    closeBlueprint: () => set({ blueprint: null, validationIssues: [], selectedId: null, isSimulationRunning: false }),

    addNode: (type, position) => {
        set((state) => {
            if (!state.blueprint) return state;
            const newNode: DeepSAFComponent = {
                id: `comp_${Date.now()}`,
                name: `New ${type}`,
                type,
                position,
                parameters: [],
                outputs: [],
                dependencies: []
            };
            return {
                blueprint: {
                    ...state.blueprint,
                    components: [...state.blueprint.components, newNode]
                }
            };
        });
        get().runPhysicsValidation();
    },

    updateNodePosition: (id, position) => {
        set((state) => {
            if (!state.blueprint) return state;
            return {
                blueprint: {
                    ...state.blueprint,
                    components: state.blueprint.components.map(c =>
                        c.id === id ? { ...c, position } : c
                    )
                }
            };
        });
    },

    selectNode: (id) => set({ selectedId: id }),

    // PHYSICS "LANGUAGE SERVER"
    connectNodes: (sourceId, targetId) => {
        const state = get();
        if (!state.blueprint) return false;

        const source = state.blueprint.components.find(c => c.id === sourceId);
        const target = state.blueprint.components.find(c => c.id === targetId);

        if (!source || !target) return false;

        // RULE: Cannot connect component to itself
        if (sourceId === targetId) return false;

        // RULE: Domain Compatibility (Simplistic for now)
        // In 2.0, this would check port types (Fluid Port -> Electrical Port = ERROR)
        // For now, allow everything but log a warning if types mismatch roughly

        const newFlow: DeepSAFFlow = {
            id: `flow_${Date.now()}`,
            from: sourceId,
            to: targetId,
            type: 'energy', // Default
            label: 'Connection'
        };

        set({
            blueprint: {
                ...state.blueprint,
                flows: [...state.blueprint.flows, newFlow]
            }
        });

        get().runPhysicsValidation();
        return true;
    },

    runPhysicsValidation: () => {
        const state = get();
        if (!state.blueprint) return;

        const issues: SAFValidationIssue[] = [];

        // 1. Check for dangling nodes (Micro components must be connected)
        state.blueprint.components.forEach(c => {
            if (c.type === 'micro') {
                const isConnected = state.blueprint?.flows.some(f => f.from === c.id || f.to === c.id);
                if (!isConnected) {
                    issues.push({
                        id: `dangling_${c.id}`,
                        targetId: c.id,
                        type: 'warning',
                        message: `Micro-component '${c.name}' is not connected to anything.`
                    });
                }
            }
        });

        // 2. Check for Loops in Core Systems (Simple Graph Check)
        // (Skipped for brevity, but this is where loop detection goes)

        set({ validationIssues: issues });
    },
    updateParameter: (id: string, paramName: string, value: string | number) => {
        set(state => {
            if (!state.blueprint) return state;
            return {
                blueprint: {
                    ...state.blueprint,
                    components: state.blueprint.components.map(c => {
                        if (c.id !== id) return c;

                        // Check if param exists
                        const existingParam = c.parameters?.find(p => p.name === paramName);
                        let newParams = c.parameters || [];

                        if (existingParam) {
                            newParams = newParams.map(p =>
                                p.name === paramName ? { ...p, value } : p
                            );
                        } else {
                            // Add new param if editing dynamic props
                            newParams = [...newParams, { name: paramName, value, type: typeof value === 'number' ? 'number' : 'text' }];
                        }

                        return { ...c, parameters: newParams };
                    })
                }
            };
        });
        get().runPhysicsValidation();
    },

    runSimulation: async () => {
        const state = get();
        if (!state.blueprint || state.isSimulationRunning) return;

        set({ isSimulationRunning: true });

        try {
            // Mock Bridge Call (In 2.0 Vision this uses Pyodide, here we use Fetch just like 1.0)
            const payload = {
                project_name: state.blueprint.project_name,
                components: state.blueprint.components.map(c => ({
                    id: c.id,
                    type: c.type,
                    label: c.name,
                    parameters: c.parameters?.reduce((acc: any, p) => {
                        acc[p.name] = p.value;
                        return acc;
                    }, {}) || {},
                    equations: c.equations || []
                })),
                connections: state.blueprint.flows.map(f => ({
                    id: f.id,
                    source: f.from,
                    target: f.to,
                    type: f.type
                })),
                solver_config: { method: "hybr", tolerance: 1e-6 }
            };

            // Call Cloud/Local Bridge
            const response = await fetch('http://localhost:8000/genesis/simulate', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (result.success) {
                set(s => ({
                    isSimulationRunning: false,
                    blueprint: s.blueprint ? {
                        ...s.blueprint,
                        last_simulation: {
                            timestamp: new Date().toISOString(),
                            system_vars: result.system_vars || {},
                            logs: result.logs || []
                        }
                    } : null
                }));
            } else {
                set({ isSimulationRunning: false });
                console.error("Simulation Failed:", result.error);
            }
        } catch (error) {
            console.error("Simulation Error:", error);
            set({ isSimulationRunning: false });
        }
    }
}));

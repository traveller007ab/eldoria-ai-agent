
import { create } from 'zustand';
import { DeepSAFBlueprint, DeepSAFComponent, DeepSAFFlow, SAFParameter } from '../components/saf/types';
import { GenesisKernel } from '../components/saf/GenesisKernel';
import { useHistoryStore } from './useHistoryStore';

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
    activePanel: 'properties' | 'data' | 'ai' | null;

    // Actions
    loadBlueprint: (bp: DeepSAFBlueprint) => void;
    closeBlueprint: () => void;
    addNode: (type: 'core' | 'subcore' | 'micro', position: { x: number; y: number }) => void;
    addComponentFromPalette: (item: { id: string; name: string; category: string; defaultParams: SAFParameter[]; color?: string }, position: { x: number; y: number }) => void;
    updateNodePosition: (id: string, position: { x: number; y: number }) => void;
    selectNode: (id: string | null) => void;

    // The "Physics Language Server" Logic
    connectNodes: (sourceId: string, targetId: string) => boolean; // Returns false if invalid
    runPhysicsValidation: () => void;
    updateParameter: (id: string, paramName: string, value: string | number) => void;
    addParameter: (id: string, param: { name: string; value: string | number; unit?: string }) => void;
    runSimulation: () => void; // Sync/Debounced now

    // History Actions
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
}

// ============================================
// HELPER: Debounce Utility
// ============================================
let simulationTimeout: any = null;

// ============================================
// THE STORE
// ============================================

export const useSAFStore = create<SAFState>((set, get) => ({
    blueprint: null,
    selectedId: null,
    validationIssues: [],
    activePanel: 'properties',

    loadBlueprint: (bp) => {
        set({ blueprint: bp, validationIssues: [] });
        get().runPhysicsValidation();
        get().runSimulation();
    },
    closeBlueprint: () => set({ blueprint: null, validationIssues: [], selectedId: null }),

    addNode: (type, position) => {
        // Push to history before mutation
        const currentBp = get().blueprint;
        if (currentBp) {
            useHistoryStore.getState().pushState(currentBp, `Add ${type} node`);
        }

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
        get().runSimulation();
    },

    addComponentFromPalette: (item, position) => {
        // Push to history before mutation
        const currentBp = get().blueprint;
        if (currentBp) {
            useHistoryStore.getState().pushState(currentBp, `Add ${item.name}`);
        }

        // Map category to SAF type
        const typeMap: Record<string, 'core' | 'subcore' | 'micro'> = {
            source: 'core',
            transform: 'subcore',
            store: 'subcore',
            sink: 'micro',
        };
        const type = typeMap[item.category] || 'micro';

        set((state) => {
            if (!state.blueprint) return state;
            const newNode: DeepSAFComponent = {
                id: `${item.id}_${Date.now()}`,
                name: item.name,
                type,
                position,
                parameters: item.defaultParams || [],
                outputs: [],
                dependencies: [],
                color: item.color,
            };
            return {
                blueprint: {
                    ...state.blueprint,
                    components: [...state.blueprint.components, newNode]
                }
            };
        });
        get().runPhysicsValidation();
        get().runSimulation();
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

        // Push to history before mutation
        useHistoryStore.getState().pushState(state.blueprint, `Connect ${sourceId} → ${targetId}`);

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
        get().runSimulation();
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
        // Push to history before mutation
        const currentBp = get().blueprint;
        if (currentBp) {
            useHistoryStore.getState().pushState(currentBp, `Update ${paramName}`);
        }

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
                            newParams = [...newParams, { name: paramName, value }];
                        }

                        return { ...c, parameters: newParams };
                    })
                }
            };
        });
        get().runPhysicsValidation();
        get().runSimulation();
    },

    addParameter: (id, param) => {
        set(state => {
            if (!state.blueprint) return state;
            return {
                blueprint: {
                    ...state.blueprint,
                    components: state.blueprint.components.map(c =>
                        c.id === id
                            ? { ...c, parameters: [...(c.parameters || []), param] }
                            : c
                    )
                }
            };
        });
        get().runPhysicsValidation();
        get().runSimulation();
    },

    runSimulation: () => {
        // Debounce Logic
        if (simulationTimeout) clearTimeout(simulationTimeout);

        simulationTimeout = setTimeout(() => {
            const state = get();
            if (!state.blueprint) return;

            // INSTANT CLIENT-SIDE SOLVER (GenesisKernel)
            const result = GenesisKernel.solve(state.blueprint);
            console.log('[GenesisKernel] Solved:', result.logs, `in ${result.solveTimeMs.toFixed(2)}ms`);

            set(s => ({
                blueprint: s.blueprint ? {
                    ...s.blueprint,
                    last_simulation: {
                        timestamp: new Date().toISOString(),
                        system_vars: result.vars,
                        logs: result.logs
                    }
                } : null
            }));
        }, 50); // 50ms delay (approx 20fps cap)
    },

    // ============================================
    // UNDO/REDO ACTIONS
    // ============================================

    undo: () => {
        const historyStore = useHistoryStore.getState();
        const previousBlueprint = historyStore.undo();
        if (previousBlueprint) {
            set({ blueprint: previousBlueprint });
            get().runPhysicsValidation();
            get().runSimulation();
            console.log('[SAF] Undo applied');
        }
    },

    redo: () => {
        const historyStore = useHistoryStore.getState();
        const nextBlueprint = historyStore.redo();
        if (nextBlueprint) {
            set({ blueprint: nextBlueprint });
            get().runPhysicsValidation();
            get().runSimulation();
            console.log('[SAF] Redo applied');
        }
    },

    canUndo: () => useHistoryStore.getState().canUndo(),
    canRedo: () => useHistoryStore.getState().canRedo(),
}));

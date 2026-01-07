import { create } from 'zustand';
import {
    MechBlueprint,
    MechComponentInstance,
    MechConnection,
    MechanicalDomain,
    MechSimulationResult
} from '../types';
import { Node, Edge } from 'reactflow';

// History entry for undo/redo
interface HistoryEntry {
    blueprint: MechBlueprint;
    description: string;
}

interface MechLabState {
    // Project State
    currentBlueprint: MechBlueprint | null;
    blueprints: MechBlueprint[];
    lastSimulationResult: MechSimulationResult | null;
    isSimulating: boolean;

    // Playback State
    playbackTime: number;
    playbackSpeed: number;
    isPlaying: boolean;

    // History (Undo/Redo)
    history: HistoryEntry[];
    historyIndex: number;
    maxHistorySize: number;

    // UI State
    isPropertiesPanelOpen: boolean;
    activeDomain: MechanicalDomain;
    selectedComponentId: string | null;
    selectedConnectionId: string | null;
    clipboard: MechComponentInstance | null;

    // Actions
    setBlueprint: (blueprint: MechBlueprint) => void;
    addComponent: (component: MechComponentInstance) => void;
    removeComponent: (id: string) => void;
    updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
    updateComponentParameter: (componentId: string, paramId: string, value: number | string) => void;
    updateComponentName: (componentId: string, name: string) => void;
    duplicateComponent: (id: string) => void;
    addConnection: (connection: MechConnection) => void;
    removeConnection: (id: string) => void;
    setFluidId: (id: string) => void;

    // History
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    pushToHistory: (description: string) => void;

    // Clipboard
    copyComponent: (id: string) => void;
    pasteComponent: (position: { x: number; y: number }) => void;

    // Simulation
    setIsSimulating: (val: boolean) => void;

    setLastSimulationResult: (result: MechSimulationResult | null) => void;

    // Playback Actions
    setPlaybackTime: (time: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    setIsPlaying: (playing: boolean) => void;

    // Selection
    selectComponent: (id: string | null) => void;
    selectConnection: (id: string | null) => void;
    togglePropertiesPanel: () => void;
    setActiveDomain: (domain: MechanicalDomain) => void;

    // Bulk operations
    clearBlueprint: () => void;

    // Converters (for ReactFlow)
    getNodes: () => Node[];
    getEdges: () => Edge[];
}

const createEmptyBlueprint = (): MechBlueprint => ({
    id: crypto.randomUUID(),
    name: 'New Blueprint',
    description: '',
    domain: 'fluid',
    version: '1.0.0',
    components: [],
    connections: [],
    simulations: [],
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'User',
    tags: []
});

export const useMechStore = create<MechLabState>((set, get) => ({
    currentBlueprint: createEmptyBlueprint(),
    blueprints: [],
    lastSimulationResult: null,
    isSimulating: false,

    // Playback Defaults
    playbackTime: 0,
    playbackSpeed: 1,
    isPlaying: false,

    // History
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,

    isPropertiesPanelOpen: true,
    activeDomain: 'fluid',
    selectedComponentId: null,
    selectedConnectionId: null,
    clipboard: null,

    setBlueprint: (blueprint) => {
        set({ currentBlueprint: blueprint, history: [], historyIndex: -1 });
    },

    pushToHistory: (description) => {
        const { currentBlueprint, history, historyIndex, maxHistorySize } = get();
        if (!currentBlueprint) return;

        // Remove any redo history
        const newHistory = history.slice(0, historyIndex + 1);

        // Add current state
        newHistory.push({
            blueprint: JSON.parse(JSON.stringify(currentBlueprint)),
            description
        });

        // Limit history size
        if (newHistory.length > maxHistorySize) {
            newHistory.shift();
        }

        set({
            history: newHistory,
            historyIndex: newHistory.length - 1
        });
    },

    undo: () => {
        const { history, historyIndex, currentBlueprint } = get();
        if (historyIndex < 0 || !currentBlueprint) return;

        // If at latest, save current state first
        if (historyIndex === history.length - 1) {
            const newHistory = [...history, {
                blueprint: JSON.parse(JSON.stringify(currentBlueprint)),
                description: 'Current'
            }];
            set({ history: newHistory });
        }

        const newIndex = Math.max(0, historyIndex - 1);
        const entry = history[newIndex];

        if (entry) {
            set({
                currentBlueprint: JSON.parse(JSON.stringify(entry.blueprint)),
                historyIndex: newIndex
            });
        }
    },

    redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex >= history.length - 1) return;

        const newIndex = historyIndex + 1;
        const entry = history[newIndex];

        if (entry) {
            set({
                currentBlueprint: JSON.parse(JSON.stringify(entry.blueprint)),
                historyIndex: newIndex
            });
        }
    },

    canUndo: () => get().historyIndex >= 0,
    canRedo: () => get().historyIndex < get().history.length - 1,

    addComponent: (component) => set((state) => {
        if (!state.currentBlueprint) return state;

        // Push to history before change
        get().pushToHistory(`Add ${component.name}`);

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [...state.currentBlueprint.components, component],
                updatedAt: new Date()
            }
        };
    }),

    removeComponent: (id) => set((state) => {
        if (!state.currentBlueprint) return state;

        const comp = state.currentBlueprint.components.find(c => c.id === id);
        get().pushToHistory(`Delete ${comp?.name || 'component'}`);

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.filter(c => c.id !== id),
                connections: state.currentBlueprint.connections.filter(
                    c => c.sourceComponentId !== id && c.targetComponentId !== id
                ),
                updatedAt: new Date()
            },
            selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId
        };
    }),

    updateComponentPosition: (id, position) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.map(c =>
                    c.id === id ? { ...c, position } : c
                )
            }
        };
    }),

    updateComponentParameter: (componentId, paramId, value) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.map(c =>
                    c.id === componentId ? { ...c, parameterValues: { ...c.parameterValues, [paramId]: value } } : c
                ),
                updatedAt: new Date()
            }
        };
    }),

    updateComponentName: (componentId, name) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.map(c =>
                    c.id === componentId ? { ...c, name } : c
                ),
                updatedAt: new Date()
            }
        };
    }),

    duplicateComponent: (id) => set((state) => {
        if (!state.currentBlueprint) return state;

        const original = state.currentBlueprint.components.find(c => c.id === id);
        if (!original) return state;

        get().pushToHistory(`Duplicate ${original.name}`);

        const duplicate: MechComponentInstance = {
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            position: {
                x: original.position.x + 50,
                y: original.position.y + 50
            },
            isSelected: false
        };

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [...state.currentBlueprint.components, duplicate],
                updatedAt: new Date()
            },
            selectedComponentId: duplicate.id
        };
    }),

    copyComponent: (id) => set((state) => {
        const comp = state.currentBlueprint?.components.find(c => c.id === id);
        return { clipboard: comp ? { ...comp } : null };
    }),

    pasteComponent: (position) => set((state) => {
        if (!state.currentBlueprint || !state.clipboard) return state;

        get().pushToHistory(`Paste ${state.clipboard.name}`);

        const pasted: MechComponentInstance = {
            ...state.clipboard,
            id: crypto.randomUUID(),
            name: `${state.clipboard.name} (Pasted)`,
            position,
            isSelected: false
        };

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [...state.currentBlueprint.components, pasted],
                updatedAt: new Date()
            },
            selectedComponentId: pasted.id
        };
    }),

    addConnection: (connection) => set((state) => {
        if (!state.currentBlueprint) return state;

        get().pushToHistory('Add connection');

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                connections: [...state.currentBlueprint.connections, connection],
                updatedAt: new Date()
            }
        };
    }),

    removeConnection: (id) => set((state) => {
        if (!state.currentBlueprint) return state;

        get().pushToHistory('Delete connection');

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                connections: state.currentBlueprint.connections.filter(c => c.id !== id),
                updatedAt: new Date()
            },
            selectedConnectionId: state.selectedConnectionId === id ? null : state.selectedConnectionId
        };
    }),

    setFluidId: (id) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                fluidId: id,
                updatedAt: new Date()
            }
        };
    }),

    setIsSimulating: (val) => set({ isSimulating: val }),

    setLastSimulationResult: (result) => set({ lastSimulationResult: result, playbackTime: 0, isPlaying: false }),

    setPlaybackTime: (time) => set({ playbackTime: time }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    selectComponent: (id) => set({ selectedComponentId: id, selectedConnectionId: null, isPropertiesPanelOpen: !!id }),
    selectConnection: (id) => set({ selectedConnectionId: id, selectedComponentId: null }),
    togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
    setActiveDomain: (domain) => set({ activeDomain: domain }),

    clearBlueprint: () => set((state) => {
        if (!state.currentBlueprint) return state;

        get().pushToHistory('Clear blueprint');

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [],
                connections: [],
                updatedAt: new Date()
            },
            selectedComponentId: null,
            selectedConnectionId: null,
            lastSimulationResult: null
        };
    }),

    getNodes: () => {
        const blueprint = get().currentBlueprint;
        if (!blueprint) return [];
        return blueprint.components.map(c => ({
            id: c.id,
            position: c.position,
            data: {
                label: c.name,
                component: c
            },
            type: 'mechNode'
        }));
    },

    getEdges: () => {
        const blueprint = get().currentBlueprint;
        if (!blueprint) return [];
        return blueprint.connections.map(c => ({
            id: c.id,
            source: c.sourceComponentId,
            sourceHandle: c.sourcePortId,
            target: c.targetComponentId,
            targetHandle: c.targetPortId,
            type: 'smoothstep',
            animated: true
        }));
    }
}));

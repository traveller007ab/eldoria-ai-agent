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
    lastStaticResult: MechSimulationResult | null;
    isSimulating: boolean;
    simulationProgress: number; // 0 to 100

    // Playback State
    playbackTime: number;
    playbackSpeed: number;
    isPlaying: boolean;

    // History (Undo/Redo)
    history: HistoryEntry[];
    historyIndex: number;
    maxHistorySize: number;

    // Logs
    logs: Array<{ timestamp: Date; message: string; type: 'info' | 'error' | 'success' | 'warning' }>;
    addLog: (message: string, type?: 'info' | 'error' | 'success' | 'warning') => void;
    clearLogs: () => void;

    // UI State
    isPropertiesPanelOpen: boolean;
    isLeftPanelOpen: boolean;
    isBottomPanelOpen: boolean;
    activeDomain: MechanicalDomain;
    selectedComponentId: string | null;
    selectedComponentIds: string[];
    selectedConnectionId: string | null;
    clipboard: MechComponentInstance | null;

    // Navigation
    navigationStack: string[]; // Stack of blueprint IDs [Root, Child1, Child2]

    // Actions
    setBlueprint: (blueprint: MechBlueprint) => void;
    pushBlueprint: (blueprintId: string) => void;
    popBlueprint: () => void;
    convertToSubsystem: (componentId: string) => void;
    addComponent: (component: MechComponentInstance) => void;
    removeComponent: (id: string) => void;
    removeComponents: (ids: string[]) => void;
    updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
    updateComponentParameter: (componentId: string, paramId: string, value: number | string) => void;
    updateComponentEquations: (componentId: string, equations: string) => void;
    updateComponentName: (componentId: string, name: string) => void;
    duplicateComponent: (id: string) => void;
    duplicateComponents: (ids: string[]) => void;
    addConnection: (connection: MechConnection) => void;
    removeConnection: (id: string) => void;
    updateConnectionFluid: (connectionId: string, fluidId: string) => void;
    setFluidId: (id: string) => void;

    // History
    undo: () => void;
    redo: () => void;
    canUndo: () => boolean;
    canRedo: () => boolean;
    pushToHistory: (description: string) => void;

    // Clipboard
    copyComponent: (id: string) => void;
    copyComponents: (ids: string[]) => void;
    pasteComponent: (position: { x: number; y: number }) => void;

    // Simulation
    setIsSimulating: (val: boolean) => void;
    setSimulationProgress: (progress: number) => void;

    setLastSimulationResult: (result: MechSimulationResult | null) => void;
    setLastStaticResult: (result: MechSimulationResult | null) => void;

    // Playback Actions
    setPlaybackTime: (time: number) => void;
    setPlaybackSpeed: (speed: number) => void;
    setIsPlaying: (playing: boolean) => void;

    // Selection
    selectComponent: (id: string | null) => void;
    selectComponents: (ids: string[]) => void;
    addToSelection: (id: string) => void;
    removeFromSelection: (id: string) => void;
    clearSelection: () => void;
    selectConnection: (id: string | null) => void;
    togglePropertiesPanel: () => void;
    toggleLeftPanel: () => void;
    toggleBottomPanel: () => void;
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
    lastStaticResult: null,
    isSimulating: false,
    simulationProgress: 0,

    // Playback Defaults
    playbackTime: 0,
    playbackSpeed: 1,
    isPlaying: false,

    // History
    history: [],
    historyIndex: -1,
    maxHistorySize: 50,

    // Logs
    logs: [],
    addLog: (message, type = 'info') => set((state) => ({
        logs: [...state.logs, { timestamp: new Date(), message, type }].slice(-1000)
    })),
    clearLogs: () => set({ logs: [] }),

    // UI State
    isPropertiesPanelOpen: true, // Default open so users see panel with guidance
    isLeftPanelOpen: true,
    isBottomPanelOpen: true, // Default open for visibility
    activeDomain: 'mechanical',
    selectedComponentId: null,
    selectedComponentIds: [],
    selectedConnectionId: null,
    clipboard: null,

    // Navigation
    navigationStack: [],

    pushBlueprint: (blueprintId) => set((state) => {
        const { currentBlueprint, blueprints } = state;
        if (!currentBlueprint) return state;

        // 1. Save current blueprint to registry
        const updatedBlueprints = [...blueprints.filter(b => b.id !== currentBlueprint.id), currentBlueprint];

        // 2. Find target blueprint
        let targetBlueprint = updatedBlueprints.find(b => b.id === blueprintId);

        // If not found, create empty (should rarely happen if convertToSubsystem works right)
        if (!targetBlueprint) {
            targetBlueprint = {
                ...createEmptyBlueprint(),
                id: blueprintId,
                name: 'Subsystem',
            };
            updatedBlueprints.push(targetBlueprint);
        }

        return {
            blueprints: updatedBlueprints,
            navigationStack: [...state.navigationStack, currentBlueprint.id],
            currentBlueprint: targetBlueprint,
            history: [],
            historyIndex: -1,
            selectedComponentId: null,
            selectedComponentIds: []
        };
    }),

    popBlueprint: () => set((state) => {
        if (state.navigationStack.length === 0) return state;

        const { currentBlueprint, blueprints } = state;

        // 1. Save current child blueprint
        let updatedBlueprints = blueprints;
        if (currentBlueprint) {
            updatedBlueprints = [...blueprints.filter(b => b.id !== currentBlueprint.id), currentBlueprint];
        }

        // 2. Pop parent ID
        const newStack = [...state.navigationStack];
        const parentId = newStack.pop();

        // 3. Load parent
        const parentBlueprint = updatedBlueprints.find(b => b.id === parentId);
        if (!parentBlueprint) return state;

        return {
            blueprints: updatedBlueprints,
            navigationStack: newStack,
            currentBlueprint: parentBlueprint,
            history: [],
            historyIndex: -1,
            selectedComponentId: null,
            selectedComponentIds: []
        };
    }),

    convertToSubsystem: (componentId) => set((state) => {
        if (!state.currentBlueprint) return state;

        const newBlueprintId = crypto.randomUUID();
        const component = state.currentBlueprint.components.find(c => c.id === componentId);
        if (!component) return state;

        // Create the new blueprint immediately in registry
        const newBlueprint: MechBlueprint = {
            ...createEmptyBlueprint(),
            id: newBlueprintId,
            name: component.name,
            description: `Subsystem for ${component.name}`
        };

        return {
            blueprints: [...state.blueprints, newBlueprint],
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.map(c =>
                    c.id === componentId
                        ? { ...c, childBlueprintId: newBlueprintId }
                        : c
                ),
                updatedAt: new Date()
            }
        };
    }),

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
            selectedComponentId: state.selectedComponentId === id ? null : state.selectedComponentId,
            selectedComponentIds: state.selectedComponentIds.filter(sid => sid !== id)
        };
    }),

    removeComponents: (ids) => set((state) => {
        if (!state.currentBlueprint || ids.length === 0) return state;

        const comps = state.currentBlueprint.components.filter(c => ids.includes(c.id));
        get().pushToHistory(`Delete ${comps.length} components`);

        const idSet = new Set(ids);
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.filter(c => !idSet.has(c.id)),
                connections: state.currentBlueprint.connections.filter(
                    c => !idSet.has(c.sourceComponentId) && !idSet.has(c.targetComponentId)
                ),
                updatedAt: new Date()
            },
            selectedComponentId: idSet.has(state.selectedComponentId || '') ? null : state.selectedComponentId,
            selectedComponentIds: state.selectedComponentIds.filter(sid => !idSet.has(sid))
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

    updateComponentEquations: (componentId, equations) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.map(c =>
                    c.id === componentId ? { ...c, customEquations: equations } : c
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
            selectedComponentId: duplicate.id,
            selectedComponentIds: [duplicate.id]
        };
    }),

    duplicateComponents: (ids) => set((state) => {
        if (!state.currentBlueprint) return state;

        const originals = state.currentBlueprint.components.filter(c => ids.includes(c.id));
        if (originals.length === 0) return state;

        get().pushToHistory(`Duplicate ${originals.length} components`);

        const duplicates = originals.map((original, index) => ({
            ...original,
            id: crypto.randomUUID(),
            name: `${original.name} (Copy)`,
            position: {
                x: original.position.x + 50 + (index * 30),
                y: original.position.y + 50 + (index * 30)
            },
            isSelected: false
        }));

        const newSelectedIds = duplicates.map(d => d.id);

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [...state.currentBlueprint.components, ...duplicates],
                updatedAt: new Date()
            },
            selectedComponentId: duplicates[0]?.id || null,
            selectedComponentIds: newSelectedIds
        };
    }),

    copyComponent: (id) => set((state) => {
        const comp = state.currentBlueprint?.components.find(c => c.id === id);
        return { clipboard: comp ? { ...comp } : null };
    }),

    copyComponents: (ids) => set((state) => {
        const comps = state.currentBlueprint?.components.filter(c => ids.includes(c.id));
        if (comps && comps.length > 0) {
            return { clipboard: comps[0] };
        }
        return {};
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
            selectedComponentId: pasted.id,
            selectedComponentIds: [pasted.id]
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

    updateConnectionFluid: (connectionId, fluidId) => set((state) => {
        if (!state.currentBlueprint) return state;

        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                connections: state.currentBlueprint.connections.map(c =>
                    c.id === connectionId ? { ...c, fluidId } : c
                ),
                updatedAt: new Date()
            }
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
    setSimulationProgress: (progress) => set({ simulationProgress: progress }),

    setLastSimulationResult: (result) => set((state) => {
        // Track static results separately for comparison
        const isDynamic = (result as any)?.isDynamic;
        return {
            lastSimulationResult: result,
            lastStaticResult: isDynamic ? state.lastStaticResult : result,
            playbackTime: 0,
            isPlaying: false
        };
    }),

    setLastStaticResult: (result) => set({ lastStaticResult: result }),

    setPlaybackTime: (time) => set({ playbackTime: time }),
    setPlaybackSpeed: (speed) => set({ playbackSpeed: speed }),
    setIsPlaying: (playing) => set({ isPlaying: playing }),

    selectComponent: (id) => set({ selectedComponentId: id, selectedConnectionId: null, isPropertiesPanelOpen: !!id, selectedComponentIds: id ? [id] : [] }),
    selectComponents: (ids) => set({ selectedComponentIds: ids, selectedComponentId: ids.length === 1 ? ids[0] : null, selectedConnectionId: null, isPropertiesPanelOpen: ids.length === 1 }),
    addToSelection: (id) => set((state) => {
        if (state.selectedComponentIds.includes(id)) return state;
        return {
            selectedComponentIds: [...state.selectedComponentIds, id],
            selectedComponentId: id,
            isPropertiesPanelOpen: true
        };
    }),
    removeFromSelection: (id) => set((state) => {
        const newIds = state.selectedComponentIds.filter(sid => sid !== id);
        return {
            selectedComponentIds: newIds,
            selectedComponentId: newIds.length === 1 ? newIds[0] : null,
            isPropertiesPanelOpen: newIds.length === 1
        };
    }),
    clearSelection: () => set({ selectedComponentIds: [], selectedComponentId: null, selectedConnectionId: null, isPropertiesPanelOpen: false }),
    selectConnection: (id) => set({ selectedConnectionId: id, selectedComponentId: null, selectedComponentIds: [], isPropertiesPanelOpen: false }),
    togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
    toggleLeftPanel: () => set((state) => ({ isLeftPanelOpen: !state.isLeftPanelOpen })),
    toggleBottomPanel: () => set((state) => ({ isBottomPanelOpen: !state.isBottomPanelOpen })),
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
            selectedComponentIds: [],
            selectedConnectionId: null,
            lastSimulationResult: null
        };
    }),

    getNodes: () => {
        const { currentBlueprint, lastSimulationResult } = get();
        if (!currentBlueprint) return [];
        return currentBlueprint.components.map(c => {
            const issue = lastSimulationResult?.issues?.find(i => i.componentId === c.id);
            return {
                id: c.id,
                position: c.position,
                data: {
                    label: c.name,
                    component: c,
                    issueSeverity: issue?.severity,
                    issueMessage: issue?.message
                },
                type: 'mechNode'
            };
        });
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

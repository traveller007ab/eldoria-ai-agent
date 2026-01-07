import { create } from 'zustand';
import {
    Blueprint,
    ComponentInstance,
    Connection,
    MechanicalDomain
} from '../types/mech-saf-2.0';
import { Node, Edge, Connection as ReactFlowConnection } from 'reactflow';

interface MechLabState {
    // Project State
    currentBlueprint: Blueprint | null;
    blueprints: Blueprint[];

    // UI State
    isPropertiesPanelOpen: boolean;
    activeDomain: MechanicalDomain;
    selectedComponentId: string | null;

    // Actions
    setBlueprint: (blueprint: Blueprint) => void;
    addComponent: (component: ComponentInstance) => void;
    removeComponent: (id: string) => void;
    updateComponentPosition: (id: string, position: { x: number; y: number }) => void;
    addConnection: (connection: Connection) => void;
    removeConnection: (id: string) => void;

    // Selection
    selectComponent: (id: string | null) => void;
    togglePropertiesPanel: () => void;
    setActiveDomain: (domain: MechanicalDomain) => void;

    // Converters (for ReactFlow)
    getNodes: () => Node[];
    getEdges: () => Edge[];
}

export const useMechStore = create<MechLabState>((set, get) => ({
    currentBlueprint: null,
    blueprints: [],

    isPropertiesPanelOpen: true,
    activeDomain: 'fluid',
    selectedComponentId: null,

    setBlueprint: (blueprint) => set({ currentBlueprint: blueprint }),

    addComponent: (component) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: [...state.currentBlueprint.components, component]
            }
        };
    }),

    removeComponent: (id) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                components: state.currentBlueprint.components.filter(c => c.id !== id),
                connections: state.currentBlueprint.connections.filter(
                    c => c.sourceComponentId !== id && c.targetComponentId !== id
                )
            }
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

    addConnection: (connection) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                connections: [...state.currentBlueprint.connections, connection]
            }
        };
    }),

    removeConnection: (id) => set((state) => {
        if (!state.currentBlueprint) return state;
        return {
            currentBlueprint: {
                ...state.currentBlueprint,
                connections: state.currentBlueprint.connections.filter(c => c.id !== id)
            }
        };
    }),

    selectComponent: (id) => set({ selectedComponentId: id, isPropertiesPanelOpen: !!id }),
    togglePropertiesPanel: () => set((state) => ({ isPropertiesPanelOpen: !state.isPropertiesPanelOpen })),
    setActiveDomain: (domain) => set({ activeDomain: domain }),

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
            type: 'mechNode' // Custom node type we will create later
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
            animated: true // maybe based on flow status
        }));
    }
}));

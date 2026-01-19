/**
 * Nexus Store - State Management for the Research Nexus
 * 
 * Manages:
 * - Independent Projects (Graph nodes, edges, viewports)
 * - View mode (canvas vs focus rooms)
 * - Active project selection
 * - Top-level active project data for performance and reactivity
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    Node, Edge, Viewport,
    applyNodeChanges, applyEdgeChanges,
    NodeChange, EdgeChange, Connection
} from 'reactflow';

// Node data types for each custom node
export interface BlueprintNodeData {
    type: 'blueprint';
    blueprintId: string;
    name: string;
    status: 'idle' | 'running' | 'completed' | 'failed';
    lastRunTime?: number;
}

export interface ReferenceNodeData {
    type: 'reference';
    title: string;
    source: string; // URL or file path
    abstract?: string;
    authors?: string[];
}

export interface NoteNodeData {
    type: 'note';
    title: string;
    content: string; // Markdown content
    color?: 'cyan' | 'emerald' | 'amber' | 'purple';
    lastModified?: number;
}

export interface CodexNodeData {
    type: 'codex';
    filename: string;
    language: 'python' | 'typescript' | 'javascript';
    filePath: string;
    codeContent?: string;
    isDirty?: boolean;
    lastModified?: number;
}

export type NexusNodeData = BlueprintNodeData | ReferenceNodeData | NoteNodeData | CodexNodeData;

export type NexusNode = Node<NexusNodeData>;
export type NexusEdge = Edge<{ label?: string; strength?: number }>;

export type ViewMode = 'canvas' | 'reading_room' | 'engine_room' | 'writing_study' | 'codex_lab';

export interface Project {
    id: string;
    name: string;
    nodes: NexusNode[];
    edges: NexusEdge[];
    viewport: Viewport;
    lastModified: number;
}

interface NexusState {
    // Project Management
    projects: Record<string, Project>;
    activeProjectId: string;

    // View State (Ephemeral/Global)
    viewMode: ViewMode;
    focusedNodeId: string | null;
    isZenMode: boolean;
    selectedNodeIds: string[];

    // Active Project Data (Directly reactive)
    nodes: NexusNode[];
    edges: NexusEdge[];
    viewport: Viewport;

    // Actions - Project
    createProject: (name: string) => void;
    switchProject: (id: string) => void;
    renameProject: (id: string, name: string) => void;
    deleteProject: (id: string) => void;
    importProject: (project: Project) => void;
    syncCurrentToProject: () => void;

    // Actions - Graph
    addNode: (node: NexusNode) => void;
    updateNode: (id: string, data: Partial<NexusNodeData>) => void;
    removeNode: (id: string) => void;
    setNodes: (nodes: NexusNode[]) => void;

    addEdge: (edge: NexusEdge) => void;
    removeEdge: (id: string) => void;
    setEdges: (edges: NexusEdge[]) => void;

    // Actions - View
    setViewMode: (mode: ViewMode) => void;
    focusNode: (nodeId: string | null) => void;
    enterRoom: (nodeId: string, roomType: ViewMode) => void;
    exitRoom: () => void;
    toggleZenMode: () => void;

    // Actions - Viewport
    setViewport: (viewport: Viewport) => void;

    // Actions - Selection
    selectNodes: (ids: string[]) => void;
    clearSelection: () => void;

    // React Flow Integration
    onNodesChange: (changes: NodeChange[]) => void;
    onEdgesChange: (changes: EdgeChange[]) => void;
    onConnect: (connection: Connection) => void;

    // Utilities
    getNodeById: (id: string) => NexusNode | undefined;
}

const DEFAULT_PROJECT_ID = 'default-research-nexus';

const createDefaultProject = (id: string = DEFAULT_PROJECT_ID): Project => ({
    id,
    name: 'Untitled Research',
    nodes: [],
    edges: [],
    viewport: { x: 0, y: 0, zoom: 1 },
    lastModified: Date.now()
});

export const useNexusStore = create<NexusState>()(
    persist(
        (set, get) => ({
            // State
            projects: { [DEFAULT_PROJECT_ID]: createDefaultProject() },
            activeProjectId: DEFAULT_PROJECT_ID,
            viewMode: 'canvas',
            focusedNodeId: null,
            isZenMode: false,
            selectedNodeIds: [],

            // Top-level mirrors of active project for reactivity
            nodes: [],
            edges: [],
            viewport: { x: 0, y: 0, zoom: 1 },

            // Sync Helper (Saves top-level nodes/edges back to the projects dictionary)
            syncCurrentToProject: () => {
                const { activeProjectId, nodes, edges, viewport, projects } = get();
                if (!projects[activeProjectId]) return;

                set((state) => ({
                    projects: {
                        ...state.projects,
                        [activeProjectId]: {
                            ...state.projects[activeProjectId],
                            nodes,
                            edges,
                            viewport,
                            lastModified: Date.now()
                        }
                    }
                }));
            },

            // Project Actions
            createProject: (name) => {
                const id = crypto.randomUUID();
                const newProject = { ...createDefaultProject(id), name, lastModified: Date.now() };

                set((state) => ({
                    projects: { ...state.projects, [id]: newProject },
                    activeProjectId: id,
                    nodes: [],
                    edges: [],
                    viewport: { x: 0, y: 0, zoom: 1 },
                    viewMode: 'canvas',
                    focusedNodeId: null
                }));
            },

            switchProject: (id) => {
                const project = get().projects[id];
                if (project) {
                    set({
                        activeProjectId: id,
                        nodes: project.nodes,
                        edges: project.edges,
                        viewport: project.viewport,
                        viewMode: 'canvas',
                        focusedNodeId: null
                    });
                }
            },

            renameProject: (id, name) => set((state) => ({
                projects: {
                    ...state.projects,
                    [id]: { ...state.projects[id], name, lastModified: Date.now() }
                }
            })),

            deleteProject: (id) => set((state) => {
                const newProjects = { ...state.projects };
                delete newProjects[id];
                const projectIds = Object.keys(newProjects);

                if (projectIds.length === 0) {
                    const defaultProj = createDefaultProject();
                    return {
                        projects: { [DEFAULT_PROJECT_ID]: defaultProj },
                        activeProjectId: DEFAULT_PROJECT_ID,
                        nodes: [],
                        edges: [],
                        viewport: { x: 0, y: 0, zoom: 1 }
                    };
                }

                const nextId = projectIds[0];
                const nextProj = newProjects[nextId];
                return {
                    projects: newProjects,
                    activeProjectId: nextId,
                    nodes: nextProj.nodes,
                    edges: nextProj.edges,
                    viewport: nextProj.viewport
                };
            }),

            importProject: (project) => set((state) => ({
                projects: { ...state.projects, [project.id]: project },
                activeProjectId: project.id,
                nodes: project.nodes,
                edges: project.edges,
                viewport: project.viewport
            })),

            // Graph Actions
            addNode: (node) => {
                set((state) => ({
                    nodes: [...state.nodes, node]
                }));
                get().syncCurrentToProject();
            },

            updateNode: (id, data) => {
                set((state) => ({
                    nodes: state.nodes.map((n) =>
                        n.id === id ? { ...n, data: { ...n.data, ...data } as NexusNodeData } : n
                    )
                }));
                get().syncCurrentToProject();
            },

            removeNode: (id) => {
                set((state) => ({
                    nodes: state.nodes.filter((n) => n.id !== id),
                    edges: state.edges.filter((e) => e.source !== id && e.target !== id)
                }));
                get().syncCurrentToProject();
            },

            setNodes: (nodes) => {
                set({ nodes });
                get().syncCurrentToProject();
            },

            addEdge: (edge) => {
                set((state) => ({ edges: [...state.edges, edge] }));
                get().syncCurrentToProject();
            },

            removeEdge: (id) => {
                set((state) => ({
                    edges: state.edges.filter((e) => e.id !== id)
                }));
                get().syncCurrentToProject();
            },

            setEdges: (edges) => {
                set({ edges });
                get().syncCurrentToProject();
            },

            // View Actions
            setViewMode: (mode) => set({ viewMode: mode }),
            focusNode: (nodeId) => set({ focusedNodeId: nodeId }),
            enterRoom: (nodeId, roomType) => set({ viewMode: roomType, focusedNodeId: nodeId }),
            exitRoom: () => set({ viewMode: 'canvas', focusedNodeId: null, isZenMode: false }),
            toggleZenMode: () => set((state) => ({ isZenMode: !state.isZenMode })),

            // Viewport Actions
            setViewport: (viewport) => {
                set({ viewport });
                // We sync viewport but with a slight debounce or just directly for now
                // debounce might be better but let's keep it simple first
                const activeId = get().activeProjectId;
                set((state) => ({
                    projects: {
                        ...state.projects,
                        [activeId]: { ...state.projects[activeId], viewport }
                    }
                }));
            },

            // Selection Actions
            selectNodes: (ids) => set({ selectedNodeIds: ids }),
            clearSelection: () => set({ selectedNodeIds: [] }),

            // React Flow Integration
            onNodesChange: (changes) => {
                set((state) => ({
                    nodes: applyNodeChanges(changes, state.nodes) as NexusNode[]
                }));
                get().syncCurrentToProject();
            },

            onEdgesChange: (changes) => {
                set((state) => ({
                    edges: applyEdgeChanges(changes, state.edges) as NexusEdge[]
                }));
                get().syncCurrentToProject();
            },

            onConnect: (connection) => {
                const newEdge = {
                    ...connection,
                    id: `edge-${connection.source}-${connection.target}`,
                    type: 'neural',
                    animated: true,
                    style: { stroke: '#22d3ee', strokeWidth: 2 },
                } as NexusEdge;
                get().addEdge(newEdge);
            },

            // Utilities
            getNodeById: (id) => get().nodes.find((n) => n.id === id),
        }),
        {
            name: 'eldoria-nexus-store-v2', // Increment name to clear old broken state
            partialize: (state) => ({
                projects: state.projects,
                activeProjectId: state.activeProjectId,
                nodes: state.nodes,
                edges: state.edges,
                viewport: state.viewport
            }),
        }
    )
);

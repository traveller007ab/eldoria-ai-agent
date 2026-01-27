/**
 * MindCanvas - The Infinite Workspace
 * 
 * Powered by React Flow, this component provides:
 * - Infinite pan/zoom canvas
 * - Custom node rendering
 * - Edge connections (Neural Links)
 * - Drag-and-drop support
 */

import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    MiniMap,
    addEdge,
    Connection,
    Edge,
    NodeTypes,
    EdgeTypes,
    BackgroundVariant,
    Panel,
    useReactFlow,
} from 'reactflow';
import {
    Plus, ZoomIn, ZoomOut, RotateCcw,
    Cog, BookOpen, Layers, FileCode, FolderKanban, Globe
} from 'lucide-react';
import 'reactflow/dist/style.css';

import { useNexusStore, NexusNode, NexusEdge } from '../../stores/useNexusStore';
import { BlueprintNode } from './nodes/BlueprintNode';
import { ReferenceNode } from './nodes/ReferenceNode';
import { NoteNode } from './nodes/NoteNode';
import { CodexNode } from './nodes/CodexNode';
import { ArchitectNode } from './nodes/ArchitectNode';
import { NeuralEdge } from './edges/NeuralEdge';
import { CanvasToolbar } from './toolbar/CanvasToolbar';
import { NexusBackground } from './NexusBackground';
import { NodeContextMenu } from './NodeContextMenu';
import { Observatory } from './rooms/Observatory';

// Register custom node types
const nodeTypes: NodeTypes = {
    blueprintNode: BlueprintNode,
    referenceNode: ReferenceNode,
    noteNode: NoteNode,
    codexNode: CodexNode,
    architectNode: ArchitectNode,
    observatoryNode: Observatory, // Phase 8: The Observatory
};

// Register custom edge types
const edgeTypes: EdgeTypes = {
    neural: NeuralEdge,
};

// Default edge options for new connections
const defaultEdgeOptions = {
    type: 'neural',
    animated: true,
    style: { stroke: '#22d3ee', strokeWidth: 2 },
};

export const MindCanvas: React.FC = () => {
    const {
        nodes,
        edges,
        onNodesChange,
        onEdgesChange,
        onConnect,
        viewport,
        setViewport,
        enterRoom,
    } = useNexusStore();

    // Context menu state
    const [contextMenu, setContextMenu] = React.useState<{
        node: any;
        position: { x: number; y: number };
    } | null>(null);

    // Handle viewport changes
    const onMoveEnd = useCallback(
        (event: any, vp: any) => {
            setViewport(vp);
        },
        [setViewport]
    );

    const onNodeDoubleClick = useCallback(
        (event: React.MouseEvent, node: any) => {
            const nodeType = node.data?.type || node.type?.replace('Node', '');

            switch (nodeType) {
                case 'blueprint':
                    enterRoom(node.id, 'engine_room');
                    break;
                case 'reference':
                    enterRoom(node.id, 'reading_room');
                    break;
                case 'note':
                    enterRoom(node.id, 'writing_study');
                    break;
                case 'codex':
                    enterRoom(node.id, 'codex_lab');
                    break;
                // Observatory is inline, no room to enter yet, or maybe it IS the room?
                // For now, it renders ON the canvas as a node.
            }
        },
        [enterRoom]
    );

    // Handle right-click context menu
    const onNodeContextMenu = useCallback(
        (event: React.MouseEvent, node: any) => {
            event.preventDefault();
            setContextMenu({
                node,
                position: { x: event.clientX, y: event.clientY }
            });
        },
        []
    );

    // Handle drag over for file drops
    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'copy';
    }, []);

    // Handle file/asset drops
    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const reactFlowBounds = event.currentTarget.getBoundingClientRect();
            const position = {
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            };

            // Check for internal workspace items
            const dataStr = event.dataTransfer.getData('application/reactflow');
            if (dataStr) {
                try {
                    const data = JSON.parse(dataStr);
                    const { addNode } = useNexusStore.getState();

                    if (data.type === 'canvas-import') {
                        addNode({
                            id: crypto.randomUUID(),
                            type: 'blueprintNode',
                            position: { x: position.x - 100, y: position.y - 75 },
                            data: {
                                type: 'blueprint',
                                name: data.name,
                                blueprintId: data.id,
                                status: 'idle'
                            } as any
                        });
                        return;
                    }
                } catch (e) {
                    console.error('Failed to parse drag data', e);
                }
            }

            // Check for external files
            if (event.dataTransfer.files.length > 0) {
                const file = event.dataTransfer.files[0];
                const { addNode } = useNexusStore.getState();

                if (file.type === 'application/pdf' || file.name.endsWith('.pdf')) {
                    addNode({
                        id: crypto.randomUUID(),
                        type: 'referenceNode',
                        position,
                        data: {
                            type: 'reference',
                            title: file.name.replace('.pdf', ''),
                            source: URL.createObjectURL(file),
                        },
                    });
                } else if (file.name.endsWith('.json')) {
                    // Could be a blueprint
                    addNode({
                        id: crypto.randomUUID(),
                        type: 'blueprintNode',
                        position,
                        data: {
                            type: 'blueprint',
                            blueprintId: crypto.randomUUID(),
                            name: file.name.replace('.json', ''),
                            status: 'idle',
                        },
                    });
                }
            }
        },
        []
    );

    // Handle selection change
    const onSelectionChange = useCallback(({ nodes }: { nodes: any[] }) => {
        useNexusStore.getState().selectNodes(nodes.map((n) => n.id));
    }, []);

    // Global Delete Key Listener (Backup for React Flow's internal handling)
    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (['Delete', 'Backspace'].includes(e.key)) {
                // Ignore if user is typing in an input
                if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName) || (e.target as HTMLElement).isContentEditable) {
                    return;
                }

                // Delete selected nodes
                const { nodes, removeNode } = useNexusStore.getState();
                const selectedIds = nodes.filter((n) => n.selected).map((n) => n.id);

                if (selectedIds.length > 0) {
                    selectedIds.forEach((id) => removeNode(id));
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <div className="w-full h-full relative">
            <NexusBackground />
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onMoveEnd={onMoveEnd}
                onNodeDoubleClick={onNodeDoubleClick}
                onNodeContextMenu={onNodeContextMenu}
                onSelectionChange={onSelectionChange} // Sync selection
                onNodesDelete={(nodesToDelete) => {
                    nodesToDelete.forEach(node => useNexusStore.getState().removeNode(node.id));
                }}
                deleteKeyCode={['Backspace', 'Delete']}
                onDragOver={onDragOver}
                onDrop={onDrop}
                nodeTypes={nodeTypes}
                edgeTypes={edgeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                defaultViewport={viewport}
                fitView
                snapToGrid
                snapGrid={[20, 20]}
                minZoom={0.1}
                maxZoom={4}
                proOptions={{ hideAttribution: true }}
                className="bg-transparent"
            >
                {/* Grid Background */}
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={40}
                    size={1}
                    color="rgba(34, 211, 238, 0.1)"
                />

                {/* Mini Map - Moved to Bottom Left to and consolidated position */}
                <MiniMap
                    nodeColor={(node) => {
                        switch (node.data?.type) {
                            case 'blueprint': return '#10b981';
                            case 'reference': return '#22d3ee';
                            case 'note': return '#f59e0b';
                            case 'observatory': return '#8b5cf6'; // Phase 8 Color
                            default: return '#64748b';
                        }
                    }}
                    maskColor="rgba(15, 23, 42, 0.8)"
                    className="!bg-slate-900/80 !border-slate-700 !rounded-xl"
                    style={{
                        height: 100,
                        width: 150,
                        bottom: 24,
                        left: 24
                    }}
                    position="bottom-left"
                />

                {/* Empty State */}
                {nodes.length === 0 && (
                    <Panel position="top-center" className="mt-32">
                        <div className="text-center p-8 bg-slate-800/50 backdrop-blur-md border border-slate-700 rounded-2xl max-w-md">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 flex items-center justify-center">
                                <svg className="w-8 h-8 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" />
                                </svg>
                            </div>
                            <h3 className="text-lg font-bold text-white mb-2">Your Research Canvas</h3>
                            <p className="text-sm text-slate-400 mb-4">
                                Use the + button to add blueprints, papers, and notes.
                                Connect them to build your knowledge graph.
                            </p>
                            <p className="text-xs text-slate-500">
                                Double-click any node to enter Focus Mode
                            </p>
                        </div>
                    </Panel>
                )}

                {/* Controls Overlay Panels */}
                <Panel position="bottom-right" className="mb-4 mr-4">
                    <AddNodeFAB />
                </Panel>
            </ReactFlow>

            {/* Toolbar */}
            <CanvasToolbar />

            {/* Context Menu */}
            <NodeContextMenu
                node={contextMenu?.node || null}
                position={contextMenu?.position || null}
                onClose={() => setContextMenu(null)}
            />
        </div>
    );
};

// UI Overlay Components
const AddNodeFAB: React.FC = () => {
    const [isOpen, setIsOpen] = React.useState(false);
    const { addNode } = useNexusStore();
    const menuRef = React.useRef<HTMLDivElement>(null);

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleAddNode = (type: 'blueprint' | 'reference' | 'note' | 'codex' | 'architect' | 'observatory') => {
        const id = crypto.randomUUID();
        const position = { x: 300 + Math.random() * 100, y: 300 + Math.random() * 100 };
        const baseNode = { id, position, type: `${type}Node` };

        switch (type) {
            case 'blueprint':
                addNode({ ...baseNode, data: { type: 'blueprint', blueprintId: '', name: 'New Blueprint', status: 'idle' } });
                break;
            case 'reference':
                addNode({ ...baseNode, data: { type: 'reference', title: 'New Reference', source: '' } });
                break;
            case 'note':
                addNode({ ...baseNode, data: { type: 'note', title: 'New Note', content: '# Notes\n\nStart writing...', color: 'cyan' } });
                break;
            case 'codex':
                addNode({ ...baseNode, data: { type: 'codex', filename: 'script.py', language: 'python', filePath: '' } });
                break;
            case 'architect':
                addNode({ ...baseNode, data: { type: 'architect', title: 'New Workspace', status: 'draft' } });
                break;
            case 'observatory': // Phase 8
                addNode({ ...baseNode, data: { type: 'observatory', title: 'Observatory', url: 'https://google.com' } as any });
                break;
        }
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={menuRef}>
            {isOpen && (
                <div className="absolute bottom-16 right-0 bg-slate-900/95 backdrop-blur-md border border-white/10 rounded-xl p-1.5 shadow-2xl min-w-[200px] animate-in fade-in slide-in-from-bottom-4 duration-200">
                    <button onClick={() => handleAddNode('architect')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <FolderKanban className="w-4 h-4 text-slate-400" /> Architect Node
                    </button>
                    <button onClick={() => handleAddNode('observatory')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-200 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Globe className="w-4 h-4 text-violet-400" /> Observatory Node
                    </button>
                    <div className="h-px bg-white/5 my-1" />
                    <button onClick={() => handleAddNode('blueprint')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Cog className="w-4 h-4 text-emerald-400" /> Blueprint Node
                    </button>
                    <button onClick={() => handleAddNode('reference')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <BookOpen className="w-4 h-4 text-cyan-400" /> Reference Node
                    </button>
                    <button onClick={() => handleAddNode('note')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Layers className="w-4 h-4 text-amber-400" /> Note Node
                    </button>
                    <button onClick={() => handleAddNode('codex')} className="w-full flex items-center gap-3 px-4 py-2.5 text-left text-sm text-slate-300 hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <FileCode className="w-4 h-4 text-blue-400" /> Codex Node
                    </button>
                </div>
            )}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 ${isOpen
                    ? 'bg-slate-700 rotate-45'
                    : 'bg-slate-800 hover:bg-slate-700 border border-white/10 hover:border-white/20'
                    }`}
            >
                <Plus className={`w-5 h-5 ${isOpen ? 'text-slate-300' : 'text-slate-400'}`} />
            </button>
        </div>
    );
};

const ZoomControls: React.FC = () => {
    return null; // Consolidated into CanvasToolbar
};

export default MindCanvas;

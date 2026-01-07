import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Connection,
    Edge,
    addEdge,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Node,
    ReactFlowInstance,
    MiniMap,
    useReactFlow
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useMechStore } from '../../stores/useMechStore';
import { MechComponentDefinition, MechComponentInstance, MechConnection } from '../../types';
import { MechNode } from './MechNode';
import { ComponentRegistry } from '../../services/ComponentRegistry';
import { Toolbar } from './Toolbar';
import { AnimatedConnection } from './AnimatedConnection';

const nodeTypes = { mechNode: MechNode };
const edgeTypes = { animated: AnimatedConnection };

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const CanvasContent: React.FC = () => {
    const {
        addComponent,
        addConnection,
        selectComponent,
        currentBlueprint,
        undo,
        redo,
        copyComponent,
        pasteComponent,
        duplicateComponent,
        removeComponent,
        selectedComponentId,
        clipboard
    } = useMechStore();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes from store when blueprint changes
    useEffect(() => {
        if (currentBlueprint) {
            setNodes(currentBlueprint.components.map(c => ({
                id: c.id,
                type: 'mechNode',
                position: c.position,
                data: { label: c.name, component: c }
            })));

            setEdges(currentBlueprint.connections.map(c => ({
                id: c.id,
                source: c.sourceComponentId,
                sourceHandle: c.sourcePortId,
                target: c.targetComponentId,
                targetHandle: c.targetPortId,
                type: 'animated',
                animated: true,
                style: { stroke: '#64748b', strokeWidth: 2 }
            })));
        }
    }, [currentBlueprint?.components.length, currentBlueprint?.connections.length]);

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            const target = event.target as HTMLElement;
            if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;

            // Undo: Ctrl+Z
            if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
                event.preventDefault();
                undo();
            }

            // Redo: Ctrl+Y or Ctrl+Shift+Z
            if ((event.ctrlKey || event.metaKey) && (event.key === 'y' || (event.key === 'z' && event.shiftKey))) {
                event.preventDefault();
                redo();
            }

            // Copy: Ctrl+C
            if ((event.ctrlKey || event.metaKey) && event.key === 'c') {
                if (selectedComponentId) {
                    event.preventDefault();
                    copyComponent(selectedComponentId);
                }
            }

            // Paste: Ctrl+V  
            if ((event.ctrlKey || event.metaKey) && event.key === 'v') {
                if (clipboard && reactFlowInstance) {
                    event.preventDefault();
                    const center = reactFlowInstance.project({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
                    pasteComponent(center);
                }
            }

            // Duplicate: Ctrl+D
            if ((event.ctrlKey || event.metaKey) && event.key === 'd') {
                if (selectedComponentId) {
                    event.preventDefault();
                    duplicateComponent(selectedComponentId);
                }
            }

            // Delete: Delete or Backspace
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if (selectedComponentId && target.tagName !== 'INPUT') {
                    event.preventDefault();
                    removeComponent(selectedComponentId);
                }
            }

            // Fit view: Ctrl+F
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                reactFlowInstance?.fitView({ padding: 0.2 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, copyComponent, pasteComponent, duplicateComponent, removeComponent, selectedComponentId, clipboard, reactFlowInstance]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target || !currentBlueprint) return;

        // Validation Logic
        const sourceComp = currentBlueprint.components.find(c => c.id === params.source);
        const targetComp = currentBlueprint.components.find(c => c.id === params.target);

        if (sourceComp && targetComp) {
            const registry = ComponentRegistry.getInstance();
            const sourceDef = registry.getComponent(sourceComp.componentDefinitionId);
            const targetDef = registry.getComponent(targetComp.componentDefinitionId);

            if (sourceDef && targetDef) {
                const sourcePort = sourceDef.ports.find(p => p.id === params.sourceHandle);
                const targetPort = targetDef.ports.find(p => p.id === params.targetHandle);

                if (sourcePort && targetPort) {
                    // 1. Check Domain Compatibility
                    if (sourcePort.type !== targetPort.type && sourcePort.type !== 'mechanical-flange' && targetPort.type !== 'signal') {
                        // Allow some flexibility or strict? Let's be strict on domain.
                        // Actually types are 'inlet', 'outlet', 'flange', 'signal-in', 'signal-out'
                        // We should check the domain property of the component mostly, but ports have types.
                        // Let's check based on port definition logic if available, or just simple meaningful checks.

                        // Better check: Port types should match broad categories
                        const isFluidResult = ['inlet', 'outlet'].includes(sourcePort.type) && ['inlet', 'outlet'].includes(targetPort.type);
                        const isSignalResult = ['signal-in', 'signal-out'].includes(sourcePort.type) && ['signal-in', 'signal-out'].includes(targetPort.type);
                        const isMechResult = sourcePort.type.includes('flange') && targetPort.type.includes('flange');

                        if (!isFluidResult && !isSignalResult && !isMechResult) {
                            alert(`Cannot connect ${sourcePort.type} to ${targetPort.type}`);
                            return;
                        }
                    }

                    // 2. Prevent Input-Input or Output-Output for Fluid (strictly directional)
                    if (['inlet', 'outlet'].includes(sourcePort.type) && ['inlet', 'outlet'].includes(targetPort.type)) {
                        // Ideally outlet -> inlet
                        if (sourcePort.type === targetPort.type) {
                            // Warn but allow? Or block?
                            // Block inlet-inlet or outlet-outlet
                            // alert('Must connect Outlet to Inlet');
                            // return;
                            // Actually, some components might use ports bi-directionally, but let's encourage directionality
                        }
                    }
                }
            }
        }

        const newEdge: Edge = {
            id: `e-${params.source}-${params.sourceHandle}-${params.target}-${params.targetHandle}`,
            source: params.source,
            sourceHandle: params.sourceHandle,
            target: params.target,
            targetHandle: params.targetHandle,
            type: 'animated', // Custom edge type
            animated: true,
            style: { stroke: '#64748b', strokeWidth: 2 }
        };

        setEdges((eds) => addEdge(newEdge, eds));

        const newConnection: MechConnection = {
            id: newEdge.id,
            sourceComponentId: params.source,
            sourcePortId: params.sourceHandle || 'out',
            targetComponentId: params.target,
            targetPortId: params.targetHandle || 'in',
            type: 'fluid', // Default, should determine based on port
            isSelected: false
        };
        addConnection(newConnection);

    }, [setEdges, addConnection, currentBlueprint]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');
            if (!data || !reactFlowWrapper.current || !reactFlowInstance) return;

            const componentDef: MechComponentDefinition = JSON.parse(data);

            const reactFlowBounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.project({
                x: event.clientX - reactFlowBounds.left,
                y: event.clientY - reactFlowBounds.top,
            });

            const newNodeId = crypto.randomUUID();

            const newInstance: MechComponentInstance = {
                id: newNodeId,
                componentDefinitionId: componentDef.id,
                name: componentDef.name,
                position,
                rotation: 0,
                parameterValues: componentDef.parameters.reduce((acc, p) => ({ ...acc, [p.id]: p.value ?? 0 }), {}),
                isSelected: false,
                groupIds: []
            };

            const newNode: Node = {
                id: newNodeId,
                type: 'mechNode',
                position,
                data: {
                    label: componentDef.name,
                    component: newInstance
                }
            };

            setNodes((nds) => nds.concat(newNode));
            addComponent(newInstance);
        },
        [setNodes, addComponent, reactFlowInstance]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        selectComponent(node.id);
    }, [selectComponent]);

    const onPaneClick = useCallback(() => {
        selectComponent(null);
    }, [selectComponent]);

    const nodeColor = useCallback((node: Node) => {
        const componentId = node.data?.component?.componentDefinitionId;
        if (componentId?.includes('fluid')) return '#22d3ee';
        if (componentId?.includes('thermal')) return '#fb923c';
        if (componentId?.includes('mechanical')) return '#94a3b8';
        if (componentId?.includes('control')) return '#34d399';
        return '#a78bfa';
    }, []);

    const handleZoomIn = () => reactFlowInstance?.zoomIn();
    const handleZoomOut = () => reactFlowInstance?.zoomOut();
    const handleFitView = () => reactFlowInstance?.fitView({ padding: 0.2 });

    return (
        <div ref={reactFlowWrapper} className="w-full h-full relative">
            <Toolbar
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
            />

            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onDragOver={onDragOver}
                onDrop={onDrop}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                onInit={setReactFlowInstance}
                nodeTypes={nodeTypes}
                fitView
                className="bg-transparent"
                defaultEdgeOptions={{
                    style: { stroke: '#64748b', strokeWidth: 2 },
                    type: 'smoothstep',
                    animated: true
                }}
                connectionLineStyle={{ stroke: '#64748b', strokeWidth: 2 }}
                snapToGrid
                snapGrid={[15, 15]}
                deleteKeyCode={null} // We handle delete ourselves
            >
                <Background color="#334155" gap={20} size={1} />
                <Controls
                    className="!bg-slate-800 !border-slate-700 !rounded-lg !shadow-lg [&>button]:!bg-slate-800 [&>button]:!border-slate-700 [&>button]:!text-slate-400 [&>button:hover]:!bg-slate-700"
                />
                <MiniMap
                    nodeColor={nodeColor}
                    maskColor="rgba(15, 23, 42, 0.8)"
                    className="!bg-slate-800 !border-slate-700 !rounded-lg"
                    style={{ height: 100 }}
                />
            </ReactFlow>
        </div>
    );
};

export const Canvas: React.FC = () => {
    return (
        <ReactFlowProvider>
            <CanvasContent />
        </ReactFlowProvider>
    );
};

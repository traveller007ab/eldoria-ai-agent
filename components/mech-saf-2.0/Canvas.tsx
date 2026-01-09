import React, { useCallback, useRef, useEffect, useState } from 'react';
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
    useReactFlow,
    OnNodesChange,
    applyNodeChanges
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

interface MarqueeSelection {
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
}

const CanvasContent: React.FC = () => {
    const {
        addComponent,
        addConnection,
        selectComponent,
        selectComponents,
        addToSelection,
        clearSelection,
        currentBlueprint,
        undo,
        redo,
        copyComponent,
        copyComponents,
        pasteComponent,
        duplicateComponent,
        duplicateComponents,
        removeComponent,
        removeComponents,
        selectedComponentId,
        selectedComponentIds,
        clipboard,
        lastSimulationResult
    } = useMechStore();

    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [reactFlowInstance, setReactFlowInstance] = React.useState<ReactFlowInstance | null>(null);
    const [marqueeSelection, setMarqueeSelection] = useState<MarqueeSelection | null>(null);
    const [isMarqueeSelecting, setIsMarqueeSelecting] = useState(false);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync nodes from store when blueprint changes
    useEffect(() => {
        if (currentBlueprint) {
            setNodes(currentBlueprint.components.map(c => {
                // Filter simulation results for this component
                const simState = lastSimulationResult?.system_vars 
                    ? Object.entries(lastSimulationResult.system_vars)
                        .filter(([k]) => k.startsWith(`${c.id}.`))
                        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {})
                    : undefined;

                return {
                    id: c.id,
                    type: 'mechNode',
                    position: c.position,
                    data: { 
                        label: c.name, 
                        component: c,
                        simulationState: simState // Inject Telemetry
                    },
                    selected: selectedComponentIds.includes(c.id) || selectedComponentId === c.id
                };
            }));

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
    }, [currentBlueprint?.components.length, currentBlueprint?.connections.length, selectedComponentIds.length, selectedComponentId, lastSimulationResult]); // Add lastSimulationResult dependency

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
                } else if (selectedComponentIds.length > 0) {
                    event.preventDefault();
                    copyComponents(selectedComponentIds);
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
                } else if (selectedComponentIds.length > 0) {
                    event.preventDefault();
                    duplicateComponents(selectedComponentIds);
                }
            }

            // Delete: Delete or Backspace
            if (event.key === 'Delete' || event.key === 'Backspace') {
                if ((selectedComponentId || selectedComponentIds.length > 0) && target.tagName !== 'INPUT') {
                    event.preventDefault();
                    if (selectedComponentIds.length > 0) {
                        removeComponents(selectedComponentIds);
                    } else if (selectedComponentId) {
                        removeComponent(selectedComponentId);
                    }
                }
            }

            // Escape: Clear selection
            if (event.key === 'Escape') {
                clearSelection();
            }

            // Fit view: Ctrl+F
            if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
                event.preventDefault();
                reactFlowInstance?.fitView({ padding: 0.2 });
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [undo, redo, copyComponent, copyComponents, pasteComponent, duplicateComponent, duplicateComponents, removeComponent, removeComponents, selectedComponentId, selectedComponentIds, clipboard, reactFlowInstance, clearSelection]);

    const getMarqueeBounds = useCallback(() => {
        if (!marqueeSelection) return null;

        const minX = Math.min(marqueeSelection.startX, marqueeSelection.currentX);
        const maxX = Math.max(marqueeSelection.startX, marqueeSelection.currentX);
        const minY = Math.min(marqueeSelection.startY, marqueeSelection.currentY);
        const maxY = Math.max(marqueeSelection.startY, marqueeSelection.currentY);

        return { minX, maxX, minY, maxY, width: maxX - minX, height: maxY - minY };
    }, [marqueeSelection]);

    const getScreenToFlowPosition = useCallback((x: number, y: number) => {
        if (!reactFlowWrapper.current || !reactFlowInstance) return { x, y };
        const rect = reactFlowWrapper.current.getBoundingClientRect();
        return reactFlowInstance.project({
            x: x - rect.left,
            y: y - rect.top
        });
    }, [reactFlowInstance]);

    const handleMouseDown = useCallback((event: React.MouseEvent) => {
        if (event.button !== 0) return;

        const flowPosition = getScreenToFlowPosition(event.clientX, event.clientY);
        setMarqueeSelection({
            startX: flowPosition.x,
            startY: flowPosition.y,
            currentX: flowPosition.x,
            currentY: flowPosition.y
        });
        setIsMarqueeSelecting(true);
    }, [getScreenToFlowPosition]);

    const handleMouseMove = useCallback((event: React.MouseEvent) => {
        if (!isMarqueeSelecting || !marqueeSelection) return;

        const flowPosition = getScreenToFlowPosition(event.clientX, event.clientY);
        setMarqueeSelection(prev => prev ? {
            ...prev,
            currentX: flowPosition.x,
            currentY: flowPosition.y
        } : null);
    }, [isMarqueeSelecting, marqueeSelection, getScreenToFlowPosition]);

    const handleMouseUp = useCallback(() => {
        if (!isMarqueeSelecting || !marqueeSelection) return;

        const bounds = getMarqueeBounds();
        if (bounds && (bounds.width > 10 || bounds.height > 10)) {
            // Select nodes within marquee
            const nodesInBounds = nodes.filter(node => {
                const nodeX = node.position.x;
                const nodeY = node.position.y;
                return nodeX >= bounds.minX && nodeX <= bounds.maxX &&
                       nodeY >= bounds.minY && nodeY <= bounds.maxY;
            });

            if (nodesInBounds.length > 0) {
                const nodeIds = nodesInBounds.map(n => n.id);
                selectComponents(nodeIds);
            }
        }

        setMarqueeSelection(null);
        setIsMarqueeSelecting(false);
    }, [isMarqueeSelecting, marqueeSelection, nodes, getMarqueeBounds, selectComponents]);

    const onConnect = useCallback((params: Connection) => {
        if (!params.source || !params.target || !currentBlueprint) return;

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
                    if (sourcePort.domain !== targetPort.domain) {
                        alert(`Cannot connect ${sourcePort.domain} port to ${targetPort.domain} port.`);
                        return;
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
            type: 'animated',
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
            type: 'fluid',
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
        if (event.shiftKey || event.ctrlKey || event.metaKey) {
            // Add to selection
            addToSelection(node.id);
        } else {
            // Single select
            selectComponent(node.id);
        }
    }, [selectComponent, addToSelection]);

    const onPaneClick = useCallback((event: React.MouseEvent) => {
        if (!isMarqueeSelecting) {
            clearSelection();
        }
    }, [isMarqueeSelecting, clearSelection]);

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

    const marqueeBounds = getMarqueeBounds();

    return (
        <div ref={reactFlowWrapper} className="w-full h-full relative">
            <Toolbar
                onZoomIn={handleZoomIn}
                onZoomOut={handleZoomOut}
                onFitView={handleFitView}
            />

            <div
                className="absolute inset-0"
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                style={{ cursor: isMarqueeSelecting ? 'crosshair' : 'default' }}
            >
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
                    deleteKeyCode={null}
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

            {/* Marquee Selection Box */}
            {marqueeBounds && (marqueeBounds.width > 5 || marqueeBounds.height > 5) && (
                <div
                    className="absolute pointer-events-none border-2 border-cyan-500 bg-cyan-500/10"
                    style={{
                        left: marqueeBounds.minX,
                        top: marqueeBounds.minY,
                        width: marqueeBounds.width,
                        height: marqueeBounds.height
                    }}
                />
            )}

            {/* Selection Count Indicator */}
            {selectedComponentIds.length > 1 && (
                <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 bg-slate-800/90 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white shadow-lg">
                    {selectedComponentIds.length} components selected
                </div>
            )}
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

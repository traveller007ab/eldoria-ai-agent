import React, { useCallback } from 'react';
import ReactFlow, {
    Background,
    Controls,
    Connection,
    Edge,
    addEdge,
    useNodesState,
    useEdgesState,
    ReactFlowProvider,
    Node
} from 'reactflow';
import 'reactflow/dist/style.css';

import { useMechStore } from '../../stores/useMechStore';
import { ComponentDefinition, ComponentInstance } from '../../types/mech-saf-2.0';

const initialNodes: Node[] = [];
const initialEdges: Edge[] = [];

const CanvasContent: React.FC = () => {
    const { addComponent, selectComponent, currentBlueprint } = useMechStore();

    // Local state for ReactFlow (synced with global store ideally, but for now simple)
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    const onConnect = useCallback((params: Connection) => setEdges((eds) => addEdge(params, eds)), [setEdges]);

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();

            const data = event.dataTransfer.getData('application/reactflow');

            // Check if it's a valid drop
            if (!data) return;

            const componentDef: ComponentDefinition = JSON.parse(data);

            // Get position
            // In a real app we need to project to flow coordinates, here is simplified
            const position = {
                x: event.clientX - 300, // Offset sidebar approx
                y: event.clientY - 60   // Offset header approx
            };

            const newNode: Node = {
                id: crypto.randomUUID(),
                type: 'default', // standard node for now
                position,
                data: { label: componentDef.name },
            };

            setNodes((nds) => nds.concat(newNode));

            // Sync with Global Store
            const newInstance: ComponentInstance = {
                id: newNode.id,
                componentDefinitionId: componentDef.id,
                name: componentDef.name,
                position,
                rotation: 0,
                parameterValues: componentDef.parameters.reduce((acc, p) => ({ ...acc, [p.id]: p.value || 0 }), {}),
                isSelected: false,
                groupIds: []
            };
            addComponent(newInstance);
        },
        [setNodes, addComponent]
    );

    const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
        selectComponent(node.id);
    }, [selectComponent]);

    const onPaneClick = useCallback(() => {
        selectComponent(null);
    }, [selectComponent]);

    return (
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
            fitView
            className="bg-slate-900"
        >
            <Background color="#334155" gap={16} />
            <Controls className="bg-slate-800 text-white border-slate-700 fill-white" />
        </ReactFlow>
    );
};

export const Canvas: React.FC = () => {
    return (
        <ReactFlowProvider>
            <div className="w-full h-full">
                <CanvasContent />
            </div>
        </ReactFlowProvider>
    );
};

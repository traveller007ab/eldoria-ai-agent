import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
    Node,
    Edge,
    Controls,
    MiniMap,
    Background,
    BackgroundVariant,
    useNodesState,
    useEdgesState,
    NodeTypes,
    EdgeTypes,
    MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DeepSAFBlueprint, DeepSAFComponent, FLOW_STYLES, COMPONENT_STYLES } from './types';
import { ChevronDown, ChevronRight, Zap, HelpCircle } from 'lucide-react';

// ============================================
// CUSTOM SAF NODE COMPONENT
// ============================================

interface SAFNodeData {
    component: DeepSAFComponent;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
    onAskAI: (id: string) => void;
}

const SAFNode: React.FC<{ data: SAFNodeData }> = ({ data }) => {
    const { component, isExpanded, onToggleExpand, onSelect, onAskAI } = data;
    const style = COMPONENT_STYLES[component.type];
    const hasChildren = component.children && component.children.length > 0;

    return (
        <div
            className="group min-w-[200px] bg-gray-900/90 backdrop-blur-sm border-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{
                borderColor: style.borderColor,
                boxShadow: `0 0 20px ${style.glow}`,
            }}
            onClick={() => onSelect(component.id)}
        >
            {/* Header */}
            <div
                className="px-4 py-3 flex items-center justify-between cursor-pointer"
                style={{ backgroundColor: `${style.borderColor}20` }}
            >
                <div className="flex items-center gap-2">
                    {hasChildren && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onToggleExpand(component.id);
                            }}
                            className="p-0.5 hover:bg-white/10 rounded transition-colors"
                        >
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-white/60" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-white/60" />
                            )}
                        </button>
                    )}
                    <span className="font-bold text-white text-sm">{component.name}</span>
                </div>
                <span
                    className="text-[10px] px-1.5 py-0.5 rounded uppercase font-bold"
                    style={{ backgroundColor: `${style.borderColor}40`, color: style.borderColor }}
                >
                    {component.type}
                </span>
            </div>

            {/* Parameters */}
            {component.parameters && component.parameters.length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 space-y-1">
                    {component.parameters.slice(0, 3).map((param) => (
                        <div key={param.name} className="flex items-center justify-between text-xs">
                            <span className="text-gray-400">{param.name}</span>
                            <span className="text-cyan-400 font-mono">
                                {param.value} {param.unit || ''}
                            </span>
                        </div>
                    ))}
                    {component.parameters.length > 3 && (
                        <div className="text-xs text-gray-500 italic">
                            +{component.parameters.length - 3} more...
                        </div>
                    )}
                </div>
            )}

            {/* Outputs */}
            {component.outputs && component.outputs.length > 0 && (
                <div className="px-4 py-2 border-t border-white/5 bg-black/20 space-y-1">
                    {component.outputs.slice(0, 2).map((output) => (
                        <div key={output.name} className="flex items-center justify-between text-xs">
                            <span className="text-gray-500 flex items-center gap-1">
                                <Zap className="w-3 h-3 text-yellow-500/50" />
                                {output.name}
                            </span>
                            <span className="text-emerald-400 font-mono font-bold">
                                {output.value} {output.unit || ''}
                            </span>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions (visible on hover) */}
            <div className="px-4 py-2 border-t border-white/5 opacity-0 group-hover:opacity-100 transition-opacity flex gap-2">
                <button
                    onClick={(e) => {
                        e.stopPropagation();
                        onAskAI(component.id);
                    }}
                    className="flex-1 text-xs px-2 py-1 bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors flex items-center justify-center gap-1"
                >
                    <HelpCircle className="w-3 h-3" />
                    Ask AI
                </button>
            </div>
        </div>
    );
};

// ============================================
// NODE TYPES REGISTRATION
// ============================================

const nodeTypes: NodeTypes = {
    safNode: SAFNode,
};

// ============================================
// MAIN GRAPH COMPONENT
// ============================================

interface SAFNodeGraphProps {
    blueprint: DeepSAFBlueprint;
    expandedNodes: string[];
    selectedNodeId: string | null;
    onToggleExpand: (id: string) => void;
    onSelectNode: (id: string | null) => void;
    onAskAI: (id: string) => void;
}

export const SAFNodeGraph: React.FC<SAFNodeGraphProps> = ({
    blueprint,
    expandedNodes,
    selectedNodeId,
    onToggleExpand,
    onSelectNode,
    onAskAI,
}) => {
    // Convert blueprint components to React Flow nodes
    const initialNodes: Node[] = useMemo(() => {
        return blueprint.components.map((comp) => ({
            id: comp.id,
            type: 'safNode',
            position: comp.position || { x: 0, y: 0 },
            data: {
                component: comp,
                isExpanded: expandedNodes.includes(comp.id),
                onToggleExpand,
                onSelect: onSelectNode,
                onAskAI,
            },
            selected: selectedNodeId === comp.id,
        }));
    }, [blueprint.components, expandedNodes, selectedNodeId, onToggleExpand, onSelectNode, onAskAI]);

    // Convert blueprint flows to React Flow edges
    const initialEdges: Edge[] = useMemo(() => {
        return blueprint.flows.map((flow) => {
            const style = FLOW_STYLES[flow.type];
            return {
                id: flow.id,
                source: flow.from,
                target: flow.to,
                type: 'smoothstep',
                animated: flow.type === 'energy' || flow.type === 'signal',
                style: {
                    stroke: style.color,
                    strokeWidth: style.strokeWidth,
                    strokeDasharray: style.dashArray,
                },
                markerEnd: {
                    type: MarkerType.ArrowClosed,
                    color: style.color,
                },
                label: flow.label || flow.parameter,
                labelStyle: { fill: '#9ca3af', fontSize: 10 },
                labelBgStyle: { fill: '#1f2937', fillOpacity: 0.8 },
            };
        });
    }, [blueprint.flows]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Update nodes when blueprint changes
    React.useEffect(() => {
        setNodes(initialNodes);
    }, [initialNodes, setNodes]);

    React.useEffect(() => {
        setEdges(initialEdges);
    }, [initialEdges, setEdges]);

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            onSelectNode(node.id);
        },
        [onSelectNode]
    );

    const onPaneClick = useCallback(() => {
        onSelectNode(null);
    }, [onSelectNode]);

    return (
        <div className="w-full h-full">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
            >
                <Background
                    variant={BackgroundVariant.Dots}
                    gap={20}
                    size={1}
                    color="#374151"
                />
                <Controls
                    className="!bg-gray-900/80 !border-cyan-900/30 !rounded-xl overflow-hidden"
                    showInteractive={false}
                />
                <MiniMap
                    className="!bg-gray-900/80 !border-cyan-900/30 !rounded-xl overflow-hidden"
                    nodeColor={(node) => {
                        const comp = blueprint.components.find((c) => c.id === node.id);
                        if (!comp) return '#6b7280';
                        return COMPONENT_STYLES[comp.type].borderColor;
                    }}
                    maskColor="rgba(0, 0, 0, 0.7)"
                />
            </ReactFlow>
        </div>
    );
};

export default SAFNodeGraph;

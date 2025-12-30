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
    Connection,
    OnConnect,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { DeepSAFBlueprint, DeepSAFComponent, FLOW_STYLES, COMPONENT_STYLES, DeepSAFFlow } from './types';
import { ChevronDown, ChevronRight, Zap, HelpCircle, AlertTriangle, Plus, Trash2, MousePointer2 } from 'lucide-react';

// ============================================
// CUSTOM SAF NODE COMPONENT
// ============================================

interface SAFNodeData {
    component: DeepSAFComponent;
    isExpanded: boolean;
    onToggleExpand: (id: string) => void;
    onSelect: (id: string) => void;
    onAskAI: (id: string) => void;
    simulationVars?: Record<string, number>; // Live simulation results for badges
    constraintViolations?: string[]; // Flow/component IDs that violate constraints
    flows?: DeepSAFFlow[]; // Flows for this component
}

const SAFNode: React.FC<{ data: SAFNodeData }> = ({ data }) => {
    const { component, isExpanded, onToggleExpand, onSelect, onAskAI, simulationVars, constraintViolations, flows } = data;
    const style = COMPONENT_STYLES[component.type];
    const hasChildren = component.children && component.children.length > 0;

    // Check if this component has constraint violations
    const hasViolations = constraintViolations?.includes(component.id) || false;

    // Extract live simulation values for this component's flows
    const getFlowValue = (flowId: string, varType: 'P' | 'T' | 'm') => {
        if (!simulationVars) return null;
        const key = `${flowId}.${varType}`;
        return simulationVars[key];
    };

    // Get outgoing flows for this component
    const outgoingFlows = data.component.id ? [] : []; // Will be passed from parent

    return (
        <div
            className="group min-w-[200px] bg-gray-900/90 backdrop-blur-sm border-2 rounded-xl overflow-hidden transition-all duration-300 hover:shadow-lg"
            style={{
                borderColor: hasViolations ? '#ef4444' : style.borderColor,
                boxShadow: hasViolations
                    ? `0 0 20px rgba(239, 68, 68, 0.6)`
                    : `0 0 20px ${style.glow}`,
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

            {/* Live Simulation Badges */}
            {simulationVars && flows && (
                <div className="px-4 py-2 border-t border-white/5 bg-purple-500/10 space-y-1">
                    <div className="text-[10px] text-purple-400/60 uppercase tracking-wider mb-1">Live Sim</div>
                    {flows
                        .filter(f => f.from === component.id)
                        .slice(0, 2)
                        .map(flow => {
                            const p = simulationVars[`${flow.id}.P`];
                            const t = simulationVars[`${flow.id}.T`];
                            const m = simulationVars[`${flow.id}.m`];
                            if (p === undefined && t === undefined && m === undefined) return null;
                            return (
                                <div key={flow.id} className="text-[10px] text-purple-300 font-mono">
                                    {flow.id}: {p !== undefined && `P=${p.toFixed(1)} `}
                                    {t !== undefined && `T=${t.toFixed(0)} `}
                                    {m !== undefined && `m=${m.toFixed(2)}`}
                                </div>
                            );
                        })}
                </div>
            )}

            {/* Constraint Violation Badge */}
            {hasViolations && (
                <div className="px-4 py-2 border-t border-red-500/30 bg-red-500/10">
                    <div className="flex items-center gap-2 text-xs text-red-400">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="font-bold">Constraint Violation</span>
                    </div>
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
    simulationVars?: Record<string, number>;
    constraintViolations?: string[];

    // NEW: Editing Callbacks
    onConnect?: (params: Connection) => void;
    onDeleteNodes?: (nodeIds: string[]) => void;
    onDeleteEdges?: (edgeIds: string[]) => void;
    onNodeDragStop?: (nodeId: string, position: { x: number; y: number }) => void;
    onAddNode?: (type: 'core' | 'subcore' | 'micro', position: { x: number; y: number }) => void;
}

export const SAFNodeGraph: React.FC<SAFNodeGraphProps> = ({
    blueprint,
    expandedNodes,
    selectedNodeId,
    onToggleExpand,
    onSelectNode,
    onAskAI,
    simulationVars,
    constraintViolations,
    onConnect,
    onDeleteNodes,
    onDeleteEdges,
    onNodeDragStop,
    onAddNode
}) => {
    // Convert Blueprint to React Flow Nodes
    const initialNodes = useMemo(() => {
        if (!blueprint?.components) return [];
        return blueprint.components.map((comp) => ({
            id: comp.id,
            type: 'safNode',
            position: comp.position || { x: 0, y: 0 },
            data: {
                component: comp,
                isExpanded: expandedNodes.includes(comp.id),
                isSelected: selectedNodeId === comp.id,
                onToggleExpand,
                simulationVars,
                hasConstraintViolation: constraintViolations?.includes(comp.id)
            },
        }));
    }, [blueprint, expandedNodes, selectedNodeId, onToggleExpand, simulationVars, constraintViolations]);

    // Convert Blueprint Flows to React Flow Edges
    const initialEdges = useMemo(() => {
        if (!blueprint?.flows) return [];
        return blueprint.flows.map((flow) => {
            let style = FLOW_STYLES['material'];
            if (flow.type && FLOW_STYLES[flow.type as keyof typeof FLOW_STYLES]) {
                style = FLOW_STYLES[flow.type as keyof typeof FLOW_STYLES];
            }
            return {
                id: flow.id,
                source: flow.from,
                target: flow.to,
                animated: true,
                style: { stroke: style.color, strokeWidth: style.width },
                markerEnd: { type: MarkerType.ArrowClosed, color: style.color },
                data: { flow },
            };
        });
    }, [blueprint]);

    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

    // Sync when blueprint changes (AI update or external load)
    React.useEffect(() => {
        setNodes(initialNodes);
        setEdges(initialEdges);
    }, [initialNodes, initialEdges, setNodes, setEdges]);


    const handleConnect: OnConnect = useCallback((params) => {
        if (onConnect) onConnect(params);
    }, [onConnect]);

    const handleNodesDelete = useCallback((nodesToDelete: Node[]) => {
        if (onDeleteNodes) onDeleteNodes(nodesToDelete.map(n => n.id));
    }, [onDeleteNodes]);

    const handleEdgesDelete = useCallback((edgesToDelete: Edge[]) => {
        if (onDeleteEdges) onDeleteEdges(edgesToDelete.map(e => e.id));
    }, [onDeleteEdges]);

    const handleNodeDragStop = useCallback((event: React.MouseEvent, node: Node) => {
        if (onNodeDragStop) onNodeDragStop(node.id, node.position);
    }, [onNodeDragStop]);

    const onNodeClick = useCallback(
        (_: React.MouseEvent, node: Node) => {
            onSelectNode(node.id);
        },
        [onSelectNode]
    );

    const onPaneClick = useCallback(() => {
        onSelectNode(null);
    }, [onSelectNode]);

    // Toolbar for adding nodes
    const [showNodeMenu, setShowNodeMenu] = React.useState(false);

    return (
        <div className="w-full h-full relative">
            <ReactFlow
                nodes={nodes}
                edges={edges}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={handleConnect}
                onNodesDelete={handleNodesDelete}
                onEdgesDelete={handleEdgesDelete}
                onNodeDragStop={handleNodeDragStop}
                onNodeClick={onNodeClick}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                fitView
                fitViewOptions={{ padding: 0.2 }}
                minZoom={0.1}
                maxZoom={2}
                defaultViewport={{ x: 0, y: 0, zoom: 0.8 }}
                proOptions={{ hideAttribution: true }}
                deleteKeyCode={['Backspace', 'Delete']}
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

            {/* Quick Action Toolbar */}
            <div className="absolute top-4 left-4 flex flex-col gap-2">
                <div className="relative">
                    <button
                        onClick={() => setShowNodeMenu(!showNodeMenu)}
                        className="p-3 bg-cyan-500 hover:bg-cyan-400 text-white rounded-xl shadow-lg shadow-cyan-500/20 transition-all flex items-center justify-center"
                        title="Add Component"
                    >
                        <Plus className={`w-5 h-5 transition-transform ${showNodeMenu ? 'rotate-45' : ''}`} />
                    </button>

                    {showNodeMenu && (
                        <div className="absolute top-full left-0 mt-2 p-2 bg-gray-900/90 backdrop-blur border border-white/10 rounded-xl flex flex-col gap-1 min-w-[140px] animate-in fade-in slide-in-from-top-2">
                            {(['core', 'subcore', 'micro'] as const).map(type => (
                                <button
                                    key={type}
                                    onClick={() => {
                                        if (onAddNode) onAddNode(type, { x: Math.random() * 400, y: Math.random() * 400 });
                                        setShowNodeMenu(false);
                                    }}
                                    className="px-3 py-2 text-left text-xs bg-white/5 hover:bg-cyan-500/20 text-white rounded-lg flex items-center gap-2 group"
                                >
                                    <div
                                        className="w-2 h-2 rounded-full"
                                        style={{ backgroundColor: COMPONENT_STYLES[type].borderColor }}
                                    />
                                    <span className="capitalize text-white/80 group-hover:text-white">Add {type}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <button
                    onClick={() => onSelectNode(null)}
                    className="p-3 bg-gray-800/80 hover:bg-gray-700/80 text-white rounded-xl shadow-lg border border-white/5 flex items-center justify-center"
                    title="Select logic"
                >
                    <MousePointer2 className="w-5 h-5" />
                </button>
            </div>
        </div>
    );
};

// ... (export default SAFNodeGraph) ...

export default SAFNodeGraph;

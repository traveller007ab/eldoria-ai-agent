/**
 * Mechanical Graph Editor
 * ReactFlow-based visual editor for mechanical systems
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  Edge,
  Node,
  OnNodesChange,
  OnEdgesChange,
  OnConnect,
  Panel,
  ReactFlowProvider,
  useReactFlow,
  MarkerType,
  ConnectionLineType
} from 'reactflow';
import 'reactflow/dist/style.css';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  ZoomIn, 
  ZoomOut, 
  Maximize2,
  Save,
  Upload,
  Settings,
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react';
import MechanicalNode, { nodeTypes, componentToNode } from './MechanicalNode';
import { useSAFMechanicalStore } from '../store';
import { MechanicalComponent, Connection as SAFConnection, createComponentId } from '../types';
import { MechanicalCatalog, getComponentTemplate } from '../components/catalog';

interface MechanicalGraphEditorProps {
  onSelectComponent?: (componentId: string | null) => void;
  onOpenSettings?: () => void;
}

// Custom edge for connections
const ConnectionEdge = ({ 
  data, 
  sourceX, sourceY, targetX, targetY, 
  sourcePosition, targetPosition,
  style = {},
  markerEnd 
}: any) => {
  const domain = data?.domain || 'fluid';
  
  const edgeColors: Record<string, string> = {
    fluid: '#3b82f6',
    mechanical: '#a855f7',
    thermal: '#f97316',
    signal: '#22c55e',
    electrical: '#eab308',
    hydraulic: '#06b6d4'
  };
  
  return (
    <path
      d={`M ${sourceX} ${sourceY} C ${sourceX + 100} ${sourceY}, ${targetX - 100} ${targetY}, ${targetX} ${targetY}`}
      fill="none"
      stroke={edgeColors[domain] || '#6b7280'}
      strokeWidth={2}
      markerEnd={markerEnd}
      style={style}
    />
  );
};

const edgeTypes = {
  mechanicalConnection: ConnectionEdge
};

function GraphEditorContent({ onSelectComponent, onOpenSettings }: MechanicalGraphEditorProps) {
  const { 
    components, 
    connections,
    selectedComponentId,
    lastSimulationResult,
    isSimulating,
    addComponent,
    addConnection,
    removeComponent,
    selectComponent,
    runSimulation,
    snapToGrid
  } = useSAFMechanicalStore();
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [isConnected, setIsConnected] = useState(false);
  
  const reactFlowInstance = useReactFlow();
  
  // Convert SAF components to ReactFlow nodes
  useEffect(() => {
    const newNodes: Node[] = components.map(comp => {
      const existingNode = nodes.find(n => n.id === comp.id);
      if (existingNode && !existingNode.selected) {
        return existingNode;
      }
      return componentToNode(comp, { x: comp.geometry?.dimensions?.x || 100, y: comp.geometry?.dimensions?.y || 100 });
    });
    
    // Remove nodes for deleted components
    const componentIds = new Set(components.map(c => c.id));
    const filteredNodes = nodes.filter(n => componentIds.has(n.id) || n.selected);
    
    setNodes(filteredNodes.length > 0 ? filteredNodes : newNodes);
  }, [components, nodes.length, setNodes]);
  
  // Convert SAF connections to ReactFlow edges
  useEffect(() => {
    const newEdges: Edge[] = connections.map(conn => ({
      id: conn.id,
      source: conn.sourceComponentId,
      sourceHandle: conn.sourcePortId,
      target: conn.targetComponentId,
      targetHandle: conn.targetPortId,
      type: 'mechanicalConnection',
      data: { domain: conn.type },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
      animated: isSimulating,
      style: { stroke: '#6b7280', strokeWidth: 2 }
    }));
    setEdges(newEdges);
  }, [connections, isSimulating, setEdges]);
  
  // Handle node selection
  const handleNodeClick = useCallback((_: React.MouseEvent, node: Node) => {
    selectComponent(node.id);
    onSelectComponent?.(node.id);
  }, [selectComponent, onSelectComponent]);
  
  const handlePaneClick = useCallback(() => {
    selectComponent(null);
    onSelectComponent?.(null);
  }, [selectComponent, onSelectComponent]);
  
  // Handle connections
  const handleConnect: OnConnect = useCallback((params: Connection) => {
    if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) {
      return;
    }
    
    const sourceComp = components.find(c => c.id === params.source);
    const targetComp = components.find(c => c.id === params.target);
    
    if (!sourceComp || !targetComp) return;
    
    const sourcePort = sourceComp.ports.find(p => p.id === params.sourceHandle);
    const targetPort = targetComp.ports.find(p => p.id === params.targetHandle);
    
    if (!sourcePort || !targetPort) return;
    
    // Check port compatibility
    const compatibleDomains = ['fluid', 'mechanical', 'thermal', 'signal'];
    if (!compatibleDomains.includes(sourcePort.domain) || 
        !compatibleDomains.includes(targetPort.domain) ||
        sourcePort.domain !== targetPort.domain) {
      return;
    }
    
    const success = addConnection({
      sourceComponentId: params.source,
      sourcePortId: params.sourceHandle,
      targetComponentId: params.target,
      targetPortId: params.targetHandle,
      type: sourcePort.domain as any
    });
    
    if (success) {
      setEdges((eds) => addEdge({
        id: `conn_${Date.now()}`,
        source: params.source,
        sourceHandle: params.sourceHandle,
        target: params.target,
        targetHandle: params.targetHandle,
        type: 'mechanicalConnection',
        data: { domain: sourcePort.domain },
        markerEnd: { type: MarkerType.ArrowClosed, color: '#6b7280' },
        style: { stroke: '#6b7280', strokeWidth: 2 }
      }, eds));
    }
  }, [components, addConnection, setEdges]);
  
  // Handle drag and drop from palette
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const componentType = event.dataTransfer.getData('application/saf/componentType');
    if (!componentType) return;
    
    const template = getComponentTemplate(componentType);
    if (!template) return;
    
    const reactFlowBounds = reactFlowInstance.screenToFlowPosition({
      x: event.clientX,
      y: event.clientY
    });
    
    const newComponent: MechanicalComponent = {
      ...template as MechanicalComponent,
      id: createComponentId('comp'),
      geometry: {
        ...template.geometry,
        dimensions: {
          ...template.geometry?.dimensions,
          x: reactFlowBounds.x,
          y: reactFlowBounds.y
        }
      }
    };
    
    addComponent(newComponent, { x: reactFlowBounds.x, y: reactFlowBounds.y });
  }, [addComponent, reactFlowInstance]);
  
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Toolbar actions
  const handleRunSimulation = async () => {
    await runSimulation();
  };
  
  const handleResetView = () => {
    reactFlowInstance.fitView({ duration: 300 });
  };
  
  const handleZoomIn = () => {
    reactFlowInstance.zoomIn();
  };
  
  const handleZoomOut = () => {
    reactFlowInstance.zoomOut();
  };
  
  // Get simulation variables for selected component
  const selectedSimVars = useMemo(() => {
    if (!selectedComponentId || !lastSimulationResult) return {};
    const vars: Record<string, number> = {};
    for (const [key, val] of Object.entries(lastSimulationResult.variables)) {
      if (key.startsWith(selectedComponentId) && typeof val === 'number') {
        vars[key] = val;
      }
    }
    return vars;
  }, [selectedComponentId, lastSimulationResult]);
  
  // Update selected node with simulation data
  useEffect(() => {
    if (selectedComponentId) {
      setNodes((nds) =>
        nds.map((node) => {
          if (node.id === selectedComponentId) {
            return {
              ...node,
              data: {
                ...node.data,
                simVars: selectedSimVars,
                isSelected: true
              }
            };
          }
          return {
            ...node,
            data: {
              ...node.data,
              isSelected: false
            }
          };
        })
      );
    }
  }, [selectedComponentId, selectedSimVars, setNodes]);
  
  return (
    <div className="w-full h-full flex flex-col bg-gray-950">
      {/* Toolbar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-gray-800 bg-gray-900/50">
        <div className="flex items-center gap-2">
          {/* Simulation Controls */}
          <button
            onClick={handleRunSimulation}
            disabled={isSimulating || components.length === 0}
            className={`
              flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
              ${isSimulating 
                ? 'bg-yellow-500/20 text-yellow-400 cursor-wait' 
                : components.length === 0
                  ? 'bg-gray-800 text-gray-600 cursor-not-allowed'
                  : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
              }
            `}
          >
            {isSimulating ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Play className="w-4 h-4" />
            )}
            {isSimulating ? 'Simulating...' : 'Run'}
          </button>
          
          {/* Simulation Status */}
          {lastSimulationResult && (
            <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-green-500/10 text-green-400 text-xs">
              <CheckCircle className="w-3 h-3" />
              Converged
            </div>
          )}
        </div>
        
        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={handleZoomIn}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        </div>
        
        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Graph Canvas */}
      <div 
        className="flex-1 relative"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={handleConnect}
          onNodeClick={handleNodeClick}
          onPaneClick={handlePaneClick}
          nodeTypes={nodeTypes}
          edgeTypes={edgeTypes}
          connectionLineType={ConnectionLineType.SmoothStep}
          snapToGrid={snapToGrid}
          snapGrid={[20, 20]}
          fitView
          minZoom={0.1}
          maxZoom={4}
          defaultViewport={{ x: 0, y: 0, zoom: 1 }}
        >
          <Background color="#374151" gap={20} size={1} />
          <Controls className="bg-gray-900 border-gray-700" />
          <MiniMap
            className="bg-gray-900 border-gray-700"
            nodeColor={(node) => {
              const colors: Record<string, string> = {
                fluid: '#3b82f6',
                heatTransfer: '#f97316',
                machineElement: '#a855f7',
                control: '#22c55e'
              };
              return colors[(node.data as any)?.component?.category] || '#6b7280';
            }}
          />
        </ReactFlow>
      </div>
    </div>
  );
}

export const MechanicalGraphEditor: React.FC<MechanicalGraphEditorProps> = (props) => {
  return (
    <ReactFlowProvider>
      <GraphEditorContent {...props} />
    </ReactFlowProvider>
  );
};

export default MechanicalGraphEditor;

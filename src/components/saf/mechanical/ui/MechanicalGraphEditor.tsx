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

// CSS Animinations
const style = document.createElement('style');
style.textContent = `
  @keyframes fadeInUp {
    from {
      opacity: 0;
      transform: translate(-50%, 10px);
    }
    to {
      opacity: 1;
      transform: translate(-50%, 0);
    }
  }
  .animate-fade-in-up {
    animation: fadeInUp 0.3s ease-out forwards;
  }
  
  @keyframes pulse-glow {
    0%, 100% {
      box-shadow: 0 0 5px currentColor;
    }
    50% {
      box-shadow: 0 0 20px currentColor;
    }
  }
  .animate-pulse-glow {
    animation: pulse-glow 2s ease-in-out infinite;
  }
  
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translateY(-10px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }
  .context-menu-animate {
    animation: slideIn 0.15s ease-out forwards;
  }
`;
document.head.appendChild(style);

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
  Loader2,
  Keyboard,
  HelpCircle,
  Trash2,
  X
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
  const [zoomLevel, setZoomLevel] = useState(1);
  const [toast, setToast] = useState<{ message: string; type: 'info' | 'error' | 'success' } | null>(null);
  
  const reactFlowInstance = useReactFlow();
  
  // Show toast notification
  const showToast = useCallback((message: string, type: 'info' | 'error' | 'success' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);
  
  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId) {
          removeComponent(selectedComponentId);
          selectComponent(null);
          showToast('Component deleted', 'info');
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: true })));
        showToast('All components selected', 'info');
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        setNodes(nds => nds.map(n => ({ ...n, selected: false })));
        selectComponent(null);
        showToast('Selection cleared', 'info');
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, removeComponent, selectComponent, showToast, setNodes]);
  
  // Context menu event handlers from MechanicalNode
  useEffect(() => {
    const handleDeleteNode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId) {
        removeComponent(detail.nodeId);
        selectComponent(null);
        showToast('Component deleted', 'info');
      }
    };
    
    const handleDuplicateNode = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail?.nodeId && detail?.component) {
        const reactFlowBounds = reactFlowInstance.screenToFlowPosition({
          x: window.innerWidth / 2,
          y: window.innerHeight / 2
        });
        
        addComponent({
          ...detail.component,
          id: createComponentId('comp'),
          name: `${detail.component.name} (copy)`
        }, { x: reactFlowBounds.x + 50, y: reactFlowBounds.y + 50 });
        
        showToast('Component duplicated', 'success');
      }
    };
    
    window.addEventListener('deleteNode', handleDeleteNode);
    window.addEventListener('duplicateNode', handleDuplicateNode);
    
    return () => {
      window.removeEventListener('deleteNode', handleDeleteNode);
      window.removeEventListener('duplicateNode', handleDuplicateNode);
    };
  }, [reactFlowInstance, addComponent, removeComponent, selectComponent, showToast]);
  
  // Zoom level tracking
  useEffect(() => {
    const updateZoom = () => {
      if (reactFlowInstance) {
        setZoomLevel(reactFlowInstance.getZoom());
      }
    };
    
    const interval = setInterval(updateZoom, 500);
    return () => clearInterval(interval);
  }, [reactFlowInstance]);
  
  // Convert SAF components to ReactFlow nodes
  useEffect(() => {
    const componentIds = new Set(components.map(c => c.id));
    
    // Remove nodes for deleted components
    const validNodes = nodes.filter(n => componentIds.has(n.id));
    
    // Add or update nodes for existing components
    const updatedNodes = components.map(comp => {
      const existingNode = validNodes.find(n => n.id === comp.id);
      if (existingNode) {
        // Update position if changed, preserve selection state
        const position = { 
          x: comp.geometry?.dimensions?.x || 100, 
          y: comp.geometry?.dimensions?.y || 100 
        };
        if (existingNode.position.x !== position.x || existingNode.position.y !== position.y) {
          return { ...existingNode, position };
        }
        return existingNode;
      }
      // Create new node
      return componentToNode(comp, { 
        x: comp.geometry?.dimensions?.x || 100, 
        y: comp.geometry?.dimensions?.y || 100 
      });
    });
    
    // Only update if changed
    if (JSON.stringify(updatedNodes) !== JSON.stringify(nodes)) {
      setNodes(updatedNodes);
    }
  }, [components, setNodes]);
  
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
      showToast('Invalid connection: missing ports', 'error');
      return;
    }
    
    const sourceComp = components.find(c => c.id === params.source);
    const targetComp = components.find(c => c.id === params.target);
    
    if (!sourceComp || !targetComp) {
      showToast('Invalid connection: component not found', 'error');
      return;
    }
    
    const sourcePorts = sourceComp.ports || [];
    const targetPorts = targetComp.ports || [];
    
    const sourcePort = sourcePorts.find(p => p.id === params.sourceHandle);
    const targetPort = targetPorts.find(p => p.id === params.targetHandle);
    
    if (!sourcePort || !targetPort) {
      showToast('Invalid connection: port not found', 'error');
      return;
    }
    
    // Check port compatibility
    const compatibleDomains = ['fluid', 'mechanical', 'thermal', 'signal'];
    if (!compatibleDomains.includes(sourcePort.domain) || 
        !compatibleDomains.includes(targetPort.domain)) {
      showToast(`Cannot connect ${sourcePort.domain} to ${targetPort.domain}`, 'error');
      return;
    }
    
    if (sourcePort.domain !== targetPort.domain) {
      showToast(`Domain mismatch: ${sourcePort.domain} ≠ ${targetPort.domain}`, 'error');
      return;
    }
    
    // Check if connection already exists
    const existingConnection = connections.find(
      c => c.sourceComponentId === params.source &&
           c.targetComponentId === params.target &&
           c.sourcePortId === params.sourceHandle &&
           c.targetPortId === params.targetHandle
    );
    
    if (existingConnection) {
      showToast('Connection already exists', 'info');
      return;
    }
    
    const success = addConnection({
      sourceComponentId: params.source,
      sourcePortId: params.sourceHandle,
      targetComponentId: params.target,
      targetPortId: params.targetHandle,
      type: sourcePort.domain as 'fluid' | 'mechanical' | 'thermal' | 'signal'
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
      showToast('Connection created', 'success');
    } else {
      showToast('Failed to create connection', 'error');
    }
  }, [components, addConnection, showToast, connections]);
  
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
            title="Zoom In (+)"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={handleZoomOut}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Zoom Out (-)"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <button
            onClick={handleResetView}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
            title="Fit to View (0)"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-500 px-2 min-w-[50px] text-center" title="Current Zoom Level">
            {Math.round(zoomLevel * 100)}%
          </span>
        </div>
        
        {/* Keyboard Shortcuts Help */}
        <div className="flex items-center gap-1 px-2 border-l border-gray-700">
          <Keyboard className="w-4 h-4 text-gray-500" />
          <span className="text-xs text-gray-500">Del</span>
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
        
        {/* Empty State Guidance */}
        {components.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                <Settings className="w-8 h-8 text-gray-600" />
              </div>
              <h3 className="text-lg font-medium text-gray-400 mb-2">No Components Yet</h3>
              <p className="text-sm text-gray-600 mb-4">Drag components from the palette to get started</p>
              <div className="flex items-center justify-center gap-4 text-xs text-gray-600">
                <span className="px-2 py-1 rounded bg-gray-800/50">Del to delete</span>
                <span className="px-2 py-1 rounded bg-gray-800/50">Ctrl+A to select all</span>
                <span className="px-2 py-1 rounded bg-gray-800/50">Scroll to zoom</span>
              </div>
            </div>
          </div>
        )}
        
        {/* Toast Notification */}
        {toast && (
          <div className={`
            absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg shadow-lg flex items-center gap-2
            animate-fade-in-up
            ${toast.type === 'error' ? 'bg-red-500/20 text-red-400 border border-red-500/30' : ''}
            ${toast.type === 'success' ? 'bg-green-500/20 text-green-400 border border-green-500/30' : ''}
            ${toast.type === 'info' ? 'bg-gray-800/80 text-gray-300 border border-gray-700' : ''}
          `}>
            {toast.type === 'error' && <AlertTriangle className="w-4 h-4" />}
            {toast.type === 'success' && <CheckCircle className="w-4 h-4" />}
            {toast.type === 'info' && <HelpCircle className="w-4 h-4" />}
            <span className="text-sm">{toast.message}</span>
            <button 
              onClick={() => setToast(null)}
              className="ml-2 p-0.5 rounded hover:bg-white/10"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {/* Simulation Progress Overlay */}
        {isSimulating && (
          <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
            <div className="text-center">
              <Loader2 className="w-8 h-8 animate-spin text-cyan-400 mx-auto mb-2" />
              <p className="text-sm text-gray-300">Running Simulation...</p>
              <p className="text-xs text-gray-500 mt-1">Calculating fluid networks</p>
            </div>
          </div>
        )}
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

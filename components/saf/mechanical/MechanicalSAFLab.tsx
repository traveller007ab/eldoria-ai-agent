/**
 * Mechanical SAF Lab v2.0 - Main Container
 * Professional mechanical engineering workbench.
 */

import React, { useEffect, useCallback, useState } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  useReactFlow,
  ConnectionLineType,
  Panel,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Home,
  Save,
  RotateCcw,
  Redo2,
  Undo2,
  Play,
  Download,
  Settings,
  Plus,
  FileText,
} from 'lucide-react';

import { useMechanicalSAFStore } from './core/store';
import { NODE_TYPES, EDGE_TYPES, componentToNode, connectionToEdge, minimapNodeColor } from './ui/canvas/MechanicalCanvas';
import { ComponentPalette } from './ui/palette/ComponentPalette';
import { PropertiesPanel } from './ui/properties/PropertiesPanel';
import { Blueprint, MechanicalDomain, ComponentInstance } from './types';

// ============================================================================
// MAIN CONTAINER PROPS
// ============================================================================

interface MechanicalSAFLabProps {
  onBack?: () => void;
}

// ============================================================================
// HELPER COMPONENTS
// ============================================================================

const HeaderToolbar: React.FC = () => {
  const {
    blueprint,
    isSimulating,
    lastSimulationResult,
    saveBlueprint,
    exportBlueprint,
    runSimulation,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useMechanicalSAFStore();
  
  return (
    <div className="h-12 bg-black/60 border-b border-white/10 flex items-center justify-between px-4">
      <div className="flex items-center gap-3">
        <span className="font-bold text-cyan-400 tracking-wider text-sm">MECH SAF LAB v2.0</span>
        {blueprint && (
          <>
            <span className="text-xs text-gray-500">|</span>
            <span className="text-sm text-gray-300">{blueprint.name}</span>
          </>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {/* Undo/Redo */}
        <button
          onClick={undo}
          disabled={!canUndo()}
          className={`p-1.5 rounded transition-colors ${
            canUndo() ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Undo (Ctrl+Z)"
        >
          <Undo2 className="w-4 h-4" />
        </button>
        <button
          onClick={redo}
          disabled={!canRedo()}
          className={`p-1.5 rounded transition-colors ${
            canRedo() ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'
          }`}
          title="Redo (Ctrl+Y)"
        >
          <Redo2 className="w-4 h-4" />
        </button>
        
        <div className="w-px h-5 bg-gray-700" />
        
        {/* Stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400 bg-black/30 px-3 py-1 rounded-lg">
          {blueprint && (
            <>
              <span>
                <span className="text-cyan-400 font-bold">{blueprint.components.length}</span> Components
              </span>
              <span className="text-white/20">|</span>
              <span>
                <span className="text-purple-400 font-bold">{blueprint.connections.length}</span> Connections
              </span>
            </>
          )}
          {lastSimulationResult && (
            <>
              <span className="text-white/20">|</span>
              <span className="text-emerald-400">
                {lastSimulationResult.status === 'converged' ? '✓ Simulated' : '⚠ Error'}
              </span>
            </>
          )}
        </div>
        
        <div className="w-px h-5 bg-gray-700" />
        
        {/* Run Simulation */}
        <button
          onClick={() => runSimulation()}
          disabled={isSimulating}
          className={`
            flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors
            ${isSimulating 
              ? 'bg-yellow-500/20 text-yellow-400 cursor-wait' 
              : 'bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30'
            }
          `}
        >
          <Play className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Run'}
        </button>
        
        {/* Save */}
        <button
          onClick={saveBlueprint}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Save (Ctrl+S)"
        >
          <Save className="w-4 h-4" />
        </button>
        
        {/* Export */}
        <button
          onClick={() => exportBlueprint('json')}
          className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors"
          title="Export"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};

const FooterBar: React.FC = () => {
  const { blueprint, lastSimulationResult } = useMechanicalSAFStore();
  
  return (
    <div className="h-6 bg-black/40 border-t border-white/5 flex items-center justify-between px-4 text-[10px] text-gray-500">
      <div className="flex items-center gap-4">
        {blueprint && (
          <span>
            Last updated: {blueprint.updatedAt.toLocaleTimeString()}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <span>Drag components from palette to add</span>
        <span>|</span>
        <span>Connect ports by dragging between them</span>
        {lastSimulationResult && (
          <>
            <span>|</span>
            <span className="text-green-400">
              Sim: {(lastSimulationResult.convergenceTime / 1000).toFixed(3)}s
            </span>
          </>
        )}
      </div>
    </div>
  );
};

// ============================================================================
// MAIN CONTENT COMPONENT
// ============================================================================

const MechanicalSAFLabContent: React.FC<MechanicalSAFLabProps> = ({ onBack }) => {
  const {
    blueprint,
    components,
    selectedComponentId,
    activeDomain,
    snapToGrid,
    showGrid,
    isSimulating,
    createBlueprint,
    loadBlueprint,
    addComponent,
    removeComponent,
    updateComponentParameter,
    selectComponent,
    addConnection,
    setActiveDomain,
    setSnapToGrid,
  } = useMechanicalSAFStore();
  
  const [showProperties, setShowProperties] = useState(true);
  const { screenToFlowPosition } = useReactFlow();
  
  // Create default blueprint on mount
  useEffect(() => {
    if (!blueprint) {
      createBlueprint('New System', 'fluid');
    }
  }, [blueprint, createBlueprint]);
  
  // Convert store state to ReactFlow format
  const nodes = useCallback(() => {
    if (!blueprint) return [];
    
    const nodeList: any[] = [];
    for (const [id, component] of components) {
      const instance = component.createInstance();
      const definition = component.definition;
      nodeList.push(componentToNode(instance, definition));
    }
    return nodeList;
  }, [blueprint, components]);
  
  const edges = useCallback(() => {
    if (!blueprint) return [];
    return blueprint.connections.map(connectionToEdge);
  }, [blueprint]);
  
  // Handle node click
  const handleNodeClick = useCallback((_: any, node: any) => {
    selectComponent(node.id);
  }, [selectComponent]);
  
  // Handle pane click (deselect)
  const handlePaneClick = useCallback(() => {
    selectComponent(null);
  }, [selectComponent]);
  
  // Handle connection
  const handleConnect = useCallback((params: any) => {
    if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) {
      return;
    }
    
    addConnection({
      sourceComponentId: params.source,
      sourcePortId: params.sourceHandle,
      targetComponentId: params.target,
      targetPortId: params.targetHandle,
      type: 'fluid',
    });
  }, [addConnection]);
  
  // Handle drag and drop from palette
  const handleDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    
    const definitionId = event.dataTransfer.getData('application/mech-saf/componentId');
    if (!definitionId) return;
    
    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });
    
    addComponent(definitionId, position);
  }, [addComponent, screenToFlowPosition]);
  
  const handleDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) {
        return;
      }
      
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedComponentId) {
          removeComponent(selectedComponentId);
          selectComponent(null);
        }
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // Save is handled in store
      }
      
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        // Undo is handled in store
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedComponentId, removeComponent, selectComponent]);
  
  if (!blueprint) {
    return (
      <div className="h-full flex items-center justify-center bg-gray-950">
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-cyan-500/20 flex items-center justify-center">
            <Settings className="w-8 h-8 text-cyan-400" />
          </div>
          <p className="text-gray-400">Loading Mechanical SAF Lab...</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Header */}
      <HeaderToolbar />
      
      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Component Palette */}
        <ComponentPalette
          selectedDomain={activeDomain}
          onSelectDomain={setActiveDomain}
          onAddComponent={addComponent}
        />
        
        {/* Graph Canvas */}
        <div 
          className="flex-1 relative"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
        >
          <ReactFlow
            nodes={nodes()}
            edges={edges()}
            onNodeClick={handleNodeClick}
            onPaneClick={handlePaneClick}
            onConnect={handleConnect}
            nodeTypes={NODE_TYPES}
            edgeTypes={EDGE_TYPES}
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
              nodeColor={minimapNodeColor}
            />
            
            {/* Empty State */}
            {blueprint.components.length === 0 && (
              <Panel position="top-center" style={{ top: '50%' }}>
                <div className="text-center">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/50 flex items-center justify-center">
                    <Plus className="w-8 h-8 text-gray-600" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-400 mb-2">No Components Yet</h3>
                  <p className="text-sm text-gray-600">
                    Drag components from the palette to get started
                  </p>
                </div>
              </Panel>
            )}
          </ReactFlow>
          
          {/* Simulation Overlay */}
          {isSimulating && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center backdrop-blur-sm">
              <div className="text-center">
                <div className="w-8 h-8 mx-auto mb-2 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-gray-300">Running Simulation...</p>
              </div>
            </div>
          )}
        </div>
        
        {/* Properties Panel */}
        {showProperties && (
          <PropertiesPanel
            isOpen={!!selectedComponentId}
            onClose={() => setShowProperties(false)}
          />
        )}
      </div>
      
      {/* Footer */}
      <FooterBar />
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const MechanicalSAFLab: React.FC<MechanicalSAFLabProps> = (props) => {
  return (
    <ReactFlowProvider>
      <MechanicalSAFLabContent {...props} />
    </ReactFlowProvider>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default MechanicalSAFLab;

/**
 * Unified SAF Lab - Main Container
 * Merges v1 AI features with v2 physics engine in a modern UI
 */

import React, { useEffect, useCallback, useState, useMemo } from 'react';
import ReactFlow, {
  ReactFlowProvider,
  Controls,
  Background,
  MiniMap,
  Panel,
  ConnectionLineType,
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Home, Save, RotateCcw, Redo2, Undo2, Play, Download, Settings,
  Plus, FileText, Search, ChevronDown, ChevronRight, Layers,
  Zap, Thermometer, Settings as SettingsIcon, Activity, BookOpen,
  History, GitBranch, Clock, Brain, BarChart3, FileJson, FileCode,
  X, Maximize2, Minimize2, Layout, Grid3X3, Eye, EyeOff, Server, Wand2
} from 'lucide-react';

// Mechanical Imports
import { useMechanicalSAFStore } from '../mechanical/core/store';
// import { COMPONENT_CATALOG } from '../mechanical/components/fluid'; // Removed in favor of unified catalog
import { DOMAIN_CONFIG, COMPONENT_GROUPS, UNIFIED_CATALOG } from './catalog'; // Ensure catalog.ts is in unified folder
import { exportToCSV, downloadJSON } from '../mechanical/services/export';
import { exportToModelica } from '../mechanical/services/export';
import {
  NODE_TYPES,
  EDGE_TYPES,
  componentToNode,
  connectionToEdge,
  minimapNodeColor
} from '../mechanical/ui/canvas/MechanicalCanvas';
import { PropertiesPanel } from '../mechanical/ui/properties/PropertiesPanel';

// Original SAF Imports
import { useSAFStore } from '../../../stores/useSAFStore';
import { SAFNodeGraph } from '../SAFNodeGraph';
import { SAFAIExplainer } from '../SAFAIExplainer';
import { SAFParameterEditor } from '../SAFParameterEditor';
import { GenesisPromptInput } from '../GenesisPromptInput';
import { SimulationGraphPanel } from '../SimulationGraphPanel';

import type { UnifiedDomain } from './catalog';
import type { ComponentDefinition } from '../mechanical/types';

// ============================================================================
// MAIN CONTAINER
// ============================================================================

export const UnifiedSAFLab: React.FC = () => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="h-screen w-screen bg-gray-900 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-cyan-500"></div>
      </div>
    );
  }

  return (
    <ReactFlowProvider>
      <UnifiedSAFLabContent />
    </ReactFlowProvider>
  );
};

// ============================================================================
// MAIN CONTENT
// ============================================================================

const UnifiedSAFLabContent: React.FC = () => {
  // Mode State
  const [labMode, setLabMode] = useState<'mechanical' | 'architect'>('mechanical');

  // Mechanical Store
  const mechStore = useMechanicalSAFStore();
  const { screenToFlowPosition } = useReactFlow();

  // Architecture Store (Original)
  // We use the hook directly. Note: Original SAFNodeGraph might use its own hook if not passed props,
  // but here we control it via props from this store.
  const archStore = useSAFStore();

  // Local UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  const [showProperties, setShowProperties] = useState(true);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [sidebarTab, setSidebarTab] = useState<'components' | 'templates' | 'versions' | 'ai'>('components');

  // Mechanical Flow State (Controlled)
  const [mechNodes, setMechNodes] = useState<Node[]>([]);
  const [mechEdges, setMechEdges] = useState<Edge[]>([]);

  // --------------------------------------------------------------------------
  // MECHANICAL STATE SYNC
  // --------------------------------------------------------------------------

  // Sync Stores to ReactFlow (Mechanical)
  useEffect(() => {
    if (labMode !== 'mechanical') return;
    if (!mechStore.blueprint) {
      mechStore.createBlueprint('New System', 'fluid');
      return;
    }

    const newNodes: Node[] = [];
    const newEdges: Edge[] = [];

    // Convert Components to Nodes
    mechStore.components.forEach((component) => {
      const instance = component.createInstance();
      // Update selection state based on store
      instance.isSelected = mechStore.selectedComponentId === instance.id;

      const defId = component.getDefinitionId();
      const entry = UNIFIED_CATALOG[defId];
      if (entry) {
        newNodes.push(componentToNode(instance, entry.definition));
      }
    });

    // Convert Connections to Edges
    mechStore.blueprint.connections.forEach((conn) => {
      newEdges.push(connectionToEdge(conn));
    });

    setMechNodes(newNodes);
    setMechEdges(newEdges);
  }, [
    labMode,
    mechStore.blueprint,
    mechStore.components,
    mechStore.selectedComponentId,
    mechStore.createBlueprint
  ]);

  // --------------------------------------------------------------------------
  // HANDLERS
  // --------------------------------------------------------------------------

  // ARCHITECTURE: Properties
  const handleArchParameterChange = useCallback((id: string, name: string, val: string | number) => {
    archStore.updateParameter(id, name, val);
  }, [archStore]);

  // MECHANICAL: Drag/Drop
  const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
    e.dataTransfer.setData('application/mech-saf/componentId', component.id);
    e.dataTransfer.effectAllowed = 'copy';
  };

  const onMechDrop = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    if (labMode !== 'mechanical') return;

    const definitionId = event.dataTransfer.getData('application/mech-saf/componentId');
    if (!definitionId) return;

    const position = screenToFlowPosition({
      x: event.clientX,
      y: event.clientY,
    });

    mechStore.addComponent(definitionId, position);
  }, [mechStore, labMode, screenToFlowPosition]);

  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
  }, []);

  // MECHANICAL: Selection
  const onMechNodeClick = useCallback((_: any, node: Node) => {
    mechStore.selectComponent(node.id);
  }, [mechStore]);

  const onMechPaneClick = useCallback(() => {
    mechStore.selectComponent(null);
  }, [mechStore]);

  // MECHANICAL: Connection
  const onMechConnect = useCallback((params: any) => {
    if (!params.source || !params.target || !params.sourceHandle || !params.targetHandle) return;
    mechStore.addConnection({
      sourceComponentId: params.source,
      sourcePortId: params.sourceHandle,
      targetComponentId: params.target,
      targetPortId: params.targetHandle,
      type: 'fluid',
    });
  }, [mechStore]);

  // --------------------------------------------------------------------------
  // HEADER RENDERER
  // --------------------------------------------------------------------------

  const renderHeader = () => (
    <header className="h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-50">
      {/* Left: Branding & Mode Switch */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${labMode === 'mechanical' ? 'bg-gradient-to-br from-cyan-500 to-blue-600' : 'bg-gradient-to-br from-purple-500 to-pink-600'}`}>
            <Activity className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="font-bold text-sm text-white tracking-wide">
              {labMode === 'mechanical' ? 'MECH SAF LAB' : 'SAF ARCHITECT'}
            </h1>
            <p className="text-xs text-gray-500">Unified Edition</p>
          </div>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        {/* Mode Toggles */}
        <div className="flex bg-gray-800 rounded-lg p-1">
          <button
            onClick={() => setLabMode('mechanical')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${labMode === 'mechanical' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Mechanical
          </button>
          <button
            onClick={() => setLabMode('architect')}
            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors ${labMode === 'architect' ? 'bg-gray-700 text-white shadow' : 'text-gray-400 hover:text-white'}`}
          >
            Architect
          </button>
        </div>

        {/* Domain Selector (Mech Only) */}
        {labMode === 'mechanical' && (
          <div className="relative ml-2">
            <button
              onClick={() => setShowDomainMenu(!showDomainMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <span className="text-lg">{DOMAIN_CONFIG[mechStore.activeDomain as UnifiedDomain]?.icon || '🌐'}</span>
              <span className="text-sm">{DOMAIN_CONFIG[mechStore.activeDomain as UnifiedDomain]?.name || 'All Domains'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            {/* Dropdown - Keeping simple for now */}
          </div>
        )}
      </div>

      {/* Center: Status / Title */}
      <div className="flex items-center gap-3">
        {labMode === 'mechanical' && mechStore.blueprint && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
            <FileText className="w-4 h-4 text-gray-400" />
            <span className="text-sm">{mechStore.blueprint.name}</span>
          </div>
        )}
        {labMode === 'architect' && archStore.blueprint && (
          <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
            <Brain className="w-4 h-4 text-purple-400" />
            <span className="text-sm">{archStore.blueprint.project_name}</span>
          </div>
        )}
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 mr-2">
          <button
            onClick={labMode === 'mechanical' ? mechStore.undo : archStore.undo}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-300 transition-colors"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={labMode === 'mechanical' ? mechStore.redo : archStore.redo}
            className="p-1.5 rounded hover:bg-gray-800 text-gray-300 transition-colors"
          >
            <Redo2 className="w-4 h-4" />
          </button>
        </div>

        <div className="h-6 w-px bg-gray-700" />

        <button
          onClick={labMode === 'mechanical' ? () => mechStore.runSimulation() : () => archStore.runSimulation()}
          className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all ${(labMode === 'mechanical' ? mechStore.isSimulating : false)
            ? 'bg-yellow-500/20 text-yellow-400'
            : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
        >
          <Play className="w-4 h-4" />
          <span>Run</span>
        </button>

        <button
          onClick={() => setShowProperties(!showProperties)}
          className={`p-1.5 rounded transition-colors ${showProperties ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
        >
          <SettingsIcon className="w-4 h-4" />
        </button>
      </div>
    </header>
  );

  // --------------------------------------------------------------------------
  // RENDER
  // --------------------------------------------------------------------------

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {renderHeader()}

      <div className="flex-1 flex overflow-hidden">
        {/* SIDEBAR (Dynamic based on Mode) */}
        <aside className="w-72 bg-gray-900/50 border-r border-gray-800 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setSidebarTab('components')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${sidebarTab === 'components' ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-400 hover:text-white'}`}
            >
              Components
            </button>
            {labMode === 'architect' && (
              <button
                onClick={() => setSidebarTab('ai')}
                className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${sidebarTab === 'ai' ? 'text-purple-400 border-b-2 border-purple-400' : 'text-gray-400 hover:text-white'}`}
              >
                AI
              </button>
            )}
          </div>

          {/* Sidebar Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {sidebarTab === 'components' && (
              <div className="space-y-4">
                {labMode === 'mechanical' && Object.entries(COMPONENT_GROUPS).map(([groupKey, group]) => (
                  <div key={groupKey} className="mb-4">
                    <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">{group.name}</h3>
                    {Object.values(UNIFIED_CATALOG).filter(c => group.components.includes(c.definition.id)).map(c => (
                      <div
                        key={c.definition.id}
                        draggable
                        onDragStart={(e) => handleDragStart(e, c.definition)}
                        className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-grab mb-1"
                      >
                        <div className="w-6 h-6 rounded flex items-center justify-center bg-white/5 text-xs">{c.definition.id.slice(0, 2)}</div>
                        <span className="text-sm">{c.definition.name}</span>
                      </div>
                    ))}
                  </div>
                ))}

                {labMode === 'architect' && (
                  <div className="text-sm text-gray-400 italic text-center mt-4">
                    Use the Quick Add menu (Double Click) or the internal palette on the canvas.
                  </div>
                )}
              </div>
            )}

            {sidebarTab === 'ai' && labMode === 'architect' && (
              <div className="prose prose-invert prose-sm">
                <p className="text-gray-400">Select a component to get AI insights.</p>
                {archStore.selectedId && archStore.blueprint && (
                  <SAFAIExplainer
                    component={archStore.blueprint.components.find(c => c.id === archStore.selectedId)}
                    blueprint={archStore.blueprint}
                  />
                )}
              </div>
            )}
          </div>
        </aside>

        {/* MAIN CANVAS AREA */}
        <main
          className="flex-1 relative bg-gray-950 flex flex-col"
          onDrop={onMechDrop}
          onDragOver={onDragOver}
        >
          {labMode === 'mechanical' ? (
            <ReactFlow
              nodes={mechNodes}
              edges={mechEdges}
              onNodeClick={onMechNodeClick}
              onPaneClick={onMechPaneClick}
              onConnect={onMechConnect}
              nodeTypes={NODE_TYPES}
              edgeTypes={EDGE_TYPES}
              connectionLineType={ConnectionLineType.SmoothStep}
              fitView
              snapToGrid={mechStore.snapToGrid}
              snapGrid={[20, 20]}
            >
              <Background color="#374151" gap={20} size={1} />
              <Controls className="bg-gray-800 border-gray-700" />
              <MiniMap className="bg-gray-900 rounded-lg border border-gray-800" nodeColor={minimapNodeColor} />
              <Panel position="top-right">
                {/* Overlays can go here */}
              </Panel>

              {mechNodes.length === 0 && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <div className="text-center">
                    <h3 className="text-lg font-medium text-gray-400 mb-1">No components</h3>
                    <p className="text-sm text-gray-600">Drag items from the sidebar</p>
                  </div>
                </div>
              )}
            </ReactFlow>
          ) : (
            <div className="flex-1 relative h-full w-full">
              {/* Render Original SAF Lab Graph */}
              {archStore.blueprint ? (
                <SAFNodeGraph
                  blueprint={archStore.blueprint}
                  selectedNodeId={archStore.selectedId}
                  onSelectNode={archStore.selectNode}
                  onNodeDragStop={(id, pos) => archStore.updateNodePosition(id, pos)}
                  onConnect={(params) => params.source && params.target && archStore.connectNodes(params.source, params.target)}
                  onAddNode={archStore.addNode}
                  onDropComponent={archStore.addComponentFromPalette}
                  onAskAI={() => setSidebarTab('ai')}
                  expandedNodes={[]}
                  onToggleExpand={() => { }}
                  constraintViolations={archStore.validationIssues.map(i => i.targetId)}
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center p-8">
                  <GenesisPromptInput
                    onBlueprintGenerated={(bp, name) => {
                      archStore.loadBlueprint({ ...bp, project_name: name });
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </main>

        {/* RIGHT PROPERTY PANEL */}
        {showProperties && (
          <aside className="w-80 bg-gray-900/50 border-l border-gray-800 flex flex-col shrink-0">
            {labMode === 'architect' ? (
              <>
                <div className="p-4 border-b border-gray-800"><h3 className="font-semibold">Properties</h3></div>
                <div className="flex-1 overflow-y-auto p-4">
                  {archStore.selectedId ? (
                    <SAFParameterEditor
                      component={archStore.blueprint?.components.find(c => c.id === archStore.selectedId)}
                      onParameterChange={handleArchParameterChange}
                      onAddParameter={archStore.addParameter}
                    />
                  ) : (
                    <div className="text-gray-500 text-sm text-center">Select a component.</div>
                  )}
                </div>

                {/* Simulation Graph for Architect */}
                {archStore.blueprint?.last_simulation && (
                  <div className="h-48 border-t border-gray-800">
                    <SimulationGraphPanel blueprint={archStore.blueprint} simulationHistory={archStore.simulationHistory} />
                  </div>
                )}
              </>
            ) : (
              /* Mechanical Properties Panel */
              <PropertiesPanel
                isOpen={!!mechStore.selectedComponentId}
                onClose={() => setShowProperties(false)}
              />
            )}
          </aside>
        )}

      </div>

      {/* FOOTER */}
      <footer className="h-8 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0">
        <div>
          {labMode === 'architect' ? `${archStore.blueprint?.components?.length || 0} nodes` : `${mechStore.blueprint?.components.length || 0} components`}
        </div>
      </footer>
    </div>
  );
};

export default UnifiedSAFLab;

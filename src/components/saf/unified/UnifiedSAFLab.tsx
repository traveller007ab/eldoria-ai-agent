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
  useReactFlow,
  ConnectionLineType,
  Node,
  Edge,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
  NodeChange,
  EdgeChange,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  Home, Save, RotateCcw, Redo2, Undo2, Play, Download, Settings,
  Plus, FileText, Search, ChevronDown, ChevronRight, Layers,
  Zap, Thermometer, Settings as SettingsIcon, Activity, BookOpen,
  History, GitBranch, Clock, Brain, BarChart3, FileJson, FileCode,
  X, Maximize2, Minimize2, Layout, Grid3X3, Eye, EyeOff
} from 'lucide-react';

import { useMechanicalSAFStore } from '../mechanical-v2/core/store';
import { COMPONENT_CATALOG } from '../mechanical-v2/components/fluid';
import { EXTENDED_COMPONENT_CATALOG } from '../mechanical-v2/components/extended';
import { DOMAIN_CONFIG, COMPONENT_GROUPS, getComponentsByDomain, searchComponents, getComponentEntry } from './catalog';
import { exportToJSON, exportToCSV, exportToModelica, downloadJSON } from '../mechanical-v2/services/export';
import { Thermodynamics } from '../mechanical-v2/core/thermodynamics';
import { Optimization } from '../mechanical-v2/core/optimization';

import type { UnifiedDomain } from './catalog';
import type { ComponentDefinition } from '../mechanical-v2/types';
import type { Blueprint } from '../mechanical-v2/types';

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
  const {
    blueprint,
    setBlueprint,
    activeDomain,
    setActiveDomain,
    showProperties,
    setShowProperties,
    showVersionHistory,
    setShowVersionHistory,
    showAnalysis,
    setShowAnalysis,
    sidebarTab,
    setSidebarTab,
    isSimulating,
    runSimulation,
    saveBlueprint,
    undo,
    redo,
    canUndo,
    canRedo,
    createVersion,
    getVersions,
  } = useMechanicalSAFStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [showDomainMenu, setShowDomainMenu] = useState(false);
  
  // Filter components based on search and domain
  const filteredComponents = useMemo(() => {
    let comps = Object.values(COMPONENT_CATALOG);
    
    if (activeDomain !== 'all') {
      comps = comps.filter(c => c.domain === activeDomain);
    }
    
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      comps = comps.filter(c => 
        c.name.toLowerCase().includes(query) ||
        c.id.toLowerCase().includes(query) ||
        c.tags.some(t => t.toLowerCase().includes(query))
      );
    }
    
    return comps;
  }, [activeDomain, searchQuery]);

  // Get domain colors
  const getDomainColor = (domain: string) => {
    return DOMAIN_CONFIG[domain as UnifiedDomain]?.color || '#6b7280';
  };

  // Handle drag start
  const handleDragStart = (e: React.DragEvent, component: ComponentDefinition) => {
    e.dataTransfer.setData('application/reactflow', component.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  // Handle drop
  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    const componentId = e.dataTransfer.getData('application/reactflow');
    
    if (!componentId) return;
    
    const position = {
      x: e.clientX - 300,
      y: e.clientY - 100,
    };
    
    console.log('Dropped component:', componentId, 'at', position);
  }, []);

  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }, []);

  return (
    <div className="h-screen w-screen bg-gray-950 text-white flex flex-col overflow-hidden">
      {/* HEADER */}
      <header className="h-14 bg-gray-900/80 backdrop-blur-md border-b border-gray-800 flex items-center justify-between px-4 shrink-0 z-50">
        {/* Left Section */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm text-white tracking-wide">MECH SAF LAB</h1>
              <p className="text-xs text-gray-500">Unified Edition</p>
            </div>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Domain Selector */}
          <div className="relative">
            <button
              onClick={() => setShowDomainMenu(!showDomainMenu)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            >
              <span className="text-lg">{DOMAIN_CONFIG[activeDomain as UnifiedDomain]?.icon || '🌐'}</span>
              <span className="text-sm">{DOMAIN_CONFIG[activeDomain as UnifiedDomain]?.name || 'All Domains'}</span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            
            {showDomainMenu && (
              <div className="absolute top-full left-0 mt-1 w-56 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 z-50">
                <button
                  onClick={() => { setActiveDomain('all' as any); setShowDomainMenu(false); }}
                  className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-700 ${activeDomain === 'all' ? 'text-cyan-400' : ''}`}
                >
                  <span>🌐</span>
                  <span>All Domains</span>
                </button>
                {Object.entries(DOMAIN_CONFIG).map(([key, config]) => (
                  <button
                    key={key}
                    onClick={() => { setActiveDomain(key as any); setShowDomainMenu(false); }}
                    className={`w-full px-3 py-2 text-left flex items-center gap-2 hover:bg-gray-700 ${activeDomain === key ? 'text-cyan-400' : ''}`}
                  >
                    <span>{config.icon}</span>
                    <span>{config.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        
        {/* Center Section */}
        <div className="flex items-center gap-3">
          {blueprint && (
            <>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-800/50 rounded-lg">
                <FileText className="w-4 h-4 text-gray-400" />
                <span className="text-sm">{blueprint.name}</span>
                <span className="text-xs text-gray-500">{blueprint.components.length} components</span>
              </div>
              <button
                onClick={createVersion}
                className="p-1.5 rounded hover:bg-gray-800 text-gray-400 hover:text-white transition-colors"
                title="Save Version"
              >
                <GitBranch className="w-4 h-4" />
              </button>
            </>
          )}
        </div>
        
        {/* Right Section - Actions */}
        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <div className="flex items-center gap-1 mr-2">
            <button
              onClick={undo}
              disabled={!canUndo()}
              className={`p-1.5 rounded transition-colors ${
                canUndo() ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Undo (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={redo}
              disabled={!canRedo()}
              className={`p-1.5 rounded transition-colors ${
                canRedo() ? 'hover:bg-gray-800 text-gray-300' : 'text-gray-600 cursor-not-allowed'
              }`}
              title="Redo (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>
          </div>
          
          <div className="h-6 w-px bg-gray-700" />
          
          {/* Simulation */}
          <button
            onClick={runSimulation}
            disabled={isSimulating}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-lg font-medium transition-all ${
              isSimulating
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'bg-cyan-500 hover:bg-cyan-400 text-black'
            }`}
          >
            {isSimulating ? (
              <>
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                <span>Running...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4" />
                <span>Run</span>
              </>
            )}
          </button>
          
          {/* Export */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors">
              <Download className="w-4 h-4" />
              <span className="text-sm">Export</span>
            </button>
            <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg shadow-xl border border-gray-700 py-1 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
              <button onClick={() => blueprint && downloadJSON(blueprint)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2">
                <FileJson className="w-4 h-4 text-orange-400" />
                <span>Export JSON</span>
              </button>
              <button onClick={() => blueprint && exportToCSV(blueprint)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-green-400" />
                <span>Export CSV</span>
              </button>
              <button onClick={() => blueprint && exportToModelica(blueprint)} className="w-full px-3 py-2 text-left text-sm hover:bg-gray-700 flex items-center gap-2">
                <FileCode className="w-4 h-4 text-blue-400" />
                <span>Export Modelica</span>
              </button>
            </div>
          </div>
          
          {/* View Toggles */}
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`p-1.5 rounded transition-colors ${showProperties ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Properties Panel"
          >
            <SettingsIcon className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowVersionHistory(!showVersionHistory)}
            className={`p-1.5 rounded transition-colors ${showVersionHistory ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Version History"
          >
            <History className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowAnalysis(!showAnalysis)}
            className={`p-1.5 rounded transition-colors ${showAnalysis ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:bg-gray-800'}`}
            title="Analysis"
          >
            <BarChart3 className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* MAIN CONTENT */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR */}
        <aside className="w-72 bg-gray-900/50 border-r border-gray-800 flex flex-col shrink-0">
          {/* Tabs */}
          <div className="flex border-b border-gray-800">
            <button
              onClick={() => setSidebarTab('components')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                sidebarTab === 'components' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Components
            </button>
            <button
              onClick={() => setSidebarTab('templates')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                sidebarTab === 'templates' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Templates
            </button>
            <button
              onClick={() => setSidebarTab('versions')}
              className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
                sidebarTab === 'versions' 
                  ? 'text-cyan-400 border-b-2 border-cyan-400' 
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              History
            </button>
          </div>
          
          {/* Search */}
          <div className="p-3 border-b border-gray-800">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search components..."
                className="w-full pl-9 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-sm focus:outline-none focus:border-cyan-500 transition-colors"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="flex-1 overflow-y-auto p-3">
            {sidebarTab === 'components' && (
              <div className="space-y-4">
                {Object.entries(COMPONENT_GROUPS).map(([groupKey, group]) => {
                  const groupComponents = filteredComponents.filter(c => 
                    group.components.includes(c.id)
                  );
                  if (groupComponents.length === 0) return null;
                  
                  return (
                    <div key={groupKey}>
                      <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2 px-2">
                        {group.name}
                      </h3>
                      <div className="space-y-1">
                        {groupComponents.map(component => (
                          <div
                            key={component.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, component)}
                            className="flex items-center gap-3 p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 cursor-grab active:cursor-grabbing transition-colors group"
                          >
                            <div 
                              className="w-8 h-8 rounded-lg flex items-center justify-center"
                              style={{ backgroundColor: `${getDomainColor(component.domain)}20` }}
                            >
                              <span className="text-sm">{DOMAIN_CONFIG[component.domain as any]?.icon || '⚙️'}</span>
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-gray-200 truncate group-hover:text-white">
                                {component.name}
                              </p>
                              <p className="text-xs text-gray-500 truncate">
                                {component.id.split('.').pop()}
                              </p>
                            </div>
                            <Plus className="w-4 h-4 text-gray-600 group-hover:text-cyan-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
            
            {sidebarTab === 'templates' && (
              <div className="space-y-3">
                <div className="p-4 rounded-xl bg-gradient-to-br from-cyan-500/10 to-blue-500/10 border border-cyan-500/20">
                  <h3 className="font-semibold text-white mb-1">Quick Start</h3>
                  <p className="text-sm text-gray-400 mb-3">Choose a template to get started</p>
                  <div className="flex gap-2">
                    <button className="flex-1 px-3 py-2 bg-cyan-500 hover:bg-cyan-400 text-black rounded-lg text-sm font-medium transition-colors">
                      New Project
                    </button>
                    <button className="px-3 py-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-sm transition-colors">
                      Examples
                    </button>
                  </div>
                </div>
              </div>
            )}
            
            {sidebarTab === 'versions' && (
              <div className="space-y-2">
                {getVersions().slice(-5).reverse().map((version: any) => (
                  <div key={version.id} className="p-3 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <Clock className="w-4 h-4 text-gray-500" />
                      <span className="text-sm text-gray-400">
                        {new Date(version.timestamp).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-sm text-white">{version.description}</p>
                    <p className="text-xs text-gray-500 mt-1">{version.author}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </aside>

        {/* CANVAS AREA */}
        <main 
          className="flex-1 relative bg-gray-950"
          onDrop={onDrop}
          onDragOver={onDragOver}
        >
          <ReactFlow
            nodes={nodes}
            edges={edges}
            onNodesChange={(changes: NodeChange[]) => setNodes(applyNodeChanges(changes, nodes))}
            onEdgesChange={(changes: EdgeChange[]) => setEdges(applyEdgeChanges(changes, edges))}
            onConnect={(params) => setEdges(addEdge(params, edges))}
            connectionLineType={ConnectionLineType.SmoothStep}
            fitView
          >
            <Background color="#374151" gap={20} size={1} />
            <Controls className="bg-gray-800 border-gray-700" />
            <MiniMap 
              nodeColor={(node) => {
                const entry = getComponentEntry(node.id);
                return entry ? getDomainColor(entry.unifiedDomain) : '#6b7280';
              }}
              maskColor="rgba(17, 24, 39, 0.6)"
              className="bg-gray-900 rounded-lg border border-gray-800"
            />
            
            <Panel position="top-right" className="flex gap-2">
              <button className="p-2 bg-gray-800/90 backdrop-blur rounded-lg hover:bg-gray-700 transition-colors">
                <Grid3X3 className="w-4 h-4" />
              </button>
              <button className="p-2 bg-gray-800/90 backdrop-blur rounded-lg hover:bg-gray-700 transition-colors">
                <Layout className="w-4 h-4" />
              </button>
            </Panel>
          </ReactFlow>
          
          {/* Empty State */}
          {nodes.length === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800 flex items-center justify-center">
                  <Plus className="w-8 h-8 text-gray-600" />
                </div>
                <h3 className="text-lg font-medium text-gray-400 mb-1">Drag components here</h3>
                <p className="text-sm text-gray-600">Or select a template to get started</p>
              </div>
            </div>
          )}
        </main>

        {/* RIGHT PANEL */}
        {showProperties && (
          <aside className="w-80 bg-gray-900/50 border-l border-gray-800 flex flex-col shrink-0">
            <div className="p-4 border-b border-gray-800">
              <h3 className="font-semibold">Properties</h3>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {selectedNodeId ? (
                <div>
                  <p className="text-sm text-gray-400">Selected: {selectedNodeId}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 text-center py-8">
                  Select a component to edit properties
                </p>
              )}
            </div>
          </aside>
        )}
      </div>

      {/* FOOTER */}
      <footer className="h-8 bg-gray-900/80 border-t border-gray-800 flex items-center justify-between px-4 text-xs text-gray-500 shrink-0">
        <div className="flex items-center gap-4">
          <span>{nodes.length} components</span>
          <span>{edges.length} connections</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Ctrl+Z Undo</span>
          <span>Ctrl+Y Redo</span>
        </div>
      </footer>
    </div>
  );
};

export default UnifiedSAFLab;

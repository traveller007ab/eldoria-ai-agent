/**
 * Mechanical SAF Lab
 * Specialized view for mechanical engineering workbench
 */

import React, { useEffect, useCallback, useState } from 'react';
import { useSAFMechanicalStore } from './store';
import { MechanicalGraphEditor } from './ui/MechanicalGraphEditor';
import { ComponentPalette } from './ui/ComponentPalette';
import { PropertiesPanel } from './ui/PropertiesPanel';
import { Home, Settings, Save, RotateCcw, Redo2, Undo2, Play, FileDown, Layers } from 'lucide-react';

interface MechanicalSAFLabProps {
  onBack?: () => void;
}

export const MechanicalSAFLab: React.FC<MechanicalSAFLabProps> = ({ onBack }) => {
  const {
    name,
    components,
    connections,
    selectedComponentId,
    lastSimulationResult,
    isSimulating,
    activeDomain,
    snapToGrid,
    updatedAt,
    loadBlueprint,
    closeBlueprint,
    addComponent,
    removeComponent,
    updateComponentParameter,
    addConnection,
    removeConnection,
    selectComponent,
    setActiveDomain,
    runSimulation,
    clearSimulation,
    undo,
    redo,
    canUndo,
    canRedo
  } = useSAFMechanicalStore();

  const [showProperties, setShowProperties] = useState(true);
  const [autoSaveTimer, setAutoSaveTimer] = useState<NodeJS.Timeout | null>(null);

  // Auto-save
  useEffect(() => {
    if (components.length > 0) {
      const timer = setTimeout(() => {
        const blueprint = {
          id: 'mech_' + Date.now(),
          name,
          components,
          connections,
          version: '1.0.0',
          createdAt: new Date(),
          updatedAt: new Date()
        };
        localStorage.setItem('mechanical_saf_autosave', JSON.stringify(blueprint));
      }, 2000);
      setAutoSaveTimer(timer);
    }
    return () => {
      if (autoSaveTimer) clearTimeout(autoSaveTimer);
    };
  }, [components, connections, name]);

  // Load saved work
  useEffect(() => {
    const saved = localStorage.getItem('mechanical_saf_autosave');
    if (saved) {
      try {
        const blueprint = JSON.parse(saved);
        loadBlueprint(blueprint);
      } catch (e) {
        console.error('Failed to load saved work:', e);
      }
    }
  }, []);

  const handleSelectComponent = useCallback((id: string | null) => {
    selectComponent(id);
  }, [selectComponent]);

  const handleDrop = useCallback((componentType: string, position: { x: number; y: number }) => {
    // Import dynamically to avoid circular dependencies
    import('./components/catalog').then(({ getComponentTemplate }) => {
      const template = getComponentTemplate(componentType);
      if (template) {
        addComponent({
          ...template,
          id: `mech_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
        } as any, position);
      }
    });
  }, [addComponent]);

  const selectedComponent = components.find(c => c.id === selectedComponentId);

  const handleRunSimulation = useCallback(async () => {
    await runSimulation();
  }, [runSimulation]);

  return (
    <div className="h-full flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
      {/* Header */}
      <div className="shrink-0 h-12 bg-black/60 border-b border-white/10 flex items-center justify-between px-4">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="p-1.5 hover:bg-white/10 rounded text-cyan-400 transition-colors"
              title="Back to SAF Lab"
            >
              <Home className="w-4 h-4" />
            </button>
          )}
          <div className="w-px h-5 bg-gray-700" />
          
          <span className="font-bold text-cyan-400 tracking-wider">MECH SAF LAB</span>
          <span className="text-xs text-gray-500">|</span>
          <span className="text-sm text-gray-300">{name}</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Undo/Redo */}
          <button
            onClick={undo}
            disabled={!canUndo()}
            className={`p-1.5 rounded transition-colors ${canUndo() ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'}`}
            title="Undo (Ctrl+Z)"
          >
            <Undo2 className="w-4 h-4" />
          </button>
          <button
            onClick={redo}
            disabled={!canRedo()}
            className={`p-1.5 rounded transition-colors ${canRedo() ? 'hover:bg-white/10 text-white' : 'text-gray-600 cursor-not-allowed'}`}
            title="Redo (Ctrl+Shift+Z)"
          >
            <Redo2 className="w-4 h-4" />
          </button>
          
          <div className="w-px h-5 bg-gray-700" />

          {/* Stats */}
          <div className="flex items-center gap-3 text-xs text-gray-400 bg-black/30 px-3 py-1 rounded-lg">
            <span>
              <span className="text-cyan-400 font-bold">{components.length}</span> Components
            </span>
            <span className="text-white/20">│</span>
            <span>
              <span className="text-purple-400 font-bold">{connections.length}</span> Connections
            </span>
            <span className="text-white/20">│</span>
            <span className={lastSimulationResult ? 'text-emerald-400' : 'text-gray-500'}>
              {lastSimulationResult ? '✓ Simulated' : 'Unsimulated'}
            </span>
          </div>

          <div className="w-px h-5 bg-gray-700" />

          {/* Run Simulation */}
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
            <Play className="w-4 h-4" />
            {isSimulating ? 'Simulating...' : 'Run'}
          </button>

          {/* Settings */}
          <button
            onClick={() => setShowProperties(!showProperties)}
            className={`p-1.5 rounded transition-colors ${showProperties ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
            title="Toggle Properties Panel"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Component Palette */}
        <ComponentPalette
          onAddComponent={handleDrop}
          selectedDomain={activeDomain}
          onSelectDomain={setActiveDomain}
        />

        {/* Graph Editor */}
        <div className="flex-1">
          <MechanicalGraphEditor
            onSelectComponent={handleSelectComponent}
            onOpenSettings={() => setShowProperties(true)}
          />
        </div>

        {/* Properties Panel */}
        {showProperties && (
          <PropertiesPanel
            isOpen={!!selectedComponent}
            onClose={() => setShowProperties(false)}
          />
        )}
      </div>

      {/* Footer */}
      <div className="shrink-0 h-6 bg-black/40 border-t border-white/5 flex items-center justify-between px-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-4">
          <span>Last updated: {
            updatedAt instanceof Date 
              ? updatedAt.toLocaleTimeString() 
              : new Date(updatedAt).toLocaleTimeString()
          }</span>
          <span>|</span>
          <span>Snap to Grid: {snapToGrid ? 'ON' : 'OFF'}</span>
        </div>
        <div className="flex items-center gap-4">
          <span>Drag components from palette to add</span>
          <span>|</span>
          <span>Connect ports by dragging between them</span>
        </div>
      </div>
    </div>
  );
};

export default MechanicalSAFLab;

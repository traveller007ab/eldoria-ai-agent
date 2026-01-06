/**
 * Mechanical SAF Lab v2.0 - State Management
 * Zustand store for blueprint state, simulation, and UI state.
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import {
  Blueprint,
  ComponentInstance,
  Connection,
  ComponentDefinition,
  SimulationResult,
  SimulationConfiguration,
  SolverConfiguration,
  DEFAULT_SOLVER_CONFIG,
  MechanicalDomain,
  createComponentId,
  BlueprintVersion,
  VersionDiff,
} from '../types';
import { ComponentBase, ComponentFactory } from '../core/ComponentBase';
import { COMPONENT_CATALOG } from '../components/fluid';
import {
  CentrifugalPump,
  StraightPipe,
  ControlValve,
  BallValve,
  ShellTubeHeatExchanger,
} from '../components/fluid';
import { getSimulationWorkerManager, terminateSimulationWorker } from '../workers/workerManager';

// ============================================================================
// STATE TYPES
// ============================================================================

interface MechanicalSAFState {
  // Blueprint Data
  blueprint: Blueprint | null;
  setBlueprint: (blueprint: Blueprint | null) => void;
  
  // Components (runtime instances)
  components: Map<string, ComponentBase>;
  
  // Selection
  selectedComponentId: string | null;
  selectedConnectionId: string | null;
  
  // UI State - Unified Lab Extensions
  activeDomain: MechanicalDomain | 'all';
  setActiveDomain: (domain: MechanicalDomain | 'all') => void;
  showProperties: boolean;
  setShowProperties: (show: boolean) => void;
  showTemplates: boolean;
  setShowTemplates: (show: boolean) => void;
  showVersionHistory: boolean;
  setShowVersionHistory: (show: boolean) => void;
  showAnalysis: boolean;
  setShowAnalysis: (show: boolean) => void;
  sidebarTab: 'components' | 'templates' | 'versions';
  setSidebarTab: (tab: 'components' | 'templates' | 'versions') => void;
  
  // Original UI State
  snapToGrid: boolean;
  showGrid: boolean;
  zoomLevel: number;
  setSnapToGrid: (enabled: boolean) => void;
  setZoomLevel: (level: number) => void;
  
  // Simulation State
  isSimulating: boolean;
  simulationConfig: SolverConfiguration;
  lastSimulationResult: SimulationResult | null;
  
  // History (Undo/Redo)
  history: Blueprint[];
  historyIndex: number;
  
  // Versioning
  versions: BlueprintVersion[];
  
  // Actions
  createBlueprint: (name: string, domain?: MechanicalDomain) => void;
  loadBlueprint: (blueprint: Blueprint) => void;
  saveBlueprint: () => void;
  exportBlueprint: (format: 'json' | 'csv') => void;
  
  addComponent: (definitionId: string, position: { x: number; y: number }) => string | null;
  removeComponent: (id: string) => void;
  updateComponentParameter: (id: string, paramId: string, value: number | string) => void;
  duplicateComponent: (id: string) => string | null;
  
  selectComponent: (id: string | null) => void;
  selectConnection: (id: string | null) => void;
  clearSelection: () => void;
  
  addConnection: (connection: Omit<Connection, 'id'>) => boolean;
  removeConnection: (id: string) => void;
  
  runSimulation: () => Promise<SimulationResult>;
  clearSimulation: () => void;
  
  undo: () => void;
  redo: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;
  
  createVersion: (description?: string) => string | null;
  getVersions: () => BlueprintVersion[];
  getVersion: (versionId: string) => BlueprintVersion | undefined;
  restoreVersion: (versionId: string) => void;
  deleteVersion: (versionId: string) => void;
  compareVersions: (versionId1: string, versionId2: string) => VersionDiff | null;
  exportVersionHistory: () => string;
}

// ============================================================================
// STORE IMPLEMENTATION
// ============================================================================

export const useMechanicalSAFStore = create<MechanicalSAFState>()(
  persist(
    (set, get) => ({
      // Initial State
      blueprint: null,
      components: new Map(),
      selectedComponentId: null,
      selectedConnectionId: null,
      activeDomain: 'all',
      showProperties: false,
      showTemplates: false,
      showVersionHistory: false,
      showAnalysis: false,
      sidebarTab: 'components',
      snapToGrid: true,
      showGrid: true,
      zoomLevel: 1,
      isSimulating: false,
      simulationConfig: DEFAULT_SOLVER_CONFIG,
      lastSimulationResult: null,
      history: [],
      historyIndex: -1,
      versions: [],
      
      // =========================================================================
      // Blueprint Actions
      // =========================================================================
      
      createBlueprint: (name: string, domain: MechanicalDomain = 'fluid') => {
        const blueprint: Blueprint = {
          id: `bp_${Date.now()}`,
          name,
          description: '',
          domain,
          version: '1.0.0',
          components: [],
          connections: [],
          createdAt: new Date(),
          updatedAt: new Date(),
          author: 'User',
        };
        
        set({
          blueprint,
          components: new Map(),
          selectedComponentId: null,
          selectedConnectionId: null,
          lastSimulationResult: null,
          history: [blueprint],
          historyIndex: 0,
        });
      },
      
      loadBlueprint: (blueprint: Blueprint) => {
        const components = new Map<string, ComponentBase>();
        
        // Create component instances
        for (const instance of blueprint.components) {
          const definition = COMPONENT_CATALOG[instance.definitionId];
          if (definition) {
            const component = ComponentFactory.create(definition, instance.position, instance.name);
            component.loadInstance(instance);
            components.set(instance.id, component);
          }
        }
        
        set({
          blueprint,
          components,
          selectedComponentId: null,
          selectedConnectionId: null,
          lastSimulationResult: null,
          history: [blueprint],
          historyIndex: 0,
        });
      },
      
      saveBlueprint: () => {
        const { blueprint, components } = get();
        if (!blueprint) return;
        
        const componentInstances: ComponentInstance[] = [];
        for (const [_, component] of components) {
          componentInstances.push(component.createInstance());
        }
        
        const updatedBlueprint: Blueprint = {
          ...blueprint,
          components: componentInstances,
          updatedAt: new Date(),
        };
        
        set({
          blueprint: updatedBlueprint,
          history: [...get().history.slice(0, get().historyIndex + 1), updatedBlueprint],
          historyIndex: get().historyIndex + 1,
        });
      },
      
      exportBlueprint: (format: 'json' | 'csv') => {
        const { blueprint, components } = get();
        if (!blueprint) return;
        
        const componentInstances: ComponentInstance[] = [];
        for (const [_, component] of components) {
          componentInstances.push(component.createInstance());
        }
        
        const exportData = {
          ...blueprint,
          components: componentInstances,
        };
        
        if (format === 'json') {
          const data = JSON.stringify(exportData, null, 2);
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${blueprint.name.replace(/\s+/g, '_')}.json`;
          a.click();
          URL.revokeObjectURL(url);
        } else if (format === 'csv') {
          let csv = 'ID,Name,Definition,Type,X,Y\n';
          for (const component of componentInstances) {
            csv += `${component.id},${component.name},${component.definitionId},${component.position.x},${component.position.y}\n`;
          }
          const blob = new Blob([csv], { type: 'text/csv' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${blueprint.name.replace(/\s+/g, '_')}.csv`;
          a.click();
          URL.revokeObjectURL(url);
        }
      },
      
      // =========================================================================
      // Component Actions
      // =========================================================================
      
      addComponent: (definitionId: string, position: { x: number; y: number }) => {
        const definition = COMPONENT_CATALOG[definitionId];
        if (!definition) {
          console.warn(`Definition not found: ${definitionId}`);
          return null;
        }
        
        const component = ComponentFactory.create(definition, position);
        const componentId = component.id;
        
        const newComponents = new Map(get().components);
        newComponents.set(componentId, component);
        
        // Save to history
        get().saveBlueprint();
        
        set({
          components: newComponents,
          selectedComponentId: componentId,
        });
        
        return componentId;
      },
      
      removeComponent: (id: string) => {
        const newComponents = new Map(get().components);
        newComponents.delete(id);
        
        // Remove associated connections
        const blueprint = get().blueprint;
        if (blueprint) {
          const filteredConnections = blueprint.connections.filter(
            c => c.sourceComponentId !== id && c.targetComponentId !== id
          );
          
          set({
            components: newComponents,
            blueprint: {
              ...blueprint,
              connections: filteredConnections,
            },
            selectedComponentId: get().selectedComponentId === id ? null : get().selectedComponentId,
          });
        } else {
          set({
            components: newComponents,
            selectedComponentId: get().selectedComponentId === id ? null : get().selectedComponentId,
          });
        }
        
        get().saveBlueprint();
      },
      
      updateComponentParameter: (id: string, paramId: string, value: number | string) => {
        const component = get().components.get(id);
        if (!component) return;
        
        component.setParameterValue(paramId, value);
        
        // Trigger recomputation
        component.compute();
        
        set({
          components: new Map(get().components),
        });
      },
      
      duplicateComponent: (id: string) => {
        const component = get().components.get(id);
        if (!component) return null;
        
        const instance = component.createInstance();
        const newPosition = {
          x: instance.position.x + 50,
          y: instance.position.y + 50,
        };
        
        return get().addComponent(
          component.getDefinitionId(),
          newPosition
        );
      },
      
      // =========================================================================
      // Selection Actions
      // =========================================================================
      
      selectComponent: (id: string | null) => {
        set({ selectedComponentId: id });
      },
      
      selectConnection: (id: string | null) => {
        set({ selectedConnectionId: id });
      },
      
      clearSelection: () => {
        set({
          selectedComponentId: null,
          selectedConnectionId: null,
        });
      },
      
      // =========================================================================
      // Connection Actions
      // =========================================================================
      
      addConnection: (connection: Omit<Connection, 'id'>) => {
        const { blueprint } = get();
        if (!blueprint) return false;
        
        // Check if connection already exists
        const exists = blueprint.connections.some(
          c => c.sourceComponentId === connection.sourceComponentId &&
               c.targetComponentId === connection.targetComponentId &&
               c.sourcePortId === connection.sourcePortId &&
               c.targetPortId === connection.targetPortId
        );
        
        if (exists) return false;
        
        const newConnection: Connection = {
          ...connection,
          id: `conn_${Date.now()}`,
        };
        
        set({
          blueprint: {
            ...blueprint,
            connections: [...blueprint.connections, newConnection],
          },
        });
        
        get().saveBlueprint();
        return true;
      },
      
      removeConnection: (id: string) => {
        const { blueprint } = get();
        if (!blueprint) return;
        
        set({
          blueprint: {
            ...blueprint,
            connections: blueprint.connections.filter(c => c.id !== id),
          },
        });
        
        get().saveBlueprint();
      },
      
      // =========================================================================
      // UI Actions
      // =========================================================================

      setBlueprint: (blueprint: Blueprint | null) => {
        set({ blueprint });
      },

      setActiveDomain: (domain: MechanicalDomain | 'all') => {
        set({ activeDomain: domain });
      },

      setShowProperties: (show: boolean) => {
        set({ showProperties: show });
      },

      setShowTemplates: (show: boolean) => {
        set({ showTemplates: show });
      },

      setShowVersionHistory: (show: boolean) => {
        set({ showVersionHistory: show });
      },

      setShowAnalysis: (show: boolean) => {
        set({ showAnalysis: show });
      },

      setSidebarTab: (tab: 'components' | 'templates' | 'versions') => {
        set({ sidebarTab: tab });
      },

      setSnapToGrid: (enabled: boolean) => {
        set({ snapToGrid: enabled });
      },

      setZoomLevel: (level: number) => {
        set({ zoomLevel: level });
      },
      
      // =========================================================================
      // Simulation Actions
      // =========================================================================
      
      runSimulation: async () => {
        set({ isSimulating: true });
        
        const startTime = performance.now();
        const { components, blueprint, simulationConfig } = get();
        
        if (!blueprint || components.size === 0) {
          const result: SimulationResult = {
            id: `sim_${Date.now()}`,
            blueprintId: blueprint?.id || '',
            status: 'error',
            variables: {},
            metrics: {},
            diagnostics: {
              massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
              energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
            },
            constraintViolations: [],
            iterations: 0,
            convergenceTime: 0,
            logs: ['No components to simulate'],
          };
          
          set({ isSimulating: false, lastSimulationResult: result });
          return result;
        }
        
        const workerManager = getSimulationWorkerManager();
        const constraintViolations: any[] = [];
        
        try {
          const componentData = Array.from(components.values()).map(comp => ({
            id: comp.id,
            definitionId: comp.getDefinitionId(),
            name: comp.getInfo().name,
            parameters: comp.getParameterValues() as Record<string, number | string>,
            position: (comp as any).position,
          }));
          
          const connectionData = blueprint.connections.map(conn => ({
            id: conn.id,
            sourceComponentId: conn.sourceComponentId,
            sourcePortId: conn.sourcePortId,
            targetComponentId: conn.targetComponentId,
            targetPortId: conn.targetPortId,
            type: conn.type,
          }));
          
          const workerResult = await workerManager.runSimulation({
            components: componentData,
            connections: connectionData,
            config: simulationConfig,
          });
          
          for (const [id, component] of components) {
            const violations = component.validate();
            constraintViolations.push(...violations.map(v => ({
              componentId: id,
              ...v,
            })));
          }
          
          let totalPower = 0;
          for (const [id, component] of components) {
            const power = component.getComputedValue('power');
            if (power !== undefined) {
              totalPower += power;
            }
          }
          
          const result: SimulationResult = {
            id: workerResult.id,
            blueprintId: blueprint.id,
            status: workerResult.status === 'incomplete' ? 'diverged' : workerResult.status,
            variables: workerResult.variables,
            metrics: {
              totalPowerInput: totalPower,
              totalPowerOutput: totalPower * 0.9,
              overallEfficiency: 0.75,
            },
            diagnostics: {
              massBalance: {
                status: (workerResult.diagnostics.massBalance.status === 'ok' ? 'ok' : 'warning') as 'ok' | 'warning' | 'error',
                inlet: workerResult.diagnostics.massBalance.inlet,
                outlet: workerResult.diagnostics.massBalance.outlet,
                imbalance: workerResult.diagnostics.massBalance.imbalance,
                imbalancePercent: workerResult.diagnostics.massBalance.imbalancePercent,
              },
              energyBalance: {
                status: (workerResult.diagnostics.energyBalance.status === 'ok' ? 'ok' : 'warning') as 'ok' | 'warning' | 'error',
                input: workerResult.diagnostics.energyBalance.input,
                output: workerResult.diagnostics.energyBalance.output,
                imbalance: workerResult.diagnostics.energyBalance.imbalance,
                imbalancePercent: workerResult.diagnostics.energyBalance.imbalancePercent,
              },
            },
            constraintViolations,
            iterations: workerResult.iterations,
            convergenceTime: workerResult.convergenceTime,
            logs: workerResult.logs,
          };
          
          set({
            isSimulating: false,
            lastSimulationResult: result,
          });
          
          return result;
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          
          const result: SimulationResult = {
            id: `sim_${Date.now()}`,
            blueprintId: blueprint.id,
            status: 'error',
            variables: {},
            metrics: {},
            diagnostics: {
              massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
              energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
            },
            constraintViolations,
            iterations: 0,
            convergenceTime: performance.now() - startTime,
            logs: [`Worker simulation failed: ${errorMessage}`],
          };
          
          set({
            isSimulating: false,
            lastSimulationResult: result,
          });
          
          return result;
        }
      },
      
      clearSimulation: () => {
        set({ lastSimulationResult: null });
      },
      
      // =========================================================================
      // History Actions
      // =========================================================================
      
      undo: () => {
        const { history, historyIndex } = get();
        if (historyIndex > 0) {
          const newIndex = historyIndex - 1;
          get().loadBlueprint(history[newIndex]);
          set({ historyIndex: newIndex });
        }
      },
      
      redo: () => {
        const { history, historyIndex } = get();
        if (historyIndex < history.length - 1) {
          const newIndex = historyIndex + 1;
          get().loadBlueprint(history[newIndex]);
          set({ historyIndex: newIndex });
        }
      },
      
      canUndo: () => get().historyIndex > 0,
      
      canRedo: () => get().historyIndex < get().history.length - 1,
      
      // =========================================================================
      // Versioning Actions
      // =========================================================================
      
      createVersion: (description?: string) => {
        const { blueprint } = get();
        if (!blueprint) return null;
        
        const versionId = `v_${Date.now()}`;
        const version: BlueprintVersion = {
          id: versionId,
          blueprintId: blueprint.id,
          version: blueprint.version,
          timestamp: new Date(),
          author: blueprint.author,
          description: description || `Auto-save at ${new Date().toLocaleString()}`,
          snapshot: JSON.parse(JSON.stringify(blueprint)),
        };
        
        const versions = get().versions;
        versions.push(version);
        
        set({ versions });
        
        return versionId;
      },
      
      getVersions: () => {
        return get().versions;
      },
      
      getVersion: (versionId: string) => {
        return get().versions.find(v => v.id === versionId);
      },
      
      restoreVersion: (versionId: string) => {
        const version = get().versions.find(v => v.id === versionId);
        
        if (version) {
          get().loadBlueprint(version.snapshot);
          
          get().createVersion(`Restored from version ${versionId}`);
        }
      },
      
      deleteVersion: (versionId: string) => {
        const filtered = get().versions.filter(v => v.id !== versionId);
        set({ versions: filtered });
      },
      
      compareVersions: (versionId1: string, versionId2: string) => {
        const v1 = get().versions.find(v => v.id === versionId1);
        const v2 = get().versions.find(v => v.id === versionId2);
        
        if (!v1 || !v2) return null;
        
        const diff: VersionDiff = {
          version1: v1,
          version2: v2,
          componentChanges: [],
          connectionChanges: [],
        };
        
        const comps1 = new Map(v1.snapshot.components.map((c: ComponentInstance) => [c.id, c]));
        const comps2 = new Map(v2.snapshot.components.map((c: ComponentInstance) => [c.id, c]));
        
        const allCompIds = new Set([...comps1.keys(), ...comps2.keys()]);
        
        for (const id of allCompIds) {
          const c1 = comps1.get(id);
          const c2 = comps2.get(id);
          
          if (!c1) {
            diff.componentChanges.push({ type: 'added', componentId: id, name: c2?.name || id });
          } else if (!c2) {
            diff.componentChanges.push({ type: 'removed', componentId: id, name: c1.name });
          } else if (JSON.stringify(c1.parameterValues) !== JSON.stringify(c2.parameterValues)) {
            diff.componentChanges.push({ type: 'modified', componentId: id, name: c1.name });
          }
        }
        
        const conns1 = new Set(v1.snapshot.connections.map(c => `${c.sourceComponentId}-${c.targetComponentId}`));
        const conns2 = new Set(v2.snapshot.connections.map(c => `${c.sourceComponentId}-${c.targetComponentId}`));
        
        const allConns = new Set([...conns1.keys(), ...conns2.keys()]);
        
        for (const conn of allConns) {
          if (!conns1.has(conn)) {
            diff.connectionChanges.push({ type: 'added', from: conn });
          } else if (!conns2.has(conn)) {
            diff.connectionChanges.push({ type: 'removed', from: conn });
          }
        }
        
        return diff;
      },
      
      exportVersionHistory: () => {
        const exportData = {
          exportDate: new Date(),
          versions: get().versions.map((v: BlueprintVersion) => ({
            id: v.id,
            version: v.version,
            timestamp: v.timestamp,
            author: v.author,
            description: v.description,
            componentCount: v.snapshot.components.length,
            connectionCount: v.snapshot.connections.length,
          })),
        };
        
        return JSON.stringify(exportData, null, 2);
      },
    }),
    {
      name: 'mechanical-saf-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        blueprint: state.blueprint,
        activeDomain: state.activeDomain,
        snapToGrid: state.snapToGrid,
        simulationConfig: state.simulationConfig,
      }),
    }
  )
);

// ============================================================================
// SELECTORS
// ============================================================================

export const selectBlueprint = (state: MechanicalSAFState) => state.blueprint;
export const selectComponents = (state: MechanicalSAFState) => state.components;
export const selectSelectedComponent = (state: MechanicalSAFState) => {
  if (!state.selectedComponentId) return null;
  return state.components.get(state.selectedComponentId) || null;
};
export const selectIsSimulating = (state: MechanicalSAFState) => state.isSimulating;
export const selectSimulationResult = (state: MechanicalSAFState) => state.lastSimulationResult;

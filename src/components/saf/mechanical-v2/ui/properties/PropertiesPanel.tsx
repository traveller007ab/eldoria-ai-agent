/**
 * Mechanical SAF Lab v2.0 - Properties Panel
 * Parameter editing and component properties display.
 */

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Settings,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Info,
  Calculator,
  Save,
  RotateCcw,
  Trash2,
  Play,
} from 'lucide-react';
import { useMechanicalSAFStore } from '../../core/store';
import { ComponentBase } from '../../core/ComponentBase';
import { ConstraintViolation, ParameterDefinition } from '../../types';

// ============================================================================
// PROPERTIES PANEL PROPS
// ============================================================================

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

// ============================================================================
// PROPERTIES PANEL COMPONENT
// ============================================================================

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ isOpen, onClose }) => {
  const {
    selectedComponentId,
    components,
    lastSimulationResult,
    updateComponentParameter,
    removeComponent,
    runSimulation,
    isSimulating,
  } = useMechanicalSAFStore();
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['parameters']));
  const [editedParams, setEditedParams] = useState<Record<string, number | string>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  // Get selected component
  const selectedComponent = useMemo(() => {
    if (!selectedComponentId) return null;
    return components.get(selectedComponentId) || null;
  }, [selectedComponentId, components]);
  
  // Initialize edited params when selection changes
  useEffect(() => {
    if (selectedComponent) {
      const params: Record<string, number | string> = {};
      for (const [key, value] of Object.entries(selectedComponent.getParameterValues())) {
        params[key] = value;
      }
      setEditedParams(params);
      setHasChanges(false);
    }
  }, [selectedComponent]);
  
  // Don't render if closed or no component selected
  if (!isOpen || !selectedComponent) {
    return null;
  }
  
  const info = selectedComponent.getInfo();
  const definition = selectedComponent.definition;
  
  // Toggle section expansion
  const toggleSection = (section: string) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(section)) {
        next.delete(section);
      } else {
        next.add(section);
      }
      return next;
    });
  };
  
  // Handle parameter change
  const handleParamChange = (paramId: string, value: number | string) => {
    setEditedParams(prev => ({ ...prev, [paramId]: value }));
    setHasChanges(true);
  };
  
  // Save changes
  const handleSaveChanges = () => {
    for (const [paramId, value] of Object.entries(editedParams)) {
      updateComponentParameter(selectedComponentId!, paramId, value);
    }
    setHasChanges(false);
  };
  
  // Revert changes
  const handleRevert = () => {
    const params: Record<string, number | string> = {};
    for (const [key, value] of Object.entries(selectedComponent.getParameterValues())) {
      params[key] = value;
    }
    setEditedParams(params);
    setHasChanges(false);
  };
  
  // Get simulated values for component
  const getSimulatedValue = (paramSymbol: string): string | number | undefined => {
    if (!lastSimulationResult) return undefined;
    const key = Object.keys(lastSimulationResult.variables).find(
      k => k.includes(selectedComponentId!) && k.includes(paramSymbol)
    );
    if (key && lastSimulationResult.variables[key] !== undefined) {
      return lastSimulationResult.variables[key];
    }
    return undefined;
  };
  
  // Check for constraint violations
  const violations = selectedComponent.validate();
  
  return (
    <div className="w-80 bg-gray-900 border-l border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-800">
        <div className="flex items-center gap-2">
          <Settings className="w-4 h-4 text-cyan-400" />
          <span className="font-semibold text-white">Properties</span>
        </div>
        <button
          onClick={onClose}
          className="p-1 hover:bg-gray-800 rounded text-gray-400 hover:text-white transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
      
      {/* Component Info */}
      <div className="px-4 py-3 border-b border-gray-800">
        <div className="text-lg font-semibold text-white">{info.name}</div>
        <div className="mt-1 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
          {definition.domain} / {definition.subcategory}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Actions */}
        {hasChanges && (
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2 bg-yellow-500/10">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-500 flex-1">Unsaved changes</span>
            <button
              onClick={handleSaveChanges}
              className="flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30"
            >
              <Save className="w-3 h-3" />
              Save
            </button>
            <button
              onClick={handleRevert}
              className="flex items-center gap-1 px-2 py-1 bg-gray-800 text-gray-400 rounded text-xs hover:bg-gray-700"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        )}
        
        {/* Constraint Violations */}
        {violations.length > 0 && (
          <div className="px-4 py-2 border-b border-red-900/30 bg-red-500/10">
            <div className="flex items-center gap-2 text-red-400 text-xs font-medium mb-2">
              <AlertTriangle className="w-4 h-4" />
              Constraint Violations
            </div>
            {violations.map((v, i) => (
              <div key={i} className="text-xs text-red-300 mb-1">
                {v.constraint.name}: {v.actualValue.toFixed(2)} {'<'} {v.limitValue.toFixed(2)}
              </div>
            ))}
          </div>
        )}
        
        {/* Simulation Results */}
        {lastSimulationResult && lastSimulationResult.variables && (
          <div className="border-b border-gray-800">
            <button
              onClick={() => toggleSection('simulation')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              <Play className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">Simulation</span>
              {expandedSections.has('simulation') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('simulation') && (
              <div className="px-4 pb-3 space-y-1">
                {Object.entries(lastSimulationResult.variables)
                  .filter(([key]) => key.startsWith(selectedComponentId!))
                  .slice(0, 8)
                  .map(([key, value]) => {
                    const cleanKey = key.split('.').slice(1).join('.');
                    return (
                      <div key={key} className="flex justify-between text-xs">
                        <span className="text-gray-400">{cleanKey}</span>
                        <span className="text-green-400 font-mono">{typeof value === 'number' ? value.toFixed(3) : String(value)}</span>
                      </div>
                    );
                  })}
              </div>
            )}
          </div>
        )}
        
        {/* Parameters */}
        <div className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('parameters')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
          >
            <Settings className="w-4 h-4 text-cyan-400" />
            <span className="text-sm font-medium text-white flex-1 text-left">Parameters</span>
            {expandedSections.has('parameters') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.has('parameters') && (
            <div className="px-4 pb-3 space-y-3">
              {definition.parameters.map(param => {
                const displayValue = editedParams[param.id] ?? param.value;
                const simulatedValue = getSimulatedValue(param.symbol);
                const isCalculated = param.source === 'calculated';
                
                return (
                  <div key={param.id} className="space-y-1">
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-300 font-mono">{param.symbol}</span>
                      <span className="text-gray-500">{param.unit}</span>
                    </div>
                    <div className="relative">
                      <input
                        type={param.dataType === 'number' ? 'number' : 'text'}
                        value={displayValue !== undefined && typeof displayValue !== 'boolean' ? displayValue : ''}
                        onChange={(e) => {
                          const val = param.dataType === 'number' 
                            ? parseFloat(e.target.value) 
                            : e.target.value;
                          handleParamChange(param.id, val);
                        }}
                        disabled={isCalculated}
                        className={`w-full px-2 py-1.5 bg-gray-800 border rounded text-sm text-white focus:outline-none transition-colors
                          ${isCalculated ? 'opacity-50 cursor-not-allowed' : 'focus:border-cyan-500'}
                          ${isCalculated ? 'border-gray-700' : 'border-gray-700'}
                        `}
                      />
                      {simulatedValue !== undefined && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-green-400">
                          Sim: {typeof simulatedValue === 'number' ? simulatedValue.toFixed(2) : simulatedValue}
                        </div>
                      )}
                    </div>
                    {param.description && (
                      <div className="text-[10px] text-gray-500 truncate">
                        {param.description}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
        
        {/* Equations */}
        {definition.equations.length > 0 && (
          <div className="border-b border-gray-800">
            <button
              onClick={() => toggleSection('equations')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              <Calculator className="w-4 h-4 text-purple-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">Equations</span>
              {expandedSections.has('equations') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('equations') && (
              <div className="px-4 pb-3 space-y-2">
                {definition.equations.slice(0, 5).map(eq => (
                  <div key={eq.id} className="text-xs">
                    <div className="text-gray-400 mb-1">{eq.name}</div>
                    <div className="px-2 py-1 bg-gray-800/50 rounded font-mono text-gray-300 text-[10px] overflow-x-auto">
                      {eq.expression}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        {/* Description */}
        {definition.description && (
          <div className="border-b border-gray-800">
            <button
              onClick={() => toggleSection('description')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              <Info className="w-4 h-4 text-gray-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">Description</span>
              {expandedSections.has('description') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('description') && (
              <div className="px-4 pb-3 text-xs text-gray-400">
                {definition.description}
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Footer Actions */}
      <div className="p-4 border-t border-gray-800 space-y-2">
        <button
          onClick={() => runSimulation()}
          disabled={isSimulating}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors disabled:opacity-50"
        >
          <Play className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
        
        <button
          onClick={() => {
            removeComponent(selectedComponentId!);
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
          Delete Component
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default PropertiesPanel;

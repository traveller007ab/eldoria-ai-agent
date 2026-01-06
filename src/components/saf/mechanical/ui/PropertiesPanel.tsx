/**
 * Properties Panel
 * Parameter editing panel for selected components
 */

import React, { useState, useEffect } from 'react';
import { 
  X, 
  Settings, 
  ChevronDown, 
  ChevronRight,
  AlertTriangle,
  Info,
  Calculator,
  TrendingUp,
  Activity,
  Save,
  RotateCcw
} from 'lucide-react';
import { useSAFMechanicalStore } from '../store';
import { MechanicalComponent, ComponentParameter, ConstraintViolation } from '../types';

interface PropertiesPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({ isOpen, onClose }) => {
  const { 
    selectedComponentId, 
    components, 
    lastSimulationResult,
    updateComponentParameter,
    removeComponent,
    simulationConfig,
    runSimulation,
    isSimulating
  } = useSAFMechanicalStore();
  
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['parameters']));
  const [editedParams, setEditedParams] = useState<Record<string, number>>({});
  const [hasChanges, setHasChanges] = useState(false);
  
  const selectedComponent = components.find(c => c.id === selectedComponentId);
  
  // Initialize edited params when selection changes
  useEffect(() => {
    if (selectedComponent) {
      const params: Record<string, number> = {};
      for (const param of selectedComponent.parameters) {
        if (typeof param.value === 'number') {
          params[param.name] = param.value;
        }
      }
      setEditedParams(params);
      setHasChanges(false);
    }
  }, [selectedComponent]);
  
  if (!isOpen || !selectedComponent) {
    return null;
  }
  
  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };
  
  const handleParamChange = (paramName: string, value: number) => {
    setEditedParams(prev => ({ ...prev, [paramName]: value }));
    setHasChanges(true);
  };
  
  const handleSaveChanges = () => {
    for (const [paramName, value] of Object.entries(editedParams)) {
      updateComponentParameter(selectedComponent.id, paramName, value);
    }
    setHasChanges(false);
  };
  
  const handleRevert = () => {
    const params: Record<string, number> = {};
    for (const param of selectedComponent.parameters) {
      if (typeof param.value === 'number') {
        params[param.name] = param.value;
      }
    }
    setEditedParams(params);
    setHasChanges(false);
  };
  
  const getSimulatedValue = (symbol: string): string => {
    if (!lastSimulationResult) return '--';
    const key = Object.keys(lastSimulationResult.variables).find(
      k => k.includes(selectedComponent.id) && k.includes(symbol)
    );
    if (key && lastSimulationResult.variables[key] !== undefined) {
      return lastSimulationResult.variables[key].toFixed(2);
    }
    return '--';
  };
  
  const checkConstraintViolations = (): ConstraintViolation[] => {
    const violations: ConstraintViolation[] = [];
    
    for (const constraint of selectedComponent.constraints || []) {
      let actualValue = 0;
      let limitValue = 0;
      
      // Evaluate constraint expression (simplified)
      if (constraint.expression.includes('>')) {
        const [left, right] = constraint.expression.split('>');
        const leftVal = parseFloat(left);
        const rightVal = parseFloat(right);
        if (!isNaN(leftVal) && !isNaN(rightVal)) {
          actualValue = leftVal;
          limitValue = rightVal;
        }
      }
      
      if (actualValue < limitValue && constraint.severity === 'error') {
        violations.push({
          constraintId: constraint.id,
          constraint,
          actualValue,
          limitValue,
          margin: limitValue - actualValue
        });
      }
    }
    
    return violations;
  };
  
  const violations = checkConstraintViolations();
  
  return (
    <div className="w-80 shrink-0 flex flex-col bg-gray-900/95 border-l border-cyan-900/30 h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-cyan-900/20">
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
        <div className="text-lg font-semibold text-white">{selectedComponent.name}</div>
        <div className="text-xs text-gray-500">
          {selectedComponent.manufacturer} {selectedComponent.model}
        </div>
        <div className="mt-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-cyan-500/20 text-cyan-400">
          {selectedComponent.category} / {selectedComponent.subcategory}
        </div>
      </div>
      
      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        {/* Actions */}
        {hasChanges && (
          <div className="px-4 py-2 border-b border-gray-800 flex items-center gap-2 bg-yellow-500/10">
            <AlertTriangle className="w-4 h-4 text-yellow-500" />
            <span className="text-xs text-yellow-500">Unsaved changes</span>
            <button
              onClick={handleSaveChanges}
              className="ml-auto flex items-center gap-1 px-2 py-1 bg-cyan-500/20 text-cyan-400 rounded text-xs hover:bg-cyan-500/30"
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
                {v.constraint.name}: {v.actualValue.toFixed(2)} &lt; {v.limitValue.toFixed(2)}
              </div>
            ))}
          </div>
        )}
        
        {/* Simulation Values */}
        {lastSimulationResult && Object.keys(lastSimulationResult.variables).length > 0 && (
          <div className="border-b border-gray-800">
            <button
              onClick={() => toggleSection('simulation')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              <Activity className="w-4 h-4 text-green-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">Simulation</span>
              {expandedSections.has('simulation') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('simulation') && (
              <div className="px-4 pb-3 space-y-1">
                {selectedComponent.states.slice(0, 6).map((state) => (
                  <div key={state.symbol} className="flex justify-between text-xs">
                    <span className="text-gray-400">{state.symbol}</span>
                    <span className="text-green-400 font-mono">
                      {getSimulatedValue(state.symbol)} {state.unit}
                    </span>
                  </div>
                ))}
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
              {selectedComponent.parameters.map((param) => (
                <div key={param.symbol}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-gray-300 font-mono">{param.symbol}</span>
                    <span className="text-gray-500">{param.unit}</span>
                  </div>
                  <input
                    type="number"
                    value={editedParams[param.name] ?? param.value}
                    onChange={(e) => handleParamChange(param.name, parseFloat(e.target.value) || 0)}
                    step={param.tolerance || 0.1}
                    className="w-full px-2 py-1 bg-gray-800 border border-gray-700 rounded text-sm text-white focus:outline-none focus:border-cyan-500"
                  />
                  {param.designRange && (
                    <div className="flex justify-between text-[10px] text-gray-600 mt-0.5">
                      <span>Min: {param.designRange.min}</span>
                      <span>Max: {param.designRange.max}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Equations */}
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
              {selectedComponent.equations?.slice(0, 5).map((eq) => (
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
        
        {/* Failure Modes */}
        <div className="border-b border-gray-800">
          <button
            onClick={() => toggleSection('failures')}
            className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
          >
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span className="text-sm font-medium text-white flex-1 text-left">Failure Modes</span>
            {expandedSections.has('failures') ? (
              <ChevronDown className="w-4 h-4 text-gray-500" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-500" />
            )}
          </button>
          
          {expandedSections.has('failures') && (
            <div className="px-4 pb-3 space-y-2">
              {selectedComponent.failureModes?.slice(0, 3).map((fm) => (
                <div key={fm.id} className="text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-300">{fm.name}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                      fm.severity === 'critical' ? 'bg-red-500/20 text-red-400' :
                      fm.severity === 'major' ? 'bg-yellow-500/20 text-yellow-400' :
                      'bg-gray-500/20 text-gray-400'
                    }`}>
                      {fm.severity}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Material */}
        {selectedComponent.material && (
          <div className="border-b border-gray-800">
            <button
              onClick={() => toggleSection('material')}
              className="w-full flex items-center gap-2 px-4 py-2 hover:bg-gray-800/50 transition-colors"
            >
              <Info className="w-4 h-4 text-amber-400" />
              <span className="text-sm font-medium text-white flex-1 text-left">Material</span>
              {expandedSections.has('material') ? (
                <ChevronDown className="w-4 h-4 text-gray-500" />
              ) : (
                <ChevronRight className="w-4 h-4 text-gray-500" />
              )}
            </button>
            
            {expandedSections.has('material') && (
              <div className="px-4 pb-3 space-y-1">
                <div className="text-xs">
                  <span className="text-gray-400">Material:</span>
                  <span className="text-white ml-2">{selectedComponent.material.name}</span>
                </div>
                {selectedComponent.material.yieldStrength && (
                  <div className="text-xs">
                    <span className="text-gray-400">Yield:</span>
                    <span className="text-white ml-2">{selectedComponent.material.yieldStrength} MPa</span>
                  </div>
                )}
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
          <TrendingUp className="w-4 h-4" />
          {isSimulating ? 'Simulating...' : 'Run Simulation'}
        </button>
        
        <button
          onClick={() => {
            removeComponent(selectedComponent.id);
            onClose();
          }}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-lg hover:bg-red-500/20 transition-colors"
        >
          <X className="w-4 h-4" />
          Delete Component
        </button>
      </div>
    </div>
  );
};

export default PropertiesPanel;

/**
 * Mechanical Node Component
 * Custom ReactFlow node for mechanical components
 */

import React, { memo, useState, useCallback } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { 
  Droplets, 
  Zap, 
  Flame, 
  Settings2, 
  Cpu, 
  Box, 
  Layers,
  Activity,
  Wifi,
  Trash2,
  Copy,
  MoreHorizontal
} from 'lucide-react';
import { MechanicalComponent, EnergyPortType } from '../types';

interface MechanicalNodeData {
  component: MechanicalComponent;
  isSelected: boolean;
  simVars?: Record<string, number>;
  showPorts?: boolean;
  constraintViolations?: string[];
}

// Domain icons and colors
const DOMAIN_CONFIG: Record<string, { icon: React.ReactNode; color: string; bgColor: string }> = {
  fluid: { icon: <Droplets className="w-4 h-4" />, color: '#3b82f6', bgColor: 'bg-blue-500/20' },
  heatTransfer: { icon: <Flame className="w-4 h-4" />, color: '#f97316', bgColor: 'bg-orange-500/20' },
  thermodynamic: { icon: <Zap className="w-4 h-4" />, color: '#eab308', bgColor: 'bg-yellow-500/20' },
  machineElement: { icon: <Settings2 className="w-4 h-4" />, color: '#a855f7', bgColor: 'bg-purple-500/20' },
  control: { icon: <Cpu className="w-4 h-4" />, color: '#22c55e', bgColor: 'bg-green-500/20' },
  solidMechanics: { icon: <Box className="w-4 h-4" />, color: '#6b7280', bgColor: 'bg-gray-500/20' },
  material: { icon: <Layers className="w-4 h-4" />, color: '#f59e0b', bgColor: 'bg-amber-500/20' },
  aerodynamic: { icon: <Activity className="w-4 h-4" />, color: '#06b6d4', bgColor: 'bg-cyan-500/20' }
};

const PORT_COLORS: Record<EnergyPortType, string> = {
  fluid: '#3b82f6',
  mechanical: '#a855f7',
  thermal: '#f97316',
  electrical: '#eab308',
  signal: '#22c55e',
  hydraulic: '#06b6d4',
  pneumatic: '#8b5cf6'
};

const MechanicalNode: React.FC<NodeProps<MechanicalNodeData>> = ({ data, selected, id }) => {
  const { component, isSelected, simVars, showPorts = true } = data;
  const domainConfig = DOMAIN_CONFIG[component.category] || DOMAIN_CONFIG.fluid;
  const [showContextMenu, setShowContextMenu] = useState(false);
  
  // Get key simulation values for display
  const getDisplayValue = (symbol: string): string => {
    if (!simVars) return '--';
    const key = Object.keys(simVars).find(k => k.includes(symbol) || k.endsWith(`.${symbol}`));
    if (key && simVars[key] !== undefined) {
      const val = simVars[key];
      return typeof val === 'number' ? val.toFixed(2) : String(val);
    }
    return '--';
  };
  
  // Calculate port positions based on port count with better spacing
  const getPortPositions = (ports: typeof component.ports, type: 'input' | 'output') => {
    const filteredPorts = ports.filter(p => {
      if (type === 'input') return p.type === 'input' || p.type === 'bidirectional';
      return p.type === 'output' || p.type === 'bidirectional';
    });
    
    const count = filteredPorts.length;
    if (count === 0) return [];
    
    const spacing = count <= 3 ? 33.33 : 100 / (count + 1);
    
    return filteredPorts.map((port, index) => {
      const position = count <= 3 
        ? 16.67 + index * 33.33
        : 100 / (count + 1) * (index + 1);
      
      return {
        port,
        position
      };
    });
  };
  
  const inputPorts = showPorts ? getPortPositions(component.ports, 'input') : [];
  const outputPorts = showPorts ? getPortPositions(component.ports, 'output') : [];
  
  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setShowContextMenu(true);
  }, []);
  
  const handleDelete = useCallback(() => {
    // Emit custom event for parent to handle
    window.dispatchEvent(new CustomEvent('deleteNode', { detail: { nodeId: id } }));
    setShowContextMenu(false);
  }, [id]);
  
  const handleDuplicate = useCallback(() => {
    // Emit custom event for parent to handle
    window.dispatchEvent(new CustomEvent('duplicateNode', { detail: { nodeId: id, component } }));
    setShowContextMenu(false);
  }, [id, component]);
  
  const closeContextMenu = useCallback(() => {
    setShowContextMenu(false);
  }, []);
  
  // Close context menu on click outside
  React.useEffect(() => {
    const handleClick = () => setShowContextMenu(false);
    if (showContextMenu) {
      window.addEventListener('click', handleClick);
      return () => window.removeEventListener('click', handleClick);
    }
  }, [showContextMenu]);
  
  return (
    <div 
      className={`
        min-w-[180px] rounded-lg border-2 transition-all duration-200
        ${isSelected 
          ? 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.4)]' 
          : 'border-gray-700 hover:border-gray-600'
        }
        bg-gray-900/95 backdrop-blur-sm overflow-hidden
      `}
      onContextMenu={handleContextMenu}
    >
      {/* Header */}
      <div className={`flex items-center gap-2 px-3 py-2 border-b ${domainConfig.bgColor}`}>
        <div className="text-white">{domainConfig.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-white truncate">
            {component.name}
          </div>
          <div className="text-[10px] text-gray-400 truncate">
            {component.manufacturer} {component.model}
          </div>
        </div>
        <button
          className="p-1 rounded hover:bg-white/10 text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={(e) => {
            e.stopPropagation();
            setShowContextMenu(!showContextMenu);
          }}
        >
          <MoreHorizontal className="w-4 h-4" />
        </button>
      </div>
      
      {/* Parameters Display */}
      <div className="px-3 py-2 space-y-1">
        {component.parameters.slice(0, 3).map((param) => (
          <div key={param.symbol} className="flex justify-between text-xs">
            <span className="text-gray-400">
              {param.symbol}
            </span>
            <span className="text-gray-200 font-mono">
              {getDisplayValue(param.symbol)} {param.unit}
            </span>
          </div>
        ))}
        
        {/* Show more if simulation values exist */}
        {simVars && Object.keys(simVars).length > 0 && (
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="text-[10px] text-gray-500 mb-1">SIMULATED</div>
            {component.states.slice(0, 2).map((state) => (
              <div key={state.symbol} className="flex justify-between text-xs">
                <span className="text-cyan-400">{state.symbol}</span>
                <span className="text-white font-mono">
                  {getDisplayValue(state.symbol)} {state.unit}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Ports */}
      {showPorts && (
        <>
          {/* Input Ports (Left) */}
          <div className="absolute left-0 top-0 bottom-0 w-1 flex flex-col justify-around py-2">
            {inputPorts.map(({ port, position }) => (
              <div
                key={port.id}
                className="absolute"
                style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
              >
                <Handle
                  type="target"
                  position={Position.Left}
                  id={port.id}
                  style={{
                    background: PORT_COLORS[port.domain],
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    borderRadius: '50%'
                  }}
                  className="opacity-80 hover:opacity-100 cursor-pointer"
                />
              </div>
            ))}
          </div>
          
          {/* Output Ports (Right) */}
          <div className="absolute right-0 top-0 bottom-0 w-1 flex flex-col justify-around py-2">
            {outputPorts.map(({ port, position }) => (
              <div
                key={port.id}
                className="absolute"
                style={{ top: `${position}%`, transform: 'translateY(-50%)' }}
              >
                <Handle
                  type="source"
                  position={Position.Right}
                  id={port.id}
                  style={{
                    background: PORT_COLORS[port.domain],
                    width: 10,
                    height: 10,
                    border: '2px solid white',
                    borderRadius: '50%'
                  }}
                  className="opacity-80 hover:opacity-100 cursor-pointer"
                />
              </div>
            ))}
          </div>
        </>
      )}
      
      {/* Status Indicator */}
      {simVars && (
        <div className="absolute top-2 right-2">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
        </div>
      )}
      
      {/* Failure Warning Indicator */}
      {data.constraintViolations && data.constraintViolations.length > 0 && (
        <div className="absolute bottom-2 right-2">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" title="Constraint violations" />
        </div>
      )}
      
      {/* Context Menu */}
      {showContextMenu && (
        <div className="absolute top-10 right-2 z-50 bg-gray-800 border border-gray-700 rounded-lg shadow-xl py-1 min-w-[120px]">
          <button
            onClick={handleDuplicate}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-300 hover:bg-gray-700 transition-colors"
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </button>
          <button
            onClick={handleDelete}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

// Memoize for performance
export default memo(MechanicalNode);

// Helper function to convert component to ReactFlow node
export function componentToNode(
  component: MechanicalComponent,
  position: { x: number; y: number }
) {
  return {
    id: component.id,
    type: 'mechanicalNode',
    position,
    data: {
      component,
      isSelected: false,
      showPorts: true
    }
  };
}

// Helper to create node type registration
export const nodeTypes = {
  mechanicalNode: MechanicalNode
};

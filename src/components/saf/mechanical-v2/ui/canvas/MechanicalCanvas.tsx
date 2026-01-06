/**
 * Mechanical SAF Lab v2.0 - ReactFlow Canvas
 * Custom nodes and edges for mechanical system visualization.
 */

import React, { memo, useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Handle,
  Position,
  NodeProps,
  getOutgoers,
  getIncomers,
  useReactFlow,
  MarkerType,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';

import {
  ComponentDefinition,
  ComponentInstance,
  Connection,
  MechanicalDomain,
} from '../../types';
import {
  ComponentBase,
  ComponentFactory,
} from '../../core/ComponentBase';
import {
  CENTRIFUGAL_PUMP_DEFINITION,
  STRAIGHT_PIPE_DEFINITION,
  CONTROL_VALVE_DEFINITION,
  BALL_VALVE_DEFINITION,
  SHELL_TUBE_HE_DEFINITION,
} from '../../components/fluid';

// ============================================================================
// DOMAIN COLORS
// ============================================================================

const DOMAIN_COLORS: Record<MechanicalDomain, { primary: string; secondary: string; accent: string }> = {
  fluid: { primary: '#3b82f6', secondary: '#1e40af', accent: '#60a5fa' },
  heatTransfer: { primary: '#f97316', secondary: '#c2410c', accent: '#fb923c' },
  thermodynamic: { primary: '#eab308', secondary: '#a16207', accent: '#facc15' },
  machineElement: { primary: '#a855f7', secondary: '#7c3aed', accent: '#c084fc' },
  control: { primary: '#22c55e', secondary: '#15803d', accent: '#4ade80' },
};

// ============================================================================
// CUSTOM NODE COMPONENTS
// ============================================================================

/**
 * Centrifugal Pump Node
 */
const CentrifugalPumpNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const colors = DOMAIN_COLORS.fluid;
  
  return (
    <div
      className={`
        min-w-[120px] min-h-[80px] rounded-lg border-2 bg-gray-900 shadow-lg
        transition-all duration-200
        ${selected ? 'border-cyan-400 shadow-cyan-400/20' : 'border-gray-700'}
      `}
      style={{ 
        boxShadow: selected ? '0 0 20px rgba(34, 211, 238, 0.3)' : undefined 
      }}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-400 !w-3 !h-3 !-left-1.5 !border-2 !border-gray-900"
      />
      
      {/* Node Body */}
      <div className="p-3">
        <div className="flex items-center gap-2">
          <div 
            className="w-8 h-8 rounded flex items-center justify-center"
            style={{ backgroundColor: `${colors.primary}30` }}
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke={colors.primary} strokeWidth="2">
              <circle cx="12" cy="12" r="3" />
              <path d="M12 2v4M12 18v4M2 12h4M18 12h4" />
              <circle cx="12" cy="12" r="8" strokeDasharray="4 2" />
            </svg>
          </div>
          <div>
            <div className="text-xs font-semibold text-white">{data.label || 'Pump'}</div>
            <div className="text-[10px] text-gray-400">Centrifugal</div>
          </div>
        </div>
        
        {/* Quick Stats */}
        {(data.computed?.power || data.computed?.efficiency) && (
          <div className="mt-2 pt-2 border-t border-gray-700 grid grid-cols-2 gap-2 text-[10px]">
            {data.computed?.power && (
              <div>
                <span className="text-gray-500">P:</span>
                <span className="text-cyan-400 ml-1">{data.computed.power.toFixed(1)} kW</span>
              </div>
            )}
            {data.computed?.efficiency && (
              <div>
                <span className="text-gray-500">η:</span>
                <span className="text-green-400 ml-1">{data.computed.efficiency.toFixed(1)}%</span>
              </div>
            )}
          </div>
        )}
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-400 !w-3 !h-3 !-right-1.5 !border-2 !border-gray-900"
      />
      
      {/* Shaft Handle (top) */}
      <Handle
        type="source"
        position={Position.Top}
        id="shaft"
        className="!bg-yellow-400 !w-2.5 !h-2.5 !-top-1.5 !border-2 !border-gray-900"
      />
    </div>
  );
};

/**
 * Pipe Node
 */
const PipeNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const colors = DOMAIN_COLORS.fluid;
  
  return (
    <div
      className={`
        min-w-[80px] min-h-[40px] rounded-full border bg-gray-900
        transition-all duration-200 flex items-center justify-center
        ${selected ? 'border-cyan-400' : 'border-gray-700'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !-left-1.5 !border-2 !border-gray-900"
      />
      
      <div className="px-4 text-center">
        <div className="text-xs text-gray-300">{data.label || 'Pipe'}</div>
        {data.computed?.dP && (
          <div className="text-[10px] text-gray-500">ΔP: {data.computed.dP.toFixed(1)} kPa</div>
        )}
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !-right-1.5 !border-2 !border-gray-900"
      />
    </div>
  );
};

/**
 * Control Valve Node
 */
const ControlValveNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const colors = DOMAIN_COLORS.fluid;
  const opening = data.parameters?.opening || 50;
  
  return (
    <div
      className={`
        min-w-[100px] min-h-[60px] rounded-lg border-2 bg-gray-900
        transition-all duration-200
        ${selected ? 'border-cyan-400' : 'border-gray-700'}
      `}
    >
      {/* Input Handle */}
      <Handle
        type="target"
        position={Position.Left}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !-left-1.5 !border-2 !border-gray-900"
      />
      
      <div className="p-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 3v18M8 6l4-3 4 3M8 18l4-3 4 3" />
          </svg>
          <span className="text-xs text-white">{data.label || 'Valve'}</span>
        </div>
        <div className="mt-1 text-[10px] text-gray-400">
          Opening: {opening.toFixed(0)}%
        </div>
      </div>
      
      {/* Output Handle */}
      <Handle
        type="source"
        position={Position.Right}
        className="!bg-cyan-400 !w-2.5 !h-2.5 !-right-1.5 !border-2 !border-gray-900"
      />
    </div>
  );
};

/**
 * Heat Exchanger Node
 */
const HeatExchangerNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const colors = DOMAIN_COLORS.heatTransfer;
  
  return (
    <div
      className={`
        min-w-[140px] min-h-[100px] rounded-lg border-2 bg-gray-900
        transition-all duration-200
        ${selected ? 'border-orange-400' : 'border-gray-700'}
      `}
    >
      {/* Hot side handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="hot_in"
        className="!bg-orange-400 !w-2.5 !h-2.5 !-left-1.5 !border-2 !border-gray-900"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="hot_out"
        className="!bg-orange-400 !w-2.5 !h-2.5 !-right-1.5 !border-2 !border-gray-900"
      />
      
      {/* Cold side handles */}
      <Handle
        type="target"
        position={Position.Left}
        id="cold_in"
        className="!bg-blue-400 !w-2.5 !h-2.5 !-left-1.5 !border-2 !border-gray-900 !mt-8"
      />
      <Handle
        type="source"
        position={Position.Right}
        id="cold_out"
        className="!bg-blue-400 !w-2.5 !h-2.5 !-right-1.5 !border-2 !border-gray-900 !mt-8"
      />
      
      <div className="p-2 text-center">
        <div className="flex items-center justify-center gap-2">
          <svg className="w-5 h-5 text-orange-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
          </svg>
          <span className="text-xs text-white">{data.label || 'HE'}</span>
        </div>
        {data.computed?.Q && (
          <div className="mt-1 text-[10px] text-orange-400">
            Q: {data.computed.Q.toFixed(1)} kW
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Generic Component Node
 */
const GenericComponentNode: React.FC<NodeProps<any>> = ({ data, selected }) => {
  const domain = data.domain || 'fluid';
  const colors = DOMAIN_COLORS[domain as MechanicalDomain] || DOMAIN_COLORS.fluid;
  
  return (
    <div
      className={`
        min-w-[100px] min-h-[60px] rounded-lg border-2 bg-gray-900
        transition-all duration-200
        ${selected ? `border-[${colors.primary}]` : 'border-gray-700'}
      `}
      style={{ borderColor: selected ? colors.primary : undefined }}
    >
      <Handle
        type="target"
        position={Position.Left}
        className="!w-2.5 !h-2.5 !-left-1.5 !border-2 !border-gray-900"
        style={{ backgroundColor: colors.primary }}
      />
      
      <div className="p-2 text-center">
        <div className="text-xs text-white">{data.label || 'Component'}</div>
        <div className="text-[10px] text-gray-500">{data.category || domain}</div>
      </div>
      
      <Handle
        type="source"
        position={Position.Right}
        className="!w-2.5 !h-2.5 !-right-1.5 !border-2 !border-gray-900"
        style={{ backgroundColor: colors.primary }}
      />
    </div>
  );
};

// ============================================================================
// NODE TYPE REGISTRY
// ============================================================================

export const NODE_TYPES: Record<string, React.FC<NodeProps<any>>> = {
  centrifugalPump: CentrifugalPumpNode,
  pipe: PipeNode,
  controlValve: ControlValveNode,
  heatExchanger: HeatExchangerNode,
  generic: GenericComponentNode,
};

export function getNodeType(componentDefId: string): string {
  if (componentDefId.includes('pump')) return 'centrifugalPump';
  if (componentDefId.includes('pipe')) return 'pipe';
  if (componentDefId.includes('valve.control')) return 'controlValve';
  if (componentDefId.includes('heatExchanger')) return 'heatExchanger';
  return 'generic';
}

// ============================================================================
// CUSTOM EDGE COMPONENTS
// ============================================================================

interface FluidEdgeData {
  type?: string;
  flow?: number;
  velocity?: number;
}

const FluidConnectionEdge: React.FC<any> = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
  data,
  style = {},
  markerEnd,
}) => {
  const colors: Record<string, string> = {
    fluid: '#3b82f6',
    mechanical: '#a855f7',
    thermal: '#f97316',
    signal: '#22c55e',
    electrical: '#eab308',
  };
  
  const domain = data?.type || 'fluid';
  const color = colors[domain] || colors.fluid;
  
  // Bezier curve for smooth connections
  const controlOffset = Math.abs(targetX - sourceX) * 0.5;
  
  const path = `M ${sourceX} ${sourceY} C ${sourceX + controlOffset} ${sourceY}, ${targetX - controlOffset} ${targetY}, ${targetX} ${targetY}`;
  
  return (
    <path
      d={path}
      fill="none"
      stroke={color}
      strokeWidth={2}
      markerEnd={markerEnd}
      style={{
        ...style,
        opacity: 0.8,
      }}
    />
  );
};

export const EDGE_TYPES = {
  fluidConnection: FluidConnectionEdge,
};

// ============================================================================
// CONVERSION FUNCTIONS
// ============================================================================

/**
 * Convert component instance to ReactFlow node
 */
export function componentToNode(
  component: ComponentInstance,
  definition: ComponentDefinition,
  position?: { x: number; y: number }
): Node {
  const nodeType = getNodeType(definition.id);
  
  return {
    id: component.id,
    type: nodeType,
    position: component.position,
    data: {
      label: component.name,
      category: definition.subcategory,
      domain: definition.domain,
      definitionId: definition.id,
      parameters: component.parameterValues,
      computed: {}, // Will be populated during simulation
    },
    selected: component.isSelected,
  };
}

/**
 * Convert connection to ReactFlow edge
 */
export function connectionToEdge(connection: Connection): Edge {
  const edgeType = connection.type === 'fluid' ? 'fluidConnection' : 'smoothstep';
  
  return {
    id: connection.id,
    source: connection.sourceComponentId,
    sourceHandle: connection.sourcePortId,
    target: connection.targetComponentId,
    targetHandle: connection.targetPortId,
    type: edgeType,
    data: { type: connection.type },
    animated: false,
    style: {
      stroke: connection.type === 'fluid' ? '#3b82f6' : '#6b7280',
      strokeWidth: 2,
    },
    markerEnd: {
      type: MarkerType.ArrowClosed,
      color: '#6b7280',
    },
  };
}

/**
 * Convert ReactFlow nodes to component instances
 */
export function nodesToComponents(nodes: Node[]): ComponentInstance[] {
  return nodes.map(node => ({
    id: node.id,
    definitionId: node.data?.definitionId || '',
    name: node.data?.label || 'Unnamed',
    position: node.position,
    parameterValues: node.data?.parameters || {},
    isSelected: node.selected || false,
    isVisible: true,
  }));
}

/**
 * Convert ReactFlow edges to connections
 */
export function edgesToConnections(edges: Edge[]): Connection[] {
  return edges
    .filter(edge => edge.source && edge.target)
    .map(edge => ({
      id: edge.id,
      sourceComponentId: edge.source,
      sourcePortId: edge.sourceHandle || '',
      targetComponentId: edge.target,
      targetPortId: edge.targetHandle || '',
      type: (edge.data?.type as Connection['type']) || 'fluid',
    }));
}

// ============================================================================
// CUSTOM CONTROLS
// ============================================================================

export const CustomControls: React.FC = () => {
  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-2">
      <div className="text-[10px] text-gray-500 uppercase tracking-wider mb-2">
        Controls
      </div>
      <div className="text-xs text-gray-300">
        Use mouse to pan and zoom
      </div>
    </div>
  );
};

// ============================================================================
// MINIMAP CONFIGURATION
// ============================================================================

export const minimapNodeColor = (node: Node): string => {
  const domain = node.data?.domain as MechanicalDomain;
  return DOMAIN_COLORS[domain]?.primary || '#6b7280';
};

// ============================================================================
// EXPORT
// ============================================================================

export default {
  NODE_TYPES,
  EDGE_TYPES,
  componentToNode,
  connectionToEdge,
  nodesToComponents,
  edgesToConnections,
  getNodeType,
  DOMAIN_COLORS,
};

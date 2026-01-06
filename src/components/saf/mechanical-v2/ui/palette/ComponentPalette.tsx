/**
 * Mechanical SAF Lab v2.0 - Component Palette
 * Drag-and-drop component selection panel.
 */

import React, { useState, useMemo, useCallback } from 'react';
import {
  Search,
  ChevronRight,
  ChevronDown,
  Droplets,
  Flame,
  Settings2,
  Cpu,
  Box,
  Layers,
  Zap,
  Filter,
} from 'lucide-react';
import { MechanicalDomain, SubDomain, ComponentDefinition } from '../../types';
import { COMPONENT_CATALOG } from '../../components/fluid';

// ============================================================================
// DOMAIN CONFIGURATION
// ============================================================================

const DOMAIN_CONFIG: Record<MechanicalDomain, { 
  icon: React.ReactNode; 
  label: string; 
  color: string;
  bgColor: string;
}> = {
  fluid: { 
    icon: <Droplets className="w-4 h-4" />, 
    label: 'Fluid Systems',
    color: 'text-blue-400',
    bgColor: 'bg-blue-400',
  },
  heatTransfer: { 
    icon: <Flame className="w-4 h-4" />, 
    label: 'Heat Transfer',
    color: 'text-orange-400',
    bgColor: 'bg-orange-400',
  },
  thermodynamic: { 
    icon: <Zap className="w-4 h-4" />, 
    label: 'Thermodynamics',
    color: 'text-yellow-400',
    bgColor: 'bg-yellow-400',
  },
  machineElement: { 
    icon: <Settings2 className="w-4 h-4" />, 
    label: 'Machine Elements',
    color: 'text-purple-400',
    bgColor: 'bg-purple-400',
  },
  control: { 
    icon: <Cpu className="w-4 h-4" />, 
    label: 'Control Systems',
    color: 'text-green-400',
    bgColor: 'bg-green-400',
  },
};

const SUBDOMAIN_LABELS: Record<SubDomain, string> = {
  turbomachinery: 'Turbomachinery',
  piping: 'Piping & Valves',
  hydraulic: 'Hydraulic Systems',
  heatExchanger: 'Heat Exchangers',
  conduction: 'Conduction',
  convection: 'Convection',
  powerCycle: 'Power Cycles',
  refrigeration: 'Refrigeration',
  powerTransmission: 'Power Transmission',
  bearings: 'Bearings',
  fasteners: 'Fasteners',
  springs: 'Springs',
  sensors: 'Sensors',
  actuators: 'Actuators',
  controllers: 'Controllers',
};

// ============================================================================
// SUBDOMAIN GROUPS
// ============================================================================

const SUBDOMAIN_GROUPS: Record<MechanicalDomain, SubDomain[]> = {
  fluid: ['turbomachinery', 'piping', 'hydraulic'],
  heatTransfer: ['heatExchanger', 'conduction', 'convection'],
  thermodynamic: ['powerCycle', 'refrigeration'],
  machineElement: ['powerTransmission', 'bearings', 'fasteners', 'springs'],
  control: ['sensors', 'actuators', 'controllers'],
};

// ============================================================================
// COMPONENT PALETTE PROPS
// ============================================================================

interface ComponentPaletteProps {
  selectedDomain: MechanicalDomain | 'all';
  onSelectDomain: (domain: MechanicalDomain | 'all') => void;
  onAddComponent: (definitionId: string, position: { x: number; y: number }) => void;
}

// ============================================================================
// COMPONENT PALETTE COMPONENT
// ============================================================================

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  selectedDomain,
  onSelectDomain,
  onAddComponent,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());
  
  // Filter components based on search
  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results: { id: string; definition: ComponentDefinition }[] = [];
    
    for (const [id, definition] of Object.entries(COMPONENT_CATALOG)) {
      if (definition.name.toLowerCase().includes(query) ||
          definition.tags.some(tag => tag.toLowerCase().includes(query)) ||
          definition.subcategory.toLowerCase().includes(query)) {
        results.push({ id, definition });
      }
    }
    
    return results;
  }, [searchQuery]);
  
  // Get components by subdomain
  const componentsBySubdomain = useMemo(() => {
    const grouped: Record<string, { id: string; definition: ComponentDefinition }[]> = {};
    
    for (const [id, definition] of Object.entries(COMPONENT_CATALOG)) {
      const subdomain = definition.subcategory;
      if (!grouped[subdomain]) {
        grouped[subdomain] = [];
      }
      grouped[subdomain].push({ id, definition });
    }
    
    return grouped;
  }, []);
  
  // Toggle subdomain expansion
  const toggleSubdomain = useCallback((subdomain: string) => {
    setExpandedSubdomains(prev => {
      const next = new Set(prev);
      if (next.has(subdomain)) {
        next.delete(subdomain);
      } else {
        next.add(subdomain);
      }
      return next;
    });
  }, []);
  
  // Handle drag start
  const handleDragStart = useCallback((e: React.DragEvent, definitionId: string) => {
    e.dataTransfer.setData('application/mech-saf/componentId', definitionId);
    e.dataTransfer.effectAllowed = 'copy';
  }, []);
  
  // Handle drop (called from parent)
  const handleDrop = useCallback((e: React.DragEvent, canvasPosition: { x: number; y: number }) => {
    const definitionId = e.dataTransfer.getData('application/mech-saf/componentId');
    if (definitionId) {
      onAddComponent(definitionId, canvasPosition);
    }
  }, [onAddComponent]);
  
  // Export handleDrop for parent use
  React.useEffect(() => {
    (window as any).__mechSaffDropHandler = handleDrop;
  }, [handleDrop]);
  
  return (
    <div className="w-64 bg-gray-900 border-r border-gray-800 flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-gray-800">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
          Components
        </h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-300 placeholder-gray-500 focus:outline-none focus:border-cyan-500 transition-colors"
          />
        </div>
      </div>
      
      {/* Domain Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-gray-800">
        <button
          onClick={() => onSelectDomain('all')}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            selectedDomain === 'all'
              ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
              : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
          }`}
        >
          All
        </button>
        {Object.entries(DOMAIN_CONFIG).map(([domain, config]) => (
          <button
            key={domain}
            onClick={() => onSelectDomain(domain as MechanicalDomain)}
            className={`px-2 py-1 text-xs rounded transition-colors flex items-center gap-1 ${
              selectedDomain === domain
                ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/30'
                : 'text-gray-500 hover:text-gray-300 hover:bg-gray-800'
            }`}
            title={config.label}
          >
            {config.icon}
          </button>
        ))}
      </div>
      
      {/* Component List */}
      <div className="flex-1 overflow-y-auto">
        {searchQuery ? (
          // Search Results
          <div className="p-2">
            {filteredComponents?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Filter className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">No components found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredComponents?.map(({ id, definition }) => (
                  <ComponentListItem
                    key={id}
                    definition={definition}
                    onDragStart={handleDragStart}
                  />
                ))}
              </div>
            )}
          </div>
        ) : (
          // Hierarchical List
          <div className="p-2 space-y-3">
            {(selectedDomain === 'all' 
              ? Object.entries(SUBDOMAIN_GROUPS) 
              : [[selectedDomain, SUBDOMAIN_GROUPS[selectedDomain as MechanicalDomain] || []]]
            ).map(([domain, subdomains]) => {
              return subdomains.map(subdomain => {
                const components = componentsBySubdomain[subdomain] || [];
                if (components.length === 0) return null;
                
                const isExpanded = expandedSubdomains.has(subdomain);
                const domainConfig = DOMAIN_CONFIG[domain as MechanicalDomain];
                
                return (
                  <div key={`${domain}-${subdomain}`}>
                    <button
                      onClick={() => toggleSubdomain(subdomain)}
                      className="w-full flex items-center gap-2 px-2 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronDown className="w-3 h-3" />
                      ) : (
                        <ChevronRight className="w-3 h-3" />
                      )}
                      <span className={domainConfig?.color || ''}>
                        {domainConfig?.icon}
                      </span>
                      <span className="flex-1 text-left">
                        {SUBDOMAIN_LABELS[subdomain as SubDomain] || subdomain}
                      </span>
                      <span className="text-xs text-gray-600 bg-gray-800 px-1.5 rounded">
                        {components.length}
                      </span>
                    </button>
                    
                    {isExpanded && (
                      <div className="ml-4 mt-1 space-y-1 border-l border-gray-800 pl-2">
                        {components.map(({ id, definition }) => (
                          <ComponentListItem
                            key={id}
                            definition={definition}
                            onDragStart={handleDragStart}
                          />
                        ))}
                      </div>
                    )}
                  </div>
                );
              });
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-2 border-t border-gray-800 text-[10px] text-gray-500 text-center">
        Drag to canvas to add
      </div>
    </div>
  );
};

// ============================================================================
// COMPONENT LIST ITEM
// ============================================================================

interface ComponentListItemProps {
  definition: ComponentDefinition;
  onDragStart: (e: React.DragEvent, definitionId: string) => void;
}

const ComponentListItem: React.FC<ComponentListItemProps> = ({
  definition,
  onDragStart,
}) => {
  const domainConfig = DOMAIN_CONFIG[definition.domain];
  
  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, definition.id)}
      className="p-2 bg-gray-800/50 border border-gray-700/50 rounded hover:border-cyan-500/50 hover:bg-gray-800 cursor-grab active:cursor-grabbing transition-all group"
    >
      <div className="flex items-center gap-2">
        <div 
          className={`w-6 h-6 rounded flex items-center justify-center ${
            domainConfig?.bgColor || 'bg-gray-700'
          } bg-opacity-20`}
        >
          <span className={domainConfig?.color || 'text-gray-400'}>
            {domainConfig?.icon}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm text-gray-200 group-hover:text-white truncate">
            {definition.name}
          </div>
          <div className="text-[10px] text-gray-500 truncate">
            {definition.subcategory}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// EXPORT
// ============================================================================

export default ComponentPalette;

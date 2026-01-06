/**
 * Mechanical Component Palette
 * Domain-specific component selection panel
 */

import React, { useState, useMemo } from 'react';
import { 
  Search, 
  Plus, 
  Box, 
  Layers, 
  Cpu, 
  Zap, 
  Flame, 
  Droplets,
  Settings2,
  ChevronRight,
  Filter
} from 'lucide-react';
import { MechanicalDomain, SubDomain, MechanicalComponent } from '../types';
import { MechanicalCatalog, DomainCatalogs } from '../components/catalog';

interface ComponentPaletteProps {
  onAddComponent: (componentType: string, position: { x: number; y: number }) => void;
  selectedDomain: MechanicalDomain | 'all';
  onSelectDomain: (domain: MechanicalDomain | 'all') => void;
}

const DOMAIN_CONFIG: Record<MechanicalDomain, { icon: React.ReactNode; label: string; color: string }> = {
  fluid: { icon: <Droplets className="w-5 h-5" />, label: 'Fluid Systems', color: 'text-blue-400' },
  heatTransfer: { icon: <Flame className="w-5 h-5" />, label: 'Heat Transfer', color: 'text-orange-400' },
  thermodynamic: { icon: <Zap className="w-5 h-5" />, label: 'Thermodynamics', color: 'text-yellow-400' },
  machineElement: { icon: <Settings2 className="w-5 h-5" />, label: 'Machine Elements', color: 'text-purple-400' },
  control: { icon: <Cpu className="w-5 h-5" />, label: 'Control Systems', color: 'text-green-400' },
  solidMechanics: { icon: <Box className="w-5 h-5" />, label: 'Solid Mechanics', color: 'text-gray-400' },
  material: { icon: <Layers className="w-5 h-5" />, label: 'Materials', color: 'text-amber-400' },
  aerodynamic: { icon: <Zap className="w-5 h-5" />, label: 'Aerodynamics', color: 'text-cyan-400' }
};

const SUBDOMAIN_LABELS: Record<SubDomain, string> = {
  powerCycle: 'Power Cycles',
  refrigeration: 'Refrigeration',
  combustion: 'Combustion',
  internalFlow: 'Internal Flow',
  externalFlow: 'External Flow',
  turbomachinery: 'Turbomachinery',
  hydraulic: 'Hydraulic Systems',
  conduction: 'Conduction',
  convection: 'Convection',
  radiation: 'Radiation',
  heatExchanger: 'Heat Exchangers',
  static: 'Statics',
  dynamic: 'Dynamics',
  stress: 'Stress Analysis',
  failure: 'Failure Analysis',
  vibration: 'Vibration',
  powerTransmission: 'Power Transmission',
  fastener: 'Fasteners',
  spring: 'Springs',
  mechanism: 'Mechanisms',
  brake: 'Brakes & Clutches',
  metal: 'Metals',
  polymer: 'Polymers',
  composite: 'Composites',
  ceramic: 'Ceramics',
  failureMode: 'Failure Modes',
  sensor: 'Sensors',
  actuator: 'Actuators',
  controller: 'Controllers',
  compensation: 'Compensation',
  subsonic: 'Subsonic',
  transonic: 'Transonic',
  supersonic: 'Supersonic'
};

export const ComponentPalette: React.FC<ComponentPaletteProps> = ({
  onAddComponent,
  selectedDomain,
  onSelectDomain
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedSubdomains, setExpandedSubdomains] = useState<Set<string>>(new Set());
  
  const filteredComponents = useMemo(() => {
    if (!searchQuery.trim()) return null;
    
    const query = searchQuery.toLowerCase();
    const results: { type: string; component: Partial<MechanicalComponent> }[] = [];
    
    for (const [type, component] of Object.entries(MechanicalCatalog)) {
      if (component.name?.toLowerCase().includes(query) ||
          component.tags?.some(tag => tag.toLowerCase().includes(query)) ||
          component.category?.toLowerCase().includes(query)) {
        results.push({ type, component });
      }
    }
    
    return results;
  }, [searchQuery]);
  
  const handleDragStart = (e: React.DragEvent, componentType: string) => {
    e.dataTransfer.setData('application/saf/componentType', componentType);
    e.dataTransfer.effectAllowed = 'copy';
  };
  
  const handleDragEnd = (e: React.DragEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const componentType = e.dataTransfer.getData('application/saf/componentType');
    
    if (componentType) {
      onAddComponent(componentType, { x, y });
    }
  };
  
  const toggleSubdomain = (subdomain: string) => {
    const newExpanded = new Set(expandedSubdomains);
    if (newExpanded.has(subdomain)) {
      newExpanded.delete(subdomain);
    } else {
      newExpanded.add(subdomain);
    }
    setExpandedSubdomains(newExpanded);
  };
  
  return (
    <div className="w-72 shrink-0 flex flex-col bg-gray-900/95 border-r border-cyan-900/30 h-full">
      {/* Header */}
      <div className="p-4 border-b border-cyan-900/20">
        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-4">Component Library</h3>
        
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-2 top-2.5 w-4 h-4 text-gray-500" />
          <input
            type="text"
            placeholder="Search components..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-gray-800/50 border border-gray-700 rounded-lg pl-8 pr-2 py-2 text-sm text-gray-300 focus:outline-none focus:border-cyan-500/50 transition-colors"
          />
        </div>
      </div>
      
      {/* Domain Tabs */}
      <div className="flex flex-wrap gap-1 p-2 border-b border-cyan-900/20">
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
      <div className="flex-grow overflow-y-auto">
        {searchQuery ? (
          // Search Results
          <div className="p-2">
            {filteredComponents?.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p className="text-sm">No components found</p>
              </div>
            ) : (
              <div className="space-y-1">
                {filteredComponents?.map(({ type, component }) => (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
                    onDragEnd={handleDragEnd}
                    className="p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg hover:border-cyan-500/50 hover:bg-gray-800 cursor-grab active:cursor-grabbing transition-all group"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm font-medium text-gray-200 group-hover:text-white">
                          {component.name}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {component.category} → {component.subcategory}
                        </div>
                      </div>
                      <Plus className="w-4 h-4 text-gray-600 group-hover:text-cyan-400" />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          // Hierarchical Component List
          <div className="p-2 space-y-3">
            {(selectedDomain === 'all' ? Object.entries(DomainCatalogs) : [[selectedDomain, DomainCatalogs[selectedDomain as MechanicalDomain] || []]]).map(([domain, components]) => {
              const domainConfig = DOMAIN_CONFIG[domain as MechanicalDomain];
              if (!domainConfig) return null;
              
              // Group by subdomain
              const subdomainGroups: Record<string, string[]> = {};
              for (const compType of components) {
                const comp = MechanicalCatalog[compType];
                if (comp) {
                  const subdomain = comp.subcategory || 'general';
                  if (!subdomainGroups[subdomain]) {
                    subdomainGroups[subdomain] = [];
                  }
                  subdomainGroups[subdomain].push(compType);
                }
              }
              
              return (
                <div key={domain}>
                  <div className={`flex items-center gap-2 px-2 py-1 text-xs font-semibold uppercase tracking-wider ${domainConfig.color}`}>
                    {domainConfig.icon}
                    {domainConfig.label}
                  </div>
                  
                  <div className="mt-1 space-y-1">
                    {Object.entries(subdomainGroups).map(([subdomain, compTypes]) => {
                      const isExpanded = expandedSubdomains.has(`${domain}-${subdomain}`);
                      
                      return (
                        <div key={subdomain}>
                          <button
                            onClick={() => toggleSubdomain(`${domain}-${subdomain}`)}
                            className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:bg-gray-800/50 rounded transition-colors"
                          >
                            <ChevronRight className={`w-3 h-3 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                            <span>{SUBDOMAIN_LABELS[subdomain as SubDomain] || subdomain}</span>
                            <span className="ml-auto text-gray-600">{compTypes.length}</span>
                          </button>
                          
                          {isExpanded && (
                            <div className="ml-4 space-y-1 mt-0.5">
                              {compTypes.map((compType) => {
                                const comp = MechanicalCatalog[compType];
                                return (
                                  <div
                                    key={compType}
                                    draggable
                                    onDragStart={(e) => handleDragStart(e, compType)}
                                    onDragEnd={handleDragEnd}
                                    className="p-2 bg-gray-800/30 border border-transparent rounded hover:border-cyan-500/30 hover:bg-gray-800 cursor-grab active:cursor-grabbing transition-all group"
                                  >
                                    <div className="flex items-center justify-between">
                                      <span className="text-sm text-gray-300 group-hover:text-white">
                                        {comp?.name || compType}
                                      </span>
                                      <Plus className="w-3 h-3 text-gray-600 group-hover:text-cyan-400" />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Footer */}
      <div className="p-3 border-t border-cyan-900/20 text-[10px] text-gray-600 text-center">
        Drag components to canvas to add
      </div>
    </div>
  );
};

export default ComponentPalette;

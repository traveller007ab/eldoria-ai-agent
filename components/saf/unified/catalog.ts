/**
 * Mechanical SAF Lab - Unified Component Catalog
 * Combines components from v1 and v2 into a single comprehensive catalog
 */

import { ComponentDefinition, MechanicalDomain } from '../mechanical-v2/types';

// ============================================================================
// DOMAIN CONFIGURATIONS
// ============================================================================

export type UnifiedDomain = 
  | 'fluid'
  | 'heatTransfer' 
  | 'thermodynamic'
  | 'machineElement'
  | 'control'
  | 'electrical';

export interface DomainConfig {
  name: string;
  icon: string;
  color: string;
  description: string;
  domains: string[];
}

export const DOMAIN_CONFIG: Record<UnifiedDomain, DomainConfig> = {
  fluid: {
    name: 'Fluid Systems',
    icon: '💧',
    color: '#0ea5e9',
    description: 'Pumps, pipes, valves, compressors',
    domains: ['fluid'],
  },
  heatTransfer: {
    name: 'Heat Transfer',
    icon: '🔥',
    color: '#f97316',
    description: 'Heat exchangers, thermal systems',
    domains: ['heatTransfer'],
  },
  thermodynamic: {
    name: 'Thermodynamics',
    icon: '⚡',
    color: '#eab308',
    description: 'Power cycles, refrigeration',
    domains: ['thermodynamic'],
  },
  machineElement: {
    name: 'Machine Elements',
    icon: '⚙️',
    color: '#22c55e',
    description: 'Gears, bearings, springs, fasteners',
    domains: ['machineElement'],
  },
  control: {
    name: 'Control Systems',
    icon: '🎛️',
    color: '#a855f7',
    description: 'Controllers, sensors, actuators',
    domains: ['control'],
  },
  electrical: {
    name: 'Electrical',
    icon: '⚡',
    color: '#eab308',
    description: 'Motors, generators, power',
    domains: ['electrical'],
  },
};

// ============================================================================
// COMPONENT GROUPS
// ============================================================================

export interface ComponentGroup {
  name: string;
  domains: string[];
  components: string[];
}

export const COMPONENT_GROUPS: Record<string, ComponentGroup> = {
  // FLUID SYSTEMS
  turbomachinery: {
    name: 'Turbomachinery',
    domains: ['fluid'],
    components: [
      'fluid.pump.centrifugal',
      'fluid.compressor.centrifugal',
      'fluid.fan.axial',
    ],
  },
  piping: {
    name: 'Piping & Valves',
    domains: ['fluid'],
    components: [
      'fluid.pipe.straight',
      'fluid.valve.control',
      'fluid.valve.ball',
    ],
  },
  hydraulic: {
    name: 'Hydraulic Components',
    domains: ['fluid'],
    components: [
      'fluid.cylinder.hydraulic',
      'fluid.motor.hydraulic',
    ],
  },
  
  // HEAT TRANSFER
  heatExchanger: {
    name: 'Heat Exchangers',
    domains: ['heatTransfer'],
    components: [
      'heatTransfer.heatExchanger.shellTube',
      'heatTransfer.heatExchanger.plate',
      'heatTransfer.heatExchanger.airCooled',
    ],
  },
  
  // MACHINE ELEMENTS
  powerTransmission: {
    name: 'Power Transmission',
    domains: ['machineElement'],
    components: [
      'machineElement.powerTransmission.spurGear',
    ],
  },
  bearings: {
    name: 'Bearings',
    domains: ['machineElement'],
    components: [
      'machineElement.bearings.deepGrooveBall',
    ],
  },
  springs: {
    name: 'Springs',
    domains: ['machineElement'],
    components: [
      'machineElement.springs.compression',
    ],
  },
  
  // CONTROL SYSTEMS
  controllers: {
    name: 'Controllers',
    domains: ['control'],
    components: [
      'control.controllers.pid',
    ],
  },
  sensors: {
    name: 'Sensors',
    domains: ['control'],
    components: [
      'control.sensors.temperature',
    ],
  },
  
  // THERMODYNAMIC CYCLES (Templates)
  powerCycles: {
    name: 'Power Cycles',
    domains: ['thermodynamic'],
    components: [
      'template.rankineCycle',
    ],
  },
  processControl: {
    name: 'Process Control',
    domains: ['thermodynamic', 'control'],
    components: [
      'template.controlledProcess',
    ],
  },
};

// ============================================================================
// UNIFIED CATALOG ENTRY
// ============================================================================

export interface UnifiedComponentEntry {
  definition: ComponentDefinition;
  unifiedDomain: UnifiedDomain;
  source: 'v1' | 'v2';
  priority: 'core' | 'extended';
  group: string;
}

export const UNIFIED_CATALOG: Record<string, UnifiedComponentEntry> = {};

// ============================================================================
// INITIALIZE FROM V2 COMPONENTS
// ============================================================================

import { COMPONENT_CATALOG as V2_FLUID_CATALOG } from '../mechanical-v2/components/fluid';
import { EXTENDED_COMPONENT_CATALOG } from '../mechanical-v2/components/extended';

function initializeFromV2(): void {
  // Add V2 Fluid components
  for (const [id, def] of Object.entries(V2_FLUID_CATALOG)) {
    const groupInfo = getGroupInfo(id);
    UNIFIED_CATALOG[id] = {
      definition: def,
      unifiedDomain: mapDomain(def.domain),
      source: 'v2',
      priority: 'core',
      group: groupInfo?.group || 'piping',
    };
  }
  
  // Add V2 Extended components
  for (const [id, def] of Object.entries(EXTENDED_COMPONENT_CATALOG)) {
    const groupInfo = getGroupInfo(id);
    UNIFIED_CATALOG[id] = {
      definition: def,
      unifiedDomain: mapDomain(def.domain),
      source: 'v2',
      priority: 'extended',
      group: groupInfo?.group || 'piping',
    };
  }
}

function mapDomain(domain: MechanicalDomain): UnifiedDomain {
  const mapping: Record<MechanicalDomain, UnifiedDomain> = {
    fluid: 'fluid',
    heatTransfer: 'heatTransfer',
    thermodynamic: 'thermodynamic',
    machineElement: 'machineElement',
    control: 'control',
  };
  return mapping[domain] || 'fluid';
}

// ============================================================================
// EXPORT HELPERS
// ============================================================================

export function getComponentsByDomain(domain: UnifiedDomain): UnifiedComponentEntry[] {
  return Object.values(UNIFIED_CATALOG).filter(
    entry => entry.unifiedDomain === domain
  );
}

export function getComponentsByGroup(groupKey: string): UnifiedComponentEntry[] {
  return Object.values(UNIFIED_CATALOG).filter(
    entry => entry.group === groupKey
  );
}

export function getAllComponentIds(): string[] {
  return Object.keys(UNIFIED_CATALOG);
}

export function getComponentDefinition(id: string): ComponentDefinition | undefined {
  return UNIFIED_CATALOG[id]?.definition;
}

export function getComponentEntry(id: string): UnifiedComponentEntry | undefined {
  return UNIFIED_CATALOG[id];
}

export function searchComponents(query: string): string[] {
  const results: string[] = [];
  const lowerQuery = query.toLowerCase();
  
  for (const [id, entry] of Object.entries(UNIFIED_CATALOG)) {
    if (id.toLowerCase().includes(lowerQuery) ||
        entry.definition.name.toLowerCase().includes(lowerQuery) ||
        entry.group.toLowerCase().includes(lowerQuery)) {
      results.push(id);
    }
  }
  
  return results;
}

export function getGroupInfo(componentId: string): { group: string; domain: string } | null {
  for (const [groupKey, group] of Object.entries(COMPONENT_GROUPS)) {
    if (group.components.includes(componentId)) {
      return { group: groupKey, domain: group.domains[0] };
    }
  }
  return null;
}

export function getDomainForComponent(componentId: string): UnifiedDomain | null {
  return UNIFIED_CATALOG[componentId]?.unifiedDomain || null;
}

export function getComponentsByDomains(domains: UnifiedDomain[]): UnifiedComponentEntry[] {
  return Object.values(UNIFIED_CATALOG).filter(
    entry => domains.includes(entry.unifiedDomain)
  );
}

export function getTemplates(): UnifiedComponentEntry[] {
  return Object.values(UNIFIED_CATALOG).filter(
    entry => entry.definition.id.startsWith('template.')
  );
}

// ============================================================================
// INITIALIZE AND EXPORT
// ============================================================================

// Initialize catalog
initializeFromV2();

export default {
  UNIFIED_CATALOG,
  DOMAIN_CONFIG,
  COMPONENT_GROUPS,
  getComponentsByDomain,
  getComponentsByGroup,
  getAllComponentIds,
  getComponentDefinition,
  getComponentEntry,
  searchComponents,
  getGroupInfo,
  getDomainForComponent,
  getComponentsByDomains,
  getTemplates,
};

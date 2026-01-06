/**
 * Mechanical Catalog Index
 * Registry of all available mechanical components
 */

import { MechanicalComponent, MechanicalDomain, SubDomain, createComponentId } from '../types';
import { CentrifugalPump } from './turbomachinery/centrifugalPump';
import { HelicalGear } from './machineElements/gears/helicalGear';
import { SpurGear } from './machineElements/gears/spurGear';

// ═══════════════════════════════════════════════════════════════
// CATALOG REGISTRY
// ═══════════════════════════════════════════════════════════════

export const MechanicalCatalog: Record<string, Partial<MechanicalComponent>> = {
  // ═══ TURBOMACHINERY - PUMPS ═══
  'centrifugal_pump': CentrifugalPump,
  'axial_pump': {
    id: createComponentId('pump'),
    name: 'Axial Flow Pump',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Axial flow pump for high flow, low head applications',
    tags: ['pump', 'axial', 'fluid', 'turbomachinery']
  },
  'positive_displacement_pump': {
    id: createComponentId('pump'),
    name: 'Positive Displacement Pump',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Rotary positive displacement pump',
    tags: ['pump', 'positive_displacement', 'fluid']
  },
  
  // ═══ TURBOMACHINERY - COMPRESSORS ═══
  'centrifugal_compressor': {
    id: createComponentId('compressor'),
    name: 'Centrifugal Compressor',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Radial-flow compressor for gas compression',
    tags: ['compressor', 'centrifugal', 'gas', 'turbomachinery']
  },
  'axial_compressor': {
    id: createComponentId('compressor'),
    name: 'Axial Compressor',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Axial flow compressor for high flow applications',
    tags: ['compressor', 'axial', 'gas', 'turbomachinery']
  },
  'reciprocating_compressor': {
    id: createComponentId('compressor'),
    name: 'Reciprocating Compressor',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Piston-type compressor for high pressure',
    tags: ['compressor', 'reciprocating', 'piston', 'high_pressure']
  },
  'scroll_compressor': {
    id: createComponentId('compressor'),
    name: 'Scroll Compressor',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Scroll-type compressor for HVAC applications',
    tags: ['compressor', 'scroll', 'hvac']
  },
  
  // ═══ TURBOMACHINERY - TURBINES ═══
  'impulse_turbine': {
    id: createComponentId('turbine'),
    name: 'Impulse Turbine',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Pelton wheel impulse turbine',
    tags: ['turbine', 'impulse', 'pelton', 'hydro']
  },
  'reaction_turbine': {
    id: createComponentId('turbine'),
    name: 'Reaction Turbine',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'turbomachinery' as SubDomain,
    description: 'Francis reaction turbine',
    tags: ['turbine', 'reaction', 'francis', 'hydro']
  },
  'gas_turbine': {
    id: createComponentId('turbine'),
    name: 'Gas Turbine',
    category: 'thermodynamic' as MechanicalDomain,
    subcategory: 'powerCycle' as SubDomain,
    description: 'Brayton cycle gas turbine',
    tags: ['turbine', 'gas', 'brayton', 'power']
  },
  
  // ═══ HEAT EXCHANGERS ═══
  'shell_and_tube_he': {
    id: createComponentId('he'),
    name: 'Shell & Tube Heat Exchanger',
    category: 'heatTransfer' as MechanicalDomain,
    subcategory: 'heatExchanger' as SubDomain,
    description: 'TEMA E-shell heat exchanger',
    tags: ['heatexchanger', 'shell', 'tube', 'industrial']
  },
  'plate_heatexchanger': {
    id: createComponentId('he'),
    name: 'Plate Heat Exchanger',
    category: 'heatTransfer' as MechanicalDomain,
    subcategory: 'heatExchanger' as SubDomain,
    description: 'Gasketed plate heat exchanger',
    tags: ['heatexchanger', 'plate', 'compact']
  },
  'air_cooler': {
    id: createComponentId('he'),
    name: 'Air Cooled Heat Exchanger',
    category: 'heatTransfer' as MechanicalDomain,
    subcategory: 'heatExchanger' as SubDomain,
    description: 'Fin-fan air cooler',
    tags: ['heatexchanger', 'air', 'cooling']
  },
  
  // ═══ VALVES ═══
  'control_valve': {
    id: createComponentId('valve'),
    name: 'Control Valve',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'internalFlow' as SubDomain,
    description: 'Globe-style control valve',
    tags: ['valve', 'control', 'flow', 'regulation']
  },
  'gate_valve': {
    id: createComponentId('valve'),
    name: 'Gate Valve',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'internalFlow' as SubDomain,
    description: 'Rising stem gate valve',
    tags: ['valve', 'gate', 'isolation']
  },
  'check_valve': {
    id: createComponentId('valve'),
    name: 'Check Valve',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'internalFlow' as SubDomain,
    description: 'Swing check valve',
    tags: ['valve', 'check', 'non_return']
  },
  'ball_valve': {
    id: createComponentId('valve'),
    name: 'Ball Valve',
    category: 'fluid' as MechanicalDomain,
    subcategory: 'internalFlow' as SubDomain,
    description: 'Full port ball valve',
    tags: ['valve', 'ball', 'isolation']
  },
  
  // ═══ GEARS ═══
  'spur_gear': SpurGear,
  'helical_gear': HelicalGear,
  'bevel_gear': {
    id: createComponentId('gear'),
    name: 'Bevel Gear',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Straight bevel gear for 90° shafts',
    tags: ['gear', 'bevel', '90_degree']
  },
  'worm_gear': {
    id: createComponentId('gear'),
    name: 'Worm Gear',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Worm and worm wheel for high reduction',
    tags: ['gear', 'worm', 'high_reduction']
  },
  'planetary_gear': {
    id: createComponentId('gear'),
    name: 'Planetary Gear Set',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Epicyclic planetary gear set',
    tags: ['gear', 'planetary', 'epicyclic', 'compact']
  },
  
  // ═══ BEARINGS ═══
  'deep_groove_ball_bearing': {
    id: createComponentId('bearing'),
    name: 'Deep Groove Ball Bearing',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: '6000 series ball bearing',
    tags: ['bearing', 'ball', 'rolling_element']
  },
  'angular_contact_bearing': {
    id: createComponentId('bearing'),
    name: 'Angular Contact Ball Bearing',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Angular contact bearing for combined loads',
    tags: ['bearing', 'angular', 'combined_load']
  },
  'cylindrical_roller_bearing': {
    id: createComponentId('bearing'),
    name: 'Cylindrical Roller Bearing',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'NU/N type roller bearing',
    tags: ['bearing', 'roller', 'high_radial']
  },
  
  // ═══ COUPLINGS ═══
  'rigid_coupling': {
    id: createComponentId('coupling'),
    name: 'Rigid Coupling',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Sleeve rigid coupling',
    tags: ['coupling', 'rigid', 'torque_transmission']
  },
  'flexible_coupling': {
    id: createComponentId('coupling'),
    name: 'Flexible Coupling',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Elastomeric flexible coupling',
    tags: ['coupling', 'flexible', 'misalignment']
  },
  
  // ═══ SHAFTS ═══
  'solid_shaft': {
    id: createComponentId('shaft'),
    name: 'Solid Shaft',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Solid round shaft for torque transmission',
    tags: ['shaft', 'solid', 'torque']
  },
  'hollow_shaft': {
    id: createComponentId('shaft'),
    name: 'Hollow Shaft',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'powerTransmission' as SubDomain,
    description: 'Hollow tubular shaft',
    tags: ['shaft', 'hollow', 'tubular']
  },
  
  // ═══ SPRINGS ═══
  'helical_compression_spring': {
    id: createComponentId('spring'),
    name: 'Helical Compression Spring',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'spring' as SubDomain,
    description: 'Cylindrical compression spring',
    tags: ['spring', 'compression', 'helical']
  },
  'helical_extension_spring': {
    id: createComponentId('spring'),
    name: 'Helical Extension Spring',
    category: 'machineElement' as MechanicalDomain,
    subcategory: 'spring' as SubDomain,
    description: 'Hook-ended extension spring',
    tags: ['spring', 'extension', 'helical']
  },
  
  // ═══ MOTORS ═══
  'ac_induction_motor': {
    id: createComponentId('motor'),
    name: 'AC Induction Motor',
    category: 'control' as MechanicalDomain,
    subcategory: 'actuator' as SubDomain,
    description: 'Three-phase induction motor',
    tags: ['motor', 'ac', 'induction', 'actuator']
  },
  'servo_motor': {
    id: createComponentId('motor'),
    name: 'Servo Motor',
    category: 'control' as MechanicalDomain,
    subcategory: 'actuator' as SubDomain,
    description: 'AC servo motor with encoder',
    tags: ['motor', 'servo', 'actuator', 'position_control']
  },
  
  // ═══ CONTROLLERS ═══
  'pid_controller': {
    id: createComponentId('controller'),
    name: 'PID Controller',
    category: 'control' as MechanicalDomain,
    subcategory: 'controller' as SubDomain,
    description: 'Proportional-Integral-Derivative controller',
    tags: ['controller', 'pid', 'feedback']
  },
  
  // ═══ SENSORS ═══
  'pressure_transmitter': {
    id: createComponentId('sensor'),
    name: 'Pressure Transmitter',
    category: 'control' as MechanicalDomain,
    subcategory: 'sensor' as SubDomain,
    description: '4-20mA pressure transmitter',
    tags: ['sensor', 'pressure', 'transmitter']
  },
  'temperature_sensor': {
    id: createComponentId('sensor'),
    name: 'Temperature Sensor',
    category: 'control' as MechanicalDomain,
    subcategory: 'sensor' as SubDomain,
    description: 'RTD temperature sensor',
    tags: ['sensor', 'temperature', 'rtd']
  },
  'flowmeter': {
    id: createComponentId('sensor'),
    name: 'Flow Meter',
    category: 'control' as MechanicalDomain,
    subcategory: 'sensor' as SubDomain,
    description: 'Magnetic flow meter',
    tags: ['sensor', 'flow', 'magmeter']
  },
  
  // ═══ STRUCTURAL ═══
  'beam': {
    id: createComponentId('beam'),
    name: 'Beam Element',
    category: 'solidMechanics' as MechanicalDomain,
    subcategory: 'static' as SubDomain,
    description: 'Structural beam for analysis',
    tags: ['beam', 'structural', 'bending']
  },
  'column': {
    id: createComponentId('column'),
    name: 'Column Element',
    category: 'solidMechanics' as MechanicalDomain,
    subcategory: 'static' as SubDomain,
    description: 'Compression member for buckling analysis',
    tags: ['column', 'structural', 'buckling']
  },
  
  // ═══ THERMODYNAMIC - POWER CYCLE ═══
  'boiler': {
    id: createComponentId('boiler'),
    name: 'Boiler',
    category: 'thermodynamic' as MechanicalDomain,
    subcategory: 'powerCycle' as SubDomain,
    description: 'Fire-tube steam boiler',
    tags: ['boiler', 'steam', 'power']
  },
  'condenser': {
    id: createComponentId('condenser'),
    name: 'Surface Condenser',
    category: 'thermodynamic' as MechanicalDomain,
    subcategory: 'powerCycle' as SubDomain,
    description: 'Steam surface condenser',
    tags: ['condenser', 'steam', 'thermal']
  },
  'feedwater_pump': {
    id: createComponentId('pump'),
    name: 'Feedwater Pump',
    category: 'thermodynamic' as MechanicalDomain,
    subcategory: 'powerCycle' as SubDomain,
    description: 'High pressure feedwater pump',
    tags: ['pump', 'feedwater', 'high_pressure']
  }
};

// ═══════════════════════════════════════════════════════════════
// DOMAIN CATALOGS
// ═══════════════════════════════════════════════════════════════

export const DomainCatalogs: Record<MechanicalDomain, string[]> = {
  'fluid': [
    'centrifugal_pump', 'axial_pump', 'positive_displacement_pump',
    'centrifugal_compressor', 'axial_compressor', 'reciprocating_compressor', 'scroll_compressor',
    'impulse_turbine', 'reaction_turbine', 'gas_turbine',
    'control_valve', 'gate_valve', 'check_valve', 'ball_valve',
    'feedwater_pump'
  ],
  'heatTransfer': [
    'shell_and_tube_he', 'plate_heatexchanger', 'air_cooler', 'condenser'
  ],
  'thermodynamic': [
    'gas_turbine', 'boiler', 'condenser', 'feedwater_pump'
  ],
  'machineElement': [
    'spur_gear', 'helical_gear', 'bevel_gear', 'worm_gear', 'planetary_gear',
    'deep_groove_ball_bearing', 'angular_contact_bearing', 'cylindrical_roller_bearing',
    'rigid_coupling', 'flexible_coupling',
    'solid_shaft', 'hollow_shaft',
    'helical_compression_spring', 'helical_extension_spring'
  ],
  'control': [
    'ac_induction_motor', 'servo_motor',
    'pid_controller',
    'pressure_transmitter', 'temperature_sensor', 'flowmeter'
  ],
  'solidMechanics': [
    'beam', 'column'
  ],
  'material': [],
  'aerodynamic': []
};

// ═══════════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════

export function getComponentTemplate(type: string): Partial<MechanicalComponent> | null {
  return MechanicalCatalog[type] || null;
}

export function getComponentsByDomain(domain: MechanicalDomain): string[] {
  return DomainCatalogs[domain] || [];
}

export function searchComponents(query: string): string[] {
  const lowerQuery = query.toLowerCase();
  const results: string[] = [];
  
  for (const [type, component] of Object.entries(MechanicalCatalog)) {
    if (component.name?.toLowerCase().includes(lowerQuery) ||
        component.description?.toLowerCase().includes(lowerQuery) ||
        component.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))) {
      results.push(type);
    }
  }
  
  return results;
}

export function getAllComponentTypes(): string[] {
  return Object.keys(MechanicalCatalog);
}

export function getTotalComponentCount(): number {
  return Object.keys(MechanicalCatalog).length;
}

export function getComponentsByTag(tag: string): string[] {
  const lowerTag = tag.toLowerCase();
  const results: string[] = [];
  
  for (const [type, component] of Object.entries(MechanicalCatalog)) {
    if (component.tags?.some(t => t.toLowerCase().includes(lowerTag))) {
      results.push(type);
    }
  }
  
  return results;
}

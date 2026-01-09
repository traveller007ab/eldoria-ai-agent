/**
 * Blueprint Templates System
 * Pre-configured engineering system templates
 */

import { SAFBlueprint, MechanicalComponent, Connection } from '../types';
import { createComponentId } from '../types';

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  category: 'cooling' | 'heating' | 'power' | 'pumping' | 'custom';
  domain: 'fluid' | 'thermodynamic' | 'solidMechanics';
  components: MechanicalComponent[];
  connections: Connection[];
  thumbnail?: string;
  tags: string[];
}

/**
 * Cooling Water System Template
 * A simple recirculating cooling water loop with pump and heat exchanger
 */
export const coolingWaterSystemTemplate: BlueprintTemplate = {
  id: 'template_cooling_water_001',
  name: 'Cooling Water System',
  description: 'Simple recirculating cooling water loop with pump, heat exchanger, and piping',
  category: 'cooling',
  domain: 'fluid',
  tags: ['cooling', 'recirculating', 'HVAC'],
  components: [
    {
      id: createComponentId('comp'),
      componentDefinitionId: 'fluid.pump.centrifugal',
      name: 'Cooling Water Pump',
      category: 'fluid',
      subcategory: 'turbomachinery',
      description: 'Centrifugal pump for cooling water circulation',
      geometry: {
        type: 'primitive',
        dimensions: { x: 100, y: 200, width: 80, height: 60 }
      },
      ports: [
        { id: 'pump_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pump_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'Q_design', symbol: 'Q_design', value: 0.05, unit: 'm³/s', designRange: { min: 0.01, max: 0.2 } },
        { name: 'H_design', symbol: 'H_design', value: 25, unit: 'm', designRange: { min: 10, max: 50 } },
        { name: 'η_BEP', symbol: 'η_BEP', value: 0.78, unit: '-', designRange: { min: 0.6, max: 0.85 } },
        { name: 'N', symbol: 'N', value: 1450, unit: 'rpm', designRange: { min: 1000, max: 3000 } },
        { name: 'power', symbol: 'W', value: 15.7, unit: 'kW' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      // No standard ID for HX yet
      name: 'Heat Exchanger',
      category: 'heatTransfer',
      subcategory: 'heatExchanger',
      description: 'Shell and tube heat exchanger',
      geometry: {
        type: 'primitive',
        dimensions: { x: 300, y: 200, width: 100, height: 80 }
      },
      ports: [
        { id: 'he_cold_in', name: 'Cold Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'he_cold_out', name: 'Cold Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'he_hot_in', name: 'Hot Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'he_hot_out', name: 'Hot Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'A', symbol: 'A', value: 50, unit: 'm²', designRange: { min: 10, max: 200 } },
        { name: 'U', symbol: 'U', value: 800, unit: 'W/(m²·K)', designRange: { min: 200, max: 2000 } },
        { name: 'T_hot_in', symbol: 'T_hot_in', value: 80, unit: '°C' },
        { name: 'T_cold_in', symbol: 'T_cold_in', value: 25, unit: '°C' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      componentDefinitionId: 'fluid.pipe.std',
      name: 'Supply Pipe',
      category: 'fluid',
      subcategory: 'internalFlow',
      description: 'Cooling water supply pipe',
      geometry: {
        type: 'primitive',
        dimensions: { x: 200, y: 130, width: 120, height: 20 }
      },
      ports: [
        { id: 'pipe1_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pipe1_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'L', symbol: 'L', value: 10, unit: 'm', designRange: { min: 1, max: 100 } },
        { name: 'D', symbol: 'D', value: 0.15, unit: 'm', standardSizes: [0.1, 0.15, 0.2, 0.25] },
        { name: 'roughness', symbol: 'ε', value: 0.045, unit: 'mm' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      componentDefinitionId: 'fluid.pipe.std',
      name: 'Return Pipe',
      category: 'fluid',
      subcategory: 'internalFlow',
      description: 'Cooling water return pipe',
      geometry: {
        type: 'primitive',
        dimensions: { x: 200, y: 330, width: 120, height: 20 }
      },
      ports: [
        { id: 'pipe2_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pipe2_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'L', symbol: 'L', value: 10, unit: 'm', designRange: { min: 1, max: 100 } },
        { name: 'D', symbol: 'D', value: 0.15, unit: 'm', standardSizes: [0.1, 0.15, 0.2, 0.25] },
        { name: 'roughness', symbol: 'ε', value: 0.045, unit: 'mm' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      componentDefinitionId: 'fluid.tank.reservoir',
      name: 'Reservoir',
      category: 'fluid',
      subcategory: 'internalFlow',
      description: 'Cooling water reservoir tank',
      geometry: {
        type: 'primitive',
        dimensions: { x: 50, y: 350, width: 80, height: 60 }
      },
      ports: [
        { id: 'tank_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'tank_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'V', symbol: 'V', value: 10, unit: 'm³' },
        { name: 'P_atm', symbol: 'P_atm', value: 101.3, unit: 'kPa' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    }
  ],
  connections: [
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'tank_out',
      targetComponentId: '',
      targetPortId: 'pump_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pump_out',
      targetComponentId: '',
      targetPortId: 'pipe1_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pipe1_out',
      targetComponentId: '',
      targetPortId: 'he_cold_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'he_cold_out',
      targetComponentId: '',
      targetPortId: 'pipe2_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pipe2_out',
      targetComponentId: '',
      targetPortId: 'tank_in',
      type: 'fluid'
    }
  ]
};

/**
 * Steam Power Plant Template
 * Basic Rankine cycle with boiler, turbine, condenser, and pump
 */
export const steamPowerPlantTemplate: BlueprintTemplate = {
  id: 'template_steam_power_001',
  name: 'Steam Power Plant',
  description: 'Basic Rankine cycle with boiler, turbine, condenser, and feedwater pump',
  category: 'power',
  domain: 'thermodynamic',
  tags: ['power', 'steam', 'rankine', 'cycle'],
  components: [
    {
      id: createComponentId('comp'),
      name: 'Boiler',
      category: 'thermodynamic',
      subcategory: 'powerCycle',
      description: 'Steam generator boiler',
      geometry: {
        type: 'primitive',
        dimensions: { x: 100, y: 150, width: 100, height: 80 }
      },
      ports: [
        { id: 'boiler_in', name: 'Feedwater Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'boiler_out', name: 'Steam Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'P_in', symbol: 'P_in', value: 8000, unit: 'kPa' },
        { name: 'P_out', symbol: 'P_out', value: 8000, unit: 'kPa' },
        { name: 'T_out', symbol: 'T_out', value: 500, unit: '°C' },
        { name: 'Q_add', symbol: 'Q_in', value: 500, unit: 'MW' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Steam Turbine',
      category: 'thermodynamic',
      subcategory: 'powerCycle',
      description: 'Steam turbine for power generation',
      geometry: {
        type: 'primitive',
        dimensions: { x: 300, y: 100, width: 120, height: 100 }
      },
      ports: [
        { id: 'turbine_in', name: 'Steam Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'turbine_out', name: 'Steam Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'turbine_shaft', name: 'Shaft Output', type: 'output', domain: 'mechanical', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'W_output', symbol: 'W_net', value: 150, unit: 'MW' },
        { name: 'η_isen', symbol: 'η_isen', value: 0.85, unit: '-', designRange: { min: 0.7, max: 0.92 } }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Condenser',
      category: 'heatTransfer',
      subcategory: 'heatExchanger',
      description: 'Steam condenser',
      geometry: {
        type: 'primitive',
        dimensions: { x: 500, y: 150, width: 100, height: 80 }
      },
      ports: [
        { id: 'cond_steam_in', name: 'Steam Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'cond_cond_out', name: 'Condensate Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'P_cond', symbol: 'P_cond', value: 10, unit: 'kPa' },
        { name: 'T_cond', symbol: 'T_sat', value: 45.8, unit: '°C' },
        { name: 'Q_rej', symbol: 'Q_out', value: 350, unit: 'MW' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Feedwater Pump',
      category: 'fluid',
      subcategory: 'turbomachinery',
      description: 'Boiler feedwater pump',
      geometry: {
        type: 'primitive',
        dimensions: { x: 300, y: 350, width: 80, height: 60 }
      },
      ports: [
        { id: 'pump_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pump_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'W_input', symbol: 'W_pump', value: 5, unit: 'MW' },
        { name: 'η_pump', symbol: 'η_pump', value: 0.8, unit: '-', designRange: { min: 0.7, max: 0.9 } }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    }
  ],
  connections: [
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'boiler_out',
      targetComponentId: '',
      targetPortId: 'turbine_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'turbine_out',
      targetComponentId: '',
      targetPortId: 'cond_steam_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'cond_cond_out',
      targetComponentId: '',
      targetPortId: 'pump_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pump_out',
      targetComponentId: '',
      targetPortId: 'boiler_in',
      type: 'fluid'
    }
  ]
};

/**
 * Pumping Station Template
 * Booster pump system with parallel pumps
 */
export const pumpingStationTemplate: BlueprintTemplate = {
  id: 'template_pumping_001',
  name: 'Booster Pumping Station',
  description: 'Parallel booster pumps with common manifold',
  category: 'pumping',
  domain: 'fluid',
  tags: ['pumping', 'booster', 'parallel'],
  components: [
    {
      id: createComponentId('comp'),
      name: 'Booster Pump 1',
      category: 'fluid',
      subcategory: 'turbomachinery',
      description: 'First booster pump',
      geometry: {
        type: 'primitive',
        dimensions: { x: 150, y: 150, width: 80, height: 60 }
      },
      ports: [
        { id: 'pump1_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pump1_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'Q_design', symbol: 'Q_design', value: 0.1, unit: 'm³/s' },
        { name: 'H_design', symbol: 'H_design', value: 40, unit: 'm' },
        { name: 'η_BEP', symbol: 'η_BEP', value: 0.8, unit: '-' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Booster Pump 2',
      category: 'fluid',
      subcategory: 'turbomachinery',
      description: 'Second booster pump (parallel)',
      geometry: {
        type: 'primitive',
        dimensions: { x: 150, y: 280, width: 80, height: 60 }
      },
      ports: [
        { id: 'pump2_in', name: 'Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'pump2_out', name: 'Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'Q_design', symbol: 'Q_design', value: 0.1, unit: 'm³/s' },
        { name: 'H_design', symbol: 'H_design', value: 40, unit: 'm' },
        { name: 'η_BEP', symbol: 'η_BEP', value: 0.8, unit: '-' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Suction Manifold',
      category: 'fluid',
      subcategory: 'internalFlow',
      description: 'Common suction manifold',
      geometry: {
        type: 'primitive',
        dimensions: { x: 50, y: 200, width: 80, height: 80 }
      },
      ports: [
        { id: 'manif_in', name: 'Main Inlet', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'manif_out1', name: 'Outlet 1', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'manif_out2', name: 'Outlet 2', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'D', symbol: 'D', value: 0.2, unit: 'm' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    },
    {
      id: createComponentId('comp'),
      name: 'Discharge Manifold',
      category: 'fluid',
      subcategory: 'internalFlow',
      description: 'Common discharge manifold',
      geometry: {
        type: 'primitive',
        dimensions: { x: 300, y: 200, width: 80, height: 80 }
      },
      ports: [
        { id: 'manif2_in1', name: 'Inlet 1', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'manif2_in2', name: 'Inlet 2', type: 'input', domain: 'fluid', variables: [], state: 'disconnected' },
        { id: 'manif2_out', name: 'Main Outlet', type: 'output', domain: 'fluid', variables: [], state: 'disconnected' }
      ],
      parameters: [
        { name: 'D', symbol: 'D', value: 0.2, unit: 'm' }
      ],
      states: [],
      equations: [],
      constraints: [],
      performanceMaps: [],
      material: undefined
    }
  ],
  connections: [
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'manif_out1',
      targetComponentId: '',
      targetPortId: 'pump1_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'manif_out2',
      targetComponentId: '',
      targetPortId: 'pump2_in',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pump1_out',
      targetComponentId: '',
      targetPortId: 'manif2_in1',
      type: 'fluid'
    },
    {
      id: createComponentId('conn'),
      sourceComponentId: '',
      sourcePortId: 'pump2_out',
      targetComponentId: '',
      targetPortId: 'manif2_in2',
      type: 'fluid'
    }
  ]
};

/**
 * All available templates
 */
export const blueprintTemplates: BlueprintTemplate[] = [
  coolingWaterSystemTemplate,
  steamPowerPlantTemplate,
  pumpingStationTemplate
];

/**
 * Get template by ID
 */
export function getTemplateById(id: string): BlueprintTemplate | undefined {
  return blueprintTemplates.find(t => t.id === id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): BlueprintTemplate[] {
  return blueprintTemplates.filter(t => t.category === category);
}

/**
 * Search templates by name or tags
 */
export function searchTemplates(query: string): BlueprintTemplate[] {
  const lowerQuery = query.toLowerCase();
  return blueprintTemplates.filter(t =>
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

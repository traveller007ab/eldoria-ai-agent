/**
 * Mechanical SAF Lab v2.0 - Blueprint Templates
 * Pre-built system templates for common mechanical engineering applications.
 */

import {
  Blueprint,
  ComponentInstance,
  Connection,
  MechanicalDomain,
  createComponentId,
} from '../types';

// ============================================================================
// TEMPLATE BASE INTERFACE
// ============================================================================

export interface BlueprintTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  domain: MechanicalDomain;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedTime: string; // e.g., "15 min"
  components: TemplateComponent[];
  connections: TemplateConnection[];
  tags: string[];
}

interface TemplateComponent {
  definitionId: string;
  name: string;
  position: { x: number; y: number };
  parameters?: Record<string, number | string>;
}

interface TemplateConnection {
  from: string; // Component name
  fromPort: string;
  to: string;   // Component name
  toPort: string;
}

// ============================================================================
// TEMPLATE 1: COOLING WATER SYSTEM
// ============================================================================

export const COOLING_WATER_TEMPLATE: BlueprintTemplate = {
  id: 'template.coolingWater',
  name: 'Cooling Water System',
  description: 'A closed-loop cooling water system with cooling tower, primary and secondary pumps, heat exchanger, and control valve. Typical of industrial process cooling applications.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['cooling', 'closed loop', 'industrial', 'pumps', 'heat exchanger'],
  
  components: [
    // Cooling Tower
    {
      definitionId: 'heatTransfer.heatExchanger.shellTube',
      name: 'Cooling Tower',
      position: { x: 100, y: 50 },
      parameters: {
        A: 150,          // 150 m² heat transfer area
        U: 400,          // 400 W/(m²·K)
      },
    },
    // Primary Pump (Circulation)
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Primary Pump',
      position: { x: 100, y: 250 },
      parameters: {
        Q_design: 200,   // 200 m³/h
        H_design: 35,    // 35 m head
        eta_BEP: 0.78,   // 78% efficiency
        N: 1450,         // 1450 rpm
        NPSHr: 4.0,      // 4 m NPSHr
      },
    },
    // Heat Exchanger (Process)
    {
      definitionId: 'heatTransfer.heatExchanger.shellTube',
      name: 'Process Cooler',
      position: { x: 350, y: 150 },
      parameters: {
        A: 80,           // 80 m²
        U: 550,          // 550 W/(m²·K)
      },
    },
    // Secondary Pump
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Secondary Pump',
      position: { x: 350, y: 350 },
      parameters: {
        Q_design: 150,
        H_design: 25,
        eta_BEP: 0.75,
        N: 1450,
        NPSHr: 3.5,
      },
    },
    // Control Valve
    {
      definitionId: 'fluid.valve.control',
      name: 'Flow Control Valve',
      position: { x: 550, y: 250 },
      parameters: {
        Cv: 60,
        opening: 50,
        characteristic: 'equal_percentage',
      },
    },
    // Pipeline Sections (simplified as pipes)
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Supply Main',
      position: { x: 250, y: 150 },
      parameters: {
        D: 150,          // 150 mm
        L: 50,           // 50 m
        epsilon: 0.045,
      },
    },
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Return Main',
      position: { x: 250, y: 350 },
      parameters: {
        D: 150,
        L: 50,
        epsilon: 0.045,
      },
    },
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Process Line',
      position: { x: 450, y: 250 },
      parameters: {
        D: 100,
        L: 30,
        epsilon: 0.045,
      },
    },
    // Isolation Valves
    {
      definitionId: 'fluid.valve.ball',
      name: 'Tower Inlet Valve',
      position: { x: 100, y: 170 },
      parameters: {
        D: 150,
        Cv_open: 400,
        state: 'open',
      },
    },
    {
      definitionId: 'fluid.valve.ball',
      name: 'Tower Outlet Valve',
      position: { x: 100, y: 350 },
      parameters: {
        D: 150,
        Cv_open: 400,
        state: 'open',
      },
    },
  ],
  
  connections: [
    { from: 'Cooling Tower', fromPort: 'cold_out', to: 'Primary Pump', toPort: 'inlet' },
    { from: 'Primary Pump', fromPort: 'outlet', to: 'Supply Main', toPort: 'inlet' },
    { from: 'Supply Main', fromPort: 'outlet', to: 'Process Cooler', toPort: 'hot_in' },
    { from: 'Process Cooler', fromPort: 'hot_out', to: 'Process Line', toPort: 'inlet' },
    { from: 'Process Line', fromPort: 'outlet', to: 'Flow Control Valve', toPort: 'inlet' },
    { from: 'Flow Control Valve', fromPort: 'outlet', to: 'Secondary Pump', toPort: 'inlet' },
    { from: 'Secondary Pump', fromPort: 'outlet', to: 'Return Main', toPort: 'inlet' },
    { from: 'Return Main', fromPort: 'outlet', to: 'Tower Inlet Valve', toPort: 'inlet' },
    { from: 'Tower Inlet Valve', fromPort: 'outlet', to: 'Cooling Tower', toPort: 'hot_in' },
    { from: 'Cooling Tower', fromPort: 'hot_out', to: 'Tower Outlet Valve', toPort: 'inlet' },
    { from: 'Tower Outlet Valve', fromPort: 'outlet', to: 'Primary Pump', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 2: PUMPING STATION
// ============================================================================

export const PUMPING_STATION_TEMPLATE: BlueprintTemplate = {
  id: 'template.pumpingStation',
  name: 'Water Pumping Station',
  description: 'A municipal water pumping station with duty/standby pumps, strainers, check valves, pressure vessels, and control system. Includes automatic transfer between pumps.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'advanced',
  estimatedTime: '30 min',
  tags: ['municipal', 'water supply', 'redundancy', 'pumps', 'pressure'],
  
  components: [
    // Source (Tank/Reservoir)
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Intake Header',
      position: { x: 50, y: 200 },
      parameters: {
        D: 300,  // 300 mm
        L: 10,
        epsilon: 0.045,
      },
    },
    // Strainer
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Strainer',
      position: { x: 150, y: 200 },
      parameters: {
        D: 300,
        L: 2,
        epsilon: 0.5,  // Higher resistance
      },
    },
    // Duty Pump 1
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Pump 1 (Duty)',
      position: { x: 250, y: 100 },
      parameters: {
        Q_design: 500,   // 500 m³/h
        H_design: 80,    // 80 m head (high lift)
        eta_BEP: 0.82,
        N: 2950,         // 2950 rpm
        NPSHr: 5.0,
      },
    },
    // Duty Pump 2
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Pump 2 (Standby)',
      position: { x: 250, y: 300 },
      parameters: {
        Q_design: 500,
        H_design: 80,
        eta_BEP: 0.82,
        N: 2950,
        NPSHr: 5.0,
      },
    },
    // Check Valves (prevent backflow)
    {
      definitionId: 'fluid.valve.ball',
      name: 'Check Valve 1',
      position: { x: 350, y: 100 },
      parameters: {
        D: 200,
        Cv_open: 300,
        state: 'open',
      },
    },
    {
      definitionId: 'fluid.valve.ball',
      name: 'Check Valve 2',
      position: { x: 350, y: 300 },
      parameters: {
        D: 200,
        Cv_open: 300,
        state: 'closed',  // Standby initially closed
      },
    },
    // Isolation Valves
    {
      definitionId: 'fluid.valve.ball',
      name: 'Suction Valve 1',
      position: { x: 200, y: 100 },
      parameters: {
        D: 250,
        Cv_open: 350,
        state: 'open',
      },
    },
    {
      definitionId: 'fluid.valve.ball',
      name: 'Suction Valve 2',
      position: { x: 200, y: 300 },
      parameters: {
        D: 250,
        Cv_open: 350,
        state: 'closed',
      },
    },
    {
      definitionId: 'fluid.valve.ball',
      name: 'Discharge Valve 1',
      position: { x: 400, y: 100 },
      parameters: {
        D: 200,
        Cv_open: 300,
        state: 'open',
      },
    },
    {
      definitionId: 'fluid.valve.ball',
      name: 'Discharge Valve 2',
      position: { x: 400, y: 300 },
      parameters: {
        D: 200,
        Cv_open: 300,
        state: 'closed',
      },
    },
    // Discharge Header
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Discharge Header',
      position: { x: 500, y: 200 },
      parameters: {
        D: 350,  // Large diameter
        L: 100,
        epsilon: 0.045,
      },
    },
    // Control Valve (throttling)
    {
      definitionId: 'fluid.valve.control',
      name: 'Throttle Valve',
      position: { x: 600, y: 200 },
      parameters: {
        Cv: 200,
        opening: 70,
        characteristic: 'linear',
      },
    },
    // Pressure Vessel (bladder type)
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Pressure Tank',
      position: { x: 700, y: 200 },
      parameters: {
        D: 800,  // Large diameter tank
        L: 2000, // 2m length
        epsilon: 0.01,
      },
    },
    // Delivery Pipeline
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Delivery Main',
      position: { x: 800, y: 200 },
      parameters: {
        D: 300,
        L: 500,  // Long distance
        epsilon: 0.045,
      },
    },
  ],
  
  connections: [
    { from: 'Intake Header', fromPort: 'outlet', to: 'Strainer', toPort: 'inlet' },
    { from: 'Strainer', fromPort: 'outlet', to: 'Suction Valve 1', toPort: 'inlet' },
    { from: 'Strainer', fromPort: 'outlet', to: 'Suction Valve 2', toPort: 'inlet' },
    { from: 'Suction Valve 1', fromPort: 'outlet', to: 'Pump 1 (Duty)', toPort: 'inlet' },
    { from: 'Suction Valve 2', fromPort: 'outlet', to: 'Pump 2 (Standby)', toPort: 'inlet' },
    { from: 'Pump 1 (Duty)', fromPort: 'outlet', to: 'Check Valve 1', toPort: 'inlet' },
    { from: 'Pump 2 (Standby)', fromPort: 'outlet', to: 'Check Valve 2', toPort: 'inlet' },
    { from: 'Check Valve 1', fromPort: 'outlet', to: 'Discharge Valve 1', toPort: 'inlet' },
    { from: 'Check Valve 2', fromPort: 'outlet', to: 'Discharge Valve 2', toPort: 'inlet' },
    { from: 'Discharge Valve 1', fromPort: 'outlet', to: 'Discharge Header', toPort: 'inlet' },
    { from: 'Discharge Valve 2', fromPort: 'outlet', to: 'Discharge Header', toPort: 'inlet' },
    { from: 'Discharge Header', fromPort: 'outlet', to: 'Throttle Valve', toPort: 'inlet' },
    { from: 'Throttle Valve', fromPort: 'outlet', to: 'Pressure Tank', toPort: 'inlet' },
    { from: 'Pressure Tank', fromPort: 'outlet', to: 'Delivery Main', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 3: SIMPLE FLOW LOOP (Beginner)
// ============================================================================

export const SIMPLE_FLOW_LOOP_TEMPLATE: BlueprintTemplate = {
  id: 'template.simpleFlowLoop',
  name: 'Simple Flow Loop',
  description: 'A basic closed-loop flow system for learning component placement and parameter editing. Includes a pump, pipe loop, and control valve.',
  category: 'Education',
  domain: 'fluid',
  difficulty: 'beginner',
  estimatedTime: '10 min',
  tags: ['beginner', 'tutorial', 'learning', 'basics'],
  
  components: [
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Pump',
      position: { x: 200, y: 150 },
      parameters: {
        Q_design: 50,
        H_design: 20,
        eta_BEP: 0.70,
        N: 1450,
        NPSHr: 2.5,
      },
    },
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Pipe Section 1',
      position: { x: 350, y: 150 },
      parameters: {
        D: 50,
        L: 20,
        epsilon: 0.045,
      },
    },
    {
      definitionId: 'fluid.valve.control',
      name: 'Control Valve',
      position: { x: 500, y: 150 },
      parameters: {
        Cv: 20,
        opening: 50,
        characteristic: 'equal_percentage',
      },
    },
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Pipe Section 2',
      position: { x: 650, y: 150 },
      parameters: {
        D: 50,
        L: 20,
        epsilon: 0.045,
      },
    },
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Return Pipe',
      position: { x: 425, y: 300 },
      parameters: {
        D: 50,
        L: 50,
        epsilon: 0.045,
      },
    },
  ],
  
  connections: [
    { from: 'Pump', fromPort: 'outlet', to: 'Pipe Section 1', toPort: 'inlet' },
    { from: 'Pipe Section 1', fromPort: 'outlet', to: 'Control Valve', toPort: 'inlet' },
    { from: 'Control Valve', fromPort: 'outlet', to: 'Pipe Section 2', toPort: 'inlet' },
    { from: 'Pipe Section 2', fromPort: 'outlet', to: 'Return Pipe', toPort: 'inlet' },
    { from: 'Return Pipe', fromPort: 'outlet', to: 'Pump', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 4: RANKINE CYCLE (Thermodynamic)
// ============================================================================

export const RANKINE_CYCLE_TEMPLATE: BlueprintTemplate = {
  id: 'template.rankineCycle',
  name: 'Steam Rankine Cycle',
  description: 'Basic steam power cycle with boiler, turbine, condenser, and pump. Fundamental thermodynamic cycle for power generation.',
  category: 'Thermodynamic Cycles',
  domain: 'thermodynamic',
  difficulty: 'intermediate',
  estimatedTime: '25 min',
  tags: ['thermodynamic', 'power generation', 'steam', 'Rankine', 'energy'],
  
  components: [
    // Boiler (Heat Source)
    {
      definitionId: 'heatTransfer.heatExchanger.shellTube',
      name: 'Steam Boiler',
      position: { x: 200, y: 100 },
      parameters: {
        A: 200,
        U: 300,
      },
    },
    // Steam Turbine
    {
      definitionId: 'machineElement.powerTransmission.spurGear',
      name: 'Steam Turbine',
      position: { x: 400, y: 100 },
      parameters: {
        N1: 30,
        N2: 60,
        m: 4,
        eta: 0.85,
      },
    },
    // Condenser (Heat Sink)
    {
      definitionId: 'heatTransfer.heatExchanger.shellTube',
      name: 'Condenser',
      position: { x: 600, y: 200 },
      parameters: {
        A: 250,
        U: 400,
      },
    },
    // Feedwater Pump
    {
      definitionId: 'fluid.pump.centrifugal',
      name: 'Feedwater Pump',
      position: { x: 400, y: 300 },
      parameters: {
        Q_design: 10,
        H_design: 100,
        eta_BEP: 0.70,
        N: 3000,
        NPSHr: 2.0,
      },
    },
    // Control valve (extraction)
    {
      definitionId: 'fluid.valve.control',
      name: 'Steam Control Valve',
      position: { x: 300, y: 100 },
      parameters: {
        Cv: 50,
        opening: 80,
        characteristic: 'linear',
      },
    },
  ],
  
  connections: [
    { from: 'Feedwater Pump', fromPort: 'outlet', to: 'Steam Boiler', toPort: 'cold_in' },
    { from: 'Steam Boiler', fromPort: 'hot_out', to: 'Steam Control Valve', toPort: 'inlet' },
    { from: 'Steam Control Valve', fromPort: 'outlet', to: 'Steam Turbine', toPort: 'input' },
    { from: 'Steam Turbine', fromPort: 'output', to: 'Condenser', toPort: 'hot_in' },
    { from: 'Condenser', fromPort: 'cold_out', to: 'Feedwater Pump', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 5: CONTROLLED PROCESS SYSTEM
// ============================================================================

export const CONTROLLED_PROCESS_TEMPLATE: BlueprintTemplate = {
  id: 'template.controlledProcess',
  name: 'Temperature Controlled Process',
  description: 'Process temperature control loop with PID controller, temperature sensor, heater (heat exchanger), and control valve.',
  category: 'Control Systems',
  domain: 'control',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['control', 'PID', 'temperature', 'feedback', 'process'],
  
  components: [
    // Temperature Sensor
    {
      definitionId: 'control.sensors.temperature',
      name: 'Temp Sensor',
      position: { x: 500, y: 150 },
      parameters: {
        T_min: 273,
        T_max: 473,
      },
    },
    // PID Controller
    {
      definitionId: 'control.controllers.pid',
      name: 'Temperature Controller',
      position: { x: 350, y: 250 },
      parameters: {
        Kc: 2.0,
        Ti: 15,
        Td: 3,
        SP: 350,
      },
    },
    // Heat Exchanger (Heater)
    {
      definitionId: 'heatTransfer.heatExchanger.shellTube',
      name: 'Process Heater',
      position: { x: 200, y: 150 },
      parameters: {
        A: 30,
        U: 600,
      },
    },
    // Control Valve
    {
      definitionId: 'fluid.valve.control',
      name: 'Steam Valve',
      position: { x: 200, y: 250 },
      parameters: {
        Cv: 25,
        opening: 50,
        characteristic: 'equal_percentage',
      },
    },
    // Process Pipe
    {
      definitionId: 'fluid.pipe.straight',
      name: 'Process Line',
      position: { x: 350, y: 150 },
      parameters: {
        D: 50,
        L: 20,
        epsilon: 0.045,
      },
    },
  ],
  
  connections: [
    { from: 'Process Heater', fromPort: 'hot_out', to: 'Process Line', toPort: 'inlet' },
    { from: 'Process Line', fromPort: 'outlet', to: 'Temp Sensor', toPort: 'input' },
    { from: 'Temp Sensor', fromPort: 'output', to: 'Temperature Controller', toPort: 'feedback' },
    { from: 'Temperature Controller', fromPort: 'output', to: 'Steam Valve', toPort: 'inlet' },
    { from: 'Steam Valve', fromPort: 'outlet', to: 'Process Heater', toPort: 'cold_in' },
  ],
};

// ============================================================================
// TEMPLATE CATALOG
// ============================================================================

export const TEMPLATE_CATALOG: BlueprintTemplate[] = [
  SIMPLE_FLOW_LOOP_TEMPLATE,
  COOLING_WATER_TEMPLATE,
  PUMPING_STATION_TEMPLATE,
  RANKINE_CYCLE_TEMPLATE,
  CONTROLLED_PROCESS_TEMPLATE,
];

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

/**
 * Load a template and create a blueprint
 */
export function loadTemplate(templateId: string): Blueprint | null {
  const template = TEMPLATE_CATALOG.find(t => t.id === templateId);
  if (!template) return null;
  
  return createBlueprintFromTemplate(template);
}

/**
 * Convert template to blueprint
 */
export function createBlueprintFromTemplate(template: BlueprintTemplate): Blueprint {
  const componentMap = new Map<string, string>(); // name -> id
  
  // Create components
  const components: ComponentInstance[] = template.components.map(tc => {
    const componentId = createComponentId('comp');
    componentMap.set(tc.name, componentId);
    
    return {
      id: componentId,
      definitionId: tc.definitionId,
      name: tc.name,
      position: tc.position,
      rotation: 0,
      parameterValues: tc.parameters || {},
      isSelected: false,
      isVisible: true,
    };
  });
  
  // Create connections (using name mapping)
  const connections: Connection[] = template.connections.map((tc, index) => {
    const sourceId = componentMap.get(tc.from);
    const targetId = componentMap.get(tc.to);
    
    return {
      id: `conn_${Date.now()}_${index}`,
      sourceComponentId: sourceId || '',
      sourcePortId: tc.fromPort,
      targetComponentId: targetId || '',
      targetPortId: tc.toPort,
      type: 'fluid',
    };
  });
  
  return {
    id: `bp_${Date.now()}`,
    name: template.name,
    description: template.description,
    domain: template.domain,
    version: '1.0.0',
    components,
    connections,
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'Template',
  };
}

/**
 * Get template by ID
 */
export function getTemplate(id: string): BlueprintTemplate | undefined {
  return TEMPLATE_CATALOG.find(t => t.id === id);
}

/**
 * Get all template IDs
 */
export function getAllTemplateIds(): string[] {
  return TEMPLATE_CATALOG.map(t => t.id);
}

/**
 * Get templates by category
 */
export function getTemplatesByCategory(category: string): BlueprintTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.category === category);
}

/**
 * Get templates by difficulty
 */
export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): BlueprintTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.difficulty === difficulty);
}

/**
 * Search templates by tag
 */
export function searchTemplates(query: string): BlueprintTemplate[] {
  const lowerQuery = query.toLowerCase();
  return TEMPLATE_CATALOG.filter(t => 
    t.name.toLowerCase().includes(lowerQuery) ||
    t.description.toLowerCase().includes(lowerQuery) ||
    t.tags.some(tag => tag.toLowerCase().includes(lowerQuery))
  );
}

// ============================================================================
// EXPORT
// ============================================================================

export default {
  TEMPLATE_CATALOG,
  COOLING_WATER_TEMPLATE,
  PUMPING_STATION_TEMPLATE,
  SIMPLE_FLOW_LOOP_TEMPLATE,
  loadTemplate,
  createBlueprintFromTemplate,
  getTemplate,
  getAllTemplateIds,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplates,
};

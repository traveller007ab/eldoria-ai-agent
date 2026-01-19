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
  estimatedTime: string;
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
  from: string;
  fromPort: string;
  to: string;
  toPort: string;
}

// ============================================================================
// TEMPLATE 1: SIMPLE FLOW LOOP
// ============================================================================

export const SIMPLE_FLOW_LOOP_TEMPLATE: BlueprintTemplate = {
  id: 'template.simpleFlowLoop',
  name: 'Simple Flow Loop',
  description: 'A basic closed-loop flow system for learning component placement and parameter editing.',
  category: 'Education',
  domain: 'fluid',
  difficulty: 'beginner',
  estimatedTime: '10 min',
  tags: ['beginner', 'tutorial', 'learning', 'basics'],
  
  components: [
    { definitionId: 'fluid.pump.centrifugal', name: 'Pump', position: { x: 200, y: 150 }, parameters: { Q_design: 50, H_design: 20, eta_BEP: 0.70, N: 1450, NPSHr: 2.5 } },
    { definitionId: 'fluid.pipe.straight', name: 'Pipe Section 1', position: { x: 350, y: 150 }, parameters: { D: 50, L: 20, epsilon: 0.045 } },
    { definitionId: 'fluid.valve.control', name: 'Control Valve', position: { x: 500, y: 150 }, parameters: { Cv: 20, opening: 50, characteristic: 'equal_percentage' } },
    { definitionId: 'fluid.pipe.straight', name: 'Pipe Section 2', position: { x: 650, y: 150 }, parameters: { D: 50, L: 20, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Return Pipe', position: { x: 425, y: 300 }, parameters: { D: 50, L: 50, epsilon: 0.045 } },
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
// TEMPLATE 2: COOLING WATER SYSTEM
// ============================================================================

export const COOLING_WATER_TEMPLATE: BlueprintTemplate = {
  id: 'template.coolingWater',
  name: 'Cooling Water System',
  description: 'Closed-loop cooling water system with cooling tower, pumps, heat exchanger, and control valve.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['cooling', 'closed loop', 'industrial', 'pumps', 'heat exchanger'],
  
  components: [
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Cooling Tower', position: { x: 100, y: 50 }, parameters: { A: 150, U: 400 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Primary Pump', position: { x: 100, y: 250 }, parameters: { Q_design: 200, H_design: 35, eta_BEP: 0.78, N: 1450, NPSHr: 4.0 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Process Cooler', position: { x: 350, y: 150 }, parameters: { A: 80, U: 550 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Secondary Pump', position: { x: 350, y: 350 }, parameters: { Q_design: 150, H_design: 25, eta_BEP: 0.75, N: 1450, NPSHr: 3.5 } },
    { definitionId: 'fluid.valve.control', name: 'Flow Control Valve', position: { x: 550, y: 250 }, parameters: { Cv: 60, opening: 50, characteristic: 'equal_percentage' } },
    { definitionId: 'fluid.pipe.straight', name: 'Supply Main', position: { x: 250, y: 150 }, parameters: { D: 150, L: 50, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Return Main', position: { x: 250, y: 350 }, parameters: { D: 150, L: 50, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Process Line', position: { x: 450, y: 250 }, parameters: { D: 100, L: 30, epsilon: 0.045 } },
    { definitionId: 'fluid.valve.ball', name: 'Tower Inlet Valve', position: { x: 100, y: 170 }, parameters: { D: 150, Cv_open: 400, state: 'open' } },
    { definitionId: 'fluid.valve.ball', name: 'Tower Outlet Valve', position: { x: 100, y: 350 }, parameters: { D: 150, Cv_open: 400, state: 'open' } },
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
// TEMPLATE 3: PUMPING STATION
// ============================================================================

export const PUMPING_STATION_TEMPLATE: BlueprintTemplate = {
  id: 'template.pumpingStation',
  name: 'Water Pumping Station',
  description: 'Municipal water pumping station with duty/standby pumps, check valves, and control valve.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'advanced',
  estimatedTime: '30 min',
  tags: ['municipal', 'water supply', 'redundancy', 'pumps', 'pressure'],
  
  components: [
    { definitionId: 'fluid.pipe.straight', name: 'Intake Header', position: { x: 50, y: 200 }, parameters: { D: 300, L: 10, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Strainer', position: { x: 150, y: 200 }, parameters: { D: 300, L: 2, epsilon: 0.5 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Pump 1 (Duty)', position: { x: 250, y: 100 }, parameters: { Q_design: 500, H_design: 80, eta_BEP: 0.82, N: 2950, NPSHr: 5.0 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Pump 2 (Standby)', position: { x: 250, y: 300 }, parameters: { Q_design: 500, H_design: 80, eta_BEP: 0.82, N: 2950, NPSHr: 5.0 } },
    { definitionId: 'fluid.valve.ball', name: 'Check Valve 1', position: { x: 350, y: 100 }, parameters: { D: 200, Cv_open: 300, state: 'open' } },
    { definitionId: 'fluid.valve.ball', name: 'Check Valve 2', position: { x: 350, y: 300 }, parameters: { D: 200, Cv_open: 300, state: 'closed' } },
    { definitionId: 'fluid.valve.ball', name: 'Suction Valve 1', position: { x: 200, y: 100 }, parameters: { D: 250, Cv_open: 350, state: 'open' } },
    { definitionId: 'fluid.valve.ball', name: 'Suction Valve 2', position: { x: 200, y: 300 }, parameters: { D: 250, Cv_open: 350, state: 'closed' } },
    { definitionId: 'fluid.valve.ball', name: 'Discharge Valve 1', position: { x: 400, y: 100 }, parameters: { D: 200, Cv_open: 300, state: 'open' } },
    { definitionId: 'fluid.valve.ball', name: 'Discharge Valve 2', position: { x: 400, y: 300 }, parameters: { D: 200, Cv_open: 300, state: 'closed' } },
    { definitionId: 'fluid.pipe.straight', name: 'Discharge Header', position: { x: 500, y: 200 }, parameters: { D: 350, L: 100, epsilon: 0.045 } },
    { definitionId: 'fluid.valve.control', name: 'Throttle Valve', position: { x: 600, y: 200 }, parameters: { Cv: 200, opening: 70, characteristic: 'linear' } },
    { definitionId: 'fluid.pipe.straight', name: 'Delivery Main', position: { x: 800, y: 200 }, parameters: { D: 300, L: 500, epsilon: 0.045 } },
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
    { from: 'Throttle Valve', fromPort: 'outlet', to: 'Delivery Main', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 4: RANKINE CYCLE
// ============================================================================

export const RANKINE_CYCLE_TEMPLATE: BlueprintTemplate = {
  id: 'template.rankineCycle',
  name: 'Steam Rankine Cycle',
  description: 'Basic steam power cycle with boiler, turbine, condenser, and pump.',
  category: 'Thermodynamic Cycles',
  domain: 'thermodynamic',
  difficulty: 'intermediate',
  estimatedTime: '25 min',
  tags: ['thermodynamic', 'power generation', 'steam', 'Rankine', 'energy'],
  
  components: [
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Steam Boiler', position: { x: 200, y: 100 }, parameters: { A: 200, U: 300 } },
    { definitionId: 'fluid.turbine.steam', name: 'Steam Turbine', position: { x: 400, y: 100 }, parameters: { eta_isentropic: 85, eta_mechanical: 98, N: 3000, inlet_pressure: 10, inlet_temperature: 773, outlet_pressure: 0.01, m_dot: 10 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Condenser', position: { x: 600, y: 200 }, parameters: { A: 250, U: 400 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Feedwater Pump', position: { x: 400, y: 300 }, parameters: { Q_design: 10, H_design: 100, eta_BEP: 0.70, N: 3000, NPSHr: 2.0 } },
    { definitionId: 'fluid.valve.control', name: 'Steam Control Valve', position: { x: 300, y: 100 }, parameters: { Cv: 50, opening: 80, characteristic: 'linear' } },
  ],
  
  connections: [
    { from: 'Feedwater Pump', fromPort: 'outlet', to: 'Steam Boiler', toPort: 'cold_in' },
    { from: 'Steam Boiler', fromPort: 'hot_out', to: 'Steam Control Valve', toPort: 'inlet' },
    { from: 'Steam Control Valve', fromPort: 'outlet', to: 'Steam Turbine', toPort: 'inlet' },
    { from: 'Steam Turbine', fromPort: 'outlet', to: 'Condenser', toPort: 'hot_in' },
    { from: 'Condenser', fromPort: 'cold_out', to: 'Feedwater Pump', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 5: CONTROLLED PROCESS
// ============================================================================

export const CONTROLLED_PROCESS_TEMPLATE: BlueprintTemplate = {
  id: 'template.controlledProcess',
  name: 'Temperature Controlled Process',
  description: 'Process temperature control loop with PID controller, sensor, heater, and control valve.',
  category: 'Control Systems',
  domain: 'control',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['control', 'PID', 'temperature', 'feedback', 'process'],
  
  components: [
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Process Heater', position: { x: 200, y: 150 }, parameters: { A: 30, U: 600 } },
    { definitionId: 'fluid.pipe.straight', name: 'Process Line', position: { x: 350, y: 150 }, parameters: { D: 50, L: 20, epsilon: 0.045 } },
    { definitionId: 'fluid.valve.control', name: 'Steam Valve', position: { x: 200, y: 250 }, parameters: { Cv: 25, opening: 50, characteristic: 'equal_percentage' } },
  ],
  
  connections: [
    { from: 'Process Heater', fromPort: 'hot_out', to: 'Process Line', toPort: 'inlet' },
    { from: 'Process Line', fromPort: 'outlet', to: 'Steam Valve', toPort: 'inlet' },
    { from: 'Steam Valve', fromPort: 'outlet', to: 'Process Heater', toPort: 'cold_in' },
  ],
};

// ============================================================================
// TEMPLATE 6: BOILER FEED SYSTEM
// ============================================================================

export const BOILER_FEED_TEMPLATE: BlueprintTemplate = {
  id: 'template.boilerFeed',
  name: 'Boiler Feed System',
  description: 'Boiler feedwater system with deaerator and high-pressure feed pump.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['boiler', 'feedwater', 'deaerator', 'steam', 'power plant'],
  
  components: [
    { definitionId: 'fluid.pipe.straight', name: 'Makeup Tank', position: { x: 50, y: 200 }, parameters: { D: 1000, L: 3000, epsilon: 0.01 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Transfer Pump', position: { x: 150, y: 300 }, parameters: { Q_design: 25, H_design: 15, eta_BEP: 0.65, N: 1450, NPSHr: 2.0 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Deaerator', position: { x: 300, y: 150 }, parameters: { A: 40, U: 300 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Boiler Feed Pump', position: { x: 450, y: 150 }, parameters: { Q_design: 15, H_design: 200, eta_BEP: 0.72, N: 3000, NPSHr: 3.0 } },
    { definitionId: 'fluid.valve.check', name: 'Check Valve', position: { x: 550, y: 150 }, parameters: { D: 50, Cr: 5, Cv: 40 } },
    { definitionId: 'fluid.valve.gate', name: 'Boiler Stop Valve', position: { x: 650, y: 150 }, parameters: { D: 50, Cv_open: 120, opening: 100 } },
    { definitionId: 'fluid.pipe.straight', name: 'Feed Main', position: { x: 550, y: 250 }, parameters: { D: 50, L: 50, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Strainer', position: { x: 250, y: 300 }, parameters: { D: 80, L: 1, epsilon: 0.5 } },
  ],
  
  connections: [
    { from: 'Makeup Tank', fromPort: 'outlet', to: 'Transfer Pump', toPort: 'inlet' },
    { from: 'Transfer Pump', fromPort: 'outlet', to: 'Strainer', toPort: 'inlet' },
    { from: 'Strainer', fromPort: 'outlet', to: 'Deaerator', toPort: 'cold_in' },
    { from: 'Deaerator', fromPort: 'cold_out', to: 'Boiler Feed Pump', toPort: 'inlet' },
    { from: 'Boiler Feed Pump', fromPort: 'outlet', to: 'Check Valve', toPort: 'inlet' },
    { from: 'Check Valve', fromPort: 'outlet', to: 'Feed Main', toPort: 'inlet' },
    { from: 'Feed Main', fromPort: 'outlet', to: 'Boiler Stop Valve', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 7: CHILLED WATER SYSTEM
// ============================================================================

export const CHILLED_WATER_TEMPLATE: BlueprintTemplate = {
  id: 'template.chilledWater',
  name: 'HVAC Chilled Water System',
  description: 'Commercial building chilled water system with chiller, cooling tower, and pumps.',
  category: 'HVAC',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '25 min',
  tags: ['HVAC', 'chilled water', 'chiller', 'cooling tower', 'commercial'],
  
  components: [
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Chiller', position: { x: 200, y: 100 }, parameters: { A: 100, U: 800 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Primary Pump', position: { x: 200, y: 250 }, parameters: { Q_design: 100, H_design: 30, eta_BEP: 0.78, N: 1450, NPSHr: 3.5 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Secondary Pump', position: { x: 400, y: 250 }, parameters: { Q_design: 80, H_design: 25, eta_BEP: 0.75, N: 1450, NPSHr: 3.0 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Cooling Tower', position: { x: 200, y: 400 }, parameters: { A: 80, U: 350 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Air Handling Unit', position: { x: 600, y: 150 }, parameters: { A: 25, U: 500 } },
    { definitionId: 'fluid.pipe.straight', name: 'Supply Header', position: { x: 350, y: 150 }, parameters: { D: 150, L: 30, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Return Header', position: { x: 350, y: 350 }, parameters: { D: 150, L: 30, epsilon: 0.045 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Tower Pump', position: { x: 350, y: 450 }, parameters: { Q_design: 120, H_design: 20, eta_BEP: 0.72, N: 1450, NPSHr: 2.5 } },
  ],
  
  connections: [
    { from: 'Primary Pump', fromPort: 'outlet', to: 'Chiller', toPort: 'cold_in' },
    { from: 'Chiller', fromPort: 'cold_out', to: 'Supply Header', toPort: 'inlet' },
    { from: 'Supply Header', fromPort: 'outlet', to: 'Air Handling Unit', toPort: 'cold_in' },
    { from: 'Air Handling Unit', fromPort: 'cold_out', to: 'Return Header', toPort: 'inlet' },
    { from: 'Return Header', fromPort: 'outlet', to: 'Secondary Pump', toPort: 'inlet' },
    { from: 'Secondary Pump', fromPort: 'outlet', to: 'Cooling Tower', toPort: 'hot_in' },
    { from: 'Cooling Tower', fromPort: 'hot_out', to: 'Tower Pump', toPort: 'inlet' },
    { from: 'Tower Pump', fromPort: 'outlet', to: 'Primary Pump', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 8: FIRE PROTECTION
// ============================================================================

export const FIRE_PROTECTION_TEMPLATE: BlueprintTemplate = {
  id: 'template.fireProtection',
  name: 'Fire Protection System',
  description: 'Fire pump system with jockey pump for pressure maintenance.',
  category: 'Fluid Systems',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '20 min',
  tags: ['fire protection', 'fire pump', 'jockey pump', 'sprinkler', 'safety'],
  
  components: [
    { definitionId: 'fluid.pump.centrifugal', name: 'Fire Pump', position: { x: 200, y: 100 }, parameters: { Q_design: 500, H_design: 60, eta_BEP: 0.75, N: 3000, NPSHr: 4.0 } },
    { definitionId: 'fluid.pump.centrifugal', name: 'Jockey Pump', position: { x: 200, y: 300 }, parameters: { Q_design: 10, H_design: 70, eta_BEP: 0.60, N: 3000, NPSHr: 2.0 } },
    { definitionId: 'fluid.valve.check', name: 'Fire Pump Check', position: { x: 300, y: 100 }, parameters: { D: 150, Cr: 10, Cv: 250 } },
    { definitionId: 'fluid.valve.gate', name: 'Suction Valve', position: { x: 100, y: 100 }, parameters: { D: 200, Cv_open: 500, opening: 100 } },
    { definitionId: 'fluid.valve.gate', name: 'Discharge Valve', position: { x: 400, y: 100 }, parameters: { D: 150, Cv_open: 400, opening: 100 } },
    { definitionId: 'fluid.pipe.straight', name: 'Pressure Tank', position: { x: 550, y: 150 }, parameters: { D: 600, L: 1500, epsilon: 0.01 } },
    { definitionId: 'fluid.pipe.straight', name: 'Sprinkler Main', position: { x: 700, y: 150 }, parameters: { D: 100, L: 100, epsilon: 0.045 } },
  ],
  
  connections: [
    { from: 'Suction Valve', fromPort: 'outlet', to: 'Fire Pump', toPort: 'inlet' },
    { from: 'Fire Pump', fromPort: 'outlet', to: 'Fire Pump Check', toPort: 'inlet' },
    { from: 'Fire Pump Check', fromPort: 'outlet', to: 'Discharge Valve', toPort: 'inlet' },
    { from: 'Discharge Valve', fromPort: 'outlet', to: 'Pressure Tank', toPort: 'inlet' },
    { from: 'Pressure Tank', fromPort: 'outlet', to: 'Sprinkler Main', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 9: COMPRESSED AIR SYSTEM
// ============================================================================

export const COMPRESSED_AIR_TEMPLATE: BlueprintTemplate = {
  id: 'template.compressedAir',
  name: 'Compressed Air System',
  description: 'Rotary screw compressor with aftercooler, dryer, and receiver tank.',
  category: 'Industrial Systems',
  domain: 'fluid',
  difficulty: 'intermediate',
  estimatedTime: '25 min',
  tags: ['compressed air', 'compressor', 'dryer', 'receiver', 'industrial'],
  
  components: [
    { definitionId: 'fluid.pump.centrifugal', name: 'Air Compressor', position: { x: 100, y: 150 }, parameters: { Q_design: 200, H_design: 800, eta_BEP: 0.80, N: 3000, NPSHr: 5.0 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Aftercooler', position: { x: 250, y: 150 }, parameters: { A: 20, U: 200 } },
    { definitionId: 'heatTransfer.heatExchanger.shellTube', name: 'Air Dryer', position: { x: 400, y: 150 }, parameters: { A: 15, U: 150 } },
    { definitionId: 'fluid.pipe.straight', name: 'Receiver Tank', position: { x: 550, y: 150 }, parameters: { D: 800, L: 2000, epsilon: 0.01 } },
    { definitionId: 'fluid.pipe.straight', name: 'Air Header', position: { x: 700, y: 150 }, parameters: { D: 100, L: 50, epsilon: 0.045 } },
  ],
  
  connections: [
    { from: 'Air Compressor', fromPort: 'outlet', to: 'Aftercooler', toPort: 'hot_in' },
    { from: 'Aftercooler', fromPort: 'hot_out', to: 'Air Dryer', toPort: 'hot_in' },
    { from: 'Air Dryer', fromPort: 'hot_out', to: 'Receiver Tank', toPort: 'inlet' },
    { from: 'Receiver Tank', fromPort: 'outlet', to: 'Air Header', toPort: 'inlet' },
  ],
};

// ============================================================================
// TEMPLATE 10: IRRIGATION SYSTEM
// ============================================================================

export const IRRIGATION_TEMPLATE: BlueprintTemplate = {
  id: 'template.irrigation',
  name: 'Agricultural Irrigation System',
  description: 'Pump-fed irrigation system with filters and multiple zone sprinklers.',
  category: 'Agricultural',
  domain: 'fluid',
  difficulty: 'beginner',
  estimatedTime: '15 min',
  tags: ['irrigation', 'agriculture', 'sprinkler', 'pump', 'water supply'],
  
  components: [
    { definitionId: 'fluid.pump.centrifugal', name: 'Supply Pump', position: { x: 100, y: 200 }, parameters: { Q_design: 80, H_design: 45, eta_BEP: 0.72, N: 1450, NPSHr: 3.5 } },
    { definitionId: 'fluid.pipe.straight', name: 'Screen Filter', position: { x: 200, y: 200 }, parameters: { D: 100, L: 1, epsilon: 0.8 } },
    { definitionId: 'fluid.valve.gate', name: 'Main Valve', position: { x: 280, y: 200 }, parameters: { D: 80, Cv_open: 150, opening: 100 } },
    { definitionId: 'fluid.valve.control', name: 'Pressure Reducer', position: { x: 380, y: 200 }, parameters: { Cv: 40, opening: 70, characteristic: 'linear' } },
    { definitionId: 'fluid.pipe.straight', name: 'Zone 1 Header', position: { x: 480, y: 100 }, parameters: { D: 50, L: 30, epsilon: 0.045 } },
    { definitionId: 'fluid.pipe.straight', name: 'Zone 2 Header', position: { x: 480, y: 300 }, parameters: { D: 50, L: 30, epsilon: 0.045 } },
    { definitionId: 'fluid.valve.check', name: 'Check Valve', position: { x: 150, y: 200 }, parameters: { D: 80, Cr: 3, Cv: 60 } },
  ],
  
  connections: [
    { from: 'Supply Pump', fromPort: 'outlet', to: 'Check Valve', toPort: 'inlet' },
    { from: 'Check Valve', fromPort: 'outlet', to: 'Screen Filter', toPort: 'inlet' },
    { from: 'Screen Filter', fromPort: 'outlet', to: 'Main Valve', toPort: 'inlet' },
    { from: 'Main Valve', fromPort: 'outlet', to: 'Pressure Reducer', toPort: 'inlet' },
    { from: 'Pressure Reducer', fromPort: 'outlet', to: 'Zone 1 Header', toPort: 'inlet' },
    { from: 'Pressure Reducer', fromPort: 'outlet', to: 'Zone 2 Header', toPort: 'inlet' },
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
  BOILER_FEED_TEMPLATE,
  CHILLED_WATER_TEMPLATE,
  FIRE_PROTECTION_TEMPLATE,
  COMPRESSED_AIR_TEMPLATE,
  IRRIGATION_TEMPLATE,
];

// ============================================================================
// TEMPLATE UTILITIES
// ============================================================================

export function loadTemplate(templateId: string): Blueprint | null {
  const template = TEMPLATE_CATALOG.find(t => t.id === templateId);
  if (!template) return null;
  return createBlueprintFromTemplate(template);
}

export function createBlueprintFromTemplate(template: BlueprintTemplate): Blueprint {
  const componentMap = new Map<string, string>();
  
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

export function getTemplate(id: string): BlueprintTemplate | undefined {
  return TEMPLATE_CATALOG.find(t => t.id === id);
}

export function getAllTemplateIds(): string[] {
  return TEMPLATE_CATALOG.map(t => t.id);
}

export function getTemplatesByCategory(category: string): BlueprintTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.category === category);
}

export function getTemplatesByDifficulty(difficulty: 'beginner' | 'intermediate' | 'advanced'): BlueprintTemplate[] {
  return TEMPLATE_CATALOG.filter(t => t.difficulty === difficulty);
}

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
  SIMPLE_FLOW_LOOP_TEMPLATE,
  COOLING_WATER_TEMPLATE,
  PUMPING_STATION_TEMPLATE,
  RANKINE_CYCLE_TEMPLATE,
  CONTROLLED_PROCESS_TEMPLATE,
  BOILER_FEED_TEMPLATE,
  CHILLED_WATER_TEMPLATE,
  FIRE_PROTECTION_TEMPLATE,
  COMPRESSED_AIR_TEMPLATE,
  IRRIGATION_TEMPLATE,
  loadTemplate,
  createBlueprintFromTemplate,
  getTemplate,
  getAllTemplateIds,
  getTemplatesByCategory,
  getTemplatesByDifficulty,
  searchTemplates,
};

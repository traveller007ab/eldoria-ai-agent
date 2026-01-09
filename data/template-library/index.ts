
import { MechBlueprint } from '../../types';

export interface SystemTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail?: string; // Icon name e.g. 'engine'
    blueprint: MechBlueprint;
}

const DEMO_V8_TURBO: MechBlueprint = {
    id: 'demo-v8-turbo',
    project_name: '2.0L Turbo V8 Powertrain',
    updated_at: new Date().toISOString(),
    components: [
        {
            id: 'V8_Engine',
            name: 'V8 Engine',
            componentDefinitionId: 'mechanical.engine.parametric',
            position: { x: 100, y: 300 },
            parameterValues: {
                cylinders: 8, bore_mm: 86, stroke_mm: 86,
                compression_ratio: 10.0, aspiration: 'turbocharged',
                boost_pressure_bar: 1.2, redline_rpm: 7000, idle_rpm: 800
            }
        },
        {
            id: 'Reduction_Gear',
            name: 'Reduction Gear',
            componentDefinitionId: 'mechanical.transmission.gearbox',
            position: { x: 300, y: 300 },
            parameterValues: { ratio: 2.0, efficiency: 0.98 } // 2:1 reduction
        },
        {
            id: 'Main_Pump',
            name: 'Main Pump',
            componentDefinitionId: 'mechanical.pump.centrifugal',
            position: { x: 500, y: 300 },
            parameterValues: { design_flow: 150, design_head: 80, efficiency: 0.85 }
        },
        {
            id: 'Supply_Tank',
            name: 'Supply Tank',
            componentDefinitionId: 'mechanical.tank.atmospheric',
            position: { x: 500, y: 500 },
            parameterValues: { capacity: 1000, level: 5.0, pressure: 1.013 } // 5m head
        },
        {
            id: 'Throttle_Valve',
            name: 'Throttle Valve',
            componentDefinitionId: 'mechanical.valve.control',
            position: { x: 700, y: 300 },
            parameterValues: { cv: 100, opening: 50 } // 50% open
        },
        // Hydraulic Connections
        // Suction Line: Tank -> Pump
        {
            id: 'Suction_Line',
            name: 'Suction Line',
            componentDefinitionId: 'mechanical.pipe.standard',
            position: { x: 500, y: 400 },
            parameterValues: { length: 5, diameter: 150, roughness: 0.05 }
        },
        // Discharge Line: Pump -> Valve (Short)
        // Return Line: Valve -> Tank
        {
            id: 'Return_Line',
            name: 'Return Line',
            componentDefinitionId: 'mechanical.pipe.standard',
            position: { x: 700, y: 500 },
            parameterValues: { length: 20, diameter: 150, roughness: 0.05 }
        }
    ],
    connections: [
        // Shaft Connections
        { id: 's1', sourceComponentId: 'V8_Engine', targetComponentId: 'Reduction_Gear', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 's2', sourceComponentId: 'Reduction_Gear', targetComponentId: 'Main_Pump', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },

        // Fluid Loop
        { id: 'f1', sourceComponentId: 'Supply_Tank', targetComponentId: 'Suction_Line', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Suction_Line', targetComponentId: 'Main_Pump', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Main_Pump', targetComponentId: 'Throttle_Valve', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Throttle_Valve', targetComponentId: 'Return_Line', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f5', sourceComponentId: 'Return_Line', targetComponentId: 'Supply_Tank', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false }
    ]
};

const BASIC_PUMP_LOOP: MechBlueprint = {
    id: 'basic-pump',
    project_name: 'Simple Pump Loop',
    updated_at: new Date().toISOString(),
    components: [
        { id: 'Motor', name: 'Electric Motor', componentDefinitionId: 'mechanical.motor.electric', position: { x: 200, y: 300 }, parameterValues: { power_rating: 10, speed_rated: 1450 } },
        { id: 'Pump', name: 'Water Pump', componentDefinitionId: 'mechanical.pump.centrifugal', position: { x: 400, y: 300 }, parameterValues: { design_flow: 50, design_head: 20 } },
        { id: 'Tank', name: 'Reservoir', componentDefinitionId: 'mechanical.tank.atmospheric', position: { x: 400, y: 500 }, parameterValues: { level: 2 } },
        { id: 'Pipe', name: 'Discharge Pipe', componentDefinitionId: 'mechanical.pipe.standard', position: { x: 600, y: 400 }, parameterValues: { length: 50, diameter: 80 } }
    ],
    connections: [
        { id: 's1', sourceComponentId: 'Motor', targetComponentId: 'Pump', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 'f1', sourceComponentId: 'Tank', targetComponentId: 'Pump', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Pump', targetComponentId: 'Pipe', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Pipe', targetComponentId: 'Tank', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false }
    ]
};

// NEW: Thermal Management System
// Note: This template is currently not in the registry but kept for reference/future fix.
// It has domain mismatches (Mechanical Engine -> Fluid Pipe) that need resolution.
const THERMAL_SYSTEM: MechBlueprint = {
    id: 'thermal-sys',
    project_name: 'Engine Cooling System',
    updated_at: new Date().toISOString(),
    fluidId: 'coolant_glycol',
    components: [
        {
            id: 'Engine_Block',
            name: 'Engine Block (Heat Source)',
            componentDefinitionId: 'mechanical.engine.parametric',
            position: { x: 300, y: 200 },
            parameterValues: { max_power: 100, efficiency: 35, mass: 150 }
        },
        {
            id: 'Radiator',
            name: 'Main Radiator',
            componentDefinitionId: 'thermal.radiator',
            position: { x: 600, y: 200 },
            parameterValues: { heat_rejection: 50, air_temp: 25 }
        },
        {
            id: 'Coolant_Pump',
            name: 'Water Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 450, y: 400 },
            parameterValues: { design_flow: 80, design_head: 15, speed: 2000 }
        },
        {
            id: 'Expansion_Tank',
            name: 'Expansion Tank',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 300, y: 500 },
            parameterValues: { head: 1.5 }
        },
        // Piping
        { id: 'Pipe_Hot', name: 'Hot Leg', componentDefinitionId: 'fluid.pipe.std', position: { x: 450, y: 200 }, parameterValues: { length: 2, diameter: 40 } },
        { id: 'Pipe_Cold', name: 'Cold Leg', componentDefinitionId: 'fluid.pipe.std', position: { x: 600, y: 400 }, parameterValues: { length: 2, diameter: 40 } },
        { id: 'Pipe_Return', name: 'Return Leg', componentDefinitionId: 'fluid.pipe.std', position: { x: 300, y: 350 }, parameterValues: { length: 1, diameter: 40 } }
    ],
    connections: [
        // Engine -> Pipe_Hot -> Radiator
        // Warning: 'thermal_out' is thermal domain, 'in' is fluid domain. This connection is invalid in strict mode.
        { id: 'f1', sourceComponentId: 'Engine_Block', targetComponentId: 'Pipe_Hot', sourcePortId: 'thermal_out', targetPortId: 'in', type: 'fluid', isSelected: false },
    ]
};

// REVISED TEMPLATE 3: Steam Power Cycle (Rankine)
const RANKINE_CYCLE: MechBlueprint = {
    id: 'rankine-cycle',
    project_name: 'Rankine Power Cycle',
    updated_at: new Date().toISOString(),
    fluidId: 'water',
    components: [
        {
            id: 'Boiler',
            name: 'Steam Boiler',
            componentDefinitionId: 'thermal.boiler',
            position: { x: 200, y: 400 },
            parameterValues: { steam_capacity: 5000, steam_pressure: 40 }
        },
        {
            id: 'Turbine',
            name: 'Steam Turbine',
            componentDefinitionId: 'fluid.turbine.steam',
            position: { x: 400, y: 200 },
            parameterValues: { ratio: 20, efficiency: 85 }
        },
        {
            id: 'Condenser',
            name: 'Condenser',
            componentDefinitionId: 'thermal.hx.shell_tube', // Using HX as condenser
            position: { x: 600, y: 400 },
            parameterValues: { heat_duty: 4000, area: 50 }
        },
        {
            id: 'Feed_Pump',
            name: 'Feedwater Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 400, y: 600 },
            parameterValues: { design_flow: 6, design_head: 450 } // High head for boiler feed
        }
    ],
    connections: [
        { id: 'f1', sourceComponentId: 'Boiler', targetComponentId: 'Turbine', sourcePortId: 'steam_out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Turbine', targetComponentId: 'Condenser', sourcePortId: 'outlet', targetPortId: 'shell_in', type: 'fluid', isSelected: false }, // Shell side condensing
        { id: 'f3', sourceComponentId: 'Condenser', targetComponentId: 'Feed_Pump', sourcePortId: 'shell_out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Feed_Pump', targetComponentId: 'Boiler', sourcePortId: 'outlet', targetPortId: 'feedwater_in', type: 'fluid', isSelected: false }
    ]
};

// TEMPLATE 4: Hydraulic Control
const HYDRAULIC_CONTROL: MechBlueprint = {
    id: 'hyd-control',
    project_name: 'Flow Control Loop',
    updated_at: new Date().toISOString(),
    components: [
        {
            id: 'Source_Tank',
            name: 'Supply Tank',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 300 },
            parameterValues: { head: 2 }
        },
        {
            id: 'Main_Pump',
            name: 'Feed Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 300 },
            parameterValues: { design_flow: 50, design_head: 40 }
        },
        {
            id: 'Control_Valve',
            name: 'Flow Control Valve',
            componentDefinitionId: 'control.actuator.valve',
            position: { x: 500, y: 300 },
            parameterValues: { cv_rated: 40, characteristic: 'equal_percentage' }
        },
        {
            id: 'Flow_Meter',
            name: 'Flow Transmitter',
            componentDefinitionId: 'control.sensor.flow',
            position: { x: 700, y: 300 },
            parameterValues: { max_flow: 100 }
        },
        {
            id: 'PID_Ctrl',
            name: 'Flow Controller (FIC)',
            componentDefinitionId: 'control.controller.pid',
            position: { x: 600, y: 100 },
            parameterValues: { kp: 1.5, ti: 5, setpoint: 30 }
        }
    ],
    connections: [
        // Fluid Loop
        { id: 'f1', sourceComponentId: 'Source_Tank', targetComponentId: 'Main_Pump', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Main_Pump', targetComponentId: 'Control_Valve', sourcePortId: 'outlet', targetPortId: 'flow_in', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Control_Valve', targetComponentId: 'Flow_Meter', sourcePortId: 'flow_out', targetPortId: 'flow_in', type: 'fluid', isSelected: false },
        
        // Signal Loop
        { id: 's1', sourceComponentId: 'Flow_Meter', targetComponentId: 'PID_Ctrl', sourcePortId: 'signal_out', targetPortId: 'pv_in', type: 'signal', isSelected: false },
        { id: 's2', sourceComponentId: 'PID_Ctrl', targetComponentId: 'Control_Valve', sourcePortId: 'cv_out', targetPortId: 'signal_in', type: 'signal', isSelected: false }
    ]
};

// TEMPLATE 5: Process Mixing (Simple)
const PROCESS_MIXING: MechBlueprint = {
    id: 'process-mix',
    project_name: 'Chemical Dosing System',
    updated_at: new Date().toISOString(),
    components: [
        {
            id: 'Tank_A',
            name: 'Reactant A',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 200 },
            parameterValues: { head: 5 }
        },
        {
            id: 'Pump_A',
            name: 'Dosing Pump A',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 200 },
            parameterValues: { design_flow: 10, design_head: 50 }
        },
        {
            id: 'Tank_B',
            name: 'Reactant B',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 400 },
            parameterValues: { head: 5 }
        },
        {
            id: 'Pump_B',
            name: 'Dosing Pump B',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 400 },
            parameterValues: { design_flow: 10, design_head: 50 }
        },
        {
            id: 'Reactor',
            name: 'Reactor Vessel',
            componentDefinitionId: 'fluid.tank.reservoir', // Using tank as reactor
            position: { x: 600, y: 300 },
            parameterValues: { head: 0, capacity: 5000 }
        }
    ],
    connections: [
        { id: 'f1', sourceComponentId: 'Tank_A', targetComponentId: 'Pump_A', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Pump_A', targetComponentId: 'Reactor', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Tank_B', targetComponentId: 'Pump_B', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Pump_B', targetComponentId: 'Reactor', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false }
    ]
};

export const TEMPLATE_REGISTRY: SystemTemplate[] = [
    { 
        id: 'v8-turbo', 
        name: 'V8 Turbo Powertrain', 
        description: 'Complete simulation with Parametric Engine, Gearbox, and Thermal loop.', 
        blueprint: DEMO_V8_TURBO, 
        thumbnail: 'engine' 
    },
    { 
        id: 'pump-loop', 
        name: 'Basic Pump Loop', 
        description: 'Simple water recirculation system.', 
        blueprint: BASIC_PUMP_LOOP, 
        thumbnail: 'droplet' 
    },
    { 
        id: 'rankine', 
        name: 'Steam Power Cycle', 
        description: 'Thermodynamic cycle with Boiler, Turbine, and Condenser.', 
        blueprint: RANKINE_CYCLE, 
        thumbnail: 'flame' 
    },
    { 
        id: 'thermal-sys', 
        name: 'Engine Cooling System', 
        description: 'Thermal management loop with Heat Source, Radiator, and Pump.', 
        blueprint: THERMAL_SYSTEM, 
        thumbnail: 'thermometer' 
    },
    { 
        id: 'control-loop', 
        name: 'PID Flow Control', 
        description: 'Closed-loop control system with sensor, valve and PID.', 
        blueprint: HYDRAULIC_CONTROL, 
        thumbnail: 'activity' 
    },
    { 
        id: 'dosing-skid', 
        name: 'Chemical Dosing Skid', 
        description: 'Multi-stream injection system.', 
        blueprint: PROCESS_MIXING, 
        thumbnail: 'flask' 
    },
    { 
        id: 'empty', 
        name: 'Empty Project', 
        description: 'Start from scratch.', 
        blueprint: { id: 'new', project_name: 'Untitled Project', updated_at: '', components: [], connections: [], simulations: [], domain: 'fluid', version: '1.0.0', createdAt: new Date(), updatedAt: new Date(), author: 'User', tags: [] }, 
        thumbnail: 'file' 
    }
];

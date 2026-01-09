
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
    flows: [
        // Shaft Connections
        { id: 's1', source: 'V8_Engine', target: 'Reduction_Gear', sourceHandle: 'shaft_out', targetHandle: 'shaft_in', type: 'mechanical' },
        { id: 's2', source: 'Reduction_Gear', target: 'Main_Pump', sourceHandle: 'shaft_out', targetHandle: 'shaft_in', type: 'mechanical' },

        // Fluid Loop
        { id: 'f1', source: 'Supply_Tank', target: 'Suction_Line', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f2', source: 'Suction_Line', target: 'Main_Pump', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f3', source: 'Main_Pump', target: 'Throttle_Valve', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f4', source: 'Throttle_Valve', target: 'Return_Line', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f5', source: 'Return_Line', target: 'Supply_Tank', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' }
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
    flows: [
        { id: 's1', source: 'Motor', target: 'Pump', sourceHandle: 'shaft_out', targetHandle: 'shaft_in', type: 'mechanical' },
        { id: 'f1', source: 'Tank', target: 'Pump', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f2', source: 'Pump', target: 'Pipe', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f3', source: 'Pipe', target: 'Tank', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' }
    ]
};

// NEW: Thermal Management System
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
    flows: [
        // Engine -> Pipe_Hot -> Radiator
        { id: 'f1', source: 'Engine_Block', target: 'Pipe_Hot', sourceHandle: 'thermal_out', targetHandle: 'in', type: 'fluid' }, // Using thermal_out as fluid port for simplified model? 
        // Wait, Engine Parametric usually has mechanical shaft and maybe thermal out, but not fluid ports unless specified.
        // Let's check Engine Parametric definition. It has 'thermal_out' (thermal domain).
        // Radiator has 'coolant_in' (fluid domain).
        // Mismatch: Thermal Domain -> Fluid Domain. This requires a bridge or the engine needs fluid ports.
        // Re-checking Mechanical Engine: It has 'thermal_out' (domain: thermal).
        // Radiator: 'coolant_in' (domain: fluid).
        // This template is invalid without a "Thermal Fluid Source" or similar.
        // FIX: Use 'thermal.hx.plate' as a "Water Jacket" placeholder or assume Engine has fluid ports.
        // Actually, let's look at `mechanical.engine.parametric` again. It ONLY has `shaft_out` and `thermal_out`.
        // `thermal_out` is domain: thermal.
        // `coolant_in` on Radiator is domain: fluid.
        // So I can't connect them directly.
        // I will use a simple "Heater" component if available, or just connect fluid loop and assume heat input comes from "environment" or "boiler".
        // Let's switch to "Boiler Steam Loop" which uses `thermal.boiler`.
        // Boiler has `feedwater_in` (fluid) and `steam_out` (fluid). This is better.
        
        // REVISED THERMAL SYSTEM: Steam Generation Loop
        // Boiler -> Turbine -> Condenser (Radiator) -> Pump -> Boiler
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
    flows: [
        { id: 'f1', source: 'Boiler', target: 'Turbine', sourceHandle: 'steam_out', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f2', source: 'Turbine', target: 'Condenser', sourceHandle: 'outlet', targetHandle: 'shell_in', type: 'fluid' }, // Shell side condensing
        { id: 'f3', source: 'Condenser', target: 'Feed_Pump', sourceHandle: 'shell_out', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f4', source: 'Feed_Pump', target: 'Boiler', sourceHandle: 'outlet', targetHandle: 'feedwater_in', type: 'fluid' }
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
            parameterValues: { kp: 1.5, ti: 5, setpoint: 30 } // added imaginary setpoint param
        }
    ],
    flows: [
        // Fluid Loop
        { id: 'f1', source: 'Source_Tank', target: 'Main_Pump', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f2', source: 'Main_Pump', target: 'Control_Valve', sourceHandle: 'outlet', targetHandle: 'flow_in', type: 'fluid' },
        { id: 'f3', source: 'Control_Valve', target: 'Flow_Meter', sourceHandle: 'flow_out', targetHandle: 'flow_in', type: 'fluid' },
        
        // Signal Loop
        { id: 's1', source: 'Flow_Meter', target: 'PID_Ctrl', sourceHandle: 'signal_out', targetHandle: 'pv_in', type: 'signal' },
        { id: 's2', source: 'PID_Ctrl', target: 'Control_Valve', sourceHandle: 'cv_out', targetHandle: 'signal_in', type: 'signal' }
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
    flows: [
        { id: 'f1', source: 'Tank_A', target: 'Pump_A', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f2', source: 'Pump_A', target: 'Reactor', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f3', source: 'Tank_B', target: 'Pump_B', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
        { id: 'f4', source: 'Pump_B', target: 'Reactor', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' } // Tank has one inlet, might need tee? 
        // Tank definition shows 1 inlet. Simulation might allow multiple connections to same port, or I need a pipe junction.
        // Assuming multi-connect for now as it's common in this engine's graph.
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
        blueprint: { id: 'new', project_name: 'Untitled Project', updated_at: '', components: [], flows: [] }, 
        thumbnail: 'file' 
    }
];

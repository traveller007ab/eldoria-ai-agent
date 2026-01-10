
import { MechBlueprint } from '../../types';

export interface SystemTemplate {
    id: string;
    name: string;
    description: string;
    thumbnail?: string;
    blueprint: MechBlueprint;
}

const DEMO_V8_TURBO: MechBlueprint = {
    id: 'demo-v8-turbo',
    name: '2.0L Turbo V8 Powertrain',
    description: 'Complete simulation with Engine, Gearbox, and Hydraulic loop.',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['engine', 'pump', 'hydraulic'],
    simulations: [],
    components: [
        {
            id: 'V8_Engine',
            name: 'V8 Engine',
            componentDefinitionId: 'mechanical.engine.ic',
            position: { x: 100, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: {
                max_power: 300,
                max_speed: 6000,
                throttle: 50,
                displacement: 2.0,
                cylinders: 8
            }
        },
        {
            id: 'Reduction_Gear',
            name: 'Reduction Gear',
            componentDefinitionId: 'mechanical.gear.spur',
            position: { x: 300, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { ratio: 2.0, efficiency: 0.98 }
        },
        {
            id: 'Main_Pump',
            name: 'Main Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 500, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 150, design_head: 80, efficiency: 0.85 }
        },
        {
            id: 'Supply_Tank',
            name: 'Supply Tank',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 500, y: 500 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 5 }
        },
        {
            id: 'Throttle_Valve',
            name: 'Throttle Valve',
            componentDefinitionId: 'fluid.valve.globe',
            position: { x: 700, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { cv: 100, opening: 50 }
        },
        {
            id: 'Suction_Line',
            name: 'Suction Line',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 500, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 5, diameter: 150, roughness: 0.05 }
        },
        {
            id: 'Return_Line',
            name: 'Return Line',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 700, y: 500 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 20, diameter: 150, roughness: 0.05 }
        }
    ],
    connections: [
        { id: 's1', sourceComponentId: 'V8_Engine', targetComponentId: 'Reduction_Gear', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 's2', sourceComponentId: 'Reduction_Gear', targetComponentId: 'Main_Pump', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 'f1', sourceComponentId: 'Supply_Tank', targetComponentId: 'Suction_Line', sourcePortId: 'outlet', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Suction_Line', targetComponentId: 'Main_Pump', sourcePortId: 'out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Main_Pump', targetComponentId: 'Throttle_Valve', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Throttle_Valve', targetComponentId: 'Return_Line', sourcePortId: 'outlet', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f5', sourceComponentId: 'Return_Line', targetComponentId: 'Supply_Tank', sourcePortId: 'out', targetPortId: 'in', type: 'fluid', isSelected: false }
    ]
};

const BASIC_PUMP_LOOP: MechBlueprint = {
    id: 'basic-pump',
    name: 'Simple Pump Loop',
    description: 'Simple water recirculation system.',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['pump', 'basic'],
    simulations: [],
    components: [
        {
            id: 'Motor',
            name: 'Electric Motor',
            componentDefinitionId: 'mechanical.motor.electric',
            position: { x: 200, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { power_rating: 10, speed_rated: 1450 }
        },
        {
            id: 'Pump',
            name: 'Water Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 400, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 50, design_head: 20 }
        },
        {
            id: 'Tank',
            name: 'Reservoir',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 400, y: 500 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 2 }
        },
        {
            id: 'Pipe',
            name: 'Discharge Pipe',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 600, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 50, diameter: 80 }
        }
    ],
    connections: [
        { id: 's1', sourceComponentId: 'Motor', targetComponentId: 'Pump', sourcePortId: 'shaft_out', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 'f1', sourceComponentId: 'Tank', targetComponentId: 'Pump', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Pump', targetComponentId: 'Pipe', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Pipe', targetComponentId: 'Tank', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false }
    ]
};

const THERMAL_SYSTEM: MechBlueprint = {
    id: 'thermal-sys',
    name: 'Engine Cooling System',
    description: 'Thermal management loop with Heat Source, Radiator, and Pump.',
    domain: 'fluid',
    version: '1.0.0',
    fluidId: 'coolant_glycol',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['thermal', 'cooling', 'engine'],
    simulations: [],
    components: [
        {
            id: 'Engine_Block',
            name: 'Engine Block (Heat Source)',
            componentDefinitionId: 'mechanical.engine.ic',
            position: { x: 300, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { max_power: 100, efficiency: 35, mass: 150 }
        },
        {
            id: 'Radiator',
            name: 'Main Radiator',
            componentDefinitionId: 'thermal.radiator',
            position: { x: 600, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { heat_rejection: 50, air_temp: 25 }
        },
        {
            id: 'Coolant_Pump',
            name: 'Water Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 450, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 80, design_head: 15, speed: 2000 }
        },
        {
            id: 'Expansion_Tank',
            name: 'Expansion Tank',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 300, y: 500 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 1.5 }
        },
        {
            id: 'Pipe_Hot',
            name: 'Hot Leg',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 450, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 2, diameter: 40 }
        },
        {
            id: 'Pipe_Cold',
            name: 'Cold Leg',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 600, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 2, diameter: 40 }
        },
        {
            id: 'Pipe_Return',
            name: 'Return Leg',
            componentDefinitionId: 'fluid.pipe.std',
            position: { x: 300, y: 350 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { length: 1, diameter: 40 }
        }
    ],
    connections: [
        { id: 'f1', sourceComponentId: 'Engine_Block', targetComponentId: 'Pipe_Hot', sourcePortId: 'thermal_out', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Pipe_Hot', targetComponentId: 'Radiator', sourcePortId: 'out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Radiator', targetComponentId: 'Pipe_Cold', sourcePortId: 'outlet', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Pipe_Cold', targetComponentId: 'Coolant_Pump', sourcePortId: 'out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f5', sourceComponentId: 'Coolant_Pump', targetComponentId: 'Pipe_Return', sourcePortId: 'outlet', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f6', sourceComponentId: 'Pipe_Return', targetComponentId: 'Expansion_Tank', sourcePortId: 'out', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'f7', sourceComponentId: 'Expansion_Tank', targetComponentId: 'Engine_Block', sourcePortId: 'outlet', targetPortId: 'in', type: 'fluid', isSelected: false }
    ]
};

const RANKINE_CYCLE: MechBlueprint = {
    id: 'rankine-cycle',
    name: 'Steam Power Cycle',
    description: 'Thermodynamic cycle with Boiler, Turbine, and Condenser.',
    domain: 'fluid',
    version: '1.0.0',
    fluidId: 'water',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['thermal', 'rankine', 'power'],
    simulations: [],
    components: [
        {
            id: 'Boiler',
            name: 'Steam Boiler',
            componentDefinitionId: 'thermal.boiler',
            position: { x: 200, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { steam_capacity: 5000, steam_pressure: 40 }
        },
        {
            id: 'Turbine',
            name: 'Steam Turbine',
            componentDefinitionId: 'fluid.turbine.steam',
            position: { x: 400, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { ratio: 20, efficiency: 85 }
        },
        {
            id: 'Condenser',
            name: 'Condenser',
            componentDefinitionId: 'thermal.hx.shell_tube',
            position: { x: 600, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { heat_duty: 4000, area: 50 }
        },
        {
            id: 'Feed_Pump',
            name: 'Feedwater Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 400, y: 600 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 6, design_head: 450 }
        }
    ],
    connections: [
        { id: 'f1', sourceComponentId: 'Boiler', targetComponentId: 'Turbine', sourcePortId: 'steam_out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Turbine', targetComponentId: 'Condenser', sourcePortId: 'outlet', targetPortId: 'shell_in', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Condenser', targetComponentId: 'Feed_Pump', sourcePortId: 'shell_out', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f4', sourceComponentId: 'Feed_Pump', targetComponentId: 'Boiler', sourcePortId: 'outlet', targetPortId: 'feedwater_in', type: 'fluid', isSelected: false }
    ]
};

const HYDRAULIC_CONTROL: MechBlueprint = {
    id: 'hyd-control',
    name: 'Flow Control Loop',
    description: 'Closed-loop control system with sensor, valve and PID.',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['control', 'pid', 'valve'],
    simulations: [],
    components: [
        {
            id: 'Source_Tank',
            name: 'Supply Tank',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 2 }
        },
        {
            id: 'Main_Pump',
            name: 'Feed Pump',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 50, design_head: 40 }
        },
        {
            id: 'Control_Valve',
            name: 'Flow Control Valve',
            componentDefinitionId: 'control.actuator.valve',
            position: { x: 500, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { cv_rated: 40, characteristic: 'equal_percentage' }
        },
        {
            id: 'Flow_Meter',
            name: 'Flow Transmitter',
            componentDefinitionId: 'control.sensor.flow',
            position: { x: 700, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { max_flow: 100 }
        },
        {
            id: 'PID_Ctrl',
            name: 'Flow Controller (FIC)',
            componentDefinitionId: 'control.controller.pid',
            position: { x: 600, y: 100 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { kp: 1.5, ti: 5, setpoint: 30 }
        }
    ],
    connections: [
        { id: 'f1', sourceComponentId: 'Source_Tank', targetComponentId: 'Main_Pump', sourcePortId: 'outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'f2', sourceComponentId: 'Main_Pump', targetComponentId: 'Control_Valve', sourcePortId: 'outlet', targetPortId: 'flow_in', type: 'fluid', isSelected: false },
        { id: 'f3', sourceComponentId: 'Control_Valve', targetComponentId: 'Flow_Meter', sourcePortId: 'flow_out', targetPortId: 'flow_in', type: 'fluid', isSelected: false },
        { id: 's1', sourceComponentId: 'Flow_Meter', targetComponentId: 'PID_Ctrl', sourcePortId: 'signal_out', targetPortId: 'pv_in', type: 'signal', isSelected: false },
        { id: 's2', sourceComponentId: 'PID_Ctrl', targetComponentId: 'Control_Valve', sourcePortId: 'cv_out', targetPortId: 'signal_in', type: 'signal', isSelected: false }
    ]
};

const PROCESS_MIXING: MechBlueprint = {
    id: 'process-mix',
    name: 'Chemical Dosing System',
    description: 'Multi-stream injection system.',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'System',
    tags: ['chemical', 'mixing', 'dosing'],
    simulations: [],
    components: [
        {
            id: 'Tank_A',
            name: 'Reactant A',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 5 }
        },
        {
            id: 'Pump_A',
            name: 'Dosing Pump A',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 200 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 10, design_head: 50 }
        },
        {
            id: 'Tank_B',
            name: 'Reactant B',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 100, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { head: 5 }
        },
        {
            id: 'Pump_B',
            name: 'Dosing Pump B',
            componentDefinitionId: 'fluid.pump.centrifugal',
            position: { x: 300, y: 400 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
            parameterValues: { design_flow: 10, design_head: 50 }
        },
        {
            id: 'Reactor',
            name: 'Reactor Vessel',
            componentDefinitionId: 'fluid.tank.reservoir',
            position: { x: 600, y: 300 },
            rotation: 0,
            isSelected: false,
            groupIds: [],
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
        description: 'Complete simulation with Engine, Gearbox, and Hydraulic loop.',
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
        blueprint: {
            id: 'new',
            name: 'Untitled Project',
            description: '',
            domain: 'fluid',
            version: '1.0.0',
            components: [],
            connections: [],
            simulations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'User',
            tags: []
        },
        thumbnail: 'file'
    }
];

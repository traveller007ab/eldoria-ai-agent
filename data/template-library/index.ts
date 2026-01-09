
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

export const TEMPLATE_REGISTRY: SystemTemplate[] = [
    { id: 'v8-turbo', name: 'V8 Turbo Powertrain', description: 'Complete simulation with Parametric Engine, Gearbox, and Thermal loop.', blueprint: DEMO_V8_TURBO, thumbnail: 'engine' },
    { id: 'pump-loop', name: 'Basic Pump Loop', description: 'Simple water recirculation system.', blueprint: BASIC_PUMP_LOOP, thumbnail: 'droplet' },
    { id: 'empty', name: 'Empty Project', description: 'Start from scratch.', blueprint: { id: 'new', project_name: 'Untitled Project', updated_at: '', components: [], flows: [] }, thumbnail: 'file' }
];

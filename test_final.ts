import { SimulationService } from './services/physics/SimulationService.ts';
import { DynamicSimulationService } from './services/physics/DynamicSimulationService.ts';
import type { MechBlueprint } from './types.ts';

const blueprint: MechBlueprint = {
    id: 'demo-engine-pump-001',
    name: 'V8 Engine Pump Loop',
    description: 'Demonstration of Multi-Physics: V8 Engine driving a Centrifugal Pump through a Gearbox.',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
    author: 'System',
    tags: [],
    components: [
        {
            id: 'engine-1',
            componentDefinitionId: 'mechanical.engine.ic',
            name: 'V8 Engine',
            position: { x: 100, y: 100 },
            rotation: 0,
            parameterValues: {
                max_power: 300,
                max_speed: 6000,
                idle_speed: 800,
                throttle: 50
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'gearbox-1',
            componentDefinitionId: 'mechanical.gear.spur',
            name: 'Reduction Gear',
            position: { x: 350, y: 100 },
            rotation: 0,
            parameterValues: {
                z1: 20,
                z2: 40,
                module: 5
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pump-1',
            componentDefinitionId: 'fluid.pump.centrifugal',
            name: 'Main Pump',
            position: { x: 600, y: 100 },
            rotation: 0,
            parameterValues: {
                design_flow: 150,
                design_head: 80
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'tank-1',
            componentDefinitionId: 'fluid.tank.reservoir',
            name: 'Supply Tank',
            position: { x: 600, y: 400 },
            rotation: 0,
            parameterValues: {
                head: 5,
                initial_level: 5,
                area: 10
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pipe-suction',
            componentDefinitionId: 'fluid.pipe.std',
            name: 'Suction Line',
            position: { x: 600, y: 250 },
            rotation: 90,
            parameterValues: {
                length: 5,
                diameter: 200,
                roughness: 0.045
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'valve-discharge',
            componentDefinitionId: 'fluid.valve.globe',
            name: 'Throttle Valve',
            position: { x: 800, y: 100 },
            rotation: 0,
            parameterValues: {
                opening: 100,
                cv: 200
            },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pipe-return',
            componentDefinitionId: 'fluid.pipe.std',
            name: 'Return Line',
            position: { x: 800, y: 400 },
            rotation: 0,
            parameterValues: {
                length: 20,
                diameter: 150
            },
            isSelected: false,
            groupIds: []
        }
    ],
    connections: [
        {
            id: 'c1',
            sourceComponentId: 'engine-1',
            sourcePortId: 'shaft_out',
            targetComponentId: 'gearbox-1',
            targetPortId: 'shaft_in',
            type: 'mechanical',
            isSelected: false
        },
        {
            id: 'c2',
            sourceComponentId: 'gearbox-1',
            sourcePortId: 'shaft_out',
            targetComponentId: 'pump-1',
            targetPortId: 'shaft_in',
            type: 'mechanical',
            isSelected: false
        },
        {
            id: 'c3',
            sourceComponentId: 'tank-1',
            sourcePortId: 'outlet',
            targetComponentId: 'pipe-suction',
            targetPortId: 'in',
            type: 'fluid',
            isSelected: false
        },
        {
            id: 'c4',
            sourceComponentId: 'pipe-suction',
            sourcePortId: 'out',
            targetComponentId: 'pump-1',
            targetPortId: 'inlet',
            type: 'fluid',
            isSelected: false
        },
        {
            id: 'c5',
            sourceComponentId: 'pump-1',
            sourcePortId: 'outlet',
            targetComponentId: 'valve-discharge',
            targetPortId: 'in',
            type: 'fluid',
            isSelected: false
        },
        {
            id: 'c6',
            sourceComponentId: 'valve-discharge',
            sourcePortId: 'out',
            targetComponentId: 'pipe-return',
            targetPortId: 'in',
            type: 'fluid',
            isSelected: false
        },
        {
            id: 'c7',
            sourceComponentId: 'pipe-return',
            sourcePortId: 'out',
            targetComponentId: 'tank-1',
            targetPortId: 'inlet',
            type: 'fluid',
            isSelected: false
        }
    ],
    simulations: []
};

async function main() {
    try {
        console.log('\n=== FINAL TEST AFTER NETWORK TOPOLOGY FIX ===\n');
        
        console.log('\n--- STATIC SIMULATION ---');
        const staticResult = await SimulationService.run(blueprint, false);
        
        console.log('Status:', staticResult.status);
        console.log('Duration:', staticResult.duration + 'ms');
        console.log('Power Input:', staticResult.metrics?.totalPowerInput?.toFixed(2) + ' kW');
        console.log('Power Output:', staticResult.metrics?.totalPowerOutput?.toFixed(2) + ' kW');
        console.log('Efficiency:', staticResult.metrics?.overallEfficiency?.toFixed(1) + '%');
        console.log('Total Flow:', staticResult.metrics?.totalFlowRate?.toFixed(1) + ' m³/h');
        
        console.log('\n--- DYNAMIC SIMULATION ---');
        const dynamicResult = await DynamicSimulationService.simulate(blueprint, 60, 0.5);
        
        console.log('Status:', dynamicResult.status);
        console.log('Duration:', dynamicResult.duration + 'ms');
        console.log('Power Input:', dynamicResult.metrics?.totalPowerInput?.toFixed(2) + ' kW');
        console.log('Power Output:', dynamicResult.metrics?.totalPowerOutput?.toFixed(2) + ' kW');
        console.log('Efficiency:', dynamicResult.metrics?.overallEfficiency?.toFixed(1) + '%');
        console.log('Total Flow:', dynamicResult.metrics?.totalFlowRate?.toFixed(1) + ' m³/h');
        
        console.log('\n=== COMPARISON ===');
        console.log('Static Power Output:', staticResult.metrics?.totalPowerOutput?.toFixed(2) + ' kW');
        console.log('Dynamic Power Output:', dynamicResult.metrics?.totalPowerOutput?.toFixed(2) + ' kW');
        console.log('Expected: 21.46 kW');
        
        if (dynamicResult.timeSeries && Object.keys(dynamicResult.timeSeries).length > 0) {
            console.log('\nTime Series Variables:', Object.keys(dynamicResult.timeSeries).length);
            Object.keys(dynamicResult.timeSeries).slice(0, 5).forEach(key => {
                const data = dynamicResult.timeSeries[key];
                if (data && data.length > 0) {
                    console.log('  ' + key + ': ' + data[0]?.toFixed(2) + ' ... ' + data[data.length-1]?.toFixed(2));
                }
            });
        }
        
    } catch (error) {
        console.error('ERROR:', error instanceof Error ? error.message : error);
    }
}

main();
import { SimulationService } from './services/physics/SimulationService.ts';
import type { MechBlueprint } from './types.ts';

const blueprint: MechBlueprint = {
    id: 'test-001',
    name: 'Simple Engine-Pump-Tank Test',
    description: 'Simple test system',
    domain: 'fluid',
    version: '1.0.0',
    createdAt: new Date('2024-01-07'),
    updatedAt: new Date('2024-01-07'),
    author: 'test',
    tags: [],
    components: [
        {
            id: 'engine-1',
            componentDefinitionId: 'mechanical.engine.ic',
            name: 'Engine',
            position: { x: 100, y: 100 },
            rotation: 0,
            parameterValues: { max_power: 50, max_speed: 3000, throttle: 75 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pump-1',
            componentDefinitionId: 'fluid.pump.centrifugal',
            name: 'Pump',
            position: { x: 300, y: 100 },
            rotation: 0,
            parameterValues: { design_flow: 100, design_head: 50 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'tank-1',
            componentDefinitionId: 'fluid.tank.reservoir',
            name: 'Tank',
            position: { x: 500, y: 100 },
            rotation: 0,
            parameterValues: { head: 5, initial_level: 5, area: 10 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pipe-1',
            componentDefinitionId: 'fluid.pipe.std',
            name: 'SuctionPipe',
            position: { x: 200, y: 100 },
            rotation: 0,
            parameterValues: { length: 5, diameter: 100, roughness: 0.045 },
            isSelected: false,
            groupIds: []
        },
        {
            id: 'pipe-2',
            componentDefinitionId: 'fluid.pipe.std',
            name: 'DischargePipe',
            position: { x: 400, y: 100 },
            rotation: 0,
            parameterValues: { length: 5, diameter: 100, roughness: 0.045 },
            isSelected: false,
            groupIds: []
        }
    ],
    connections: [
        { id: 'c1', sourceComponentId: 'engine-1', sourcePortId: 'shaft_out', targetComponentId: 'pump-1', targetPortId: 'shaft_in', type: 'mechanical', isSelected: false },
        { id: 'c2', sourceComponentId: 'tank-1', sourcePortId: 'outlet', targetComponentId: 'pipe-1', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'c3', sourceComponentId: 'pipe-1', sourcePortId: 'out', targetComponentId: 'pump-1', targetPortId: 'inlet', type: 'fluid', isSelected: false },
        { id: 'c4', sourceComponentId: 'pump-1', sourcePortId: 'outlet', targetComponentId: 'pipe-2', targetPortId: 'in', type: 'fluid', isSelected: false },
        { id: 'c5', sourceComponentId: 'pipe-2', sourcePortId: 'out', targetComponentId: 'tank-1', targetPortId: 'inlet', type: 'fluid', isSelected: false }
    ],
    simulations: []
};

async function main() {
    console.log('\n=== STATIC TEST ===\n');
    try {
        const result = await SimulationService.run(blueprint, false);
        console.log('status:', result.status);
        console.log('powerInput:', result.metrics?.totalPowerInput);
        console.log('powerOutput:', result.metrics?.totalPowerOutput);
        console.log('variables:');
        Object.entries(result.variables).slice(0, 20).forEach(([k, v]) => console.log('  ' + k + ': ' + v));
    } catch (e) {
        console.error('ERROR:', e instanceof Error ? e.message : e);
    }
}

main();
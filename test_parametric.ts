import { ParametricSweepService, generateSweepValues } from './services/simulation/ParametricSweepService.ts';

const mockBlueprint = {
    id: 'test',
    name: 'Test Blueprint',
    domain: 'fluid' as const,
    components: [],
    connections: [],
    simulations: [],
    version: '1.0.0',
    createdAt: new Date(),
    updatedAt: new Date(),
    author: 'Test',
    tags: []
};

console.log('Running parametric sweep test...');

const service = new ParametricSweepService(mockBlueprint);
const values = generateSweepValues('pump_speed', 1450, 50, 150, 11);
console.log('Sweep values:', values);

const result = await service.runSweep({
    parameter: 'pump_speed',
    values,
    unit: 'RPM',
    label: 'Pump Speed'
});

console.log('\n=== Parametric Sweep Results ===');
console.log('Points tested:', result.results.length);
console.log('Best efficiency point:', result.bestEfficiencyPoint);
console.log('\nAll results:');
result.results.forEach(r => {
    console.log(`  ${r.parameterValue.toFixed(0)}%: Flow=${r.flow.toFixed(1)} m³/h, Head=${r.head.toFixed(1)}m, Power=${r.power.toFixed(1)}kW, Eff=${r.efficiency.toFixed(1)}%`);
});

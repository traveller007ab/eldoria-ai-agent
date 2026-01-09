import { ModelAnalyzer, ModelCategory } from '../services/physics/ModelAnalyzer';
import { MechBlueprint } from '../types';

describe('ModelAnalyzer Classification', () => {
    const createBlueprint = (components: Array<{ id: string; type: string; connections?: Array<{ source: string; target: string; type: string }> }>): MechBlueprint => {
        return {
            id: 'test-blueprint',
            name: 'Test Blueprint',
            description: 'Test blueprint for ModelAnalyzer',
            domain: 'fluid',
            version: '1.0',
            components: components.map((c, i) => ({
                id: `comp-${i}`,
                componentDefinitionId: c.type,
                name: `${c.type}_${i}`,
                position: { x: 100 * i, y: 100 * i },
                rotation: 0,
                parameterValues: {},
                isSelected: false,
                groupIds: []
            })),
            connections: components.flatMap((c, i) =>
                (c.connections || []).map(conn => ({
                    id: `conn-${i}-${conn.source}-${conn.target}`,
                    sourceComponentId: `comp-${i}`,
                    sourcePortId: 'out',
                    targetComponentId: `comp-${parseInt(conn.target.split('-')[1])}`,
                    targetPortId: 'in',
                    type: conn.type,
                    isSelected: false
                }))
            ),
            simulations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'test',
            tags: []
        };
    };

    describe('classifyComponent', () => {
        test('should classify engine components', () => {
            expect(ModelAnalyzer.classifyComponent('v8_engine')).toBe('combustion_engine');
            expect(ModelAnalyzer.classifyComponent('electric_motor')).toBe('electric_motor');
            expect(ModelAnalyzer.classifyComponent('Engine')).toBe('combustion_engine');
        });

        test('should classify pump components', () => {
            expect(ModelAnalyzer.classifyComponent('centrifugal_pump')).toBe('pump');
            expect(ModelAnalyzer.classifyComponent('Pump')).toBe('pump');
        });

        test('should classify heat exchanger components', () => {
            expect(ModelAnalyzer.classifyComponent('heat_exchanger')).toBe('heat_exchanger');
            expect(ModelAnalyzer.classifyComponent('radiator')).toBe('heat_exchanger');
            expect(ModelAnalyzer.classifyComponent('HX')).toBe('heat_exchanger');
        });

        test('should classify valve components', () => {
            expect(ModelAnalyzer.classifyComponent('control_valve')).toBe('valve');
            expect(ModelAnalyzer.classifyComponent('Valve')).toBe('valve');
        });

        test('should classify tank components', () => {
            expect(ModelAnalyzer.classifyComponent('pressure_tank')).toBe('tank');
            expect(ModelAnalyzer.classifyComponent('reservoir')).toBe('tank');
        });

        test('should classify pipe components', () => {
            expect(ModelAnalyzer.classifyComponent('pipe')).toBe('pipe');
            expect(ModelAnalyzer.classifyComponent('pipeline')).toBe('pipe');
        });

        test('should classify generic components', () => {
            expect(ModelAnalyzer.classifyComponent('sensor')).toBe('generic_component');
            expect(ModelAnalyzer.classifyComponent('unknown')).toBe('generic_component');
        });
    });

    describe('hasActiveEngineSimulation', () => {
        test('should return false when no engine components', () => {
            const blueprint = createBlueprint([
                { id: 'pump', type: 'centrifugal_pump' },
                { id: 'valve', type: 'control_valve' }
            ]);
            expect(ModelAnalyzer.hasActiveEngineSimulation(blueprint, 0)).toBe(false);
        });

        test('should return false when engine has no mechanical connections', () => {
            const blueprint = createBlueprint([
                { id: 'engine', type: 'v8_engine' },
                { id: 'pump', type: 'centrifugal_pump' }
            ]);
            expect(ModelAnalyzer.hasActiveEngineSimulation(blueprint, 1)).toBe(false);
        });

        test('should return true when engine has mechanical connection to pump', () => {
            const blueprint = createBlueprint([
                {
                    id: 'engine', type: 'v8_engine', connections: [
                        { source: 'engine', target: 'pump', type: 'mechanical' }
                    ]
                },
                { id: 'pump', type: 'centrifugal_pump' }
            ]);
            expect(ModelAnalyzer.hasActiveEngineSimulation(blueprint, 1)).toBe(true);
        });

        test('should return true when engine has mechanical connection to gear', () => {
            const blueprint = createBlueprint([
                {
                    id: 'engine', type: 'v8_engine', connections: [
                        { source: 'engine', target: 'gear', type: 'mechanical' }
                    ]
                },
                { id: 'gear', type: 'gearbox' }
            ]);
            expect(ModelAnalyzer.hasActiveEngineSimulation(blueprint, 1)).toBe(true);
        });

        test('should return true when engine has speed parameters', () => {
            const blueprint: MechBlueprint = {
                id: 'test',
                name: 'Test',
                description: '',
                domain: 'fluid',
                version: '1.0',
                components: [{
                    id: 'engine',
                    componentDefinitionId: 'v8_engine',
                    name: 'engine',
                    position: { x: 0, y: 0 },
                    rotation: 0,
                    parameterValues: { idle_speed: 800, max_speed: 7000 },
                    isSelected: false,
                    groupIds: []
                }],
                connections: [],
                simulations: [],
                createdAt: new Date(),
                updatedAt: new Date(),
                author: 'test',
                tags: []
            };
            expect(ModelAnalyzer.hasActiveEngineSimulation(blueprint, 1)).toBe(true);
        });
    });

    describe('determineCategory', () => {
        test('should return engine_system for engine-only system', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 1,
                pumpCount: 0,
                turbineCount: 0,
                heatExchangerCount: 0,
                valveCount: 0,
                tankCount: 0,
                compressorCount: 0,
                pipeCount: 0,
                totalComponents: 1
            });
            expect(result).toBe('engine_system');
        });

        test('should return vehicle_dynamics for engine with mechanical connections to pump', () => {
            const blueprint = createBlueprint([
                {
                    id: 'engine', type: 'v8_engine', connections: [
                        { source: 'engine', target: 'pump', type: 'mechanical' }
                    ]
                },
                { id: 'pump', type: 'centrifugal_pump' }
            ]);

            const result = ModelAnalyzer.determineCategory({
                engineCount: 1,
                pumpCount: 1,
                turbineCount: 0,
                heatExchangerCount: 0,
                valveCount: 0,
                tankCount: 0,
                compressorCount: 0,
                pipeCount: 0,
                totalComponents: 2
            }, blueprint);
            expect(result).toBe('vehicle_dynamics');
        });

        test('should return hydraulic_circuit for pump with tank and pipes', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 1,
                turbineCount: 0,
                heatExchangerCount: 0,
                valveCount: 0,
                tankCount: 1,
                compressorCount: 0,
                pipeCount: 3,
                totalComponents: 5
            });
            expect(result).toBe('hydraulic_circuit');
        });

        test('should return pump_system for standalone pump', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 1,
                turbineCount: 0,
                heatExchangerCount: 0,
                valveCount: 0,
                tankCount: 0,
                compressorCount: 0,
                pipeCount: 1,
                totalComponents: 2
            });
            expect(result).toBe('pump_system');
        });

        test('should return power_plant for turbine with heat exchanger', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 0,
                turbineCount: 1,
                heatExchangerCount: 1,
                valveCount: 0,
                tankCount: 0,
                compressorCount: 0,
                pipeCount: 0,
                totalComponents: 2
            });
            expect(result).toBe('power_plant');
        });

        test('should return hvac_system for heat exchanger with compressor and valve', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 0,
                turbineCount: 0,
                heatExchangerCount: 1,
                valveCount: 1,
                tankCount: 0,
                compressorCount: 1,
                pipeCount: 0,
                totalComponents: 3
            });
            expect(result).toBe('hvac_system');
        });

        test('should return thermal_network for heat exchanger with tank and pipes', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 0,
                turbineCount: 0,
                heatExchangerCount: 1,
                valveCount: 0,
                tankCount: 1,
                compressorCount: 0,
                pipeCount: 2,
                totalComponents: 4
            });
            expect(result).toBe('thermal_network');
        });

        test('should return process_system for complex process setup', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 0,
                turbineCount: 0,
                heatExchangerCount: 1,
                valveCount: 3,
                tankCount: 1,
                compressorCount: 0,
                pipeCount: 2,
                totalComponents: 7
            });
            expect(result).toBe('process_system');
        });

        test('should return general for minimal components', () => {
            const result = ModelAnalyzer.determineCategory({
                engineCount: 0,
                pumpCount: 0,
                turbineCount: 0,
                heatExchangerCount: 0,
                valveCount: 0,
                tankCount: 0,
                compressorCount: 0,
                pipeCount: 0,
                totalComponents: 0
            });
            expect(result).toBe('general');
        });
    });

    describe('analyze', () => {
        test('should analyze engine-only blueprint correctly', () => {
            const blueprint = createBlueprint([
                { id: 'engine', type: 'v8_engine' }
            ]);

            const result = ModelAnalyzer.analyze(blueprint);

            expect(result.category).toBe('engine_system');
            expect(result.hasEngine).toBe(true);
            expect(result.hasPump).toBe(false);
            expect(result.hasActiveEngineSimulation).toBe(false);
            expect(result.complexity).toBe('simple');
        });

        test('should analyze engine-pump with mechanical connections as vehicle_dynamics', () => {
            const blueprint = createBlueprint([
                {
                    id: 'engine', type: 'v8_engine', connections: [
                        { source: 'engine', target: 'pump', type: 'mechanical' }
                    ]
                },
                { id: 'pump', type: 'centrifugal_pump' }
            ]);

            const result = ModelAnalyzer.analyze(blueprint);

            expect(result.category).toBe('vehicle_dynamics');
            expect(result.hasEngine).toBe(true);
            expect(result.hasPump).toBe(true);
            expect(result.hasActiveEngineSimulation).toBe(true);
        });

        test('should analyze pump system correctly', () => {
            const blueprint = createBlueprint([
                { id: 'pump', type: 'centrifugal_pump' },
                { id: 'tank', type: 'pressure_tank' },
                { id: 'pipe1', type: 'pipe' },
                { id: 'pipe2', type: 'pipe' },
                { id: 'pipe3', type: 'pipe' }
            ]);

            const result = ModelAnalyzer.analyze(blueprint);

            expect(result.category).toBe('hydraulic_circuit');
            expect(result.hasPump).toBe(true);
            expect(result.hasTank).toBe(true);
            expect(result.hasActiveEngineSimulation).toBe(false);
        });

        test('should include components array with classified types', () => {
            const blueprint = createBlueprint([
                { id: 'engine', type: 'v8_engine' },
                { id: 'pump', type: 'centrifugal_pump' }
            ]);

            const result = ModelAnalyzer.analyze(blueprint);

            expect(result.components).toContain('combustion_engine');
            expect(result.components).toContain('pump');
        });

        test('should generate appropriate description', () => {
            const blueprint = createBlueprint([
                { id: 'engine', type: 'v8_engine' }
            ]);

            const result = ModelAnalyzer.analyze(blueprint);

            expect(result.description).toContain('Internal combustion engine system');
        });
    });

    describe('determineComplexity', () => {
        test('should return simple for few components in complex categories', () => {
            expect(ModelAnalyzer.determineComplexity(3, 'vehicle_dynamics')).toBe('simple');
        });

        test('should return medium for moderate components in complex categories', () => {
            expect(ModelAnalyzer.determineComplexity(7, 'vehicle_dynamics')).toBe('medium');
        });

        test('should return complex for many components in complex categories', () => {
            expect(ModelAnalyzer.determineComplexity(12, 'vehicle_dynamics')).toBe('complex');
        });

        test('should use different thresholds for simple categories', () => {
            expect(ModelAnalyzer.determineComplexity(5, 'general')).toBe('simple');
            expect(ModelAnalyzer.determineComplexity(8, 'general')).toBe('medium');
        });
    });

    describe('determinePrimaryDomain', () => {
        test('should return correct domain for each category', () => {
            expect(ModelAnalyzer.determinePrimaryDomain('engine_system')).toBe('mechanical + thermal');
            expect(ModelAnalyzer.determinePrimaryDomain('pump_system')).toBe('fluid');
            expect(ModelAnalyzer.determinePrimaryDomain('hydraulic_circuit')).toBe('fluid');
            expect(ModelAnalyzer.determinePrimaryDomain('vehicle_dynamics')).toBe('mechanical + thermal');
            expect(ModelAnalyzer.determinePrimaryDomain('power_plant')).toBe('thermal + mechanical');
            expect(ModelAnalyzer.determinePrimaryDomain('hvac_system')).toBe('thermal + fluid');
            expect(ModelAnalyzer.determinePrimaryDomain('thermal_network')).toBe('thermal');
            expect(ModelAnalyzer.determinePrimaryDomain('process_system')).toBe('thermal + fluid');
            expect(ModelAnalyzer.determinePrimaryDomain('general')).toBe('multi-physics');
        });
    });
});

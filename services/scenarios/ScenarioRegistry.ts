/**
 * Scenario Registry
 * Contains all available tutorials, challenges, and experiments.
 */

import { Scenario } from './types';

export const SCENARIO_REGISTRY: Scenario[] = [
    // ========================================
    // TUTORIALS
    // ========================================
    {
        id: 'tutorial-pump-sizing',
        title: 'Tutorial: Pump Sizing Basics',
        description: 'Learn how to size a centrifugal pump for a simple water loop.',
        category: 'tutorial',
        difficulty: 'beginner',
        thumbnail: 'droplet',
        tags: ['hydraulics', 'pump', 'beginner'],
        initialBlueprint: {
            id: 'tutorial-1-start',
            project_name: 'Pump Sizing Tutorial',
            updated_at: new Date().toISOString(),
            components: [
                { id: 'Tank', name: 'Reservoir', componentDefinitionId: 'mechanical.tank.atmospheric', position: { x: 200, y: 400 }, parameterValues: { level: 3 } },
                { id: 'Pump', name: 'Undersized Pump', componentDefinitionId: 'mechanical.pump.centrifugal', position: { x: 400, y: 300 }, parameterValues: { design_flow: 10, design_head: 5 } },
                { id: 'Pipe', name: 'Discharge Pipe', componentDefinitionId: 'mechanical.pipe.standard', position: { x: 600, y: 300 }, parameterValues: { length: 50, diameter: 80 } }
            ],
            flows: [
                { id: 'f1', source: 'Tank', target: 'Pump', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
                { id: 'f2', source: 'Pump', target: 'Pipe', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' }
            ]
        },
        objectives: [
            {
                id: 'obj-flow',
                description: 'Achieve a flow rate of at least 50 L/min',
                variable: 'Pump_flow_lpm',
                type: 'greater_than',
                target: 50,
                points: 50
            },
            {
                id: 'obj-head',
                description: 'Maintain system head above 15m',
                variable: 'Pump_head_m',
                type: 'greater_than',
                target: 15,
                points: 50
            }
        ],
        hints: [
            { level: 0, text: 'The pump seems too small for the system requirements.', penaltyPercent: 0 },
            { level: 1, text: 'Try increasing the design flow rate parameter.', penaltyPercent: 5 },
            { level: 2, text: 'Set design_flow to 60 and design_head to 25.', penaltyPercent: 15 }
        ]
    },

    // ========================================
    // CHALLENGES
    // ========================================
    {
        id: 'challenge-overheating-v8',
        title: 'Challenge: The Overheating V8',
        description: 'A V8 engine is overheating under load. Fix the cooling system without exceeding the $500 budget.',
        category: 'challenge',
        difficulty: 'intermediate',
        thumbnail: 'flame',
        tags: ['thermal', 'engine', 'cooling'],
        timeLimitSeconds: 300, // 5 minutes
        initialBlueprint: {
            id: 'challenge-1-start',
            project_name: 'Overheating V8 Challenge',
            updated_at: new Date().toISOString(),
            components: [
                {
                    id: 'V8_Engine',
                    name: 'V8 Engine (Hot!)',
                    componentDefinitionId: 'mechanical.engine.parametric',
                    position: { x: 100, y: 300 },
                    parameterValues: {
                        cylinders: 8, bore_mm: 86, stroke_mm: 86,
                        compression_ratio: 10.0, aspiration: 'turbocharged',
                        boost_pressure_bar: 1.5, redline_rpm: 7000
                    }
                },
                {
                    id: 'Small_Radiator',
                    name: 'Undersized Radiator',
                    componentDefinitionId: 'mechanical.heatexchanger.radiator',
                    position: { x: 400, y: 300 },
                    parameterValues: { area: 0.3, htc: 50 } // Too small!
                },
                {
                    id: 'Coolant_Pump',
                    name: 'Coolant Pump',
                    componentDefinitionId: 'mechanical.pump.centrifugal',
                    position: { x: 250, y: 450 },
                    parameterValues: { design_flow: 15, design_head: 10 } // Undersized
                }
            ],
            flows: [
                { id: 'c1', source: 'V8_Engine', target: 'Small_Radiator', sourceHandle: 'coolant_out', targetHandle: 'inlet', type: 'fluid' },
                { id: 'c2', source: 'Small_Radiator', target: 'Coolant_Pump', sourceHandle: 'outlet', targetHandle: 'inlet', type: 'fluid' },
                { id: 'c3', source: 'Coolant_Pump', target: 'V8_Engine', sourceHandle: 'outlet', targetHandle: 'coolant_in', type: 'fluid' }
            ]
        },
        objectives: [
            {
                id: 'obj_1',
                type: 'less_than',
                description: 'Keep engine temperature below 95°C for 30 seconds',
                target: 95,
                // Solver now produces [ID]_temperature and [ID]_power_kw
                variable: 'V8_Engine_temperature',
                maintainDurationSeconds: 30,
                points: 100
            },
            {
                id: 'obj_2',
                type: 'greater_than',
                description: 'Maintain power output above 200 kW',
                target: 200,
                variable: 'V8_Engine_power_kw',
                maintainDurationSeconds: 10,
                // Service logic handles accumulation if maintains.
                points: 100
            },
            {
                id: 'obj-budget',
                description: 'Stay under $500 budget',
                variable: 'system_cost_usd',
                type: 'less_than',
                target: 500,
                points: 100
            }
        ],
        hints: [
            { level: 0, text: 'The radiator frontal area seems insufficient for this heat load.', penaltyPercent: 0 },
            { level: 1, text: 'Consider both the radiator size AND the coolant flow rate.', penaltyPercent: 5 },
            { level: 2, text: 'Increase radiator area to 0.6m² and pump flow to 25 L/min.', penaltyPercent: 10 }
        ]
    },

    // ========================================
    // EXPERIMENTS
    // ========================================
    {
        id: 'experiment-turbo-vs-na',
        title: 'Experiment: Turbo vs NA',
        description: 'Compare the performance characteristics of turbocharged vs naturally aspirated engines.',
        category: 'experiment',
        difficulty: 'beginner',
        thumbnail: 'zap',
        tags: ['engine', 'comparison', 'turbo'],
        initialBlueprint: {
            id: 'experiment-1',
            project_name: 'Turbo vs NA Experiment',
            updated_at: new Date().toISOString(),
            components: [
                {
                    id: 'NA_Engine',
                    name: 'NA 2.0L Engine',
                    componentDefinitionId: 'mechanical.engine.parametric',
                    position: { x: 100, y: 200 },
                    parameterValues: { cylinders: 4, bore_mm: 86, stroke_mm: 86, aspiration: 'na' }
                },
                {
                    id: 'Turbo_Engine',
                    name: 'Turbo 2.0L Engine',
                    componentDefinitionId: 'mechanical.engine.parametric',
                    position: { x: 100, y: 400 },
                    parameterValues: { cylinders: 4, bore_mm: 86, stroke_mm: 86, aspiration: 'turbo', boost_pressure_bar: 1.0 }
                }
            ],
            flows: []
        },
        objectives: [
            {
                id: 'obj-observe',
                description: 'Run simulation and observe the difference in peak power',
                variable: 'simulation_completed',
                type: 'equals',
                target: 1,
                points: 100
            }
        ],
        hints: []
    }
];

/**
 * Get all scenarios, optionally filtered.
 */
export function getScenarios(filter?: { category?: string; difficulty?: string }): Scenario[] {
    let result = [...SCENARIO_REGISTRY];

    if (filter?.category) {
        result = result.filter(s => s.category === filter.category);
    }
    if (filter?.difficulty) {
        result = result.filter(s => s.difficulty === filter.difficulty);
    }

    return result;
}

/**
 * Get a single scenario by ID.
 */
export function getScenarioById(id: string): Scenario | undefined {
    return SCENARIO_REGISTRY.find(s => s.id === id);
}

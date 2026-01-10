/**
 * Mission Registry
 * Contains advanced scenarios with timeline events, constraints, and scoring.
 */

import { MissionScenario } from './types';

export const MISSION_REGISTRY: MissionScenario[] = [
    // ========================================
    // MISSIONS - Heat Exchanger Sizing Tutorial
    // ========================================
    {
        id: 'mission-heat-exchanger',
        title: 'Mission: Heat Exchanger Sizing',
        description: 'Design a heat exchanger for a pharmaceutical cooling application with precise temperature control requirements.',
        category: 'tutorial',
        difficulty: 'intermediate',
        thumbnail: 'thermometer',
        tags: ['thermal', 'heat-exchanger', 'sizing', 'precision'],
        initialBlueprint: {
            id: 'mission-hx-start',
            name: 'Heat Exchanger Sizing Mission',
            description: '',
            domain: 'mechanical' as any,
            version: '1.0.0',
            simulations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'SAF Lab',
            tags: [],
            components: [
                {
                    id: 'Hot_Fluid_Source',
                    name: 'Hot Process Stream',
                    componentDefinitionId: 'mechanical.tank.pressurized',
                    position: { x: 100, y: 150 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { level: 2, temperature: 120, pressure: 2 }
                },
                {
                    id: 'Cold_Fluid_Source',
                    name: 'Cooling Water Supply',
                    componentDefinitionId: 'mechanical.tank.pressurized',
                    position: { x: 100, y: 450 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { level: 3, temperature: 20, pressure: 3 }
                },
                {
                    id: 'HX_Unit',
                    name: 'Heat Exchanger',
                    componentDefinitionId: 'mechanical.heatexchanger.shell-tube',
                    position: { x: 400, y: 300 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { area: 5, htc: 200, effectiveness: 0.7 }
                },
                {
                    id: 'Outlet_Heater',
                    name: 'Process Outlet',
                    componentDefinitionId: 'mechanical.tank.pressurized',
                    position: { x: 700, y: 150 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { level: 1, temperature: 25, pressure: 1 }
                },
                {
                    id: 'Outlet_Cooler',
                    name: 'Water Outlet',
                    componentDefinitionId: 'mechanical.tank.pressurized',
                    position: { x: 700, y: 450 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { level: 1, temperature: 25, pressure: 1 }
                }
            ],
            connections: [
                { id: 'c1', sourceComponentId: 'Hot_Fluid_Source', targetComponentId: 'HX_Unit', sourcePortId: 'outlet', targetPortId: 'hot_inlet', type: 'fluid', isSelected: false },
                { id: 'c2', sourceComponentId: 'HX_Unit', targetComponentId: 'Outlet_Heater', sourcePortId: 'hot_outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false },
                { id: 'c3', sourceComponentId: 'Cold_Fluid_Source', targetComponentId: 'HX_Unit', sourcePortId: 'outlet', targetPortId: 'cold_inlet', type: 'fluid', isSelected: false },
                { id: 'c4', sourceComponentId: 'HX_Unit', targetComponentId: 'Outlet_Cooler', sourcePortId: 'cold_outlet', targetPortId: 'inlet', type: 'fluid', isSelected: false }
            ]
        },
        objectives: [
            {
                id: 'obj-1',
                description: 'Reduce hot fluid temperature to 30°C or below',
                variable: 'Outlet_Heater_temperature',
                type: 'less_than',
                target: 30,
                points: 100
            },
            {
                id: 'obj-2',
                description: 'Keep cold fluid outlet below 50°C',
                variable: 'Outlet_Cooler_temperature',
                type: 'less_than',
                target: 50,
                points: 100
            },
            {
                id: 'obj-3',
                description: 'Maintain flow rate above 500 L/h',
                variable: 'HX_Unit_hot_flow_lph',
                type: 'greater_than',
                target: 500,
                points: 100
            }
        ],
        hints: [
            { level: 0, text: 'The heat exchanger surface area directly impacts heat transfer capacity.', penaltyPercent: 0 },
            { level: 1, text: 'Consider increasing the heat transfer coefficient (HTC) by using a different material.', penaltyPercent: 5 },
            { level: 2, text: 'Try area=15, htc=400 for effective cooling.', penaltyPercent: 10 }
        ],
        timeLimitSeconds: 600,
        events: [
            {
                id: 'event-1',
                type: 'step',
                name: 'Load Increase',
                description: 'Hot fluid flow rate increases',
                triggerTime: 15,
                targetComponentId: 'Hot_Fluid_Source',
                targetParameter: 'level',
                value: 3.5,
                color: '#22c55e',
                icon: 'Target'
            },
            {
                id: 'event-2',
                type: 'ramp',
                name: 'Temperature Ramp',
                description: 'Inlet temperature gradually increases',
                triggerTime: 30,
                targetComponentId: 'Hot_Fluid_Source',
                targetParameter: 'temperature',
                value: 150,
                duration: 10,
                color: '#3b82f6',
                icon: 'Zap'
            }
        ],
        constraints: [
            {
                id: 'const-1',
                type: 'cost',
                name: 'Budget Limit',
                operator: 'less_than',
                value: 5000,
                unit: 'USD',
                penalty: 200
            },
            {
                id: 'const-2',
                type: 'efficiency',
                name: 'Minimum Effectiveness',
                operator: 'greater_than',
                value: 0.65,
                unit: '',
                penalty: 100
            }
        ],
        scoring: {
            timeBonus: 5,
            efficiencyBonus: 30,
            budgetBonus: 20,
            perfectScore: 500
        },
        grades: {
            platinum: 95,
            gold: 85,
            silver: 70,
            bronze: 50
        },
        narrative: 'A pharmaceutical company needs to cool a sensitive process fluid from 120°C to below 30°C. Your task is to properly size the heat exchanger to handle varying operating conditions while staying within budget constraints.',
        context: {
            industry: 'Pharmaceutical Manufacturing',
            application: 'Process Cooling',
            difficultyFactors: ['Variable inlet temperature', 'Budget constraints', 'Precision temperature requirements']
        }
    },

    // ========================================
    // MISSIONS - Hybrid Powertrain Challenge
    // ========================================
    {
        id: 'mission-hybrid-powertrain',
        title: 'Mission: Hybrid Powertrain Optimization',
        description: 'Design an optimized hybrid powertrain for a delivery vehicle with complex duty cycle requirements.',
        category: 'challenge',
        difficulty: 'advanced',
        thumbnail: 'zap',
        tags: ['powertrain', 'hybrid', 'optimization', 'efficiency'],
        initialBlueprint: {
            id: 'mission-hybrid-start',
            name: 'Hybrid Powertrain Mission',
            description: '',
            domain: 'mechanical' as any,
            version: '1.0.0',
            simulations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'SAF Lab',
            tags: [],
            components: [
                {
                    id: 'Engine',
                    name: 'ICE Engine',
                    componentDefinitionId: 'mechanical.engine.parametric',
                    position: { x: 150, y: 200 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { cylinders: 4, bore_mm: 85, stroke_mm: 90, aspiration: 'na', compression_ratio: 10.5, redline_rpm: 6000 }
                },
                {
                    id: 'Motor_Generator',
                    name: 'Electric Motor/Generator',
                    componentDefinitionId: 'mechanical.motor.electric',
                    position: { x: 150, y: 400 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { power_kw: 30, efficiency: 0.92, max_rpm: 8000 }
                },
                {
                    id: 'Battery',
                    name: 'Battery Pack',
                    componentDefinitionId: 'mechanical.battery.lithium-ion',
                    position: { x: 400, y: 300 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { capacity_kwh: 10, soc_percent: 80, charge_rate_kw: 7 }
                },
                {
                    id: 'Transmission',
                    name: 'CVT Transmission',
                    componentDefinitionId: 'mechanical.transmission.cvt',
                    position: { x: 650, y: 300 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { min_ratio: 0.5, max_ratio: 2.5, efficiency: 0.88 }
                },
                {
                    id: 'Final_Drive',
                    name: 'Final Drive',
                    componentDefinitionId: 'mechanical.gearbox.single',
                    position: { x: 850, y: 300 },
                    rotation: 0,
                    isSelected: false,
                    groupIds: [],
                    parameterValues: { ratio: 4.1, efficiency: 0.95 }
                }
            ],
            connections: [
                { id: 'c1', sourceComponentId: 'Engine', targetComponentId: 'Transmission', sourcePortId: 'output', targetPortId: 'input', type: 'mechanical', isSelected: false },
                { id: 'c2', sourceComponentId: 'Motor_Generator', targetComponentId: 'Transmission', sourcePortId: 'output', targetPortId: 'motor_input', type: 'mechanical', isSelected: false },
                { id: 'c3', sourceComponentId: 'Battery', targetComponentId: 'Motor_Generator', sourcePortId: 'output', targetPortId: 'electrical_in', type: 'electrical', isSelected: false },
                { id: 'c4', sourceComponentId: 'Transmission', targetComponentId: 'Final_Drive', sourcePortId: 'output', targetPortId: 'input', type: 'mechanical', isSelected: false }
            ]
        },
        objectives: [
            {
                id: 'obj-1',
                description: 'Achieve 0-100 km/h acceleration in under 12 seconds',
                variable: 'Vehicle_0_to_100_time',
                type: 'less_than',
                target: 12,
                points: 150
            },
            {
                id: 'obj-2',
                description: 'Maintain battery state of charge above 20% at end of cycle',
                variable: 'Battery_soc_percent_end',
                type: 'greater_than',
                target: 20,
                points: 150
            },
            {
                id: 'obj-3',
                description: 'Achieve average fuel consumption under 4.5 L/100km',
                variable: 'Vehicle_fuel_economy_lph',
                type: 'less_than',
                target: 4.5,
                points: 150
            },
            {
                id: 'obj-4',
                description: 'Keep combined system efficiency above 75%',
                variable: 'System_efficiency_percent',
                type: 'greater_than',
                target: 75,
                points: 100
            }
        ],
        hints: [
            { level: 0, text: 'The electric motor power should complement the engine\'s power band.', penaltyPercent: 0 },
            { level: 1, text: 'Consider battery capacity for regenerative braking capture.', penaltyPercent: 5 },
            { level: 2, text: 'Try: Motor 50kW, Battery 15kWh, Transmission efficiency 0.92.', penaltyPercent: 15 }
        ],
        timeLimitSeconds: 900,
        events: [
            {
                id: 'event-start',
                type: 'step',
                name: 'Urban Cycle Start',
                description: 'Vehicle begins urban driving cycle',
                triggerTime: 0,
                targetComponentId: 'Vehicle_Control',
                targetParameter: 'load_percent',
                value: 15,
                color: '#22c55e',
                icon: 'Play'
            },
            {
                id: 'event-accel',
                type: 'step',
                name: 'Hard Acceleration',
                description: 'Full throttle acceleration event',
                triggerTime: 20,
                targetComponentId: 'Vehicle_Control',
                targetParameter: 'load_percent',
                value: 100,
                color: '#f59e0b',
                icon: 'Zap'
            },
            {
                id: 'event-climb',
                type: 'ramp',
                name: 'Hill Climb',
                description: 'Grade increase for hill climbing',
                triggerTime: 40,
                targetComponentId: 'Terrain',
                targetParameter: 'grade_percent',
                value: 12,
                duration: 5,
                color: '#3b82f6',
                icon: 'Zap'
            },
            {
                id: 'event-regen',
                type: 'periodic',
                name: 'Braking Zones',
                description: 'Recurring braking for regen',
                triggerTime: 60,
                targetComponentId: 'Vehicle_Control',
                targetParameter: 'regen_level',
                value: 0.8,
                period: 30,
                maxRepeats: 10,
                color: '#8b5cf6',
                icon: 'Clock'
            },
            {
                id: 'event-highway',
                type: 'conditional',
                name: 'Highway Entry',
                description: 'Trigger when speed exceeds 80 km/h',
                triggerTime: 120,
                targetComponentId: 'Vehicle_Control',
                targetParameter: 'cruise_control',
                condition: 'speed_kmh > 80',
                value: 100,
                color: '#ef4444',
                icon: 'Settings'
            }
        ],
        constraints: [
            {
                id: 'const-cost',
                type: 'cost',
                name: 'System Cost Limit',
                operator: 'less_than',
                value: 25000,
                unit: 'USD',
                penalty: 300
            },
            {
                id: 'const-weight',
                type: 'weight',
                name: 'Maximum Weight',
                operator: 'less_than',
                value: 1800,
                unit: 'kg',
                penalty: 150
            },
            {
                id: 'const-power',
                type: 'power',
                name: 'Peak Power Limit',
                operator: 'less_than',
                value: 150,
                unit: 'kW',
                penalty: 100
            },
            {
                id: 'const-emissions',
                type: 'emissions',
                name: 'CO2 Emissions Cap',
                operator: 'less_than',
                value: 100,
                unit: 'g/km',
                penalty: 200
            }
        ],
        scoring: {
            timeBonus: 2,
            efficiencyBonus: 50,
            budgetBonus: 40,
            perfectScore: 1000
        },
        grades: {
            platinum: 95,
            gold: 85,
            silver: 70,
            bronze: 55
        },
        narrative: 'A urban delivery company needs a hybrid powertrain that can handle diverse duty cycles - from low-speed urban delivery routes to highway segments. Your design must balance performance, efficiency, and cost while meeting strict emissions standards.',
        context: {
            industry: 'Commercial Vehicles',
            application: 'Urban Delivery Fleet',
            difficultyFactors: ['Complex duty cycle', 'Multiple optimization objectives', 'Real-world driving conditions', 'Budget and regulatory constraints']
        }
    }
];

/**
 * Get all missions, optionally filtered.
 */
export function getMissions(filter?: { difficulty?: string }): MissionScenario[] {
    let result = [...MISSION_REGISTRY];

    if (filter?.difficulty) {
        result = result.filter(m => m.difficulty === filter.difficulty);
    }

    return result;
}

/**
 * Get a mission by ID.
 */
export function getMissionById(id: string): MissionScenario | undefined {
    return MISSION_REGISTRY.find(m => m.id === id);
}

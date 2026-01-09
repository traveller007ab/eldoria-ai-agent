import type { MechComponentDefinition } from '../../types.ts';

export const mechanicalComponents: MechComponentDefinition[] = [
    {
        id: 'mechanical.gear.spur',
        version: '1.0.0',
        domain: 'mechanical',
        subcategory: 'powerTransmission',
        name: 'Spur Gear Pair',
        description: 'Standard involute spur gear pair for power transmission.',
        tags: ['gear', 'spur', 'transmission', 'involute'],
        references: ['AGMA 2001-D04', 'ISO 6336'],
        ports: [
            {
                id: 'shaft_in',
                name: 'Input Shaft',
                type: 'input',
                domain: 'mechanical',
                variables: [{ name: 'Torque', symbol: 'τ_in', unit: 'N·m' }, { name: 'Speed', symbol: 'ω_in', unit: 'rad/s' }],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'shaft_out',
                name: 'Output Shaft',
                type: 'output',
                domain: 'mechanical',
                variables: [{ name: 'Torque', symbol: 'τ_out', unit: 'N·m' }, { name: 'Speed', symbol: 'ω_out', unit: 'rad/s' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'module',
                name: 'Module',
                symbol: 'm',
                unit: 'mm',
                dataType: 'number',
                value: 3,
                source: 'design'
            },
            {
                id: 'z1',
                name: 'Pinion Teeth',
                symbol: 'z₁',
                unit: '-',
                dataType: 'number',
                value: 20,
                source: 'design'
            },
            {
                id: 'z2',
                name: 'Gear Teeth',
                symbol: 'z₂',
                unit: '-',
                dataType: 'number',
                value: 60,
                source: 'design'
            },
            {
                id: 'pressure_angle',
                name: 'Pressure Angle',
                symbol: 'α',
                unit: '°',
                dataType: 'number',
                value: 20,
                source: 'constant'
            },
            {
                id: 'efficiency',
                name: 'Mesh Efficiency',
                symbol: 'η_mesh',
                unit: '%',
                dataType: 'number',
                value: 98,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'gear_ratio',
                name: 'Gear Ratio',
                expression: 'i = z2 / z1',
                latex: 'i = \\frac{z_2}{z_1}',
                source: 'Kinematics',
                solutionMethod: 'analytic'
            },
            {
                id: 'torque_out',
                name: 'Output Torque',
                expression: 'τ_out = τ_in * i * η_mesh',
                latex: '\\tau_{out} = \\tau_{in} \\cdot i \\cdot \\eta_{mesh}',
                source: 'Power Transmission',
                solutionMethod: 'analytic'
            },
            {
                id: 'center_distance',
                name: 'Center Distance',
                expression: 'a = m * (z1 + z2) / 2',
                latex: 'a = \\frac{m(z_1 + z_2)}{2}',
                source: 'Geometry',
                solutionMethod: 'analytic'
            }
        ],
        physics: {
            domain: 'mechanical',
            stateVariables: [
                { name: 'speed', symbol: 'omega', unit: 'rad/s' },
                { name: 'torque', symbol: 'tau', unit: 'N·m' }
            ],
            equations: [
                { name: 'SpeedRatio', expression: 'omega_out = omega_in / (z2/z1)', variables: ['omega_in', 'omega_out', 'z1', 'z2'], type: 'constitutive' },
                { name: 'TorqueConservation', expression: 'tau_out * omega_out = tau_in * omega_in * efficiency', variables: ['tau_in', 'tau_out', 'omega_in', 'omega_out', 'efficiency'], type: 'conservation' }
            ],
            ports: {
                shaft_in: { domain: 'mechanical', variables: ['speed', 'torque'], direction: 'in' },
                shaft_out: { domain: 'mechanical', variables: ['speed', 'torque'], direction: 'out' }
            }
        }
    },
    {
        id: 'mechanical.bearing.ball',
        version: '1.0.0',
        domain: 'mechanical',
        subcategory: 'bearing',
        name: 'Deep Groove Ball Bearing',
        description: 'Standard deep groove ball bearing for radial and light axial loads.',
        tags: ['bearing', 'ball', 'radial', 'SKF'],
        references: ['ISO 281', 'SKF Catalog'],
        ports: [
            {
                id: 'shaft',
                name: 'Shaft Connection',
                type: 'bidirectional',
                domain: 'mechanical',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0.5, y: 0.5, side: 'left' }
            }
        ],
        parameters: [
            {
                id: 'bore',
                name: 'Bore Diameter',
                symbol: 'd',
                unit: 'mm',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'outer_diameter',
                name: 'Outer Diameter',
                symbol: 'D',
                unit: 'mm',
                dataType: 'number',
                value: 90,
                source: 'design'
            },
            {
                id: 'dynamic_load',
                name: 'Dynamic Load Rating',
                symbol: 'C',
                unit: 'kN',
                dataType: 'number',
                value: 35,
                source: 'lookup'
            },
            {
                id: 'static_load',
                name: 'Static Load Rating',
                symbol: 'C₀',
                unit: 'kN',
                dataType: 'number',
                value: 22,
                source: 'lookup'
            },
            {
                id: 'radial_load',
                name: 'Applied Radial Load',
                symbol: 'F_r',
                unit: 'kN',
                dataType: 'number',
                value: 5,
                source: 'design'
            },
            {
                id: 'speed',
                name: 'Rotational Speed',
                symbol: 'n',
                unit: 'rpm',
                dataType: 'number',
                value: 1500,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'life_eq',
                name: 'Basic Rating Life (L10)',
                expression: 'L10 = (C / P)^3 * 1000000 / (60 * n)',
                latex: 'L_{10} = \\frac{(C/P)^3 \\times 10^6}{60n}',
                source: 'ISO 281',
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'mechanical.spring.compression',
        version: '1.0.0',
        domain: 'mechanical',
        subcategory: 'spring',
        name: 'Compression Spring',
        description: 'Helical compression spring for energy storage and force application.',
        tags: ['spring', 'compression', 'helical'],
        references: ['SMI Handbook'],
        ports: [
            {
                id: 'end_a',
                name: 'End A',
                type: 'bidirectional',
                domain: 'mechanical',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'end_b',
                name: 'End B',
                type: 'bidirectional',
                domain: 'mechanical',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'wire_diameter',
                name: 'Wire Diameter',
                symbol: 'd',
                unit: 'mm',
                dataType: 'number',
                value: 3,
                source: 'design'
            },
            {
                id: 'mean_diameter',
                name: 'Mean Coil Diameter',
                symbol: 'D',
                unit: 'mm',
                dataType: 'number',
                value: 25,
                source: 'design'
            },
            {
                id: 'active_coils',
                name: 'Active Coils',
                symbol: 'n_a',
                unit: '-',
                dataType: 'number',
                value: 8,
                source: 'design'
            },
            {
                id: 'spring_rate',
                name: 'Spring Rate',
                symbol: 'k',
                unit: 'N/mm',
                dataType: 'number',
                value: 15,
                source: 'calculated'
            },
            {
                id: 'throttle',
                name: 'Throttle',
                symbol: 'TPS',
                unit: '%',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'free_length',
                name: 'Free Length',
                symbol: 'L₀',
                unit: 'mm',
                dataType: 'number',
                value: 50,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'spring_rate_eq',
                name: 'Spring Rate',
                expression: 'k = G * d^4 / (8 * D^3 * n_a)',
                latex: 'k = \\frac{G d^4}{8 D^3 n_a}',
                source: "Hooke's Law + Spring Geometry",
                solutionMethod: 'analytic'
            },
            {
                id: 'force_eq',
                name: 'Spring Force',
                expression: 'F = k * x',
                latex: 'F = k \\cdot x',
                source: "Hooke's Law",
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'mechanical.motor.electric',
        version: '1.0.0',
        domain: 'mechanical',
        subcategory: 'powerTransmission',
        name: 'Electric Motor',
        description: 'AC induction motor for driving mechanical loads.',
        tags: ['motor', 'electric', 'AC', 'induction'],
        references: ['IEC 60034'],
        ports: [
            {
                id: 'shaft_out',
                name: 'Output Shaft',
                type: 'output',
                domain: 'mechanical',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            },
            {
                id: 'electrical_in',
                name: 'Electrical Input',
                type: 'input',
                domain: 'electrical',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            }
        ],
        parameters: [
            {
                id: 'rated_power',
                name: 'Rated Power',
                symbol: 'P_rated',
                unit: 'kW',
                dataType: 'number',
                value: 15,
                source: 'design'
            },
            {
                id: 'rated_speed',
                name: 'Rated Speed',
                symbol: 'n_rated',
                unit: 'rpm',
                dataType: 'number',
                value: 1450,
                source: 'design'
            },
            {
                id: 'efficiency',
                name: 'Motor Efficiency',
                symbol: 'η_m',
                unit: '%',
                dataType: 'number',
                value: 92,
                source: 'design'
            },
            {
                id: 'power_factor',
                name: 'Power Factor',
                symbol: 'cos φ',
                unit: '-',
                dataType: 'number',
                value: 0.85,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'torque_eq',
                name: 'Rated Torque',
                expression: 'T = 9550 * P / n',
                latex: 'T = \\frac{9550 \\cdot P}{n}',
                source: 'Mechanical Power',
                solutionMethod: 'analytic'
            }
        ],
        physics: {
            domain: 'mechanical',
            stateVariables: [
                { name: 'speed', symbol: 'omega', unit: 'rad/s' },
                { name: 'torque', symbol: 'tau', unit: 'N·m' },
                { name: 'power', symbol: 'P', unit: 'W' }
            ],
            equations: [
                { name: 'PowerConversion', expression: 'P_mech = P_elec * efficiency', variables: ['P_mech', 'P_elec', 'efficiency'], type: 'constitutive' },
                { name: 'TorqueGeneration', expression: 'tau = P_mech / omega', variables: ['tau', 'P_mech', 'omega'], type: 'constitutive' }
            ],
            ports: {
                electrical_in: { domain: 'electrical', variables: ['voltage', 'current'], direction: 'in' },
                shaft_out: { domain: 'mechanical', variables: ['speed', 'torque'], direction: 'out' }
            }
        }
    },
    {
        id: 'mechanical.engine.ic',
        version: '1.0.0',
        domain: 'mechanical',
        subcategory: 'powerCycle',
        name: 'Internal Combustion Engine',
        description: 'Multi-cylinder internal combustion engine with torque map.',
        tags: ['engine', 'diesel', 'petrol', 'power', 'source'],
        references: ['SAE J1349'],
        ports: [
            {
                id: 'shaft_out',
                name: 'Crankshaft',
                type: 'output',
                domain: 'mechanical',
                variables: [{ name: 'Torque', symbol: 'τ_out', unit: 'N·m' }, { name: 'Speed', symbol: 'ω_out', unit: 'rad/s' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            },
            {
                id: 'thermal_out',
                name: 'Heat Rejection',
                type: 'output',
                domain: 'thermal',
                variables: [],
                state: 'disconnected',
                required: false,
                position: { x: 0.5, y: 0, side: 'top' }
            }
        ],
        parameters: [
            {
                id: 'displacement',
                name: 'Displacement',
                symbol: 'V_d',
                unit: 'L',
                dataType: 'number',
                value: 2.0,
                source: 'design'
            },
            {
                id: 'max_power',
                name: 'Max Power',
                symbol: 'P_max',
                unit: 'kW',
                dataType: 'number',
                value: 150,
                source: 'design'
            },
            {
                id: 'idle_speed',
                name: 'Idle Speed',
                symbol: 'N_idle',
                unit: 'rpm',
                dataType: 'number',
                value: 800,
                source: 'design'
            },
            {
                id: 'max_speed',
                name: 'Max Speed',
                symbol: 'N_redline',
                unit: 'rpm',
                dataType: 'number',
                value: 6500,
                source: 'design'
            },
            {
                id: 'throttle',
                name: 'Throttle Position',
                symbol: 'TPS',
                unit: '%',
                dataType: 'number',
                value: 50,
                source: 'design',
                designRange: { min: 0, max: 100 }
            }
        ],
        equations: [
            {
                id: 'power_curve',
                name: 'Engine Output',
                expression: 'P = f(N, TPS)',
                latex: 'P = \\mathcal{T}(N) \\cdot \\omega',
                source: 'Torque Map',
                solutionMethod: 'analytic'
            }
        ],
        physics: {
            domain: 'mechanical',
            stateVariables: [
                { name: 'speed', symbol: 'omega', unit: 'rad/s' },
                { name: 'torque', symbol: 'tau', unit: 'N·m' },
                { name: 'fuel_flow', symbol: 'mdot_f', unit: 'kg/s' }
            ],
            equations: [
                { name: 'IndicatedPower', expression: 'P_ind = V_d * N * MEP / 120', variables: ['P_ind', 'V_d', 'N', 'MEP'], type: 'constitutive' },
                { name: 'BrakeTorque', expression: 'tau = P_ind * mechanical_efficiency / omega', variables: ['tau', 'P_ind', 'omega'], type: 'constitutive' }
            ],
            ports: {
                shaft_out: { domain: 'mechanical', variables: ['speed', 'torque'], direction: 'out' },
                thermal_out: { domain: 'thermal', variables: ['temperature', 'heatRate'], direction: 'out' }
            }
        }
    }
];

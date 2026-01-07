import { MechComponentDefinition } from '../../types';

export const controlComponents: MechComponentDefinition[] = [
    {
        id: 'control.sensor.pressure',
        version: '1.0.0',
        domain: 'control',
        subcategory: 'sensor',
        name: 'Pressure Transmitter',
        description: 'Industrial pressure sensor with 4-20mA output.',
        tags: ['sensor', 'pressure', 'transmitter', '4-20mA'],
        references: ['ISA-S5.1'],
        ports: [
            {
                id: 'process_in',
                name: 'Process Connection',
                type: 'input',
                domain: 'fluid',
                variables: [{ name: 'Pressure', symbol: 'P', unit: 'bar' }],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'signal_out',
                name: 'Signal Output',
                type: 'output',
                domain: 'signal',
                variables: [{ name: 'Current', symbol: 'I', unit: 'mA' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'range_min',
                name: 'Range Minimum',
                symbol: 'P_min',
                unit: 'bar',
                dataType: 'number',
                value: 0,
                source: 'design'
            },
            {
                id: 'range_max',
                name: 'Range Maximum',
                symbol: 'P_max',
                unit: 'bar',
                dataType: 'number',
                value: 10,
                source: 'design'
            },
            {
                id: 'accuracy',
                name: 'Accuracy',
                symbol: 'ε',
                unit: '%FS',
                dataType: 'number',
                value: 0.1,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'signal_eq',
                name: 'Output Signal',
                expression: 'I = 4 + 16 * (P - P_min) / (P_max - P_min)',
                latex: 'I = 4 + 16 \\cdot \\frac{P - P_{min}}{P_{max} - P_{min}}',
                source: '4-20mA Standard',
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'control.sensor.temperature',
        version: '1.0.0',
        domain: 'control',
        subcategory: 'sensor',
        name: 'Temperature Transmitter',
        description: 'RTD/Thermocouple temperature sensor with analog output.',
        tags: ['sensor', 'temperature', 'RTD', 'thermocouple'],
        references: ['IEC 60751'],
        ports: [
            {
                id: 'process_in',
                name: 'Process Connection',
                type: 'input',
                domain: 'thermal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'signal_out',
                name: 'Signal Output',
                type: 'output',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'range_min',
                name: 'Range Minimum',
                symbol: 'T_min',
                unit: '°C',
                dataType: 'number',
                value: 0,
                source: 'design'
            },
            {
                id: 'range_max',
                name: 'Range Maximum',
                symbol: 'T_max',
                unit: '°C',
                dataType: 'number',
                value: 200,
                source: 'design'
            },
            {
                id: 'sensor_type',
                name: 'Sensor Type',
                symbol: 'type',
                unit: '-',
                dataType: 'string',
                value: 'PT100',
                source: 'design'
            }
        ],
        equations: []
    },
    {
        id: 'control.sensor.flow',
        version: '1.0.0',
        domain: 'control',
        subcategory: 'sensor',
        name: 'Flow Meter',
        description: 'Electromagnetic or vortex flow meter.',
        tags: ['sensor', 'flow', 'meter', 'electromagnetic'],
        references: [],
        ports: [
            {
                id: 'flow_in',
                name: 'Flow Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'flow_out',
                name: 'Flow Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            },
            {
                id: 'signal_out',
                name: 'Signal Output',
                type: 'output',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0.5, y: 0, side: 'top' }
            }
        ],
        parameters: [
            {
                id: 'nominal_diameter',
                name: 'Nominal Diameter',
                symbol: 'DN',
                unit: 'mm',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'max_flow',
                name: 'Max Flow Rate',
                symbol: 'Q_max',
                unit: 'm³/h',
                dataType: 'number',
                value: 200,
                source: 'design'
            }
        ],
        equations: []
    },
    {
        id: 'control.controller.pid',
        version: '1.0.0',
        domain: 'control',
        subcategory: 'controller',
        name: 'PID Controller',
        description: 'Proportional-Integral-Derivative controller for process control.',
        tags: ['controller', 'PID', 'feedback', 'loop'],
        references: ['ISA-S5.1'],
        ports: [
            {
                id: 'pv_in',
                name: 'Process Variable (PV)',
                type: 'input',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.3, side: 'left' }
            },
            {
                id: 'sp_in',
                name: 'Setpoint (SP)',
                type: 'input',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.7, side: 'left' }
            },
            {
                id: 'cv_out',
                name: 'Control Variable (CV)',
                type: 'output',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'kp',
                name: 'Proportional Gain',
                symbol: 'Kp',
                unit: '-',
                dataType: 'number',
                value: 1.0,
                source: 'design'
            },
            {
                id: 'ti',
                name: 'Integral Time',
                symbol: 'Ti',
                unit: 's',
                dataType: 'number',
                value: 10,
                source: 'design'
            },
            {
                id: 'td',
                name: 'Derivative Time',
                symbol: 'Td',
                unit: 's',
                dataType: 'number',
                value: 0,
                source: 'design'
            },
            {
                id: 'output_min',
                name: 'Output Minimum',
                symbol: 'CV_min',
                unit: '%',
                dataType: 'number',
                value: 0,
                source: 'design'
            },
            {
                id: 'output_max',
                name: 'Output Maximum',
                symbol: 'CV_max',
                unit: '%',
                dataType: 'number',
                value: 100,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'pid_eq',
                name: 'PID Algorithm',
                expression: 'CV = Kp * (e + (1/Ti) * ∫e·dt + Td * de/dt)',
                latex: 'CV = K_p \\left( e + \\frac{1}{T_i} \\int e \\, dt + T_d \\frac{de}{dt} \\right)',
                source: 'Classical PID',
                solutionMethod: 'numerical'
            }
        ]
    },
    {
        id: 'control.actuator.valve',
        version: '1.0.0',
        domain: 'control',
        subcategory: 'actuator',
        name: 'Control Valve',
        description: 'Pneumatic or electric actuated control valve.',
        tags: ['actuator', 'valve', 'control', 'modulating'],
        references: ['IEC 60534'],
        ports: [
            {
                id: 'signal_in',
                name: 'Control Signal',
                type: 'input',
                domain: 'signal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0.5, y: 0, side: 'top' }
            },
            {
                id: 'flow_in',
                name: 'Flow Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'flow_out',
                name: 'Flow Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'cv_rated',
                name: 'Rated Cv',
                symbol: 'Cv',
                unit: 'gpm/psi^0.5',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'characteristic',
                name: 'Flow Characteristic',
                symbol: 'char',
                unit: '-',
                dataType: 'string',
                value: 'equal_percentage',
                source: 'design'
            },
            {
                id: 'rangeability',
                name: 'Rangeability',
                symbol: 'R',
                unit: ':1',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'fail_position',
                name: 'Fail Position',
                symbol: '-',
                unit: '-',
                dataType: 'string',
                value: 'closed',
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'cv_effective',
                name: 'Effective Cv',
                expression: 'Cv_eff = Cv * f(x, characteristic)',
                latex: 'C_{v,eff} = C_v \\cdot f(x)',
                source: 'Valve Characteristics',
                solutionMethod: 'lookup'
            }
        ]
    }
];

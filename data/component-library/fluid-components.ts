import { MechComponentDefinition } from '../../types';

export const fluidComponents: MechComponentDefinition[] = [
    {
        id: 'fluid.pump.centrifugal',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'turbomachinery',
        name: 'Centrifugal Pump',
        description: 'Standard centrifugal pump for liquid transport.',
        tags: ['pump', 'liquid', 'pressure'],
        references: ['ISO 13709'],
        ports: [
            {
                id: 'inlet',
                name: 'Suction',
                type: 'input',
                domain: 'fluid',
                variables: [{ name: 'Pressure', symbol: 'P_in', unit: 'Pa' }, { name: 'Flow', symbol: 'Q_in', unit: 'm3/s' }],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'outlet',
                name: 'Discharge',
                type: 'output',
                domain: 'fluid',
                variables: [{ name: 'Pressure', symbol: 'P_out', unit: 'Pa' }, { name: 'Flow', symbol: 'Q_out', unit: 'm3/s' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'design_flow',
                name: 'Design Flow Rate',
                symbol: 'Q_des',
                unit: 'm³/h',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'design_head',
                name: 'Design Head',
                symbol: 'H_des',
                unit: 'm',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'efficiency',
                name: 'Efficiency (BEP)',
                symbol: 'η',
                unit: '%',
                dataType: 'number',
                value: 75,
                source: 'design'
            },
            {
                id: 'speed',
                name: 'Rotational Speed',
                symbol: 'N',
                unit: 'rpm',
                dataType: 'number',
                value: 1450,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'power_eq',
                name: 'Hydraulic Power',
                expression: 'P = rho * g * Q * H / eta',
                latex: 'P = \\frac{\\rho g Q H}{\\eta}',
                source: 'Basic Fluid Mechanics',
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'fluid.pipe.std',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'piping',
        name: 'Standard Pipe',
        description: 'Circular pipe with friction losses (Darcy-Weisbach).',
        tags: ['pipe', 'conduit', 'friction'],
        references: ['Moody Chart'],
        ports: [
            {
                id: 'in',
                name: 'Inlet',
                type: 'bidirectional',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'out',
                name: 'Outlet',
                type: 'bidirectional',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.5, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'length',
                name: 'Length',
                symbol: 'L',
                unit: 'm',
                dataType: 'number',
                value: 10,
                source: 'design'
            },
            {
                id: 'diameter',
                name: 'Inner Diameter',
                symbol: 'D',
                unit: 'mm',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'roughness',
                name: 'Roughness',
                symbol: 'ε',
                unit: 'mm',
                dataType: 'number',
                value: 0.045,
                source: 'constant'
            }
        ],
        equations: [
            {
                id: 'head_loss_eq',
                name: 'Darcy-Weisbach Head Loss',
                expression: 'h_f = f * (L / D) * (v^2 / (2 * g))',
                latex: 'h_f = f \\frac{L}{D} \\frac{v^2}{2g}',
                source: 'Darcy-Weisbach Equation',
                solutionMethod: 'iterative'
            }
        ]
    },
    {
        id: 'fluid.valve.globe',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'piping',
        name: 'Globe Valve',
        description: 'Flow control valve with adjustable opening.',
        tags: ['valve', 'control', 'throttle'],
        references: [],
        ports: [
            {
                id: 'in',
                name: 'Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'out',
                name: 'Outlet',
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
                id: 'cv',
                name: 'Flow Coefficient',
                symbol: 'Cv',
                unit: 'gpm/psi^0.5',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'opening',
                name: 'Valve Opening',
                symbol: 'x',
                unit: '%',
                dataType: 'number',
                value: 100,
                source: 'design',
                designRange: { min: 0, max: 100 }
            }
        ],
        equations: []
    },
    {
        id: 'fluid.tank.reservoir',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'piping',
        name: 'Reservoir / Tank',
        description: 'Open or closed tank with specified head/pressure.',
        tags: ['tank', 'reservoir', 'source', 'sink'],
        references: [],
        ports: [
            {
                id: 'outlet',
                name: 'Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0.5, y: 1, side: 'bottom' }
            }
        ],
        parameters: [
            {
                id: 'head',
                name: 'Total Head',
                symbol: 'H',
                unit: 'm',
                dataType: 'number',
                value: 10,
                source: 'design'
            }
        ],
        equations: []
    },
    {
        id: 'fluid.compressor.centrifugal',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'turbomachinery',
        name: 'Centrifugal Compressor',
        description: 'Gas compressor for pressure boosting.',
        tags: ['compressor', 'gas', 'pressure'],
        references: [],
        ports: [
            { id: 'inlet', name: 'Suction', type: 'input', domain: 'fluid', required: true, position: { x: 0, y: 0.5, side: 'left' } },
            { id: 'outlet', name: 'Discharge', type: 'output', domain: 'fluid', required: true, position: { x: 1, y: 0.5, side: 'right' } }
        ],
        parameters: [
            { id: 'ratio', name: 'Pressure Ratio', symbol: 'Rc', unit: '-', dataType: 'number', value: 3.0, source: 'design' },
            { id: 'efficiency', name: 'Isentropic Eff.', symbol: 'η', unit: '%', dataType: 'number', value: 80, source: 'design' },
            { id: 'design_flow', name: 'Design Flow', symbol: 'Q', unit: 'm³/h', dataType: 'number', value: 500, source: 'design' }
        ],
        equations: [
            { id: 'temp_rise', name: 'Temperature Rise', expression: 'T_out = T_in * (1 + (Rc^((k-1)/k) - 1)/eta)', source: 'Thermodynamics', solutionMethod: 'analytic' }
        ]
    },
    {
        id: 'fluid.turbine.steam',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'turbomachinery',
        name: 'Steam Turbine',
        description: 'Extracts work from expanding gas/steam.',
        tags: ['turbine', 'power', 'steam'],
        references: [],
        ports: [
            { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', required: true, position: { x: 0, y: 0.5, side: 'left' } },
            { id: 'outlet', name: 'Exhaust', type: 'output', domain: 'fluid', required: true, position: { x: 1, y: 0.5, side: 'right' } }
        ],
        parameters: [
            { id: 'expansion_ratio', name: 'Expansion Ratio', symbol: 'Er', unit: '-', dataType: 'number', value: 20, source: 'design' },
            { id: 'efficiency', name: 'Isentropic Eff.', symbol: 'η', unit: '%', dataType: 'number', value: 85, source: 'design' },
            { id: 'power_rating', name: 'Rated Power', symbol: 'P_rated', unit: 'kW', dataType: 'number', value: 5000, source: 'design' }
        ],
        equations: []
    }
];

import { ComponentDefinition } from '../../types/mech-saf-2.0';

export const fluidComponents: ComponentDefinition[] = [
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
                unit: 'm3/h',
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
                symbol: 'eta',
                unit: '%',
                dataType: 'number',
                value: 75,
                source: 'design'
            }
        ],
        equations: []
    },
    {
        id: 'fluid.pipe.std',
        version: '1.0.0',
        domain: 'fluid',
        subcategory: 'piping',
        name: 'Standard Pipe',
        description: 'Circular pipe with friction losses.',
        tags: ['pipe', 'conduit'],
        references: [],
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
                name: 'Diameter',
                symbol: 'D',
                unit: 'mm',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'roughness',
                name: 'Roughness',
                symbol: 'e',
                unit: 'mm',
                dataType: 'number',
                value: 0.045,
                source: 'constant'
            }
        ],
        equations: []
    }
];

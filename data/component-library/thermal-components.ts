import { MechComponentDefinition } from '../../types';

export const thermalComponents: MechComponentDefinition[] = [
    {
        id: 'thermal.hx.shell_tube',
        version: '1.0.0',
        domain: 'thermal',
        subcategory: 'heatExchanger',
        name: 'Shell & Tube HX',
        description: 'Shell and tube heat exchanger for liquid-liquid heat transfer.',
        tags: ['heat exchanger', 'shell tube', 'TEMA'],
        references: ['TEMA Standards'],
        ports: [
            {
                id: 'shell_in',
                name: 'Shell Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [{ name: 'Temperature', symbol: 'T_s_in', unit: '°C' }],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.3, side: 'left' }
            },
            {
                id: 'shell_out',
                name: 'Shell Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [{ name: 'Temperature', symbol: 'T_s_out', unit: '°C' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.3, side: 'right' }
            },
            {
                id: 'tube_in',
                name: 'Tube Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [{ name: 'Temperature', symbol: 'T_t_in', unit: '°C' }],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.7, side: 'left' }
            },
            {
                id: 'tube_out',
                name: 'Tube Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [{ name: 'Temperature', symbol: 'T_t_out', unit: '°C' }],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.7, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'heat_duty',
                name: 'Heat Duty',
                symbol: 'Q',
                unit: 'kW',
                dataType: 'number',
                value: 500,
                source: 'design'
            },
            {
                id: 'u_overall',
                name: 'Overall Heat Transfer Coefficient',
                symbol: 'U',
                unit: 'W/(m²·K)',
                dataType: 'number',
                value: 850,
                source: 'design'
            },
            {
                id: 'area',
                name: 'Heat Transfer Area',
                symbol: 'A',
                unit: 'm²',
                dataType: 'number',
                value: 25,
                source: 'design'
            },
            {
                id: 'lmtd',
                name: 'Log Mean Temp Difference',
                symbol: 'LMTD',
                unit: '°C',
                dataType: 'number',
                value: 20,
                source: 'calculated'
            }
        ],
        equations: [
            {
                id: 'heat_transfer_eq',
                name: 'Heat Transfer Rate',
                expression: 'Q = U * A * LMTD',
                latex: 'Q = U \\cdot A \\cdot \\Delta T_{lm}',
                source: 'Fundamentals of Heat and Mass Transfer',
                solutionMethod: 'analytic'
            },
            {
                id: 'lmtd_eq',
                name: 'LMTD Calculation',
                expression: 'LMTD = (dT1 - dT2) / ln(dT1 / dT2)',
                latex: '\\Delta T_{lm} = \\frac{\\Delta T_1 - \\Delta T_2}{\\ln(\\Delta T_1 / \\Delta T_2)}',
                source: 'Incropera & DeWitt',
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'thermal.hx.plate',
        version: '1.0.0',
        domain: 'thermal',
        subcategory: 'heatExchanger',
        name: 'Plate Heat Exchanger',
        description: 'Compact plate heat exchanger for high efficiency heat transfer.',
        tags: ['heat exchanger', 'plate', 'compact'],
        references: [],
        ports: [
            {
                id: 'hot_in',
                name: 'Hot Side Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.3, side: 'left' }
            },
            {
                id: 'hot_out',
                name: 'Hot Side Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.3, side: 'right' }
            },
            {
                id: 'cold_in',
                name: 'Cold Side Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.7, side: 'left' }
            },
            {
                id: 'cold_out',
                name: 'Cold Side Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.7, side: 'right' }
            }
        ],
        parameters: [
            {
                id: 'heat_duty',
                name: 'Heat Duty',
                symbol: 'Q',
                unit: 'kW',
                dataType: 'number',
                value: 200,
                source: 'design'
            },
            {
                id: 'num_plates',
                name: 'Number of Plates',
                symbol: 'N',
                unit: '-',
                dataType: 'number',
                value: 50,
                source: 'design'
            },
            {
                id: 'effectiveness',
                name: 'Effectiveness',
                symbol: 'ε',
                unit: '%',
                dataType: 'number',
                value: 85,
                source: 'calculated'
            }
        ],
        equations: [
            {
                id: 'effectiveness_eq',
                name: 'Effectiveness-NTU',
                expression: 'ε = Q_actual / Q_max',
                latex: '\\varepsilon = \\frac{Q_{actual}}{Q_{max}}',
                source: 'NTU Method',
                solutionMethod: 'iterative'
            }
        ]
    },
    {
        id: 'thermal.boiler',
        version: '1.0.0',
        domain: 'thermal',
        subcategory: 'thermal',
        name: 'Boiler / Steam Generator',
        description: 'Industrial boiler for steam generation.',
        tags: ['boiler', 'steam', 'generator'],
        references: ['ASME Boiler Code'],
        ports: [
            {
                id: 'feedwater_in',
                name: 'Feedwater Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.5, side: 'left' }
            },
            {
                id: 'steam_out',
                name: 'Steam Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.3, side: 'right' }
            },
            {
                id: 'fuel_in',
                name: 'Fuel Input',
                type: 'input',
                domain: 'thermal',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0.5, y: 1, side: 'bottom' }
            }
        ],
        parameters: [
            {
                id: 'steam_capacity',
                name: 'Steam Capacity',
                symbol: 'ṁ_steam',
                unit: 'kg/h',
                dataType: 'number',
                value: 10000,
                source: 'design'
            },
            {
                id: 'steam_pressure',
                name: 'Steam Pressure',
                symbol: 'P_steam',
                unit: 'bar',
                dataType: 'number',
                value: 10,
                source: 'design'
            },
            {
                id: 'efficiency',
                name: 'Boiler Efficiency',
                symbol: 'η_b',
                unit: '%',
                dataType: 'number',
                value: 85,
                source: 'design'
            }
        ],
        equations: [
            {
                id: 'fuel_consumption',
                name: 'Fuel Consumption',
                expression: 'ṁ_fuel = ṁ_steam * (h_steam - h_feedwater) / (η_b * LHV)',
                latex: '\\dot{m}_{fuel} = \\frac{\\dot{m}_{steam}(h_{steam} - h_{fw})}{\\eta_b \\cdot LHV}',
                source: 'Energy Balance',
                solutionMethod: 'analytic'
            }
        ]
    },
    {
        id: 'thermal.radiator',
        version: '1.0.0',
        domain: 'thermal',
        subcategory: 'heatExchanger',
        name: 'Radiator (Air Cooled)',
        description: 'Cross-flow heat exchanger rejecting heat to air.',
        tags: ['radiator', 'cooling', 'automotive'],
        references: ['Automotive Cooling Systems'],
        ports: [
            {
                id: 'coolant_in',
                name: 'Coolant Inlet',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 0, y: 0.3, side: 'left' }
            },
            {
                id: 'coolant_out',
                name: 'Coolant Outlet',
                type: 'output',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: true,
                position: { x: 1, y: 0.7, side: 'right' }
            },
            {
                id: 'air_in',
                name: 'Air Flow',
                type: 'input',
                domain: 'fluid',
                variables: [],
                state: 'disconnected',
                required: false, // Implicit ambient
                position: { x: 0.5, y: 0, side: 'top' }
            }
        ],
        parameters: [
            {
                id: 'heat_rejection',
                name: 'Max Heat Rejection',
                symbol: 'Q_max',
                unit: 'kW',
                dataType: 'number',
                value: 100,
                source: 'design'
            },
            {
                id: 'air_temp',
                name: 'Ambient Air Temp',
                symbol: 'T_air',
                unit: '°C',
                dataType: 'number',
                value: 25,
                source: 'constant'
            }
        ],
        equations: [
            {
                id: 'cooling_capacity',
                name: 'Heat Rejection',
                expression: 'Q = f(Flow, dT)',
                latex: 'Q = \\dot{m} C_p \\Delta T',
                source: 'Heat Transfer',
                solutionMethod: 'analytic'
            }
        ]
    }
];

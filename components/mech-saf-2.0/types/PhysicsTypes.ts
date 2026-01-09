export type PhysicsDomain = 'mechanical' | 'fluid' | 'thermal' | 'electrical' | 'control';

export interface PhysicsVariableDef {
    name: string;
    symbol: string;
    unit: string;
    description?: string;
}

export interface ConstitutiveEquation {
    name: string;
    description?: string;
    expression: string; // MathJS compatible: "P = tau * omega"
    variables: string[]; // List of symbols used
    type: 'constitutive' | 'conservation' | 'boundary' | 'empirical';
}

export interface PhysicsModelDef {
    domain: PhysicsDomain;
    stateVariables: PhysicsVariableDef[];
    equations: ConstitutiveEquation[];
    ports: Record<string, {
        domain: PhysicsDomain;
        variables: string[]; // e.g., ["pressure", "flowRate"]
        direction?: 'in' | 'out' | 'bidirectional';
    }>;
    validation?: {
        rules: string[]; // e.g. "efficiency < 1.0"
        constraints: Record<string, { min?: number; max?: number }>;
    };
}

export const PHYSICS_INTERFACES: Record<PhysicsDomain, PhysicsVariableDef[]> = {
    mechanical: [
        { name: 'speed', symbol: 'omega', unit: 'rad/s' },
        { name: 'torque', symbol: 'tau', unit: 'N·m' },
        { name: 'power', symbol: 'P', unit: 'W' },
        { name: 'inertia', symbol: 'J', unit: 'kg·m²' }
    ],
    fluid: [
        { name: 'flowRate', symbol: 'Q', unit: 'm³/s' },
        { name: 'head', symbol: 'H', unit: 'm' },
        { name: 'pressure', symbol: 'p', unit: 'Pa' },
        { name: 'density', symbol: 'rho', unit: 'kg/m³' }
    ],
    thermal: [
        { name: 'temperature', symbol: 'T', unit: 'K' },
        { name: 'heatRate', symbol: 'Q_dot', unit: 'W' },
        { name: 'mass', symbol: 'm', unit: 'kg' },
        { name: 'specificHeat', symbol: 'cp', unit: 'J/(kg·K)' }
    ],
    electrical: [
        { name: 'voltage', symbol: 'V', unit: 'V' },
        { name: 'current', symbol: 'I', unit: 'A' },
        { name: 'power', symbol: 'P', unit: 'W' }
    ],
    control: [
        { name: 'signal', symbol: 's', unit: 'unitless' },
        { name: 'setpoint', symbol: 'sp', unit: 'unitless' },
        { name: 'error', symbol: 'e', unit: 'unitless' }
    ]
};

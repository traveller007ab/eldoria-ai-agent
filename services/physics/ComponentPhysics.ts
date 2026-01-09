/**
 * Component Physics Interface for Eldoria SAF Lab
 * 
 * Replaces hardcoded ID checks (e.g., def.id.includes('tank')) with
 * physics-driven logic based on component metadata.
 * 
 * Usage:
 * - Components declare their physics capabilities
 * - Solvers query physics.domain, physics.type, etc.
 * - Enables custom components without ID string matching
 */

import type { MechanicalDomain, MechSubDomain } from '../../types.ts';

// ============================================================================
// Physics Types
// ============================================================================

export type PhysicsDomain = 'fluid' | 'thermal' | 'mechanical' | 'control' | 'electrical';
export type PhysicsComponentType = 
    | 'pump' | 'valve' | 'pipe' | 'tank' | 'filter'  // Fluid
    | 'heater' | 'cooler' | 'heat_exchanger' | 'thermal_storage'  // Thermal
    | 'motor' | 'engine' | 'gear' | 'shaft' | 'bearing' | 'spring'  // Mechanical
    | 'sensor' | 'controller' | 'actuator'  // Control
    | 'source' | 'load'  // Electrical
    | 'reservoir';  // Alias for tank

export type PhysicsPortType = 'input' | 'output' | 'bidirectional';
export type PhysicsVariableType = 'flow' | 'head' | 'pressure' | 'temperature' | 'torque' | 'speed' | 'power' | 'voltage' | 'current';

// ============================================================================
// Component Physics Definition
// ============================================================================

export interface PhysicsVariableDefinition {
    name: string;           // e.g., "flow_rate"
    symbol: string;         // e.g., "Q"
    unit: string;           // e.g., "m³/s"
    type: PhysicsVariableType;
    defaultValue?: number;
    isStateVariable: boolean; // True if this evolves over time
}

export interface PhysicsPortDefinition {
    id: string;
    name: string;           // e.g., "inlet", "outlet"
    type: PhysicsPortType;
    domain: PhysicsDomain;
    variables: PhysicsVariableType[];
    required: boolean;
}

export interface PhysicsEquationDefinition {
    name: string;
    expression: string;     // MathJS format, e.g., "H = H_shutoff - B * Q^2"
    type: 'constitutive' | 'conservation' | 'boundary' | 'kinematic';
    variables: string[];    // Variable names used in this equation
}

export interface ComponentPhysicsModel {
    /** Primary physics domain */
    domain: PhysicsDomain;
    
    /** Component classification for solver routing */
    componentType: PhysicsComponentType;
    
    /** Subdomain for fine-grained categorization */
    subcategory?: MechSubDomain;
    
    /** State variables managed by this component */
    stateVariables: PhysicsVariableDefinition[];
    
    /** Input/output ports */
    ports: PhysicsPortDefinition[];
    
    /** Governing equations */
    equations: PhysicsEquationDefinition[];
    
    /** Performance characteristics */
    performance?: {
        efficiencyCurve?: string;      // Expression for efficiency vs operating point
        maxFlow?: number;
        maxHead?: number;
        maxPower?: number;
        maxSpeed?: number;
        maxTorque?: number;
        maxPressure?: number;
    };
    
    /** Compatibility requirements */
    compatibility?: {
        requiredFluid?: string[];       // e.g., ['water', 'oil']
        operatingRange?: {
            minTemp?: number;
            maxTemp?: number;
            minPressure?: number;
            maxPressure?: number;
        };
    };
}

// ============================================================================
// Component Classification Helpers
// ============================================================================

export class ComponentClassifier {
    
    static getPhysicsDomain(componentType: PhysicsComponentType): PhysicsDomain {
        const domainMap: Record<PhysicsComponentType, PhysicsDomain> = {
            // Fluid
            pump: 'fluid', valve: 'fluid', pipe: 'fluid', tank: 'fluid', filter: 'fluid', reservoir: 'fluid',
            // Thermal
            heater: 'thermal', cooler: 'thermal', heat_exchanger: 'thermal', thermal_storage: 'thermal',
            // Mechanical
            motor: 'mechanical', engine: 'mechanical', gear: 'mechanical', shaft: 'mechanical', 
            bearing: 'mechanical', spring: 'mechanical',
            // Control
            sensor: 'control', controller: 'control', actuator: 'control',
            // Electrical
            source: 'electrical', load: 'electrical'
        };
        return domainMap[componentType] || 'mechanical';
    }
    
    static isFixedHeadComponent(physics: ComponentPhysicsModel): boolean {
        return physics.componentType === 'tank' || 
               physics.componentType === 'reservoir' ||
               (physics.domain === 'fluid' && physics.ports.some(p => p.type === 'bidirectional'));
    }
    
    static isEnergySource(physics: ComponentPhysicsModel): boolean {
        return physics.componentType === 'pump' ||
               physics.componentType === 'motor' ||
               physics.componentType === 'engine' ||
               physics.componentType === 'source';
    }
    
    static isEnergySink(physics: ComponentPhysicsModel): boolean {
        return physics.componentType === 'valve' ||
               physics.componentType === 'pipe' ||
               physics.componentType === 'load' ||
               physics.componentType === 'cooler';
    }
    
    static getPrimaryOutputVariable(physics: ComponentPhysicsModel): PhysicsVariableType | null {
        const outputPort = physics.ports.find(p => p.type === 'output' || p.type === 'bidirectional');
        if (outputPort && outputPort.variables.length > 0) {
            return outputPort.variables[0];
        }
        return null;
    }
    
    static getPrimaryInputVariable(physics: ComponentPhysicsModel): PhysicsVariableType | null {
        const inputPort = physics.ports.find(p => p.type === 'input' || p.type === 'bidirectional');
        if (inputPort && inputPort.variables.length > 0) {
            return inputPort.variables[0];
        }
        return null;
    }
}

// ============================================================================
// Component Physics Registry
// ============================================================================

export class ComponentPhysicsRegistry {
    private static instance: ComponentPhysicsRegistry;
    private physicsModels: Map<string, ComponentPhysicsModel> = new Map();
    
    private constructor() {
        this.registerDefaults();
    }
    
    static getInstance(): ComponentPhysicsRegistry {
        if (!ComponentPhysicsRegistry.instance) {
            ComponentPhysicsRegistry.instance = new ComponentPhysicsRegistry();
        }
        return ComponentPhysicsRegistry.instance;
    }
    
    private registerDefaults() {
        // Tank / Reservoir
        this.register('fluid.tank.cylindrical', {
            domain: 'fluid',
            componentType: 'tank',
            subcategory: 'turbomachinery',
            stateVariables: [
                { name: 'level', symbol: 'h', unit: 'm', type: 'head', defaultValue: 2, isStateVariable: true },
                { name: 'volume', symbol: 'V', unit: 'm³', type: 'flow', defaultValue: 10, isStateVariable: false },
                { name: 'pressure', symbol: 'P', unit: 'Pa', type: 'pressure', isStateVariable: false }
            ],
            ports: [
                { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: ['flow', 'pressure'], required: false },
                { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: ['flow', 'pressure'], required: false }
            ],
            equations: [
                { name: 'volume', expression: 'A * h', type: 'constitutive', variables: ['volume', 'level'] },
                { name: 'pressure', expression: 'rho * g * h', type: 'constitutive', variables: ['pressure', 'level'] }
            ],
            performance: { maxHead: 100 }
        });
        
        // Centrifugal Pump
        this.register('fluid.pump.centrifugal', {
            domain: 'fluid',
            componentType: 'pump',
            subcategory: 'turbomachinery',
            stateVariables: [
                { name: 'flow_rate', symbol: 'Q', unit: 'm³/s', type: 'flow', isStateVariable: false },
                { name: 'head', symbol: 'H', unit: 'm', type: 'head', isStateVariable: false },
                { name: 'power', symbol: 'P', unit: 'W', type: 'power', isStateVariable: false }
            ],
            ports: [
                { id: 'inlet', name: 'Suction', type: 'input', domain: 'fluid', variables: ['flow', 'pressure'], required: true },
                { id: 'outlet', name: 'Discharge', type: 'output', domain: 'fluid', variables: ['flow', 'pressure'], required: true }
            ],
            equations: [
                { 
                    name: 'pump_curve', 
                    expression: 'H = H_shutoff - B * Q^2', 
                    type: 'constitutive', 
                    variables: ['head', 'flow_rate'] 
                },
                {
                    name: 'power',
                    expression: 'P = rho * g * Q * H / eta',
                    type: 'constitutive',
                    variables: ['power', 'flow_rate', 'head']
                }
            ],
            performance: {
                maxFlow: 1,
                maxHead: 200,
                maxPower: 50000
            }
        });
        
        // Pipe
        this.register('fluid.pipe.straight', {
            domain: 'fluid',
            componentType: 'pipe',
            subcategory: 'piping',
            stateVariables: [
                { name: 'flow_rate', symbol: 'Q', unit: 'm³/s', type: 'flow', isStateVariable: false },
                { name: 'velocity', symbol: 'v', unit: 'm/s', type: 'flow', isStateVariable: false },
                { name: 'pressure_drop', symbol: 'ΔP', unit: 'Pa', type: 'pressure', isStateVariable: false }
            ],
            ports: [
                { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: ['flow', 'pressure'], required: true },
                { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: ['flow', 'pressure'], required: true }
            ],
            equations: [
                { 
                    name: 'darcy_weisbach', 
                    expression: 'h_f = f * (L/D) * (v^2 / (2*g))', 
                    type: 'constitutive',
                    variables: ['pressure_drop', 'flow_rate']
                },
                {
                    name: 'velocity',
                    expression: 'v = Q / A',
                    type: 'constitutive',
                    variables: ['velocity', 'flow_rate']
                }
            ],
            performance: { maxPressure: 10000000 } // 10 MPa
        });
        
        // Control Valve
        this.register('fluid.valve.control', {
            domain: 'fluid',
            componentType: 'valve',
            subcategory: 'piping',
            stateVariables: [
                { name: 'flow_rate', symbol: 'Q', unit: 'm³/s', type: 'flow', isStateVariable: false },
                { name: 'opening', symbol: 'θ', unit: '%', type: 'flow', defaultValue: 50, isStateVariable: false }
            ],
            ports: [
                { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', variables: ['flow', 'pressure'], required: true },
                { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', variables: ['flow', 'pressure'], required: true }
            ],
            equations: [
                {
                    name: 'flow_coefficient',
                    expression: 'Q = Cv * sqrt(ΔP / SG)',
                    type: 'constitutive',
                    variables: ['flow_rate', 'opening']
                }
            ]
        });
        
        // Electric Motor
        this.register('machineElement.motor.electric', {
            domain: 'mechanical',
            componentType: 'motor',
            subcategory: 'powerTransmission',
            stateVariables: [
                { name: 'speed', symbol: 'ω', unit: 'rad/s', type: 'speed', isStateVariable: false },
                { name: 'torque', symbol: 'τ', unit: 'N·m', type: 'torque', isStateVariable: false },
                { name: 'power', symbol: 'P', unit: 'W', type: 'power', isStateVariable: false }
            ],
            ports: [
                { id: 'shaft_out', name: 'Shaft Output', type: 'output', domain: 'mechanical', variables: ['speed', 'torque'], required: true }
            ],
            equations: [
                { name: 'power_torque', expression: 'P = τ * ω', type: 'constitutive', variables: ['power', 'torque', 'speed'] },
                { name: 'torque_speed', expression: 'τ = τ_rated * (1 - (ω / ω_max)^2)', type: 'constitutive', variables: ['torque', 'speed'] }
            ],
            performance: { maxSpeed: 3000, maxTorque: 500 }
        });
        
        // Spur Gear
        this.register('machineElement.powerTransmission.spurGear', {
            domain: 'mechanical',
            componentType: 'gear',
            subcategory: 'powerTransmission',
            stateVariables: [
                { name: 'speed_in', symbol: 'ω₁', unit: 'rad/s', type: 'speed', isStateVariable: false },
                { name: 'speed_out', symbol: 'ω₂', unit: 'rad/s', type: 'speed', isStateVariable: false },
                { name: 'torque_in', symbol: 'τ₁', unit: 'N·m', type: 'torque', isStateVariable: false },
                { name: 'torque_out', symbol: 'τ₂', unit: 'N·m', type: 'torque', isStateVariable: false }
            ],
            ports: [
                { id: 'shaft_in', name: 'Input Shaft', type: 'input', domain: 'mechanical', variables: ['speed', 'torque'], required: true },
                { id: 'shaft_out', name: 'Output Shaft', type: 'output', domain: 'mechanical', variables: ['speed', 'torque'], required: true }
            ],
            equations: [
                { name: 'speed_ratio', expression: 'ω₂ = ω₁ / i', type: 'kinematic', variables: ['speed_in', 'speed_out'] },
                { name: 'torque_ratio', expression: 'τ₂ = τ₁ * i * η', type: 'constitutive', variables: ['torque_in', 'torque_out'] }
            ],
            performance: { maxTorque: 1000 }
        });
    }
    
    register(componentId: string, physics: ComponentPhysicsModel): void {
        this.physicsModels.set(componentId, physics);
    }
    
    get(componentId: string): ComponentPhysicsModel | undefined {
        return this.physicsModels.get(componentId);
    }
    
    /**
     * Get physics model, falling back to defaults if not found
     */
    getOrDefault(componentId: string, defaultType: PhysicsComponentType = 'pipe'): ComponentPhysicsModel {
        let physics = this.physicsModels.get(componentId);
        if (!physics) {
            // Auto-register based on ID pattern
            physics = this.inferPhysics(componentId, defaultType);
            this.physicsModels.set(componentId, physics);
        }
        return physics;
    }
    
    private inferPhysics(id: string, defaultType: PhysicsComponentType): ComponentPhysicsModel {
        const lowerId = id.toLowerCase();
        
        if (lowerId.includes('tank') || lowerId.includes('reservoir')) {
            return this.getOrCreateTemplate('tank');
        }
        if (lowerId.includes('pump')) {
            return this.getOrCreateTemplate('pump');
        }
        if (lowerId.includes('valve')) {
            return this.getOrCreateTemplate('valve');
        }
        if (lowerId.includes('motor')) {
            return this.getOrCreateTemplate('motor');
        }
        if (lowerId.includes('gear')) {
            return this.getOrCreateTemplate('gear');
        }
        
        // Generic pipe fallback
        return this.getOrCreateTemplate('pipe');
    }
    
    private getOrCreateTemplate(type: PhysicsComponentType): ComponentPhysicsModel {
        const template = this.physicsModels.get(`fluid.${type}`) || 
                        this.physicsModels.get(`machineElement.${type}`) ||
                        this.physicsModels.get(`mechanical.${type}`);
        
        if (template) return { ...template }; // Return copy
        
        // Return minimal template
        return {
            domain: ComponentClassifier.getPhysicsDomain(type),
            componentType: type,
            stateVariables: [],
            ports: [],
            equations: []
        };
    }
}

// ============================================================================
// Physics-Aware Solver Helpers
// ============================================================================

export function getPhysicsForComponent(componentId: string, physicsId?: string): ComponentPhysicsModel {
    const id = physicsId || componentId;
    return ComponentPhysicsRegistry.getInstance().getOrDefault(id);
}

export function isFixedHeadComponent(componentId: string, physicsId?: string): boolean {
    const physics = getPhysicsForComponent(componentId, physicsId);
    return ComponentClassifier.isFixedHeadComponent(physics);
}

export function isEnergySource(componentId: string, physicsId?: string): boolean {
    const physics = getPhysicsForComponent(componentId, physicsId);
    return ComponentClassifier.isEnergySource(physics);
}

export function getComponentDomain(componentId: string, physicsId?: string): PhysicsDomain {
    const physics = getPhysicsForComponent(componentId, physicsId);
    return physics.domain;
}

export function getComponentType(componentId: string, physicsId?: string): PhysicsComponentType {
    const physics = getPhysicsForComponent(componentId, physicsId);
    return physics.componentType;
}

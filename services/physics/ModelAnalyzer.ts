import type { MechBlueprint, MechSimulationResult } from '../../types.ts';
import { ComponentRegistry } from '../ComponentRegistry.ts';

export type ModelCategory =
    | 'engine_system'
    | 'pump_system'
    | 'hvac_system'
    | 'power_plant'
    | 'vehicle_dynamics'
    | 'hydraulic_circuit'
    | 'thermal_network'
    | 'process_system'
    | 'general';

export interface ModelAnalysis {
    category: ModelCategory;
    primaryDomain: string;
    components: string[];
    hasEngine: boolean;
    hasPump: boolean;
    hasTurbine: boolean;
    hasHeatExchanger: boolean;
    hasValve: boolean;
    hasTank: boolean;
    hasCompressor: boolean;
    hasActiveEngineSimulation: boolean;
    complexity: 'simple' | 'medium' | 'complex';
    description: string;
}

export interface DynamicMetrics {
    summary: SummaryMetrics;
    engine?: EngineMetrics;
    pump?: PumpMetrics;
    thermal?: ThermalMetrics;
    hydraulic?: HydraulicMetrics;
    vehicle?: VehicleMetrics;
    process?: ProcessMetrics;
}

export interface SummaryMetrics {
    totalPowerInput: number;
    totalPowerOutput: number;
    overallEfficiency: number;
    totalFlowRate: number;
    totalHeatInput: number;
    totalHeatOutput: number;
    maxPressure: number;
    pressureDrop: number;
    modelCategory: string;
}

export interface EngineMetrics {
    indicatedPower: number;
    brakePower: number;
    frictionPower: number;
    torque: number;
    rpm: number;
    horsepower: number;
    bmep: number;
    bsfc: number;
    airFuelRatio: number;
    thermalEfficiency: number;
    indicatedEfficiency: number | null;
    brakeEfficiency: number;
    volumetricEfficiency: number;
    meanPistonSpeed: number;
    specificOutput: number;
    _warning?: string;
}

export interface PumpMetrics {
    flowRate: number;
    head: number;
    efficiency: number;
    npsha: number;
    npshr: number;
    suctionSpecificSpeed: number;
    flowCoefficient: number;
    headCoefficient: number;
    powerCoefficient: number;
    affinityLaws: {
        flowRatio: number;
        headRatio: number;
        powerRatio: number;
    };
    systemCurveK: number;
    operatingPoint: { flow: number; head: number; power: number };
}

export interface ThermalMetrics {
    heatInput: number;
    heatOutput: number;
    cop: number;
    eer: number;
    lmtd: number;
    uaValue: number;
    effectiveness: number;
    numberOfTransferUnits: number;
    coolingCapacity: number;
    heatingCapacity: number;
}

export interface HydraulicMetrics {
    flowRate: number;
    pressureDrop: number;
    pipeVelocity: number;
    reynoldsNumber: number;
    frictionFactor: number;
    headLoss: number;
    cavitationMargin: number;
    systemCurve: { k: number; staticHead: number };
}

export interface VehicleMetrics {
    topSpeed: number;
    accelerationTime: number;
    powerToWeightRatio: number;
    wheelHorsepower: number;
    torqueAtWheels: number;
    drivetrainLoss: number;
    fuelConsumptionRate: number;
    range: number;
}

export interface ProcessMetrics {
    massBalanceError: number;
    energyBalanceError: number;
    throughput: number;
    yield: number;
    selectivity: number;
    conversion: number;
    residenceTime: number;
}

export class ModelAnalyzer {

    static analyze(blueprint: MechBlueprint): ModelAnalysis {
        const registry = ComponentRegistry.getInstance();
        const components = blueprint.components;

        // Count component types
        let engineCount = 0;
        let pumpCount = 0;
        let turbineCount = 0;
        let heatExchangerCount = 0;
        let valveCount = 0;
        let tankCount = 0;
        let compressorCount = 0;
        let pipeCount = 0;

        const componentTypes: string[] = [];

        components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            const compType = this.classifyComponent(comp.componentDefinitionId);

            componentTypes.push(compType);

            if (compType.includes('engine')) engineCount++;
            if (compType.includes('pump')) pumpCount++;
            if (compType.includes('turbine')) turbineCount++;
            if (compType.includes('heat_exchanger')) heatExchangerCount++;
            if (compType.includes('valve')) valveCount++;
            if (compType.includes('tank')) tankCount++;
            if (compType.includes('compressor')) compressorCount++;
            if (compType.includes('pipe')) pipeCount++;
        });

        // Determine model category based on dominant components
        const category = this.determineCategory({
            engineCount,
            pumpCount,
            turbineCount,
            heatExchangerCount,
            valveCount,
            tankCount,
            compressorCount,
            pipeCount,
            totalComponents: components.length
        }, blueprint);

        // Determine complexity
        const complexity = this.determineComplexity(components.length, category);

        // Determine primary domain
        const primaryDomain = this.determinePrimaryDomain(category);

        // Check if engine has mechanical connections (actively driving system)
        const hasActiveEngineSimulation = this.hasActiveEngineSimulation(blueprint, engineCount);

        return {
            category,
            primaryDomain,
            components: componentTypes,
            hasEngine: engineCount > 0,
            hasPump: pumpCount > 0,
            hasTurbine: turbineCount > 0,
            hasHeatExchanger: heatExchangerCount > 0,
            hasValve: valveCount > 0,
            hasTank: tankCount > 0,
            hasCompressor: compressorCount > 0,
            hasActiveEngineSimulation,
            complexity,
            description: this.generateDescription(category, { engineCount, pumpCount, heatExchangerCount, tankCount })
        };
    }

    static classifyComponent(componentId: string): string {
        const lowerId = componentId.toLowerCase();

        if (lowerId.includes('engine') || lowerId.includes('motor')) {
            return lowerId.includes('electric') ? 'electric_motor' : 'combustion_engine';
        }
        if (lowerId.includes('pump')) return 'pump';
        if (lowerId.includes('turbine')) return 'turbine';
        if (lowerId.includes('compressor') || lowerId.includes('compressor')) return 'compressor';
        if (lowerId.includes('heat_exchanger') || lowerId.includes('hx') || lowerId.includes('radiator')) {
            return 'heat_exchanger';
        }
        if (lowerId.includes('valve')) return 'valve';
        if (lowerId.includes('tank') || lowerId.includes('reservoir') || lowerId.includes('reservoir')) return 'tank';
        if (lowerId.includes('pipe') || lowerId.includes('line')) return 'pipe';
        if (lowerId.includes('boiler') || lowerId.includes('heater')) return 'heater';
        if (lowerId.includes('cooler') || lowerId.includes('chiller')) return 'cooler';
        if (lowerId.includes('gear') || lowerId.includes('transmission')) return 'transmission';

        return 'generic_component';
    }

    static determineCategory(counts: {
        engineCount: number;
        pumpCount: number;
        turbineCount: number;
        heatExchangerCount: number;
        valveCount: number;
        tankCount: number;
        compressorCount: number;
        pipeCount: number;
        totalComponents: number;
    }, blueprint?: MechBlueprint): ModelCategory {
        const { engineCount, pumpCount, turbineCount, heatExchangerCount, valveCount, tankCount, compressorCount, pipeCount } = counts;

        // Check if engine has mechanical connections (actively driving system)
        const hasActiveEngine = blueprint ? this.hasActiveEngineSimulation(blueprint, engineCount) : (engineCount > 0);

        // Engine-dominant systems - only if engine is actively driving
        if (hasActiveEngine && (pumpCount > 0 || valveCount > 0)) {
            return 'vehicle_dynamics';
        }
        if (hasActiveEngine) {
            return 'engine_system';
        }

        // Pump-dominant systems
        if (pumpCount > 0 && tankCount > 0 && pipeCount > 2) {
            return 'hydraulic_circuit';
        }
        if (pumpCount > 0) {
            return 'pump_system';
        }

        // Turbine systems
        if (turbineCount > 0 && heatExchangerCount > 0) {
            return 'power_plant';
        }

        // HVAC systems
        if (heatExchangerCount > 0 && compressorCount > 0 && valveCount > 0) {
            return 'hvac_system';
        }

        // Thermal networks
        if (heatExchangerCount > 0 && tankCount > 0 && pipeCount > 1) {
            return 'thermal_network';
        }

        // Process systems
        if (heatExchangerCount > 0 && valveCount > 2 && tankCount > 0) {
            return 'process_system';
        }

        // Default to hydraulic circuit if pump/valve dominant
        if (pumpCount > 0 || valveCount > 2 || pipeCount > 2) {
            return 'hydraulic_circuit';
        }

        return 'general';
    }

    static determineComplexity(componentCount: number, category: ModelCategory): 'simple' | 'medium' | 'complex' {
        const complexityThresholds = {
            simple: 3,
            medium: 7
        };

        if (category === 'power_plant' || category === 'vehicle_dynamics' || category === 'hvac_system') {
            return componentCount > 10 ? 'complex' : componentCount > 5 ? 'medium' : 'simple';
        }

        return componentCount > complexityThresholds.medium ? 'complex' :
               componentCount > complexityThresholds.simple ? 'medium' : 'simple';
    }

    static determinePrimaryDomain(category: ModelCategory): string {
        const domainMap: Record<ModelCategory, string> = {
            engine_system: 'mechanical + thermal',
            pump_system: 'fluid',
            hvac_system: 'thermal + fluid',
            power_plant: 'thermal + mechanical',
            vehicle_dynamics: 'mechanical + thermal',
            hydraulic_circuit: 'fluid',
            thermal_network: 'thermal',
            process_system: 'thermal + fluid',
            general: 'multi-physics'
        };
        return domainMap[category] || 'multi-physics';
    }

    static generateDescription(category: ModelCategory, counts: {
        engineCount: number;
        pumpCount: number;
        heatExchangerCount: number;
        tankCount: number;
    }): string {
        const descriptions: Record<ModelCategory, string> = {
            engine_system: `Internal combustion engine system with ${counts.engineCount} engine(s) and supporting components`,
            pump_system: `Fluid pumping system with ${counts.pumpCount} pump(s) for fluid circulation`,
            hvac_system: 'Heating, ventilation, and air conditioning system',
            power_plant: 'Power generation system with thermal to mechanical energy conversion',
            vehicle_dynamics: 'Vehicle powertrain and drivetrain simulation',
            hydraulic_circuit: 'Hydraulic circuit with pumps, valves, and actuators',
            thermal_network: 'Thermal distribution network with heat transfer components',
            process_system: 'Industrial process system with multiple unit operations',
            general: 'General multi-physics system'
        };
        return descriptions[category];
    }

    static hasActiveEngineSimulation(blueprint: MechBlueprint, engineCount: number): boolean {
        if (engineCount === 0) return false;

        const engineComponents = blueprint.components.filter(c =>
            c.componentDefinitionId.toLowerCase().includes('engine') ||
            c.name.toLowerCase().includes('engine')
        );

        for (const engine of engineComponents) {
            // Check for mechanical connections from engine to other components
            const mechConnections = blueprint.connections.filter(c =>
                c.sourceComponentId === engine.id &&
                (c.type === 'mechanical' || !c.type)
            );

            // Check for direct mechanical linkage to pumps, gears, or transmissions
            const hasMechOutput = mechConnections.some(conn => {
                const targetComp = blueprint.components.find(comp => comp.id === conn.targetComponentId);
                if (!targetComp) return false;

                const targetLower = targetComp.componentDefinitionId.toLowerCase();
                return targetLower.includes('pump') ||
                       targetLower.includes('gear') ||
                       targetLower.includes('transmission') ||
                       targetLower.includes('motor') ||
                       targetLower.includes('compressor');
            });

            if (hasMechOutput) {
                return true;
            }
        }

        // Also check if any engine component has speed-related parameters set
        for (const engine of engineComponents) {
            const params = engine.parameterValues;
            if (params.idle_speed || params.max_speed || params.rated_speed) {
                return true;
            }
        }

        return false;
    }
}

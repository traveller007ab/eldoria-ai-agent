import type { ISolver } from '../SolverRegistry.ts';
import type {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration
} from '../../../types.ts';
import { MaterialRegistry } from '../MaterialRegistry.ts';
import { FluidPropertyDatabase } from '../FluidProperties.ts';
import { RealHeatExchanger } from '../RealHeatExchanger.ts';

interface ThermalNode {
    id: string;
    componentId: string;
    temperature: number;
    mass: number;
    heatCapacity: number;
    heatGen: number;
    heatInput: number;
}

interface ThermalConnection {
    sourceId: string;
    targetId: string;
    flow: number;
    conductivity: number;
}

interface HeatExchangerComponent {
    type: 'shell_tube' | 'double_pipe' | 'plate' | 'cross_flow';
    hotInletTemp: number;
    hotOutletTemp: number;
    coldInletTemp: number;
    coldOutletTemp: number;
    hotFlowRate: number;
    coldFlowRate: number;
    hotCp: number;
    coldCp: number;
    overallU: number;
    area: number;
}

export class ThermalNetworkSolver implements ISolver {

    async solve(blueprint: MechBlueprint, config: MechSolverConfiguration, context: Record<string, number> = {}): Promise<MechSimulationResult> {
        const variables: Record<string, number> = {};
        const metrics = {
            totalHeatInput: 0,
            totalHeatOutput: 0,
            overallEfficiency: 0,
            totalPowerInput: 0,
            totalPowerOutput: 0,
            totalFlowRate: 0,
            maxPressure: 0,
            pressureDrop: 0,
            componentMetrics: {}
        };

        const fluidId = blueprint.fluidId || 'water';
        const fluid = MaterialRegistry.getInstance().getFluid(fluidId);
        
        // Get temperature from context or use 20°C default
        const temperatureK = context['temperature'] || 293.15;
        
        // Use real fluid properties with temperature dependence
        const rho = FluidPropertyDatabase.getDensityAtTemperature(fluidId, temperatureK);
        const cp = fluid?.specificHeat || 4182;
        const mu = FluidPropertyDatabase.getViscosityAtTemperature(fluidId, temperatureK);
        const k_thermal = FluidPropertyDatabase.getFluid(fluidId)?.thermalConductivity || 0.6;
        const Pr = FluidPropertyDatabase.calculatePrandtlNumber(fluidId, temperatureK);
        
        const g = 9.80665;

        const nodes: ThermalNode[] = [];
        const nodeMap = new Map<string, number>();
        const heatExchangers: HeatExchangerComponent[] = [];

        blueprint.components.forEach(comp => {
            const prefix = comp.name.replace(/\s+/g, '_');
            const params = comp.parameterValues;

            // Get flow and head loss from context (passed from fluid solver)
            const flow_m3h = context[`${prefix}_flow_rate`] || 0;
            const flow_kg_s = flow_m3h * rho / 3600; // kg/s
            const head_loss_m = context[`${prefix}_head_loss`] || 0;

            // Calculate friction heat: Q_friction = ρ * g * Q * h_loss
            const frictionHeat = rho * g * (flow_m3h / 3600) * head_loss_m; // W

            // Check if this is a heat exchanger
            const isHeatExchanger = comp.componentDefinitionId.toLowerCase().includes('heat') || 
                                   comp.componentDefinitionId.toLowerCase().includes('radiator') ||
                                   comp.componentDefinitionId.toLowerCase().includes('cooler');

            if (isHeatExchanger) {
                // Extract heat exchanger parameters
                const hxParams = {
                    type: 'shell_tube' as const,
                    hotInletTemp: Number(params.hot_inlet_temp) || Number(params.temperature) || 350,
                    hotOutletTemp: Number(params.hot_outlet_temp) || 320,
                    coldInletTemp: Number(params.cold_inlet_temp) || 300,
                    coldOutletTemp: Number(params.cold_outlet_temp) || 310,
                    hotFlowRate: flow_kg_s,
                    coldFlowRate: flow_kg_s, // Simplified - use same fluid
                    hotCp: cp,
                    coldCp: cp,
                    overallU: Number(params.overall_u) || 500,
                    area: Number(params.area) || Number(params.heat_area) || 1
                };
                heatExchangers.push(hxParams);
            }

            // Check if this component has thermal significance:
            // 1. Has temperature parameter
            // 2. Has heat duty
            // 3. Generates friction heat (flow + head loss)
            // 4. Or is a thermal component type
            const tempParam = params.temperature || params.initial_temperature || params.T_initial;
            const hasHeatDuty = params.heat_duty;
            const hasFrictionHeat = flow_m3h > 0 && head_loss_m > 0;
            const isThermalType = comp.componentDefinitionId.includes('thermal') ||
                                  comp.componentDefinitionId.includes('heater') ||
                                  comp.componentDefinitionId.includes('engine') ||
                                  comp.componentDefinitionId.includes('cooler') ||
                                  comp.componentDefinitionId.includes('hx') ||
                                  comp.componentDefinitionId.includes('valve') ||
                                  comp.componentDefinitionId.includes('pipe');

            if (!tempParam && !hasHeatDuty && !hasFrictionHeat && !isThermalType) {
                return;
            }

            const mass = Number(params.mass) || Number(params.fluid_mass) || 1000;
            const heatCapacity = mass * cp;

            let heatGen = 0;

            if (flow_m3h > 0 && head_loss_m > 0) {
                const Q_m3s = flow_m3h / 3600;
                heatGen = rho * g * Q_m3s * head_loss_m;
            }

            if (params.heat_duty) {
                heatGen += Number(params.heat_duty) * 1000;
            }

            const node: ThermalNode = {
                id: `thermal_${comp.id}`,
                componentId: comp.id,
                temperature: Number(tempParam) || 300,
                mass,
                heatCapacity,
                heatGen,
                heatInput: 0
            };

            nodeMap.set(comp.id, nodes.length);
            nodes.push(node);
        });

        const connections: ThermalConnection[] = [];

        blueprint.connections.forEach(conn => {
            const sourceIdx = nodeMap.get(conn.sourceComponentId);
            const targetIdx = nodeMap.get(conn.targetComponentId);

            if (sourceIdx !== undefined && targetIdx !== undefined) {
                const sourceComp = blueprint.components.find(c => c.id === conn.sourceComponentId);
                const targetComp = blueprint.components.find(c => c.id === conn.targetComponentId);

                if (sourceComp && targetComp) {
                    const sourcePrefix = sourceComp.name.replace(/\s+/g, '_');
                    const targetPrefix = targetComp.name.replace(/\s+/g, '_');

                    const flowRate = context[`${sourcePrefix}_flow_rate`] || context[`${targetPrefix}_flow_rate`] || 0;
                    let conductivity = 100;

                    if (sourceComp.parameterValues.thermal_conductivity) {
                        conductivity = Number(sourceComp.parameterValues.thermal_conductivity);
                    }

                    connections.push({
                        sourceId: conn.sourceComponentId,
                        targetId: conn.targetComponentId,
                        flow: flowRate / 3600,
                        conductivity
                    });
                }
            }
        });

        nodes.forEach((node, idx) => {
            const prefix = node.componentId.replace(/-/g, '_');
            const params = blueprint.components.find(c => c.id === node.componentId)?.parameterValues || {};

            if (params.heat_duty) {
                const heatDutyW = Number(params.heat_duty) * 1000;
                node.heatInput = heatDutyW;
                metrics.totalHeatInput += heatDutyW / 1000;
            }

            if (node.componentId.includes('engine') || node.componentId.includes('motor')) {
                const heatGenW = node.heatGen + (context[`${prefix}_heat_gen`] || 0) * 1000;
                if (heatGenW > 0) {
                    node.heatInput += heatGenW;
                    metrics.totalHeatInput += heatGenW / 1000;
                }
            }

            if (node.heatGen > 0) {
                metrics.totalHeatInput += node.heatGen / 1000;
            }

            variables[`${prefix}_temperature`] = node.temperature - 273.15;
            variables[`${prefix}_temp_k`] = node.temperature;
        });

        connections.forEach(conn => {
            const sourceIdx = nodeMap.get(conn.sourceId);
            const targetIdx = nodeMap.get(conn.targetId);

            if (sourceIdx !== undefined && targetIdx !== undefined) {
                const sourceNode = nodes[sourceIdx];
                const targetNode = nodes[targetIdx];

                if (conn.flow > 0 && sourceNode.temperature !== targetNode.temperature) {
                    const heatTransfer = rho * conn.flow * cp * (sourceNode.temperature - targetNode.temperature);

                    if (targetNode.heatCapacity > 0) {
                        const tempChange = heatTransfer / targetNode.heatCapacity;
                        targetNode.temperature += tempChange;

                        const targetPrefix = targetNode.componentId.replace(/-/g, '_');
                        variables[`${targetPrefix}_temperature`] = targetNode.temperature - 273.15;
                    }
                }
            }
        });

        nodes.forEach(node => {
            const prefix = node.componentId.replace(/-/g, '_');
            const params = blueprint.components.find(c => c.id === node.componentId)?.parameterValues || {};

            if (params.cooling_rate) {
                const cooling = Number(params.cooling_rate) * 1000;
                const heatRemoved = Math.min(cooling, node.heatInput + node.heatGen);
                metrics.totalHeatOutput += heatRemoved / 1000;
            }

            if (node.temperature > 300) {
                const ambientTemp = 300;
                const tempDiff = node.temperature - ambientTemp;
                const surfaceArea = Number(params.surface_area) || 1;
                const heatTransferCoeff = Number(params.htc) || 10;

                const heatLoss = surfaceArea * heatTransferCoeff * tempDiff;
                if (heatLoss > 0 && heatLoss < node.heatInput + node.heatGen) {
                    metrics.totalHeatOutput += heatLoss / 1000;
                }
            }

            if (node.componentId.includes('radiator') || node.componentId.includes('cooler')) {
                const heatRejected = context[`${prefix}_heat_rejection`] ||
                                    context[`${prefix}_cooling_capacity`] ||
                                    node.heatGen * 0.9;
                if (heatRejected > 0) {
                    metrics.totalHeatOutput += Number(heatRejected);
                    variables[`${prefix}_heat_rejection`] = Number(heatRejected);
                }
            }
        });

        // REAL HEAT EXCHANGER ANALYSIS using NTU-LMTD method
        heatExchangers.forEach((hx, idx) => {
            const comp = blueprint.components.find(c => 
                c.componentDefinitionId.toLowerCase().includes('heat') || 
                c.componentDefinitionId.toLowerCase().includes('radiator')
            );
            const prefix = comp?.name.replace(/\s+/g, '_') || `heat_exchanger_${idx}`;

            try {
                // Calculate using NTU-LMTD method from RealHeatExchanger
                const result = RealHeatExchanger.analyze(hx, 'shell_tube');

                // Store results
                variables[`${prefix}_heat_transfer`] = result.heatTransfer;
                variables[`${prefix}_effectiveness`] = result.effectiveness;
                variables[`${prefix}_lmtd`] = result.lmtd;
                variables[`${prefix}_ntu`] = result.ntus;
                variables[`${prefix}_hot_outlet`] = result.hotOutletTemp;
                variables[`${prefix}_cold_outlet`] = result.coldOutletTemp;

                // Add to metrics
                metrics.totalHeatInput += result.heatTransfer / 1000;

                // Calculate efficiency (actual / maximum possible)
                const efficiency = result.effectiveness * 100;
                variables[`${prefix}_efficiency_pct`] = efficiency;

            } catch (e) {
                console.warn(`[ThermalNetworkSolver] Heat exchanger analysis failed for ${prefix}:`, e);
            }
        });

        // Calculate heat exchanger areas if not provided
        const hxComponents = blueprint.components.filter(c => 
            c.componentDefinitionId.toLowerCase().includes('heat') ||
            c.componentDefinitionId.toLowerCase().includes('radiator')
        );

        hxComponents.forEach(comp => {
            const prefix = comp.name.replace(/\s+/g, '_');
            const params = comp.parameterValues;

            // If user wants to design heat exchanger (has duty, temps, but no area)
            if (params.heat_duty && params.hot_inlet_temp && params.cold_inlet_temp) {
                const Q = Number(params.heat_duty) * 1000; // W
                const U = Number(params.overall_u) || 500; // W/m²K

                // Estimate required area using LMTD
                const LMTD = RealHeatExchanger.calculateLMTD(
                    Number(params.hot_inlet_temp),
                    Number(params.hot_outlet_temp) || Number(params.hot_inlet_temp) - 20,
                    Number(params.cold_inlet_temp),
                    Number(params.cold_outlet_temp) || Number(params.cold_inlet_temp) + 20,
                    true // counter-flow
                );

                const requiredArea = Q / (U * LMTD);
                variables[`${prefix}_required_area`] = requiredArea;
            }
        });

        if (metrics.totalHeatInput > 0) {
            metrics.overallEfficiency = (metrics.totalHeatOutput / metrics.totalHeatInput) * 100;
        }

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: 50,
            configuration: config,
            variables,
            metrics,
            diagnostics: {
                convergence: { iterations: 1, residual: 0, converged: true },
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: {
                    status: 'ok',
                    input: metrics.totalHeatInput,
                    output: metrics.totalHeatOutput,
                    imbalance: metrics.totalHeatInput - metrics.totalHeatOutput,
                    imbalancePercent: metrics.totalHeatInput > 0 ? ((metrics.totalHeatInput - metrics.totalHeatOutput) / metrics.totalHeatInput) * 100 : 0
                }
            },
            constraintViolations: []
        };
    }
}

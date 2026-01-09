import type { MechBlueprint, MechSimulationResult, DiagnosticIssue } from '../../types.ts';
import { MaterialRegistry } from './MaterialRegistry.ts';
import { getPhysicsForComponent, getComponentType } from './ComponentPhysics.ts';

export class DiagnosticService {

    static analyze(blueprint: MechBlueprint, result: MechSimulationResult): DiagnosticIssue[] {
        const issues: DiagnosticIssue[] = [];
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');

        // Vapor pressure for cavitation check (Pa)
        const vaporPressure = fluid.type === 'gas' ? 0 : (fluid.viscosity > 0.01 ? 100 : 2300);
        const minNPSH = 3.0; // Minimum NPSH margin in meters

        const getComponentTypeSafe = (id: string, defId: string) => {
            try {
                return getComponentType(id, defId);
            } catch {
                // Fallback: infer from ID string
                const lowerId = id.toLowerCase();
                if (lowerId.includes('pump')) return 'pump';
                if (lowerId.includes('pipe')) return 'pipe';
                if (lowerId.includes('valve')) return 'valve';
                if (lowerId.includes('tank')) return 'tank';
                if (lowerId.includes('engine')) return 'engine';
                if (lowerId.includes('motor')) return 'motor';
                if (lowerId.includes('compressor')) return 'pump'; // Treat compressor as pump
                return 'unknown';
            }
        };

        // 1. Cavitation Check (Pumps)
        // Rule: Suction Pressure > Vapor Pressure + NPSH_margin
        blueprint.components.forEach(comp => {
            const compType = getComponentTypeSafe(comp.componentDefinitionId, '');
            if (compType !== 'pump') return;

            const compName = comp.name.replace(/\s+/g, '_');
            const suctionPressure = result.variables[`${compName}_suction_pressure`] ||
                                   result.variables[`${compName}_inlet_pressure`] ||
                                   result.variables[`${compName}_pressure`];

            if (suctionPressure !== undefined) {
                const suctionHead = (suctionPressure * 1000) / (fluid.density * 9.81); // Convert kPa to m head
                const availableNPSH = suctionHead - (fluid.type === 'liquid' ? 2 : 0); // Subtract static if needed

                if (availableNPSH < minNPSH) {
                    issues.push({
                        id: `cavitation-${comp.id}`,
                        componentId: comp.id,
                        severity: 'critical',
                        message: `Cavitation Risk: Available NPSH (${availableNPSH.toFixed(2)}m) below minimum (${minNPSH}m). Suction pressure: ${suctionPressure.toFixed(2)} kPa.`,
                        value: availableNPSH,
                        threshold: minNPSH,
                        ruleId: 'CAVITATION'
                    });
                }
            }
        });

        // 2. Erosion Check (Velocity)
        // v = Q / A.
        blueprint.components.forEach(pipe => {
            const compType = getComponentTypeSafe(pipe.componentDefinitionId, '');
            if (compType !== 'pipe') return;

            const compName = pipe.name.replace(/\s+/g, '_');
            let flow = 0;
            if (result.variables[`${compName}_flow`]) flow = result.variables[`${compName}_flow`];
            else if (result.variables[`${compName}_flow_rate`]) flow = result.variables[`${compName}_flow_rate`];

            const flowM3s = (Math.abs(flow)) / 3600;
            const diameterMm = Number(pipe.parameterValues['diameter']) || 100;
            const diameterM = diameterMm / 1000;
            const area = Math.PI * Math.pow(diameterM / 2, 2);

            if (area > 0 && flowM3s > 0) {
                const velocity = flowM3s / area;
                if (velocity > 3.0) {
                    issues.push({
                        id: `erosion-${pipe.id}`,
                        componentId: pipe.id,
                        severity: velocity > 5.0 ? 'critical' : 'warning',
                        message: `High velocity detected (${velocity.toFixed(2)} m/s). Risk of erosion/noise.`,
                        value: velocity,
                        threshold: 3.0,
                        ruleId: 'EROSION'
                    });
                }
            }
        });

        // 3. Over-Temperature Check
        for (const key in result.variables) {
            if (key.includes('_T_out')) {
                const temp = result.variables[key];
                if (temp > 400) {
                    const compName = key.replace('_T_out', '').replace(/_/g, ' ');
                    const comp = blueprint.components.find(c => c.name === compName || c.name.replace(/\s+/g, '_') === compName.replace(/ /g, '_'));
                    if (comp) {
                        issues.push({
                            id: `temp-${comp.id}`,
                            componentId: comp.id,
                            severity: 'critical',
                            message: `Temperature (${temp.toFixed(1)}°C) exceeds standard material limits (400°C).`,
                            value: temp,
                            threshold: 400,
                            ruleId: 'OVER_TEMP'
                        });
                    }
                }
            }
        }

        // 4. Compressor Surge/Stall (Simple Ratio check)
        blueprint.components.forEach(comp => {
            const compType = getComponentTypeSafe(comp.componentDefinitionId, '');
            if (compType !== 'pump') return; // Treat compressors as pumps for now

            const compName = comp.name.replace(/\s+/g, '_');
            const rc = result.variables[`${compName}_pressure_ratio`];
            const designRc = Number(comp.parameterValues['ratio']) || 3.0;

            if (rc > designRc * 1.5) {
                issues.push({
                    id: `surge-${comp.id}`,
                    componentId: comp.id,
                    severity: 'critical',
                    message: `Surge Risk: Operating Pressure Ratio (${rc.toFixed(2)}) significantly exceeds design.`,
                    value: rc,
                    threshold: designRc * 1.5,
                    ruleId: 'SURGE_RISK'
                });
            }
        });

        // 5. Semantic Compatibility Check
        blueprint.components.forEach(comp => {
            const compType = getComponentTypeSafe(comp.componentDefinitionId, '');
            const lowerId = comp.componentDefinitionId.toLowerCase();

            // Engine check (combustible fuel required)
            if (compType === 'engine' || lowerId.includes('engine')) {
                const isCombustible = fluid?.tags?.includes('combustible');
                if (!isCombustible) {
                    issues.push({
                        id: `compat-engine-${comp.id}`,
                        componentId: comp.id,
                        severity: 'critical',
                        message: `Incompatible Fluid: Engine cannot run on '${fluid?.name}'. Requires combustible fluid.`,
                        value: 0,
                        threshold: 1,
                        ruleId: 'FLUID_COMPATIBILITY'
                    });
                }
            }

            // Hydraulic pump with gas check
            if (compType === 'pump' && fluid?.type === 'gas') {
                issues.push({
                    id: `compat-pump-gas-${comp.id}`,
                    componentId: comp.id,
                    severity: 'warning',
                    message: `Component Mismatch: Hydraulic Pump operating with Gas. Use a Compressor.`,
                    value: 0,
                    threshold: 1,
                    ruleId: 'DOMAIN_MISMATCH'
                });
            }
        });

        // 6. Fuel Compatibility (Engines)
        const engines = blueprint.components.filter(c => {
            const compType = getComponentTypeSafe(c.componentDefinitionId, '');
            const lowerId = c.componentDefinitionId.toLowerCase();
            return (compType === 'engine' || lowerId.includes('engine')) && !lowerId.includes('electric');
        });

        if (engines.length > 0) {
            const hasFuel = fluid && fluid.tags?.includes('combustible');
            if (!hasFuel) {
                issues.push({
                    id: 'fuel-compat',
                    componentId: engines[0].id,
                    severity: 'critical',
                    message: `Engines require combustible fuel. Current fluid '${fluid.name}' is not combustible.`,
                    ruleId: 'FUEL_COMPATIBILITY'
                });
            }
        }

        return issues;
    }
}

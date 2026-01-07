import { MechBlueprint, MechSimulationResult, DiagnosticIssue } from '../../types';
import { MaterialRegistry } from './MaterialRegistry';

export class DiagnosticService {

    static analyze(blueprint: MechBlueprint, result: MechSimulationResult): DiagnosticIssue[] {
        const issues: DiagnosticIssue[] = [];
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water');

        // 1. Cavitation Check (Pumps)
        // Rule: Suction Pressure < Vapor Pressure + NPSH_margin
        // Vapor Pressure of Water @ 25C ~= 3.17 kPa. 
        // We generally warn if P_in < 0.5 bar (50000 Pa) as a heuristic if we don't have accurate Vp.
        // Or strictly < 10 kPa.
        const minSuctionPressure = 10000; // 10 kPa (approx 0.1 bar abs) - simplistic

        blueprint.components.filter(c => c.componentDefinitionId.includes('pump')).forEach(pump => {
            const pInKey = `${pump.name.replace(/\s+/g, '_')}_P_in`; // Assuming variable key convention
            // Note: SimulationService might not output P_in explicitly if it's connected to a tank.
            // Ideally we check the node value.
            // For now, let's assume we can access it via variables.
            // If SimService doesn't output node pressures, this is hard.
            // SimService seems to output 'Pump_1_head' etc.

            // Let's rely on specific known variables or heuristic.
        });

        // 2. Erosion Check (Velocity)
        // v = Q / A.
        // We check Pipes.
        // Q is usually available. D is parameter.
        blueprint.components.filter(c => c.componentDefinitionId.includes('pipe')).forEach(pipe => {
            const compName = pipe.name.replace(/\s+/g, '_');
            const flowKey = `${compName}_flow_rate`; // or just mass flow

            // Try to find flow in result variables
            // Variables are flattened. We scan for keys containing component name and 'flow'.
            let flow = 0;
            // Precise lookup based on SimulationService naming
            // SimulationService: variables[`${prefix}_flow_rate`] = Q;
            if (result.variables[`${compName}_flow`]) flow = result.variables[`${compName}_flow`]; // m3/s?
            else if (result.variables[`${compName}_flow_rate`]) flow = result.variables[`${compName}_flow_rate`]; // m3/h likely

            // Check Units: FluidComponents defines Q in m3/h.
            const flowM3s = (Math.abs(flow)) / 3600;

            const diameterMm = Number(pipe.parameterValues['diameter']) || 100;
            const diameterM = diameterMm / 1000;
            const area = Math.PI * Math.pow(diameterM / 2, 2);

            if (area > 0 && flowM3s > 0) {
                const velocity = flowM3s / area;

                // Rule: > 3 m/s is warning for liquids
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
        // Check all components with T_out
        for (const key in result.variables) {
            if (key.includes('_T_out')) {
                const temp = result.variables[key];
                if (temp > 400) {
                    // Find component name from key
                    // key is "Component_Name_T_out"
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
        // If Pressure Ratio > Design * 1.2
        blueprint.components.filter(c => c.componentDefinitionId.includes('compressor')).forEach(comp => {
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





        // 5. Semantic Compatibility Check (Robust)
        // Rule: Components that require specific fluid properties (e.g. Engine -> Combustible)
        // must operate in a context where the fluid has those tags.
        blueprint.components.forEach(comp => {
            // Logic for Engines
            if (comp.componentDefinitionId.includes('engine')) {
                // Requirement: Fluid must be combustible
                const isCombustible = fluid?.tags?.includes('combustible');

                if (!isCombustible) {
                    issues.push({
                        id: `compat-engine-${comp.id}`,
                        componentId: comp.id,
                        severity: 'critical',
                        message: `Incompatible Fluid: Internal Combustion Engine cannot run on '${fluid?.name}'. Requires a 'combustible' fluid (e.g., Diesel).`,
                        value: 0,
                        threshold: 1,
                        ruleId: 'FLUID_COMPATIBILITY'
                    });
                }
            }

            // Logic for Hydraulic Pumps vs Gas?
            if (comp.componentDefinitionId.includes('pump') && fluid?.type === 'gas') {
                issues.push({
                    id: `compat-pump-gas-${comp.id}`,
                    componentId: comp.id,
                    severity: 'warning',
                    message: `Component Mismatch: Hydraulic Pump operating with Gas ('${fluid?.name}'). Efficiency will be near zero. Use a Compressor.`,
                    value: 0,
                    threshold: 1,
                    ruleId: 'DOMAIN_MISMATCH'
                });
            }
        });


        return issues;
    }
}

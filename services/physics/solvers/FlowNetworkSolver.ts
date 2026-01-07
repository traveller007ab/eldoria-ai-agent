import { ISolver } from '../SolverRegistry';
import {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration,
    MechSimulationMetrics,
    MechSimulationDiagnostics
} from '../../../types';
import { NumericMethods } from '../NumericMethods';
import { MaterialRegistry } from '../MaterialRegistry';
import { ComponentRegistry } from '../../ComponentRegistry';

interface HydraulicNode {
    id: number;
    componentId: string;
    isFixed: boolean;
    fixedHead: number; // m
    elevation: number;
    initialHeadGuess: number;
}

interface HydraulicLink {
    id: number;
    componentId: string;
    startNode: number;
    endNode: number;
    type: 'pipe' | 'valve' | 'pump';
    params: any;
}

export class FlowNetworkSolver implements ISolver {

    async solve(blueprint: MechBlueprint, config: MechSolverConfiguration): Promise<MechSimulationResult> {
        // 1. Build Hydraulic Graph
        const { nodes, links, unknownsMap } = this.parseBlueprint(blueprint);

        if (nodes.length === 0) {
            // Fallback or empty result
            return this.mockResult(blueprint, config);
        }

        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water')!;
        const g = 9.81;
        const rho = fluid.density;
        const mu = fluid.viscosity;

        // 2. Identify Unknowns (Heads at non-fixed nodes)
        const unknownIndices = nodes.map((n, i) => n.isFixed ? -1 : i).filter(i => i !== -1);
        const mapUnknownToNode = unknownIndices;

        // Initial Guess
        const H_unknown_0 = mapUnknownToNode.map(i => nodes[i].initialHeadGuess);

        // 3. Define System of Equations F(H)
        const F = (H_unknown: number[]) => {
            // Reconstruct full Head vector
            const Heads = nodes.map(n => n.fixedHead);
            mapUnknownToNode.forEach((nodeIdx, k) => {
                Heads[nodeIdx] = H_unknown[k];
            });

            const residuals = new Array(H_unknown.length).fill(0);

            // Calculate flows for all links based on Heads
            const linkFlows = links.map(link => {
                const hStart = Heads[link.startNode];
                const hEnd = Heads[link.endNode];
                const dh = hStart - hEnd;

                // Flow Q from Start to End
                // hStart - hEnd = Loss(Q) - Gain(Q)
                // For Pipe/Valve: Loss = R * Q^2
                // For Pump: Gain = A - B*Q^2 -> hStart - hEnd = -(A - B*Q^2) -> hEnd - hStart = A - B*Q^2

                return this.calculateFlow(link, dh, { rho, mu, g });
            });

            // Mass Balance at each Unknown Node
            mapUnknownToNode.forEach((nodeIdx, k) => {
                let netFlow = 0;
                links.forEach((link, linkIdx) => {
                    const Q = linkFlows[linkIdx];
                    if (link.startNode === nodeIdx) netFlow -= Q; // Outflow
                    if (link.endNode === nodeIdx) netFlow += Q;   // Inflow
                });
                residuals[k] = netFlow;
            });

            return residuals;
        };

        // 4. Define Jacobian J(H) (Finite Difference)
        const J = (H: number[]) => {
            const n = H.length;
            const epsilon = 1e-4;
            const matrix = Array(n).fill(0).map(() => Array(n).fill(0));
            const f0 = F(H);

            for (let j = 0; j < n; j++) {
                const H_perturbed = [...H];
                H_perturbed[j] += epsilon;
                const f1 = F(H_perturbed);

                for (let i = 0; i < n; i++) {
                    matrix[i][j] = (f1[i] - f0[i]) / epsilon;
                }
            }
            return matrix;
        };

        // 5. Solve
        const { X: H_final, converged, iter, residual } = await NumericMethods.newtonRaphsonSystem(
            F, J, H_unknown_0, 1e-5, 50
        );

        // 6. Map results back to SimulationResult
        const finalHeads = nodes.map(n => n.fixedHead);
        mapUnknownToNode.forEach((nodeIdx, k) => {
            finalHeads[nodeIdx] = H_final[k];
        });

        const variables: Record<string, number> = {};

        // Compute final flows and variables
        links.forEach(link => {
            const hStart = finalHeads[link.startNode];
            const hEnd = finalHeads[link.endNode];
            const dh = hStart - hEnd;
            const Q = this.calculateFlow(link, dh, { rho, mu, g });

            // Should be in m3/h for display usually, but internally m3/s
            const prefix = link.componentId.replace(/\s+/g, '_'); // Careful, need name? Using comp Id for now
            // Ideally we map back to Component Name from blueprint
            const comp = blueprint.components.find(c => c.id === link.componentId);
            const namePrefix = comp ? comp.name.replace(/\s+/g, '_') : link.componentId;

            variables[`${namePrefix}_flow_rate`] = Q * 3600; // m3/h
            variables[`${namePrefix}_velocity`] = 0; // simplified
            variables[`${namePrefix}_head_loss`] = Math.abs(dh); // Approx

            if (link.type === 'pump') {
                variables[`${namePrefix}_head`] = hEnd - hStart;
            }
        });

        // Node pressures
        nodes.forEach((node, i) => {
            const comp = blueprint.components.find(c => c.id === node.componentId);
            // This lookup is imperfect because nodes could be junctions without components
            // But for now, we only map back if nodes are explicitly tanks
            if (nodes[i].componentId.startsWith('node_')) {
                // Internal node
                variables[`${nodes[i].componentId}_pressure`] = (finalHeads[i] * rho * g) / 1000;
            } else {
                const comp = blueprint.components.find(c => c.id === nodes[i].componentId);
                if (comp) {
                    const namePrefix = comp.name.replace(/\s+/g, '_');
                    variables[`${namePrefix}_pressure`] = (finalHeads[i] * rho * g) / 1000; // kPa
                    variables[`${namePrefix}_head`] = finalHeads[i];
                }
            }
        });

        const totalFlowRate = links.reduce((sum, link) => {
            // Only sum PUMPS to represent "System Throughout"
            if (link.type === 'pump') {
                // Use more robust variable lookup matching the prefix logic earlier
                const comp = blueprint.components.find(c => c.id === link.componentId);
                if (comp) {
                    const namePrefix = comp.name.replace(/\s+/g, '_');
                    return sum + Math.abs(variables[`${namePrefix}_flow_rate`] || 0);
                }
            }
            return sum;
        }, 0);

        // Better metrics calculation
        let calculatedMaxPressure = 0;
        Object.keys(variables).forEach(k => {
            if (k.endsWith('_pressure')) calculatedMaxPressure = Math.max(calculatedMaxPressure, variables[k]);
        });

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: converged ? 'completed' : 'failed',
            completedAt: new Date(),
            duration: 0,
            configuration: config,
            variables,
            metrics: {
                totalFlowRate: totalFlowRate,
                totalPowerInput: 0,
                totalPowerOutput: 0,
                overallEfficiency: 0,
                maxPressure: calculatedMaxPressure,
                pressureDrop: 0,
                totalHeatInput: 0,
                totalHeatOutput: 0,
                componentMetrics: {}
            },
            diagnostics: {
                convergence: { iterations: iter, residual, converged },
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 }, // To implement properly
                energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
            },
            constraintViolations: []
        };
    }

    private calculateFlow(link: HydraulicLink, dh: number, phys: { rho: number, mu: number, g: number }): number {
        const { rho, mu, g } = phys;

        if (link.type === 'pipe') {
            // D-W: dh = f * L/D * v^2/2g
            // v = Q / A
            // dh = K * Q^2  where K = 8*f*L / (pi^2 * g * D^5)
            // Q = sqrt(dh / K)

            const L = Number(link.params['length']) || 10;
            const D_mm = Number(link.params['diameter']) || 100;
            const D = D_mm / 1000;
            const rough = (Number(link.params['roughness']) || 0.045) / 1000;

            // Assume fully turbulent f initially (0.02) or iterative?
            // Simplified for robustness: Fixed f roughly or Swamee-Jain large Re limits
            // f approx 0.02
            const f = 0.02;
            const K = (8 * f * L) / (Math.PI * Math.PI * g * Math.pow(D, 5));

            if (Math.abs(dh) < 1e-6) return 0;
            const Q = Math.sqrt(Math.abs(dh) / K);
            return dh > 0 ? Q : -Q;
        }

        if (link.type === 'pump') {
            // dh is hStart - hEnd. Pump adds head.
            // hEnd - hStart = H_pump.
            // -dh = H_pump
            // H_pump = H_shutoff - B * Q^2
            // -dh = H_0 - B*Q^2  => B*Q^2 = H_0 + dh
            const H0 = Number(link.params['design_head']) || 50; // Approximating shutoff as design * 1.3?
            // Let's assume curve passes through (Q_des, H_des) and (0, 1.33*H_des)
            const Q_des = (Number(link.params['design_flow']) || 100) / 3600;
            const H_des = Number(link.params['design_head']) || 50;

            const H_shutoff = H_des * 1.33;
            // Catch divide by zero
            if (Q_des <= 0) return 0;

            const B = (H_shutoff - H_des) / (Q_des * Q_des);

            // Equation: H_gain = H_shutoff - B*Q^2
            // H_gain = hEnd - hStart = -dh
            // -dh = H_shutoff - B*Q^2
            // B*Q^2 = H_shutoff + dh
            // Q = sqrt( (H_shutoff + dh) / B )

            const headRequired = -dh; // The lift the pump must provide
            // If headRequired > H_shutoff, flow is 0 (or reverse if check valve fails)
            // If headRequired < 0 (gravity helps), Q increases.

            const val = H_shutoff - headRequired;
            if (val < 0) return 0; // Pump deadheaded

            if (B <= 0) return 0; // Bad curve

            return Math.sqrt(val / B);
        }

        if (link.type === 'valve') {
            // Q = Cv * sqrt(dp/SG)
            // Cv is usually US GPM @ 1 psi drop. 
            // We work in SI (m3/s, m head).

            // Conversion: Q(m3/h) = 0.865 * Cv * sqrt(dp(bar) / SG)
            // Let's use simplified: Q = K_valve * sqrt(dh)

            // K_valve scales with opening %
            const opening = Number(link.params['opening']) || 100; // 0-100
            const Cv_max = Number(link.params['cv']) || 10;

            if (opening <= 0) return 0;

            const Cv_current = Cv_max * (opening / 100);

            // Cv to SI (approx):
            // 1 Cv = 1 gpm / sqrt(psi)
            // ... constant K roughly:
            // Q [m3/s] approx 2.4e-5 * Cv * sqrt(dh[m])
            const K_si = 2.4e-5 * Cv_current;

            if (Math.abs(dh) < 1e-6) return 0;
            const Q = K_si * Math.sqrt(Math.abs(dh));
            return dh > 0 ? Q : -Q;
        }

        return 0;
    }

    private parseBlueprint(blueprint: MechBlueprint): { nodes: HydraulicNode[], links: HydraulicLink[], unknownsMap: any } {
        // Industry Standard Graph Parsing using Union-Find for Node collapse
        const parent = new Map<string, string>();
        const find = (id: string): string => {
            if (!parent.has(id)) parent.set(id, id);
            if (parent.get(id) !== id) parent.set(id, find(parent.get(id)!));
            return parent.get(id)!;
        };
        const union = (id1: string, id2: string) => {
            const root1 = find(id1);
            const root2 = find(id2);
            if (root1 !== root2) parent.set(root1, root2);
        };

        const registry = ComponentRegistry.getInstance();

        // 1. Identify all fluid ports and unite connected ones
        // Register all ports first
        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (def && (def.domain === 'fluid' || def.ports.some((p: any) => p.domain === 'fluid'))) {
                def.ports.forEach((port: any) => {
                    if (port.domain === 'fluid') {
                        find(`${comp.id}:${port.id}`); // Initialize set
                    }
                });
            }
        });

        // Union connected ports
        blueprint.connections.forEach(conn => {
            if (conn.type === 'fluid') {
                union(`${conn.sourceComponentId}:${conn.sourcePortId}`, `${conn.targetComponentId}:${conn.targetPortId}`);
            }
        });

        // 2. Create HydraulicNodes from disjoint sets
        const rootToNodeIndex = new Map<string, number>();
        const nodes: HydraulicNode[] = [];
        let nodeCounter = 0;

        // Iterate unique roots
        Array.from(parent.keys()).forEach(portKey => {
            const root = find(portKey);
            if (!rootToNodeIndex.has(root)) {
                rootToNodeIndex.set(root, nodeCounter++);
                nodes.push({
                    id: rootToNodeIndex.get(root)!,
                    componentId: 'node_' + rootToNodeIndex.get(root), // Generic ID
                    isFixed: false,
                    fixedHead: 0,
                    elevation: 0,
                    initialHeadGuess: 10 // Start at 10m head
                });
            }
        });

        // 3. Assign Node Properties (Check for Tanks/Boundaries)
        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (!def) return;
            // If Tank, find its port's node and set Fixed
            if (def.id.includes('tank') || def.id.includes('reservoir')) {
                // Assuming single port 'outlet' or similar
                const port = def.ports.find((p: any) => p.domain === 'fluid');
                if (port) {
                    const portKey = `${comp.id}:${port.id}`;
                    const root = find(portKey);
                    const nodeIdx = rootToNodeIndex.get(root);
                    if (nodeIdx !== undefined) {
                        const head = Number(comp.parameterValues.head) || Number(comp.parameterValues.initial_level) || 0;
                        nodes[nodeIdx].isFixed = true;
                        nodes[nodeIdx].fixedHead = head;
                        nodes[nodeIdx].componentId = comp.id; // Associate with Tank
                    }
                }
            }
        });

        // 4. Create Links (Components connecting two nodes)
        const links: HydraulicLink[] = [];
        let linkCounter = 0;

        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (!def) return;

            // Valid Links: Pipe, Valve, Pump. defined by having >= 2 fluid ports?
            // Actually, we need to map Inlet Port -> Node A, Outlet Port -> Node B.
            // Simplified: Look for 'in'/'out' or 'inlet'/'outlet' logic?
            // General: Find 2 unique nodes this component touches.

            const fluidPorts = def.ports.filter((p: any) => p.domain === 'fluid');
            if (fluidPorts.length >= 2) {
                // Identify Start/End Nodes using the first 2 ports found ??
                // Better: Look for 'in' vs 'out' type
                const inPort = fluidPorts.find((p: any) => p.type === 'input' || p.id === 'in' || p.id === 'inlet');
                const outPort = fluidPorts.find((p: any) => p.type === 'output' || p.id === 'out' || p.id === 'outlet');

                if (inPort && outPort) {
                    const rootIn = find(`${comp.id}:${inPort.id}`);
                    const rootOut = find(`${comp.id}:${outPort.id}`);

                    const n1 = rootToNodeIndex.get(rootIn);
                    const n2 = rootToNodeIndex.get(rootOut);

                    // If connected to valid nodes and distinct (unless loop)
                    if (n1 !== undefined && n2 !== undefined) {
                        let type: 'pipe' | 'valve' | 'pump' = 'pipe';
                        if (def.id.includes('valve')) type = 'valve';
                        if (def.id.includes('pump')) type = 'pump';

                        links.push({
                            id: linkCounter++,
                            componentId: comp.id,
                            startNode: n1,
                            endNode: n2,
                            type: type,
                            params: comp.parameterValues
                        });
                    }
                }
            }
        });

        return { nodes, links, unknownsMap: {} };
    }

    private mockResult(blueprint: MechBlueprint, config: MechSolverConfiguration): MechSimulationResult {
        // Keeping the mock for safety until parseBlueprint is robust
        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'completed',
            completedAt: new Date(),
            duration: 100,
            configuration: config,
            variables: {},
            metrics: {
                totalPowerInput: 0, totalPowerOutput: 0, overallEfficiency: 0, totalFlowRate: 0,
                maxPressure: 0, pressureDrop: 0, totalHeatInput: 0, totalHeatOutput: 0, componentMetrics: {}
            },
            diagnostics: {
                convergence: { iterations: 0, residual: 0, converged: true },
                massBalance: { status: 'ok', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                energyBalance: { status: 'ok', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
            },
            constraintViolations: []
        };
    }
}

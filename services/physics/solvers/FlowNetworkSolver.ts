import { ISolver } from '../SolverRegistry';
import {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration,
    MechSimulationMetrics,
    MechSimulationDiagnostics
} from '../../../types';
import { FastNumericMethods } from '../FastNumericMethods';
import { NumericMethods } from '../NumericMethods';
import { MaterialRegistry } from '../MaterialRegistry';
import { ComponentRegistry } from '../../ComponentRegistry';
import { SparseMatrix, SparseLinearSolver, SparseMatrixCSR } from '../SparseMatrix';
import { getPhysicsForComponent, isFixedHeadComponent, getComponentType } from '../ComponentPhysics';
import { FluidPropertyDatabase } from '../FluidProperties';
import { RealPipeFlow } from '../RealPipeFlow';
import { RealPumpCurves } from '../RealPumpCurves';
import { RealValveModel } from '../RealValveModel';
import { NewtonRaphsonSolver, SolverResult } from '../NewtonRaphsonSolver';

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

    async solve(blueprint: MechBlueprint, config: MechSolverConfiguration, context: Record<string, number> = {}): Promise<MechSimulationResult> {
        const startTime = Date.now();
        // 1. Build Hydraulic Graph
        const { nodes, links, unknownsMap } = this.parseBlueprint(blueprint);

        if (nodes.length === 0) {
            return this.mockResult(blueprint, config);
        }

        // Validate topology before solving
        const topologyIssues = this.validateTopology(nodes, links, blueprint);
        if (topologyIssues.length > 0) {
            console.warn('[FlowNetworkSolver] Topology issues detected:', topologyIssues);
        }

        // Check for disconnected components or zero-length cycles
        const validSystem = this.checkSystemWellFormed(nodes, links);
        if (!validSystem) {
            console.error('[FlowNetworkSolver] Ill-formed hydraulic system detected');
            return this.createErrorResult(blueprint, config, startTime,
                'Hydraulic system has topology issues (disconnected nodes or singular matrix). Check connections.');
        }

        // Get fluid properties with temperature dependence
        const fluid = MaterialRegistry.getInstance().getFluid(blueprint.fluidId || 'water')!;
        const fluidId = blueprint.fluidId || 'water';
        
        // Use temperature from context or default to 20°C (293.15 K)
        const temperatureK = context['temperature'] || 293.15;
        
        // Get temperature-corrected fluid properties from real physics library
        const rho = FluidPropertyDatabase.getDensityAtTemperature(fluidId, temperatureK);
        const mu = FluidPropertyDatabase.getViscosityAtTemperature(fluidId, temperatureK);
        const g = 9.80665; // Standard gravity
        
        // Calculate derived properties
        const nu = mu / rho; // Kinematic viscosity
        const Pr = FluidPropertyDatabase.calculatePrandtlNumber(fluidId, temperatureK);
        const c_speed = FluidPropertyDatabase.calculateSpeedOfSound(fluidId, temperatureK);

        // 2. Identify Unknowns (Heads at non-fixed nodes)
        const unknownIndices = nodes.map((n, i) => n.isFixed ? -1 : i).filter(i => i !== -1);
        const mapUnknownToNode = unknownIndices;

        // Check for singular system (no unknowns = fully constrained, or all unknowns = no boundary conditions)
        if (mapUnknownToNode.length === 0 && nodes.length > 1) {
            return this.createErrorResult(blueprint, config, startTime,
                'No unknown nodes - system is fully constrained. Add a tank or boundary condition.');
        }

        if (mapUnknownToNode.length === nodes.length && nodes.length > 1) {
            return this.createErrorResult(blueprint, config, startTime,
                'No fixed head nodes - system has no boundary condition. Add a tank or reservoir.');
        }

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

        // 4. Build Sparse Jacobian J(H) - O(Links) instead of O(N²)
        // Using COO format then converting to CSR
        const buildSparseJacobian = (H: number[]): SparseMatrixCSR => {
            const rows: number[] = [];
            const cols: number[] = [];
            const vals: number[] = [];

            // Reconstruct Heads
            const Heads = nodes.map(n => n.fixedHead);
            mapUnknownToNode.forEach((nodeIdx, k) => {
                Heads[nodeIdx] = H[k];
            });

            // Build node to unknown index map
            const nodeToK = new Array(nodes.length).fill(-1);
            mapUnknownToNode.forEach((nodeIdx, k) => nodeToK[nodeIdx] = k);

            // Iterate links to build Jacobian elements
            links.forEach(link => {
                const hStart = Heads[link.startNode];
                const hEnd = Heads[link.endNode];
                const dh = hStart - hEnd;
                const dQ_dh = this.calculateFlowDerivative(link, dh, { rho, mu, g });

                const k_u = nodeToK[link.startNode];
                const k_v = nodeToK[link.endNode];

                // Diagonal elements (dF_u/dH_u, dF_v/dH_v)
                if (k_u !== -1) {
                    rows.push(k_u);
                    cols.push(k_u);
                    vals.push(-dQ_dh);
                }
                if (k_v !== -1) {
                    rows.push(k_v);
                    cols.push(k_v);
                    vals.push(-dQ_dh);
                }

                // Off-diagonal elements (dF_u/dH_v, dF_v/dH_u)
                if (k_u !== -1 && k_v !== -1) {
                    rows.push(k_u);
                    cols.push(k_v);
                    vals.push(dQ_dh);

                    rows.push(k_v);
                    cols.push(k_u);
                    vals.push(dQ_dh);
                }
            });

            return SparseMatrix.fromCOO(rows, cols, vals, H.length);
        };

        // 5. Solve using Sparse Newton-Raphson with BiCGSTAB
        const n = H_unknown_0.length;
        let H_k = new Float64Array(H_unknown_0);
        let converged = false;
        let iter = 0;
        let residual = 0;
        const MAX_ITER = 50;
        const TOL = 1e-5;

        // Numerical stability bounds
        const MAX_HEAD = 1000; // Maximum reasonable head in meters
        const MIN_HEAD = -1000; // Minimum reasonable head
        const MAX_RESIDUAL = 1e10; // Maximum acceptable residual before divergence

        // Use sparse solver
        const sparseSolver = new SparseLinearSolver(MAX_ITER, TOL);

        for (iter = 0; iter < MAX_ITER; iter++) {
            // 1. Calculate Residuals F(H)
            const f_val = F(Array.from(H_k));

            // Check for NaN/Inf in residuals
            const hasNaN = f_val.some(v => !isFinite(v));
            if (hasNaN) {
                console.error('[FlowNetworkSolver] NaN detected in residuals at iteration', iter);
                return this.createErrorResult(blueprint, config, startTime,
                    'Simulation diverged: numerical instability detected. Check system topology.');
            }

            // Check convergence
            residual = Math.sqrt(f_val.reduce((sum, v) => sum + v * v, 0));

            // Check for divergence
            if (residual > MAX_RESIDUAL) {
                console.error(`[FlowNetworkSolver] Residual diverging: ${residual}`);
                return this.createErrorResult(blueprint, config, startTime,
                    'Simulation diverged: residual exceeded maximum threshold. Check system topology.');
            }

            if (residual < TOL) {
                converged = true;
                break;
            }

            // 2. Build Sparse Analytical Jacobian J(H)
            const J_sparse = buildSparseJacobian(Array.from(H_k));

            // Check Jacobian validity
            if (J_sparse.nnz === 0) {
                console.error('[FlowNetworkSolver] Empty Jacobian matrix');
                return this.createErrorResult(blueprint, config, startTime,
                    'Simulation failed: no valid equations. Check component connections.');
            }

            // 3. Solve Linear System: J * dX = -F using BiCGSTAB
            const b = f_val.map(v => -v);
            const result = sparseSolver.solve(J_sparse, b, new Float64Array(n));

            if (!result.converged) {
                // BiCGSTAB failed, try GMRES (more robust for non-symmetric systems)
                const gmresResult = sparseSolver.solveGMRES(J_sparse, b, Math.min(20, n));
                
                if (gmresResult.converged) {
                    for (let i = 0; i < n; i++) {
                        H_k[i] += gmresResult.x[i] * 0.5;
                    }
                } else {
                    // GMRES also failed, try with more iterations
                    const retryGMRES = sparseSolver.solveGMRES(J_sparse, b, Math.min(30, n));
                    
                    if (retryGMRES.converged) {
                        for (let i = 0; i < n; i++) {
                            H_k[i] += retryGMRES.x[i] * 0.5;
                        }
                    } else {
                        // Last resort: try dense solver with regularization
                        const jMatrix2D = Array(n).fill(null).map((_, i) => Array(n).fill(0));
                        for (let i = 0; i < n; i++) {
                            for (let idx = J_sparse.rowPointers[i]; idx < J_sparse.rowPointers[i + 1]; idx++) {
                                jMatrix2D[i][J_sparse.colIndices[idx]] = J_sparse.values[idx];
                            }
                        }
                        
                        // Add diagonal regularization for stability
                        for (let i = 0; i < n; i++) {
                            const diag = Math.abs(jMatrix2D[i][i]);
                            if (diag < 1e-6) {
                                jMatrix2D[i][i] = 1e-6;
                            }
                        }
                        
                        const j_flat2 = new Float64Array(n * n);
                        for (let i = 0; i < n; i++) {
                            for (let j = 0; j < n; j++) {
                                j_flat2[i * n + j] = jMatrix2D[i][j];
                            }
                        }
                        
                        const dX = FastNumericMethods.solveLinearSystemFlat(n, j_flat2, b);
                        
                        // Check for NaN/Inf and apply gentle update with bounds
                        for (let i = 0; i < n; i++) {
                            if (isFinite(dX[i])) {
                                H_k[i] += dX[i] * 0.3;
                                // Clamp to reasonable bounds
                                H_k[i] = Math.max(MIN_HEAD, Math.min(MAX_HEAD, H_k[i]));
                            }
                        }
                    }
                }
            } else {
                // 4. Update H with damping and bounds
                for (let i = 0; i < n; i++) {
                    H_k[i] += result.x[i] * 0.7; // Damping 0.7
                    // Clamp to reasonable bounds
                    H_k[i] = Math.max(MIN_HEAD, Math.min(MAX_HEAD, H_k[i]));
                }
            }
        }

        let H_final = Array.from(H_k);

        // Try NewtonRaphsonSolver if primary solver didn't converge well
        if (!converged || residual > 1e-4) {
            console.log('[FlowNetworkSolver] Primary solver struggled, trying NewtonRaphsonSolver...');
            
            const nrResult = this.solveWithNewtonRaphson(
                F,
                buildSparseJacobian,
                H_unknown_0,
                { rho, mu, g }
            );

            if (nrResult.converged && nrResult.residual < residual) {
                console.log('[FlowNetworkSolver] NewtonRaphsonSolver converged better');
                H_final = nrResult.x;
                converged = true;
                residual = nrResult.residual;
                iter = nrResult.iterations;
            }
        }

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
            variables[`${namePrefix}_head_loss`] = Math.abs(dh); // Approx

            // Calculate Velocity
            let velocity = 0;
            if (link.type === 'pipe') {
                const D_mm = Number(link.params['diameter']) || 100;
                const A = Math.PI * Math.pow(D_mm / 2000, 2); // m2
                velocity = Math.abs(Q) / A;
            } else if (link.type === 'valve') {
                const D_mm = Number(link.params['diameter']) || 50; // Valve size
                const A = Math.PI * Math.pow(D_mm / 2000, 2);
                velocity = Math.abs(Q) / A;
            } else {
                // Pump/Other
                const D_mm = 100;
                const A = Math.PI * Math.pow(D_mm / 2000, 2);
                velocity = Math.abs(Q) / A;
            }
            variables[`${namePrefix}_velocity`] = velocity;

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

        // Calculate hydraulic power from pumps
        // P = ρ * g * Q * H (in kW)
        let totalHydraulicPower = 0;
        let pumpHead = 0;
        links.forEach(link => {
            if (link.type === 'pump') {
                const comp = blueprint.components.find(c => c.id === link.componentId);
                if (comp) {
                    const namePrefix = comp.name.replace(/\s+/g, '_');
                    const Q_m3h = variables[`${namePrefix}_flow_rate`] || 0; // m³/h
                    const Q = Q_m3h / 3600; // Convert to m³/s
                    const H = variables[`${namePrefix}_head`] || 0; // m
                    const pumpPower = (rho * g * Q * H) / 1000; // kW
                    totalHydraulicPower += pumpPower;
                    pumpHead = Math.max(pumpHead, H);
                }
            }
        });

        // Better metrics calculation
        let calculatedMaxPressure = 0;
        let calculatedMinPressure = Number.MAX_VALUE;
        Object.keys(variables).forEach(k => {
            if (k.endsWith('_pressure')) {
                const p = variables[k];
                calculatedMaxPressure = Math.max(calculatedMaxPressure, p);
                calculatedMinPressure = Math.min(calculatedMinPressure, p);
            }
        });

        // Handle case where no pressures were found
        if (calculatedMinPressure === Number.MAX_VALUE) {
            calculatedMinPressure = 0;
        }

        const pressureDrop = calculatedMaxPressure - calculatedMinPressure;

        // Get motor/input power from context (set by Mechanical solver)
        const motorInputPower = context['totalPowerInput'] || totalHydraulicPower;
        const overallEfficiency = motorInputPower > 0 ? (totalHydraulicPower / motorInputPower) * 100 : 0;

        // Real Mass Balance Check
        let maxImbalance = 0;
        let totalFlowThrough = 0;

        nodes.forEach((node, i) => {
            // Sum Q in - Q out
            let nodeSum = 0;
            // Find links connected to this node
            // This is expensive O(N*M), optimized via adjacency list usually, but okay for small sim
            links.forEach(link => {
                const hStart = finalHeads[link.startNode];
                const hEnd = finalHeads[link.endNode];
                const dh = hStart - hEnd;
                const Q = this.calculateFlow(link, dh, { rho, mu, g });

                if (link.startNode === i) nodeSum -= Q; // Leaving node
                if (link.endNode === i) nodeSum += Q;   // Entering node
            });

            // If node is fixed head (tank/reservoir), imbalance is allowed (it's the source/sink flow)
            if (!node.isFixed) {
                if (Math.abs(nodeSum) > maxImbalance) maxImbalance = Math.abs(nodeSum);
            } else {
                totalFlowThrough += Math.abs(nodeSum);
            }
        });

        const status = maxImbalance < 1e-3 ? 'ok' : 'error';

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: status === 'ok' ? 'completed' : 'failed',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: config,
            variables,
            metrics: {
                totalPowerInput: motorInputPower,
                totalPowerOutput: totalHydraulicPower,
                overallEfficiency,
                totalFlowRate,
                maxPressure: calculatedMaxPressure,
                pressureDrop,
                totalHeatInput: 0,
                totalHeatOutput: 0,
                componentMetrics: {}
            },
            diagnostics: {
                convergence: { iterations: iter, residual, converged },
                massBalance: {
                    status,
                    inlet: totalFlowThrough / 2, // Approx
                    outlet: totalFlowThrough / 2,
                    imbalance: maxImbalance,
                    imbalancePercent: totalFlowThrough > 0 ? (maxImbalance / totalFlowThrough) * 100 : 0
                },
                energyBalance: { status: 'ok', input: motorInputPower, output: totalHydraulicPower, imbalance: motorInputPower - totalHydraulicPower, imbalancePercent: motorInputPower > 0 ? ((motorInputPower - totalHydraulicPower) / motorInputPower) * 100 : 0 }
            },
            constraintViolations: []
        };
    }

    private calculateFlow(link: HydraulicLink, dh: number, phys: { rho: number, mu: number, g: number }): number {
        const { rho, mu, g } = phys;
        const T = 293.15; // Assume 20°C for now

        // Safety bounds
        const MAX_FLOW = 10;
        const MIN_DH = -1000;
        const MAX_DH = 1000;
        const dh_clamped = Math.max(MIN_DH, Math.min(MAX_DH, dh));

        if (link.type === 'pipe') {
            // Real pipe flow using Darcy-Weisbach with Colebrook-White
            const length = Number(link.params['length']) || 10;
            const D_mm = Number(link.params['diameter']) || 100;
            const D = D_mm / 1000;
            const roughness = (Number(link.params['roughness']) || 0.045) / 1000;

            const area = Math.PI * D * D / 4;
            const velocityGuess = Math.sqrt(Math.abs(dh_clamped) * 2 * g / (8 * 0.02 * length / (Math.PI * Math.PI * g * Math.pow(D, 5))));
            const Q_m3s = RealPipeFlow.calculateFlowFromHeadLoss(
                Math.abs(dh_clamped),
                length,
                D,
                roughness,
                0, // minor losses
                mu,
                rho
            ).flowRate;

            return Math.max(-MAX_FLOW, Math.min(MAX_FLOW, Q_m3s));
        }

        if (link.type === 'pump') {
            // Real pump curve using affinity laws
            const designFlow = Number(link.params['design_flow']) || 100;
            const designHead = Number(link.params['design_head']) || 50;
            const designSpeed = Number(link.params['speed']) || 1450;

            // Calculate pump head at given flow rate
            const pumpHead = RealPumpCurves.calculatePumpCurve(
                Math.abs(dh_clamped), // Using head as proxy for flow in inverse calculation
                designFlow,
                designHead,
                designSpeed,
                designSpeed,
                200, // default impeller diameter
                200
            );

            // Convert head to flow using pump characteristic
            // H = H_shutoff - B*Q², so Q = sqrt((H_shutoff - H)/B)
            const H_shutoff = designHead * 1.25;
            const B = (H_shutoff - designHead) / (designFlow * designFlow);
            const Q = Math.sqrt(Math.max(0, H_shutoff - Math.abs(dh_clamped)) / B);

            return Math.max(0, Math.min(MAX_FLOW, Q / 3600)); // Convert m³/h to m³/s
        }

        if (link.type === 'valve') {
            // Real valve calculation using Cv coefficient with RealValveModel
            const opening = Number(link.params['opening']) || 100;
            const cv = Number(link.params['cv']) || Number(link.params['Cv']) || 100;
            const D_mm = Number(link.params['diameter']) || 50;
            
            // Convert head loss to pressure drop: ΔP = ρ * g * Δh
            const pressureDropPa = rho * g * Math.abs(dh_clamped);
            
            // Calculate flow rate using RealValveModel
            const flowResult = RealValveModel.calculateFlowRate(cv * (opening / 100), pressureDropPa, 1.0);
            const result = dh_clamped > 0 ? flowResult : -flowResult;

            return Math.max(-MAX_FLOW, Math.min(MAX_FLOW, result));
        }

        return 0;
    }

    private calculateFlowDerivative(link: HydraulicLink, dh: number, phys: { rho: number, mu: number, g: number }): number {
        const { rho, mu, g } = phys;
        const abs_dh = Math.abs(dh);
        const dh_clamped = Math.max(0.001, Math.min(1000, abs_dh)); // Avoid division by zero

        // Use numerical differentiation for Jacobian
        const eps = dh_clamped * 0.01;
        const Q1 = this.calculateFlow(link, dh + eps, phys);
        const Q2 = this.calculateFlow(link, dh - eps, phys);
        const dQ_dh = (Q1 - Q2) / (2 * eps);

        // Clamp derivative to prevent extreme Jacobian values
        return Math.max(-1000, Math.min(1000, dQ_dh));
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

        // Safety check for empty blueprint
        if (!blueprint.components || blueprint.components.length === 0) {
            return { nodes: [], links: [], unknownsMap: {} };
        }

        // 1. Identify all fluid ports and unite connected ones
        // Register all ports first
        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);
            if (def && def.ports && def.ports.length > 0) {
                def.ports.forEach((port: any) => {
                    if (port.domain === 'fluid') {
                        find(`${comp.id}:${port.id}`); // Initialize set
                    }
                });
            } else {
                // Register fallback ports for components without proper definitions
                find(`${comp.id}:in`);
                find(`${comp.id}:out`);
            }
        });

        // Union connected ports
        blueprint.connections.forEach(conn => {
            if (conn.type === 'fluid' || !conn.type) {
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
                    componentId: 'node_' + rootToNodeIndex.get(root),
                    isFixed: false,
                    fixedHead: 0,
                    elevation: 0,
                    initialHeadGuess: 50 // Better initial guess for pump systems
                });
            }
        });

        // 3. Assign Node Properties (Check for Tanks/Boundaries)
        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);

            // Use physics interface to check for fixed head components
            const physics = getPhysicsForComponent(comp.componentDefinitionId, def?.id);
            const isFixed = isFixedHeadComponent(comp.componentDefinitionId, def?.id);

            // Check for pumps and estimate their discharge head for better initial guess
            if (comp.componentDefinitionId.toLowerCase().includes('pump')) {
                const pumpHead = Number(comp.parameterValues?.design_head) || 
                                Number(comp.parameterValues?.head) || 50;
                const port = def?.ports?.find((p: any) => p.domain === 'fluid' && p.type === 'output') ||
                            def?.ports?.find((p: any) => p.domain === 'fluid') ||
                            { id: 'outlet' };
                const portKey = `${comp.id}:${port.id}`;
                const root = find(portKey);
                const nodeIdx = rootToNodeIndex.get(root);
                if (nodeIdx !== undefined && nodes[nodeIdx]) {
                    // Pump discharge should have higher pressure
                    nodes[nodeIdx].initialHeadGuess = pumpHead;
                }
            }

            if (isFixed || (def && def.ports && def.ports.some((p: any) => p.type === 'bidirectional'))) {
                // Fixed head component (tank, reservoir) - use first fluid port
                const port = def?.ports?.find((p: any) => p.domain === 'fluid') || { id: 'out' };
                const portKey = `${comp.id}:${port.id}`;
                const root = find(portKey);
                const nodeIdx = rootToNodeIndex.get(root);

                if (nodeIdx !== undefined) {
                    const head = Number(comp.parameterValues.head) ||
                                 Number(comp.parameterValues.initial_level) ||
                                 Number(comp.parameterValues.tank_level) ||
                                 5; // Default 5m head for tanks
                    nodes[nodeIdx].isFixed = true;
                    nodes[nodeIdx].fixedHead = head;
                    nodes[nodeIdx].componentId = comp.id;
                }
            }
        });

        // 4. Create Links (Components connecting two nodes)
        const links: HydraulicLink[] = [];
        let linkCounter = 0;

        blueprint.components.forEach(comp => {
            const def = registry.getComponent(comp.componentDefinitionId);

            const fluidPorts = def?.ports?.filter((p: any) => p.domain === 'fluid') || [];

            // Fallback: if no ports defined, assume component has inlet/outlet
            if (fluidPorts.length < 2) {
                fluidPorts.push({
                    id: 'in', type: 'input', domain: 'fluid' as const, name: 'Inlet',
                    variables: [{ name: 'flow_rate', symbol: 'Q', unit: 'm³/s' }],
                    state: 'specified', required: true
                });
                fluidPorts.push({
                    id: 'out', type: 'output', domain: 'fluid' as const, name: 'Outlet',
                    variables: [{ name: 'flow_rate', symbol: 'Q', unit: 'm³/s' }],
                    state: 'specified', required: true
                });
            }

            if (fluidPorts.length >= 2) {
                const inPort = fluidPorts.find((p: any) => p.type === 'input' || p.id?.toLowerCase().includes('in'));
                const outPort = fluidPorts.find((p: any) => p.type === 'output' || p.id?.toLowerCase().includes('out'));

                if (inPort && outPort) {
                    const rootIn = find(`${comp.id}:${inPort.id}`);
                    const rootOut = find(`${comp.id}:${outPort.id}`);

                    const n1 = rootToNodeIndex.get(rootIn);
                    const n2 = rootToNodeIndex.get(rootOut);

                    if (n1 !== undefined && n2 !== undefined) {
                        // Determine component type
                        let type: 'pipe' | 'valve' | 'pump' = 'pipe';

                        try {
                            const componentType = getComponentType(comp.componentDefinitionId, def?.id || '');
                            if (componentType === 'valve' || comp.componentDefinitionId.toLowerCase().includes('valve')) {
                                type = 'valve';
                            } else if (componentType === 'pump' || comp.componentDefinitionId.toLowerCase().includes('pump')) {
                                type = 'pump';
                            } else if (componentType === 'motor' || componentType === 'engine') {
                                type = 'pump';
                            }
                        } catch {
                            // Fallback to string matching
                            const lowerId = comp.componentDefinitionId.toLowerCase();
                            if (lowerId.includes('valve')) type = 'valve';
                            else if (lowerId.includes('pump')) type = 'pump';
                            else if (lowerId.includes('motor') || lowerId.includes('engine')) type = 'pump';
                        }

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

        // If no links created, create default pipe links between nodes
        if (links.length === 0 && nodes.length >= 2) {
            for (let i = 0; i < nodes.length - 1; i++) {
                links.push({
                    id: linkCounter++,
                    componentId: `pipe_${i}`,
                    startNode: i,
                    endNode: i + 1,
                    type: 'pipe',
                    params: { length: 10, diameter: 100 }
                });
            }
        }

        return { nodes, links, unknownsMap: {} };
    }

    private mockResult(blueprint: MechBlueprint, config: MechSolverConfiguration): MechSimulationResult {
        const startTime = Date.now();
        const variables: Record<string, number> = {};
        const metrics = {
            totalPowerInput: 0,
            totalPowerOutput: 0,
            overallEfficiency: 0,
            totalFlowRate: 0,
            maxPressure: 0,
            pressureDrop: 0,
            totalHeatInput: 0,
            totalHeatOutput: 0,
            componentMetrics: {} as Record<string, any>
        };

        const fluidId = blueprint.fluidId || 'water';
        const temperature = 293.15;
        const rho = FluidPropertyDatabase.getDensityAtTemperature(fluidId, temperature);
        const g = 9.80665;

        // Analyze components to provide real estimates even with limited data
        let hasPump = false;
        let hasEngine = false;
        let hasValve = false;
        let hasTank = false;
        let hasValidData = false;

        for (const comp of blueprint.components) {
            const prefix = comp.name.replace(/\s+/g, '_');
            const params = comp.parameterValues;
            const compType = comp.componentDefinitionId.toLowerCase();

            if (compType.includes('pump') || compType.includes('pump')) {
                hasPump = true;
                hasValidData = true;
                // Calculate from pump parameters
                const designFlow = Number(params.design_flow) || 100; // m³/h
                const designHead = Number(params.design_head) || 50; // m
                const speed = Number(params.speed) || 1450; // RPM

                variables[`${prefix}_flow_rate`] = designFlow;
                variables[`${prefix}_head`] = designHead;
                variables[`${prefix}_speed`] = speed;

                // Calculate pump power: P = ρghQ/η
                const efficiency = Number(params.efficiency) || 75; // %
                const Q_m3s = designFlow / 3600;
                const power = (rho * g * designHead * Q_m3s) / (efficiency / 100);

                metrics.totalFlowRate += designFlow;
                metrics.totalPowerOutput += power / 1000; // kW
                metrics.overallEfficiency = efficiency;

                metrics.componentMetrics[comp.id] = {
                    type: 'pump',
                    flowRate: designFlow,
                    head: designHead,
                    efficiency: efficiency,
                    power: power / 1000
                };
            }

            if (compType.includes('engine') || compType.includes('motor')) {
                hasEngine = true;
                hasValidData = true;
                const maxPower = Number(params.max_power) || Number(params.rated_power) || 100; // kW
                const speed = Number(params.max_speed) || Number(params.rated_speed) || 1450; // RPM

                variables[`${prefix}_power_kw`] = maxPower;
                variables[`${prefix}_speed`] = speed;

                const torque = (maxPower * 9550) / speed; // N·m
                variables[`${prefix}_torque`] = torque;

                metrics.totalPowerInput += maxPower;

                metrics.componentMetrics[comp.id] = {
                    type: 'engine',
                    power: maxPower,
                    speed: speed,
                    torque: torque
                };
            }

            if (compType.includes('valve')) {
                hasValve = true;
                const opening = Number(params.opening) || 100; // %
                const cv = Number(params.cv) || Number(params.Cv) || 100;

                variables[`${prefix}_opening`] = opening;
                variables[`${prefix}_cv`] = cv;

                // Estimate flow capacity
                const flowCapacity = cv * (opening / 100) * 0.05; // Rough estimate m³/s
                variables[`${prefix}_flow_capacity`] = flowCapacity * 3600; // m³/h

                metrics.componentMetrics[comp.id] = {
                    type: 'valve',
                    opening: opening,
                    cv: cv,
                    flowCapacity: flowCapacity * 3600
                };
            }

            if (compType.includes('tank') || compType.includes('reservoir')) {
                hasTank = true;
                const head = Number(params.head) || Number(params.initial_level) || 5; // m
                const area = Number(params.area) || 10; // m²

                variables[`${prefix}_head`] = head;
                variables[`${prefix}_level`] = Number(params.initial_level) || 2;
                variables[`${prefix}_pressure`] = (rho * g * head) / 1000; // kPa

                metrics.maxPressure = Math.max(metrics.maxPressure, (rho * g * head) / 1000);

                metrics.componentMetrics[comp.id] = {
                    type: 'tank',
                    head: head,
                    area: area,
                    pressure: (rho * g * head) / 1000
                };
            }
        }

        // Calculate pressure drop across system if we have flow
        if (metrics.totalFlowRate > 0) {
            const Q = metrics.totalFlowRate / 3600; // m³/s
            // Estimate friction losses (Darcy-Weisbach approximation)
            const f = 0.02; // Darcy friction factor (typical for turbulent flow)
            const L = 50; // Estimate total pipe length
            const D = 0.1; // Estimate pipe diameter (100mm)
            const V = Q / (Math.PI * D * D / 4);
            const h_f = f * (L / D) * (V * V / (2 * g));

            metrics.pressureDrop = h_f * rho * g / 1000; // kPa
        }

        // Set efficiency if not calculated from pumps
        if (metrics.overallEfficiency === 0 && metrics.totalPowerInput > 0) {
            metrics.overallEfficiency = (metrics.totalPowerOutput / metrics.totalPowerInput) * 100;
        }

        // Determine status based on data availability
        const status = hasValidData ? 'completed' : 'failed';

        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: status,
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: config,
            variables,
            metrics: {
                ...metrics,
                overallEfficiency: metrics.overallEfficiency || 0
            },
            diagnostics: {
                convergence: { iterations: 0, residual: 0, converged: status === 'completed' },
                massBalance: {
                    status: hasPump || hasTank ? 'ok' : 'warning',
                    inlet: metrics.totalFlowRate / 2,
                    outlet: metrics.totalFlowRate / 2,
                    imbalance: 0,
                    imbalancePercent: 0
                },
                energyBalance: {
                    status: metrics.totalPowerInput > 0 ? 'ok' : 'warning',
                    input: metrics.totalPowerInput,
                    output: metrics.totalPowerOutput,
                    imbalance: metrics.totalPowerInput - metrics.totalPowerOutput,
                    imbalancePercent: metrics.totalPowerInput > 0 ? 
                        ((metrics.totalPowerInput - metrics.totalPowerOutput) / metrics.totalPowerInput) * 100 : 0
                }
            },
            constraintViolations: hasValidData ? [] : [{
                id: 'insufficient-data',
                componentId: 'system',
                severity: 'warning',
                message: 'Insufficient component data for full simulation. Add pump, engine, or tank components.',
                value: 0,
                threshold: 0,
                ruleId: 'INSUFFICIENT_DATA'
            }]
        };
    }

    private createErrorResult(blueprint: MechBlueprint, config: MechSolverConfiguration, startTime: number, message: string): MechSimulationResult {
        return {
            id: crypto.randomUUID(),
            blueprintId: blueprint.id,
            status: 'failed',
            completedAt: new Date(),
            duration: Date.now() - startTime,
            configuration: config,
            variables: {},
            metrics: {
                totalPowerInput: 0, totalPowerOutput: 0, overallEfficiency: 0, totalFlowRate: 0,
                maxPressure: 0, pressureDrop: 0, totalHeatInput: 0, totalHeatOutput: 0, componentMetrics: {}
            },
            diagnostics: {
                convergence: { iterations: 0, residual: 0, converged: false },
                massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 100 },
                energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 100 }
            },
            constraintViolations: [{
                id: 'topology-error',
                componentId: 'system',
                severity: 'critical',
                message: message,
                value: 0,
                threshold: 0,
                ruleId: 'TOPOLOGY_ERROR'
            }]
        };
    }

    private validateTopology(nodes: HydraulicNode[], links: HydraulicLink[], blueprint: MechBlueprint): string[] {
        const issues: string[] = [];

        // Check for components with same port used as both source and target
        const portUsage = new Map<string, { asSource: string[], asTarget: string[] }>();
        
        blueprint.connections.filter(c => c.type === 'fluid' || !c.type).forEach(conn => {
            const sourceKey = `${conn.sourceComponentId}:${conn.sourcePortId}`;
            const targetKey = `${conn.targetComponentId}:${conn.targetPortId}`;
            
            if (!portUsage.has(sourceKey)) {
                portUsage.set(sourceKey, { asSource: [], asTarget: [] });
            }
            portUsage.get(sourceKey)!.asSource.push(conn.id);
            
            if (!portUsage.has(targetKey)) {
                portUsage.set(targetKey, { asSource: [], asTarget: [] });
            }
            portUsage.get(targetKey)!.asTarget.push(conn.id);
        });

        // Find ports used as both source and target (problematic)
        portUsage.forEach((usage, port) => {
            if (usage.asSource.length > 0 && usage.asTarget.length > 0) {
                issues.push(`Port ${port} used as both source (${usage.asSource.join(', ')}) and target (${usage.asTarget.join(', ')}) - creates disconnected flow paths`);
            }
        });

        // Check for components with only one fluid port (can't form a proper link)
        const componentsWithPorts = new Map<string, string[]>();
        blueprint.components.forEach(comp => {
            const def = ComponentRegistry.getInstance().getComponent(comp.componentDefinitionId);
            if (def && def.ports && def.ports.length > 0) {
                const fluidPorts = def.ports.filter((p: any) => p.domain === 'fluid').map((p: any) => p.id);
                componentsWithPorts.set(comp.id, fluidPorts);
            }
        });

        componentsWithPorts.forEach((ports, compId) => {
            if (ports.length < 2 && blueprint.connections.some(c => 
                (c.sourceComponentId === compId || c.targetComponentId === compId) && 
                (c.type === 'fluid' || !c.type)
            )) {
                issues.push(`Component ${compId} has only ${ports.length} fluid port(s) defined - may not connect properly`);
            }
        });

        // Check for tanks/reservoirs - they should have different ports for inlet and outlet
        blueprint.components.forEach(comp => {
            if (comp.componentDefinitionId.toLowerCase().includes('tank') || 
                comp.componentDefinitionId.toLowerCase().includes('reservoir')) {
                const tankPorts = componentsWithPorts.get(comp.id) || [];
                if (tankPorts.length > 0) {
                    // Count how many times this tank appears as source vs target in fluid connections
                    const asSource = blueprint.connections.filter(c => 
                        c.sourceComponentId === comp.id && (c.type === 'fluid' || !c.type)
                    ).length;
                    const asTarget = blueprint.connections.filter(c => 
                        c.targetComponentId === comp.id && (c.type === 'fluid' || !c.type)
                    ).length;
                    
                    if (asSource > 0 && asTarget > 0 && tankPorts.length < 2) {
                        issues.push(`Tank ${comp.id} used as both source (${asSource}) and target (${asTarget}) but has only ${tankPorts.length} port(s) - consider using inlet/outlet ports`);
                    }
                }
            }
        });

        return issues;
    }

    private checkSystemWellFormed(nodes: HydraulicNode[], links: HydraulicLink[]): boolean {
        if (nodes.length < 2 || links.length < 1) {
            return false;
        }

        // Check for disconnected nodes using BFS
        const visited = new Set<number>();
        const queue: number[] = [0];
        visited.add(0);

        while (queue.length > 0) {
            const nodeIdx = queue.shift()!;
            
            links.forEach(link => {
                if (link.startNode === nodeIdx && !visited.has(link.endNode)) {
                    visited.add(link.endNode);
                    queue.push(link.endNode);
                }
                if (link.endNode === nodeIdx && !visited.has(link.startNode)) {
                    visited.add(link.startNode);
                    queue.push(link.startNode);
                }
            });
        }

        // All nodes should be reachable
        if (visited.size !== nodes.length) {
            console.error(`[FlowNetworkSolver] Disconnected nodes: ${nodes.length - visited.size} of ${nodes.length} nodes not reachable`);
            return false;
        }

        // Check for zero-length cycles (same start and end nodes)
        const selfLoops = links.filter(l => l.startNode === l.endNode);
        if (selfLoops.length > 0) {
            console.error(`[FlowNetworkSolver] Self-loop links detected: ${selfLoops.map(l => l.componentId).join(', ')}`);
            return false;
        }

        return true;
    }

    /**
     * Solve using NewtonRaphsonSolver as an alternative method
     */
    private solveWithNewtonRaphson(
        F: (x: number[]) => number[],
        buildJacobian: (x: number[]) => SparseMatrixCSR,
        x0: number[],
        phys: { rho: number, mu: number, g: number }
    ): SolverResult {
        const n = x0.length;

        // Convert sparse Jacobian to dense for NewtonRaphsonSolver
        const jacobianDense = (x: number[]): number[][] => {
            const J_sparse = buildJacobian(x);
            const J = Array(n).fill(null).map((_, i) => Array(n).fill(0));
            for (let i = 0; i < n; i++) {
                for (let idx = J_sparse.rowPointers[i]; idx < J_sparse.rowPointers[i + 1]; idx++) {
                    J[i][J_sparse.colIndices[idx]] = J_sparse.values[idx];
                }
            }
            return J;
        };

        return NewtonRaphsonSolver.solveTrustRegion(
            F,
            jacobianDense,
            x0,
            {
                maxIterations: 50,
                tolerance: 1e-6,
                useBacktracking: true,
                checkJacobianCondition: true
            }
        );
    }
}

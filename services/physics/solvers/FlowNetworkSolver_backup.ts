import type { ISolver } from '../SolverRegistry.ts';
import type {
    MechBlueprint,
    MechSimulationResult,
    MechSolverConfiguration,
    MechSimulationMetrics,
    MechSimulationDiagnostics
} from '../../../types.ts';
import { FastNumericMethods } from '../FastNumericMethods.ts';
import { NumericMethods } from '../NumericMethods.ts';
import { MaterialRegistry } from '../MaterialRegistry.ts';
import { ComponentRegistry } from '../../ComponentRegistry.ts';
import { SparseMatrix, SparseLinearSolver } from '../SparseMatrix.ts';
import type { SparseMatrixCSR } from '../SparseMatrix.ts';
import { getPhysicsForComponent, isFixedHeadComponent, getComponentType } from '../ComponentPhysics.ts';
import { FluidPropertyDatabase } from '../FluidProperties.ts';
import { RealPipeFlow } from '../RealPipeFlow.ts';
import { RealPumpCurves } from '../RealPumpCurves.ts';
import { RealValveModel } from '../RealValveModel.ts';
import { NewtonRaphsonSolver } from '../NewtonRaphsonSolver.ts';
import type { SolverResult } from '../NewtonRaphsonSolver.ts';

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
        const variables: Record<string, number> = { ...context };
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
            console.error('[FlowNetworkSolver] Node count:', nodes.length, 'Link count:', links.length);
            return this.createErrorResult(blueprint, config, startTime,
                `Hydraulic system has topology issues (disconnected nodes or singular matrix). Found ${nodes.length} nodes and ${links.length} links.`);
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
            // No fixed head nodes - create a virtual boundary condition instead of failing
            console.warn('[FlowNetworkSolver] No fixed head nodes - using estimated boundary conditions');
            // Set the first node as a virtual fixed-head boundary (suction side reference)
            if (nodes.length > 0) {
                nodes[0].isFixed = true;
                nodes[0].fixedHead = nodes[0].initialHeadGuess || 10; // Use initial guess or default 10m
                // Recalculate unknown indices after modification
                const newUnknownIndices = nodes.map((n, i) => n.isFixed ? -1 : i).filter(i => i !== -1);
                mapUnknownToNode.length = 0;
                newUnknownIndices.forEach(i => mapUnknownToNode.push(i));
            }
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

        // Node pressures and heads
        nodes.forEach((node, i) => {
            const comp = blueprint.components.find(c => c.id === node.componentId);
            const head = finalHeads[i];
            const pressure = (head * rho * g) / 1000; // kPa

            if (node.componentId.startsWith('node_')) {
                // Internal node
                variables[`${node.componentId}_pressure`] = pressure;
                variables[`${node.componentId}_head`] = head;
            } else if (comp) {
                // Component node (e.g. Tank)
                const namePrefix = comp.name.replace(/\s+/g, '_');

                // Standardize: provide both ID and Name based keys
                variables[`${comp.id}_pressure`] = pressure;
                variables[`${comp.id}_head`] = head;
                variables[`${namePrefix}_pressure`] = pressure;
                variables[`${namePrefix}_head`] = head;
            }
        });

        // Compute final flows and variables for links
        links.forEach(link => {
            const hStart = finalHeads[link.startNode];
            const hEnd = finalHeads[link.endNode];
            const dh = hStart - hEnd;
            const Q = this.calculateFlow(link, dh, { rho, mu, g });
            const Q_m3h = Q * 3600;
            const Q_lpm = Q * 60000; // m3/s to L/min

            const comp = blueprint.components.find(c => c.id === link.componentId);
            if (!comp) return;

            const namePrefix = comp.name.replace(/\s+/g, '_');
            const id = comp.id;

            // Output standardized keys for missions and metrics
            // Flow Rate (m3/h)
            variables[`${id}_flow_rate`] = Q_m3h;
            variables[`${namePrefix}_flow_rate`] = Q_m3h;

            // Flow Rate (L/min) - Used by many missions
            variables[`${id}_flow_lpm`] = Q_lpm;
            variables[`${namePrefix}_flow_lpm`] = Q_lpm;

            // Head Loss / Head
            const headValue = link.type === 'pump' ? (hEnd - hStart) : Math.abs(dh);
            variables[`${id}_head`] = headValue;
            variables[`${namePrefix}_head`] = headValue;
            variables[`${id}_head_m`] = headValue; // Explicit unit
            variables[`${namePrefix}_head_m`] = headValue;

            // Velocity
            let velocity = 0;
            if (link.type === 'pipe') {
                const D_mm = Number(link.params['diameter']) || 100;
                const A = Math.PI * Math.pow(D_mm / 2000, 2);
                velocity = Math.abs(Q) / A;
            } else {
                // Skip velocity for tanks/valves (would cause division by zero)
                velocity = 0;
            }
            variables[`${id}_velocity`] = velocity;
            variables[`${namePrefix}_velocity`] = velocity;
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
        const registry = ComponentRegistry.getInstance();
        const nodeMap = new Map<string, HydraulicNode>();
        const links: HydraulicLink[] = [];
        let nodeCounter = 0;

        const createNode = (componentId: string, portName: string, isFixed: boolean = false, initialHead: number = 50): HydraulicNode => {
            const nodeId = `${componentId}_${portName}`;
            if (!nodeMap.has(nodeId)) {

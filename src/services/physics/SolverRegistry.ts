import { SolverConfiguration, SolverMethod, SimulationResult, Blueprint } from '../../types/mech-saf-2.0';

export interface ISolver {
    solve(blueprint: Blueprint, config: SolverConfiguration): Promise<SimulationResult>;
}

export class SolverRegistry {
    private static instance: SolverRegistry;
    private solvers: Map<SolverMethod, ISolver> = new Map();

    private constructor() { }

    public static getInstance(): SolverRegistry {
        if (!SolverRegistry.instance) {
            SolverRegistry.instance = new SolverRegistry();
        }
        return SolverRegistry.instance;
    }

    public registerSolver(method: SolverMethod, solver: ISolver): void {
        this.solvers.set(method, solver);
    }

    public getSolver(method: SolverMethod): ISolver {
        const solver = this.solvers.get(method);
        if (!solver) {
            throw new Error(`Solver method ${method} not registered.`);
        }
        return solver;
    }

    public async runSimulation(blueprint: Blueprint, config: SolverConfiguration): Promise<SimulationResult> {
        const solver = this.getSolver(config.method);

        const startTime = Date.now();
        try {
            const result = await solver.solve(blueprint, config);
            return {
                ...result,
                duration: Date.now() - startTime
            };
        } catch (error: any) {
            return {
                id: crypto.randomUUID(),
                blueprintId: blueprint.id,
                configurationId: undefined, // todo
                status: 'failed',
                completedAt: new Date(),
                duration: Date.now() - startTime,
                configuration: config,
                variables: {},
                metrics: this.getEmptyMetrics(),
                diagnostics: {
                    convergence: { iterations: 0, residual: 0, converged: false },
                    massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                    energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 }
                },
                constraintViolations: [{ message: error.message }]
            };
        }
    }

    private getEmptyMetrics() {
        return {
            totalPowerInput: 0,
            totalPowerOutput: 0,
            overallEfficiency: 0,
            totalFlowRate: 0,
            maxPressure: 0,
            pressureDrop: 0,
            totalHeatInput: 0,
            totalHeatOutput: 0,
            componentMetrics: {}
        };
    }
}

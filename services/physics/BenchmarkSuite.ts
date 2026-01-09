/**
 * Performance Benchmark Suite for Eldoria Physics Engine
 * 
 * Run with: npx ts-node services/physics/BenchmarkSuite.ts
 * Or include in test suite for CI regression testing.
 */

import type { MechBlueprint, MechComponentInstance, MechConnection, MechanicalDomain } from '../../types.ts';
import { ComponentRegistry } from '../ComponentRegistry.ts';
import { SimulationService } from './SimulationService.ts';
import { DynamicSimulationService } from './DynamicSimulationService.ts';
import { FlowNetworkSolver } from './solvers/FlowNetworkSolver.ts';
import { SparseMatrix, SparseLinearSolver } from './SparseMatrix.ts';

interface BenchmarkResult {
    name: string;
    componentCount: number;
    duration: number;
    memoryUsed: number;
    converged: boolean;
    iterations: number;
    residual: number;
}

interface BenchmarkConfig {
    name: string;
    componentCount: number;
    pipeCount: number;
    pumpCount: number;
    tankCount: number;
    description: string;
}

class PhysicsBenchmarkSuite {
    private results: BenchmarkResult[] = [];
    private readonly ITERATIONS = 3; // Run each benchmark multiple times

    /**
     * Generate a synthetic pump-pipe network blueprint
     */
    private generateNetworkBlueprint(config: BenchmarkConfig): MechBlueprint {
        const registry = ComponentRegistry.getInstance();
        const components: MechComponentInstance[] = [];
        const connections: MechConnection[] = [];
        
        let compCounter = 0;
        const nodeIds: string[] = [];
        const linkIds: string[] = [];

        // Create tanks (fixed head boundaries)
        for (let i = 0; i < config.tankCount; i++) {
            const tankId = `tank_${compCounter++}`;
            components.push({
                id: tankId,
                componentDefinitionId: 'fluid.tank.cylindrical',
                name: `Tank_${i}`,
                position: { x: 100 + i * 200, y: 100 },
                rotation: 0,
                parameterValues: {
                    diameter: 2000,
                    height: 3000,
                    initial_level: 2000,
                    head: 20
                },
                isSelected: false,
                groupIds: []
            });
            nodeIds.push(tankId);
        }

        // Create pumps
        for (let i = 0; i < config.pumpCount; i++) {
            const pumpId = `pump_${compCounter++}`;
            components.push({
                id: pumpId,
                componentDefinitionId: 'fluid.pump.centrifugal',
                name: `Pump_${i}`,
                position: { x: 100 + i * 300, y: 300 },
                rotation: 0,
                parameterValues: {
                    design_flow: 100,
                    design_head: 50,
                    eta_BEP: 0.78,
                    rated_speed: 1450,
                    NPSHr: 4.0
                },
                isSelected: false,
                groupIds: []
            });
            linkIds.push(pumpId);
        }

        // Create pipes
        for (let i = 0; i < config.pipeCount; i++) {
            const pipeId = `pipe_${compCounter++}`;
            components.push({
                id: pipeId,
                componentDefinitionId: 'fluid.pipe.straight',
                name: `Pipe_${i}`,
                position: { x: 150 + i * 100, y: 400 },
                rotation: 0,
                parameterValues: {
                    diameter: 100,
                    length: 50,
                    roughness: 0.045
                },
                isSelected: false,
                groupIds: []
            });
            linkIds.push(pipeId);
        }

        // Create connections
        // Tank -> Pump
        if (nodeIds.length > 0 && linkIds.length > 0) {
            connections.push({
                id: 'conn_1',
                sourceComponentId: nodeIds[0],
                sourcePortId: 'outlet',
                targetComponentId: linkIds[0],
                targetPortId: 'inlet',
                type: 'fluid',
                isSelected: false
            });
        }

        // Link pipes in chain
        for (let i = 0; i < linkIds.length - 1; i++) {
            connections.push({
                id: `conn_${i + 10}`,
                sourceComponentId: linkIds[i],
                sourcePortId: 'outlet',
                targetComponentId: linkIds[i + 1],
                targetPortId: 'inlet',
                type: 'fluid',
                isSelected: false
            });
        }

        // Last link -> Tank
        if (nodeIds.length > 1 && linkIds.length > 0) {
            connections.push({
                id: 'conn_final',
                sourceComponentId: linkIds[linkIds.length - 1],
                sourcePortId: 'outlet',
                targetComponentId: nodeIds[nodeIds.length - 1],
                targetPortId: 'inlet',
                type: 'fluid',
                isSelected: false
            });
        }

        return {
            id: `bp_benchmark_${config.name.replace(/\s/g, '_')}`,
            name: config.name,
            description: config.description,
            domain: 'fluid' as MechanicalDomain,
            version: '1.0.0',
            components,
            connections,
            simulations: [],
            createdAt: new Date(),
            updatedAt: new Date(),
            author: 'Benchmark',
            tags: ['benchmark', 'performance'],
            fluidId: 'water'
        };
    }

    /**
     * Run static simulation benchmark
     */
    async runStaticBenchmark(config: BenchmarkConfig): Promise<BenchmarkResult> {
        const blueprint = this.generateNetworkBlueprint(config);
        
        // Force garbage collection if available
        if (global.gc) {
            global.gc();
        }

        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();

        try {
            const result = await SimulationService.run(blueprint, true);

            const memAfter = process.memoryUsage().heapUsed;

            return {
                name: config.name,
                componentCount: config.componentCount,
                duration: performance.now() - startTime,
                memoryUsed: memAfter - memBefore,
                converged: result.diagnostics.convergence.converged,
                iterations: result.diagnostics.convergence.iterations,
                residual: result.diagnostics.convergence.residual
            };
        } catch (error: any) {
            return {
                name: config.name,
                componentCount: config.componentCount,
                duration: performance.now() - startTime,
                memoryUsed: 0,
                converged: false,
                iterations: 0,
                residual: -1
            };
        }
    }

    /**
     * Run dynamic simulation benchmark
     */
    async runDynamicBenchmark(config: BenchmarkConfig, duration: number = 10): Promise<BenchmarkResult> {
        const blueprint = this.generateNetworkBlueprint(config);
        
        const memBefore = process.memoryUsage().heapUsed;
        const startTime = performance.now();

        try {
            const result = await DynamicSimulationService.simulate(
                blueprint, 
                duration, 
                0.5,  // timeStep
                undefined  // no scenario
            );

            const memAfter = process.memoryUsage().heapUsed;

            return {
                name: `${config.name} (dynamic)`,
                componentCount: config.componentCount,
                duration: performance.now() - startTime,
                memoryUsed: memAfter - memBefore,
                converged: result.status === 'completed',
                iterations: result.timePoints?.length || 0,
                residual: result.diagnostics.convergence.residual
            };
        } catch (error: any) {
            return {
                name: `${config.name} (dynamic)`,
                componentCount: config.componentCount,
                duration: performance.now() - startTime,
                memoryUsed: 0,
                converged: false,
                iterations: 0,
                residual: -1
            };
        }
    }

    /**
     * Benchmark sparse matrix operations
     */
    benchmarkSparseSolver(matrixSize: number, nnzPerRow: number): {
        buildTime: number;
        solveTime: number;
        iterations: number;
        residual: number;
    } {
        // Generate sparse matrix
        const rows: number[] = [];
        const cols: number[] = [];
        const vals: number[] = [];

        for (let i = 0; i < matrixSize; i++) {
            // Diagonal element (always present)
            rows.push(i);
            cols.push(i);
            vals.push(2 + Math.random());

            // Off-diagonal elements (simulating tridiagonal + random)
            for (let j = 1; j <= nnzPerRow; j++) {
                if (i + j < matrixSize) {
                    rows.push(i);
                    cols.push(i + j);
                    vals.push(-0.5 + Math.random() * 0.1);
                }
                if (i - j >= 0) {
                    rows.push(i);
                    cols.push(i - j);
                    vals.push(-0.5 + Math.random() * 0.1);
                }
            }
        }

        // Build sparse matrix
        const buildStart = performance.now();
        const A = SparseMatrix.fromCOO(rows, cols, vals, matrixSize);
        const buildTime = performance.now() - buildStart;

        // Create test vector
        const x = new Float64Array(matrixSize).fill(1);
        const b = SparseMatrix.matVecMult(A, x);

        // Solve
        const solver = new SparseLinearSolver(100, 1e-10);
        const solveStart = performance.now();
        const result = solver.solve(A, b);
        const solveTime = performance.now() - solveStart;

        return {
            buildTime,
            solveTime,
            iterations: result.iterations,
            residual: result.residual
        };
    }

    /**
     * Run full benchmark suite
     */
    async runFullSuite(): Promise<BenchmarkResult[]> {
        console.log('='.repeat(60));
        console.log('ELDORIA PHYSICS ENGINE - PERFORMANCE BENCHMARK SUITE');
        console.log('='.repeat(60));
        console.log('');

        // Static benchmarks
        console.log('Running Static Simulation Benchmarks...');
        console.log('-'.repeat(40));

        const staticConfigs: BenchmarkConfig[] = [
            { name: 'Small Network', componentCount: 10, pipeCount: 5, pumpCount: 2, tankCount: 2, description: '10 components' },
            { name: 'Medium Network', componentCount: 50, pipeCount: 30, pumpCount: 5, tankCount: 3, description: '50 components' },
            { name: 'Large Network', componentCount: 100, pipeCount: 70, pumpCount: 10, tankCount: 5, description: '100 components' },
            { name: 'XL Network', componentCount: 250, pipeCount: 180, pumpCount: 25, tankCount: 8, description: '250 components' },
            { name: 'Massive Network', componentCount: 500, pipeCount: 380, pumpCount: 50, tankCount: 12, description: '500 components' }
        ];

        for (const config of staticConfigs) {
            console.log(`\n[${config.name}] ${config.description}`);
            let totalDuration = 0;
            let convergedCount = 0;

            for (let i = 0; i < this.ITERATIONS; i++) {
                const result = await this.runStaticBenchmark(config);
                this.results.push(result);
                totalDuration += result.duration;
                if (result.converged) convergedCount++;
                
                process.stdout.write(`  Run ${i + 1}/${this.ITERATIONS}: ${result.duration.toFixed(2)}ms ${result.converged ? '✓' : '✗'}\r`);
            }
            console.log(`  Average: ${(totalDuration / this.ITERATIONS).toFixed(2)}ms | Converged: ${convergedCount}/${this.ITERATIONS}`);
        }

        // Sparse matrix benchmarks
        console.log('\n\nRunning Sparse Matrix Benchmarks...');
        console.log('-'.repeat(40));

        const matrixSizes = [50, 100, 250, 500, 1000];
        for (const size of matrixSizes) {
            console.log(`\nMatrix ${size}x${size}:`);
            const result = this.benchmarkSparseSolver(size, 3);
            console.log(`  Build: ${result.buildTime.toFixed(3)}ms`);
            console.log(`  Solve: ${result.solveTime.toFixed(3)}ms (${result.iterations} iterations, residual: ${result.residual.toExponential(2)})`);
        }

        // Print summary
        console.log('\n\n' + '='.repeat(60));
        console.log('SUMMARY');
        console.log('='.repeat(60));
        console.log('');
        console.log('Static Simulation Results:');
        console.log('| Components | Avg Duration | Converged | Memory |');
        console.log('|------------|--------------|-----------|--------|');
        
        const groupedResults = this.results.reduce((acc, r) => {
            if (!acc[r.componentCount]) {
                acc[r.componentCount] = { total: 0, count: 0, converged: 0, memory: 0 };
            }
            acc[r.componentCount].total += r.duration;
            acc[r.componentCount].count++;
            if (r.converged) acc[r.componentCount].converged++;
            acc[r.componentCount].memory += r.memoryUsed;
            return acc;
        }, {} as Record<number, { total: number; count: number; converged: number; memory: number }>);

        Object.entries(groupedResults)
            .sort((a, b) => Number(a[0]) - Number(b[0]))
            .forEach(([count, data]) => {
                const avg = (data.total / data.count).toFixed(2);
                const mem = (data.memory / data.count / 1024 / 1024).toFixed(2);
                console.log(`| ${count.padEnd(10)} | ${avg.padEnd(12)}ms | ${String(data.converged).padEnd(7)}/${data.count} | ${mem}MB |`);
            });

        console.log('');
        console.log('Performance Targets:');
        console.log('  • 50 components: < 100ms');
        console.log('  • 100 components: < 500ms');
        console.log('  • 500 components: < 5s');
        console.log('');

        return this.results;
    }
}

// Export for use
export { PhysicsBenchmarkSuite };

// Run if executed directly
if (require.main === module) {
    const suite = new PhysicsBenchmarkSuite();
    suite.runFullSuite()
        .then(() => {
            console.log('\nBenchmarks complete.');
            process.exit(0);
        })
        .catch((err) => {
            console.error('Benchmark failed:', err);
            process.exit(1);
        });
}

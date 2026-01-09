
import { create, all } from 'mathjs';

const math = create(all, {});

function runBenchmark() {
    console.log("--- MathJS Benchmark: Evaluate vs Compile ---");

    const iterations = 12000; // Matches stress test (100 comps * 120 steps)
    const expression = "P = (rho * g * Q * H) / eta";
    const scope = { rho: 1000, g: 9.81, Q: 0.1, H: 50, eta: 0.8 };

    // Method 1: Evaluate (Parse every time)
    const startEval = process.hrtime();
    for (let i = 0; i < iterations; i++) {
        math.evaluate(expression, scope);
    }
    const endEval = process.hrtime(startEval);
    const timeEval = (endEval[0] * 1000 + endEval[1] / 1e6);
    console.log(`Evaluate (x${iterations}): ${timeEval.toFixed(2)} ms`);

    // Method 2: Compile (Parse once)
    const startCompile = process.hrtime();
    const compiled = math.compile(expression);
    for (let i = 0; i < iterations; i++) {
        compiled.evaluate(scope);
    }
    const endCompile = process.hrtime(startCompile);
    const timeCompile = (endCompile[0] * 1000 + endCompile[1] / 1e6);
    console.log(`Compile (x${iterations}): ${timeCompile.toFixed(2)} ms`);

    console.log(`Speedup Factor: ${(timeEval / timeCompile).toFixed(1)}x`);
}

runBenchmark();

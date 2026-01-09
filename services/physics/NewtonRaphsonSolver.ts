/**
 * Newton-Raphson Solver with Line Search
 * Robust nonlinear solver for hydraulic and thermal systems
 */

export interface SolverResult {
    x: number[];
    converged: boolean;
    iterations: number;
    residual: number;
    message: string;
}

export interface SolverOptions {
    maxIterations: number;
    tolerance: number;
    maxStepSize: number;
    minStepSize: number;
    lineSearchIterations: number;
    useBacktracking: boolean;
    checkJacobianCondition: boolean;
}

export class NewtonRaphsonSolver {
    private static defaultOptions: SolverOptions = {
        maxIterations: 100,
        tolerance: 1e-8,
        maxStepSize: 1.0,
        minStepSize: 1e-12,
        lineSearchIterations: 20,
        useBacktracking: true,
        checkJacobianCondition: true
    };

    /**
     * Solve system of nonlinear equations using Newton-Raphson with line search
     * f(x) = 0
     * 
     * @param f Function that returns residual vector
     * @param jacobian Function that returns Jacobian matrix
     * @param x0 Initial guess
     * @param options Solver options
     * @returns Solution and convergence info
     */
    static solve(
        f: (x: number[]) => number[],
        jacobian: (x: number[]) => number[][],
        x0: number[],
        options: Partial<SolverOptions> = {}
    ): SolverResult {
        const opts = { ...this.defaultOptions, ...options };
        let x = [...x0];
        let converged = false;
        let message = '';
        let iterations = 0;

        for (iterations = 0; iterations < opts.maxIterations; iterations++) {
            // Calculate residuals
            const residuals = f(x);
            const residualNorm = this.norm(residuals);

            // Check convergence
            if (residualNorm < opts.tolerance) {
                converged = true;
                message = 'Converged';
                break;
            }

            // Calculate Jacobian
            let J: number[][];
            try {
                J = jacobian(x);
            } catch (e) {
                message = 'Jacobian computation failed';
                break;
            }

            // Check Jacobian condition number (ill-conditioned)
            if (opts.checkJacobianCondition) {
                const cond = this.conditionNumber(J);
                if (cond > 1e12) {
                    console.warn(`[NewtonRaphson] Ill-conditioned Jacobian: cond=${cond.toExponential(2)}`);
                }
            }

            // Solve linear system J * dx = -f(x)
            let dx: number[];
            try {
                dx = this.solveLinear(J, residuals.map(r => -r));
            } catch (e) {
                message = 'Linear solve failed';
                break;
            }

            // Calculate step size
            let stepSize = 1.0;

            // Line search with backtracking
            if (opts.useBacktracking) {
                stepSize = this.lineSearch(x, f, dx, residuals, opts);
            }

            // Check for NaN or Inf
            if (!isFinite(stepSize) || stepSize < opts.minStepSize) {
                message = 'Step size too small';
                break;
            }

            // Update solution
            for (let i = 0; i < x.length; i++) {
                x[i] += dx[i] * stepSize;
            }
        }

        if (!converged) {
            if (iterations >= opts.maxIterations) {
                message = `Max iterations (${opts.maxIterations}) reached`;
            }
        }

        return {
            x,
            converged,
            iterations,
            residual: this.norm(f(x)),
            message
        };
    }

    /**
     * Line search with backtracking (Armijo condition)
     */
    private static lineSearch(
        x: number[],
        f: (x: number[]) => number[],
        dx: number[],
        residuals: number[],
        opts: SolverOptions
    ): number {
        const fx = this.norm(residuals);
        const fx2 = fx * fx;
        const c = 0.0001; // Armijo condition constant
        const rho = 0.5;   // Step reduction factor

        let stepSize = opts.maxStepSize;

        for (let i = 0; i < opts.lineSearchIterations; i++) {
            const xTrial = x.map((val, j) => val + dx[j] * stepSize);
            const residualsTrial = f(xTrial);
            const fxTrial2 = this.norm(residualsTrial) ** 2;

            // Armijo condition: f(x + αdx) ≤ f(x) + cα∇f·dx
            if (fxTrial2 <= fx2 + 2 * c * stepSize * this.dot(dx, residualsTrial)) {
                return stepSize;
            }

            stepSize *= rho;
        }

        return stepSize;
    }

    /**
     * Solve linear system using Gaussian elimination with partial pivoting
     */
    private static solveLinear(A: number[][], b: number[]): number[] {
        const n = b.length;
        const aug = A.map((row, i) => [...row, b[i]]);

        // Forward elimination
        for (let k = 0; k < n; k++) {
            // Find pivot
            let maxRow = k;
            for (let i = k + 1; i < n; i++) {
                if (Math.abs(aug[i][k]) > Math.abs(aug[maxRow][k])) {
                    maxRow = i;
                }
            }

            // Swap rows
            [aug[k], aug[maxRow]] = [aug[maxRow], aug[k]];

            // Check for singular matrix
            if (Math.abs(aug[k][k]) < 1e-12) {
                throw new Error('Singular matrix');
            }

            // Eliminate
            for (let i = k + 1; i < n; i++) {
                const factor = aug[i][k] / aug[k][k];
                for (let j = k; j <= n; j++) {
                    aug[i][j] -= factor * aug[k][j];
                }
            }
        }

        // Back substitution
        const x = new Array(n).fill(0);
        for (let i = n - 1; i >= 0; i--) {
            x[i] = aug[i][n];
            for (let j = i + 1; j < n; j++) {
                x[i] -= aug[i][j] * x[j];
            }
            x[i] /= aug[i][i];
        }

        return x;
    }

    /**
     * Estimate condition number using spectral norm ratio
     * (Simplified - not exact but useful for diagnostics)
     */
    private static conditionNumber(A: number[][]): number {
        const n = A.length;
        
        // Create a helper function for matrix-vector multiply
        const matVecMult = (M: number[][], v: number[]): number[] => {
            return M.map(row => {
                let sum = 0;
                for (let i = 0; i < v.length; i++) {
                    sum += row[i] * v[i];
                }
                return sum;
            });
        };

        // Power iteration for largest eigenvalue
        let v = new Array(n).fill(0).map(() => Math.random());
        v = this.normalize(v);

        for (let i = 0; i < 10; i++) {
            const Av = matVecMult(A, v);
            v = this.normalize(Av);
        }
        const sigmaMax = this.dot(v, matVecMult(A, v));

        // Inverse iteration for smallest eigenvalue
        let w = new Array(n).fill(0).map(() => Math.random());
        w = this.normalize(w);

        // Approximate sigma_min using Rayleigh quotient
        const Aw = matVecMult(A, w);
        const sigmaMin = Math.abs(this.dot(w, Aw)) / this.dot(w, w);

        return sigmaMax / Math.max(sigmaMin, 1e-15);
    }

    /**
     * Vector norms
     */
    private static norm(v: number[]): number {
        return Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
    }

    private static dot(a: number[], b: number[]): number {
        return a.reduce((sum, val, i) => sum + val * b[i], 0);
    }

    private static normalize(v: number[]): number[] {
        const mag = this.norm(v);
        if (mag < 1e-15) return v;
        return v.map(val => val / mag);
    }

    /**
     * Solve using Trust Region Reflective method (simplified)
     * Better for ill-conditioned problems
     */
    static solveTrustRegion(
        f: (x: number[]) => number[],
        jacobian: (x: number[]) => number[][],
        x0: number[],
        options: Partial<SolverOptions> = {}
    ): SolverResult {
        const opts = { ...this.defaultOptions, ...options };
        let x = [...x0];
        let trustRadius = 1.0;
        let converged = false;
        let message = '';
        let iterations = 0;

        for (iterations = 0; iterations < opts.maxIterations; iterations++) {
            const residuals = f(x);
            const residualNorm = this.norm(residuals);

            if (residualNorm < opts.tolerance) {
                converged = true;
                message = 'Converged';
                break;
            }

            let J: number[][];
            try {
                J = jacobian(x);
            } catch (e) {
                message = 'Jacobian computation failed';
                break;
            }

            // Try full Newton step first
            try {
                const dx = this.solveLinear(J, residuals.map(r => -r));
                const stepNorm = this.norm(dx);

                if (stepNorm < trustRadius) {
                    // Accept full step
                    for (let i = 0; i < x.length; i++) {
                        x[i] += dx[i];
                    }
                } else {
                    // Scale to trust region
                    const scale = trustRadius / stepNorm;
                    for (let i = 0; i < x.length; i++) {
                        x[i] += dx[i] * scale;
                    }
                    trustRadius *= 0.5;
                }
            } catch (e) {
                // Try regularization
                try {
                    const dx = this.solveRegularized(J, residuals.map(r => -r), 1e-6);
                    for (let i = 0; i < x.length; i++) {
                        x[i] += dx[i];
                    }
                } catch (e2) {
                    message = 'Both direct and regularized solve failed';
                    break;
                }
            }

            // Check for NaN
            if (x.some(v => !isFinite(v))) {
                message = 'Solution diverged (NaN)';
                break;
            }
        }

        if (!converged) {
            message = iterations >= opts.maxIterations ? 'Max iterations' : message;
        }

        return {
            x,
            converged,
            iterations,
            residual: this.norm(f(x)),
            message
        };
    }

    /**
     * Solve with Tikhonov regularization
     * Useful for ill-conditioned Jacobian
     */
    private static solveRegularized(A: number[][], b: number[], lambda: number): number[] {
        const n = b.length;
        // Create (J^T J + λI)
        const ATA = A.map((row, i) =>
            row.map((_, j) => {
                let sum = 0;
                for (let k = 0; k < n; k++) {
                    sum += A[k][i] * A[k][j];
                }
                return sum + (i === j ? lambda * lambda : 0);
            })
        );

        // Solve (J^T J + λI) x = J^T b
        const ATb = A[0].map((_, j) =>
            A.reduce((sum, row, i) => sum + row[j] * b[i], 0)
        );

        return this.solveLinear(ATA, ATb);
    }
}

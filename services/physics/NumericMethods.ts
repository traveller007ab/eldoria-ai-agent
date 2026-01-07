/**
 * Numeric Methods for Engineering Calculations
 */

export class NumericMethods {

    /**
     * solves f(x) = 0 using Newton-Raphson
     * @param f Function that returns the residual
     * @param df Function that returns the derivative (Jacobian)
     * @param x0 Initial guess
     * @param tol Tolerance
     * @param maxIter Max iterations
     */
    static newtonRaphson(
        f: (x: number) => number,
        df: (x: number) => number,
        x0: number,
        tol: number = 1e-6,
        maxIter: number = 100
    ): number {
        let x = x0;
        for (let i = 0; i < maxIter; i++) {
            const y = f(x);
            const dy = df(x);

            if (Math.abs(dy) < 1e-12) {
                console.warn("Newton-Raphson: Derivative too close to zero");
                break;
            }

            const delta = y / dy;
            x = x - delta;

            if (Math.abs(delta) < tol) {
                return x; // Converged
            }
        }
        console.warn("Newton-Raphson: Did not converge");
        return x;
    }

    /**
     * Multi-variable Newton-Raphson
     * F(X) = 0 where X is a vector
     * We need a localized linear solver (Gaussian Elimination) for J * dX = -F
     */
    static async newtonRaphsonSystem(
        F: (X: number[]) => number[],     // Residual vector function
        J: (X: number[]) => number[][],   // Jacobian matrix function
        X0: number[],                     // Initial guess vector
        tol: number = 1e-6,
        maxIter: number = 50
    ): Promise<{ X: number[], converged: boolean, iter: number, residual: number }> {
        let X = [...X0];
        let iter = 0;
        let residualNorm = 0;

        for (iter = 0; iter < maxIter; iter++) {
            const residuals = F(X);
            residualNorm = Math.sqrt(residuals.reduce((sum, val) => sum + val * val, 0));

            if (residualNorm < tol) {
                return { X, converged: true, iter, residual: residualNorm };
            }

            const jacobian = J(X);
            const dX = this.solveLinearSystem(jacobian, residuals.map(r => -r)); // J * dX = -F

            X = X.map((val, idx) => val + dX[idx]);
        }

        return { X, converged: false, iter, residual: residualNorm };
    }

    /**
     * Solves Ax = b using Gaussian Elimination with partial pivoting
     */
    static solveLinearSystem(A: number[][], b: number[]): number[] {
        const n = A.length;
        const x = new Array(n).fill(0);
        const M = A.map((row, i) => [...row, b[i]]); // Augmented matrix

        // Forward elimination
        for (let i = 0; i < n; i++) {
            // Pivot
            let maxRow = i;
            for (let k = i + 1; k < n; k++) {
                if (Math.abs(M[k][i]) > Math.abs(M[maxRow][i])) {
                    maxRow = k;
                }
            }

            // Swap rows
            [M[i], M[maxRow]] = [M[maxRow], M[i]];

            if (Math.abs(M[i][i]) < 1e-12) {
                // Singular or close to singular
                continue;
            }

            // Eliminate
            for (let k = i + 1; k < n; k++) {
                const c = -M[k][i] / M[i][i];
                for (let j = i; j < n + 1; j++) {
                    if (i === j) M[k][j] = 0;
                    else M[k][j] += c * M[i][j];
                }
            }
        }

        // Back substitution
        for (let i = n - 1; i >= 0; i--) {
            let sum = 0;
            for (let j = i + 1; j < n; j++) {
                sum += M[i][j] * x[j];
            }
            x[i] = (M[i][n] - sum) / M[i][i];
        }

        return x;
    }
}

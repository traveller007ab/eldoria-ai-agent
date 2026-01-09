
export class FastNumericMethods {

    /**
     * Solves J * x = F using Gaussian Elimination on Flux64Arrays
     * @param n Dimension
     * @param J_flat Flattened Jacobian Matrix (n x n)
     * @param F Residual Vector
     */
    static solveLinearSystemFlat(n: number, J_flat: Float64Array, F: number[]): Float64Array {
        // Create Augment Matrix [J | F] in a single flat array
        // Size: n * (n + 1)
        const stride = n + 1;
        const M = new Float64Array(n * stride);

        // Copy J and F into M
        for (let i = 0; i < n; i++) {
            // Copy Row i of J
            for (let j = 0; j < n; j++) {
                M[i * stride + j] = J_flat[i * n + j];
            }
            // Copy F[i] to last column (negated because J*dx = -F implies we solve Ax=b where b=-F)
            // Wait, newtonRaphsonSystem passes residuals. We need -residuals.
            // Caller handles negation usually. 
            // In NumericMethods.ts: solveLinearSystem(jacobian, residuals.map(r => -r))
            // So F here is 'b'.
            M[i * stride + n] = F[i];
        }

        // Forward Elimination
        for (let k = 0; k < n; k++) {
            // Pivot
            let i_max = k;
            let v_max = Math.abs(M[k * stride + k]);

            for (let i = k + 1; i < n; i++) {
                const val = Math.abs(M[i * stride + k]);
                if (val > v_max) {
                    v_max = val;
                    i_max = i;
                }
            }

            // Swap Rows k and i_max (logical or physical)
            // Physical swap in flat array
            if (i_max !== k) {
                for (let j = k; j < stride; j++) {
                    const temp = M[k * stride + j];
                    M[k * stride + j] = M[i_max * stride + j];
                    M[i_max * stride + j] = temp;
                }
            }

            // Check Singular
            const pivot = M[k * stride + k];
            if (Math.abs(pivot) < 1e-12) continue; // Skip or error

            // Eliminate
            for (let i = k + 1; i < n; i++) {
                const factor = M[i * stride + k] / pivot;
                M[i * stride + k] = 0; // optimized
                for (let j = k + 1; j < stride; j++) {
                    M[i * stride + j] -= factor * M[k * stride + j];
                }
            }
        }

        // Back Substitution
        const x = new Float64Array(n);
        for (let i = n - 1; i >= 0; i--) {
            let sum = M[i * stride + n]; // b[i]
            for (let j = i + 1; j < n; j++) {
                sum -= M[i * stride + j] * x[j];
            }
            x[i] = sum / M[i * stride + i];
        }

        return x;
    }
}

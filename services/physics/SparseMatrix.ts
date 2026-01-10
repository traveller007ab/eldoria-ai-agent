/**
 * Sparse Matrix Utilities for Eldoria Physics Engine
 * Uses CSR (Compressed Sparse Row) format for efficient storage and operations
 * 
 * CSR Format:
 * - values: Float64Array of non-zero values (row-major order)
 * - colIndices: Int32Array of column indices for each value
 * - rowPointers: Int32Array where rowPointers[i] gives the start index in values/cols for row i
 *                rowPointers[n] = total number of non-zeros
 */

export interface SparseMatrixCSR {
    values: Float64Array;     // Non-zero values in row-major order
    colIndices: Int32Array;   // Column indices for each value
    rowPointers: Int32Array;  // Row start offsets (length = n + 1)
    n: number;                // Matrix dimension (n x n)
    nnz: number;              // Number of non-zeros
}

export class SparseMatrix {
    /**
     * Create a zero matrix of dimension n x n
     */
    static createZeros(n: number): SparseMatrixCSR {
        return {
            values: new Float64Array(0),
            colIndices: new Int32Array(0),
            rowPointers: new Int32Array(n + 1),
            n,
            nnz: 0
        };
    }

    /**
     * Build CSR matrix from dense array (for initialization)
     */
    static fromDense(dense: number[][]): SparseMatrixCSR {
        const n = dense.length;
        const values: number[] = [];
        const colIndices: number[] = [];
        const rowPointers = new Int32Array(n + 1);

        for (let i = 0; i < n; i++) {
            rowPointers[i] = values.length;
            for (let j = 0; j < n; j++) {
                if (Math.abs(dense[i][j]) > 1e-15) {
                    values.push(dense[i][j]);
                    colIndices.push(j);
                }
            }
        }
        rowPointers[n] = values.length;

        return {
            values: new Float64Array(values),
            colIndices: new Int32Array(colIndices),
            rowPointers,
            n,
            nnz: values.length
        };
    }

    /**
     * Create CSR matrix from COO format (triplets)
     */
    static fromCOO(rows: number[], cols: number[], values: number[], n: number): SparseMatrixCSR {
        // Sort by row, then column
        const triplets = rows.map((r, i) => ({ r, c: cols[i], v: values[i] }));
        triplets.sort((a, b) => {
            if (a.r !== b.r) return a.r - b.r;
            return a.c - b.c;
        });

        // Combine duplicates by summing
        const combined = new Map<string, number>();
        for (const t of triplets) {
            const key = `${t.r},${t.c}`;
            combined.set(key, (combined.get(key) || 0) + t.v);
        }

        // Build CSR
        const sorted = Array.from(combined.entries())
            .map(([key, v]) => {
                const [r, c] = key.split(',').map(Number);
                return { r, c, v };
            })
            .sort((a, b) => {
                if (a.r !== b.r) return a.r - b.r;
                return a.c - b.c;
            });

        const vals = new Float64Array(sorted.length);
        const colArray = new Int32Array(sorted.length);
        const rowsPtr = new Int32Array(n + 1);

        let currentRow = 0;
        let valIdx = 0;
        for (const t of sorted) {
            while (t.r > currentRow) {
                currentRow++;
                rowsPtr[currentRow] = valIdx;
            }
            vals[valIdx] = t.v;
            colArray[valIdx] = t.c;
            valIdx++;
        }
        rowsPtr[n] = valIdx;

        return {
            values: vals,
            colIndices: colArray,
            rowPointers: rowsPtr,
            n,
            nnz: sorted.length
        };
    }

    /**
     * Matrix-vector multiplication: y = A * x
     */
    static matVecMult(A: SparseMatrixCSR, x: Float64Array | number[]): Float64Array {
        const n = A.n;
        const y = new Float64Array(n);

        for (let i = 0; i < n; i++) {
            let sum = 0;
            const start = A.rowPointers[i];
            const end = A.rowPointers[i + 1];
            for (let idx = start; idx < end; idx++) {
                sum += A.values[idx] * x[A.colIndices[idx]];
            }
            y[i] = sum;
        }
        return y;
    }

    /**
     * Matrix addition: C = A + B
     */
    static add(A: SparseMatrixCSR, B: SparseMatrixCSR): SparseMatrixCSR {
        if (A.n !== B.n) throw new Error('Matrix dimensions must match');

        // Build COO then convert to CSR
        const rows: number[] = [];
        const cols: number[] = [];
        const vals: number[] = [];

        // Add A
        for (let i = 0; i < A.n; i++) {
            for (let idx = A.rowPointers[i]; idx < A.rowPointers[i + 1]; idx++) {
                rows.push(i);
                cols.push(A.colIndices[idx]);
                vals.push(A.values[idx]);
            }
        }

        // Add B
        for (let i = 0; i < B.n; i++) {
            for (let idx = B.rowPointers[i]; idx < B.rowPointers[i + 1]; idx++) {
                rows.push(i);
                cols.push(B.colIndices[idx]);
                vals.push(B.values[idx]);
            }
        }

        return SparseMatrix.fromCOO(rows, cols, vals, A.n);
    }

    /**
     * Scalar multiplication: B = alpha * A
     */
    static scale(A: SparseMatrixCSR, alpha: number): SparseMatrixCSR {
        const values = new Float64Array(A.nnz);
        for (let i = 0; i < A.nnz; i++) {
            values[i] = A.values[i] * alpha;
        }
        return {
            ...A,
            values
        };
    }

    /**
     * Get diagonal elements as array
     */
    static diagonal(A: SparseMatrixCSR): Float64Array {
        const diag = new Float64Array(A.n);
        for (let i = 0; i < A.n; i++) {
            for (let idx = A.rowPointers[i]; idx < A.rowPointers[i + 1]; idx++) {
                if (A.colIndices[idx] === i) {
                    diag[i] = A.values[idx];
                    break;
                }
            }
        }
        return diag;
    }

    /**
     * Convert to dense (for debugging or small matrices)
     */
    static toDense(A: SparseMatrixCSR): number[][] {
        const dense = Array(A.n).fill(null).map(() => Array(A.n).fill(0));
        for (let i = 0; i < A.n; i++) {
            for (let idx = A.rowPointers[i]; idx < A.rowPointers[i + 1]; idx++) {
                dense[i][A.colIndices[idx]] = A.values[idx];
            }
        }
        return dense;
    }

    /**
     * Compute Frobenius norm (for convergence checking)
     */
    static frobeniusNorm(A: SparseMatrixCSR): number {
        let sum = 0;
        for (let i = 0; i < A.nnz; i++) {
            sum += A.values[i] * A.values[i];
        }
        return Math.sqrt(sum);
    }
}

/**
 * BiCGSTAB (Biconjugate Gradient Stabilized) Solver
 * Solves A * x = b for sparse, non-symmetric matrices
 * 
 * This is ideal for hydraulic networks where the Jacobian may not be symmetric
 * due to pumps, valves, and boundary conditions.
 * 
 * Complexity: O(nnz * iterations) instead of O(n³) for dense
 */
export class SparseLinearSolver {
    private maxIterations: number;
    private tolerance: number;

    constructor(maxIterations: number = 100, tolerance: number = 1e-10) {
        this.maxIterations = maxIterations;
        this.tolerance = tolerance;
    }

    /**
     * Solve A * x = b using BiCGSTAB
     * @param A Sparse matrix (n x n)
     * @param b Right-hand side vector
     * @param x Initial guess (will be modified in place)
     * @returns Object with solution x, convergence status, and iteration count
     */
    solve(A: SparseMatrixCSR, b: Float64Array | number[], x?: Float64Array): {
        x: Float64Array;
        converged: boolean;
        iterations: number;
        residual: number;
    } {
        const n = A.n;
        const bArr = b instanceof Float64Array ? b : new Float64Array(b);
        
        // Initial guess
        const xk = x ? x : new Float64Array(n);
        
        // Working vectors
        const r = new Float64Array(n);      // Residual
        const r0 = new Float64Array(n);     // Initial residual (shadow)
        const p = new Float64Array(n);      // Search direction
        const v = new Float64Array(n);      // A * p
        const s = new Float64Array(n);      // Correction vector
        const t = new Float64Array(n);      // A * s
        
        // Compute initial residual: r = b - A * x
        SparseMatrix.matVecMult(A, xk).forEach((val, i) => {
            r[i] = bArr[i] - val;
        });
        
        // r0 is used throughout (can't modify r)
        r0.set(r);
        
        // Initial rho and alpha
        let rho = 1;
        let alpha = 1;
        let omega = 1;
        
        // Store initial residual norm for convergence check
        const bNorm = Math.sqrt(bArr.reduce((sum, val) => sum + val * val, 0));
        const initialResidualNorm = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
        
        // Early exit if already converged
        if (initialResidualNorm < this.tolerance * Math.max(bNorm, 1)) {
            return { x: xk, converged: true, iterations: 0, residual: initialResidualNorm };
        }

        p.set(r0);

        // Pre-compute r0 norm for stability checks
        const r0Norm = Math.sqrt(r0.reduce((sum, val) => sum + val * val, 0));
        const rNormInitial = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));

        // Use r0Norm to scale the breakdown threshold - more adaptive
        const breakdownThreshold = Math.max(1e-12, 1e-10 * r0Norm * rNormInitial);

        for (let iter = 0; iter < this.maxIterations; iter++) {
            const rho_old = rho;
            
            // rho = r0 . r (with stability check)
            rho = 0;
            for (let i = 0; i < n; i++) {
                rho += r0[i] * r[i];
            }
            
            // Use adaptive threshold instead of fixed 1e-15
            if (Math.abs(rho) < breakdownThreshold) {
                // Near-breakdown: restart with current r as new r0
                r0.set(r);
                p.set(r);
                rho = r0Norm * rNormInitial;
                continue; // Skip to next iteration with restart
            }
            
            // beta = (rho / rho_old) * (alpha / omega)
            const beta = (rho / rho_old) * (alpha / Math.max(omega, 1e-15));
            
            // p = r + beta * (p - omega * v)
            for (let i = 0; i < n; i++) {
                p[i] = r[i] + beta * (p[i] - omega * v[i]);
            }
            
            // v = A * p
            const vNew = SparseMatrix.matVecMult(A, p);
            v.set(vNew);
            
            // alpha = rho / (r0 . v)
            let r0v = 0;
            for (let i = 0; i < n; i++) {
                r0v += r0[i] * v[i];
            }
            
            // Use adaptive threshold for r0v breakdown
            const vNorm = Math.sqrt(v.reduce((sum, val) => sum + val * val, 0));
            const r0vThreshold = Math.max(1e-12, 1e-10 * r0Norm * vNorm);
            
            if (Math.abs(r0v) < r0vThreshold) {
                // Near-breakdown: add regularization and continue
                // Small perturbation to avoid true breakdown
                const epsilon = 1e-8;
                alpha = rho / (r0v + epsilon * Math.sign(r0v) || epsilon);
            } else {
                alpha = rho / r0v;
            }
            
            // s = r - alpha * v
            for (let i = 0; i < n; i++) {
                s[i] = r[i] - alpha * v[i];
            }
            
            // Check if s is small enough to skip the second A multiplication
            const sNorm = Math.sqrt(s.reduce((sum, val) => sum + val * val, 0));
            const rNorm = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
            
            if (sNorm < 0.1 * rNorm) {
                // s is small, do minimal work
                // x = x + alpha * p
                // r = s (already computed)
                for (let i = 0; i < n; i++) {
                    xk[i] += alpha * p[i];
                }
                r.set(s);
                
                // Check convergence
                const newResidual = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
                if (newResidual < this.tolerance * Math.max(bNorm, 1)) {
                    return { x: xk, converged: true, iterations: iter + 1, residual: newResidual };
                }
                continue;
            }
            
            // t = A * s
            const tNew = SparseMatrix.matVecMult(A, s);
            t.set(tNew);
            
            // omega = (t . s) / (t . t)
            let ts = 0;
            let tt = 0;
            for (let i = 0; i < n; i++) {
                ts += t[i] * s[i];
                tt += t[i] * t[i];
            }
            
            // Use adaptive threshold for t breakdown (sNorm already computed above)
            const tThreshold = Math.max(1e-12, 1e-10 * sNorm * sNorm);
            
            if (Math.abs(tt) < tThreshold) {
                // t is nearly zero - set omega to 0 and continue
                omega = 0;
            } else {
                omega = ts / tt;
            }
            
            // x = x + alpha * p + omega * s
            for (let i = 0; i < n; i++) {
                xk[i] += alpha * p[i] + omega * s[i];
            }
            
            // r = s - omega * t
            for (let i = 0; i < n; i++) {
                r[i] = s[i] - omega * t[i];
            }
            
            // Check convergence
            const residualNorm = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
            if (residualNorm < this.tolerance * Math.max(bNorm, 1)) {
                return { x: xk, converged: true, iterations: iter + 1, residual: residualNorm };
            }
            
            // Check for stagnation
            if (residualNorm > 0.9 * rNorm) {
                // Not making progress, might need restart or different solver
                // For now, continue
            }
        }
        
        // Didn't converge within maxIterations
        const finalResidual = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
        return { x: xk, converged: false, iterations: this.maxIterations, residual: finalResidual };
    }

    /**
     * GMRES (Generalized Minimal Residual) Solver
     * More robust than BiCGSTAB for non-symmetric systems
     * Doesn't suffer from the same breakdown issues
     */
    solveGMRES(A: SparseMatrixCSR, b: Float64Array | number[], restart: number = 30): {
        x: Float64Array;
        converged: boolean;
        iterations: number;
        residual: number;
    } {
        const n = A.n;
        const bArr = b instanceof Float64Array ? b : new Float64Array(b);
        const xk = new Float64Array(n);
        
        const bNorm = Math.sqrt(bArr.reduce((sum, val) => sum + val * val, 0));
        if (bNorm < 1e-15) {
            return { x: xk, converged: true, iterations: 0, residual: 0 };
        }

        let r = new Float64Array(n);
        SparseMatrix.matVecMult(A, xk).forEach((val, i) => {
            r[i] = bArr[i] - val;
        });
        
        const initialResidualNorm = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
        if (initialResidualNorm < this.tolerance * Math.max(bNorm, 1)) {
            return { x: xk, converged: true, iterations: 0, residual: initialResidualNorm };
        }

        let beta = initialResidualNorm;
        const residualNorm0 = initialResidualNorm;

        // Normalize initial residual
        const e1 = new Float64Array(restart + 1);
        e1[0] = beta;

        // Arnoldi iteration storage
        const H = new Float64Array((restart + 1) * restart);
        const V: Float64Array[] = [];
        
        // First basis vector
        const v1 = new Float64Array(n);
        for (let i = 0; i < n; i++) {
            v1[i] = r[i] / beta;
        }
        V.push(v1);

        let iter = 0;
        const maxIter = Math.min(this.maxIterations, 500);

        while (iter < maxIter) {
            // Arnoldi process
            for (let j = 0; j < restart; j++) {
                iter++;
                
                // v_{j+1} = A * v_j
                const Av = SparseMatrix.matVecMult(A, V[j]);
                
                // Orthogonalize against previous vectors (Gram-Schmidt)
                for (let k = 0; k <= j; k++) {
                    let dot = 0;
                    for (let i = 0; i < n; i++) {
                        dot += V[k][i] * Av[i];
                    }
                    H[j * (restart + 1) + k] = dot;
                    
                    for (let i = 0; i < n; i++) {
                        Av[i] -= dot * V[k][i];
                    }
                }
                
                // Compute norm of Av
                let AvNorm = 0;
                for (let i = 0; i < n; i++) {
                    AvNorm += Av[i] * Av[i];
                }
                AvNorm = Math.sqrt(AvNorm);
                
                H[(j + 1) * (restart + 1) + j] = AvNorm;
                
                // Normalize
                if (AvNorm > 1e-15) {
                    V.push(Av.map(v => v / AvNorm));
                } else {
                    // Break - we've run out of directions
                    break;
                }

                // Solve least squares problem for this iteration
                // Build upper Hessenberg matrix H_j
                const m = j + 1;
                const g = new Float64Array(m + 1);
                g[0] = beta;
                
                // Apply Givens rotations to H_j * y = g
                let cs = 1, sn = 1;
                for (let k = 0; k < m; k++) {
                    const hVal = H[k * (restart + 1) + k];
                    const hNext = H[(k + 1) * (restart + 1) + k];
                    
                    // Compute Givens rotation
                    const gamma = Math.sqrt(hVal * hVal + hNext * hNext);
                    cs = hVal / gamma;
                    sn = hNext / gamma;
                    
                    // Apply rotation to g
                    const gNext = g[k + 1] * sn;
                    g[k] = cs * g[k];
                    g[k + 1] = gNext;
                    
                    // Zero out H[k+1, k]
                    H[(k + 1) * (restart + 1) + k] = 0;
                }
                
                // Check convergence
                const residual = Math.abs(g[m]);
                if (residual < this.tolerance * Math.max(bNorm, 1)) {
                    // Reconstruct solution
                    // y = R^{-1} * g (where R is upper triangular part of H)
                    const y = new Float64Array(m);
                    for (let k = m - 1; k >= 0; k--) {
                        let sum = g[k];
                        for (let l = k + 1; l < m; l++) {
                            sum -= H[k * (restart + 1) + l] * y[l];
                        }
                        y[k] = sum / H[k * (restart + 1) + k];
                    }
                    
                    // x = sum(y[i] * V[i])
                    for (let k = 0; k < m; k++) {
                        for (let i = 0; i < n; i++) {
                            xk[i] += y[k] * V[k][i];
                        }
                    }
                    
                    return { x: xk, converged: true, iterations: iter, residual };
                }
            }
            
            // Restart - compute new residual
            SparseMatrix.matVecMult(A, xk).forEach((val, i) => {
                r[i] = bArr[i] - val;
            });
            
            beta = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
            
            if (beta < this.tolerance * Math.max(bNorm, 1)) {
                return { x: xk, converged: true, iterations: iter, residual: beta };
            }
            
            // Reorthogonalize residual against all V
            for (let k = 0; k < V.length; k++) {
                let dot = 0;
                for (let i = 0; i < n; i++) {
                    dot += V[k][i] * r[i];
                }
                for (let i = 0; i < n; i++) {
                    r[i] -= dot * V[k][i];
                }
            }
            
            // Renormalize
            beta = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
            const vNew = new Float64Array(n);
            for (let i = 0; i < n; i++) {
                vNew[i] = r[i] / beta;
            }
            
            V.length = 0;
            V.push(vNew);
            
            // Update e1 with new beta
            e1[0] = beta;
        }
        
        const finalResidual = Math.sqrt(r.reduce((sum, val) => sum + val * val, 0));
        return { x: xk, converged: false, iterations: this.maxIterations, residual: finalResidual };
    }
}

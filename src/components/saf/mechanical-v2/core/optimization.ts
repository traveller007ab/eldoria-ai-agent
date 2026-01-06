/**
 * Mechanical SAF Lab v2.0 - Optimization Solver
 * Gradient descent, constraint optimization, and sensitivity analysis
 */

// ============================================================================
// TYPES
// ============================================================================

export interface OptimizationProblem {
  objective: (x: number[]) => number;
  gradient?: (x: number[]) => number[];
  constraints?: Constraint[];
  bounds?: { min: number; max: number }[];
}

export interface Constraint {
  type: 'eq' | 'ineq';
  fn: (x: number[]) => number;
  tolerance?: number;
}

export interface OptimizationResult {
  x: number[];
  value: number;
  converged: boolean;
  iterations: number;
  gradientNorm: number;
  message: string;
}

export interface SensitivityResult {
  parameter: string;
  baseValue: number;
  sensitivity: number;
  elasticity: number;
  impact: 'high' | 'medium' | 'low';
}

// ============================================================================
// GRADIENT DESCENT OPTIMIZER
// ============================================================================

export class GradientDescentOptimizer {
  private learningRate: number;
  private maxIterations: number;
  private tolerance: number;
  private momentum: number;
  
  constructor(options?: {
    learningRate?: number;
    maxIterations?: number;
    tolerance?: number;
    momentum?: number;
  }) {
    this.learningRate = options?.learningRate ?? 0.01;
    this.maxIterations = options?.maxIterations ?? 1000;
    this.tolerance = options?.tolerance ?? 1e-6;
    this.momentum = options?.momentum ?? 0.9;
  }
  
  /**
   * Minimize objective function using gradient descent with momentum
   */
  minimize(problem: OptimizationProblem, x0: number[]): OptimizationResult {
    let x = [...x0];
    let velocity = new Array(x.length).fill(0);
    let bestX = [...x];
    let bestValue = problem.objective(x);
    
    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Calculate gradient
      let grad: number[];
      if (problem.gradient) {
        grad = problem.gradient(x);
      } else {
        grad = this.approximateGradient(problem.objective, x);
      }
      
      // Apply constraints (projection onto feasible region)
      if (problem.bounds) {
        grad = this.projectGradient(x, grad, problem.bounds);
      }
      
      // Calculate gradient norm
      const gradNorm = Math.sqrt(grad.reduce((sum, g) => sum + g * g, 0));
      
      // Check convergence
      if (gradNorm < this.tolerance) {
        return {
          x,
          value: problem.objective(x),
          converged: true,
          iterations: iter + 1,
          gradientNorm: gradNorm,
          message: 'Converged: gradient norm below tolerance',
        };
      }
      
      // Update velocity (momentum)
      for (let i = 0; i < x.length; i++) {
        velocity[i] = this.momentum * velocity[i] - this.learningRate * grad[i];
      }
      
      // Update position
      for (let i = 0; i < x.length; i++) {
        x[i] += velocity[i];
      }
      
      // Apply bounds
      if (problem.bounds) {
        for (let i = 0; i < x.length; i++) {
          x[i] = Math.max(problem.bounds[i].min, Math.min(problem.bounds[i].max, x[i]));
        }
      }
      
      // Check constraints
      if (problem.constraints) {
        const violations = this.checkConstraints(x, problem.constraints);
        if (violations > 0) {
          // Return to previous position if constraints violated
          x = [...bestX];
        }
      }
      
      // Track best solution
      const currentValue = problem.objective(x);
      if (currentValue < bestValue) {
        bestValue = currentValue;
        bestX = [...x];
      }
    }
    
    return {
      x: bestX,
      value: bestValue,
      converged: false,
      iterations: this.maxIterations,
      gradientNorm: 0,
      message: 'Maximum iterations reached',
    };
  }
  
  /**
   * Approximate gradient using finite differences
   */
  private approximateGradient(fn: (x: number[]) => number, x: number[], h: number = 1e-7): number[] {
    const grad: number[] = [];
    const fx = fn(x);
    
    for (let i = 0; i < x.length; i++) {
      const xPlus = [...x];
      xPlus[i] += h;
      const fxPlus = fn(xPlus);
      grad.push((fxPlus - fx) / h);
    }
    
    return grad;
  }
  
  /**
   * Project gradient to respect bounds
   */
  private projectGradient(x: number[], grad: number[], bounds: { min: number; max: number }[]): number[] {
    return grad.map((g, i) => {
      if (x[i] <= bounds[i].min + 1e-8 && g < 0) return 0;
      if (x[i] >= bounds[i].max - 1e-8 && g > 0) return 0;
      return g;
    });
  }
  
  /**
   * Check constraint violations
   */
  private checkConstraints(x: number[], constraints: Constraint[]): number {
    let violations = 0;
    for (const c of constraints) {
      const value = c.fn(x);
      if (c.type === 'eq') {
        if (Math.abs(value) > (c.tolerance ?? 1e-6)) violations++;
      } else {
        if (value < 0) violations++;
      }
    }
    return violations;
  }
}

// ============================================================================
// CONSTRAINED OPTIMIZER (PENALTY METHOD)
// ============================================================================

export class ConstrainedOptimizer {
  private innerOptimizer: GradientDescentOptimizer;
  private penaltyFactor: number;
  private maxOuterIterations: number;
  
  constructor(options?: {
    learningRate?: number;
    maxIterations?: number;
    penaltyFactor?: number;
  }) {
    this.innerOptimizer = new GradientDescentOptimizer(options);
    this.penaltyFactor = options?.penaltyFactor ?? 1000;
    this.maxOuterIterations = options?.maxIterations ?? 20;
  }
  
  /**
   * Minimize with constraints using penalty method
   */
  minimize(problem: OptimizationProblem, x0: number[]): OptimizationResult {
    let x = [...x0];
    let penalty = this.penaltyFactor;
    
    for (let outerIter = 0; outerIter < this.maxOuterIterations; outerIter++) {
      // Create penalized objective
      const penalizedObjective = (x: number[]): number => {
        let f = problem.objective(x);
        
        if (problem.constraints) {
          for (const c of problem.constraints) {
            const g = c.fn(x);
            if (c.type === 'eq') {
              f += penalty * g * g;
            } else {
              if (g < 0) f += penalty * g * g;
            }
          }
        }
        
        return f;
      };
      
      // Optimize penalized problem
      const result = this.innerOptimizer.minimize(
        { ...problem, objective: penalizedObjective },
        x
      );
      
      x = result.x;
      
      // Reduce penalty (barrier method approach)
      penalty *= 0.5;
      
      if (result.converged) {
        return result;
      }
    }
    
    return {
      x,
      value: problem.objective(x),
      converged: false,
      iterations: this.maxOuterIterations,
      gradientNorm: 0,
      message: 'Constrained optimization did not fully converge',
    };
  }
}

// ============================================================================
// SENSITIVITY ANALYSIS
// ============================================================================

export class SensitivityAnalyzer {
  private baseValues: Map<string, number>;
  private perturbFraction: number;
  
  constructor(options?: {
    perturbFraction?: number;
  }) {
    this.baseValues = new Map();
    this.perturbFraction = options?.perturbFraction ?? 0.01;
  }
  
  /**
   * Analyze sensitivity of objective to each parameter
   */
  analyze(
    objective: (params: Record<string, number>) => number,
    parameters: Record<string, number>
  ): SensitivityResult[] {
    const results: SensitivityResult[] = [];
    const baseObjective = objective(parameters);
    
    for (const [param, value] of Object.entries(parameters)) {
      const perturbation = value * this.perturbFraction || this.perturbFraction;
      const perturbedParams = { ...parameters, [param]: value + perturbation };
      const perturbedObjective = objective(perturbedParams);
      
      const deltaObjective = perturbedObjective - baseObjective;
      const deltaParam = perturbation;
      
      const sensitivity = deltaObjective / deltaParam;
      
      // Elasticity: (% change in objective) / (% change in parameter)
      const elasticity = deltaObjective / baseObjective / (deltaParam / value);
      
      // Determine impact level
      let impact: 'high' | 'medium' | 'low';
      const absElasticity = Math.abs(elasticity);
      if (absElasticity > 0.5) impact = 'high';
      else if (absElasticity > 0.1) impact = 'medium';
      else impact = 'low';
      
      results.push({
        parameter: param,
        baseValue: value,
        sensitivity,
        elasticity,
        impact,
      });
    }
    
    // Sort by absolute elasticity (most sensitive first)
    results.sort((a, b) => Math.abs(b.elasticity) - Math.abs(a.elasticity));
    
    return results;
  }
  
  /**
   * Create tornado chart data for sensitivity
   */
  createTornadoData(
    objective: (params: Record<string, number>) => number,
    parameters: Record<string, number>,
    ranges: Record<string, { min: number; max: number }>
  ): { name: string; minValue: number; maxValue: number; range: number }[] {
    const data: { name: string; minValue: number; maxValue: number; range: number }[] = [];
    
    for (const [param, value] of Object.entries(parameters)) {
      const range = ranges[param];
      if (!range) continue;
      
      const minParams = { ...parameters, [param]: range.min };
      const maxParams = { ...parameters, [param]: range.max };
      
      data.push({
        name: param,
        minValue: objective(minParams),
        maxValue: objective(maxParams),
        range: Math.abs(objective(maxParams) - objective(minParams)),
      });
    }
    
    // Sort by range (most impactful first)
    data.sort((a, b) => b.range - a.range);
    
    return data;
  }
}

// ============================================================================
// PARAMETER SWEEP
// ============================================================================

export function parameterSweep(
  objective: (x: number) => number,
  paramRange: { min: number; max: number; steps: number }
): { param: number[]; value: number[]; min: number; max: number } {
  const param: number[] = [];
  const value: number[] = [];
  
  const step = (paramRange.max - paramRange.min) / (paramRange.steps - 1);
  
  for (let i = 0; i < paramRange.steps; i++) {
    const x = paramRange.min + i * step;
    param.push(x);
    value.push(objective(x));
  }
  
  return {
    param,
    value,
    min: Math.min(...value),
    max: Math.max(...value),
  };
}

// ============================================================================
// MONTE CARLO ANALYSIS
// ============================================================================

export interface MonteCarloConfig {
  samples: number;
  distributions: Record<string, { type: 'normal' | 'uniform' | 'lognormal'; params: number[] }>;
}

export interface MonteCarloResult {
  mean: number;
  stdDev: number;
  percentiles: { p5: number; p50: number; p95: number };
  histogram: { value: number; frequency: number }[];
  probability: { below: number; above: number };
}

export function monteCarloSimulation(
  objective: (params: Record<string, number>) => number,
  config: MonteCarloConfig,
  params: Record<string, number>
): MonteCarloResult {
  const results: number[] = [];
  
  // Box-Muller for normal distribution
  const randomNormal = (mean: number, std: number): number => {
    const u1 = Math.random();
    const u2 = Math.random();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  };
  
  for (let i = 0; i < config.samples; i++) {
    const sample: Record<string, number> = {};
    
    for (const [param, dist] of Object.entries(config.distributions)) {
      const baseValue = params[param];
      
      switch (dist.type) {
        case 'normal':
          sample[param] = randomNormal(baseValue, dist.params[0]);
          break;
        case 'uniform':
          const range = dist.params[0];
          sample[param] = baseValue + (Math.random() - 0.5) * 2 * range;
          break;
        case 'lognormal':
          const mu = Math.log(baseValue * baseValue / Math.sqrt(baseValue * baseValue + dist.params[0] * dist.params[0]));
          const sigma = Math.sqrt(Math.log(1 + dist.params[0] * dist.params[0] / (baseValue * baseValue)));
          sample[param] = Math.exp(randomNormal(mu, sigma));
          break;
        default:
          sample[param] = baseValue;
      }
    }
    
    results.push(objective(sample));
  }
  
  // Calculate statistics
  results.sort((a, b) => a - b);
  
  const mean = results.reduce((a, b) => a + b, 0) / results.length;
  const variance = results.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / results.length;
  const stdDev = Math.sqrt(variance);
  
  const p5 = results[Math.floor(0.05 * config.samples)];
  const p50 = results[Math.floor(0.5 * config.samples)];
  const p95 = results[Math.floor(0.95 * config.samples)];
  
  // Histogram
  const bins = 20;
  const binWidth = (results[results.length - 1] - results[0]) / bins;
  const histogram: { value: number; frequency: number }[] = [];
  
  for (let i = 0; i < bins; i++) {
    const binStart = results[0] + i * binWidth;
    const binEnd = binStart + binWidth;
    const count = results.filter(r => r >= binStart && r < binEnd).length;
    histogram.push({ value: (binStart + binEnd) / 2, frequency: count / config.samples });
  }
  
  return {
    mean,
    stdDev,
    percentiles: { p5, p50, p95 },
    histogram,
    probability: {
      below: results.filter(r => r < mean).length / config.samples,
      above: results.filter(r => r > mean).length / config.samples,
    },
  };
}

// ============================================================================
// COMMON OPTIMIZATION PROBLEMS
// ============================================================================

/**
 * Minimize pump power for given flow and head
 */
export function createPumpOptimization(flowRate: number, head: number) {
  return {
    objective: (x: number[]) => {
      // x[0] = pump efficiency, x[1] = motor efficiency
      const eta_pump = Math.max(0.5, Math.min(0.95, x[0]));
      const eta_motor = Math.max(0.8, Math.min(0.98, x[1]));
      
      // Power = (rho * g * Q * H) / (eta_pump * eta_motor)
      const power = (998 * 9.81 * (flowRate / 3600) * head) / (eta_pump * eta_motor);
      return power;
    },
    gradient: (x: number[]) => {
      const eta_pump = Math.max(0.5, Math.min(0.95, x[0]));
      const eta_motor = Math.max(0.8, Math.min(0.98, x[1]));
      const power = (998 * 9.81 * (flowRate / 3600) * head) / (eta_pump * eta_motor);
      
      return [
        -power / eta_pump,  // dPower/d_eta_pump
        -power / eta_motor, // dPower/d_eta_motor
      ];
    },
    bounds: [
      { min: 0.5, max: 0.95 },
      { min: 0.8, max: 0.98 },
    ],
  };
}

/**
 * Minimize pipe cost (capital + pumping)
 */
export function createPipeCostOptimization(flowRate: number, length: number, electricityCost: number, lifetime: number) {
  return {
    objective: (x: number[]) => {
      const D = x[0]; // Diameter in meters
      
      // Capital cost (simplified)
      const capitalCost = 5000 * Math.pow(D * 1000, 1.5) * length;
      
      // Pumping cost (annual)
      const velocity = flowRate / (Math.PI * Math.pow(D, 2) / 4) / 3600;
      const friction = 0.02;
      const headLoss = friction * (length / D) * (Math.pow(velocity, 2) / (2 * 9.81));
      const power = (998 * 9.81 * flowRate / 3600 * headLoss) / 0.75 / 1000; // kW
      const pumpingCost = power * 8760 * electricityCost;
      
      // Total cost (annualized)
      const annualCost = capitalCost / lifetime + pumpingCost;
      
      return annualCost;
    },
    bounds: [
      { min: 0.05, max: 0.5 }, // 50mm to 500mm
    ],
  };
}

// ============================================================================
// EXPORT
// ============================================================================

export const Optimization = {
  GradientDescentOptimizer,
  ConstrainedOptimizer,
  SensitivityAnalyzer,
  parameterSweep,
  monteCarloSimulation,
  createPumpOptimization,
  createPipeCostOptimization,
};

export default Optimization;

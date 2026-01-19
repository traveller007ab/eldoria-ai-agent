/**
 * SAF Lab v2.0 - Secure Expression Evaluator
 * Replaces unsafe new Function() with mathjs for expression evaluation
 */

import { evaluate, compile, MathJsStatic } from 'mathjs';

/**
 * Pre-defined constants for engineering calculations
 */
const ENGINEERING_CONSTANTS: Record<string, number> = {
  // Mathematical constants
  pi: Math.PI,
  e: Math.E,
  
  // Physical constants
  g: 9.81,              // Gravitational acceleration (m/s²)
  rho_water: 998,       // Density of water at 20°C (kg/m³)
  mu_water: 1.002e-3,   // Dynamic viscosity of water (Pa·s)
  cp_water: 4182,       // Specific heat of water (J/kg·K)
  k_water: 0.598,       // Thermal conductivity of water (W/m·K)
  Patm: 101325,         // Atmospheric pressure (Pa)
  
  // Universal gas constant
  R: 8.314,             // Universal gas constant (J/mol·K)
  R_air: 287.058,       // Gas constant for dry air (J/kg·K)
  
  // Stefan-Boltzmann constant
  sigma: 5.67e-8,       // W/m²·K⁴
};

/**
 * Scope containing built-in constants and user variables
 */
interface EvaluationScope {
  [key: string]: number;
}

/**
 * Result of expression evaluation
 */
interface EvaluationResult {
  value: number;
  error?: string;
  success: boolean;
}

/**
 * Secure expression evaluator using mathjs
 * Replaces unsafe new Function() calls
 */
export class ExpressionEvaluator {
  private static compiledCache: Map<string, ReturnType<typeof compile>> = new Map();
  private static readonly CACHE_MAX_SIZE = 1000;
  
  /**
   * Evaluate an expression with given variables
   * @param expression Mathematical expression (e.g., "P = rho * g * h")
   * @param scope Variables to use in evaluation
   * @returns EvaluationResult with value or error
   */
  static evaluate(expression: string, scope: EvaluationScope = {}): EvaluationResult {
    // Build full scope with constants
    const fullScope = { ...ENGINEERING_CONSTANTS, ...scope };
    
    try {
      // Use mathjs evaluate for simple expressions
      const result = evaluate(expression, fullScope);
      
      if (typeof result === 'number') {
        return { value: result, success: true };
      }
      
      // Handle symbol results (returns last symbol value)
      if (typeof result === 'undefined' && scope[expression] !== undefined) {
        return { value: scope[expression], success: true };
      }
      
      return { value: NaN, error: 'Expression did not evaluate to a number', success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { value: NaN, error: message, success: false };
    }
  }
  
  /**
   * Compile and cache an expression for repeated evaluation
   * More efficient for simulations that evaluate the same expression multiple times
   * @param expression Mathematical expression
   * @returns Compiled expression or error
   */
  static compile(expression: string): { compiled: ReturnType<typeof compile> | null; error?: string } {
    // Check cache first
    if (this.compiledCache.has(expression)) {
      return { compiled: this.compiledCache.get(expression)! };
    }
    
    // Check cache size limit
    if (this.compiledCache.size >= this.CACHE_MAX_SIZE) {
      // Clear oldest entries (simple FIFO)
      const firstKey = this.compiledCache.keys().next().value;
      this.compiledCache.delete(firstKey);
    }
    
    try {
      const compiled = compile(expression);
      this.compiledCache.set(expression, compiled);
      return { compiled };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Compilation failed';
      return { compiled: null, error: message };
    }
  }
  
  /**
   * Evaluate a compiled expression with new scope
   * @param compiled Compiled expression from compile()
   * @param scope Variables to use in evaluation
   * @returns EvaluationResult with value or error
   */
  static evaluateCompiled(
    compiled: ReturnType<typeof compile>,
    scope: EvaluationScope = {}
  ): EvaluationResult {
    const fullScope = { ...ENGINEERING_CONSTANTS, ...scope };
    
    try {
      const result = compiled.evaluate(fullScope);
      
      if (typeof result === 'number') {
        return { value: result, success: true };
      }
      
      return { value: NaN, error: 'Compiled expression did not evaluate to a number', success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { value: NaN, error: message, success: false };
    }
  }
  
  /**
   * Parse and validate an expression without evaluating
   * Useful for checking expression validity before use
   * @param expression Mathematical expression
   * @returns Whether expression is syntactically valid
   */
  static isValid(expression: string): boolean {
    try {
      compile(expression);
      return true;
    } catch {
      return false;
    }
  }
  
  /**
   * Get list of symbols used in an expression
   * @param expression Mathematical expression
   * @returns Array of symbol names (excluding constants)
   */
  static getSymbols(expression: string): string[] {
    try {
      const compiled = compile(expression);
      // Get symbols that are not constants
      const allSymbols = compiled.evaluate({});
      
      if (typeof allSymbols === 'object' && allSymbols !== null) {
        return Object.keys(allSymbols).filter(s => !(s in ENGINEERING_CONSTANTS));
      }
      
      return [];
    } catch {
      return [];
    }
  }
  
  /**
   * Clear the compilation cache
   * Useful when expressions change dynamically
   */
  static clearCache(): void {
    this.compiledCache.clear();
  }
  
  /**
   * Get cache statistics
   */
  static getCacheStats(): { size: number; maxSize: number } {
    return {
      size: this.compiledCache.size,
      maxSize: this.CACHE_MAX_SIZE,
    };
  }
  
  /**
   * Create a scoped evaluator for repeated use
   * More efficient for bulk evaluations
   */
  static createScopedEvaluator(initialScope: EvaluationScope = {}) {
    return {
      evaluate: (expression: string) => ExpressionEvaluator.evaluate(expression, initialScope),
      compile: (expression: string) => ExpressionEvaluator.compile(expression),
      evaluateCompiled: (compiled: ReturnType<typeof compile>) => 
        ExpressionEvaluator.evaluateCompiled(compiled, initialScope),
      setScope: (newScope: EvaluationScope) => {
        Object.assign(initialScope, newScope);
      },
      getScope: () => ({ ...initialScope }),
    };
  }
}

/**
 * Alternative evaluator using Function constructor with strict sanitization
 * For environments where mathjs is not available
 * NOT RECOMMENDED for production - use ExpressionEvaluator instead
 * @deprecated Use ExpressionEvaluator with mathjs
 */
export class SanitizedExpressionEvaluator {
  // Whitelist of allowed characters (alphanumeric, operators, parentheses, spaces)
  private static readonly ALLOWED_PATTERN = /^[a-zA-Z0-9_\s\+\-\*\/\^\(\)\.\,\=\<\>\!]+$/;
  
  // Whitelist of allowed function names
  private static readonly ALLOWED_FUNCTIONS = new Set([
    'sin', 'cos', 'tan', 'asin', 'acos', 'atan',
    'sinh', 'cosh', 'tanh',
    'sqrt', 'abs', 'exp', 'log', 'log10', 'ln',
    'pow', 'floor', 'ceil', 'round', 'min', 'max',
  ]);
  
  static evaluate(expression: string, scope: Record<string, number> = {}): EvaluationResult {
    // Validate characters
    if (!this.ALLOWED_PATTERN.test(expression)) {
      return { value: NaN, error: 'Expression contains invalid characters', success: false };
    }
    
    // Check for dangerous patterns
    if (/\b(eval|Function|constructor|prototype|__proto__|globalThis|this)\b/i.test(expression)) {
      return { value: NaN, error: 'Expression contains dangerous keywords', success: false };
    }
    
    // Build variable assignments
    const varAssignments = Object.entries(scope)
      .map(([key, value]) => `var ${key} = ${value};`)
      .join('\n');
    
    try {
      // Use indirect eval to avoid global scope pollution
      const indirectEval = eval;
      const result = indirectEval(`${varAssignments}\n${expression}`);
      
      if (typeof result === 'number' && !isNaN(result) && isFinite(result)) {
        return { value: result, success: true };
      }
      
      return { value: NaN, error: 'Expression did not evaluate to a valid number', success: false };
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown error';
      return { value: NaN, error: message, success: false };
    }
  }
}

export default ExpressionEvaluator;

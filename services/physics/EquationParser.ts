import { create, all, MathNode } from 'mathjs';

const math = create(all, {});

export class EquationParser {
    private static instance: EquationParser;

    private constructor() { }

    public static getInstance(): EquationParser {
        if (!EquationParser.instance) {
            EquationParser.instance = new EquationParser();
        }
        return EquationParser.instance;
    }

    private cache: Map<string, any> = new Map();
    private readonly MAX_CACHE_SIZE = 1000;

    /**
     * Evaluates a mathematical expression with a given scope.
     * Uses LRU-like caching for compiled expressions to boost performance (O(1) vs O(N) parsing).
     * @param expression The equation string (e.g., "P = tau * omega")
     * @param scope Record of variable name to value
     */
    public evaluate(expression: string, scope: Record<string, number>): any {
        try {
            // Handle simple assignment forms "y = x + 1" -> evaluate "x + 1"
            const parts = expression.includes('=') ? expression.split('=') : [expression];
            const rhs = parts[parts.length - 1].trim();

            let compiled = this.cache.get(rhs);
            if (!compiled) {
                compiled = math.compile(rhs);

                // Simple cache eviction
                if (this.cache.size >= this.MAX_CACHE_SIZE) {
                    this.cache.clear(); // Flush all if full (simpler than strict LRU for now)
                }
                this.cache.set(rhs, compiled);
            }

            return compiled.evaluate(scope);
        } catch (error) {
            console.error(`Error evaluating expression: ${expression}`, error);
            return NaN;
        }
    }

    /**
     * Extracts variable names from an expression.
     */
    public getVariables(expression: string): string[] {
        try {
            const parts = expression.includes('=') ? expression.split('=') : [expression];
            const rhs = parts[parts.length - 1].trim();
            const node = math.parse(rhs);
            const variables = new Set<string>();

            node.traverse((node: MathNode, path: string, parent: MathNode) => {
                if (node.type === 'SymbolNode') {
                    // @ts-ignore
                    variables.add(node.name);
                }
            });

            return Array.from(variables);
        } catch (error) {
            console.error(`Error parsing variables for: ${expression}`, error);
            return [];
        }
    }

    /**
     * Calculates the symbolic derivative of an expression with respect to a variable.
     * Used for Jacobian generation.
     */
    public getDerivative(expression: string, variable: string): string {
        try {
            const parts = expression.includes('=') ? expression.split('=') : [expression];
            const rhs = parts[parts.length - 1].trim();
            const derivative = math.derivative(rhs, variable);
            return derivative.toString();
        } catch (error) {
            // If differentiation fails (e.g. variable not in expression), return "0"
            return "0";
        }
    }

    /**
     * Generates a Jacobian row for a specific equation against a list of state variables.
     */
    public generateJacobianRow(equation: string, stateVariables: string[]): string[] {
        return stateVariables.map(v => this.getDerivative(equation, v));
    }
}

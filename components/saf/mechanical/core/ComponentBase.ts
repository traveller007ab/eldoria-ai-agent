/**
 * Mechanical SAF Lab v2.0 - Core Component System
 * Base classes and interfaces for the component architecture.
 * 
 * This module provides the foundation for all mechanical components,
 * following an interface-based design pattern for modularity.
 */

import {
  ComponentDefinition,
  ComponentInstance,
  PortDefinition,
  ParameterDefinition,
  EquationDefinition,
  ConstraintDefinition,
  ConstraintViolation,
  ValidationRule,
  SolverConfiguration,
  SimulationResult,
  createComponentId,
  DEFAULT_SOLVER_CONFIG,
} from '../types';

/**
 * Base class for all mechanical components.
 * Provides common functionality for parameters, ports, equations, and validation.
 */
export abstract class ComponentBase {
  // Instance data
  public readonly id: string;
  public name: string;
  public position: { x: number; y: number };
  public rotation: number = 0;
  
  // Parameter values (runtime)
  protected parameterValues: Map<string, number | string> = new Map();
  
  // State
  protected isInitialized: boolean = false;
  protected validationErrors: Map<string, string[]> = new Map();
  protected validationWarnings: Map<string, string[]> = new Map();
  
  // Computed values
  protected computedValues: Map<string, number> = new Map();
  
  constructor(
    public readonly definition: ComponentDefinition,
    position?: { x: number; y: number },
    name?: string
  ) {
    this.id = createComponentId(definition.id.split('.')[0]);
    this.name = name || definition.name;
    this.position = position || { x: 0, y: 0 };
    
    // Initialize parameters from definition defaults
    this.initializeParameters();
  }
  
  // =========================================================================
  // Initialization
  // =========================================================================
  
  private initializeParameters(): void {
    for (const param of this.definition.parameters) {
      if (param.value !== null && typeof param.value !== 'boolean') {
        this.parameterValues.set(param.id, param.value);
      }
    }
    this.isInitialized = true;
  }
  
  /**
   * Called after component is added to a system.
   * Override in subclasses for custom initialization.
   */
  public initialize(system: SystemContext): void {
    this.isInitialized = true;
    this.validate();
  }
  
  /**
   * Called when component is removed from system.
   * Override for cleanup.
   */
  public dispose(): void {
    this.parameterValues.clear();
    this.computedValues.clear();
    this.validationErrors.clear();
    this.validationWarnings.clear();
  }
  
  // =========================================================================
  // Parameter Management
  // =========================================================================
  
  /**
   * Get a parameter value by ID
   */
  public getParameterValue(paramId: string): number | string | undefined {
    return this.parameterValues.get(paramId);
  }
  
  /**
   * Get a parameter value with default if not set
   */
  public getParameterValueOrDefault(paramId: string, defaultValue: number | string): number | string {
    const value = this.parameterValues.get(paramId);
    return value !== undefined ? value : defaultValue;
  }
  
  /**
   * Set a parameter value
   */
  public setParameterValue(paramId: string, value: number | string): boolean {
    const paramDef = this.definition.parameters.find(p => p.id === paramId);
    if (!paramDef) {
      console.warn(`Parameter ${paramId} not found in definition`);
      return false;
    }
    
    // Validate
    const validationResult = this.validateParameterValue(paramDef, value);
    if (!validationResult.valid && validationResult.severity === 'error') {
      this.validationErrors.set(paramId, [validationResult.message || 'Invalid value']);
      return false;
    }
    
    this.parameterValues.set(paramId, value);
    this.invalidateComputations([paramId]);
    return true;
  }
  
  /**
   * Get all parameter values as a record
   */
  public getParameterValues(): Record<string, number | string> {
    return Object.fromEntries(this.parameterValues);
  }
  
  /**
   * Get parameter definition by ID
   */
  public getParameterDefinition(paramId: string): ParameterDefinition | undefined {
    return this.definition.parameters.find(p => p.id === paramId);
  }
  
  /**
   * Get all parameter definitions
   */
  public getAllParameters(): ParameterDefinition[] {
    return this.definition.parameters;
  }
  
  // =========================================================================
  // Port Management
  // =========================================================================
  
  /**
   * Get a port by ID
   */
  public getPort(portId: string): PortDefinition | undefined {
    return this.definition.ports.find(p => p.id === portId);
  }
  
  /**
   * Get all ports
   */
  public getAllPorts(): PortDefinition[] {
    return this.definition.ports;
  }
  
  /**
   * Get input ports
   */
  public getInputPorts(): PortDefinition[] {
    return this.definition.ports.filter(p => p.type === 'input' || p.type === 'bidirectional');
  }
  
  /**
   * Get output ports
   */
  public getOutputPorts(): PortDefinition[] {
    return this.definition.ports.filter(p => p.type === 'output' || p.type === 'bidirectional');
  }
  
  // =========================================================================
  // Equation Evaluation
  // =========================================================================
  
  /**
   * Evaluate an equation with current parameter values
   * Override in subclasses for physics-based equations
   */
  public evaluateEquation(equationId: string, context?: Record<string, number>): number {
    const equation = this.definition.equations.find(e => e.id === equationId);
    if (!equation) {
      throw new Error(`Equation ${equationId} not found`);
    }
    
    // Simple expression evaluation (extend with math.js for complex cases)
    const vars = this.buildVariableContext(context);
    return this.evaluateExpression(equation.expression, vars);
  }
  
  /**
   * Build variable context from parameters and computed values
   */
  protected buildVariableContext(additionalVars?: Record<string, number>): Record<string, number> {
    const vars: Record<string, number> = {};
    
    // Add parameter values
    for (const [id, value] of this.parameterValues) {
      if (typeof value === 'number') {
        vars[id] = value;
      }
    }
    
    // Add computed values
    for (const [id, value] of this.computedValues) {
      vars[id] = value;
    }
    
    // Add additional context
    if (additionalVars) {
      Object.assign(vars, additionalVars);
    }
    
    return vars;
  }
  
  /**
   * Simple expression evaluator
   * Note: Replace with math.js for complex expressions
   */
  protected evaluateExpression(expr: string, vars: Record<string, number>): number {
    // Create a safe evaluation function
    const keys = Object.keys(vars);
    const values = Object.values(vars);
    
    try {
      // Very basic evaluation - replace with math.js for production
      const fn = new Function(...keys, `return ${expr};`);
      return fn(...values);
    } catch (error) {
      console.error(`Failed to evaluate expression: ${expr}`, error);
      return NaN;
    }
  }
  
  // =========================================================================
  // Validation
  // =========================================================================
  
  /**
   * Validate a parameter value against its rules
   */
  protected validateParameterValue(
    param: ParameterDefinition,
    value: number | string
  ): { valid: boolean; message?: string; severity: 'error' | 'warning' | 'info' } {
    if (param.validation?.rules) {
      for (const rule of param.validation.rules) {
        const result = this.checkValidationRule(rule, value);
        if (!result.valid) {
          return { valid: false, message: result.message, severity: rule.severity };
        }
      }
    }
    
    return { valid: true, severity: 'info' };
  }
  
  /**
   * Check a single validation rule
   */
  protected checkValidationRule(
    rule: ValidationRule,
    value: number | string
  ): { valid: boolean; message?: string } {
    switch (rule.type) {
      case 'min':
        if (typeof value === 'number' && value < (rule.value as number)) {
          return { valid: false, message: rule.message };
        }
        break;
      case 'max':
        if (typeof value === 'number' && value > (rule.value as number)) {
          return { valid: false, message: rule.message };
        }
        break;
      case 'gt':
        if (typeof value === 'number' && value <= (rule.value as number)) {
          return { valid: false, message: rule.message };
        }
        break;
      case 'lt':
        if (typeof value === 'number' && value >= (rule.value as number)) {
          return { valid: false, message: rule.message };
        }
        break;
      case 'inList':
        const list = rule.value as (number | string)[];
        if (!list.includes(value)) {
          return { valid: false, message: rule.message };
        }
        break;
    }
    return { valid: true };
  }
  
  /**
   * Validate the component
   */
  public validate(): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];
    
    // Validate parameters
    for (const param of this.definition.parameters) {
      const value = this.parameterValues.get(param.id);
      if (value !== undefined) {
        const result = this.validateParameterValue(param, value);
        if (!result.valid && result.severity === 'error') {
          this.validationErrors.set(param.id, [result.message || 'Invalid value']);
        }
      }
    }
    
    // Evaluate constraints
    for (const constraint of this.definition.constraints) {
      const violation = this.evaluateConstraint(constraint);
      if (violation) {
        violations.push(violation);
      }
    }
    
    return violations;
  }
  
  /**
   * Evaluate a constraint
   */
  protected evaluateConstraint(constraint: ConstraintDefinition): ConstraintViolation | null {
    // Get related parameter values
    const vars: Record<string, number> = {};
    if (constraint.relatedParameters) {
      for (const paramId of constraint.relatedParameters) {
        const value = this.parameterValues.get(paramId);
        if (typeof value === 'number') {
          vars[paramId] = value;
        }
      }
    }
    
    // Evaluate constraint expression
    try {
      const result = this.evaluateExpression(constraint.expression, vars);
      
      // Check constraint based on type
      if (constraint.type === 'inequality') {
        // Parse "expression < limit" or "expression > limit"
        const match = constraint.expression.match(/([<>]=?)/);
        if (match) {
          const parts = constraint.expression.split(match[0]);
          if (parts.length === 2) {
            const lhs = this.evaluateExpression(parts[0], vars);
            const rhs = this.evaluateExpression(parts[1], vars);
            
            if (isNaN(lhs) || isNaN(rhs)) return null;
            
            const isViolated = 
              (match[0] === '<' && lhs >= rhs) ||
              (match[0] === '<=' && lhs > rhs) ||
              (match[0] === '>' && lhs <= rhs) ||
              (match[0] === '>=' && lhs < rhs);
            
            if (isViolated) {
              return {
                constraintId: constraint.id,
                constraint,
                actualValue: lhs,
                limitValue: rhs,
                margin: Math.abs(lhs - rhs)
              };
            }
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to evaluate constraint ${constraint.id}:`, error);
    }
    
    return null;
  }
  
  /**
   * Get validation errors
   */
  public getValidationErrors(): Map<string, string[]> {
    return new Map(this.validationErrors);
  }
  
  /**
   * Get validation warnings
   */
  public getValidationWarnings(): Map<string, string[]> {
    return new Map(this.validationWarnings);
  }
  
  /**
   * Check if component is valid
   */
  public isValid(): boolean {
    return this.validationErrors.size === 0;
  }
  
  // =========================================================================
  // Computation
  // =========================================================================
  
  /**
   * Compute derived values
   * Override in subclasses for physics calculations
   */
  public compute(context?: SystemContext): void {
    // Base implementation - override in subclasses
    this.computedValues.clear();
  }
  
  /**
   * Get a computed value
   */
  public getComputedValue(key: string): number | undefined {
    return this.computedValues.get(key);
  }
  
  /**
   * Set a computed value
   */
  protected setComputedValue(key: string, value: number): void {
    this.computedValues.set(key, value);
  }
  
  /**
   * Invalidate computations when parameters change
   */
  protected invalidateComputations(changedParams: string[]): void {
    // Mark for recomputation - actual computation happens on demand
    this.computedValues.clear();
  }
  
  // =========================================================================
  // Serialization
  // =========================================================================
  
  /**
   * Create instance data for saving
   */
  public createInstance(): ComponentInstance {
    return {
      id: this.id,
      definitionId: this.definition.id,
      name: this.name,
      position: this.position,
      rotation: this.rotation,
      parameterValues: this.getParameterValues(),
      isSelected: false,
      isVisible: true,
    };
  }
  
  /**
   * Load from instance data
   */
  public loadInstance(instance: ComponentInstance): void {
    // Note: id is preserved from constructor, only update mutable fields
    this.name = instance.name;
    this.position = instance.position;
    this.rotation = instance.rotation || 0;
    
    for (const [key, value] of Object.entries(instance.parameterValues)) {
      this.parameterValues.set(key, value);
    }
    
    this.invalidateComputations(Object.keys(instance.parameterValues));
  }
  
  // =========================================================================
  // Info
  // =========================================================================
  
  /**
   * Get component info
   */
  public getInfo(): { id: string; name: string; domain: string; category: string } {
    return {
      id: this.id,
      name: this.name,
      domain: this.definition.domain,
      category: this.definition.subcategory,
    };
  }
  
  /**
   * Get definition ID (for catalog reference)
   */
  public getDefinitionId(): string {
    return this.definition.id;
  }
}

// ============================================================================
// System Context (passed during compute/initialize)
// ============================================================================

export interface SystemContext {
  components: Map<string, ComponentBase>;
  connections: Map<string, { source: ComponentBase; target: ComponentBase }>;
  solver?: SolverConfiguration;
  fluidProperties?: {
    density: number;
    viscosity: number;
    specificHeat: number;
  };
}

// ============================================================================
// Component Factory
// ============================================================================

export interface ComponentConstructor {
  new (
    definition: ComponentDefinition,
    position?: { x: number; y: number },
    name?: string
  ): ComponentBase;
}

export class ComponentFactory {
  private static registry: Map<string, ComponentConstructor> = new Map();
  
  /**
   * Register a component constructor
   */
  public static register(
    definitionId: string,
    constructor: ComponentConstructor
  ): void {
    this.registry.set(definitionId, constructor);
  }
  
  /**
   * Create a component from definition
   */
  public static create(
    definition: ComponentDefinition,
    position?: { x: number; y: number },
    name?: string
  ): ComponentBase {
    const constructor = this.registry.get(definition.id);
    
    if (constructor) {
      return new constructor(definition, position, name);
    }
    
    // Return base component if no specific constructor
    return new GenericComponent(definition, position, name);
  }
  
  /**
   * Check if a specific constructor exists
   */
  public static hasConstructor(definitionId: string): boolean {
    return this.registry.has(definitionId);
  }
}

/**
 * Generic component that uses base functionality
 * Use specific component classes for physics calculations
 */
export class GenericComponent extends ComponentBase {
  public compute(context?: SystemContext): void {
    // Generic component - no special computation
  }
}

// ============================================================================
// Decorators for component registration
// ============================================================================

export function registerComponent(definitionId: string) {
  return function <T extends new (...args: any[]) => ComponentBase>(
    constructor: T
  ) {
    ComponentFactory.register(definitionId, constructor);
    return constructor;
  };
}

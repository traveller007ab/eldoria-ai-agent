/**
 * SAF Lab v2.0 - Connection Validator
 * Validates component connections for domain compatibility, port direction, and fluid matching
 */

import { ComponentDefinition, PortDefinition, ComponentInstance } from '../types';

/**
 * Result of a connection validation
 */
export interface ConnectionValidationResult {
  valid: boolean;
  sourceComponent: string;
  sourcePort: string;
  targetComponent: string;
  targetPort: string;
  errors: string[];
  warnings: string[];
}

/**
 * Domain compatibility matrix
 */
const DOMAIN_COMPATIBILITY: Record<string, Set<string>> = {
  'fluid': new Set(['fluid']),
  'thermal': new Set(['thermal', 'fluid']),
  'mechanical': new Set(['mechanical']),
  'control': new Set(['control', 'signal']),
  'signal': new Set(['control', 'signal']),
  'material': new Set(['material']),
  'aerodynamic': new Set(['aerodynamic']),
};

/**
 * Port direction compatibility
 */
const DIRECTION_COMPATIBILITY: Record<string, Set<string>> = {
  'input': new Set(['output']),
  'output': new Set(['input']),
  'bidirectional': new Set(['input', 'output', 'bidirectional']),
};

/**
 * Connection Validator class
 */
export class ConnectionValidator {
  private static componentCache: Map<string, ComponentDefinition> = new Map();
  
  static validateConnection(
    sourceComponent: ComponentInstance,
    sourcePortId: string,
    targetComponent: ComponentInstance,
    targetPortId: string
  ): ConnectionValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    
    const sourceDef = this.getComponentDefinition(sourceComponent.definitionId);
    const targetDef = this.getComponentDefinition(targetComponent.definitionId);
    
    if (!sourceDef || !targetDef) {
      return {
        valid: false,
        sourceComponent: sourceComponent.name,
        sourcePort: sourcePortId,
        targetComponent: targetComponent.name,
        targetPort: targetPortId,
        errors: sourceDef ? [] : [`Unknown source: ${sourceComponent.definitionId}`],
        warnings: [],
      };
    }
    
    const sourcePort = sourceDef.ports.find(p => p.id === sourcePortId);
    const targetPort = targetDef.ports.find(p => p.id === targetPortId);
    
    if (!sourcePort || !targetPort) {
      return {
        valid: false,
        sourceComponent: sourceComponent.name,
        sourcePort: sourcePortId,
        targetComponent: targetComponent.name,
        targetPort: targetPortId,
        errors: [
          !sourcePort ? `Port ${sourcePortId} not found` : '',
          !targetPort ? `Port ${targetPortId} not found` : '',
        ].filter(Boolean),
        warnings: [],
      };
    }
    
    // Port direction validation
    const sourceDirs = DIRECTION_COMPATIBILITY[sourcePort.type];
    if (!sourceDirs.has(targetPort.type)) {
      errors.push(`Direction mismatch: ${sourcePort.type} → ${targetPort.type}`);
    }
    
    // Domain validation
    const compatibleDomains = DOMAIN_COMPATIBILITY[sourcePort.domain];
    if (!compatibleDomains.has(targetPort.domain)) {
      errors.push(`Domain mismatch: ${sourcePort.domain} → ${targetPort.domain}`);
    } else if (sourcePort.domain !== targetPort.domain) {
      warnings.push(`Cross-domain connection: ${sourcePort.domain} → ${targetPort.domain}`);
    }
    
    return {
      valid: errors.length === 0,
      sourceComponent: sourceComponent.name,
      sourcePort: sourcePortId,
      targetComponent: targetComponent.name,
      targetPort: targetPortId,
      errors,
      warnings,
    };
  }
  
  private static getComponentDefinition(id: string): ComponentDefinition | undefined {
    if (this.componentCache.has(id)) {
      return this.componentCache.get(id);
    }
    
    try {
      const { COMPONENT_CATALOG } = require('../fluid');
      const definition = COMPONENT_CATALOG[id];
      if (definition) {
        this.componentCache.set(id, definition);
      }
      return definition;
    } catch {
      return undefined;
    }
  }
  
  static clearCache(): void {
    this.componentCache.clear();
  }
  
  static isConnectionValid(
    sourceComponent: ComponentInstance,
    sourcePortId: string,
    targetComponent: ComponentInstance,
    targetPortId: string
  ): boolean {
    const result = this.validateConnection(
      sourceComponent,
      sourcePortId,
      targetComponent,
      targetPortId
    );
    return result.valid;
  }
}

export default ConnectionValidator;

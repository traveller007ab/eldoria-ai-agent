/**
 * Parameter Validation System
 * Real-time parameter validation with cross-parameter dependency checks
 */

import { ComponentParameter, MechanicalComponent } from '../types';

export interface ValidationError {
  parameterName: string;
  severity: 'error' | 'warning' | 'info';
  message: string;
  code?: string;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
  warnings: ValidationError[];
}

/**
 * Validate a single parameter value against its constraints
 */
export function validateParameter(
  param: ComponentParameter,
  value: number | string,
  allParams?: ComponentParameter[]
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Type validation
  if (typeof param.value !== typeof value) {
    errors.push({
      parameterName: param.name,
      severity: 'error',
      message: `Expected ${typeof param.value}, got ${typeof value}`,
      code: 'TYPE_MISMATCH'
    });
  }

  if (typeof value === 'number') {
    // Design range validation
    if (param.designRange) {
      if (value < param.designRange.min) {
        errors.push({
          parameterName: param.name,
          severity: 'error',
          message: `Value ${value} is below minimum ${param.designRange.min} ${param.unit}`,
          code: 'BELOW_MIN'
        });
      }
      if (value > param.designRange.max) {
        errors.push({
          parameterName: param.name,
          severity: 'error',
          message: `Value ${value} exceeds maximum ${param.designRange.max} ${param.unit}`,
          code: 'ABOVE_MAX'
        });
      }
    }

    // Physical constraints
    if (param.name.toLowerCase().includes('pressure') && value < 0) {
      errors.push({
        parameterName: param.name,
        severity: 'error',
        message: 'Pressure cannot be negative',
        code: 'NEGATIVE_PRESSURE'
      });
    }

    if (param.name.toLowerCase().includes('temperature') && value < -273.15) {
      errors.push({
        parameterName: param.name,
        severity: 'error',
        message: 'Temperature cannot be below absolute zero (-273.15°C)',
        code: 'BELOW_ABSOLUTE_ZERO'
      });
    }

    if ((param.name.toLowerCase().includes('flow') || param.name.toLowerCase().includes('diameter') || param.name.toLowerCase().includes('length')) && value <= 0) {
      errors.push({
        parameterName: param.name,
        severity: 'error',
        message: `${param.name} must be positive`,
        code: 'NON_POSITIVE'
      });
    }

    // Standard size warning
    if (param.standardSizes && param.standardSizes.length > 0) {
      const isStandard = param.standardSizes.some(size => {
        const numSize = typeof size === 'number' ? size : parseFloat(size as string);
        return !isNaN(numSize) && Math.abs(numSize - value) < 0.001;
      });
      if (!isStandard) {
        errors.push({
          parameterName: param.name,
          severity: 'warning',
          message: `Value ${value} is not a standard size. Consider: ${param.standardSizes.slice(0, 3).join(', ')}`,
          code: 'NON_STANDARD_SIZE'
        });
      }
    }
  }

  // Cross-parameter validation
  if (allParams) {
    const crossErrors = validateCrossParameters(param, value, allParams);
    errors.push(...crossErrors);
  }

  return errors;
}

/**
 * Validate cross-parameter dependencies
 */
function validateCrossParameters(
  param: ComponentParameter,
  value: number | string,
  allParams: ComponentParameter[]
): ValidationError[] {
  const errors: ValidationError[] = [];
  const paramsMap = new Map(allParams.map(p => [p.name, p]));

  // Pump: Head should be consistent with power and efficiency
  if (param.name === 'H_design' && typeof value === 'number') {
    const Q_design = paramsMap.get('Q_design');
    const eta = paramsMap.get('η_BEP');
    const power = paramsMap.get('power');

    if (Q_design && eta && typeof Q_design.value === 'number' && typeof eta.value === 'number') {
      const expectedPower = (Q_design.value * value * 9810) / eta.value / 1000;
      if (power && typeof power.value === 'number') {
        const ratio = expectedPower / power.value;
        if (ratio > 1.2 || ratio < 0.8) {
          errors.push({
            parameterName: param.name,
            severity: 'warning',
            message: `Head ${value}m may be inconsistent with power. Expected ~${expectedPower.toFixed(2)}kW`,
            code: 'INCONSISTENT_POWER'
          });
        }
      }
    }
  }

  // Flow: Flow rate should be within pipe capacity
  if (param.name === 'Q_design' && typeof value === 'number') {
    const diameter = paramsMap.get('diameter');
    if (diameter && typeof diameter.value === 'number') {
      const maxFlow = Math.PI * Math.pow(diameter.value / 2, 2) * 3; // ~3 m/s max velocity
      if (value > maxFlow) {
        errors.push({
          parameterName: param.name,
          severity: 'error',
          message: `Flow rate ${value} m³/s exceeds pipe capacity (~${maxFlow.toFixed(2)} m³/s)`,
          code: 'FLOW_EXCEEDS_CAPACITY'
        });
      }
    }
  }

  // Speed: RPM should be reasonable for the application
  if (param.name === 'N' && typeof value === 'number') {
    if (value < 100 || value > 10000) {
      errors.push({
        parameterName: param.name,
        severity: 'warning',
        message: `Speed ${value} RPM is outside typical range (100-10000 RPM)`,
        code: 'UNUSUAL_SPEED'
      });
    }
  }

  return errors;
}

/**
 * Validate all parameters in a component
 */
export function validateComponent(component: MechanicalComponent): ValidationResult {
  const errors: ValidationError[] = [];
  const warnings: ValidationError[] = [];

  (component.parameters || []).forEach(param => {
    const paramErrors = validateParameter(param, param.value, component.parameters);
    paramErrors.forEach(err => {
      if (err.severity === 'error') {
        errors.push(err);
      } else {
        warnings.push(err);
      }
    });
  });

  return {
    isValid: errors.length === 0,
    errors,
    warnings
  };
}

/**
 * Validate unit conversion
 */
export function validateUnitConversion(
  value: number,
  fromUnit: string,
  toUnit: string
): { valid: boolean; convertedValue?: number; error?: string } {
  // Common conversions
  const conversions: Record<string, Record<string, (v: number) => number>> = {
    'Pa': { 'kPa': (v) => v / 1000, 'bar': (v) => v / 100000, 'psi': (v) => v * 0.000145038 },
    'kPa': { 'Pa': (v) => v * 1000, 'bar': (v) => v / 100, 'psi': (v) => v * 0.145038 },
    'bar': { 'Pa': (v) => v * 100000, 'kPa': (v) => v * 100, 'psi': (v) => v * 14.5038 },
    'psi': { 'Pa': (v) => v / 0.000145038, 'kPa': (v) => v / 0.145038, 'bar': (v) => v / 14.5038 },
    'm': { 'mm': (v) => v * 1000, 'cm': (v) => v * 100, 'ft': (v) => v * 3.28084 },
    'mm': { 'm': (v) => v / 1000, 'cm': (v) => v / 10, 'ft': (v) => v / 304.8 },
    'cm': { 'm': (v) => v / 100, 'mm': (v) => v * 10, 'ft': (v) => v / 30.48 },
    'ft': { 'm': (v) => v / 3.28084, 'mm': (v) => v * 304.8, 'cm': (v) => v * 30.48 },
    '°C': { 'K': (v) => v + 273.15, '°F': (v) => v * 9/5 + 32 },
    'K': { '°C': (v) => v - 273.15, '°F': (v) => (v - 273.15) * 9/5 + 32 },
    '°F': { '°C': (v) => (v - 32) * 5/9, 'K': (v) => (v - 32) * 5/9 + 273.15 }
  };

  if (fromUnit === toUnit) {
    return { valid: true, convertedValue: value };
  }

  const converter = conversions[fromUnit]?.[toUnit];
  if (!converter) {
    return { valid: false, error: `Cannot convert from ${fromUnit} to ${toUnit}` };
  }

  return { valid: true, convertedValue: converter(value) };
}

/**
 * Get validation error message for display
 */
export function getValidationErrorDescription(error: ValidationError): string {
  const suggestions: Record<string, string> = {
    'TYPE_MISMATCH': 'Check the input type',
    'BELOW_MIN': 'Increase the value',
    'ABOVE_MAX': 'Decrease the value',
    'NEGATIVE_PRESSURE': 'Use a positive pressure value',
    'BELOW_ABSOLUTE_ZERO': 'Temperature must be above -273.15°C',
    'NON_POSITIVE': 'Use a positive value',
    'NON_STANDARD_SIZE': 'Consider using a standard size',
    'INCONSISTENT_POWER': 'Review power and efficiency parameters',
    'FLOW_EXCEEDS_CAPACITY': 'Increase pipe diameter or decrease flow rate',
    'UNUSUAL_SPEED': 'Verify the speed specification'
  };

  return suggestions[error.code || ''] || 'Review the parameter value';
}

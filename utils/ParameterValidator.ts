import { MechParameterDefinition, MechComponentDefinition } from '../types';

export interface ValidationResult {
    isValid: boolean;
    error?: string;
    warning?: string;
}

export interface ParameterValidationRule {
    type: 'range' | 'required' | 'pattern' | 'custom';
    min?: number;
    max?: number;
    pattern?: string;
    message: string;
    warningMessage?: string;
    validate: (value: any) => ValidationResult;
}

export class ParameterValidator {
    private static rules: Map<string, ParameterValidationRule[]> = new Map();

    static registerRules(componentId: string, rules: ParameterValidationRule[]) {
        this.rules.set(componentId, rules);
    }

    static getRules(componentId: string): ParameterValidationRule[] {
        return this.rules.get(componentId) || [];
    }

    static validateParameter(
        paramDef: MechParameterDefinition,
        value: number | string | boolean | null | undefined
    ): ValidationResult {
        if (value === null || value === undefined || value === '') {
            if (paramDef.source === 'design') {
                return { isValid: false, error: `${paramDef.name} is required` };
            }
            return { isValid: true };
        }

        const numValue = typeof value === 'number' ? value : parseFloat(value as string);

        if (isNaN(numValue)) {
            if (paramDef.dataType === 'number') {
                return { isValid: false, error: `${paramDef.name} must be a valid number` };
            }
            return { isValid: true };
        }

        if (paramDef.designRange) {
            if (paramDef.designRange.min !== undefined && numValue < paramDef.designRange.min) {
                return {
                    isValid: false,
                    error: `${paramDef.name} must be at least ${paramDef.designRange.min} ${paramDef.unit}`
                };
            }
            if (paramDef.designRange.max !== undefined && numValue > paramDef.designRange.max) {
                return {
                    isValid: false,
                    error: `${paramDef.name} must not exceed ${paramDef.designRange.max} ${paramDef.unit}`
                };
            }
        }

        const customRules = this.getRules(paramDef.id);
        for (const rule of customRules) {
            const result = rule.validate(value);
            if (!result.isValid) {
                return result;
            }
            if (result.warning) {
                return result;
            }
        }

        return { isValid: true };
    }

    static validateComponent(
        componentDef: MechComponentDefinition,
        values: Record<string, number | string>
    ): Map<string, ValidationResult> {
        const results = new Map<string, ValidationResult>();

        for (const param of componentDef.parameters) {
            if (param.source === 'design') {
                const value = values[param.id];
                const result = this.validateParameter(param, value);
                results.set(param.id, result);
            }
        }

        return results;
    }

    static isWithinDesignRange(value: number, designRange?: { min: number; max: number }): boolean {
        if (!designRange) return true;
        if (designRange.min !== undefined && value < designRange.min) return false;
        if (designRange.max !== undefined && value > designRange.max) return false;
        return true;
    }

    static getRecommendedRange(paramDef: MechParameterDefinition): string {
        if (paramDef.designRange) {
            const min = paramDef.designRange.min ?? '−∞';
            const max = paramDef.designRange.max ?? '+∞';
            return `${min} - ${max} ${paramDef.unit}`;
        }
        return `Any ${paramDef.unit}`;
    }
}

export function formatValidationError(param: MechParameterDefinition, value: number | string): string {
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);

    if (isNaN(numValue)) {
        return `Invalid value for ${param.name}`;
    }

    if (param.designRange) {
        if (param.designRange.min !== undefined && numValue < param.designRange.min) {
            return `Minimum ${param.designRange.min} ${param.unit}`;
        }
        if (param.designRange.max !== undefined && numValue > param.designRange.max) {
            return `Maximum ${param.designRange.max} ${param.unit}`;
        }
    }

    return `Invalid value for ${param.name}`;
}

export function getValidationStatus(param: MechParameterDefinition, value: number | string): 'valid' | 'warning' | 'error' {
    const numValue = typeof value === 'number' ? value : parseFloat(value as string);

    if (isNaN(numValue)) {
        return 'error';
    }

    if (param.designRange) {
        if (param.designRange.min !== undefined && numValue < param.designRange.min * 0.9) {
            return 'warning';
        }
        if (param.designRange.max !== undefined && numValue > param.designRange.max * 1.1) {
            return 'warning';
        }
        if (param.designRange.min !== undefined && numValue < param.designRange.min) {
            return 'error';
        }
        if (param.designRange.max !== undefined && numValue > param.designRange.max) {
            return 'error';
        }
    }

    return 'valid';
}

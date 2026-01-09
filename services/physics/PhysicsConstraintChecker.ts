/**
 * Physics Constraint Checker
 * Validates system against physical limits and safety constraints
 * Checks: cavitation, NPSH, temperature, pressure, velocity, efficiency
 */

import { FluidPropertyDatabase } from './FluidProperties';
import { RealValveModel } from './RealValveModel';

export interface ConstraintViolation {
    id: string;
    componentId: string;
    severity: 'critical' | 'warning' | 'info';
    message: string;
    value: number;
    threshold: number;
    ruleId: string;
}

export interface ConstraintCheckResult {
    passed: boolean;
    violations: ConstraintViolation[];
    warnings: string[];
}

export interface SystemConstraints {
    maxTemperature: number;      // K
    minTemperature: number;      // K
    maxPressure: number;         // Pa
    maxVelocity: number;         // m/s
    minNPSHa: number;            // m (NPSH margin)
    maxCavitationNumber: number; // Minimum sigma
    maxNoiseLevel: number;       // dBA
    minEfficiency: number;       // %
}

export class PhysicsConstraintChecker {
    private static defaultConstraints: SystemConstraints = {
        maxTemperature: 400,     // ~127°C
        minTemperature: 260,     // ~-13°C
        maxPressure: 2e6,        // 20 bar
        maxVelocity: 10,         // m/s (typical pipe limit)
        minNPSHa: 3,             // 3m margin above NPSHr
        maxCavitationNumber: 0.3, // Below this = severe cavitation
        maxNoiseLevel: 85,       // dBA (occupational limit)
        minEfficiency: 20        // %
    };

    /**
     * Check all constraints for a component
     */
    static checkComponent(
        componentId: string,
        componentType: string,
        params: Record<string, number>,
        state: {
            temperature?: number;
            pressure?: number;
            flowRate?: number;
            velocity?: number;
            inletPressure?: number;
            outletPressure?: number;
            head?: number;
            power?: number;
            efficiency?: number;
        },
        fluidId: string = 'water',
        constraints: Partial<SystemConstraints> = {}
    ): ConstraintCheckResult {
        const rules = { ...this.defaultConstraints, ...constraints };
        const violations: ConstraintViolation[] = [];
        const warnings: string[] = [];

        // Temperature checks
        if (state.temperature !== undefined) {
            if (state.temperature > rules.maxTemperature) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'critical',
                    message: `Temperature ${state.temperature.toFixed(0)} K exceeds maximum ${rules.maxTemperature} K`,
                    value: state.temperature,
                    threshold: rules.maxTemperature,
                    ruleId: 'MAX_TEMP'
                });
            }
            if (state.temperature < rules.minTemperature) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'critical',
                    message: `Temperature ${state.temperature.toFixed(0)} K below minimum ${rules.minTemperature} K`,
                    value: state.temperature,
                    threshold: rules.minTemperature,
                    ruleId: 'MIN_TEMP'
                });
            }
        }

        // Pressure checks
        if (state.pressure !== undefined) {
            if (state.pressure > rules.maxPressure) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'critical',
                    message: `Pressure ${(state.pressure/1e6).toFixed(1)} MPa exceeds maximum 2 MPa`,
                    value: state.pressure,
                    threshold: rules.maxPressure,
                    ruleId: 'MAX_PRESSURE'
                });
            }
        }

        // Velocity checks
        if (state.velocity !== undefined) {
            if (state.velocity > rules.maxVelocity) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'warning',
                    message: `Velocity ${state.velocity.toFixed(1)} m/s exceeds recommended ${rules.maxVelocity} m/s (erosion risk)`,
                    value: state.velocity,
                    threshold: rules.maxVelocity,
                    ruleId: 'MAX_VELOCITY'
                });
            }
        }

        // Efficiency checks
        if (state.efficiency !== undefined && state.efficiency < rules.minEfficiency) {
            violations.push({
                id: crypto.randomUUID(),
                componentId,
                severity: 'warning',
                message: `Efficiency ${state.efficiency.toFixed(1)}% below minimum ${rules.minEfficiency}%`,
                value: state.efficiency,
                threshold: rules.minEfficiency,
                ruleId: 'MIN_EFFICIENCY'
            });
        }

        // Valve-specific checks
        if (componentType.includes('valve') || componentId.includes('valve')) {
            this.checkValveConstraints(
                componentId, params, state, fluidId, rules, violations, warnings
            );
        }

        // Pump-specific checks
        if (componentType.includes('pump') || componentId.includes('pump')) {
            this.checkPumpConstraints(
                componentId, params, state, fluidId, rules, violations, warnings
            );
        }

        return {
            passed: violations.filter(v => v.severity === 'critical').length === 0,
            violations,
            warnings
        };
    }

    /**
     * Check valve constraints (cavitation, choking, noise)
     */
    private static checkValveConstraints(
        componentId: string,
        params: Record<string, number>,
        state: { inletPressure?: number; outletPressure?: number; flowRate?: number; velocity?: number; pressure?: number; },
        fluidId: string,
        rules: SystemConstraints,
        violations: ConstraintViolation[],
        warnings: string[]
    ): void {
        if (state.inletPressure !== undefined && state.outletPressure !== undefined) {
            const vaporPressure = FluidPropertyDatabase.getVaporPressure(fluidId, 293.15);
            
            // Cavitation check
            const cavNumber = RealValveModel.calculateCavitationNumber(
                state.inletPressure,
                state.outletPressure,
                vaporPressure
            );

            if (cavNumber < 0.3) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'critical',
                    message: `Severe cavitation detected: σ = ${cavNumber.toFixed(2)} (recommended > 0.3)`,
                    value: cavNumber,
                    threshold: 0.3,
                    ruleId: 'CAVITATION_SEVERE'
                });
            } else if (cavNumber < 0.6) {
                warnings.push(`Moderate cavitation risk at ${componentId}: σ = ${cavNumber.toFixed(2)}`);
            }

            // Choked flow check
            const isChoked = RealValveModel.isChokedFlow(
                state.inletPressure,
                state.outletPressure,
                vaporPressure
            );
            if (isChoked) {
                warnings.push(`Choked flow conditions at ${componentId}`);
            }
        }

        // Noise check
        if (state.flowRate !== undefined && state.pressure !== undefined && params.diameter) {
            const noise = RealValveModel.calculateNoiseLevel(
                state.flowRate,
                state.pressure,
                params.diameter
            );
            if (noise > rules.maxNoiseLevel) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'warning',
                    message: `Noise level ${noise.toFixed(0)} dBA exceeds ${rules.maxNoiseLevel} dBA`,
                    value: noise,
                    threshold: rules.maxNoiseLevel,
                    ruleId: 'MAX_NOISE'
                });
            }
        }
    }

    /**
     * Check pump constraints (NPSH, efficiency)
     */
    private static checkPumpConstraints(
        componentId: string,
        params: Record<string, number>,
        state: { flowRate?: number; head?: number; efficiency?: number; },
        fluidId: string,
        rules: SystemConstraints,
        violations: ConstraintViolation[],
        warnings: string[]
    ): void {
        // NPSHa check
        if (params.npsha !== undefined) {
            if (params.npsha < rules.minNPSHa) {
                violations.push({
                    id: crypto.randomUUID(),
                    componentId,
                    severity: 'critical',
                    message: `NPSHa ${params.npsha.toFixed(1)} m below minimum ${rules.minNPSHa} m (cavitation risk)`,
                    value: params.npsha,
                    threshold: rules.minNPSHa,
                    ruleId: 'NPSH_MARGIN'
                });
            } else if (params.npsha < rules.minNPSHa * 2) {
                warnings.push(`NPSHa ${params.npsha.toFixed(1)} m is low - consider NPSHr margin`);
            }
        }

        // Pump efficiency check
        if (state.efficiency !== undefined) {
            if (state.efficiency < 40) {
                warnings.push(`Low pump efficiency ${state.efficiency.toFixed(0)}% at ${componentId} - check operating point`);
            }
        }
    }

    /**
     * Check engine constraints
     */
    static checkEngineConstraints(
        componentId: string,
        state: {
            coolantTemp?: number;
            oilTemp?: number;
            exhaustTemp?: number;
            rpm?: number;
            bsfc?: number;
            volumetricEfficiency?: number;
        },
        limits: {
            maxCoolantTemp?: number;
            maxOilTemp?: number;
            maxExhaustTemp?: number;
            maxRPM?: number;
        } = {}
    ): ConstraintCheckResult {
        const violations: ConstraintViolation[] = [];
        const warnings: string[] = [];

        const maxCoolantTemp = limits.maxCoolantTemp || 380; // ~107°C
        const maxOilTemp = limits.maxOilTemp || 400;         // ~127°C
        const maxExhaustTemp = limits.maxExhaustTemp || 1200; // K
        const maxRPM = limits.maxRPM || 7000;

        if (state.coolantTemp !== undefined && state.coolantTemp > maxCoolantTemp) {
            violations.push({
                id: crypto.randomUUID(),
                componentId,
                severity: 'critical',
                message: `Coolant temperature ${(state.coolantTemp - 273.15).toFixed(0)}°C exceeds limit`,
                value: state.coolantTemp,
                threshold: maxCoolantTemp,
                ruleId: 'MAX_COOLANT_TEMP'
            });
        }

        if (state.oilTemp !== undefined && state.oilTemp > maxOilTemp) {
            violations.push({
                id: crypto.randomUUID(),
                componentId,
                severity: 'critical',
                message: `Oil temperature ${(state.oilTemp - 273.15).toFixed(0)}°C exceeds limit`,
                value: state.oilTemp,
                threshold: maxOilTemp,
                ruleId: 'MAX_OIL_TEMP'
            });
        }

        if (state.exhaustTemp !== undefined && state.exhaustTemp > maxExhaustTemp) {
            violations.push({
                id: crypto.randomUUID(),
                componentId,
                severity: 'warning',
                message: `Exhaust temperature ${(state.exhaustTemp - 273.15).toFixed(0)}°C is high`,
                value: state.exhaustTemp,
                threshold: maxExhaustTemp,
                ruleId: 'MAX_EXHAUST_TEMP'
            });
        }

        if (state.rpm !== undefined && state.rpm > maxRPM) {
            violations.push({
                id: crypto.randomUUID(),
                componentId,
                severity: 'critical',
                message: `RPM ${state.rpm} exceeds redline ${maxRPM}`,
                value: state.rpm,
                threshold: maxRPM,
                ruleId: 'MAX_RPM'
            });
        }

        if (state.bsfc !== undefined && state.bsfc > 350) {
            warnings.push(`High BSFC ${state.bsfc.toFixed(0)} g/kWh at ${componentId} - check engine condition`);
        }

        if (state.volumetricEfficiency !== undefined && state.volumetricEfficiency < 0.6) {
            warnings.push(`Low volumetric efficiency ${(state.volumetricEfficiency * 100).toFixed(0)}% at ${componentId}`);
        }

        return {
            passed: violations.filter(v => v.severity === 'critical').length === 0,
            violations,
            warnings
        };
    }

    /**
     * Validate entire blueprint against constraints
     */
    static validateBlueprint(
        blueprint: {
            components: Array<{
                id: string;
                componentDefinitionId: string;
                name: string;
                parameterValues: Record<string, number>;
            }>;
        },
        simulationResults: {
            variables: Record<string, number>;
        },
        fluidId: string = 'water'
    ): { violations: ConstraintViolation[]; warnings: string[] } {
        const allViolations: ConstraintViolation[] = [];
        const allWarnings: string[] = [];

        blueprint.components.forEach(comp => {
            const prefix = comp.name.replace(/\s+/g, '_');
            const params = comp.parameterValues;
            const compType = comp.componentDefinitionId.toLowerCase();

            // Get relevant variables from simulation results
            const state: any = {};

            // Try to extract state from variable names
            Object.entries(simulationResults.variables).forEach(([key, value]) => {
                if (key.startsWith(prefix)) {
                    const varName = key.replace(prefix + '_', '');
                    if (varName === 'temperature' || varName === 'temp_k') {
                        state.temperature = value;
                    } else if (varName === 'pressure') {
                        state.pressure = value * 1000; // Convert kPa to Pa
                    } else if (varName === 'velocity') {
                        state.velocity = value;
                    } else if (varName === 'efficiency') {
                        state.efficiency = value;
                    }
                }
            });

            // Add params that might be in the parameterValues
            if (params.temperature) state.temperature = params.temperature;
            if (params.pressure) state.pressure = params.pressure;
            if (params.npsha) state.npsha = params.npsha;

            const result = this.checkComponent(
                comp.id,
                compType,
                params,
                state,
                fluidId
            );

            allViolations.push(...result.violations);
            allWarnings.push(...result.warnings);
        });

        return { violations: allViolations, warnings: allWarnings };
    }
}

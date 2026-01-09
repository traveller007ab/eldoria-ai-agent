/**
 * Real Pipe Flow Calculations
 * Implements Colebrook-White, Hazen-Williams, and Darcy-Weisbach
 * Based on: ASME, Hydraulic Institute, and ISO standards
 */

export interface PipeFlowResult {
    flowRate: number;           // m³/s
    velocity: number;           // m/s
    headLoss: number;           // m
    frictionFactor: number;     // Darcy friction factor
    reynoldsNumber: number;
    isLaminar: boolean;
    isTurbulent: boolean;
    criticalVelocity: number;   // m/s (for air entrainment warning)
    isCavitationRisk: boolean;
}

export interface PressureDropResult {
    pressureDrop: number;       // Pa
    headLoss: number;           // m
    velocity: number;           // m/s
    reynoldsNumber: number;
    frictionFactor: number;
}

export class RealPipeFlow {
    private static g = 9.80665; // m/s²

    /**
     * Calculate Darcy friction factor using Colebrook-White equation
     * 1/√f = -2 * log10(ε/(3.7D) + 2.51/(Re√f))
     * Solved using Newton-Raphson iteration
     */
    static calculateFrictionFactor(
        reynoldsNumber: number,
        relativeRoughness: number,  // ε/D (pipe roughness / diameter)
        diameter: number            // m
    ): number {
        // Handle laminar flow
        if (reynoldsNumber < 2300) {
            return 64 / reynoldsNumber; // Hagen-Poiseuille
        }

        // Handle fully turbulent flow (rough pipe limit)
        if (reynoldsNumber > 1e7 && relativeRoughness > 0.001) {
            const f = Math.pow(1.14 - 2 * Math.log10(relativeRoughness), -2);
            return Math.max(0.008, f); // Minimum practical value
        }

        // Colebrook-White using Newton-Raphson
        let f = 0.02; // Initial guess
        
        for (let i = 0; i < 100; i++) {
            const f_sqrt = Math.sqrt(f);
            const left = 1 / f_sqrt;
            const right = -2 * Math.log10(relativeRoughness / 3.7 + 2.51 / (reynoldsNumber * f_sqrt));
            const residual = left - right;
            
            if (Math.abs(residual) < 1e-8) break;
            
            // Derivative approximation
            const df = 0.01 * f;
            const left_prime = (1 / Math.sqrt(f + df) - 1 / f_sqrt) / df;
            const right_prime = -2 / (Math.LN10 * (relativeRoughness / 3.7 + 2.51 / (reynoldsNumber * f_sqrt))) 
                              * (-2.51 / (reynoldsNumber * f * f_sqrt));
            
            const f_prime = left_prime - right_prime;
            f = Math.max(0.008, f - residual / f_prime);
        }

        return Math.max(0.008, f); // Practical minimum
    }

    /**
     * Calculate friction factor using Swamee-Jain (explicit approximation)
     * Good for quick calculations without iteration
     */
    static calculateFrictionFactorExplicit(
        reynoldsNumber: number,
        relativeRoughness: number
    ): number {
        if (reynoldsNumber < 2300) {
            return 64 / reynoldsNumber;
        }

        // Swamee-Jain equation
        const epsilon_D = relativeRoughness;
        const term1 = epsilon_D / 3.7;
        const term2 = 5.74 / Math.pow(reynoldsNumber, 0.9);
        
        return 0.25 / Math.pow(Math.log10(term1 + term2), 2);
    }

    /**
     * Calculate head loss using Darcy-Weisbach equation
     * h_f = f * (L/D) * (V²/2g)
     */
    static calculateHeadLoss(
        frictionFactor: number,
        length: number,      // m
        diameter: number,    // m
        velocity: number,    // m/s
        minorLossesCoefficient: number = 0 // K for fittings
    ): number {
        const velocityHead = (velocity * velocity) / (2 * this.g);
        const fL_D = frictionFactor * (length / diameter);
        return (fL_D + minorLossesCoefficient) * velocityHead;
    }

    /**
     * Calculate flow rate from head loss (inverse problem)
     * Uses iterative solution with Newton-Raphson
     */
    static calculateFlowFromHeadLoss(
        headLoss: number,
        length: number,
        diameter: number,
        roughness: number,       // m
        minorLosses: number = 0,
        fluidViscosity: number = 1e-3,  // Pa·s
        fluidDensity: number = 1000     // kg/m³
    ): PipeFlowResult {
        const area = Math.PI * diameter * diameter / 4;
        const relativeRoughness = roughness / diameter;

        // Initial guess using Hagen-Poiseuille
        let Q = Math.sqrt(headLoss * Math.PI * Math.pow(diameter, 4) * this.g / (128 * fluidViscosity * length));
        
        const maxIterations = 50;
        const tolerance = 1e-8;

        for (let i = 0; i < maxIterations; i++) {
            const velocity = Q / area;
            const re = (fluidDensity * velocity * diameter) / fluidViscosity;
            const f = this.calculateFrictionFactor(re, relativeRoughness, diameter);
            
            const calculatedLoss = this.calculateHeadLoss(f, length, diameter, velocity, minorLosses);
            const error = calculatedLoss - headLoss;

            if (Math.abs(error) < tolerance) {
                return this.createResult(Q, velocity, re, f, headLoss, diameter);
            }

            // Jacobian approximation
            const dQ = Q * 0.01;
            const Q2 = Q + dQ;
            const v2 = Q2 / area;
            const re2 = (fluidDensity * v2 * diameter) / fluidViscosity;
            const f2 = this.calculateFrictionFactor(re2, relativeRoughness, diameter);
            const loss2 = this.calculateHeadLoss(f2, length, diameter, v2, minorLosses);
            
            const dLoss_dQ = (loss2 - calculatedLoss) / dQ;
            
            if (Math.abs(dLoss_dQ) < 1e-12) break;
            
            Q = Math.max(1e-12, Q - error / dLoss_dQ);
        }

        const velocity = Q / area;
        const re = (fluidDensity * velocity * diameter) / fluidViscosity;
        const f = this.calculateFrictionFactor(re, relativeRoughness, diameter);

        return this.createResult(Q, velocity, re, f, headLoss, diameter);
    }

    /**
     * Calculate pressure drop for given flow rate
     */
    static calculatePressureDrop(
        flowRate: number,        // m³/s
        diameter: number,        // m
        length: number,          // m
        roughness: number,       // m
        fluidDensity: number,    // kg/m³
        minorLosses: number = 0
    ): PressureDropResult {
        const area = Math.PI * diameter * diameter / 4;
        const velocity = flowRate / area;
        
        const kinematicViscosity = 1e-6; // Assume water-like
        const mu = kinematicViscosity * fluidDensity;
        const re = (fluidDensity * velocity * diameter) / mu;
        
        const f = this.calculateFrictionFactor(re, roughness / diameter, diameter);
        const headLoss = this.calculateHeadLoss(f, length, diameter, velocity, minorLosses);
        
        return {
            pressureDrop: headLoss * fluidDensity * this.g,
            headLoss,
            velocity,
            reynoldsNumber: re,
            frictionFactor: f
        };
    }

    /**
     * Calculate critical velocity to avoid air entrainment
     * Based on Hydraulic Institute criteria
     */
    static calculateCriticalVelocity(diameter: number): number {
        // Critical velocity for pipe sizes 2-48 inches
        // Based on HI standards to prevent air entrainment
        const D_inches = diameter * 39.37;
        
        if (D_inches < 3) return 1.5;  // m/s
        if (D_inches < 8) return 2.0;  // m/s
        if (D_inches < 12) return 2.5; // m/s
        return 3.0;                     // m/s
    }

    /**
     * Check for suction cavitation risk
     */
    static checkCavitationRisk(
        flowRate: number,
        diameter: number,
        inletPressure: number,   // Pa
        vaporPressure: number,   // Pa
        fluidDensity: number,
        elevationChange: number, // m (positive = pump above source)
        frictionLoss: number     // m
    ): boolean {
        const area = Math.PI * diameter * diameter / 4;
        const velocity = flowRate / area;
        
        // NPSH available calculation
        const npsha = (inletPressure / (fluidDensity * this.g)) 
                    + (elevationChange)
                    - (vaporPressure / (fluidDensity * this.g))
                    - frictionLoss;
        
        // Minimum NPSH typically around 3-5 ft (1-1.5 m) for most pumps
        return npsha < 1.0; // Risk if below 1m
    }

    /**
     * Hazen-Williams equation (for water in pipes > 50mm)
     * C = Hazen-Williams coefficient (typically 100-150 for steel)
     * Returns head loss in m per m of pipe
     */
    static calculateHeadLossHazenWilliams(
        flowRate: number,        // m³/s
        diameter: number,        // m
        length: number,          // m
        hazenWilliamsC: number   // Typical: 130 for old pipes, 140 for new steel
    ): number {
        // Convert to imperial units for Hazen-Williams
        const Q_cfs = flowRate * 35.315;           // cfs
        const D_inches = diameter * 39.37;          // inches
        
        // Hazen-Williams in imperial
        // h = 10.67 * L * Q^1.852 / (C^1.852 * D^4.87)
        const headLossImperial = 10.67 * length * Math.pow(Q_cfs, 1.852) 
                                / (Math.pow(hazenWilliamsC, 1.852) * Math.pow(D_inches, 4.87));
        
        // Convert feet to meters
        return headLossImperial * 0.3048;
    }

    private static createResult(
        Q: number,
        velocity: number,
        re: number,
        f: number,
        headLoss: number,
        diameter: number
    ): PipeFlowResult {
        const criticalV = this.calculateCriticalVelocity(diameter);
        return {
            flowRate: Q,
            velocity,
            headLoss,
            frictionFactor: f,
            reynoldsNumber: re,
            isLaminar: re < 2300,
            isTurbulent: re > 4000,
            criticalVelocity: criticalV,
            isCavitationRisk: velocity > criticalV
        };
    }
}

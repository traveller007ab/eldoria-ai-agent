/**
 * Real Pump Curves and Affinity Laws
 * Based on Hydraulic Institute (HI) standards and manufacturer data
 */

export interface PumpCurvePoint {
    flowRate: number;       // m³/h
    head: number;           // m
    efficiency: number;     // % (0-100)
    power: number;          // kW
    npsh: number;           // m (Net Positive Suction Head required)
}

export interface PumpPerformance {
    designFlow: number;     // m³/h at BEP
    designHead: number;     // m at BEP
    designEfficiency: number; // % at BEP
    ratedPower: number;     // kW
    ratedSpeed: number;     // RPM
    suctionSize: number;    // mm
    dischargeSize: number;  // mm
    impellerDiameter: number; // mm
}

export interface AffinityLawsResult {
    flowRatio: number;
    headRatio: number;
    powerRatio: number;
    newFlow: number;
    newHead: number;
    newPower: number;
    newEfficiency: number;
}

export interface PumpOperationPoint {
    flowRate: number;       // m³/h
    head: number;           // m
    efficiency: number;     // %
    power: number;          // kW
    npshRequired: number;   // m
    npshAvailable: number;  // m
    suctionMargin: number;  // m (NPSHa - NPSHr)
    isSafe: boolean;
    warnings: string[];
}

export class RealPumpCurves {
    private static g = 9.80665;

    /**
     * Apply pump affinity laws for speed change
     * Q2/Q1 = N2/N1
     * H2/H1 = (N2/N1)²
     * P2/P1 = (N2/N1)³
     */
    static applyAffinityLawsSpeed(
        speed1: number,      // RPM (original)
        speed2: number,      // RPM (new)
        flow1: number,       // m³/h
        head1: number,       // m
        power1: number,      // kW
        efficiency1: number  // %
    ): AffinityLawsResult {
        const ratio = speed2 / speed1;
        
        return {
            flowRatio: ratio,
            headRatio: ratio * ratio,
            powerRatio: ratio * ratio * ratio,
            newFlow: flow1 * ratio,
            newHead: head1 * ratio * ratio,
            newPower: power1 * ratio * ratio * ratio,
            newEfficiency: efficiency1 // Efficiency relatively constant near BEP
        };
    }

    /**
     * Apply pump affinity laws for impeller diameter change
     * Q2/Q1 = D2/D1
     * H2/H1 = (D2/D1)²
     * P2/P1 = (D2/D1)³
     */
    static applyAffinityLawsDiameter(
        diameter1: number,   // mm (original)
        diameter2: number,   // mm (new)
        flow1: number,       // m³/h
        head1: number,       // m
        power1: number,      // kW
        efficiency1: number  // %
    ): AffinityLawsResult {
        const ratio = diameter2 / diameter1;
        
        return {
            flowRatio: ratio,
            headRatio: ratio * ratio,
            powerRatio: ratio * ratio * ratio,
            newFlow: flow1 * ratio,
            newHead: head1 * ratio * ratio,
            newPower: power1 * ratio * ratio * ratio,
            newEfficiency: efficiency1
        };
    }

    /**
     * Calculate pump curve point using affinity laws from rated conditions
     * H = H_shutoff - K * Q²
     */
    static calculatePumpCurve(
        flowRate: number,        // m³/h
        designFlow: number,      // m³/h at BEP
        designHead: number,      // m at BEP
        designSpeed: number,     // RPM
        actualSpeed: number,     // RPM
        impellerDiameter: number, // mm
        actualDiameter: number   // mm
    ): number {
        // Calculate affinity ratios
        const speedRatio = actualSpeed / designSpeed;
        const diameterRatio = actualDiameter / impellerDiameter;
        
        // Shutoff head (typically 1.1-1.3 × design head at rated speed)
        const H_shutoff = designHead * 1.25 * speedRatio * speedRatio * diameterRatio * diameterRatio;
        
        // Calculate B coefficient from design point
        const Q_design = designFlow * speedRatio * diameterRatio;
        const B = (H_shutoff - designHead * speedRatio * speedRatio * diameterRatio * diameterRatio) 
                  / (Q_design * Q_design);
        
        // Pump curve: H = H_shutoff - B * Q²
        const Q = flowRate;
        return Math.max(0, H_shutoff - B * Q * Q);
    }

    /**
     * Calculate efficiency at off-design conditions
     * Uses the "affinity efficiency correction" or parabolic approximation
     */
    static calculateEfficiency(
        flowRate: number,        // m³/h
        designFlow: number,      // m³/h
        designEfficiency: number // %
    ): number {
        const ratio = flowRate / designFlow;
        
        // Efficiency curve approximation (parabolic, peaks at design flow)
        const deviation = ratio - 1;
        const efficiencyDrop = 100 * deviation * deviation; // Maximum ~20% drop at 50%/150% flow
        
        return Math.max(0, Math.min(100, designEfficiency - efficiencyDrop));
    }

    /**
     * Calculate Net Positive Suction Head required (NPSHr)
     * Based on pump specific speed and hydraulic conditions
     * NPSHr = K × (N × Q)^0.5 / D^0.75 (typical correlation)
     * 
     * The constant K depends on impeller geometry:
     * - Radial flow pumps: K ≈ 0.0003-0.0005
     * - Mixed flow pumps: K ≈ 0.0005-0.0008
     * - Axial flow pumps: K ≈ 0.0008-0.0012
     */
    static calculateNPSHr(
        flowRate: number,   // m³/h
        speed: number,      // RPM
        impellerDiameter: number, // mm
        pumpType: 'radial' | 'mixed' | 'axial' = 'radial'
    ): number {
        const Q_m3s = flowRate / 3600;
        const N_rps = speed / 60;
        const D_m = impellerDiameter / 1000;
        
        // K factor based on pump type (impeller geometry)
        // Values derived from hydraulic institute standards and pump affinity laws
        const K_base: Record<string, number> = {
            'radial': 0.00035,    // Typical for centrifugal pumps
            'mixed': 0.00055,     // Mixed flow pumps
            'axial': 0.00085      // Axial flow pumps
        };
        
        // Correction for impeller diameter (larger impellers = higher NPSHr)
        const D_factor = Math.pow(200 / impellerDiameter, 0.5);
        
        // Correct for flow rate (NPSHr increases with flow, especially beyond BEP)
        const flowFactor = 1.0 + 0.5 * Math.max(0, (flowRate / 100 - 0.8));
        
        // Combine factors
        let K = K_base[pumpType];
        const npshr = K * D_factor * flowFactor * Math.pow(N_rps * Q_m3s, 0.5) * Math.pow(D_m, 1.5);
        
        return Math.max(0.5, npshr);
    }

    /**
     * Calculate power consumption
     * P = (ρ * g * Q * H) / (η * 1000)
     */
    static calculatePower(
        flowRate: number,     // m³/h
        head: number,         // m
        efficiency: number,   // % (0-100)
        fluidDensity: number  // kg/m³
    ): number {
        const Q = flowRate / 3600; // m³/s
        const P_hydraulic = (fluidDensity * this.g * Q * head) / 1000; // kW
        return P_hydraulic / (efficiency / 100);
    }

    /**
     * Find best efficiency point (BEP) location
     * Typically at 70-85% of shutoff flow for radial pumps
     */
    static calculateBEPFlow(shutoffFlow: number, bepPercent: number = 0.75): number {
        return shutoffFlow * bepPercent;
    }

    /**
     * Calculate system resistance curve
     * H = H_static + K * Q²
     */
    static calculateSystemHead(
        flowRate: number,        // m³/h
        staticHead: number,      // m
        resistanceCoefficient: number // m/(m³/h)²
    ): number {
        return staticHead + resistanceCoefficient * flowRate * flowRate;
    }

    /**
     * Find operating point by intersecting pump curve with system curve
     * Uses Newton-Raphson for convergence
     */
    static findOperatingPoint(
        pumpCurve: (Q: number) => number,
        systemCurve: (Q: number) => number,
        initialGuess: number = 50, // m³/h
        tolerance: number = 0.001
    ): { flow: number; head: number } {
        let Q = initialGuess;
        
        for (let i = 0; i < 100; i++) {
            const H_pump = pumpCurve(Q);
            const H_system = systemCurve(Q);
            const diff = H_pump - H_system;
            
            if (Math.abs(diff) < tolerance) break;
            
            // Numerical derivative
            const dQ = Q * 0.01 + 0.001;
            const H_pump2 = pumpCurve(Q + dQ);
            const H_system2 = systemCurve(Q + dQ);
            const dH = (H_pump2 - H_system2) - diff;
            
            if (Math.abs(dH) < 1e-12) break;
            
            Q = Math.max(0.001, Q - diff / dH * 0.5);
        }
        
        return {
            flow: Q,
            head: pumpCurve(Q)
        };
    }

    /**
     * Full pump performance calculation
     */
    static calculatePerformance(
        params: {
            designFlow: number;
            designHead: number;
            designEfficiency: number;
            ratedPower: number;
            designSpeed: number;
            impellerDiameter: number;
            suctionPipeDiameter: number;
            suctionPipeLength: number;
            pipeRoughness: number;
            staticHead: number;
            minorLosses: number;
        },
        operating: {
            speed: number;
            flowRate: number;
            npshAvailable: number;
            fluidDensity: number;
        }
    ): PumpOperationPoint {
        // 1. Calculate pump head at operating point
        const pumpHead = this.calculatePumpCurve(
            operating.flowRate,
            params.designFlow,
            params.designHead,
            params.designSpeed,
            operating.speed,
            params.impellerDiameter,
            params.impellerDiameter
        );

        // 2. Calculate system head
        const K = RealPipeFlow.calculateHeadLossHazenWilliams(
            operating.flowRate / 3600,
            params.suctionPipeDiameter / 1000,
            params.suctionPipeLength,
            params.pipeRoughness
        );
        
        // Add minor losses (convert to equivalent length approximation)
        const minorLossM = params.minorLosses * 10; // Rough approximation
        const totalHead = params.staticHead + K + minorLossM;

        // 3. Calculate efficiency at operating point
        const efficiency = this.calculateEfficiency(
            operating.flowRate,
            params.designFlow,
            params.designEfficiency
        );

        // 4. Calculate power
        const power = this.calculatePower(
            operating.flowRate,
            pumpHead,
            efficiency,
            operating.fluidDensity
        );

        // 5. Calculate NPSH required using improved correlation
        const npshRequired = this.calculateNPSHr(
            operating.flowRate,
            operating.speed,
            params.impellerDiameter || 200, // Use impeller diameter, not pipe diameter
            'radial'
        );

        // 6. Check safety
        const suctionMargin = operating.npshAvailable - npshRequired;
        const warnings: string[] = [];
        let isSafe = true;

        if (suctionMargin < 0) {
            warnings.push(`Cavitation risk! NPSHa (${operating.npshAvailable.toFixed(2)}m) < NPSHr (${npshRequired.toFixed(2)}m)`);
            isSafe = false;
        }

        if (operating.flowRate > params.designFlow * 1.3) {
            warnings.push('Flow rate exceeds 130% of BEP - risk of motor overload');
        }

        if (operating.flowRate < params.designFlow * 0.3) {
            warnings.push('Low flow - risk of recirculation and overheating');
        }

        if (power > params.ratedPower * 0.9) {
            warnings.push('Power approaching rated limit');
        }

        if (pumpHead < params.designHead * 0.5) {
            warnings.push('Operating far from BEP - reduced efficiency');
        }

        return {
            flowRate: operating.flowRate,
            head: pumpHead,
            efficiency,
            power,
            npshRequired,
            npshAvailable: operating.npshAvailable,
            suctionMargin,
            isSafe,
            warnings
        };
    }
}

import { RealPipeFlow } from './RealPipeFlow';

/**
 * Real Engine Model
 * Implements torque curves, BSFC maps, volumetric efficiency, and thermal efficiency
 * Based on: SAE J1349, EPA calculations, and thermodynamic principles
 */

export interface EngineParameters {
    displacement: number;      // L
    cylinders: number;
    bore: number;              // mm
    stroke: number;            // mm
    compressionRatio: number;
    maxPower: number;          // kW
    maxPowerRPM: number;
    maxTorque: number;         // N·m
    maxTorqueRPM: number;
    idleRPM: number;
    redlineRPM: number;
    fuelType: 'gasoline' | 'diesel' | 'ethanol' | 'natural_gas';
    aspiration: 'na' | 'turbo' | 'supercharged';
    valveTiming: 'ohv' | 'ohc' | 'dohc';
    firingOrder: string;
}

export interface EngineState {
    rpm: number;
    throttlePosition: number;  // 0-1
    manifoldPressure: number;  // kPa (absolute)
    intakeTemp: number;        // K
    airFuelRatio: number;
    sparkAdvance: number;      // degrees BTDC
    coolantTemp: number;       // K
}

export interface EngineOutput {
    torque: number;            // N·m
    horsepower: number;        // HP
    bmep: number;              // bar (Brake Mean Effective Pressure)
    imep: number;              // bar (Indicated Mean Effective Pressure)
    frictionLoss: number;      // N·m
    volumetricEfficiency: number;
    thermalEfficiency: number;
    bsfc: number;              // g/kWh
    airFlow: number;           // kg/s
    fuelFlow: number;          // kg/s
    heatRejection: number;     // kW
    exhaustTemp: number;       // K
    fuelEnergy: number;        // kW
    indicatedPower: number;    // kW
    brakePower: number;        // kW
    mechanicalEfficiency: number;
    thermalEfficiencyActual: number;
}

export interface EmissionResult {
    co2: number;               // g/s
    hc: number;                // g/s
    co: number;                // g/s
    nox: number;               // g/s
}

export class RealEngineModel {
    private static R_air = 287.058;      // J/(kg·K) - Gas constant for air
    private static rho_air = 1.204;       // kg/m³ at 20°C, 101.325 kPa
    private static AFR_stoich = 14.7;     // Stoichiometric air-fuel ratio for gasoline
    private static LHV_gasoline = 42000;  // kJ/kg (Lower Heating Value)

    /**
     * Calculate volumetric efficiency based on RPM and valve timing
     * Based on empirical correlations from engine research
     */
    static calculateVolumetricEfficiency(
        params: EngineParameters,
        state: EngineState
    ): number {
        const rpm = state.rpm;
        const throttle = state.throttlePosition;

        // Base VE curve (peak at mid-range RPM)
        const rpmRatio = rpm / params.maxPowerRPM;
        let ve_base = 1;

        if (rpmRatio < 0.5) {
            // Low RPM: increases with RPM
            ve_base = 0.7 + 0.3 * (rpmRatio / 0.5);
        } else if (rpmRatio < 1.0) {
            // Mid RPM: peak efficiency
            ve_base = 1.0;
        } else if (rpmRatio < 1.2) {
            // Near peak power: slight decrease
            ve_base = 1.0 - 0.1 * (rpmRatio - 1.0) / 0.2;
        } else {
            // High RPM: significant decrease due to flow restrictions
            ve_base = 0.9 - 0.3 * Math.min(1, (rpmRatio - 1.2) / 0.8);
        }

        // Throttle effect (stronger at low throttle)
        const throttleEffect = 0.4 + 0.6 * throttle;

        // Intake temperature effect (denser air when cold)
        const tempEffect = 293 / state.intakeTemp;

        // Boost effect for forced induction
        let boostEffect = 1.0;
        if (params.aspiration === 'turbo' || params.aspiration === 'supercharged') {
            const manifoldPa = state.manifoldPressure * 1000;
            const boostRatio = manifoldPa / 101.325;
            boostEffect = boostRatio;
            ve_base *= Math.min(1.5, boostRatio); // VE can exceed 100% with boost
        }

        return Math.max(0.3, Math.min(1.2, ve_base * throttleEffect * tempEffect * boostEffect));
    }

    /**
     * Calculate torque from engine parameters and state
     * Uses Willans line approximation and brake mean effective pressure
     */
    static calculateTorque(params: EngineParameters, state: EngineState): number {
        const rpm = state.rpm;
        const throttle = state.throttlePosition;

        if (rpm < params.idleRPM) return 0;

        // Calculate brake mean effective pressure (BMEP)
        // Based on torque and displacement
        const torque = params.maxTorque * this.getTorqueMultiplier(params, rpm) * throttle;

        return Math.max(0, torque);
    }

    /**
     * Torque multiplier based on RPM curve shape
     */
    private static getTorqueMultiplier(params: EngineParameters, rpm: number): number {
        const rpmNorm = rpm / params.maxTorqueRPM;

        if (rpmNorm < 0.5) {
            // Rising torque region
            return 0.6 + 0.4 * rpmNorm;
        } else if (rpmNorm < 1.0) {
            // Peak torque region
            return 1.0;
        } else if (rpmNorm < 1.3) {
            // Declining torque region
            return 1.0 - 0.5 * (rpmNorm - 1.0);
        } else {
            // Rapidly declining
            return 0.85 - 0.3 * Math.min(1, (rpmNorm - 1.3));
        }
    }

    /**
     * Calculate Brake Specific Fuel Consumption (BSFC)
     * Based on engine thermodynamics - considers compression ratio, size, and operating point
     * Lower BSFC = better efficiency
     */
    static calculateBSFC(params: EngineParameters, state: EngineState): number {
        const rpm = state.rpm;
        const load = state.throttlePosition;
        
        // Base BSFC calculation from first principles
        // BSFC = fuel_flow / brake_power
        // At ideal conditions (peak torque), BSFC is minimized
        
        // Base BSFC depends on fuel type (kJ/kg → g/kWh conversion and typical efficiency)
        // Gasoline LHV ≈ 44 MJ/kg, Diesel LHV ≈ 42.5 MJ/kg
        // Ideal thermal efficiency ≈ η, so BSFC = 3.6 / (η × LHV) kg/kWh = 3600 / (η × LHV) g/kWh
        const LHV = params.fuelType === 'diesel' ? 42.5 : 44.0; // MJ/kg
        
        // Theoretical minimum BSFC at peak efficiency (BMEP at best efficiency point ≈ 10-12 bar)
        // Using brake thermal efficiency: η_bth = (3600 × P) / (ṁ_f × LHV)
        // Rearranging: BSFC = ṁ_f / P = 3600 / (η × LHV)
        // Peak brake thermal efficiency for modern engines: 30-38%
        const peakEfficiency = 0.30 + 0.08 * Math.min(1, (params.compressionRatio - 8) / 6); // CR effect
        const theoreticalMinBSFC = (3600 / (peakEfficiency * LHV * 1000)) * 1000; // Convert kg/kWh to g/kWh
        
        // Correction for engine size (larger engines slightly more efficient per kW)
        const sizeFactor = Math.max(0.9, 1.0 - 0.05 * Math.max(0, 2 - params.displacement));
        
        // Cylinder count effect (more cylinders = better breathing = lower BSFC)
        const cylinderFactor = params.cylinders >= 8 ? 0.95 : 
                               params.cylinders >= 6 ? 0.97 : 1.0;

        // RPM effect (BSFC increases at very low and high RPM due to pumping/breathing losses)
        const rpmNorm = rpm / params.maxPowerRPM;
        let rpmFactor = 1.0;
        if (rpmNorm < 0.3) {
            // Low RPM: poor volumetric efficiency, high pumping losses
            rpmFactor = 1.35 - rpmNorm * 0.5;
        } else if (rpmNorm < 0.6) {
            // Optimal range
            rpmFactor = 1.0 - 0.1 * (0.6 - rpmNorm) / 0.3;
        } else if (rpmNorm > 1.1) {
            // High RPM: friction, breathing losses
            rpmFactor = 1.0 + 0.2 * (rpmNorm - 1.1);
        }

        // Load effect (BSFC increases at partial load due to pumping losses)
        let loadFactor = 1.0;
        if (load < 0.25) {
            loadFactor = 1.8 - 2.0 * load; // Severe pumping loss at very low load
        } else if (load < 0.5) {
            loadFactor = 1.4 - 0.8 * load;
        } else if (load < 0.75) {
            loadFactor = 1.1 - 0.2 * (load - 0.5);
        } else {
            loadFactor = 1.0 + 0.05 * (load - 0.75);
        }

        // Aspiration effect (turbo/supercharger can improve or hurt BSFC depending on tuning)
        const aspirationFactor = params.aspiration === 'turbo' ? 0.92 : 
                                 params.aspiration === 'supercharged' ? 0.95 : 1.0;

        // Fuel type effect (diesel is more efficient)
        const fuelFactor = params.fuelType === 'diesel' ? 0.88 : 
                           params.fuelType === 'natural_gas' ? 1.05 : 1.0;

        return theoreticalMinBSFC * sizeFactor * cylinderFactor * rpmFactor * loadFactor * aspirationFactor * fuelFactor;
    }

    /**
     * Calculate brake power from torque and RPM
     * P = 2πNT/60 = TN/9550 (T in N·m, N in RPM, P in kW)
     */
    static calculateBrakePower(torque: number, rpm: number): number {
        return (torque * rpm) / 9550;
    }

    /**
     * Calculate indicated power (before friction losses)
     * Based on indicated mean effective pressure (IMEP)
     */
    static calculateIndicatedPower(
        params: EngineParameters,
        state: EngineState,
        volumetricEff: number
    ): number {
        // Calculate IMEP based on cylinder filling
        const TDC = 273; // Intake temperature (K)
        const intakeTemp = state.intakeTemp;

        // Mass of air per cycle
        const cylinderVolume = (params.displacement / params.cylinders) / 1000; // L/cylinder
        const rho_air = 1.204 * (intakeTemp / TDC) * (state.manifoldPressure / 101.325);
        const massAir = cylinderVolume * rho_air * volumetricEff;

        // Fuel mass per cycle
        const AFR = state.airFuelRatio || this.AFR_stoich;
        const massFuel = massAir / AFR;

        // Fuel energy per cycle
        const LHV = params.fuelType === 'diesel' ? 42500 : 42000; // kJ/kg
        const energyCycle = massFuel * LHV; // J

        // Thermal efficiency (typical 25-35%)
        const thermalEff = this.calculateThermalEfficiency(params, state);

        // Indicated work per cycle
        const workCycle = energyCycle * thermalEff;

        // Power = work per cycle * cycles per second
        const cyclesPerSecond = (state.rpm / 60) / 2; // 4-stroke = 2 cycles per revolution

        return workCycle * cyclesPerSecond / 1000; // kW
    }

    /**
     * Calculate thermal efficiency based on engine thermodynamics
     * Uses ideal Otto/Diesel cycle analysis with real-world corrections
     */
    static calculateThermalEfficiency(params: EngineParameters, state: EngineState): number {
        const rpm = state.rpm;
        const load = state.throttlePosition;
        
        // Calculate theoretical maximum efficiency based on cycle type
        let theoreticalMaxEta: number;
        
        if (params.fuelType === 'diesel') {
            // Diesel cycle efficiency: η = 1 - (1/r^γ-1) × [(ρ^γ - 1)/(γ(ρ-1))]
            // Approximation for typical diesel parameters
            const r = params.compressionRatio;
            const gamma = 1.4; // γ for air
            const cutoffRatio = 2.0; // Typical diesel cutoff
            const r_gamma_1 = Math.pow(r, gamma - 1);
            const term1 = (Math.pow(cutoffRatio, gamma) - 1) / (gamma * (cutoffRatio - 1));
            theoreticalMaxEta = 1 - (1 / r_gamma_1) * term1;
        } else {
            // Otto cycle efficiency: η = 1 - 1/r^(γ-1)
            const r = params.compressionRatio;
            const gamma = 1.4; // γ for air (approximately)
            theoreticalMaxEta = 1 - 1 / Math.pow(r, gamma - 1);
        }

        // Base efficiency is a fraction of theoretical maximum due to real-world losses
        // Typical modern engines achieve 85-90% of theoretical Otto cycle
        const realWorldFactor = 0.85 + 0.05 * Math.min(1, (params.compressionRatio - 8) / 4);
        let eta_base = theoreticalMaxEta * realWorldFactor;

        // Displacement effect (larger engines tend to be slightly more efficient)
        const displacementFactor = 1.0 + 0.02 * Math.min(1, (params.displacement - 1) / 7);

        // Cylinder count effect (more cylinders = better breathing = higher efficiency)
        const cylinderFactor = params.cylinders >= 8 ? 1.02 : 
                               params.cylinders >= 6 ? 1.01 : 1.0;

        // RPM effect (efficiency drops at high RPM due to friction and breathing)
        const rpmNorm = rpm / params.maxPowerRPM;
        let rpmEta = 1.0;
        if (rpmNorm < 0.3) {
            // Low RPM: poor volumetric efficiency
            rpmEta = 0.90 + 0.15 * (rpmNorm / 0.3);
        } else if (rpmNorm > 1.0) {
            // High RPM: friction and breathing losses
            rpmEta = 1.0 - 0.12 * (rpmNorm - 1.0);
        }

        // Load effect (pumping losses at partial load - especially for SI engines)
        let loadEta = 1.0;
        if (load < 0.25) {
            // Throttle restriction causes significant pumping losses in SI engines
            loadEta = 0.70 + 0.4 * load;
        } else if (load < 0.5) {
            loadEta = 0.85 + 0.5 * (load - 0.25);
        } else if (load < 0.75) {
            loadEta = 0.98 + 0.08 * (load - 0.5);
        } else {
            loadEta = 1.0 + 0.03 * (load - 0.75);
        }

        // Aspiration effect (turbo can improve volumetric efficiency)
        const aspirationFactor = params.aspiration === 'turbo' ? 1.05 : 
                                 params.aspiration === 'supercharged' ? 1.03 : 1.0;

        // Valve timing effect (modern VVT improves efficiency 2-5%)
        const vvtFactor = params.valveTiming === 'dohc' ? 1.03 : 
                          params.valveTiming === 'ohc' ? 1.02 : 1.0;

        const finalEta = eta_base * displacementFactor * cylinderFactor * rpmEta * 
                        loadEta * aspirationFactor * vvtFactor;

        // Clamp to realistic range for internal combustion engines
        // Typical range: 20% (small SI at partial load) to 40% (large diesel at cruise)
        return Math.max(0.18, Math.min(0.42, finalEta));
    }

    /**
     * Complete engine analysis
     */
    static analyzeEngine(params: EngineParameters, state: EngineState): EngineOutput {
        const rpm = state.rpm;
        const throttle = state.throttlePosition;

        // Calculate volumetric efficiency
        const volumetricEff = this.calculateVolumetricEfficiency(params, state);

        // Calculate torque
        const torque = this.calculateTorque(params, state);

        // Calculate powers
        const brakePower = this.calculateBrakePower(torque, rpm);
        const indicatedPower = this.calculateIndicatedPower(params, state, volumetricEff);

        // Calculate friction losses (approximate)
        // Friction increases with RPM: FMEP typically 2-4 bar
        const frictionLoss = indicatedPower * 0.15 * (1 + rpm / params.redlineRPM);

        // Calculate BMEP (Brake Mean Effective Pressure)
        // BMEP = 120 * T / Vd (T in N·m, Vd in L)
        const bmep = (120 * torque) / params.displacement;

        // IMEP (Indicated Mean Effective Pressure)
        const imep = bmep * (indicatedPower / Math.max(brakePower, 0.1));

        // Calculate BSFC
        const bsfc = this.calculateBSFC(params, state);

        // Calculate air and fuel flows (corrected formula for 4-stroke engine)
        // m_air = (VE * Vd * N) / 2  (per minute, Vd in m³, N in RPM)
        // Convert to kg/s: multiply by rho and divide by 60
        const displacementM3 = params.displacement / 1000; // Convert L to m³
        const airFlow = (volumetricEff * displacementM3 * rpm * this.rho_air) / (2 * 60); // kg/s
        const fuelFlow = airFlow / state.airFuelRatio; // kg/s

        // Calculate heat rejection based on energy balance
        // Fuel energy = brake power + heat to coolant + heat to exhaust + radiation losses
        // Typical distribution for SI engine:
        // - Brake work: 25-35%
        // - Heat to coolant: 25-35%
        // - Heat to exhaust: 30-40%
        // - Radiation/convection: 5-10%
        
        const fuelEnergy = fuelFlow * this.LHV_gasoline; // kW (LHV is kJ/kg)
        
        // Heat to coolant depends on:
        // - Load (higher load = more heat to coolant)
        // - RPM (lower RPM = more time for heat transfer = more to coolant)
        // - Engine size (larger engines tend to have lower heat flux)
        const loadFactor = 0.3 + 0.4 * throttle; // More heat to coolant at higher load
        const rpmFactor = 1.2 - 0.4 * (rpm / params.redlineRPM); // Less heat to coolant at high RPM
        const sizeFactor = 1.0 + 0.1 * Math.max(0, 2 - params.displacement); // Smaller engines have higher heat flux
        
        // Cooling system heat rejection fraction
        const coolantFraction = 0.25 * loadFactor * rpmFactor * sizeFactor;
        const heatRejection = fuelEnergy * coolantFraction;

        // Exhaust temperature based on energy balance
        // Higher load = higher exhaust temperature
        // More efficient engines = slightly lower exhaust temperature
        const brakeThermalEff = brakePower / Math.max(fuelEnergy, 0.001);
        const exhaustTemp = 800 + 300 * throttle + 100 * (1 - brakeThermalEff); // K

        // Mechanical efficiency
        const mechanicalEff = brakePower / Math.max(indicatedPower, 0.1);

        // Actual thermal efficiency (brake power / fuel energy)
        const thermalEff = brakePower / Math.max(fuelEnergy, 0.001); // dimensionless 0-1

        // Horsepower conversion
        const horsepower = brakePower * 1.34102;

        return {
            torque,
            horsepower,
            bmep,
            imep,
            frictionLoss,
            volumetricEfficiency: volumetricEff,
            thermalEfficiency: brakeThermalEff * 100, // Convert to percentage
            bsfc,
            airFlow,
            fuelFlow,
            heatRejection,
            exhaustTemp,
            fuelEnergy,
            indicatedPower,
            brakePower,
            mechanicalEfficiency: mechanicalEff * 100,
            thermalEfficiencyActual: brakeThermalEff * 100
        };
    }

    /**
     * Calculate emissions (simplified)
     */
    static calculateEmissions(output: EngineOutput, fuelType: string): EmissionResult {
        // CO2: Approximately 3.1 kg CO2 per kg of gasoline
        const co2 = output.fuelFlow * 3.1 * 1000; // g/s

        // HC, CO, NOx: Simplified emission factors (g/kg fuel)
        let hc, co, nox;
        if (fuelType === 'gasoline') {
            hc = output.fuelFlow * 2.5 * 1000;  // g/s
            co = output.fuelFlow * 5.0 * 1000;   // g/s
            nox = output.fuelFlow * 8.0 * 1000;  // g/s
        } else {
            // Diesel
            hc = output.fuelFlow * 0.5 * 1000;
            co = output.fuelFlow * 2.0 * 1000;
            nox = output.fuelFlow * 15.0 * 1000;
        }

        return { co2, hc, co, nox };
    }

    /**
     * Calculate fuel consumption for a given distance/speed
     */
    static calculateFuelConsumption(
        speed: number,           // km/h
        distance: number,        // km
        consumption: number,     // L/100km
        fuelType: string
    ): { liters: number; kg: number; co2: number } {
        const liters = (consumption * distance) / 100;
        const density = fuelType === 'gasoline' ? 0.75 : 0.85; // kg/L
        const kg = liters * density;
        const co2 = kg * 3.1; // kg CO2

        return { liters, kg, co2 };
    }
}

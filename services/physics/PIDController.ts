/**
 * PID Controller Implementation
 * Full-featured PID controller with anti-windup, bumpless transfer, and multiple forms
 * Based on: Åström & Hägglund, "PID Controllers: Theory, Design, and Tuning"
 */

export interface PIDParameters {
    Kp: number;              // Proportional gain
    Ti: number;              // Integral time (seconds), 0 = no integral
    Td: number;              // Derivative time (seconds), 0 = no derivative
    beta?: number;           // Setpoint weighting (default 1)
    gamma?: number;          // Derivative weighting (default 0.5)
    N?: number;              // Derivative filter coefficient (default 10)
    Tr?: number;             // Tracking time for anti-windup (default 0.1)
}

export interface PIDState {
    proportional: number;
    integral: number;
    derivative: number;
    filteredDerivative: number;
    previousError: number;
    previousMeasurement: number;
    previousOutput: number;
    output: number;
}

export interface PIDConfig {
    outputMin?: number;      // Minimum output (default -Infinity)
    outputMax?: number;      // Maximum output (default +Infinity)
    manualMode?: boolean;    // Manual mode for bumpless transfer
    manualValue?: number;    // Manual output value
    setpoint?: number;       // Current setpoint
    measurement?: number;    // Current measurement
}

export interface PIDTuningMethod {
    name: string;
    description: string;
    calculate: (processData: ProcessData) => PIDParameters;
}

export interface ProcessData {
    Ku: number;              // Ultimate gain (from relay test)
    Pu: number;              // Ultimate period (seconds)
    tau: number;             // Time constant (seconds)
    K: number;               // Process gain
    deadTime: number;        // Dead time (seconds)
}

/**
 * Full-featured PID Controller
 */
export class PIDController {
    private params: PIDParameters;
    private state: PIDState;
    private config: Required<PIDConfig>;
    private initialized: boolean = false;
    
    constructor(params: PIDParameters, config: PIDConfig = {}) {
        this.params = {
            beta: 1.0,           // Setpoint weighting for P
            gamma: 0.5,          // Weighting for derivative term
            N: 10,               // Derivative filter coefficient
            Tr: 0.1,             // Tracking time for anti-windup
            ...params
        };
        
        this.config = {
            outputMin: -Infinity,
            outputMax: Infinity,
            manualMode: false,
            manualValue: 0,
            setpoint: 0,
            measurement: 0,
            ...config
        };
        
        this.state = this.getInitialState();
    }

    /**
     * Get initial controller state
     */
    private getInitialState(): PIDState {
        return {
            proportional: 0,
            integral: 0,
            derivative: 0,
            filteredDerivative: 0,
            previousError: 0,
            previousMeasurement: 0,
            previousOutput: 0,
            output: 0
        };
    }

    /**
     * Reset controller to initial state
     */
    reset(): void {
        this.state = this.getInitialState();
        this.initialized = false;
    }

    /**
     * Update controller parameters
     */
    setParameters(params: Partial<PIDParameters>): void {
        this.params = { ...this.params, ...params };
    }

    /**
     * Update configuration
     */
    setConfig(config: Partial<PIDConfig>): void {
        this.config = { ...this.config, ...config } as Required<PIDConfig>;
    }

    /**
     * Calculate controller output
     * Returns: { output, state }
     */
    compute(
        measurement: number,
        setpoint: number = this.config.setpoint,
        dt: number = 0.01
    ): { output: number; state: PIDState } {
        const { Kp, Ti, Td, beta, gamma, N, Tr } = this.params;
        const { outputMin, outputMax } = this.config;
        
        // Initialize on first call
        if (!this.initialized) {
            this.state.previousMeasurement = measurement;
            this.state.previousError = setpoint - measurement;
            this.initialized = true;
        }
        
        // Calculate error
        const error = setpoint - measurement;
        
        // Proportional term with setpoint weighting
        // u_P = Kp * (beta * SP - y)
        this.state.proportional = Kp * (beta! * setpoint - measurement);
        
        // Integral term (with anti-windup by clamping)
        // u_I = Kp * (1/Ti) * integral(e * dt)
        let integral = this.state.integral;
        if (Ti > 0) {
            integral += (Kp / Ti) * error * dt;
        }
        
        // Derivative term on measurement (to avoid derivative kick)
        // u_D = -Kp * Td * dy/dt (filtered)
        const measurementDerivative = (measurement - this.state.previousMeasurement) / dt;
        const derivativeRaw = Kp * gamma! * measurementDerivative;
        // Filter derivative: D = N/(1 + N*Td*z) * D_raw
        const alpha = (N! * Td) / (1 + N! * dt);
        this.state.filteredDerivative = alpha * derivativeRaw + (1 - alpha) * this.state.filteredDerivative;
        
        // Calculate controller output (parallel form)
        let output = this.state.proportional + integral + this.state.filteredDerivative;
        
        // Anti-windup: Track integral when output is saturated
        const isSaturated = output < outputMin || output > outputMax;
        if (isSaturated && Ti > 0) {
            // Integral tracking (back-calculation method)
            const trackedOutput = isSaturated ? 
                (output < outputMin ? outputMin : outputMax) : output;
            const errorAw = (trackedOutput - output + this.state.previousOutput) * (1 / (Kp * Ti)) * Tr!;
            integral += errorAw * dt;
        }
        
        // Clamp output
        output = Math.max(outputMin, Math.min(outputMax, output));
        
        // Store state
        this.state.integral = integral;
        this.state.derivative = this.state.filteredDerivative;
        this.state.previousError = error;
        this.state.previousMeasurement = measurement;
        this.state.previousOutput = output;
        this.state.output = output;
        
        return { output, state: { ...this.state } };
    }

    /**
     * Get current controller state
     */
    getState(): PIDState {
        return { ...this.state };
    }

    /**
     * Get current parameters
     */
    getParameters(): PIDParameters {
        return { ...this.params };
    }

    /**
     * Switch to manual mode (bumpless transfer)
     */
    setManual(outputValue: number): void {
        this.config.manualMode = true;
        this.config.manualValue = outputValue;
        // Reset integral to avoid bumpless transfer kick
        this.state.integral = outputValue - this.state.proportional - this.state.derivative;
    }

    /**
     * Switch to automatic mode (bumpless transfer)
     */
    setAutomatic(setpoint: number = this.config.setpoint): void {
        this.config.manualMode = false;
        this.config.setpoint = setpoint;
        // Ensure integral gives bumpless transfer
        this.state.integral = this.config.manualValue - this.state.proportional - this.state.derivative;
    }

    /**
     * Get PID gains in standard form
     * Kp, Ki = Kp/Ti, Kd = Kp*Td
     */
    getStandardForm(): { Kp: number; Ki: number; Kd: number } {
        return {
            Kp: this.params.Kp,
            Ki: this.params.Ti > 0 ? this.params.Kp / this.params.Ti : 0,
            Kd: this.params.Td * this.params.Kp
        };
    }

    /**
     * Get PID gains in series (cascade) form
     * Kc, Ti, Td where Td is applied after Ti
     */
    getSeriesForm(): { Kc: number; Ti: number; Td: number } {
        const { Kp, Ti, Td } = this.params;
        if (Ti === 0 || Td === 0) {
            return { Kc: Kp, Ti: Ti || 0, Td: Td || 0 };
        }
        // Series form: Kc = Kp * (1 + Td/Ti), Ti = Ti, Td = Td
        const Kc = Kp * (1 + Td / Ti);
        return { Kc, Ti, Td };
    }

    /**
     * Auto-tune PID parameters using Ziegler-Nichols method
     * Requires process data from relay feedback test
     */
    static tuneZieglerNichols(data: ProcessData): PIDParameters {
        const { Ku, Pu, tau, K, deadTime } = data;
        
        // Ziegler-Nichols tuning rules (classic)
        let params: PIDParameters;
        
        if (deadTime > 0 && tau > 0) {
            // Use lambda = deadTime (for good robustness)
            const lambda = deadTime;
            
            // IMC-based tuning (better than classic Z-N)
            const Kc = (tau) / (K * (lambda + deadTime));
            const Ti = Math.min(tau, 4 * (lambda + deadTime));
            const Td = tau / 2;
            
            params = {
                Kp: Kc,
                Ti: Ti,
                Td: Td
            };
        } else if (Ku > 0 && Pu > 0) {
            // Ultimate gain and period available (relay test)
            // Ziegler-Nichols settings for PID
            const Kp = 0.6 * Ku;
            const Ti = 0.5 * Pu;
            const Td = 0.125 * Pu;
            
            params = {
                Kp,
                Ti,
                Td
            };
        } else {
            // Fallback: simple PI tuning
            params = {
                Kp: K * 0.5,
                Ti: tau * 0.3,
                Td: 0
            };
        }
        
        return params;
    }

    /**
     * Auto-tune using Cohen-Coon method
     */
    static tuneCohenCoon(data: ProcessData): PIDParameters {
        const { K, tau, deadTime } = data;
        
        if (tau <= 0 || deadTime <= 0) {
            return PIDController.tuneZieglerNichols(data);
        }
        
        const ratio = deadTime / tau;
        
        // Cohen-Coon tuning rules
        const Kp = (1 / K) * (tau / deadTime) * (1.35 + 0.25 * ratio);
        const Ti = deadTime * (2.5 - 2 * ratio) / (1 + 0.6 * ratio);
        const Td = deadTime * 0.37 / (1 + 0.2 * ratio);
        
        return { Kp, Ti, Td };
    }

    /**
     * Auto-tune using IMC (Internal Model Control) method
     */
    static tuneIMC(data: ProcessData, lambdaMultiplier: number = 1): PIDParameters {
        const { K, tau, deadTime } = data;
        
        // IMC tuning: lambda = max(0.25*tau, 0.5*deadTime) * multiplier
        const lambda = lambdaMultiplier * Math.max(0.25 * tau, 0.5 * deadTime);
        
        const Kc = tau / (K * (lambda + deadTime));
        const Ti = tau * (1 + deadTime / (2 * (lambda + deadTime)));
        const Td = (tau * deadTime) / (2 * tau + deadTime);
        
        return { Kp: Kc, Ti, Td };
    }

    /**
     * Calculate closed-loop transfer function coefficients
     * Returns: { num: number[], den: number[] }
     */
    getTransferFunction(dt: number = 0.01): { num: number[]; den: number[] } {
        const { Kp, Ti, Td, N } = this.params;
        const Ts = dt;
        
        // PID transfer function: Kp(1 + 1/(Ti*s) + Td*s/(1+N*Td*s))
        // Discrete approximation using backward Euler
        
        // Coefficients for discrete PID
        const a0 = Kp * (1 + (Ts / Ti) + (Td / Ts) * (N / (1 + N * Td / Ts)));
        const a1 = Kp * (-1 - 2 * (Td / Ts) * (N / (1 + N * Td / Ts)));
        const a2 = Kp * (Td / Ts) * (N / (1 + N * Td / Ts));
        
        // Numerator: a0 + a1*z^-1 + a2*z^-2
        const num = [a0, a1, a2];
        // Denominator: 1 (for ideal PID on setpoint)
        const den = [1];
        
        return { num, den };
    }

    /**
     * Simulate closed-loop step response
     */
    simulateStep(
        setpointChange: number,
        duration: number,
        processModel: (u: number, y: number, dt: number) => number, // First-order process
        initialY: number = 0
    ): { time: number[]; setpoint: number[]; measurement: number[]; output: number[] } {
        const time: number[] = [];
        const setpoints: number[] = [];
        const measurements: number[] = [];
        const outputs: number[] = [];
        
        let y = initialY;
        const dt = 0.01;
        const steps = Math.floor(duration / dt);
        
        for (let i = 0; i < steps; i++) {
            const t = i * dt;
            
            // Update setpoint (step at t=0)
            const sp = t >= 0 ? setpointChange : 0;
            
            // Compute PID output
            const { output } = this.compute(y, sp, dt);
            
            // Process dynamics
            y = processModel(output, y, dt);
            
            // Store results
            time.push(t);
            setpoints.push(sp);
            measurements.push(y);
            outputs.push(output);
        }
        
        return { time, setpoint: setpoints, measurement: measurements, output: outputs };
    }
}

/**
 * Cascade Controller - Multiple PID loops in cascade
 */
export class CascadeController {
    private primary: PIDController;
    private secondary: PIDController;
    private outerSetpoint: number;
    
    constructor(primaryParams: PIDParameters, secondaryParams: PIDParameters) {
        this.primary = new PIDController(primaryParams);
        this.secondary = new PIDController(secondaryParams);
        this.outerSetpoint = 0;
    }
    
    /**
     * Compute cascade control output
     */
    compute(
        primaryMeasurement: number,
        secondaryMeasurement: number,
        dt: number = 0.01
    ): { primaryOutput: number; secondaryOutput: number } {
        // Primary (outer) loop
        const { output: primaryOutput } = this.primary.compute(
            primaryMeasurement, 
            this.outerSetpoint, 
            dt
        );
        
        // Secondary (inner) loop
        const { output: secondaryOutput } = this.secondary.compute(
            secondaryMeasurement,
            primaryOutput,
            dt
        );
        
        return { primaryOutput, secondaryOutput };
    }
    
    setOuterSetpoint(sp: number): void {
        this.outerSetpoint = sp;
    }
    
    reset(): void {
        this.primary.reset();
        this.secondary.reset();
    }
}

/**
 * Smith Predictor for processes with dead time
 */
export class SmithPredictor {
    private pid: PIDController;
    private processGain: number;
    private processTimeConstant: number;
    private processDeadTime: number;
    private delayedOutput: number[] = [];
    private deadTimeSteps: number;
    
    constructor(
        pidParams: PIDParameters,
        processGain: number,
        processTimeConstant: number,
        processDeadTime: number,
        dt: number = 0.01
    ) {
        this.pid = new PIDController(pidParams);
        this.processGain = processGain;
        this.processTimeConstant = processTimeConstant;
        this.processDeadTime = processDeadTime;
        this.deadTimeSteps = Math.ceil(processDeadTime / dt);
        this.delayedOutput = new Array(this.deadTimeSteps).fill(0);
    }
    
    /**
     * Compute Smith Predictor output
     * Returns: { controlOutput, predictedOutput, measuredOutput }
     */
    compute(
        measurement: number,
        setpoint: number,
        dt: number = 0.01
    ): { controlOutput: number; predictedOutput: number; measuredOutput: number } {
        // PID on predicted output (dead-time compensated)
        const predictedOutput = this.delayedOutput[0];
        const { output: controlOutput } = this.pid.compute(predictedOutput, setpoint, dt);
        
        // Process model (first-order with dead time)
        const modelOutput = this.firstOrderModel(controlOutput, dt);
        this.delayedOutput.unshift(modelOutput);
        this.delayedOutput.pop();
        
        // Actual process output (with dead time)
        const measuredOutput = this.delayedOutput[this.deadTimeSteps - 1];
        
        return { controlOutput, predictedOutput, measuredOutput };
    }
    
    private firstOrderModel(u: number, dt: number): number {
        // First-order process: tau * dy/dt + y = K * u
        const tau = this.processTimeConstant;
        const K = this.processGain;
        const y = this.delayedOutput[0];
        
        // Euler integration
        return y + (dt / tau) * (K * u - y);
    }
    
    reset(): void {
        this.pid.reset();
        this.delayedOutput = new Array(this.deadTimeSteps).fill(0);
    }
}

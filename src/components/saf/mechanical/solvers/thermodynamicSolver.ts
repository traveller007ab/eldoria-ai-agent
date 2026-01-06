/**
 * Thermodynamic Solver
 * Solver for power cycles, heat exchangers, and thermodynamic processes
 */

import { MechanicalComponent, Connection, ComponentState } from '../types';

export interface ThermodynamicState {
  p: number;
  T: number;
  h: number;
  s: number;
  v: number;
  x: number;
  quality: number;
}

export interface ThermodynamicStream {
  id: string;
  name: string;
  inlet: ThermodynamicState;
  outlet: ThermodynamicState;
  massFlow: number;
  heatTransfer: number;
  work: number;
}

export interface HeatExchangerResult {
  hotSide: { inlet: ThermodynamicState; outlet: ThermodynamicState };
  coldSide: { inlet: ThermodynamicState; outlet: ThermodynamicState };
  q: number;
  effectiveness: number;
  lmtd: number;
  ua: number;
  log: string[];
}

export interface CycleResult {
  name: string;
  netWork: number;
  thermalEfficiency: number;
  heatInput: number;
  heatRejected: number;
  massFlow: number;
  streams: ThermodynamicStream[];
  components: { type: string; efficiency: number; heatTransfer?: number; work?: number }[];
  logs: string[];
}

export interface SolverOptions {
  maxIterations: number;
  tolerance: number;
  convergenceMethod: 'secant' | 'newton' | 'fixedPoint';
}

const DEFAULT_OPTIONS: SolverOptions = {
  maxIterations: 100,
  tolerance: 1e-6,
  convergenceMethod: 'newton'
};

export class ThermodynamicSolver {
  private options: SolverOptions;
  private streams: Map<string, ThermodynamicStream> = new Map();
  private R: number = 8.314;
  private airGasConstant: number = 287.058;
  private waterGasConstant: number = 461.5;
  private cpAir: number = 1.005;
  private cpWater: number = 4.186;

  constructor(options?: Partial<SolverOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  setFluidProperties(cp: number, R: number): void {
    this.cpAir = cp;
    this.airGasConstant = R;
  }

  createState(p: number, T: number, fluid: 'water' | 'air' | 'steam' | 'refrigerant' | 'gas' = 'water'): ThermodynamicState {
    if (fluid === 'air' || fluid === 'gas') {
      const v = this.airGasConstant * T / Math.max(p, 1);
      const h = this.cpAir * T;
      const s = this.cpAir * Math.log(Math.pow(T / 273, this.cpAir / this.airGasConstant)) + this.R * Math.log(v);
      return { p, T, h, s, v, x: 0, quality: 0 };
    }

    if (fluid === 'water') {
      if (T < 373.15) {
        const v = 0.001 * (1 + 0.0001 * (T - 277));
        const h = this.cpWater * T;
        const s = this.cpWater * Math.log(T / 273);
        return { p, T, h, s, v, x: 0, quality: 0 };
      }
      const satT = this.saturationTemperature(p);
      const v = 0.001 + (T - satT) * 0.001;
      const h = this.cpWater * T;
      const s = this.cpWater * Math.log(T / 273);
      return { p, T, h, s, v, x: 0, quality: 0 };
    }

    if (fluid === 'steam') {
      const satProps = this.saturationProperties(p);
      if (T <= satProps.T) {
        const v = satProps.vf + (T / satProps.T) * (satProps.vg - satProps.vf);
        const h = satProps.hf + (T / satProps.T) * (satProps.hfg);
        const s = satProps.sf + (T / satProps.T) * (satProps.sfg);
        return { p, T, h, s, v, x: T / satProps.T, quality: T / satProps.T };
      }
      const x = (T - satProps.T) / (satProps.criticalT - satProps.T);
      const v = satProps.vg + x * (0.003155 - satProps.vg);
      const h = satProps.hg + x * (2086 - satProps.hg);
      const s = satProps.sg + x * (4.4 - satProps.sg);
      return { p, T, h, s, v, x: Math.min(x, 1), quality: Math.min(x, 1) };
    }

    return { p, T, h: 0, s: 0, v: 0, x: 0, quality: 0 };
  }

  saturationProperties(p: number): { T: number; vf: number; vg: number; hf: number; hfg: number; hg: number; sf: number; sfg: number; sg: number; criticalT: number } {
    if (p < 0.01) p = 0.01;
    if (p > 22.064) p = 22.064;

    const T = 373.15 + 25 * Math.log10(p / 0.1013);
    const T_sat = Math.max(273.15, T - 10);

    const vf = 0.001;
    const vg = 1.672 / Math.sqrt(p);
    const hf = 420 + T_sat - 273;
    const hfg = 2257 - 2.43 * (T_sat - 373);
    const hg = hf + hfg;
    const sf = 1.3 + 0.01 * (T_sat - 273);
    const sfg = 7.35 - 0.01 * (T_sat - 373);
    const sg = sf + sfg;

    return { T: T_sat, vf, vg, hf, hfg, hg, sf, sfg, sg, criticalT: 647.096 };
  }

  saturationTemperature(p: number): number {
    if (p < 0.01) p = 0.01;
    if (p > 22.064) p = 22.064;
    return 373.15 + 25 * Math.log10(p / 0.1013);
  }

  calculateEnthalpy(p: number, T: number, fluid: string = 'water'): number {
    if (fluid === 'air') return this.cpAir * T;
    if (fluid === 'steam') {
      const sat = this.saturationProperties(p);
      if (T <= sat.T) {
        return sat.hf + (T / sat.T) * sat.hfg;
      }
      return sat.hg + (T - sat.T) * 2.1;
    }
    return this.cpWater * T;
  }

  calculateEntropy(p: number, T: number, fluid: string = 'water'): number {
    if (fluid === 'air') {
      return this.cpAir * Math.log(T / 273) - this.airGasConstant * Math.log(p / 101325);
    }
    if (fluid === 'steam') {
      const sat = this.saturationProperties(p);
      if (T <= sat.T) {
        return sat.sf + (T / sat.T) * sat.sfg;
      }
      return sat.sg + 2.1 * Math.log(T / sat.T);
    }
    return this.cpWater * Math.log(T / 273);
  }

  calculateSpecificVolume(p: number, T: number, fluid: string = 'water'): number {
    if (fluid === 'air') return this.airGasConstant * T / p;
    if (fluid === 'steam') {
      const sat = this.saturationProperties(p);
      return T <= sat.T ? sat.vf : sat.vg;
    }
    return 0.001;
  }

  calculateWork(p1: number, v1: number, p2: number, T: number = 300, fluid: string = 'water'): number {
    if (fluid === 'air') {
      return this.cpAir * T * Math.pow(p2 / p1, (this.cpAir - this.airGasConstant) / this.cpAir) * Math.log(p2 / p1);
    }
    return 0;
  }

  solveRankineCycle(
    boilerPressure: number,
    condenserPressure: number,
    turbineEfficiency: number = 0.85,
    pumpEfficiency: number = 0.75,
    steamMassFlow: number = 1
  ): CycleResult {
    const logs: string[] = [];
    logs.push('Solving Rankine Cycle...');
    logs.push(`Boiler: ${boilerPressure} MPa, Condenser: ${condenserPressure} MPa`);

    const satCondenser = this.saturationProperties(condenserPressure);
    const satBoiler = this.saturationProperties(boilerPressure);

    const state1: ThermodynamicState = {
      p: condenserPressure,
      T: satCondenser.T,
      h: satCondenser.hf,
      s: satCondenser.sf,
      v: satCondenser.vf,
      x: 0,
      quality: 0
    };

    const pumpWork = (boilerPressure - condenserPressure) * satCondenser.vf / pumpEfficiency;
    state1.h = satCondenser.hf + pumpWork;

    const state2: ThermodynamicState = {
      p: boilerPressure,
      T: satBoiler.T,
      h: state1.h + pumpWork,
      s: satCondenser.sf,
      v: satBoiler.vf,
      x: 0,
      quality: 0
    };

    const qBoiler = satBoiler.hg - state2.h;
    const state3: ThermodynamicState = {
      p: boilerPressure,
      T: satBoiler.T + 50,
      h: satBoiler.hg + qBoiler * 0.1,
      s: satBoiler.sg,
      v: satBoiler.vg,
      x: 1,
      quality: 1
    };

    const turbineWorkIdeal = satCondenser.hg * turbineEfficiency;
    const s3 = satBoiler.sg;
    let x4 = 1;
    if (s3 > satCondenser.sg) x4 = 1;
    else x4 = (s3 - satCondenser.sf) / satCondenser.sfg;

    const h4Ideal = satCondenser.hf + x4 * satCondenser.hfg;
    const h4Actual = state3.h - turbineEfficiency * (state3.h - h4Ideal);

    const state4: ThermodynamicState = {
      p: condenserPressure,
      T: satCondenser.T,
      h: h4Actual,
      s: 0,
      v: satCondenser.vf,
      x: x4,
      quality: x4
    };

    const turbineWork = state3.h - h4Actual;
    const condenserHeat = state4.h - state2.h;
    const netWork = turbineWork - pumpWork;
    const heatInput = state3.h - state2.h;
    const thermalEfficiency = netWork / heatInput;

    logs.push(`State 1 (Condenser exit): T=${state1.T.toFixed(1)}K, h=${state1.h.toFixed(1)} kJ/kg`);
    logs.push(`State 2 (Boiler inlet): T=${state2.T.toFixed(1)}K, h=${state2.h.toFixed(1)} kJ/kg`);
    logs.push(`State 3 (Turbine inlet): T=${state3.T.toFixed(1)}K, h=${state3.h.toFixed(1)} kJ/kg`);
    logs.push(`State 4 (Turbine exit): T=${state4.T.toFixed(1)}K, h=${state4.h.toFixed(1)} kJ/kg, x=${state4.x.toFixed(3)}`);
    logs.push(`Turbine work: ${turbineWork.toFixed(2)} kJ/kg, Pump work: ${pumpWork.toFixed(2)} kJ/kg`);
    logs.push(`Thermal efficiency: ${(thermalEfficiency * 100).toFixed(2)}%`);

    return {
      name: 'Rankine Cycle',
      netWork: netWork * steamMassFlow,
      thermalEfficiency,
      heatInput: heatInput * steamMassFlow,
      heatRejected: condenserHeat * steamMassFlow,
      massFlow: steamMassFlow,
      streams: [
        { id: 's1', name: 'Condenser Outlet', inlet: state1, outlet: state1, massFlow: steamMassFlow, heatTransfer: 0, work: 0 },
        { id: 's2', name: 'Boiler Inlet', inlet: state2, outlet: state2, massFlow: steamMassFlow, heatTransfer: 0, work: 0 },
        { id: 's3', name: 'Superheated Steam', inlet: state3, outlet: state3, massFlow: steamMassFlow, heatTransfer: 0, work: 0 },
        { id: 's4', name: 'Turbine Exhaust', inlet: state4, outlet: state4, massFlow: steamMassFlow, heatTransfer: 0, work: 0 }
      ],
      components: [
        { type: 'Boiler', efficiency: 1, heatTransfer: heatInput * steamMassFlow },
        { type: 'Turbine', efficiency: turbineEfficiency, work: turbineWork * steamMassFlow },
        { type: 'Condenser', efficiency: 1, heatTransfer: -condenserHeat * steamMassFlow },
        { type: 'Pump', efficiency: pumpEfficiency, work: -pumpWork * steamMassFlow }
      ],
      logs
    };
  }

  solveBraytonCycle(
    pressureRatio: number,
    T_max: number,
    turbineEfficiency: number = 0.85,
    compressorEfficiency: number = 0.85,
    massFlow: number = 1,
    regenerator: boolean = false
  ): CycleResult {
    const logs: string[] = [];
    logs.push('Solving Brayton Cycle...');
    logs.push(`Pressure Ratio: ${pressureRatio}, Max Temperature: ${T_max} K`);

    const p1 = 0.1013;
    const T1 = 288;
    const p2 = pressureRatio * p1;
    const p3 = p2;
    const p4 = p1;

    const T2s = T1 * Math.pow(pressureRatio, (this.cpAir - this.airGasConstant) / this.cpAir);
    const T2 = T1 + (T2s - T1) / compressorEfficiency;

    const qIn = this.cpAir * (T_max - T2);
    const T3 = T_max;

    const T4s = T3 * Math.pow(1 / pressureRatio, (this.cpAir - this.airGasConstant) / this.cpAir);
    const T4 = T3 - turbineEfficiency * (T3 - T4s);

    const wTurbine = this.cpAir * (T3 - T4);
    const wCompressor = this.cpAir * (T2 - T1);
    const netWork = wTurbine - wCompressor;
    const qAdded = this.cpAir * (T3 - T2);
    const thermalEfficiency = netWork / qAdded;

    logs.push(`State 1: T=${T1}K, P=${p1.toFixed(3)} MPa`);
    logs.push(`State 2: T=${T2.toFixed(1)}K, P=${p2.toFixed(3)} MPa`);
    logs.push(`State 3: T=${T3}K, P=${p3.toFixed(3)} MPa`);
    logs.push(`State 4: T=${T4.toFixed(1)}K, P=${p4.toFixed(3)} MPa`);
    logs.push(`Turbine work: ${wTurbine.toFixed(2)} kJ/kg, Compressor work: ${wCompressor.toFixed(2)} kJ/kg`);
    logs.push(`Thermal efficiency: ${(thermalEfficiency * 100).toFixed(2)}%`);

    return {
      name: 'Brayton Cycle',
      netWork: netWork * massFlow,
      thermalEfficiency,
      heatInput: qAdded * massFlow,
      heatRejected: (qAdded - netWork) * massFlow,
      massFlow,
      streams: [],
      components: [
        { type: 'Compressor', efficiency: compressorEfficiency, work: wCompressor * massFlow },
        { type: 'Combustor', efficiency: 1, heatTransfer: qAdded * massFlow },
        { type: 'Turbine', efficiency: turbineEfficiency, work: wTurbine * massFlow }
      ],
      logs
    };
  }

  solveHeatExchanger(
    hotInlet: ThermodynamicState,
    coldInlet: ThermodynamicState,
    effectiveness: number,
    area: number,
    U: number = 500,
    type: 'shellTube' | 'parallel' | 'counter' | 'cross' = 'counter'
  ): HeatExchangerResult {
    const logs: string[] = [];
    logs.push(`Solving Heat Exchanger (${type}, ε=${effectiveness})`);

    const C_hot = this.cpWater;
    const C_cold = this.cpWater;
    const C_min = Math.min(C_hot, C_hot);
    const C_max = Math.max(C_hot, C_hot);
    const C_r = C_min / C_max;

    const q_max = C_min * (hotInlet.T - coldInlet.T);
    const q = effectiveness * q_max;

    const hotOutletT = hotInlet.T - q / C_hot;
    const coldOutletT = coldInlet.T + q / C_cold;

    const hotOutlet = { ...hotInlet, T: hotOutletT, h: this.calculateEnthalpy(hotInlet.p, hotOutletT), s: this.calculateEntropy(hotInlet.p, hotOutletT) };
    const coldOutlet = { ...coldInlet, T: coldOutletT, h: this.calculateEnthalpy(coldInlet.p, coldOutletT), s: this.calculateEntropy(coldInlet.p, coldOutletT) };

    let lmtd = 0;
    if (type === 'counter') {
      const dt1 = hotInlet.T - coldOutletT;
      const dt2 = hotOutletT - coldInlet.T;
      lmtd = (dt1 - dt2) / Math.log(dt1 / dt2);
    } else if (type === 'parallel') {
      const dt1 = hotInlet.T - coldInlet.T;
      const dt2 = hotOutletT - coldOutletT;
      lmtd = (dt1 - dt2) / Math.log(dt1 / dt2);
    } else {
      lmtd = (hotInlet.T - coldInlet.T + hotOutletT - coldOutletT) / 2;
    }

    const requiredUA = q / Math.max(lmtd, 1);
    const actualUA = U * area;
    const actualEffectiveness = Math.min(effectiveness * actualUA / requiredUA, 0.99);

    logs.push(`Q = ${q.toFixed(1)} kW`);
    logs.push(`LMTD = ${lmtd.toFixed(2)} K`);
    logs.push(`Hot outlet: ${hotOutletT.toFixed(1)}K, Cold outlet: ${coldOutletT.toFixed(1)}K`);

    return {
      hotSide: { inlet: hotInlet, outlet: hotOutlet },
      coldSide: { inlet: coldInlet, outlet: coldOutlet },
      q,
      effectiveness: actualEffectiveness,
      lmtd,
      ua: actualUA,
      log: logs
    };
  }

  solveCompressor(
    inletState: ThermodynamicState,
    pressureRatio: number,
    efficiency: number = 0.85,
    isentropic: boolean = false
  ): { outlet: ThermodynamicState; work: number; heat: number } {
    const p_in = inletState.p;
    const p_out = p_in * pressureRatio;
    const T_in = inletState.T;

    const T_out_ideal = T_in * Math.pow(pressureRatio, (this.cpAir - this.airGasConstant) / this.cpAir);

    let T_out: number;
    let work: number;
    let heat: number;

    if (isentropic) {
      T_out = T_out_ideal;
      work = this.cpAir * (T_out - T_in);
      heat = 0;
    } else {
      T_out = T_in + (T_out_ideal - T_in) / efficiency;
      work = this.cpAir * (T_out - T_in);
      heat = work * (1 - efficiency) * 0.5;
    }

    const outlet: ThermodynamicState = {
      p: p_out,
      T: T_out,
      h: this.cpAir * T_out,
      s: this.calculateEntropy(p_out, T_out),
      v: this.airGasConstant * T_out / p_out,
      x: 0,
      quality: 0
    };

    return { outlet, work, heat };
  }

  solveTurbine(
    inletState: ThermodynamicState,
    pressureRatio: number,
    efficiency: number = 0.85
  ): { outlet: ThermodynamicState; work: number; heat: number } {
    const p_in = inletState.p;
    const p_out = p_in / pressureRatio;
    const T_in = inletState.T;

    const T_out_ideal = T_in * Math.pow(1 / pressureRatio, (this.cpAir - this.airGasConstant) / this.cpAir);
    const T_out = T_in - efficiency * (T_in - T_out_ideal);
    const work = this.cpAir * (T_in - T_out);

    const outlet: ThermodynamicState = {
      p: p_out,
      T: T_out,
      h: this.cpAir * T_out,
      s: this.calculateEntropy(p_out, T_out),
      v: this.airGasConstant * T_out / p_out,
      x: 0,
      quality: 0
    };

    return { outlet, work: Math.max(work, 0), heat: 0 };
  }

  toSimulationResults(): Map<string, ComponentState[]> {
    const results = new Map<string, ComponentState[]>();

    for (const [id, stream] of this.streams) {
      const states: ComponentState[] = [
        { name: 'Temperature', symbol: 'T', value: stream.inlet.T, unit: 'K', source: 'calculated' },
        { name: 'Pressure', symbol: 'P', value: stream.inlet.p, unit: 'MPa', source: 'calculated' },
        { name: 'Enthalpy', symbol: 'h', value: stream.inlet.h, unit: 'kJ/kg', source: 'calculated' },
        { name: 'Entropy', symbol: 's', value: stream.inlet.s, unit: 'kJ/kg-K', source: 'calculated' }
      ];
      results.set(id, states);
    }

    return results;
  }

  fromComponents(components: MechanicalComponent[]): void {
    this.streams.clear();

    for (const comp of components) {
      if (comp.category === 'thermodynamic' || comp.category === 'heatTransfer') {
        const params: Record<string, number> = {};
        for (const p of comp.parameters) {
          if (typeof p.value === 'number') params[p.symbol] = p.value;
        }

        const T_in = params['T_in'] || params['T_hot'] || 300;
        const T_out = params['T_out'] || params['T_cold'] || 350;
        const p_in = params['P_in'] || params['P'] || 0.1;
        const m_dot = params['ṁ'] || params['m'] || 1;

        const inlet = this.createState(p_in, T_in, 'water');
        const outlet = this.createState(p_in, T_out, 'water');

        this.streams.set(comp.id, {
          id: comp.id,
          name: comp.name,
          inlet,
          outlet,
          massFlow: m_dot,
          heatTransfer: m_dot * (outlet.h - inlet.h),
          work: 0
        });
      }
    }
  }
}

export default ThermodynamicSolver;

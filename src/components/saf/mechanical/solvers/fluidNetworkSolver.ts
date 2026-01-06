/**
 * Fluid Network Solver
 * Comprehensive solver for fluid distribution networks
 * Implements pressure drop calculations, flow distribution, and system analysis
 */

import { MechanicalComponent, Connection, ComponentParameter, ComponentState } from '../types';

export interface FluidNode {
  id: string;
  name: string;
  pressure: number;
  elevation: number;
  demands: number[];
  components: string[];
}

export interface FluidElement {
  id: string;
  name: string;
  type: 'pipe' | 'fitting' | 'valve' | 'pump' | 'heatExchanger' | 'tank' | 'reservoir';
  startNode: string;
  endNode: string;
  flow: number;
  velocity: number;
  headLoss: number;
  parameters: Record<string, any>;
}

export interface FluidNetworkResult {
  status: 'converged' | 'failed' | 'infeasible';
  iterations: number;
  flowBalance: number;
  nodes: Map<string, FluidNode>;
  elements: Map<string, FluidElement>;
  pumpPower: number;
  totalHeadLoss: number;
  logs: string[];
}

export interface SolverOptions {
  tolerance: number;
  maxIterations: number;
  relaxationFactor: number;
  method: 'hardyCross' | 'newtonRaphson' | 'linear';
  frictionModel: 'darcy' | 'hazenWilliams' | 'manning';
  turbulentReynolds: number;
}

const DEFAULT_OPTIONS: SolverOptions = {
  tolerance: 1e-6,
  maxIterations: 100,
  relaxationFactor: 0.5,
  method: 'newtonRaphson',
  frictionModel: 'darcy',
  turbulentReynolds: 4000
};

export class FluidNetworkSolver {
  private nodes: Map<string, FluidNode> = new Map();
  private elements: Map<string, FluidElement> = new Map();
  private options: SolverOptions;
  private fluid: { density: number; viscosity: number; kinematicViscosity: number };
  private gravity: number = 9.81;

  constructor(options?: Partial<SolverOptions>) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.fluid = { density: 998.2, viscosity: 0.001002, kinematicViscosity: 1.004e-6 };
  }

  setFluidProperties(density: number, viscosity: number): void {
    this.fluid = {
      density,
      viscosity,
      kinematicViscosity: viscosity / density
    };
  }

  addNode(id: string, name: string, elevation: number = 0): void {
    this.nodes.set(id, {
      id,
      name,
      pressure: 101325,
      elevation,
      demands: [],
      components: []
    });
  }

  addElement(element: FluidElement): void {
    this.elements.set(element.id, element);
  }

  addPipe(id: string, name: string, startNode: string, endNode: string, length: number, diameter: number, roughness: number = 0.00015): void {
    this.addElement({
      id,
      name,
      type: 'pipe',
      startNode,
      endNode,
      flow: 0,
      velocity: 0,
      headLoss: 0,
      parameters: { length, diameter, roughness, K: 0 }
    });
  }

  addFitting(id: string, name: string, startNode: string, endNode: string, K: number): void {
    this.addElement({
      id,
      name,
      type: 'fitting',
      startNode,
      endNode,
      flow: 0,
      velocity: 0,
      headLoss: 0,
      parameters: { K, length: 0, diameter: 0.1, roughness: 0 }
    });
  }

  addValve(id: string, name: string, startNode: string, endNode: string, Cv: number, openPercent: number = 100): void {
    const Kv = Cv * 0.865;
    this.addElement({
      id,
      name,
      type: 'valve',
      startNode,
      endNode,
      flow: 0,
      velocity: 0,
      headLoss: 0,
      parameters: { Cv, Kv, openPercent: openPercent / 100 }
    });
  }

  addPump(id: string, name: string, startNode: string, endNode: string, curvePoints: { flow: number; head: number }[]): void {
    this.addElement({
      id,
      name,
      type: 'pump',
      startNode,
      endNode,
      flow: 0,
      velocity: 0,
      headLoss: 0,
      parameters: { curvePoints }
    });
  }

  addReservoir(id: string, name: string, elevation: number): void {
    this.addElement({
      id,
      name,
      type: 'reservoir',
      startNode: id,
      endNode: 'virtual',
      flow: 0,
      velocity: 0,
      headLoss: 0,
      parameters: { elevation, head: elevation * this.gravity }
    });
    this.addNode(id, name, elevation);
    if (this.nodes.get(id)) {
      this.nodes.get(id)!.pressure = 101325;
    }
  }

  calculatePipeHeadLoss(element: FluidElement, flow: number): number {
    const { length, diameter, roughness, K } = element.parameters;
    const A = Math.PI * Math.pow(diameter / 2, 2);
    const velocity = Math.abs(flow) / A;
    const Re = velocity * diameter / this.fluid.kinematicViscosity;

    let f: number;
    if (Re < this.options.turbulentReynolds) {
      f = 64 / Math.max(Re, 1);
    } else {
      const relativeRoughness = roughness / diameter;
      f = this.calculateDarcyFriction(Re, relativeRoughness);
    }

    const velocityHead = Math.pow(velocity, 2) / (2 * this.gravity);
    const frictionLoss = f * (length / diameter) * velocityHead;
    const minorLoss = K * velocityHead;

    return (frictionLoss + minorLoss) * Math.sign(flow);
  }

  private calculateDarcyFriction(Re: number, relativeRoughness: number): number {
    if (Re < 2000) return 64 / Re;

    const term1 = relativeRoughness / 3.7;
    const term2 = 2.51 / (Re * Math.sqrt(this.options.turbulentReynolds));

    let f = 0.02;
    for (let i = 0; i < 20; i++) {
      const fNext = -2 * Math.log10(term1 + term2 / Math.sqrt(f));
      if (Math.abs(fNext - f) < 1e-6) break;
      f = Math.max(fNext, 0.008);
    }

    return f;
  }

  calculateValveHeadLoss(element: FluidElement, flow: number): number {
    const { Kv, openPercent } = element.parameters;
    const adjustedKv = Kv * Math.pow(openPercent, 0.5);
    const flowM3h = Math.abs(flow) * 3600;
    const deltaP = Math.pow(flowM3h / adjustedKv, 2);
    const headLoss = deltaP / (this.fluid.density * this.gravity);
    return headLoss * Math.sign(flow);
  }

  calculatePumpHead(element: FluidElement, flow: number): number {
    const curvePoints = element.parameters.curvePoints as { flow: number; head: number }[];
    if (!curvePoints || curvePoints.length === 0) return 0;

    const flowAbs = Math.abs(flow);
    for (let i = 0; i < curvePoints.length - 1; i++) {
      if (flowAbs >= curvePoints[i].flow && flowAbs <= curvePoints[i + 1].flow) {
        const t = (flowAbs - curvePoints[i].flow) / (curvePoints[i + 1].flow - curvePoints[i].flow);
        return curvePoints[i].head + t * (curvePoints[i + 1].head - curvePoints[i].head);
      }
    }

    if (flowAbs < curvePoints[0].flow) return curvePoints[0].head;
    return curvePoints[curvePoints.length - 1].head;
  }

  calculatePumpPower(element: FluidElement, flow: number): number {
    const head = this.calculatePumpHead(element, flow);
    const power = this.fluid.density * Math.abs(flow) * this.gravity * head;
    return power / 1000;
  }

  getElementHeadLoss(element: FluidElement, flow: number): number {
    switch (element.type) {
      case 'pipe':
      case 'fitting':
        return this.calculatePipeHeadLoss(element, flow);
      case 'valve':
        return this.calculateValveHeadLoss(element, flow);
      case 'pump':
        return -this.calculatePumpHead(element, flow);
      case 'heatExchanger':
        return this.calculatePipeHeadLoss(element, flow) * 1.5;
      default:
        return 0;
    }
  }

  initializeFlows(method: 'forward' | 'backward' | 'uniform' = 'uniform'): void {
    const elements = Array.from(this.elements.values()).filter(e => e.type !== 'reservoir');

    if (method === 'uniform') {
      const totalDemand = Array.from(this.nodes.values())
        .reduce((sum, node) => sum + node.demands.reduce((a, b) => a + b, 0), 0);
      const avgFlow = totalDemand / elements.length;
      elements.forEach(el => el.flow = avgFlow);
    }
  }

  solveNewtonRaphson(): FluidNetworkResult {
    const logs: string[] = [];
    logs.push('Starting Newton-Raphson solution...');
    logs.push(`Tolerance: ${this.options.tolerance}, Max iterations: ${this.options.maxIterations}`);

    this.initializeFlows('uniform');

    let iteration = 0;
    let converged = false;
    let flowBalance = 1;

    while (iteration < this.options.maxIterations && !converged) {
      iteration++;
      const maxCorrection = 0;
      const corrections: Map<string, number> = new Map();

      for (const [id, element] of this.elements) {
        if (element.type === 'reservoir') continue;

        const flow = element.flow;
        const headLoss = this.getElementHeadLoss(element, flow);
        const dHeadDflow = this.getElementHeadLossDerivative(element, flow);

        const startNode = this.nodes.get(element.startNode);
        const endNode = this.nodes.get(element.endNode);
        const headDiff = (startNode?.pressure || 0) / (this.fluid.density * this.gravity) +
          (startNode?.elevation || 0) -
          (endNode?.pressure || 0) / (this.fluid.density * this.gravity) -
          (endNode?.elevation || 0);

        const residual = headDiff + headLoss;
        const correction = this.options.relaxationFactor * residual / (dHeadDflow + 1e-10);

        if (Math.abs(correction) > maxCorrection) {
          corrections.set(id, correction);
        }
      }

      corrections.forEach((correction, id) => {
        const element = this.elements.get(id);
        if (element) {
          element.flow -= correction;
        }
      });

      flowBalance = Array.from(this.elements.values())
        .filter(e => e.type !== 'reservoir')
        .reduce((max, e) => Math.max(max, Math.abs(e.flow)), 0);

      converged = flowBalance < this.options.tolerance;

      if (iteration % 10 === 0) {
        logs.push(`Iteration ${iteration}: Max flow correction = ${flowBalance.toExponential(4)}`);
      }
    }

    this.updateVelocities();
    this.updateNodePressures();
    this.calculatePumpsPower();

    const status = converged ? 'converged' : iteration >= this.options.maxIterations ? 'failed' : 'infeasible';
    logs.push(`Solution ${status} in ${iteration} iterations`);
    logs.push(`Max flow imbalance: ${flowBalance.toExponential(4)}`);

    return {
      status,
      iterations: iteration,
      flowBalance,
      nodes: this.nodes,
      elements: this.elements,
      pumpPower: this.calculateTotalPumpPower(),
      totalHeadLoss: this.calculateTotalHeadLoss(),
      logs
    };
  }

  getElementHeadLossDerivative(element: FluidElement, flow: number): number {
    const h = Math.abs(flow) * 0.01 + 1e-6;
    const head1 = this.getElementHeadLoss(element, flow - h);
    const head2 = this.getElementHeadLoss(element, flow + h);
    return (head2 - head1) / (2 * h);
  }

  updateVelocities(): void {
    for (const element of this.elements.values()) {
      if (element.type === 'reservoir') continue;

      const diameter = element.parameters.diameter || 0.1;
      const A = Math.PI * Math.pow(diameter / 2, 2);
      element.velocity = element.flow / A;
      element.headLoss = this.getElementHeadLoss(element, element.flow);
    }
  }

  updateNodePressures(): void {
    const reservoir = Array.from(this.elements.values()).find(e => e.type === 'reservoir');
    if (!reservoir) return;

    const refElevation = this.nodes.get(reservoir.startNode)?.elevation || 0;
    const refHead = refElevation + reservoir.parameters.head / this.gravity;

    for (const [id, node] of this.nodes) {
      if (id === reservoir.startNode) continue;

      let head = refHead;
      const path = this.findPath(reservoir.startNode, id);

      for (const elementId of path) {
        const element = this.elements.get(elementId);
        if (element && element.type !== 'reservoir') {
          head -= element.headLoss;
        }
      }

      node.pressure = (head - node.elevation) * this.fluid.density * this.gravity;
    }
  }

  findPath(startId: string, endId: string): string[] {
    const visited = new Set<string>();
    const path: string[] = [];

    const dfs = (current: string): boolean => {
      if (current === endId) return true;
      if (visited.has(current)) return false;

      visited.add(current);

      for (const [id, element] of this.elements) {
        if (element.type === 'reservoir') continue;

        if (element.startNode === current && !visited.has(element.endNode)) {
          path.push(id);
          if (dfs(element.endNode)) return true;
          path.pop();
        }
        if (element.endNode === current && !visited.has(element.startNode)) {
          path.push(id);
          if (dfs(element.startNode)) return true;
          path.pop();
        }
      }

      return false;
    };

    dfs(startId);
    return path;
  }

  calculatePumpsPower(): void {
    for (const element of this.elements.values()) {
      if (element.type === 'pump') {
        element.parameters.head = -element.headLoss;
        element.parameters.power = this.calculatePumpPower(element, element.flow);
      }
    }
  }

  calculateTotalPumpPower(): number {
    let total = 0;
    for (const element of this.elements.values()) {
      if (element.type === 'pump') {
        total += element.parameters.power || 0;
      }
    }
    return total;
  }

  calculateTotalHeadLoss(): number {
    let total = 0;
    for (const element of this.elements.values()) {
      if (element.type !== 'reservoir') {
        total += Math.abs(element.headLoss);
      }
    }
    return total;
  }

  getSystemCurve(pumpElement: FluidElement, flowRange: { min: number; max: number; steps: number }): { flow: number; head: number }[] {
    const points: { flow: number; head: number }[] = [];
    const step = (flowRange.max - flowRange.min) / flowRange.steps;

    for (let flow = flowRange.min; flow <= flowRange.max; flow += step) {
      const pumpHead = this.calculatePumpHead(pumpElement, flow);
      const systemHead = this.calculateTotalHeadLossForFlow(flow);
      points.push({ flow, head: pumpHead - systemHead });
    }

    return points;
  }

  calculateTotalHeadLossForFlow(flow: number): number {
    let total = 0;
    for (const element of this.elements.values()) {
      if (element.type !== 'reservoir') {
        total += Math.abs(this.getElementHeadLoss(element, flow));
      }
    }
    return total;
  }

  getOperatingPoint(pumpElement: FluidElement): { flow: number; head: number; power: number; efficiency: number } {
    const flows = Array.from(this.elements.values())
      .filter(e => e.type === 'pipe')
      .map(e => e.flow);
    const avgFlow = flows.reduce((a, b) => a + b, 0) / Math.max(flows.length, 1);

    const pumpHead = this.calculatePumpHead(pumpElement, avgFlow);
    const systemHead = this.calculateTotalHeadLossForFlow(avgFlow);
    const netHead = pumpHead - systemHead;
    const power = this.calculatePumpPower(pumpElement, avgFlow);

    const hydraulicPower = Math.abs(avgFlow) * this.fluid.density * this.gravity * Math.abs(netHead);
    const efficiency = hydraulicPower > 0 ? power * 1000 / hydraulicPower : 0;

    return {
      flow: avgFlow,
      head: netHead,
      power,
      efficiency: Math.min(efficiency, 100)
    };
  }

  fromComponents(components: MechanicalComponent[], connections: Connection[]): void {
    this.nodes.clear();
    this.elements.clear();

    for (const comp of components) {
      const compPorts = comp.ports || [];
      if (compPorts.some(p => p.domain === 'fluid')) {
        this.addNode(comp.id, comp.name || 'Unknown', comp.geometry?.dimensions?.elevation || 0);

        for (const port of compPorts) {
          if (port.domain === 'fluid') {
            const node = this.nodes.get(comp.id);
            if (node) node.components.push(port.id);
          }
        }
      }
    }

    const pumpCurves: Map<string, { flow: number; head: number }[]> = new Map();
    for (const comp of components) {
      if (comp.category === 'fluid' && comp.subcategory === 'turbomachinery') {
        const params: Record<string, number> = {};
        const compParams = comp.parameters || [];
        for (const p of compParams) {
          if (typeof p.value === 'number') params[p.symbol] = p.value;
        }

        const curvePoints: { flow: number; head: number }[] = [];
        const Q_design = params['Q_design'] || 0.01;
        const H_design = params['H_design'] || 10;
        const eta = params['η_BEP'] || 0.8;

        curvePoints.push({ flow: 0, head: H_design * 1.2 });
        curvePoints.push({ flow: Q_design * 0.5, head: H_design * 1.1 });
        curvePoints.push({ flow: Q_design, head: H_design });
        curvePoints.push({ flow: Q_design * 1.3, head: H_design * 0.7 });
        curvePoints.push({ flow: Q_design * 1.5, head: H_design * 0.3 });

        pumpCurves.set(comp.id, curvePoints);
      }
    }

    for (const comp of components) {
      const compPorts = comp.ports || [];
      const inletPort = compPorts.find(p => p.type === 'input' && p.domain === 'fluid');
      const outletPort = compPorts.find(p => p.type === 'output' && p.domain === 'fluid');

      if (comp.category === 'fluid' && comp.subcategory === 'turbomachinery') {
        const curvePoints = pumpCurves.get(comp.id) || [];
        this.addPump(comp.id, comp.name || 'Unknown Pump', `${comp.id}_in`, `${comp.id}_out`, curvePoints);
      } else if (comp.subcategory === 'internalFlow' && comp.tags?.includes('valve')) {
        const params: Record<string, number> = {};
        const compParams = comp.parameters || [];
        for (const p of compParams) {
          if (typeof p.value === 'number') params[p.symbol] = p.value;
        }
        const Cv = params['Cv_max'] || 40;
        this.addValve(comp.id, comp.name || 'Unknown Valve', `${comp.id}_in`, `${comp.id}_out`, Cv);
      } else {
        const diameter = comp.geometry?.dimensions?.nominalDiameter || 0.05;
        const length = comp.geometry?.dimensions?.faceToFace || 0.2;
        this.addPipe(comp.id, comp.name || 'Unknown Pipe', `${comp.id}_in`, `${comp.id}_out`, length, diameter);
      }
    }

    for (const conn of connections) {
      if (!conn.sourceComponentId || !conn.targetComponentId) continue;
      
      const sourceComp = components.find(c => c.id === conn.sourceComponentId);
      const targetComp = components.find(c => c.id === conn.targetComponentId);
      if (sourceComp && targetComp) {
        const sourcePorts = sourceComp.ports || [];
        const targetPorts = targetComp.ports || [];
        const sourcePort = sourcePorts.find(p => p.id === conn.sourcePortId);
        const targetPort = targetPorts.find(p => p.id === conn.targetPortId);

        if (sourcePort?.domain === 'fluid' && targetPort?.domain === 'fluid') {
          const K = conn.parameters?.K || 0.5;
          this.addFitting(`${conn.id}_fitting`, 'Connection Fitting', conn.sourceComponentId, conn.targetComponentId, K);
        }
      }
    }
  }

  toSimulationResults(): Map<string, ComponentState[]> {
    const results = new Map<string, ComponentState[]>();

    for (const element of this.elements.values()) {
      const states: ComponentState[] = [];

      if (element.type === 'pump') {
        states.push({
          name: 'Flow Rate',
          symbol: 'Q',
          value: Math.abs(element.flow) * 3600,
          unit: 'm³/h',
          source: 'calculated'
        });
        states.push({
          name: 'Pump Head',
          symbol: 'H',
          value: element.parameters.head || 0,
          unit: 'm',
          source: 'calculated'
        });
        states.push({
          name: 'Power',
          symbol: 'P',
          value: element.parameters.power || 0,
          unit: 'kW',
          source: 'calculated'
        });
      } else {
        states.push({
          name: 'Flow Rate',
          symbol: 'Q',
          value: Math.abs(element.flow) * 3600,
          unit: 'm³/h',
          source: 'calculated'
        });
        states.push({
          name: 'Velocity',
          symbol: 'V',
          value: element.velocity,
          unit: 'm/s',
          source: 'calculated'
        });
        states.push({
          name: 'Head Loss',
          symbol: 'Δh',
          value: element.headLoss,
          unit: 'm',
          source: 'calculated'
        });
      }

      results.set(element.id, states);
    }

    return results;
  }
}

export default FluidNetworkSolver;

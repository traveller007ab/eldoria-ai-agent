# SAF Lab v2.0 - Complete Documentation

## Overview

SAF Lab v2.0 is a mechanical engineering simulation system for prototyping fluid systems, thermal systems, and thermodynamic cycles. Designed for students and engineers to quickly model, simulate, and analyze mechanical systems.

---

## Architecture

```
src/components/saf/mechanical-v2/
├── components/
│   └── fluid/
│       ├── CentrifugalPump
│       ├── StraightPipe
│       ├── ControlValve
│       ├── BallValve
│       ├── GateValve
│       ├── GlobeValve
│       ├── CheckValve
│       ├── Elbow
│       ├── Tee
│       └── ShellTubeHeatExchanger
│
├── core/
│   ├── ComponentBase.ts       # Base class for all components
│   ├── ComponentFactory.ts    # Factory for creating components
│   └── store.ts               # Zustand state management
│
├── templates/
│   └── index.ts               # 10 industry templates
│
├── types/
│   └── index.ts               # TypeScript interfaces
│
├── workers/
│   └── simulationWorker.ts    # Web Worker for simulation
│
└── tests/
    └── saf.tests.ts           # Unit tests
```

---

## Components

### Pumps

#### Centrifugal Pump
- **ID:** `fluid.pump.centrifugal`
- **Description:** Radial flow pump for industrial applications
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | Q_design | m³/h | 100 | 1-10000 |
  | H_design | m | 50 | 1-500 |
  | eta_BEP | - | 0.75 | 0.5-0.95 |
  | N | rpm | 1450 | 300-3600 |
  | NPSHr | m | 3.0 | 0.5-20 |

- **Equations:**
  - Power: `P = (ρ * g * Q * H) / η`
  - Flow Affinity: `Q₂ = Q₁ * (N₂ / N₁)`
  - Head Affinity: `H₂ = H₁ * (N₂ / N₁)²`

---

### Pipes

#### Straight Pipe
- **ID:** `fluid.pipe.straight`
- **Description:** Circular straight pipe for fluid transport
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D | mm | 50 | 15-300 |
  | L | m | 10 | 0.1-1000 |
  | epsilon | mm | 0.045 | 0.001-1 |

- **Equations:**
  - Velocity: `v = Q / A = (4 * ṁ) / (ρ * π * D²)`
  - Reynolds: `Re = (ρ * v * D) / μ`
  - Pressure Drop: `ΔP = f * (L/D) * (ρ * v² / 2)`

#### Elbow (90°)
- **ID:** `fluid.pipe.elbow`
- **Description:** Standard 90-degree pipe bend
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D | mm | 50 | 15-200 |
  | R/D | - | 1.5 | 1-3 |

- **Equations:**
  - K Value: `K = 0.2 + 1.0 / (0.55 + 2.3 * (R/D)^-1.5)`

#### Tee
- **ID:** `fluid.pipe.tee`
- **Description:** Flow-through-run tee junction
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D_run | mm | 50 | 15-200 |
  | D_branch | mm | 40 | 15-150 |
  | branch_fraction | - | 0.2 | 0-1 |

---

### Valves

#### Control Valve
- **ID:** `fluid.valve.control`
- **Description:** Globe-style control valve for flow regulation
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | Cv | m³/h | 40 | 0.1-1000 |
  | opening | % | 50 | 0-100 |
  | characteristic | - | equal_percentage | linear/equal_percentage |

- **Equations:**
  - Flow: `Q = Cv * √(ΔP)` (for water, SG=1)

#### Ball Valve
- **ID:** `fluid.valve.ball`
- **Description:** Full port ball valve for isolation
- **Parameters:**
  | Parameter | Unit | Default |
  |-----------|------|---------|
  | D | mm | 50 |
  | Cv_open | m³/h | 120 |
  | state | - | open |

#### Gate Valve
- **ID:** `fluid.valve.gate`
- **Description:** Full bore gate valve for isolation
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D | mm | 50 | 15-200 |
  | Cv_open | m³/h | 150 | - |
  | opening | % | 100 | 0-100 |

#### Globe Valve
- **ID:** `fluid.valve.globe`
- **Description:** Globe-style valve for throttling
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D | mm | 50 | - |
  | Cv_max | m³/h | 60 | 0.1-500 |
  | opening | % | 50 | 0-100 |
  | characteristic | - | equal_percentage | - |

#### Check Valve
- **ID:** `fluid.valve.check`
- **Description:** Swing check valve for backflow prevention
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | D | mm | 50 | - |
  | Cr | kPa | 2 | 0.1-20 |
  | Cv | m³/h | 80 | - |

- **Logic:** Opens when `ΔP > Cracking Pressure`

---

### Heat Exchangers

#### Shell and Tube Heat Exchanger
- **ID:** `heatTransfer.heatExchanger.shellTube`
- **Description:** Counter-flow shell and tube HX
- **Parameters:**
  | Parameter | Unit | Default | Range |
  |-----------|------|---------|-------|
  | A | m² | 50 | 1-10000 |
  | U | W/(m²·K) | 500 | 50-2000 |

- **Equations:**
  - Heat Rate: `Q = U * A * LMTD`
  - LMTD: `ΔT_lm = (ΔT₁ - ΔT₂) / ln(ΔT₁ / ΔT₂)`

---

## Templates

### Beginner Level

1. **Simple Flow Loop** (10 min)
   - Basic pump, pipe, valve, return pipe
   - Learn component placement

2. **Agricultural Irrigation** (15 min)
   - Supply pump, filters, pressure reducer, zone headers
   - Agricultural applications

### Intermediate Level

3. **Cooling Water System** (20 min)
   - Cooling tower, primary/secondary pumps, heat exchanger, control valve
   - Industrial cooling

4. **HVAC Chilled Water System** (25 min)
   - Chiller, cooling tower, primary/secondary pumps, AHU
   - Commercial HVAC

5. **Temperature Controlled Process** (20 min)
   - Process heater, control valve, temperature sensor
   - Control systems

6. **Boiler Feed System** (20 min)
   - Makeup tank, transfer pump, deaerator, boiler feed pump
   - Power plant

7. **Fire Protection System** (20 min)
   - Fire pump, jockey pump, check valves, pressure tank
   - Safety systems

8. **Compressed Air System** (25 min)
   - Compressor, aftercooler, dryer, receiver tank
   - Industrial systems

### Advanced Level

9. **Water Pumping Station** (30 min)
   - Duty/standby pumps, strainers, check valves, pressure vessel
   - Municipal water supply

10. **Steam Rankine Cycle** (25 min)
    - Boiler, turbine, condenser, feedwater pump
    - Power generation

---

## Simulation

### Solver Configuration

```typescript
interface SolverConfiguration {
  method: 'newtonRaphson' | 'linsolver_lu';
  tolerance: number;        // Default: 1e-6
  maxIterations: number;    // Default: 100
  underRelaxation: number;  // Default: 0.8
}
```

### Simulation Result

```typescript
interface SimulationResult {
  id: string;
  status: 'completed' | 'failed';
  variables: Record<string, number>;
  metrics: {
    totalPowerInput: number;
    totalPowerOutput: number;
    overallEfficiency: number;
    totalFlowRate: number;
    maxPressure: number;
    pressureDrop: number;
  };
  diagnostics: {
    massBalance: { status: 'ok' | 'warning' | 'error' };
    energyBalance: { status: 'ok' | 'warning' | 'error' };
    convergence: { iterations: number; converged: boolean };
  };
}
```

---

## Running Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test -- saf.tests.ts

# Run with coverage
npm test -- --coverage
```

---

## Adding New Components

### 1. Create Component Definition

```typescript
export const NEW_COMPONENT_DEFINITION: ComponentDefinition = {
  id: 'fluid.pipe.newComponent',
  version: '1.0.0',
  domain: 'fluid',
  subcategory: 'piping',
  name: 'New Component',
  description: 'Description here',
  tags: ['tag1', 'tag2'],
  
  ports: [
    { id: 'inlet', name: 'Inlet', type: 'input', domain: 'fluid', ... },
    { id: 'outlet', name: 'Outlet', type: 'output', domain: 'fluid', ... },
  ],
  
  parameters: [
    { id: 'param1', name: 'Parameter 1', symbol: 'P1', unit: '-', ... },
  ],
  
  equations: [
    { id: 'equation1', name: 'Equation', expression: 'P1 = ...', ... },
  ],
  
  constraints: [
    { id: 'constraint1', name: 'Constraint', expression: 'P1 > 0', ... },
  ],
};
```

### 2. Create Component Class

```typescript
@registerComponent('fluid.pipe.newComponent')
export class NewComponent extends ComponentBase {
  constructor(
    definition = NEW_COMPONENT_DEFINITION,
    position?: { x: number; y: number },
    name?: string
  ) {
    super(definition, position, name);
  }
  
  public compute(context?: SystemContext): void {
    super.compute(context);
    
    const param1 = this.getParameterValueOrDefault('param1', 1) as number;
    
    // Calculate values
    const result = param1 * 2;
    
    // Store results
    this.setComputedValue('result', result);
    this.parameterValues.set('result', result);
  }
}
```

### 3. Export from Catalog

```typescript
// In components/fluid/index.ts
export const COMPONENT_CATALOG: Record<string, ComponentDefinition> = {
  'fluid.pipe.newComponent': NEW_COMPONENT_DEFINITION,
  // ... existing components
};
```

---

## Fluid Properties

| Fluid | Density (kg/m³) | Viscosity (Pa·s) | Specific Heat (J/kg·K) |
|-------|-----------------|------------------|------------------------|
| Water | 998 | 1.002e-3 | 4182 |
| Air | 1.2 | 1.81e-5 | 1005 |
| Oil | 850 | 0.1 | 2000 |

---

## References

1. **Fluid Mechanics** - Frank M. White
2. **Pump Handbook** - McGraw-Hill
3. **Valve Handbook** - Bruce W. McCr
4. **Heat Exchanger Design** - Incropera & DeWitt
5. **ASME B31.3** - Process Piping

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 2.0.0 | Jan 2026 | Initial v2 release, 10 components, 10 templates |
| 1.0.0 | Jan 2025 | Original release |

---

## License

Internal use only.

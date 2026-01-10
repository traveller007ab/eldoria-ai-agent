# SAF Lab Enhancement Plan
## Product Requirements Document & Technical Specification

---

## Executive Summary

This document outlines a comprehensive plan to enhance SAF Lab with:
1. **Multi-Fluid System Support** - Enable systems with multiple working fluids
2. **Mission System Improvements** - Enhanced scenario/education system
3. **Advanced Simulation Features** - Parametric sweeps, sensitivity analysis, optimization
4. **Performance Optimizations** - Web Workers, caching, lazy loading
5. **User Experience Improvements** - Better comparisons, tooltips, exports

---

## Part 1: Multi-Fluid System Support

### Current State
- **Single fluid per blueprint**: `blueprint.fluidId` defines one working fluid
- **Supported fluids**: water, gasoline, diesel, air, glycol, oil, r410a, steam
- **Limitation**: Each connection uses the same fluid; no heat exchangers with secondary loops

### Requirements

#### 1.1 Per-Connection Fluid Assignment
```typescript
interface FluidConnection {
    id: string;
    sourceComponentId: string;
    targetComponentId: string;
    fluidId?: string;  // NEW: Optional per-connection fluid
    type: 'fluid' | 'thermal' | 'mechanical' | 'electrical';
}
```

**Use Cases:**
- Primary loop: Water cooling engine
- Secondary loop: Oil in transmission
- Heat exchanger: Primary fluid → secondary fluid at HX boundary

#### 1.2 Heat Exchanger Multi-Fluid Support
```typescript
interface HeatExchangerComponent {
    primaryFluidId: string;
    secondaryFluidId: string;
    effectiveness: number;  // 0-1
    area: number;           // m²
    UA_value?: number;      // Override calculated value
}
```

#### 1.3 Implementation Plan

| Phase | Task | Files Modified |
|-------|------|----------------|
| 1 | Add `fluidId` to `FluidConnection` type | `types/index.ts` |
| 2 | Update `FlowNetworkSolver` to handle per-connection fluids | `FlowNetworkSolver.ts` |
| 3 | Add multi-fluid UI in component properties | `PropertiesPanel.tsx` |
| 4 | Update `FluidPropertyDatabase` for mixed fluid calculations | `FluidProperties.ts` |
| 5 | Add secondary loop templates | `data/template-library/index.ts` |

#### 1.4 Code Changes Required

**FlowNetworkSolver.ts - Node fluid assignment:**
```typescript
// Current: All nodes use blueprint.fluidId
// New: Nodes inherit fluid from connections
const getConnectionFluid = (connection: Connection): string => {
    return connection.fluidId || 
           blueprint.components.find(c => c.id === connection.sourceComponentId)?.fluidId ||
           blueprint.fluidId;
};
```

**Template: Dual-Loop Cooling System:**
```typescript
{
    id: 'dual-loop-cooling',
    name: 'Dual-Loop Cooling System',
    description: 'Engine water cooling with separate oil cooler loop.',
    components: [
        { id: 'Water_Pump', name: 'Water Pump', componentDefinitionId: 'fluid.pump.centrifugal', 
          parameterValues: { design_flow: 50, design_head: 20 } },
        { id: 'Engine', name: 'Engine', componentDefinitionId: 'mechanical.engine.parametric',
          parameterValues: { coolant_temp_target: 90 } },
        { id: 'Radiator', name: 'Radiator', componentDefinitionId: 'thermal.hx.air',
          parameterValues: { heat_rejection: 30 } },
        { id: 'Oil_Pump', name: 'Oil Pump', componentDefinitionId: 'fluid.pump.centrifugal',
          parameterValues: { design_flow: 20, design_head: 10 } },
        { id: 'Oil_Cooler', name: 'Oil Cooler', componentDefinitionId: 'thermal.hx.shell_tube',
          parameterValues: { heat_rejection: 5, primary_fluid: 'water', secondary_fluid: 'oil' } }
    ],
    connections: [
        // Water loop
        { id: 'w1', sourceComponentId: 'Water_Pump', targetComponentId: 'Engine', fluidId: 'water' },
        { id: 'w2', sourceComponentId: 'Engine', targetComponentId: 'Radiator', fluidId: 'water' },
        { id: 'w3', sourceComponentId: 'Radiator', targetComponentId: 'Water_Pump', fluidId: 'water' },
        // Oil loop through oil cooler
        { id: 'o1', sourceComponentId: 'Oil_Pump', targetComponentId: 'Engine', fluidId: 'oil' },
        { id: 'o2', sourceComponentId: 'Engine', targetComponentId: 'Oil_Cooler', fluidId: 'oil' },
        { id: 'o3', sourceComponentId: 'Oil_Cooler', targetComponentId: 'Oil_Pump', fluidId: 'oil' }
    ]
}
```

---

## Part 2: Mission System Enhancement

### Current State
- **6 Scenarios**: 2 tutorials, 4 challenges
- **Features**: Time limits, objectives, hints, success/fail states
- **Limitations**: No drag-drop editing, basic UI, limited scoring

### Requirements

#### 2.1 Enhanced Mission Editor
```typescript
interface MissionEditorState {
    mission: Mission;
    editing: {
        objectives: Objective[];
        events: MissionEvent[];
        constraints: MissionConstraint[];
    };
}

interface MissionEvent {
    id: string;
    type: 'step' | 'ramp' | 'conditional' | 'periodic';
    time: number;           // When event triggers
    targetComponentId: string;
    targetParameter: string;
    value: number;          // For step/ramp
    condition?: string;     // For conditional (e.g., "temperature > 100")
    duration?: number;      // For ramp
}
```

#### 2.2 Drag-and-Drop Timeline
- Visual timeline showing events as draggable markers
- Click to edit event parameters
- Right-click to delete, drag to reposition
- Real-time validation of constraints

#### 2.3 Scoring System Enhancement
```typescript
interface MissionScore {
    basePoints: number;           // Sum of objective points
    timeBonus: number;            // Points for early completion
    hintPenalty: number;          // Points deducted per hint used
    efficiencyBonus: number;      // Bonus for efficient solutions
    budgetBonus: number;          // Bonus for under budget
    totalScore: number;
    grade: 'S' | 'A' | 'B' | 'C' | 'D' | 'F';
}
```

#### 2.4 Implementation Plan

| Phase | Task | Files Modified |
|-------|------|----------------|
| 1 | Expand scenario registry structure | `ScenarioRegistry.ts` |
| 2 | Create Mission Editor modal | `MissionEditorModal.tsx` |
| 3 | Add Timeline component | `MissionTimeline.tsx` |
| 4 | Implement drag-and-drop | Use `dnd-kit` or `react-beautiful-dnd` |
| 5 | Enhanced HUD with scoring | `ScenarioHUD.tsx` |

#### 2.5 New Mission Templates

**Tutorial: Heat Exchanger Sizing**
```typescript
{
    id: 'tutorial-heat-exchanger',
    title: 'Tutorial: Heat Exchanger Sizing',
    description: 'Learn to size a shell-and-tube heat exchanger for a process application.',
    category: 'tutorial',
    difficulty: 'intermediate',
    objectives: [
        { id: 'duty', description: 'Achieve heat duty of 100 kW', variable: 'HeatExchanger_heat_duty', type: 'greater_than', target: 100 },
        { id: 'approach', description: 'Maintain approach temperature < 10°C', variable: 'HeatExchanger_approach_temp', type: 'less_than', target: 10 },
        { id: 'pressure', description: 'Keep pressure drop < 50 kPa', variable: 'HeatExchanger_pressure_drop', type: 'less_than', target: 50 }
    ],
    constraints: { maxCost: 5000, maxArea: 20 }
}
```

**Challenge: Hybrid Powertrain Optimization**
```typescript
{
    id: 'challenge-hybrid-powertrain',
    title: 'Challenge: Hybrid Powertrain Design',
    description: 'Design an efficient hybrid system with power split between engine and electric motor.',
    category: 'challenge',
    difficulty: 'advanced',
    timeLimitSeconds: 600,
    objectives: [
        { id: 'efficiency', description: 'Achieve system efficiency > 40%', type: 'greater_than', target: 40, variable: 'System_efficiency' },
        { id: 'range', description: 'Maintain 500 km range', type: 'greater_than', target: 500, variable: 'Vehicle_range_km' },
        { id: 'emissions', description: 'CO2 < 100 g/km', type: 'less_than', target: 100, variable: 'Total_co2_gkm' }
    ],
    constraints: { maxCost: 30000, maxWeight: 1500 }
}
```

---

## Part 3: Advanced Simulation Features

### 3.1 Parametric Sweep Service

```typescript
class ParametricSweepService {
    async runSweep(
        blueprint: MechBlueprint,
        param: string,           // Parameter to vary (e.g., 'pu

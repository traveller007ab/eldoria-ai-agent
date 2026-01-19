# SAF Lab v2.0 Prototype

**Status:** This is a standalone prototype implementation, not integrated into the main app.

## Architecture

```
mechanical-v2/
├── components/fluid/     - 10 component definitions (pumps, valves, pipes)
├── core/                 - Zustand store, ComponentBase class
├── templates/            - 10 industry templates
├── types/                - Type definitions
├── workers/              - Web Worker for simulation
└── ui/                   - React components
```

## Integration Status

The main application uses:
- `components/mech-saf-2.0/` for UI
- `stores/useMechStore.ts` for state
- `services/physics/` for simulation

This `mechanical-v2/` folder is a **prototype** demonstrating:
- Visual component editor
- Template-based blueprints
- Real-time parameter editing

## Usage

To use v2 as the main UI, you would need to:
1. Connect `core/store.ts` to the main app's routing
2. Update `components/mech-saf-2.0/MechLabLayout.tsx` to import from v2
3. Replace `stores/useMechStore.ts` with `mechanical-v2/core/store.ts`

## Components

| Component | ID | Status |
|-----------|-----|--------|
| Centrifugal Pump | `fluid.pump.centrifugal` | ✅ Working |
| Straight Pipe | `fluid.pipe.straight` | ✅ Working |
| Control Valve | `fluid.valve.control` | ✅ Working |
| Ball Valve | `fluid.valve.ball` | ✅ Working |
| Gate Valve | `fluid.valve.gate` | ✅ New |
| Globe Valve | `fluid.valve.globe` | ✅ New |
| Check Valve | `fluid.valve.check` | ✅ New |
| Elbow (90°) | `fluid.pipe.elbow` | ✅ New |
| Tee | `fluid.pipe.tee` | ✅ New |
| Shell & Tube HX | `heatTransfer.heatExchanger.shellTube` | ✅ Working |

## Templates

1. Simple Flow Loop (Beginner)
2. Cooling Water System (Intermediate)
3. Water Pumping Station (Advanced)
4. Steam Rankine Cycle (Intermediate)
5. Temperature Controlled Process (Intermediate)
6. Boiler Feed System (Intermediate)
7. HVAC Chilled Water System (Intermediate)
8. Fire Protection System (Intermediate)
9. Compressed Air System (Intermediate)
10. Agricultural Irrigation (Beginner)

## Next Steps

To fully integrate v2:
1. Update `App.tsx` to route to `MechanicalSAFLab` from v2
2. Connect v2 store to main app state
3. Add missing components from v1
4. Test simulation workflow

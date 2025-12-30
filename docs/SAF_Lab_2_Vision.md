# SAF Lab 2.0: The "Physics-First" Architecture

> "If we built this today, knowing what we know now..."

## 1. The Core Philosophy: "Physics Language Server" (L-LSP)
Currently, the SAF Lab is a **UI that sends data to Python**.
In 2.0, the Engine should be the **source of truth**.

*   **Concept**: Treat the Physical Graph like code. Just as VS Code runs a "Language Server" (TypeScript) to check errors as you type, SAF Lab 2.0 would run a **Physics Server** (WASM/Pyodide).
*   **Result**: As you drag a wire from a *Water Pump* to a *Battery*, the wire turns **RED** instantly. The interface knows: `Incompatible Domains (Fluid -> Electrical)`. No "Run Simulation" button needed for basic checks.

## 2. Technical Stack Redesign

### State Management: The "Headless" Core
*   **Current Problem**: Logic is trapped in `SAFLab.tsx` (1300+ lines). Logic and UI are coupled.
*   **Solution (Zustand + XState)**:
    *   **Zustand**: Holds the "World State" (Nodes, Edges, Simulation Results). It exists *outside* React.
    *   **XState**: Manages the "Lab Mode" (Editing -> Simulating -> Error -> Recovery). It prevents invalid states (e.g., you can't edit the graph while the simulation is converging).

### Simulation: Local-First (Pyodide)
*   **Current Problem**: HTTP calls to Python are slow and stateless.
*   **Solution**: Run the Genesis Engine **inside the browser** using WebAssembly (Pyodide).
    *   **Benefit**: Zero latency. "Real-time" sliders. You move a slider, and the pressure graph updates at 60fps.
    *   **Fallback**: Only offload to the Cloud (FastAPI) for massive compute jobs (e.g., "Train a Neural Net on this output").

### UI Architecture: The "OS" Model
Instead of a "Dashboard" (Sidebar/Header/Canvas), build a **Window Manager**.
*   **Dockable Panels**: The "Code Editor", "Plot Viewer", and "Graph" are floating windows. You can drag the "Plot Viewer" to a second monitor (using `window.open` portals).
*   **Multi-Modal Canvas**: The background isn't just a graph. It's a whiteboard. You can drop a **PDF Research Paper** right next to the **Turbine Node** it describes.

## 3. The New Workflow

1.  **Sketch Phase**: You draw a rough box on the canvas using a "Pencil" tool. You write "Reactor" inside.
2.  **Semantic Upgrade**: The AI wakes up. "Did you mean *Nuclear Reactor* or *Chemical Reactor*?" You click "Chemical".
3.  **Physics Constraints**: The box snaps into a defined Component. Input/Output ports appear based on chemical stoichiometry.
4.  **Live Wiring**: You drag a pipe. The engine suggests: "You need a Pump here to overcoming pressure head." It *auto-inserts* the pump.

## 4. Directory Structure (Clean)
```text
/pkgs
  /physics-engine (Python/WASM - Shared Logic)
  /saf-schema (TypeScript/Zod - The Contract)
/apps
  /web-lab (React Client)
  /desktop-lab (Electron/Tauri - For heavy users)
/services
  /genesis-cloud (The "Big Brain" AI)
```

## Summary
I would stop building a "Form Builder" and start building a **CAD Tool**. The user shouldn't feel like they are filling out database entries; they should feel like they are *wiring a machine*.

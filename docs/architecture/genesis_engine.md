
# Genesis Engine: System Architecture 🧬⚙️

**Status**: Active (Phase 72 Complete)
**Goal**: Automated conversion of Academic Research (Unstructured Knowledge) into Executable Simulations (Structured Physics).

---

## 1. System Topology (The Model)

This diagram represents the exact flow of data through the Genesis Protocol.

```mermaid
graph TD
    subgraph "Knowledge Layer (Academic Hub)"
        A[Research PDF/Text] -->|Drag & Drop| B[ProjectResources.tsx]
        B -->|Click 'Extract'| C{Bridge API}
    end

    subgraph "Intelligence Layer (Eldoria Bridge)"
        C -->|POST /analyze/physics| D[bridge.py]
        D -->|Prompting| E[LLM / Groq]
        E -->|Returns JSON| D
        D -->|'P_out = P_in...'| F[Equation Store (Context)]
    end

    subgraph "Physics Kernel (SymPy Engine)"
        F -->|Inject Equations| G[services/simulation.py]
        G -->|Parse String| H[SymPy Parser]
        H -->|Build System| I[Non-Linear Solver (nsolve)]
        I -->|Converged State| J[Results Matrix]
    end

    subgraph "Visualization Layer (SAF Lab)"
        J -->|JSON| K[SAFLab.tsx]
        K -->|Update| L[Live Graph & Charts]
    end

    style D fill:#0f172a,stroke:#06b6d4,stroke-width:2px
    style G fill:#0f172a,stroke:#10b981,stroke-width:2px
    style K fill:#0f172a,stroke:#a855f7,stroke-width:2px
```

---

## 2. Core Components (The Work Bench)

If you want to work on the engine, these are the critical files:

### A. The Extractor (The "Eyes")
- **File**: `services/bridge.py`
- **Function**: `analyze_physics(req)`
- **Role**: Uses LLM to strip noise from text and return pure mathematical strings.
- **Key Schema**:
  ```json
  {
    "equations": [
      { "name": "Law Name", "expression": "y = m*x + b", "vars": ["y", "m", "x", "b"] }
    ]
  }
  ```

### B. The Solver (The "Brain")
- **File**: `services/simulation.py`
- **Function**: `run_simulation(req)`
- **Role**: Uses `sympy` to solve the extracted equations.
- **Logic**:
  1.  Receives `equations` list.
  2.  Parses them into `sympy.Eq` objects.
  3.  Identifies unknowns vs constants.
  4.  Runs `nsolve` to find the numerical balance.

### C. The Interface (The "Hands")
- **File**: `academic-hub/ProjectResources.tsx`
- **Role**: Triggering the extraction.
- **File**: `components/saf/SAFLab.tsx`
- **Role**: Displaying the results and allowing users to "Run Sim".

---

## 3. Development Roadmap (Genesis)

To further evolve this model, focus on:

1.  **Equation Validation**: Ensure extracted strings are safe (sanitize input).
2.  **Unit Consistency**: Add a `pint` (Python library) layer to `simulation.py` to auto-convert units (e.g., PSI to Bar).
3.  **Multi-File Context**: Allow extracting laws from *multiple* PDFs into a single "Theory of Everything" context.

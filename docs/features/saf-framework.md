# SAF Framework

The **Strategic Analysis Framework (SAF)** is Eldoria's cognitive backbone—a meta-system engineering framework that powers every AI interaction. While invisible to users, SAF is what makes Eldoria feel "deeply intelligent."

## Philosophy

SAF is built on four foundational principles:

| Principle | Description |
|-----------|-------------|
| **Decomposition** | Every system can be broken into components |
| **Dependencies** | Every component has dependencies |
| **Propagation** | Changing a component must propagate effects system-wide |
| **Comparison** | Reconstructed systems must be comparable to originals |

## The 8-Stage Workflow

Every AI response in Eldoria silently follows this deep analysis process:

```mermaid
graph LR
    A[INGEST] --> B[DECONSTRUCT]
    B --> C[MAP]
    C --> D[BIND]
    D --> E[MODIFY]
    E --> F[RECALCULATE]
    F --> G[RECONSTRUCT]
    G --> H[COMPARE]
```

### Stage Details

| Stage | What Happens | Example |
|-------|--------------|---------|
| **1. INGEST** | Absorb query, context, history, implicit intent | "User asking about Rankine Cycle efficiency" |
| **2. DECONSTRUCT** | Break into core, subcore, and atomic components | Turbine, Condenser, Pump, Boiler |
| **3. MAP** | Identify dependencies and critical paths | Turbine output → Condenser input |
| **4. BIND** | Apply logical rules, constraints, math | Efficiency formula, thermodynamic laws |
| **5. MODIFY** | Consider how user parameters change the system | "What if turbine efficiency = 95%?" |
| **6. RECALCULATE** | Compute cascading effects | Higher turbine efficiency → higher net work output |
| **7. RECONSTRUCT** | Assemble coherent, layered response | Complete analysis with recommendations |
| **8. COMPARE** | Consider alternatives and edge cases | "On the other hand, efficiency gains may cause..." |

## Thesis Chapter Integration

SAF powers the Academic Hub's thesis generation. Each chapter uses specialized reasoning stages:

| Chapter | SAF Emphasis | Result |
|---------|--------------|--------|
| **Introduction** | INGEST → DECONSTRUCT | Clear problem framing, research gaps |
| **Literature Review** | DECONSTRUCT → MAP | Gap identification, contradiction mapping |
| **Methodology** | MAP → BIND | Justified choices, alternatives considered |
| **Results** | RECALCULATE → MODIFY | Cascading data analysis |
| **Discussion** | COMPARE → RECONSTRUCT | Alternative interpretations |
| **Conclusion** | RECONSTRUCT → COMPARE | Full synthesis, future work |

## SAF Blueprints

When you ask Eldoria to analyze or deconstruct a system, it can output a structured blueprint:

```json
<SAF_ISO>
{
  "project_name": "Rankine Cycle",
  "components": [
    { "id": "c1", "name": "Turbine", "type": "core", "dependencies": [] },
    { "id": "c2", "name": "Condenser", "type": "subcore", "dependencies": ["c1"] },
    { "id": "c3", "name": "Pump", "type": "micro", "dependencies": ["c2"] }
  ],
  "flows": [
    { "from": "c1", "to": "c2", "type": "steam_flow" },
    { "from": "c2", "to": "c3", "type": "liquid_flow" }
  ]
}
</SAF_ISO>
```

This blueprint is automatically parsed and displayed as an interactive visualization in the UI.

## Component Hierarchy

SAF organizes systems into three levels:

| Level | Color | Description |
|-------|-------|-------------|
| **Core** | Cyan | Primary purpose-defining elements |
| **Subcore** | Purple | Subsystems supporting the core |
| **Micro** | Emerald | Atomic units (variables, rules, equations) |

## Use Cases

SAF is especially powerful for:

- **Engineering Analysis** — Deconstructing mechanical, electrical, or software systems
- **Academic Research** — Structuring thesis chapters with logical rigor
- **Business Strategy** — Breaking down competitive landscapes or business models
- **Code Architecture** — Mapping dependencies in complex codebases
- **Problem Solving** — Any complex problem that benefits from structured decomposition

## Invisible Intelligence

Users never see "SAF" in the interface. Instead, they experience:

- Responses that feel more **thorough** and **layered**
- Subtle depth cues like "Considering dependencies..." or "Alternatively..."
- Thesis chapters that feel **cohesive** and **publication-ready**
- Analysis that **anticipates follow-up questions**

This is the essence of SAF: invisible intelligence that makes Eldoria feel like a trusted intellectual partner.

---

::: tip Pro Tip
To trigger explicit SAF analysis, use the **SAF System Deconstruction** prompt from the Prompt Library. This will generate a visual blueprint you can interact with.
:::

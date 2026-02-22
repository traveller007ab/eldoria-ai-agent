# SAF Lab Improvement Plan

## What We Do Now: Prioritized Roadmap

Based on the gap analysis, this document defines **what to do next** in order, plus a single **structured prompt with pseudocode** you can hand to a developer or AI to execute.

---

## Phase 1: Quick Wins (1–2 days)

| # | Item | Why first |
|---|------|-----------|
| 1 | **Ask the System – send context** | High impact, small change: include a compact system summary in the SAF Ask request so the AI can give physics-aware answers. |
| 2 | **Fix dynamic simulation cancellation** | `simulateWithCancellation` doesn’t actually cancel; add a shared “cancel” token and check it inside the kernel loop. |
| 3 | **Fix Worker progress reporting** | Kernel doesn’t call postMessage during the loop; pass an optional progress callback into the kernel and have the Worker forward it. |

---

## Phase 2: Analysis That Uses Real Physics (3–5 days)

| # | Item | Why |
|---|------|-----|
| 4 | **Sensitivity from real runs** | SensitivityAnalysisService currently uses heuristics. Change it to run `SimulationService.run()` at base, low, and high for each input and compute elasticity from actual outputs. |
| 5 | **Parametric sweep from real runs** | ParametricSweepService should run one simulation per sweep value (not affinity laws + hardcoded base). Reuse SimulationService; optional batching/limits for large sweeps. |
| 6 | **Python Monte Carlo / sensitivity** | Either (A) implement a minimal “run simulation” endpoint that accepts blueprint + parameter overrides and returns result (calling into TS logic or a shared engine), then have Monte Carlo/sensitivity call it, or (B) document/relabel as demo and add a client-side “Run Monte Carlo” that loops SimulationService. Prefer (A) if you want server-side scalability. |

---

## Phase 3: Robustness and UX (2–3 days)

| # | Item | Why |
|---|------|-----|
| 7 | **Scenario event application** | Don’t mutate the main blueprint in place. Deep-clone the blueprint (or the components being changed) before applying scenario events so replay and undo are safe. Type `ScenarioDefinition.events` properly (e.g. `ScenarioEvent[]`). |
| 8 | **Connection validation** | Implement basic validation: same domain or allowed cross-domain, required ports connected. Optionally show inline errors on the canvas (e.g. “Incompatible domain”). |

---

## Phase 4: Optional / Later

| # | Item | Status |
|---|------|--------|
| 9 | Reduce dynamic simulation cost (optional fixed-step, skip Richardson). | Done – "Fast" checkbox; useFixedStep in kernel/worker |
| 10 | Modelica / LaTeX export. | Done – LaTeX export for results; Modelica in export menu |
| 11 | “Physics Language Server” style live validation (red wire for invalid connections). | Done – Canvas red edges when validation reports issue |

---

## How to Use the Prompt Below

- The **structured prompt** in the next section is self-contained: it includes the plan, acceptance criteria, and **pseudocode** for each task.
- You can paste it into a new chat (with the repo context) and say: “Implement the items in this prompt in order; do Phase 1 first, then Phase 2.”
- Or hand it to a developer as a spec; the pseudocode is there to be turned into real code in the existing files (no need to guess behavior).

---

## Implementation status

All Phase 1–3 items from the implementation prompt are **done**:

- **Phase 1:** Ask context (frontend + bridge), cancellation (kernel + Worker), progress reporting.
- **Phase 2:** Sensitivity and parametric sweep use real `SimulationService.run`; client-side Monte Carlo uses `MonteCarloService.runMonteCarloWithSimulations`.
- **Phase 3:** Scenario runs use a cloned blueprint; `ScenarioDefinition.events` is `ScenarioEvent[]`; `ConnectionValidationService` runs before static/dynamic run.

**Done:** Cancel button for dynamic run; Phase 4 (fixed-step "Fast" mode, LaTeX export for results, live validation red edges).

---

## Next Step

Use the companion file **`SAF_LAB_IMPLEMENTATION_PROMPT.md`** as the single, well-written structured prompt with pseudocodes for implementation.

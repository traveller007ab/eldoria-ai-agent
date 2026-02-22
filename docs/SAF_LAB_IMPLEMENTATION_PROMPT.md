# SAF Lab – Structured Implementation Prompt (with Pseudocode)

Use this prompt to implement the SAF Lab improvements in order. Each section has **goal**, **acceptance criteria**, and **pseudocode**. Implement in the existing codebase (TypeScript/Python as indicated); replace pseudocode with real code and follow existing patterns (e.g. `SimulationService.run`, `useMechStore`, bridge API).

---

## Implementation status (as of check)

| Phase | Task | Status |
|-------|------|--------|
| 1 | 1.1 Ask context (frontend + bridge) | Done – `buildAskContext` in MechLabLayout, `context` in bridge request and prompt |
| 1 | 1.2 Cancellation (token, kernel, Worker) | Done – cancelToken in Kernel/Worker, `simulateWithCancellation` in service |
| 1 | 1.3 Progress (kernel callback, Worker tick) | Done – `onProgress` in Kernel, Worker posts `tick`, service forwards |
| 2 | 2.1 Sensitivity from real runs | Done – `analyzeWithSimulations` + `SimulationService.run` in SensitivityAnalysisService |
| 2 | 2.2 Parametric sweep from real runs | Done – `runSweepWithSimulations` in ParametricSweepService |
| 2 | 2.3 Client Monte Carlo | Done – `MonteCarloService.runMonteCarloWithSimulations` uses `SimulationService.run` |
| 3 | 3.1 Scenario clone + events type | Done – `workingBlueprint` in Kernel and DynamicSimulationService; `events: ScenarioEvent[]` |
| 3 | 3.2 Connection validation | Done – `ConnectionValidationService`, `validateConnections`, used before run in MechLabLayout |

**Phase 4 (done):** Fixed-step mode ("Fast" checkbox), LaTeX export for results, live validation (red edges for invalid connections). **Remaining (optional):** Further cost tuning, Modelica enhancements, inline edge tooltips for validation message.

---

## Context (for implementer)

- **Static simulation**: `SimulationService.run(blueprint, fastMode?, onProgress?)` → `MechSimulationResult` (variables, metrics, diagnostics, issues).
- **Dynamic simulation**: `DynamicSimulationService.simulate(blueprint, duration, timeStep, scenario?, onProgress?)`; in browser it uses `SimulationWorker` which runs `SimulationKernel.simulate(...)`.
- **Ask the System**: Frontend POSTs to `POST /api/saf/ask` with `{ question, component_count?, has_simulation_results? }`. Bridge uses Groq or `generate_demo_saf_response`.
- **Relevant paths**: `components/mech-saf-2.0/`, `services/physics/`, `services/bridge.py`, `services/simulation/`, `components/mech-saf-2.0/types/ScenarioTypes.ts`.

---

# PHASE 1: Quick Wins

---

## Task 1.1 – Ask the System: Send Compact System Context

**Goal:** The AI should receive a small, safe summary of the current system (e.g. component names, last result variables summary, top issues) so it can give physics-aware answers without sending the full blueprint.

**Acceptance criteria:**
- Request body to `/api/saf/ask` includes an optional `context` object (e.g. `systemSummary`, `lastResultSummary`, `topIssues`).
- Bridge uses this context in the system or user prompt when calling Groq; demo fallback remains when no API key.
- No PII or huge payloads; keep context under ~2KB of text.

**Pseudocode:**

```text
FRONTEND (AskSystemPanel or caller of onQuerySubmit):

  function buildAskContext(blueprint, lastSimulationResult):
    summary = {}
    if blueprint:
      summary.componentNames = blueprint.components.map(c => c.name).slice(0, 30)
      summary.connectionCount = blueprint.connections.length
      summary.fluidId = blueprint.fluidId ?? "water"
    if lastSimulationResult?.variables:
      vars = lastSimulationResult.variables
      summary.metrics = {
        efficiency: vars[findKeyLike(vars, "efficiency")],
        totalFlow: vars[findKeyLike(vars, "flow_rate")] or aggregateFlow(vars),
        maxPressure: vars[findKeyLike(vars, "pressure")] or maxPressure(vars)
      }
      summary.converged = lastSimulationResult.diagnostics?.convergence?.converged
    if lastSimulationResult?.issues?.length:
      summary.topIssues = lastSimulationResult.issues.slice(0, 5).map(i => i.message)
    return JSON.stringify(summary)

  When calling onQuerySubmit / fetch("/api/saf/ask"):
    body = {
      question,
      component_count: currentBlueprint?.components.length ?? 0,
      has_simulation_results: !!lastSimulationResult,
      context: buildAskContext(currentBlueprint, lastSimulationResult)
    }
```

```text
BACKEND (bridge.py – saf_ask_system):

  In saf_ask_system(request):
    context_str = getattr(request, 'context', None) or "No system context provided."
    system_prompt = existing_system_prompt + "\n\nUser's current system context (JSON summary):\n" + context_str
    # Then call Groq with system_prompt; if no key, still call generate_demo_saf_response (optionally pass context for future demo improvements).
```

Implement: add `context` to the request model; in the handler, append context to the prompt; on the frontend, build and send `context` from the same place that currently sends `question` and `component_count`.
```

---

## Task 1.2 – Dynamic Simulation: Real Cancellation

**Goal:** When the user cancels a dynamic run, the simulation actually stops within a small number of steps (e.g. one step).

**Acceptance criteria:**
- `DynamicSimulationService.simulateWithCancellation` (or equivalent) accepts or creates a cancellation token (e.g. `{ cancelled: boolean }` or `AbortSignal`).
- The token is passed into the Worker and into `SimulationKernel.simulate` (or the kernel checks a global/ref that the Worker sets when cancel is called).
- At the start of each time step (or every N steps), the kernel checks the token; if cancelled, return a result with `status: 'cancelled'` and partial `timeSeries`/`timePoints`.

**Pseudocode:**

```text
SERVICE (DynamicSimulationService.ts):

  simulateWithCancellation(blueprint, duration, timeStep, scenario?):
    cancelToken = { cancelled: false }
    promise = this.simulate(blueprint, duration, timeStep, scenario, undefined, cancelToken)
    return {
      result: await promise,
      cancel: () => { cancelToken.cancelled = true }
    }

  simulate(..., onProgress?, cancelToken?):
    if (in browser with Worker):
      worker.postMessage({ ..., cancelToken })  // or send a unique id and store cancelToken in a Map by id
      // Worker must receive cancel message and set token or call kernel with token
    else:
      SimulationKernel.simulate(..., cancelToken)
```

```text
WORKER (SimulationWorker.ts):

  onmessage = async (e):
    if e.data.type === 'simulate':
      cancelToken = e.data.payload.cancelToken ?? {}
      result = await SimulationKernel.simulate(..., cancelToken)
      postMessage({ type: 'success', payload: result })
    if e.data.type === 'cancel':
      if (cancelTokenById[e.data.id]) cancelTokenById[e.data.id].cancelled = true
```

```text
KERNEL (SimulationKernel.ts – simulateAdaptive):

  simulateAdaptive(blueprint, duration, scenario?, config?, stiffConfig?, cancelToken?):
    ...
    while t < duration:
      if cancelToken?.cancelled:
        return compileResults(..., status: 'cancelled', partial: true)
      // existing: apply scenario events, mapStateToParameters, stepSimulation, etc.
```

Implement: add optional `cancelToken` parameter to `simulate` and `simulateAdaptive`; in the adaptive loop, check `cancelToken?.cancelled` and return early with a cancelled result. For Worker, either pass a serializable token (e.g. ref by id) or support a separate `cancel` message that sets a stored token so the kernel (running inside the Worker) can see it. Ensure `SimulationWorker` receives and forwards cancel (e.g. store cancelToken in Worker scope when starting, and on `cancel` message set it to cancelled).
```

---

## Task 1.3 – Dynamic Simulation: Progress Reporting from Kernel

**Goal:** During a long dynamic run, the UI receives progress updates (e.g. percent and current time) so the user sees “Simulating… 45% (t=27s)”.

**Acceptance criteria:**
- `SimulationKernel.simulate` / `simulateAdaptive` accept an optional `onProgress?(percent, currentTime)` callback.
- When running in the Worker, the Worker passes a callback that posts a message to the main thread; `DynamicSimulationService` maps that to the caller’s `onProgress`.
- Progress is reported at least every few seconds or every N steps (e.g. every 10 steps or when percent increases by ≥5%).

**Pseudocode:**

```text
KERNEL (SimulationKernel.ts):

  simulateAdaptive(..., onProgress?: (percent: number, currentTime: number) => void):
    totalStepsEstimate = duration / initialStep
    stepCount = 0
    while t < duration:
      ...
      stepCount++
      if onProgress and (stepCount % 10 === 0 or ...):
        onProgress((t / duration) * 100, t)
```

```text
WORKER (SimulationWorker.ts):

  When starting simulation:
    onProgress = (percent, currentTime) => {
      self.postMessage({ id, type: 'tick', progress: percent, currentTime })
    }
    result = await SimulationKernel.simulate(blueprint, duration, timeStep, scenario, onProgress, cancelToken)
```

```text
SERVICE (DynamicSimulationService.ts – simulateInWorker):

  worker.onmessage = (e):
    if e.data.type === 'tick':
      onProgress?.(e.data.progress, e.data.currentTime)
    if e.data.type === 'success': ...
```

Implement: add `onProgress` to `SimulationKernel.simulate` and `simulateAdaptive`; call it periodically inside the loop. In the Worker, create a callback that postMessages with type `'tick'` and pass it into the kernel. In DynamicSimulationService, when receiving `tick`, call the user’s `onProgress`. Remove or adjust any existing monkey-patch of postMessage so progress comes from the kernel.
```

---

# PHASE 2: Analysis Using Real Physics

---

## Task 2.1 – Sensitivity Analysis from Real Simulations

**Goal:** Sensitivity analysis should run the real static simulation at base, low, and high values for each selected input parameter and compute elasticity (and tornado data) from actual outputs.

**Acceptance criteria:**
- User selects input parameters (component + parameter, base value, ±perturbation) and output metrics (e.g. efficiency, total flow).
- For each input: run simulation at base, at base*(1−perturbation), at base*(1+perturbation); read selected output metrics from each result; compute elasticity = (Δoutput/output) / (Δinput/input); build tornado and “most sensitive” from these.
- Cap total runs (e.g. max 3 * N_inputs) and optionally show progress (e.g. “Running sensitivity 2/3…”).

**Pseudocode:**

```text
SensitivityAnalysisService (TypeScript):

  async analyzeWithSimulations(
    inputs: SensitivityInput[],
    outputMetrics: { key: string; label: string }[],
    simulationRunner: (blueprint: MechBlueprint) => Promise<MechSimulationResult>,
    onProgress?: (current: number, total: number) => void
  ): Promise<SensitivityResult> {

    baseBlueprint = cloneBlueprint(this.blueprint)
    baseResult = await simulationRunner(baseBlueprint)
    baseValues = getMetricsFromResult(baseResult, outputMetrics)

    outputs = []
    tornadoData = []
    totalRuns = inputs.length * 3  // base already done; for each input: low, high
    runIndex = 0

    for (input of inputs):
      paramPath = resolveParameter(input.parameter)  // e.g. componentId.parameterValues[paramName]
      baseVal = getParam(baseBlueprint, paramPath)

      lowBlueprint = cloneBlueprint(baseBlueprint)
      setParam(lowBlueprint, paramPath, baseVal * (1 - input.perturbation))
      highBlueprint = cloneBlueprint(baseBlueprint)
      setParam(highBlueprint, paramPath, baseVal * (1 + input.perturbation))

      lowResult = await simulationRunner(lowBlueprint)
      highResult = await simulationRunner(highBlueprint)
      onProgress?.(runIndex += 2, totalRuns)

      for (metric of outputMetrics):
        key = metric.key
        baseM = baseValues[key]
        lowM = getMetricFromResult(lowResult, key)
        highM = getMetricFromResult(highResult, key)
        deltaIn = baseVal * input.perturbation * 2
        deltaOut = (highM - lowM) / 2
        elasticity = (deltaOut / baseM) / (deltaIn / baseVal) if baseVal and baseM
        outputs.push({ metric: key, label: metric.label, baseValue: baseM, elasticity, lowValue: lowM, highValue: highM, changePercent: ... })
        tornadoData.push({ parameter: input.label, impact: abs(elasticity) * input.perturbation * 100, direction: elasticity >= 0 ? 'positive' : 'negative' })
    end for

    sort tornadoData by impact desc
    mostSensitive = first(outputs sorted by |elasticity| desc)
    return { inputs, outputs, tornadoData, mostSensitive: { parameter: mostSensitive.label, elasticity: mostSensitive.elasticity, affectedMetrics: [mostSensitive.metric] } }
  }
```

Implementation notes:
- `simulationRunner` can be `(bp) => SimulationService.run(bp, true)` so it’s testable and uses real physics.
- Add a helper to clone blueprint (e.g. `JSON.parse(JSON.stringify(blueprint))` or a small `cloneBlueprint` in a shared util).
- Resolve `input.parameter` to a component id and param name (e.g. `"pump_1.design_flow"` or structured `{ componentId, paramName }`). getParam/setParam work on the cloned blueprint.
- `getMetricFromResult(result, key)`: map `key` to actual result keys (e.g. `efficiency` → result.metrics.overallEfficiency or result.variables[something]; document the mapping). Keep existing `analyze()` as a fallback or rename to `analyzeTheoretical()` and call `analyzeWithSimulations` from the UI when “Run real sensitivity” is chosen.
```

---

## Task 2.2 – Parametric Sweep from Real Simulations

**Goal:** Parametric sweep runs one simulation per sweep value and records real metrics (flow, head, power, efficiency, etc.) instead of using affinity laws and a hardcoded base.

**Acceptance criteria:**
- User selects a parameter (e.g. pump speed), a list of values (or min/max/step), and optionally which outputs to collect.
- For each value: set parameter on a clone of the blueprint, run `SimulationService.run(clone)`, collect chosen metrics from the result. Return sweep results and optionally “best efficiency” point and a simple pump curve (flow vs head) if applicable.

**Pseudocode:**

```text
ParametricSweepService (TypeScript):

  async runSweepWithSimulations(
    config: ParametricSweepConfig,
    simulationRunner: (blueprint: MechBlueprint) => Promise<MechSimulationResult>,
    onProgress?: (current: number, total: number) => void
  ): Promise<ParametricSweepResult> {

    results = []
    for (i = 0; i < config.values.length; i++):
      blueprint = cloneBlueprint(this.blueprint)
      setParam(blueprint, config.parameter, config.values[i])
      result = await simulationRunner(blueprint)
      onProgress?.(i + 1, config.values.length)
      results.push({
        parameterValue: config.values[i],
        flow: getFlowFromResult(result),
        head: getHeadFromResult(result),
        power: getPowerFromResult(result),
        efficiency: getEfficiencyFromResult(result),
        npshAvailable: getNpshFromResult(result),
        ...
        status: result.status === 'completed' ? 'ok' : 'error',
        warnings: result.issues?.map(i => i.message) ?? []
      })
    end for

    bestEfficiency = results.filter(r => r.status === 'ok').maxBy(r => r.efficiency)
    pumpCurve = results.map(r => ({ flow: r.flow, head: r.head }))
    return { config, results, bestEfficiencyPoint: bestEfficiency, pumpCurve }
  }
```

- `config.parameter` must resolve to a component and param (same idea as sensitivity). Implement getFlowFromResult / getHeadFromResult etc. by reading from `result.variables` or `result.metrics` using known keys (e.g. from flow solver output). Keep or deprecate the old affinity-law implementation.
```

---

## Task 2.3 – Backend Monte Carlo / Sensitivity (Optional)

**Goal:** Either make backend endpoints use real physics, or clearly mark them as demo and add a client-side “Run Monte Carlo” that uses real simulations.

**Option A – Server runs real simulation (bigger change):**
- Add a minimal endpoint, e.g. `POST /simulation/run`, that accepts `{ blueprint, overrides?: { [paramPath]: value } }`, applies overrides to the blueprint, runs the same physics as the client (requires a Node/TS runner or Python reimplementation of the solvers), returns `{ variables, metrics, diagnostics }`.
- Then `/simulation/monte-carlo` and `/simulation/sensitivity` call this endpoint in a loop (with parameter samples or ±perturbation) and aggregate results. Use a queue or batch size to avoid timeouts.

**Option B – Client-side Monte Carlo (recommended for now):**
- Keep Python Monte Carlo/sensitivity as “demo” (or remove). In the UI, add “Run Monte Carlo” that:
  - Collects parameter definitions (which params, nominal, distribution, samples).
  - For each sample: clone blueprint, set params from sample, run `SimulationService.run(blueprint)` in the client, collect chosen outputs.
  - Aggregate (mean, std, percentiles) and display. Optionally limit samples (e.g. 100) and show progress.

**Pseudocode (Option B – client):**

```text
MonteCarloService (new or in services/simulation/):

  async run(
    blueprint: MechBlueprint,
    config: { parameters: ParamDef[], outputs: string[], samples: number },
    onProgress?: (current: number, total: number) => void
  ): Promise<MonteCarloResult>:

    samples = generateSamples(config.parameters, config.samples)
    outputSeries = { [key]: [] for key in config.outputs }

    for (i = 0; i < config.samples; i++):
      bp = cloneBlueprint(blueprint)
      for (p of config.parameters):
        setParam(bp, p.path, samples[i][p.id])
      result = await SimulationService.run(bp, true)
      for (key of config.outputs):
        outputSeries[key].push(getMetricFromResult(result, key))
      onProgress?.(i + 1, config.samples)
    end for

    return {
      outputs: config.outputs.map(key => ({
        mean: mean(outputSeries[key]),
        stdDev: std(outputSeries[key]),
        percentile5: percentile(outputSeries[key], 5),
        ...
      }))
    }
```

Implement Option B in the client first; document that Python endpoints are demo. Option A can be a later phase when you have a server-side runner.
```

---

# PHASE 3: Robustness and UX

---

## Task 3.1 – Scenario Events Without Mutating Main Blueprint

**Goal:** Applying scenario events during dynamic simulation must not mutate the user’s main blueprint so that replay and undo behave correctly.

**Acceptance criteria:**
- At the start of dynamic simulation, the kernel (or the caller) works on a deep clone of the blueprint for the entire run.
- Scenario events are applied only to this clone. The store’s `currentBlueprint` is never modified by the simulation.
- Type `ScenarioDefinition.events` as `ScenarioEvent[]` with proper fields (time, type, targetComponentId, targetParameter, value, duration?).

**Pseudocode:**

```text
DynamicSimulationService or SimulationKernel.simulate:

  simulate(blueprint, duration, timeStep, scenario?, ...):
    workingBlueprint = deepClone(blueprint)
    // Pass workingBlueprint to SimulationKernel.simulateAdaptive
    return SimulationKernel.simulateAdaptive(workingBlueprint, duration, scenario, ...)
```

```text
SimulationKernel.applyScenarioEvents(scenario, blueprint, time):
  // blueprint here is the working clone
  for event in scenario.events:
    if time >= event.time and event.targetComponentId and event.targetParameter:
      comp = blueprint.components.find(c => c.id === event.targetComponentId)
      if comp:
        if event.type === 'step': comp.parameterValues[event.targetParameter] = event.value
        if event.type === 'ramp' and event.duration:
          elapsed = time - event.time
          if elapsed <= event.duration:
            comp.parameterValues[event.targetParameter] = event.value * (elapsed / event.duration)
          else:
            comp.parameterValues[event.targetParameter] = event.value
```

- Add `deepClone` (e.g. `JSON.parse(JSON.stringify(blueprint))` or a small recursive clone that preserves Date/undefined where needed). In ScenarioTypes.ts, set `events: ScenarioEvent[]` and ensure all event objects have the required fields.
```

---

## Task 3.2 – Basic Connection Validation

**Goal:** Before running simulation (or on connection add), validate that connections are allowed (e.g. same domain or allowed cross-domain) and that required ports are connected. Surface errors in the UI (e.g. Diagnostics or inline on the canvas).

**Acceptance criteria:**
- A function `validateConnections(blueprint): ValidationIssue[]` returns a list of issues (e.g. “Fluid port connected to electrical”, “Pump_1 outlet unconnected”).
- This is called when a connection is added/removed or before run; issues are stored or passed to the diagnostics/Issues panel.
- Component definitions (or a small compatibility matrix) define allowed port types / domains per connection.

**Pseudocode:**

```text
ConnectionValidationService (new) or inside existing validation:

  function validateConnections(blueprint: MechBlueprint): ValidationIssue[]:
    issues = []
    compDefs = ComponentRegistry.getInstance()

    for conn in blueprint.connections:
      sourceComp = blueprint.components.find(c => c.id === conn.sourceComponentId)
      targetComp = blueprint.components.find(c => c.id === conn.targetComponentId)
      sourceDef = compDefs.getComponent(sourceComp?.componentDefinitionId)
      targetDef = compDefs.getComponent(targetComp?.componentDefinitionId)

      if not sourceComp or not targetComp: issues.push({ type: 'missing_component', connectionId: conn.id })
      if sourceDef and targetDef:
        sourceDomain = sourceDef.domain
        targetDomain = targetDef.domain
        allowed = getAllowedConnectionDomains(conn.type)  // e.g. fluid-fluid, signal-mechanical
        if (sourceDomain, targetDomain) not in allowed:
          issues.push({ type: 'incompatible_domain', sourceDomain, targetDomain, connectionId: conn.id })
    end for

    for comp in blueprint.components:
      def = compDefs.getComponent(comp.componentDefinitionId)
      if def and def.requiredOutputs:
        for port in def.requiredOutputs:
          if not blueprint.connections.some(c => c.sourceComponentId === comp.id and c.sourcePort === port):
            issues.push({ type: 'required_port_disconnected', componentId: comp.id, port })
    end for

    return issues
```

- Implement `getAllowedConnectionDomains(conn.type)` from a small matrix (e.g. fluid ↔ fluid, mechanical ↔ mechanical, signal → control). Add `requiredOutputs` to component definitions if not present, or skip that part initially. Call `validateConnections` from the store when connections change and/or from MechLabLayout before run; append to `lastSimulationResult.issues` or show in a “Validation” section in Diagnostics.
```

---

# Implementation Order and Checklist

1. **Phase 1**
   - [ ] 1.1 Ask context (frontend + bridge)
   - [ ] 1.2 Cancellation (token, kernel, Worker)
   - [ ] 1.3 Progress (kernel callback, Worker postMessage, service)
2. **Phase 2**
   - [ ] 2.1 Sensitivity with real runs
   - [ ] 2.2 Parametric sweep with real runs
   - [ ] 2.3 Client-side Monte Carlo (Option B) and/or document Python as demo
3. **Phase 3**
   - [ ] 3.1 Scenario clone + typing
   - [ ] 3.2 Connection validation + UI

Use this document as the single source of truth for the implementation; adapt pseudocode to your exact types and file paths as you code.

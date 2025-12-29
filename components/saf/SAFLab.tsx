import React, { useState, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DeepSAFBlueprint, SAFWorkbenchState, DeepSAFComponent } from './types';
import { SAFNodeGraph } from './SAFNodeGraph';
import { SAFGraphErrorBoundary } from './SAFGraphErrorBoundary';
import { SAFParameterEditor } from './SAFParameterEditor';
import { SAFAIExplainer } from './SAFAIExplainer';
import { SAFBreadcrumbs } from './SAFBreadcrumbs';
import { SAFOutputPanel } from './SAFOutputPanel';
import { ScenarioComparisonPanel } from './ScenarioComparisonPanel';
import { PhysicsToComponentWizard } from './PhysicsToComponentWizard';
import { calculateRankineOutputs, propagateEffects } from './engine';
import { bridgeClient } from '../../services/bridgeClient';
import { validateBlueprint } from './validator';
import { FlaskConical, Settings, Download, Share2, Save, RotateCcw, Play, Maximize2, Minimize2, ZoomIn, ZoomOut, MoreHorizontal, Plus, FileJson, Upload, Library, X, ChevronRight, ChevronDown, Wand2, Info, Loader2, Search, Filter, ArrowLeft, Pin, PinOff, FileText, Zap, BookOpen, PanelBottom } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { PromptLibraryPanel } from '../modals/PromptLibraryPanel';
import { runGroqGenerate } from '../../services/groqService';
import { PromptSchema } from '../../prompt_schemas';

/**
 * SAF Lab - Interactive System Engineering Workbench
 * Recursive decomposition, live parameter editing, cascading effects
 */
export const SAFLab: React.FC = () => {
    const navigate = useNavigate();
    const { activeCanvas } = useWorkspace();

    const [workbenchState, setWorkbenchState] = useState<SAFWorkbenchState>({
        activeBlueprint: null,
        selectedNodeId: null,
        expandedNodes: [],
        breadcrumbs: [],
        isCalculating: false,
        lastEffects: null,
    });

    // UI state for panels
    const [showOutputPanel, setShowOutputPanel] = useState(false);
    const [outputPanelExpanded, setOutputPanelExpanded] = useState(false);
    const [aiExplainerExpanded, setAiExplainerExpanded] = useState(false);
    const [aiExplainerPinned, setAiExplainerPinned] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [showPromptLibrary, setShowPromptLibrary] = useState(false);
    const [importValue, setImportValue] = useState('');
    const [importError, setImportError] = useState<string | null>(null);
    const [isExecutingLibraryPrompt, setIsExecutingLibraryPrompt] = useState(false);
    const [showScenarioComparison, setShowScenarioComparison] = useState(false);
    const [selectedScenariosForComparison, setSelectedScenariosForComparison] = useState<string[]>([]);

    // Load blueprint from active canvas if available
    const canvasBlueprint = activeCanvas?.saf_blueprint as DeepSAFBlueprint | undefined;

    const handleLoadFromCanvas = () => {
        if (canvasBlueprint) {
            setWorkbenchState(prev => ({
                ...prev,
                activeBlueprint: {
                    ...canvasBlueprint,
                    version: canvasBlueprint.version || '1.0',
                    domain: canvasBlueprint.domain || 'custom',
                },
            }));
        }
    };

    const handleNewBlueprint = () => {
        const newBlueprint: DeepSAFBlueprint = {
            project_name: 'New System',
            version: '1.0',
            domain: 'custom',
            components: [],
            flows: [],
            created_at: new Date().toISOString(),
        };
        setWorkbenchState(prev => ({
            ...prev,
            activeBlueprint: newBlueprint,
        }));
    };

    const handleLoadRankineStarter = () => {
        const rankineBlueprint: DeepSAFBlueprint = {
            project_name: 'Rankine Cycle Power Plant',
            version: '1.0',
            domain: 'mechanical',
            components: [
                {
                    id: 'boiler',
                    name: 'Boiler',
                    type: 'core',
                    dependencies: [],
                    parameters: [
                        { name: 'Heat Input', value: 1000, unit: 'kW' },
                        { name: 'Steam Temp', value: 500, unit: '°C' },
                        { name: 'Pressure', value: 10, unit: 'MPa' },
                    ],
                    outputs: [
                        { name: 'Steam Mass Flow', value: 2.5, unit: 'kg/s', formula: 'heat_input / enthalpy_diff' },
                    ],
                    position: { x: 100, y: 200 },
                },
                {
                    id: 'turbine',
                    name: 'Turbine',
                    type: 'core',
                    dependencies: ['boiler'],
                    parameters: [
                        { name: 'Isentropic Efficiency', value: 85, unit: '%', min: 0, max: 100 },
                        { name: 'Inlet Pressure', value: 10, unit: 'MPa' },
                    ],
                    outputs: [
                        { name: 'Power Output', value: 850, unit: 'kW', formula: 'mass_flow * enthalpy_drop * efficiency' },
                        { name: 'Outlet Temp', value: 150, unit: '°C', formula: 'calculated' },
                    ],
                    position: { x: 350, y: 200 },
                },
                {
                    id: 'condenser',
                    name: 'Condenser',
                    type: 'subcore',
                    dependencies: ['turbine'],
                    parameters: [
                        { name: 'Cooling Water Temp', value: 25, unit: '°C' },
                        { name: 'Heat Rejection', value: 600, unit: 'kW' },
                    ],
                    outputs: [
                        { name: 'Outlet Quality', value: 0, unit: 'x', formula: 'saturated_liquid' },
                    ],
                    position: { x: 600, y: 200 },
                },
                {
                    id: 'pump',
                    name: 'Pump',
                    type: 'micro',
                    dependencies: ['condenser'],
                    parameters: [
                        { name: 'Pump Efficiency', value: 75, unit: '%', min: 0, max: 100 },
                        { name: 'Outlet Pressure', value: 10, unit: 'MPa' },
                    ],
                    outputs: [
                        { name: 'Work Input', value: 25, unit: 'kW', formula: 'mass_flow * pressure_diff / efficiency' },
                    ],
                    position: { x: 850, y: 200 },
                },
            ],
            flows: [
                { id: 'f1', from: 'boiler', to: 'turbine', type: 'energy', parameter: 'steam' },
                { id: 'f2', from: 'turbine', to: 'condenser', type: 'energy', parameter: 'exhaust_steam' },
                { id: 'f3', from: 'condenser', to: 'pump', type: 'material', parameter: 'liquid_water' },
                { id: 'f4', from: 'pump', to: 'boiler', type: 'material', parameter: 'pressurized_water' },
            ],
            created_at: new Date().toISOString(),
        };

        setWorkbenchState(prev => ({
            ...prev,
            activeBlueprint: rankineBlueprint,
        }));
    };

    const handleImportSubmit = () => {
        try {
            setImportError(null);
            const rawValue = importValue.trim();
            let jsonToParse = rawValue;

            // Strip <SAF_ISO> tags if present
            if (rawValue.includes('<SAF_ISO>')) {
                const match = rawValue.match(/<SAF_ISO>([\s\S]*?)<\/SAF_ISO>/);
                if (match) jsonToParse = match[1].trim();
            }

            const parsed = JSON.parse(jsonToParse);

            // Strict Validation
            const validatedBlueprint = validateBlueprint(parsed);

            setWorkbenchState(prev => ({
                ...prev,
                activeBlueprint: validatedBlueprint,
            }));
            setShowImportModal(false);
            setImportValue('');
        } catch (err: any) {
            setImportError(err.message);
        }
    };

    const handleSimulate = async () => {
        if (!workbenchState.activeBlueprint) return;

        try {
            // Show loading state (reuse existing or add specific one)
            setIsExecutingLibraryPrompt(true); // Using existing loader for now

            // Format request for Python Bridge
            const payload = {
                project_name: workbenchState.activeBlueprint.project_name,
                components: workbenchState.activeBlueprint.components.map(c => ({
                    id: c.id,
                    type: c.type || "generic",
                    label: c.name,
                    parameters: c.parameters?.reduce((acc: any, p) => {
                        acc[p.name] = p.value;
                        return acc;
                    }, {}) || {},
                    equations: c.equations || []
                })),
                connections: workbenchState.activeBlueprint.flows.map(f => ({
                    id: f.id,
                    source: f.from,
                    target: f.to,
                    type: f.type
                })),
                solver_config: { method: "hybr", tolerance: 1e-6 }
            };

            // Use Unified Bridge Client (Supports Remote/Local switching)
            const result = await bridgeClient.genesisSimulate(payload);

            if (result.success) {
                console.log("SIMULATION RESULTS:", result.system_vars);
                setWorkbenchState(prev => {
                    if (!prev.activeBlueprint) return prev;
                    return {
                        ...prev,
                        activeBlueprint: {
                            ...prev.activeBlueprint,
                            last_simulation: {
                                timestamp: new Date().toISOString(),
                                system_vars: result.system_vars || {},
                                logs: result.logs || []
                            },
                            updated_at: new Date().toISOString(),
                        }
                    };
                });
            } else {
                alert(`Simulation Diverged.\nError: ${result.error}\nLogs: ${result.logs.join('\n')}`);
            }

        } catch (e: any) {
            console.error("Simulation Error:", e);
            alert(`Simulation Error: ${e.message}. Is the Python Bridge running?`);
        } finally {
            setIsExecutingLibraryPrompt(false);
        }
    };

    // Very simple sweep: uses the first numeric parameter of the first component
    const handleQuickSweep = async () => {
        const blueprint = workbenchState.activeBlueprint;
        if (!blueprint || blueprint.components.length === 0) return;
        const comp = blueprint.components[0];
        const param = (comp.parameters || []).find(p => typeof p.value === 'number');
        if (!param) {
            alert('No numeric parameters found for sweep.');
            return;
        }
        const base = param.value as number;
        const min = base * 0.5;
        const max = base * 1.5;
        const steps = 5;
        const stepSize = (max - min) / (steps - 1);

        setIsExecutingLibraryPrompt(true);
        const points: { value: number; system_vars: Record<string, number> }[] = [];

        try {
            for (let i = 0; i < steps; i++) {
                const value = min + stepSize * i;
                // Clone components and apply swept value
                const sweptComponents = blueprint.components.map(c => {
                    if (c.id !== comp.id) return c;
                    const newParams = (c.parameters || []).map(p =>
                        p.name === param.name ? { ...p, value } : p
                    );
                    return { ...c, parameters: newParams };
                });

                const payload = {
                    project_name: `${blueprint.project_name} [Sweep]`,
                    components: sweptComponents.map(c => ({
                        id: c.id,
                        type: c.type || 'generic',
                        label: c.name,
                        parameters: c.parameters?.reduce((acc: any, p) => {
                            acc[p.name] = p.value;
                            return acc;
                        }, {}) || {},
                        equations: c.equations || [],
                    })),
                    connections: blueprint.flows.map(f => ({
                        id: f.id,
                        source: f.from,
                        target: f.to,
                        type: f.type,
                    })),
                    solver_config: { method: 'hybr', tolerance: 1e-6 },
                };

                const result = await bridgeClient.genesisSimulate(payload);
                if (result.success) {
                    points.push({
                        value,
                        system_vars: result.system_vars || {},
                    });
                }
            }

            setWorkbenchState(prev => {
                if (!prev.activeBlueprint) return prev;
                const sweeps = prev.activeBlueprint.sweeps || [];
                return {
                    ...prev,
                    activeBlueprint: {
                        ...prev.activeBlueprint,
                        sweeps: [
                            ...sweeps,
                            {
                                parameterPath: `${comp.id}.${param.name}`,
                                min,
                                max,
                                steps,
                                points,
                                timestamp: new Date().toISOString(),
                            },
                        ],
                        updated_at: new Date().toISOString(),
                    },
                };
            });
        } catch (e: any) {
            console.error('Sweep Error:', e);
            alert(`Sweep Error: ${e.message}`);
        } finally {
            setIsExecutingLibraryPrompt(false);
        }
    };

    const handlePromptExecute = async (composedPrompt: string, schema: PromptSchema) => {
        try {
            setIsExecutingLibraryPrompt(true);
            setShowPromptLibrary(false);

            const systemPrompt = `You are Eldoria's SAF Engineering Engine. 
            Analyze the user's request and deconstruct it into a Strategic Analysis Framework (SAF) blueprint.
            
            CRITICAL: Your output MUST conclude with a valid <SAF_ISO> JSON block following this schema:
            {
                "project_name": "Name of the system",
                "domain": "mechanical" | "governance" | "ai_agents" | "creative" | "custom",
                "components": [
                    { "id": "uuid", "name": "Name", "type": "core"|"subcore"|"micro", "parameters": [{ "name": "N", "value": 100, "unit": "kg" }], "outputs": [], "position": { "x": 0, "y": 0 } }
                ],
                "flows": [
                    { "id": "f1", "from": "id1", "to": "id2", "type": "energy"|"material"|"control"|"data" }
                ]
            }
            
            The user is running the prompt: "${schema.name}"
            Full Parameters: ${composedPrompt}`;

            const response = await runGroqGenerate([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: 'Deconstruct the system and provide the <SAF_ISO> blueprint.' }
            ]);

            const content = response.choices?.[0]?.message?.content || '';
            if (content.includes('<SAF_ISO>')) {
                const match = content.match(/<SAF_ISO>([\s\S]*?)<\/SAF_ISO>/);
                if (match) {
                    const parsed = JSON.parse(match[1].trim());
                    setWorkbenchState(prev => ({
                        ...prev,
                        activeBlueprint: {
                            ...parsed,
                            version: '1.0',
                            created_at: new Date().toISOString()
                        }
                    }));
                }
            } else {
                alert("The AI generated an explanation but didn't provide a loadable SAF Blueprint. Try again or refine the prompt.");
            }
        } catch (err: any) {
            console.error('Prompt Execution Error:', err);
            alert(`Failed to execute prompt: ${err.message}`);
        } finally {
            setIsExecutingLibraryPrompt(false);
        }
    };

    // Real-time parameter change handler - updates blueprint state and recalculates outputs
    const handleParameterChange = useCallback((componentId: string, paramName: string, newValue: number | string) => {
        setWorkbenchState(prev => {
            if (!prev.activeBlueprint) return prev;

            // First, update the parameter value
            const updatedComponents = prev.activeBlueprint.components.map(comp => {
                if (comp.id !== componentId) return comp;

                const updatedParams = comp.parameters?.map(param => {
                    if (param.name !== paramName) return param;
                    return { ...param, value: newValue };
                });

                return { ...comp, parameters: updatedParams };
            });

            // Create updated blueprint with new parameter
            let updatedBlueprint: DeepSAFBlueprint = {
                ...prev.activeBlueprint,
                components: updatedComponents,
                updated_at: new Date().toISOString(),
            };

            // First, run universal effect propagation (formula-based)
            const { updatedBlueprint: propagationResult } = propagateEffects(
                updatedBlueprint,
                componentId,
                paramName,
                null,
                newValue
            );
            updatedBlueprint = propagationResult;

            // For Rankine Cycle, run specialized calculations on top
            if (prev.activeBlueprint.domain === 'mechanical') {
                updatedBlueprint = calculateRankineOutputs(updatedBlueprint);
            }

            return {
                ...prev,
                activeBlueprint: updatedBlueprint,
                isCalculating: false,
            };
        });
    }, []);

    // Update equations for a component (used by SAFParameterEditor)
    const handleEquationsChange = useCallback((componentId: string, equations: string[]) => {
        setWorkbenchState(prev => {
            if (!prev.activeBlueprint) return prev;

            const updatedComponents = prev.activeBlueprint.components.map(comp => {
                if (comp.id !== componentId) return comp;
                return { ...comp, equations };
            });

            return {
                ...prev,
                activeBlueprint: {
                    ...prev.activeBlueprint,
                    components: updatedComponents,
                    updated_at: new Date().toISOString(),
                }
            };
        });
    }, []);

    // Save current configuration as a scenario
    const handleSaveScenario = useCallback(() => {
        const name = window.prompt('Scenario name?');
        if (!name) return;
        setWorkbenchState(prev => {
            if (!prev.activeBlueprint) return prev;
            const existing = prev.activeBlueprint.scenarios || [];
            const snapshot = {
                id: crypto.randomUUID(),
                name,
                components: prev.activeBlueprint.components,
                flows: prev.activeBlueprint.flows,
            };
            return {
                ...prev,
                activeBlueprint: {
                    ...prev.activeBlueprint,
                    scenarios: [...existing, snapshot],
                    updated_at: new Date().toISOString(),
                },
            };
        });
    }, []);

    // Apply a saved scenario
    const handleLoadScenario = useCallback((scenarioId: string) => {
        setWorkbenchState(prev => {
            if (!prev.activeBlueprint || !prev.activeBlueprint.scenarios) return prev;
            const scenario = prev.activeBlueprint.scenarios.find(s => s.id === scenarioId);
            if (!scenario) return prev;
            return {
                ...prev,
                activeBlueprint: {
                    ...prev.activeBlueprint,
                    components: scenario.components,
                    flows: scenario.flows,
                    updated_at: new Date().toISOString(),
                },
            };
        });
    }, []);

    // Handle adding components from physics wizard
    const handleAddComponents = useCallback((components: DeepSAFComponent[]) => {
        setWorkbenchState(prev => {
            if (!prev.activeBlueprint) return prev;
            return {
                ...prev,
                activeBlueprint: {
                    ...prev.activeBlueprint,
                    components: [...prev.activeBlueprint.components, ...components],
                    updated_at: new Date().toISOString(),
                },
            };
        });
    }, []);

    // Get currently selected component
    const selectedComponent = workbenchState.activeBlueprint?.components.find(
        c => c.id === workbenchState.selectedNodeId
    );

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] overflow-hidden">
            {/* Header */}
            <div className="shrink-0 h-14 flex items-center justify-between px-6 border-b border-cyan-900/30 bg-black/40">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/')}
                        className="p-2 rounded-lg hover:bg-cyan-500/10 transition-colors"
                        title="Back to Workspace"
                    >
                        <ArrowLeft className="w-5 h-5 text-cyan-400" />
                    </button>
                    <div className="flex items-center gap-3">
                        <FlaskConical className="w-6 h-6 text-cyan-400" />
                        <h1 className="text-xl font-bold text-white tracking-wide">
                            SAF Lab
                            {workbenchState.activeBlueprint && (
                                <span className="ml-3 text-cyan-400 font-normal text-base">
                                    {workbenchState.activeBlueprint.project_name}
                                </span>
                            )}
                        </h1>
                    </div>
                </div>

                {workbenchState.activeBlueprint && (
                    <div className="flex items-center gap-3 text-xs">
                        <span className="px-2 py-1 bg-cyan-500/10 text-cyan-500/60 rounded uppercase">
                            {workbenchState.activeBlueprint.domain}
                        </span>
                        <span className="text-cyan-500/60">v{workbenchState.activeBlueprint.version}</span>
                        <div className="w-px h-5 bg-gray-700" />

                        <button
                            onClick={handleSimulate}
                            className="px-3 py-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 transition-colors flex items-center gap-2 mr-2 border border-emerald-500/20 relative group"
                            title="Run Python Simulation"
                        >
                            <Play className="w-3 h-3 fill-current" />
                            <span className="font-bold tracking-wide">RUN SIM</span>
                            {isExecutingLibraryPrompt && (
                                <span className="absolute inset-0 flex items-center justify-center bg-gray-900/80 rounded-lg">
                                    <Loader2 className="w-3 h-3 animate-spin text-emerald-400" />
                                </span>
                            )}
                        </button>

                        {/* Simple Scenario & Sweep Controls */}
                        <div className="flex items-center gap-2">
                            <select
                                className="bg-black/40 border border-cyan-900/40 rounded px-2 py-1 text-[10px] text-cyan-300"
                                value=""
                                onChange={(e) => {
                                    const id = e.target.value;
                                    if (id) handleLoadScenario(id);
                                }}
                            >
                                <option value="">Scenarios</option>
                                {(workbenchState.activeBlueprint.scenarios || []).map(s => (
                                    <option key={s.id} value={s.id}>{s.name}</option>
                                ))}
                            </select>
                            <button
                                onClick={handleSaveScenario}
                                className="px-2 py-1 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded text-[10px] font-bold uppercase tracking-wider border border-cyan-500/30"
                            >
                                Save
                            </button>
                            {(workbenchState.activeBlueprint.scenarios || []).length >= 2 && (
                                <button
                                    onClick={() => {
                                        const allIds = (workbenchState.activeBlueprint?.scenarios || []).slice(0, 3).map(s => s.id);
                                        setSelectedScenariosForComparison(allIds);
                                        setShowScenarioComparison(true);
                                    }}
                                    className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-500/40"
                                    title="Compare scenarios side-by-side"
                                >
                                    Compare
                                </button>
                            )}
                            <button
                                onClick={handleQuickSweep}
                                className="px-2 py-1 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded text-[10px] font-bold uppercase tracking-wider border border-purple-500/40"
                                title="Quick sweep on first numeric parameter"
                            >
                                Sweep
                            </button>
                        </div>

                        <button
                            onClick={() => setShowOutputPanel(!showOutputPanel)}
                            className={`px-3 py-1.5 rounded-lg transition-colors flex items-center gap-2 ${showOutputPanel
                                ? 'bg-emerald-500/20 text-emerald-400'
                                : 'bg-gray-800/50 text-gray-400 hover:bg-gray-800 hover:text-white'
                                }`}
                            title="Toggle Output Panel"
                        >
                            <PanelBottom className="w-4 h-4" />
                            Output
                        </button>
                        <button
                            onClick={() => setShowImportModal(true)}
                            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 hover:bg-cyan-500/20 transition-colors flex items-center gap-2"
                            title="Import SAF JSON"
                        >
                            <Upload className="w-4 h-4" />
                            Import
                        </button>
                        <button
                            onClick={() => setShowPromptLibrary(true)}
                            className="px-3 py-1.5 rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors flex items-center gap-2"
                            title="Open Prompt Library"
                        >
                            <Library className="w-4 h-4" />
                            Library
                        </button>
                        <button
                            onClick={() => setShowPhysicsWizard(true)}
                            className="px-3 py-1.5 rounded-lg bg-purple-500/10 text-purple-400 hover:bg-purple-500/20 transition-colors flex items-center gap-2"
                            title="Extract physics from text and create components"
                        >
                            <FileText className="w-4 h-4" />
                            Physics
                        </button>
                    </div>
                )}
            </div>

            {/* Breadcrumb Trail - Shows hierarchy path */}
            {workbenchState.activeBlueprint && workbenchState.breadcrumbs.length > 0 && (
                <SAFBreadcrumbs
                    trail={workbenchState.breadcrumbs.map(id => {
                        const comp = workbenchState.activeBlueprint!.components.find(c => c.id === id);
                        return { id, name: comp?.name || id, type: (comp?.type || 'core') as any };
                    })}
                    onNavigate={(index) => {
                        if (index < 0) {
                            // Navigate to root
                            setWorkbenchState(prev => ({ ...prev, breadcrumbs: [] }));
                        } else {
                            // Navigate to specific level
                            setWorkbenchState(prev => ({
                                ...prev,
                                breadcrumbs: prev.breadcrumbs.slice(0, index + 1)
                            }));
                        }
                    }}
                />
            )}

            {/* Main Content - Ternary for Empty State vs Workbench */}
            {/* Main Content - Empty State */}
            {!workbenchState.activeBlueprint && (
                <div className="flex-grow flex items-center justify-center p-8 overflow-y-auto">
                    <div className="max-w-4xl w-full">
                        <div className="text-center mb-12">
                            <FlaskConical className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
                            <h2 className="text-2xl font-bold text-white mb-2 uppercase tracking-tighter">SAF Engineering Workbench</h2>
                            <p className="text-cyan-500/60 max-w-lg mx-auto">
                                Deconstruct, modify, and simulate any system with live cascading effects using the Structurally Adaptive Framework.
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
                            {/* New Blank */}
                            <button
                                onClick={handleNewBlueprint}
                                className="group p-5 bg-gray-900/50 border border-cyan-900/30 rounded-2xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left"
                            >
                                <Plus className="w-6 h-6 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="text-sm font-bold text-white mb-1">Blank Canvas</h3>
                                <p className="text-[10px] text-gray-500">Start from scratch</p>
                            </button>

                            {/* Rankine Cycle Template */}
                            <button
                                onClick={handleLoadRankineStarter}
                                className="group p-5 bg-gray-900/50 border border-cyan-900/30 rounded-2xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                            >
                                <FileJson className="w-6 h-6 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="text-sm font-bold text-white mb-1">Rankine Cycle</h3>
                                <p className="text-[10px] text-gray-500">Power plant template</p>
                            </button>

                            {/* Load from Canvas */}
                            {canvasBlueprint && (
                                <button
                                    onClick={handleLoadFromCanvas}
                                    className="group p-5 bg-gray-900/50 border border-cyan-900/30 rounded-2xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                                >
                                    <Upload className="w-6 h-6 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-sm font-bold text-white mb-1">Active Canvas</h3>
                                    <p className="text-[10px] text-gray-500">Import current work</p>
                                </button>
                            )}

                            {/* Prompt Library */}
                            <button
                                onClick={() => setShowPromptLibrary(true)}
                                className="group p-5 bg-gray-900/50 border border-cyan-900/30 rounded-2xl hover:border-amber-500/50 hover:bg-amber-500/5 transition-all text-left"
                            >
                                <Library className="w-6 h-6 text-amber-400 mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="text-sm font-bold text-white mb-1">Prompt Library</h3>
                                <p className="text-[10px] text-gray-500">AI Deconstruct</p>
                            </button>
                        </div>

                        {/* Guided Path - Interactive Onboarding */}
                        <div className="p-8 bg-black/40 border border-cyan-500/10 rounded-3xl relative overflow-hidden group">
                            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity pointer-events-none">
                                <Zap className="w-24 h-24 text-cyan-400" />
                            </div>

                            <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                                <span className="p-1.5 bg-cyan-500/10 rounded-lg">
                                    <BookOpen className="w-4 h-4" />
                                </span>
                                Recommended Guided Path
                            </h3>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 relative z-10">
                                {/* Step 1 */}
                                <div className="space-y-4">
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-cyan-500 text-slate-900 flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(34,211,238,0.3)]">
                                            1
                                        </span>
                                        <h4 className="font-bold text-white text-xs uppercase tracking-wider">Discover</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed font-light">
                                        Explore the <span className="text-cyan-400 font-medium">Prompt Library</span> to find engineering models or deconstruct custom systems via AI.
                                    </p>
                                    <button
                                        onClick={() => setShowPromptLibrary(true)}
                                        className="py-2 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 text-[10px] font-bold text-cyan-400 rounded-lg uppercase tracking-widest flex items-center gap-2 group/btn transition-all"
                                    >
                                        Open Library <ArrowLeft className="w-3 h-3 rotate-180 group-hover/btn:translate-x-1 transition-transform" />
                                    </button>
                                </div>

                                {/* Step 2 */}
                                <button
                                    onClick={() => {
                                        handleLoadRankineStarter();
                                        setTimeout(() => setAiExplainerPinned(true), 500);
                                    }}
                                    className="w-full text-left space-y-4 group/step cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-emerald-500 text-slate-900 flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(16,185,129,0.3)]">
                                            2
                                        </span>
                                        <h4 className="font-bold text-white text-xs uppercase tracking-wider group-hover/step:text-emerald-400 transition-colors">Analysis</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed font-light">
                                        Use the <span className="text-emerald-400 font-medium italic">AI Explainer</span> to query relationships, edit parameters, and see effects.
                                    </p>
                                    <div className="py-2 px-4 bg-emerald-500/5 border border-emerald-500/10 text-[9px] text-emerald-400/60 font-medium uppercase tracking-widest flex items-center gap-2 rounded-lg group-hover/step:bg-emerald-500/10 transition-colors">
                                        <Pin className="w-3 h-3" /> Try Demo
                                    </div>
                                </button>


                                {/* Step 3 */}
                                <button
                                    onClick={() => {
                                        handleLoadRankineStarter();
                                        setTimeout(() => setShowOutputPanel(true), 500);
                                    }}
                                    className="w-full text-left space-y-4 group/step cursor-pointer"
                                >
                                    <div className="flex items-center gap-3">
                                        <span className="w-7 h-7 rounded-xl bg-purple-500 text-slate-900 flex items-center justify-center text-xs font-black shadow-[0_0_15px_rgba(168,85,247,0.3)]">
                                            3
                                        </span>
                                        <h4 className="font-bold text-white text-xs uppercase tracking-wider group-hover/step:text-purple-400 transition-colors">Synthesis</h4>
                                    </div>
                                    <p className="text-xs text-gray-400 leading-relaxed font-light">
                                        Export as a <span className="text-purple-400 font-medium italic">Strategic Brief</span>, functional code, or a high-fidelity Mermaid diagram.
                                    </p>
                                    <div className="py-2 px-4 bg-purple-500/5 border border-purple-500/10 text-[9px] text-purple-400/60 font-medium uppercase tracking-widest flex items-center gap-2 rounded-lg group-hover/step:bg-purple-500/10 transition-colors">
                                        <FileJson className="w-3 h-3" /> Try Demo
                                    </div>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )
            }

            {/* Workbench - Blueprint Loaded */}
            {
                workbenchState.activeBlueprint && (
                    // Workbench - Blueprint Loaded
                    <div className="flex-grow flex overflow-hidden">
                        {/* Node Graph Area */}
                        <div className="flex-grow bg-gray-900/20 border-r border-cyan-900/20 relative">
                            <SAFGraphErrorBoundary onReset={handleNewBlueprint}>
                                <SAFNodeGraph
                                    blueprint={workbenchState.activeBlueprint}
                                    expandedNodes={workbenchState.expandedNodes}
                                    selectedNodeId={workbenchState.selectedNodeId}
                                    simulationVars={workbenchState.activeBlueprint.last_simulation?.system_vars}
                                    constraintViolations={workbenchState.activeBlueprint.constraints 
                                        ? workbenchState.activeBlueprint.components
                                            .filter(comp => {
                                                // Check if component violates any constraints
                                                // TODO: Implement actual constraint evaluation
                                                return false;
                                            })
                                            .map(c => c.id)
                                        : undefined
                                    }
                                    onToggleExpand={(id) => {
                                        setWorkbenchState(prev => ({
                                            ...prev,
                                            expandedNodes: prev.expandedNodes.includes(id)
                                                ? prev.expandedNodes.filter(n => n !== id)
                                                : [...prev.expandedNodes, id]
                                        }));
                                    }}
                                    onSelectNode={(id) => {
                                        setWorkbenchState(prev => ({
                                            ...prev,
                                            selectedNodeId: id
                                        }));
                                    }}
                                    onAskAI={(id) => {
                                        console.log('Ask AI about:', id);
                                        // TODO: Phase 70 - Targeted AI Analysis
                                    }}
                                />
                            </SAFGraphErrorBoundary>
                        </div>

                        {/* Side Panel */}
                        <div className="w-80 shrink-0 flex flex-col bg-black/40 border-l border-cyan-900/30">
                            {/* Effects Panel */}
                            <div className="p-4 border-b border-cyan-900/20">
                                <h3 className="text-xs font-bold text-cyan-400 uppercase tracking-widest mb-3">
                                    System Overview
                                </h3>
                                <div className="space-y-2 text-sm">
                                    {workbenchState.activeBlueprint.components.map(comp => (
                                        <div
                                            key={comp.id}
                                            className="p-2 bg-gray-900/50 rounded border border-gray-800/50 hover:border-cyan-500/30 cursor-pointer transition-colors"
                                        >
                                            <div className="flex items-center justify-between">
                                                <span className="text-white font-medium">{comp.name}</span>
                                                <span className={`text-xs px-1.5 py-0.5 rounded ${comp.type === 'core' ? 'bg-cyan-500/20 text-cyan-400' :
                                                    comp.type === 'subcore' ? 'bg-purple-500/20 text-purple-400' :
                                                        'bg-emerald-500/20 text-emerald-400'
                                                    }`}>
                                                    {comp.type}
                                                </span>
                                            </div>
                                            {comp.outputs && comp.outputs.length > 0 && (
                                                <div className="mt-1 text-xs text-gray-500">
                                                    {comp.outputs[0].name}: {comp.outputs[0].value} {comp.outputs[0].unit}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Parameter Editor & AI Explainer Tabs */}
                            <div className="flex-grow flex flex-col overflow-hidden relative">
                                {selectedComponent ? (
                                    <>
                                        {/* Tab Headers */}
                                        <div className="shrink-0 flex border-b border-cyan-900/20">
                                            <button
                                                className={`flex-1 px-4 py-2 text-xs font-bold transition-colors ${true ? 'text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-gray-300'
                                                    }`}
                                            >
                                                Parameters
                                            </button>
                                        </div>

                                        {/* Editor Content */}
                                        <div className="flex-grow overflow-y-auto p-4">
                                            <SAFParameterEditor
                                                component={selectedComponent}
                                                onParameterChange={handleParameterChange}
                                                onEquationsChange={handleEquationsChange}
                                            />
                                        </div>

                                        {/* Docked AI Explainer (Only if NOT expanded) */}
                                        {!aiExplainerExpanded && (
                                            <div className={`shrink-0 border-t border-cyan-900/20 flex flex-col transition-all duration-300 ${aiExplainerPinned ? 'flex-grow min-h-0' : 'h-64'}`}>
                                                <div className="h-full relative flex flex-col">
                                                    <div className="absolute top-2 right-2 z-10 flex items-center gap-1">
                                                        <button
                                                            onClick={() => setAiExplainerPinned(!aiExplainerPinned)}
                                                            className={`p-1 rounded transition-colors ${aiExplainerPinned ? 'text-cyan-400 bg-cyan-500/20' : 'text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10'}`}
                                                            title={aiExplainerPinned ? 'Unpin' : 'Pin Expanded'}
                                                        >
                                                            {aiExplainerPinned ? <PinOff className="w-3 h-3" /> : <Pin className="w-3 h-3" />}
                                                        </button>
                                                        <button
                                                            onClick={() => setAiExplainerExpanded(true)}
                                                            className="p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                                            title="Float Window"
                                                        >
                                                            <Maximize2 className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                    <SAFAIExplainer
                                                        component={selectedComponent}
                                                        blueprint={workbenchState.activeBlueprint}
                                                    />
                                                </div>
                                            </div>
                                        )}
                                    </>
                                ) : (
                                    <div className="flex-grow flex items-center justify-center p-4">
                                        <div className="text-center max-w-xs">
                                            <FlaskConical className="w-8 h-8 text-cyan-400/20 mx-auto mb-3" />
                                            <p className="text-sm text-gray-400 font-medium mb-2">
                                                How to Use SAF Lab
                                            </p>
                                            <ol className="text-xs text-gray-500 text-left space-y-2">
                                                <li className="flex items-start gap-2">
                                                    <span className="text-cyan-500 font-bold">1.</span>
                                                    <span>Click a node in the graph to select it</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-cyan-500 font-bold">2.</span>
                                                    <span>Adjust parameters with sliders</span>
                                                </li>
                                                <li className="flex items-start gap-2">
                                                    <span className="text-cyan-500 font-bold">3.</span>
                                                    <span>Ask AI to explain the physics</span>
                                                </li>
                                            </ol>
                                        </div>
                                    </div>
                                )}
                            </div>

                        </div>

                        {/* Expanded Floating AI Explainer (Overlay) */}
                        {aiExplainerExpanded && selectedComponent && (
                            <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-12">
                                <div className="w-full max-w-4xl h-full bg-gray-900/95 border border-cyan-500/30 rounded-2xl shadow-[0_0_50px_rgba(8,145,178,0.2)] flex flex-col overflow-hidden relative animate-in fade-in zoom-in-95 duration-200">
                                    {/* Close / Minimize Button */}
                                    <div className="absolute top-4 right-4 z-20">
                                        <button
                                            onClick={() => setAiExplainerExpanded(false)}
                                            className="p-2 bg-black/40 hover:bg-cyan-500/20 text-gray-400 hover:text-cyan-400 rounded-lg transition-colors border border-white/5 hover:border-cyan-500/30"
                                        >
                                            <Minimize2 className="w-5 h-5" />
                                        </button>
                                    </div>
                                    <SAFAIExplainer
                                        component={selectedComponent}
                                        blueprint={workbenchState.activeBlueprint}
                                    />
                                </div>
                            </div>
                        )}


                        {/* Bottom Output Panel */}
                        {
                            showOutputPanel && (
                                <SAFOutputPanel
                                    blueprint={workbenchState.activeBlueprint}
                                    isExpanded={outputPanelExpanded}
                                    onToggleExpand={() => setOutputPanelExpanded(!outputPanelExpanded)}
                                    onClose={() => setShowOutputPanel(false)}
                                />
                            )
                        }
                    </div>
                )
            }


            {/* Import Modal */}
            {
                showImportModal && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-2xl bg-gray-900 border border-cyan-900/50 rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                            <div className="p-4 border-b border-cyan-900/30 flex items-center justify-between">
                                <div className="flex items-center gap-3">
                                    <Upload className="w-5 h-5 text-cyan-400" />
                                    <h3 className="font-bold text-white uppercase tracking-wider text-sm">Import SAF Blueprint</h3>
                                </div>
                                <button onClick={() => setShowImportModal(false)} className="p-1 hover:bg-white/10 rounded transition-colors text-gray-400">
                                    <Plus className="w-5 h-5 rotate-45" />
                                </button>
                            </div>
                            <div className="p-6 space-y-4">
                                <p className="text-sm text-gray-400">
                                    Paste a SAF JSON block (including <code className="text-cyan-400">{"<SAF_ISO>"}</code> tags or pure JSON) to load it into the workbench.
                                </p>
                                <textarea
                                    value={importValue}
                                    onChange={(e) => setImportValue(e.target.value)}
                                    className="w-full h-64 bg-black/50 border border-gray-800 rounded-xl p-4 text-xs font-mono text-cyan-50/80 focus:border-cyan-500/50 outline-none transition-colors overflow-y-auto"
                                    placeholder='{"project_name": "My System", "components": [...] }'
                                />
                                {importError && (
                                    <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                                        {importError}
                                    </div>
                                )}
                            </div>
                            <div className="p-4 border-t border-cyan-900/30 flex justify-end gap-3 bg-black/20">
                                <button
                                    onClick={() => setShowImportModal(false)}
                                    className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleImportSubmit}
                                    className="px-6 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-sm font-bold rounded-lg transition-all shadow-lg shadow-cyan-900/20"
                                >
                                    Load Blueprint
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Prompt Library Panel */}
            <PromptLibraryPanel
                isOpen={showPromptLibrary}
                onClose={() => setShowPromptLibrary(false)}
                onExecute={handlePromptExecute}
            />

            {/* Loading Overlay for Library Execution */}
            {
                isExecutingLibraryPrompt && (
                    <div className="fixed inset-0 z-[110] flex flex-col items-center justify-center bg-black/60 backdrop-blur-md">
                        <div className="w-16 h-16 border-4 border-cyan-500/20 border-t-cyan-500 rounded-full animate-spin mb-4" />
                        <h3 className="text-xl font-bold text-white mb-2">Eldoria Intelligence</h3>
                        <p className="text-cyan-400/70 animate-pulse">Deconstructing system and generating blueprint...</p>
                    </div>
                )
            }

            {/* Scenario Comparison Panel */}
            {showScenarioComparison && workbenchState.activeBlueprint && (
                <ScenarioComparisonPanel
                    blueprint={workbenchState.activeBlueprint}
                    selectedScenarios={selectedScenariosForComparison}
                    onClose={() => {
                        setShowScenarioComparison(false);
                        setSelectedScenariosForComparison([]);
                    }}
                    onSelectScenario={(id) => {
                        setSelectedScenariosForComparison(prev => 
                            prev.includes(id) 
                                ? prev.filter(s => s !== id)
                                : prev.length < 3 
                                    ? [...prev, id]
                                    : prev
                        );
                    }}
                />
            )}

            {/* Physics-to-Component Wizard */}
            {showPhysicsWizard && workbenchState.activeBlueprint && (
                <PhysicsToComponentWizard
                    blueprint={workbenchState.activeBlueprint}
                    onClose={() => setShowPhysicsWizard(false)}
                    onAddComponents={handleAddComponents}
                />
            )}
        </div >
    );
};

export default SAFLab;

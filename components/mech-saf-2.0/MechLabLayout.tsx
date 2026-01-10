import React, { useState, useRef, useEffect } from 'react';
import {
    PanelLeft, Play, Loader2, CheckCircle2, AlertTriangle, Settings2, Activity,
    Download, FileJson, Upload, Save, ChevronDown, FileCode, Table, BarChart3, Undo2, Redo2, HelpCircle, ArrowLeft, ChevronRight, Layers
} from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentPalette } from './ComponentPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { ResultsPanel } from './ResultsPanel';
import { AnalysisPanel } from './AnalysisPanel';
import { DiagnosticsPanel } from './DiagnosticsPanel';
import { Canvas } from './Canvas';
import { SimulationService } from '../../services/physics/SimulationService';
import { ProjectService } from '../../services/ProjectService';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { HelpModal } from './HelpModal';
import { TimelineControls } from './TimelineControls';
import { DynamicSimulationService } from '../../services/physics/DynamicSimulationService';
import { EnhancedGearBackground } from './EnhancedGearBackground';
import { TopMenu } from './TopMenu';
import { ScenarioSelectModal } from './ScenarioSelectModal';
import { ScenarioHUD } from './ScenarioHUD';
import { BottomPanel } from './BottomPanel';
import { scenarioService } from '../../services/scenarios/ScenarioService';
import { ExportService } from '../../services/export/ExportService';
import { TEMPLATE_REGISTRY } from '../../data/template-library';

type RightPanelTab = 'properties' | 'results' | 'analysis' | 'diagnostics';

export const MechLabLayout: React.FC = () => {
    const {
        isPropertiesPanelOpen,
        togglePropertiesPanel,
        isLeftPanelOpen,
        currentBlueprint,
        isSimulating,
        setIsSimulating,
        setLastSimulationResult,
        lastSimulationResult,
        selectedComponentId,
        setBlueprint,
        removeComponent,
        undo,
        redo,
        canUndo,
        canRedo,
        setIsPlaying,
        navigationStack,
        popBlueprint,
        blueprints,
        addLog
    } = useMechStore();

    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
    const [isMissionsModalOpen, setIsMissionsModalOpen] = useState(false);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Keyboard shortcuts
    useKeyboardShortcuts([
        {
            key: 'Enter',
            ctrl: true,
            description: 'Run Simulation',
            action: () => handleRunSimulation()
        },
        {
            key: 's',
            ctrl: true,
            description: 'Save Project',
            action: () => handleSaveProject()
        },
        {
            key: 'e',
            ctrl: true,
            description: 'Export JSON',
            action: () => handleExportJSON()
        },
        {
            key: 'p',
            ctrl: true,
            description: 'Toggle Panel',
            action: () => togglePropertiesPanel()
        },
        {
            key: 'F1',
            description: 'Help',
            action: () => setIsHelpModalOpen(true)
        }
    ]);

    const handleRunSimulation = async () => {
        if (!currentBlueprint) return;
        setIsSimulating(true);
        setLastSimulationResult(null); // Clear previous
        addLog('Starting static simulation...', 'info');

        try {
            const result = await SimulationService.run(currentBlueprint);
            setLastSimulationResult(result);

            if (result.status === 'completed') {
                addLog(`Simulation completed in ${result.duration}ms.`, 'success');
                if (result.diagnostics.convergence.converged) {
                    setRightPanelTab('results');
                }
            } else {
                addLog(`Simulation failed to converge.`, 'error');
                result.issues.forEach(i => addLog(`[${i.severity}] ${i.message}`, i.severity === 'critical' ? 'error' : 'warning'));
            }
        } catch (error) {
            console.error(error);
            addLog(`Simulation error: ${error}`, 'error');
            setLastSimulationResult({
                id: crypto.randomUUID(),
                blueprintId: currentBlueprint.id,
                status: 'failed',
                completedAt: new Date(),
                duration: 0,
                configuration: { method: 'nonlin_newton', tolerance: 0, maxIterations: 0, outputLevel: 'quiet', initialGuess: 'design' },
                variables: {},
                metrics: { totalPowerInput: 0, totalPowerOutput: 0, overallEfficiency: 0, totalFlowRate: 0, maxPressure: 0, pressureDrop: 0, totalHeatInput: 0, totalHeatOutput: 0, componentMetrics: {} },
                diagnostics: {
                    massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                    energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
                    convergence: { iterations: 0, residual: 0, converged: false }
                },
                constraintViolations: [],
                issues: [{ id: 'sim-error', componentId: 'system', severity: 'critical', message: String(error), ruleId: 'SIM_ERROR' }]
            });
        } finally {
            setIsSimulating(false);
        }
    };

    const handleRunDynamic = async () => {
        if (!currentBlueprint) return;
        setIsSimulating(true);
        setLastSimulationResult(null);
        addLog('Starting dynamic simulation (60s)...', 'info');

        try {
            // Get active scenario for event tracking
            const activeScenario = scenarioService.getCurrentScenario();

            // Run 60s simulation with 0.5s step
            const result = await DynamicSimulationService.simulate(
                currentBlueprint,
                60,
                0.5,
                activeScenario || undefined,
                (progress, currentTime) => {
                    // Log progress every 20%
                    if (progress % 20 === 0 || progress === 100) {
                        addLog(`Simulation Progress: ${Math.round(progress)}% (t=${currentTime.toFixed(1)}s)`, 'info');
                    }
                }
            );

            if (!result) {
                throw new Error('Simulation returned no results');
            }

            setLastSimulationResult(result);

            if (result.status === 'completed') {
                addLog(`Dynamic simulation completed. Generated ${result.timePoints?.length || 0} time steps.`, 'success');
                setIsPlaying(true); // Auto-play
                setRightPanelTab('results');
            } else {
                addLog('Dynamic simulation failed or was cancelled.', 'error');
            }
        } catch (error) {
            console.error(error);
            addLog(`Dynamic simulation error: ${error}`, 'error');
            setLastSimulationResult({
                id: crypto.randomUUID(),
                blueprintId: currentBlueprint.id,
                status: 'failed',
                completedAt: new Date(),
                duration: 0,
                configuration: { method: 'nonlin_newton', tolerance: 0, maxIterations: 0, outputLevel: 'quiet', initialGuess: 'design' },
                variables: {},
                metrics: { totalPowerInput: 0, totalPowerOutput: 0, overallEfficiency: 0, totalFlowRate: 0, maxPressure: 0, pressureDrop: 0, totalHeatInput: 0, totalHeatOutput: 0, componentMetrics: {} },
                diagnostics: {
                    massBalance: { status: 'error', inlet: 0, outlet: 0, imbalance: 0, imbalancePercent: 0 },
                    energyBalance: { status: 'error', input: 0, output: 0, imbalance: 0, imbalancePercent: 0 },
                    convergence: { iterations: 0, residual: 0, converged: false }
                },
                constraintViolations: [],
                issues: [{ id: 'sim-error', componentId: 'system', severity: 'critical', message: String(error), ruleId: 'SIM_ERROR' }]
            });
        } finally {
            setIsSimulating(false);
        }
    };

    const handleSaveProject = () => {
        if (!currentBlueprint) return;
        setIsSaving(true);
        ProjectService.saveBlueprint(currentBlueprint);
        setTimeout(() => {
            setIsSaving(false);
            setShowSavedToast(true);
            setTimeout(() => setShowSavedToast(false), 2000);
        }, 300);
    };

    const handleExportJSON = () => {
        if (!currentBlueprint) return;
        ProjectService.exportAsJSON(currentBlueprint);
        setShowExportMenu(false);
    };

    const handleExportModelica = () => {
        if (!currentBlueprint) return;
        ProjectService.exportAsModelica(currentBlueprint);
        setShowExportMenu(false);
    };

    const handleExportResultsCSV = () => {
        if (!lastSimulationResult || !currentBlueprint) return;
        ProjectService.exportResultsAsCSV(lastSimulationResult.variables, currentBlueprint.name);
        setShowExportMenu(false);
    };

    const handleImport = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        try {
            const blueprint = await ProjectService.importFromJSON(file);
            setBlueprint(blueprint);
        } catch (error) {
            console.error('Import failed:', error);
            alert('Failed to import blueprint. Please check the file format.');
        }

        if (fileInputRef.current) {
            fileInputRef.current.value = '';
        }
    };

    const getStatusDisplay = () => {
        if (isSimulating) {
            return <><Loader2 className="w-3 h-3 animate-spin" /> Simulating...</>;
        }
        if (lastSimulationResult?.status === 'completed') {
            return (
                <>
                    <CheckCircle2 className="w-3 h-3 text-green-400" />
                    Converged ({lastSimulationResult.diagnostics.convergence.iterations} iter, {lastSimulationResult.duration}ms)
                </>
            );
        }
        if (lastSimulationResult?.status === 'failed') {
            return <><AlertTriangle className="w-3 h-3 text-red-400" /> Failed</>;
        }
        return 'Ready';
    };

    useEffect(() => {
        if (selectedComponentId) {
            setRightPanelTab('properties');
        }
    }, [selectedComponentId]);

    // Watch for simulation results to update scenario progress
    useEffect(() => {
        if (lastSimulationResult && lastSimulationResult.status === 'completed') {
            scenarioService.updateProgress(lastSimulationResult);
        }
    }, [lastSimulationResult]);

    // Handle initial template load or empty state
    const handleLoadTemplate = (templateId: string) => {
        console.log('Loading template:', templateId);
        const template = TEMPLATE_REGISTRY.find((t) => t.id === templateId);

        if (template) {
            console.log('Template found:', template.name);
            // Confirm if current work is unsaved? For now just load.
            setIsSimulating(false);
            setBlueprint({
                ...template.blueprint,
                id: crypto.randomUUID(), // New instance
                updated_at: new Date().toISOString()
            });
            setLastSimulationResult(null);
            addLog(`Loaded template: ${template.name}`, 'info');
        } else {
            console.error('Template not found:', templateId);
            addLog(`Error: Template ${templateId} not found`, 'error');
        }
    };

    const handleExport = () => {
        if (!currentBlueprint) return;
        ExportService.downloadBlueprint(currentBlueprint);
    };

    return (
        <div className="flex flex-col h-screen w-full bg-slate-900 text-white overflow-hidden">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImport}
                accept=".json"
                className="hidden"
            />

            <HelpModal isOpen={isHelpModalOpen} onClose={() => setIsHelpModalOpen(false)} />
            <ScenarioSelectModal isOpen={isMissionsModalOpen} onClose={() => setIsMissionsModalOpen(false)} />
            <ScenarioHUD />

            {showSavedToast && (
                <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Project saved!
                </div>
            )}

            {/* Header */}
            <header className="h-10 bg-[#0f1014] border-b border-slate-700 flex items-center justify-between px-0 shrink-0 z-50">
                <div className="flex-1">
                    <TopMenu
                        onLoadTemplate={handleLoadTemplate}
                        onSaveProject={handleSaveProject}
                        onOpenMissions={() => setIsMissionsModalOpen(true)}
                        onExport={handleExport}
                    />
                </div>

                <div className="flex items-center gap-4 px-4 border-l border-slate-800">
                    <button
                        onClick={handleRunSimulation}
                        disabled={isSimulating || !currentBlueprint?.components.length}
                        className="flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-all border border-slate-600 bg-slate-800 hover:bg-slate-700 text-emerald-400 hover:text-emerald-300 disabled:bg-slate-700 disabled:text-slate-500 disabled:cursor-not-allowed"
                        title="Run Static Analysis (Ctrl+Enter)"
                    >
                        {isSimulating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
                        <span className="hidden xl:inline">{isSimulating ? 'Simulating...' : 'Run Analysis'}</span>
                    </button>

                    <button
                        onClick={isSimulating ? undefined : handleRunDynamic}
                        className={`flex items-center gap-2 px-2 py-1 rounded-md text-sm font-medium transition-all border border-slate-600 ${isSimulating
                            ? 'bg-slate-700 text-slate-500 cursor-not-allowed'
                            : 'bg-slate-800 hover:bg-slate-700 text-cyan-400 hover:text-cyan-300'
                            }`}

                        title="Run Dynamic Simulation (60s)"
                    >
                        <Activity className="w-4 h-4" />
                        <span className="hidden xl:inline">Dynamic</span>
                    </button>

                    <div className="h-6 w-px bg-slate-700 mx-2" />

                    <button
                        onClick={() => setIsHelpModalOpen(true)}
                        className="p-1.5 text-slate-400 hover:text-white rounded hover:bg-slate-700 transition-colors"
                        title="Help (F1)"
                    >
                        <HelpCircle className="w-4 h-4" />
                    </button>

                    <div className="h-6 w-px bg-slate-700" />

                    {/* <nav className="flex gap-1 text-sm text-slate-400">
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">File</button>
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">Edit</button>
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">View</button>
                    </nav> */}
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-slate-700"
                        title="Import Blueprint (JSON)"
                    >
                        <Upload className="w-4 h-4" />
                    </button>

                    {/* <button
                        onClick={handleSaveProject}
                        disabled={!currentBlueprint?.components.length || isSaving}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-slate-700"
                        title="Save Project (Ctrl+S)"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button> */}

                    <div className="relative">
                        <button
                            onClick={() => setShowExportMenu(!showExportMenu)}
                            disabled={!currentBlueprint?.components.length}
                            className="flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-slate-700"
                            title="Export"
                        >
                            <Download className="w-4 h-4" />
                            <ChevronDown className="w-3 h-3" />
                        </button>

                        {showExportMenu && (
                            <div className="absolute right-0 top-full mt-1 bg-slate-800 border border-slate-700 rounded-lg shadow-xl py-1 min-w-[180px] z-50">
                                <button
                                    onClick={handleExportJSON}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                >
                                    <FileJson className="w-4 h-4" />
                                    Export as JSON
                                </button>
                                <button
                                    onClick={handleExportModelica}
                                    className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                >
                                    <FileCode className="w-4 h-4" />
                                    Export as Modelica
                                </button>
                                {lastSimulationResult && (
                                    <button
                                        onClick={handleExportResultsCSV}
                                        className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-300 hover:bg-slate-700 hover:text-white"
                                    >
                                        <Table className="w-4 h-4" />
                                        Export Results (CSV)
                                    </button>
                                )}
                            </div>
                        )}
                    </div>

                    <div className="h-6 w-px bg-slate-700 mx-1" />

                    <button
                        onClick={togglePropertiesPanel}
                        className={`p-2 rounded-md transition-colors ${isPropertiesPanelOpen ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white hover:bg-slate-700'}`}
                        title="Toggle Right Panel (Ctrl+P)"
                    >
                        <PanelLeft className="w-5 h-5 rotate-180" />
                    </button>
                </div>
            </header>

            {/* Hidden file input */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Palette) */}
                {isLeftPanelOpen && (
                    <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 z-10">
                        <ComponentPalette />
                    </div>
                )}

                {/* Center Canvas */}
                <div className="flex-1 flex flex-col bg-slate-900 relative" onClick={() => setShowExportMenu(false)}>
                    <div className="flex-1 relative w-full min-h-0">
                        <EnhancedGearBackground />

                        {/* Breadcrumbs Navigation */}
                        {navigationStack?.length > 0 && (
                            <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-slate-900/90 backdrop-blur px-4 py-2 rounded-full border border-slate-700 text-xs font-medium shadow-xl pointer-events-auto animate-in fade-in slide-in-from-top-2">
                                <button
                                    onClick={() => popBlueprint()}
                                    className="hover:text-white text-emerald-400 hover:text-emerald-300 flex items-center gap-1 pr-3 border-r border-slate-700/50 transition-colors"
                                >
                                    <ArrowLeft className="w-3.5 h-3.5" />
                                    <span className="uppercase tracking-wider font-bold">Back</span>
                                </button>

                                <div className="flex items-center gap-1 pl-2 select-none">
                                    {navigationStack.map((id, i) => {
                                        const bp = blueprints.find(b => b.id === id);
                                        return (
                                            <div key={id} className="flex items-center text-slate-500">
                                                <span>{bp?.name || 'Root'}</span>
                                                <ChevronRight className="w-3 h-3 mx-1 text-slate-600" />
                                            </div>
                                        );
                                    })}
                                    <span className="text-white font-semibold flex items-center gap-2">
                                        <Layers className="w-3 h-3 text-purple-400" />
                                        {currentBlueprint?.name}
                                    </span>
                                </div>
                            </div>
                        )}

                        <Canvas />
                        <TimelineControls />
                    </div>
                    <BottomPanel />
                </div >

                {/* Right Sidebar (Properties / Results / Analysis) */}
                {
                    isPropertiesPanelOpen && (
                        <div className="w-96 bg-slate-800 border-l border-slate-700 flex flex-col shrink-0 z-10">
                            {/* Tab Bar */}
                            <div className="flex border-b border-slate-700 shrink-0">
                                <button
                                    onClick={() => setRightPanelTab('properties')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightPanelTab === 'properties'
                                        ? 'text-white border-b-2 border-blue-500 bg-slate-800'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    <Settings2 className="w-3.5 h-3.5" />
                                    Properties
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('results')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightPanelTab === 'results'
                                        ? 'text-white border-b-2 border-emerald-500 bg-slate-800'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    <Activity className="w-3.5 h-3.5" />
                                    Results
                                    {lastSimulationResult && (
                                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    )}
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('analysis')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightPanelTab === 'analysis'
                                        ? 'text-white border-b-2 border-purple-500 bg-slate-800'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    <BarChart3 className="w-3.5 h-3.5" />
                                    Analysis
                                </button>
                                <button
                                    onClick={() => setRightPanelTab('diagnostics')}
                                    className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-medium transition-colors ${rightPanelTab === 'diagnostics'
                                        ? 'text-white border-b-2 border-orange-500 bg-slate-800'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-700'
                                        }`}
                                >
                                    <AlertTriangle className="w-3.5 h-3.5" />
                                    Issues
                                </button>
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 overflow-hidden">
                                {rightPanelTab === 'properties' && <PropertiesPanel />}
                                {rightPanelTab === 'results' && <ResultsPanel />}
                                {rightPanelTab === 'analysis' && <AnalysisPanel />}
                                {rightPanelTab === 'diagnostics' && <DiagnosticsPanel />}
                            </div>
                        </div>
                    )
                }
            </div>

            {/* Status Bar */}
            <div className="h-8 bg-slate-800 border-t border-slate-700 flex items-center justify-between px-4 text-xs text-slate-400 shrink-0 z-20">
                <div className="flex gap-4 items-center">
                    <span className="flex items-center gap-1.5">{getStatusDisplay()}</span>
                    <span className="text-slate-600">|</span>
                    <span>Components: {currentBlueprint?.components.length || 0}</span>
                    <span>Connections: {currentBlueprint?.connections.length || 0}</span>
                </div>
                <div className="flex gap-4 text-slate-600">
                    <span>Ctrl+Z/Y: Undo/Redo</span>
                    <span>Ctrl+Enter: Run</span>
                    <span>F1: Help</span>
                    <span>Del: Delete</span>
                </div>
            </div>
        </div>
    );
};

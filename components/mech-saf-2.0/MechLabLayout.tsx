import React, { useState, useRef, useEffect } from 'react';
import {
    PanelLeft, Play, Loader2, CheckCircle2, AlertTriangle, Settings2, Activity,
    Download, FileJson, Upload, Save, ChevronDown, FileCode, Table, BarChart3, Undo2, Redo2, HelpCircle
} from 'lucide-react';
import { useMechStore } from '../../stores/useMechStore';
import { ComponentPalette } from './ComponentPalette';
import { PropertiesPanel } from './PropertiesPanel';
import { ResultsPanel } from './ResultsPanel';
import { AnalysisPanel } from './AnalysisPanel';
import { Canvas } from './Canvas';
import { SimulationService } from '../../services/physics/SimulationService';
import { ProjectService } from '../../services/ProjectService';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import { HelpModal } from './HelpModal';
import { TimelineControls } from './TimelineControls';
import { DynamicSimulationService } from '../../services/physics/DynamicSimulationService';
import { EnhancedGearBackground } from './EnhancedGearBackground';

type RightPanelTab = 'properties' | 'results' | 'analysis';

export const MechLabLayout: React.FC = () => {
    const {
        isPropertiesPanelOpen,
        togglePropertiesPanel,
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
        setIsPlaying
    } = useMechStore();

    const [rightPanelTab, setRightPanelTab] = useState<RightPanelTab>('properties');
    const [showExportMenu, setShowExportMenu] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [showSavedToast, setShowSavedToast] = useState(false);
    const [isHelpModalOpen, setIsHelpModalOpen] = useState(false);
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

    // Check for saved project on mount
    useEffect(() => {
        const lastProjectId = ProjectService.getLastProjectId();
        if (lastProjectId && (!currentBlueprint?.components.length)) {
            const saved = ProjectService.loadBlueprint(lastProjectId);
            if (saved) {
                setBlueprint(saved);
            }
        }
    }, []);

    const handleRunSimulation = async () => {
        if (!currentBlueprint) return;
        setIsSimulating(true);
        setLastSimulationResult(null); // Clear previous

        try {
            const result = await SimulationService.run(currentBlueprint);
            setLastSimulationResult(result);
            if (result.diagnostics.convergence.converged) {
                setRightPanelTab('results');
            }
        } catch (error) {
            console.error(error);
        } finally {
            setIsSimulating(false);
        }
    };

    const handleRunDynamic = async () => {
        if (!currentBlueprint) return;
        setIsSimulating(true);
        setLastSimulationResult(null);

        try {
            // Run 60s simulation with 0.5s step
            const result = await DynamicSimulationService.simulate(currentBlueprint, 60, 0.5);
            setLastSimulationResult(result);
            setIsPlaying(true); // Auto-play
            setRightPanelTab('results');
        } catch (error) {
            console.error(error);
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

            {showSavedToast && (
                <div className="fixed top-20 right-4 z-50 bg-emerald-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center gap-2 animate-fade-in">
                    <CheckCircle2 className="w-4 h-4" />
                    Project saved!
                </div>
            )}

            {/* Header */}
            <header className="h-14 bg-slate-800 border-b border-slate-700 flex items-center justify-between px-4 shrink-0 z-20">
                <div className="flex items-center gap-4">
                    <div className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                        Mech SAF Lab v2.0
                    </div>
                    <div className="h-6 w-px bg-slate-700 mx-2" />

                    {/* Quick Actions */}
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => undo()}
                            disabled={!canUndo()}
                            className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed rounded hover:bg-slate-700 transition-colors"
                            title="Undo (Ctrl+Z)"
                        >
                            <Undo2 className="w-4 h-4" />
                        </button>
                        <button
                            onClick={() => redo()}
                            disabled={!canRedo()}
                            className="p-1.5 text-slate-400 hover:text-white disabled:text-slate-600 disabled:cursor-not-allowed rounded hover:bg-slate-700 transition-colors"
                            title="Redo (Ctrl+Y)"
                        >
                            <Redo2 className="w-4 h-4" />
                        </button>
                    </div>

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

                    <nav className="flex gap-1 text-sm text-slate-400">
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">File</button>
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">Edit</button>
                        <button className="hover:text-white transition-colors px-2 py-1 rounded hover:bg-slate-700">View</button>
                    </nav>
                </div>

                <div className="flex items-center gap-2">
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-slate-700"
                        title="Import Blueprint (JSON)"
                    >
                        <Upload className="w-4 h-4" />
                    </button>

                    <button
                        onClick={handleSaveProject}
                        disabled={!currentBlueprint?.components.length || isSaving}
                        className="flex items-center gap-1.5 text-slate-400 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed px-2 py-1.5 rounded-md text-sm transition-colors hover:bg-slate-700"
                        title="Save Project (Ctrl+S)"
                    >
                        {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    </button>

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

            {/* Overlays */}
            <TimelineControls />

            {/* Hidden file input */}
            <div className="flex flex-1 overflow-hidden relative">
                {/* Left Sidebar (Palette) */}
                <div className="w-72 bg-slate-800 border-r border-slate-700 flex flex-col shrink-0 z-10">
                    <ComponentPalette />
                </div>

                {/* Center Canvas */}
                <div className="flex-1 bg-slate-900 relative" onClick={() => setShowExportMenu(false)}>
                    <EnhancedGearBackground />
                    <Canvas />
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
                            </div>

                            {/* Panel Content */}
                            <div className="flex-1 overflow-hidden">
                                {rightPanelTab === 'properties' && <PropertiesPanel />}
                                {rightPanelTab === 'results' && <ResultsPanel />}
                                {rightPanelTab === 'analysis' && <AnalysisPanel />}
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

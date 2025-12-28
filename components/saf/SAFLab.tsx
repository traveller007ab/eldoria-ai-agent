import React, { useState, useCallback } from 'react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { DeepSAFBlueprint, SAFWorkbenchState, DeepSAFComponent } from './types';
import { SAFNodeGraph } from './SAFNodeGraph';
import { SAFParameterEditor } from './SAFParameterEditor';
import { SAFAIExplainer } from './SAFAIExplainer';
import { SAFBreadcrumbs } from './SAFBreadcrumbs';
import { SAFOutputPanel } from './SAFOutputPanel';
import { calculateRankineOutputs } from './engine';
import { FlaskConical, Plus, Upload, FileJson, ArrowLeft, PanelBottom, Maximize2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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

            // For Rankine Cycle, run specialized calculations
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
                    </div>
                )}
            </div>

            {/* Breadcrumb Trail - Shows hierarchy path */}
            {workbenchState.activeBlueprint && workbenchState.breadcrumbs.length > 0 && (
                <SAFBreadcrumbs
                    trail={workbenchState.breadcrumbs.map(id => {
                        const comp = workbenchState.activeBlueprint!.components.find(c => c.id === id);
                        return { id, name: comp?.name || id, type: comp?.type || 'core' };
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

            {/* Main Content */}
            {!workbenchState.activeBlueprint ? (
                // Empty State - Template Selection
                <div className="flex-grow flex items-center justify-center p-8">
                    <div className="max-w-2xl w-full">
                        <div className="text-center mb-12">
                            <FlaskConical className="w-16 h-16 text-cyan-400 mx-auto mb-4 opacity-50" />
                            <h2 className="text-2xl font-bold text-white mb-2">Welcome to SAF Lab</h2>
                            <p className="text-cyan-500/60">
                                Deconstruct, modify, and simulate any system with live cascading effects
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* New Blank */}
                            <button
                                onClick={handleNewBlueprint}
                                className="group p-6 bg-gray-900/50 border border-cyan-900/30 rounded-xl hover:border-cyan-500/50 hover:bg-cyan-500/5 transition-all text-left"
                            >
                                <Plus className="w-8 h-8 text-cyan-400 mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-bold text-white mb-1">Blank Canvas</h3>
                                <p className="text-sm text-gray-500">Start from scratch</p>
                            </button>

                            {/* Rankine Cycle Template */}
                            <button
                                onClick={handleLoadRankineStarter}
                                className="group p-6 bg-gray-900/50 border border-cyan-900/30 rounded-xl hover:border-emerald-500/50 hover:bg-emerald-500/5 transition-all text-left"
                            >
                                <FileJson className="w-8 h-8 text-emerald-400 mb-3 group-hover:scale-110 transition-transform" />
                                <h3 className="text-lg font-bold text-white mb-1">Rankine Cycle</h3>
                                <p className="text-sm text-gray-500">Power plant starter template</p>
                            </button>

                            {/* Load from Canvas */}
                            {canvasBlueprint && (
                                <button
                                    onClick={handleLoadFromCanvas}
                                    className="group p-6 bg-gray-900/50 border border-cyan-900/30 rounded-xl hover:border-purple-500/50 hover:bg-purple-500/5 transition-all text-left"
                                >
                                    <Upload className="w-8 h-8 text-purple-400 mb-3 group-hover:scale-110 transition-transform" />
                                    <h3 className="text-lg font-bold text-white mb-1">Load from Canvas</h3>
                                    <p className="text-sm text-gray-500">{canvasBlueprint.project_name || 'Current blueprint'}</p>
                                </button>
                            )}

                            {/* More Coming Soon */}
                            <div className="p-6 bg-gray-900/30 border border-gray-800/50 rounded-xl opacity-50 cursor-not-allowed">
                                <div className="w-8 h-8 mb-3 rounded bg-gray-800 flex items-center justify-center text-gray-600 text-xs">
                                    +
                                </div>
                                <h3 className="text-lg font-bold text-gray-600 mb-1">More Templates</h3>
                                <p className="text-sm text-gray-700">Coming soon...</p>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                // Workbench - Blueprint Loaded
                <div className="flex-grow flex overflow-hidden">
                    {/* Node Graph Area */}
                    <div className="flex-grow bg-gray-900/20 border-r border-cyan-900/20">
                        <SAFNodeGraph
                            blueprint={workbenchState.activeBlueprint}
                            expandedNodes={workbenchState.expandedNodes}
                            selectedNodeId={workbenchState.selectedNodeId}
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
                                // TODO: Phase 58.5 - AI Integration
                            }}
                        />
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
                        <div className="flex-grow flex flex-col overflow-hidden">
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
                                        />
                                    </div>

                                    {/* AI Explainer Section - With Expand Button */}
                                    <div className={`shrink-0 border-t border-cyan-900/20 ${aiExplainerExpanded ? 'flex-grow' : 'h-64'}`}>
                                        <div className="h-full relative">
                                            <button
                                                onClick={() => setAiExplainerExpanded(!aiExplainerExpanded)}
                                                className="absolute top-2 right-2 z-10 p-1 text-gray-500 hover:text-cyan-400 hover:bg-cyan-500/10 rounded transition-colors"
                                                title={aiExplainerExpanded ? 'Shrink' : 'Expand'}
                                            >
                                                <Maximize2 className="w-3 h-3" />
                                            </button>
                                            <SAFAIExplainer
                                                component={selectedComponent}
                                                blueprint={workbenchState.activeBlueprint}
                                            />
                                        </div>
                                    </div>
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
                                                <span>Ask AI to explain or optimize</span>
                                            </li>
                                            <li className="flex items-start gap-2">
                                                <span className="text-cyan-500 font-bold">4.</span>
                                                <span>Toggle <strong>Output</strong> panel for exports</span>
                                            </li>
                                        </ol>
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Bottom Output Panel */}
                    {showOutputPanel && (
                        <SAFOutputPanel
                            blueprint={workbenchState.activeBlueprint}
                            isExpanded={outputPanelExpanded}
                            onToggleExpand={() => setOutputPanelExpanded(!outputPanelExpanded)}
                            onClose={() => setShowOutputPanel(false)}
                        />
                    )}
                </div>
            )}
        </div>
    );
};

export default SAFLab;

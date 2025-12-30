
import React, { useEffect, useCallback } from 'react';
import { useSAFStore } from '../../stores/useSAFStore';
import { SAFNodeGraph } from './SAFNodeGraph';
import { SAFComponentLibrary } from './SAFComponentLibrary';
import { SAFParameterEditor } from './SAFParameterEditor';
import { SAFOutputPanel } from './SAFOutputPanel';
import { SAFAIExplainer } from './SAFAIExplainer';
import { GenesisPromptInput } from './GenesisPromptInput';
import { AlertTriangle, CheckCircle, RotateCcw, Brain, Sliders, Wand2, Home } from 'lucide-react';

export const SAFLab: React.FC = () => {
    // The Headless Core
    const {
        blueprint,
        loadBlueprint,
        addNode,
        updateNodePosition,
        selectNode,
        selectedId,
        connectNodes,
        validationIssues,
        runPhysicsValidation,
        updateParameter,
        runSimulation,
        isSimulationRunning,
        activePanel,
        closeBlueprint
    } = useSAFStore();

    // Local Panel State if not using store completely yet, but let's try to use store or local
    const [localActivePanel, setLocalActivePanel] = React.useState<'properties' | 'ai'>('properties');
    const [isOutputExpanded, setIsOutputExpanded] = React.useState(false);
    const [showGenesisModal, setShowGenesisModal] = React.useState(false);

    // Init Logic (Should ideally be in a route loader or separate init effect)
    useEffect(() => {
        // Load existing work or empty default
        const saved = localStorage.getItem('saf_autosave_v1');
        if (saved) {
            try {
                loadBlueprint(JSON.parse(saved));
            } catch (e) { console.error(e); }
        }
    }, []); // Run once on mount


    // Auto-Save Effect (managed by the UI for now, could be in store middleware)
    useEffect(() => {
        if (blueprint) {
            localStorage.setItem('saf_autosave_v1', JSON.stringify(blueprint));
            runPhysicsValidation(); // Re-validate on every save
        }
    }, [blueprint, runPhysicsValidation]);

    const handleNodeDragStop = useCallback((id: string, pos: { x: number, y: number }) => {
        updateNodePosition(id, pos);
    }, [updateNodePosition]);

    const handleConnect = useCallback((params: any) => {
        if (params.source && params.target) {
            connectNodes(params.source, params.target);
        }
    }, [connectNodes]);

    const handleParameterChange = useCallback((id: string, name: string, val: string | number) => {
        updateParameter(id, name, val);
    }, [updateParameter]);

    const selectedComponent = blueprint?.components.find(c => c.id === selectedId);

    if (!blueprint) {
        return (
            <div className="h-full bg-[#0a0a0f] text-white">
                <GenesisPromptInput
                    onBlueprintGenerated={(bp, variantName) => {
                        loadBlueprint({
                            ...bp,
                            project_name: variantName,
                            updated_at: new Date().toISOString()
                        });
                    }}
                />
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
            {/* 2.0 Header */}
            <div className="shrink-0 h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <button
                        onClick={closeBlueprint}
                        className="p-1 hover:bg-white/10 rounded text-cyan-400 group relative"
                        title="Back to Homedeck"
                    >
                        <Home className="w-4 h-4" />
                        <span className="absolute left-8 top-1/2 -translate-y-1/2 text-[10px] bg-black/90 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">Home</span>
                    </button>
                    <div className="w-px h-4 bg-gray-700 mx-1" />
                    <span className="font-bold text-cyan-400 tracking-wider">SAF LAB <span className="text-xs font-normal text-gray-500">2.0</span></span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-300">{blueprint.project_name}</span>
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setIsOutputExpanded(!isOutputExpanded)}
                        className={`p-1.5 rounded transition-colors ${isOutputExpanded ? 'bg-cyan-500/20 text-cyan-400' : 'text-gray-400 hover:text-white hover:bg-white/10'}`}
                        title="Toggle Output Terminal"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="4 17 10 11 4 5"></polyline><line x1="12" y1="19" x2="20" y2="19"></line></svg>
                    </button>

                    <button
                        onClick={runSimulation}
                        disabled={isSimulationRunning}
                        className={`px-3 py-1 text-xs font-bold rounded flex items-center gap-2 transition-all ${isSimulationRunning
                            ? 'bg-yellow-500/10 text-yellow-500 cursor-wait'
                            : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                            }`}
                    >
                        {isSimulationRunning ? 'Solving...' : 'Run GenSim'}
                    </button>

                    {validationIssues.length > 0 ? (
                        <div className="flex items-center gap-2 text-amber-500 text-xs px-2 py-1 bg-amber-500/10 rounded">
                            <AlertTriangle className="w-3 h-3" />
                            <span>{validationIssues.length} Physics Warnings</span>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2 text-emerald-500 text-xs px-2 py-1 bg-emerald-500/10 rounded">
                            <CheckCircle className="w-3 h-3" />
                            <span>Physics Valid</span>
                        </div>
                    )}

                    <button
                        onClick={() => setShowGenesisModal(true)}
                        className="p-1 hover:bg-white/10 rounded text-cyan-400"
                        title="Open Genesis Architect"
                    >
                        <Wand2 className="w-3 h-3" />
                    </button>
                    <button
                        onClick={() => {
                            localStorage.removeItem('saf_autosave_v1');
                            window.location.reload();
                        }}
                        className="p-1 hover:bg-white/10 rounded"
                        title="Hard Reset"
                    >
                        <RotateCcw className="w-3 h-3 text-gray-500" />
                    </button>
                </div>
            </div>

            {/* Genesis Prompt Modal Overlay */}
            {showGenesisModal && (
                <div className="absolute inset-0 z-50 bg-black/90 backdrop-blur-sm p-8">
                    <div className="h-full bg-gray-900 border border-white/10 rounded-2xl overflow-hidden relative shadow-2xl">
                        <button
                            onClick={() => setShowGenesisModal(false)}
                            className="absolute top-4 right-4 z-50 p-2 text-white/50 hover:text-white bg-black/50 rounded-full"
                        >
                            ✕
                        </button>
                        <GenesisPromptInput
                            onBlueprintGenerated={(bp, variantName) => {
                                loadBlueprint({
                                    ...bp,
                                    project_name: variantName,
                                    updated_at: new Date().toISOString()
                                });
                                setShowGenesisModal(false);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Main Area */}
            <div className="flex-grow flex overflow-hidden">
                {/* 1. Left: Library */}
                <SAFComponentLibrary onAddNode={addNode} />

                {/* 2. Center: Canvas */}
                <div className="flex-grow relative bg-gray-900/40">
                    <SAFNodeGraph
                        blueprint={blueprint}
                        selectedNodeId={selectedId}
                        simVars={blueprint.last_simulation?.system_vars} // Optional
                        // simplified props for 2.0
                        onSelectNode={selectNode}
                        onNodeDragStop={handleNodeDragStop}
                        onConnect={handleConnect}
                        onAddNode={addNode}
                        onAskAI={() => setLocalActivePanel('ai')}
                        // Reuse existing styling props
                        expandedNodes={[]}
                        onToggleExpand={() => { }}
                        constraintViolations={[]}
                    />

                    {/* Floating Validation Overlay (VS Code Problems style) */}
                    {validationIssues.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-amber-500/30 rounded-lg p-3 backdrop-blur-md max-h-32 overflow-y-auto z-10">
                            <h4 className="text-[10px] font-bold text-amber-500 uppercase mb-2">Physics Violations</h4>
                            {validationIssues.map((issue, i) => (
                                <div key={i} className="text-xs text-amber-200/80 mb-1 flex items-start gap-2">
                                    <span>•</span>
                                    <span>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bottom: Output Panel */}
                    <div className="absolute bottom-0 left-0 right-0 z-20">
                        {isOutputExpanded && (
                            <SAFOutputPanel
                                blueprint={blueprint}
                                isExpanded={true} // It manages its own height internally mostly, but let's pass true
                                onToggleExpand={() => { }} // Not really used in this layout mode
                                onClose={() => setIsOutputExpanded(false)}
                            />
                        )}
                    </div>
                </div>

                {/* 3. Right: Properties / AI */}
                <div className="w-80 border-l border-white/10 bg-black/40 flex flex-col">
                    {/* Panel Tabs */}
                    <div className="flex border-b border-white/10">
                        <button
                            onClick={() => setLocalActivePanel('properties')}
                            className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-2 ${localActivePanel === 'properties' ? 'bg-gray-800 text-cyan-400 border-b-2 border-cyan-400' : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Sliders className="w-3 h-3" /> Properties
                        </button>
                        <button
                            onClick={() => setLocalActivePanel('ai')}
                            className={`flex-1 py-2 text-xs font-bold flex items-center justify-center gap-2 ${localActivePanel === 'ai' ? 'bg-gray-800 text-purple-400 border-b-2 border-purple-400' : 'text-gray-500 hover:text-white hover:bg-white/5'
                                }`}
                        >
                            <Brain className="w-3 h-3" /> AI Engine
                        </button>
                    </div>

                    <div className="flex-grow overflow-hidden relative">
                        {selectedComponent ? (
                            localActivePanel === 'properties' ? (
                                <SAFParameterEditor
                                    component={selectedComponent}
                                    onParameterChange={handleParameterChange}
                                />
                            ) : (
                                <SAFAIExplainer
                                    component={selectedComponent}
                                    blueprint={blueprint}
                                />
                            )
                        ) : (
                            <div className="p-8 text-center text-gray-600 text-xs">
                                Select a component to inspect.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

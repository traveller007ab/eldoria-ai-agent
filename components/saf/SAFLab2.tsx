
import React, { useEffect, useCallback } from 'react';
import { useSAFStore } from '../../stores/useSAFStore';
import { SAFNodeGraph } from './SAFNodeGraph';
import { SAFComponentLibrary } from './SAFComponentLibrary';
import { SAFParameterEditor } from './SAFParameterEditor';
import { AlertTriangle, CheckCircle, RotateCcw } from 'lucide-react';

export const SAFLab2: React.FC = () => {
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
        isSimulationRunning
    } = useSAFStore();

    // Init Logic (Should ideally be in a route loader or separate init effect)
    useEffect(() => {
        // Load existing work or empty default
        const saved = localStorage.getItem('saf_autosave_v1');
        if (saved) {
            try {
                loadBlueprint(JSON.parse(saved));
            } catch (e) { console.error(e); }
        } else if (!blueprint) {
            // Default "Blank Slate" 2.0
            loadBlueprint({
                project_name: 'New Physics Project',
                version: '2.0.0-alpha',
                domain: 'multi-physics',
                components: [],
                flows: [],
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
            });
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

    if (!blueprint) return <div className="flex items-center justify-center h-full text-cyan-500">Initializing Physics Engine...</div>;

    return (
        <div className="h-full flex flex-col bg-[#0a0a0f] text-white overflow-hidden">
            {/* 2.0 Header */}
            <div className="shrink-0 h-10 bg-black/60 border-b border-white/10 flex items-center justify-between px-4">
                <div className="flex items-center gap-2">
                    <span className="font-bold text-cyan-400 tracking-wider">SAF LAB <span className="text-xs font-normal text-gray-500">2.0</span></span>
                    <span className="text-xs text-gray-600">|</span>
                    <span className="text-xs text-gray-300">{blueprint.project_name}</span>
                </div>

                {/* Validation Status (The "LSP" Indicator) */}
                <div className="flex items-center gap-3">
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
                        onAskAI={() => console.log("AI 2.0")}
                        // Reuse existing styling props
                        expandedNodes={[]}
                        onToggleExpand={() => { }}
                        constraintViolations={[]}
                    />

                    {/* Floating Validation Overlay (VS Code Problems style) */}
                    {validationIssues.length > 0 && (
                        <div className="absolute bottom-4 left-4 right-4 bg-black/80 border border-amber-500/30 rounded-lg p-3 backdrop-blur-md max-h-32 overflow-y-auto">
                            <h4 className="text-[10px] font-bold text-amber-500 uppercase mb-2">Physics Violations</h4>
                            {validationIssues.map((issue, i) => (
                                <div key={i} className="text-xs text-amber-200/80 mb-1 flex items-start gap-2">
                                    <span>•</span>
                                    <span>{issue.message}</span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* 3. Right: Properties */}
                <div className="w-80 border-l border-white/10 bg-black/40 flex flex-col">
                    {selectedComponent ? (
                        <SAFParameterEditor
                            component={selectedComponent}
                            onParameterChange={handleParameterChange}
                        />
                    ) : (
                        <div className="p-8 text-center text-gray-600 text-xs">
                            Select a component to inspect physics properties.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

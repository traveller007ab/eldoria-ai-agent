import React, { useState } from 'react';
import { DeepSAFBlueprint, DeepSAFComponent } from './types';
import { bridgeClient } from '../../services/bridgeClient';
import { Loader2, FileText, Plus, X, Check, AlertCircle } from 'lucide-react';

interface PhysicsToComponentWizardProps {
    blueprint: DeepSAFBlueprint;
    onClose: () => void;
    onAddComponents: (components: DeepSAFComponent[]) => void;
}

/**
 * Physics-to-Component Wizard
 * Takes physics text/PDF content, extracts equations via Genesis Engine,
 * and creates SAF components automatically
 */
export const PhysicsToComponentWizard: React.FC<PhysicsToComponentWizardProps> = ({
    blueprint,
    onClose,
    onAddComponents,
}) => {
    const [inputText, setInputText] = useState('');
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [extractedEquations, setExtractedEquations] = useState<any[]>([]);
    const [selectedEquations, setSelectedEquations] = useState<Set<number>>(new Set());
    const [componentName, setComponentName] = useState('');
    const [error, setError] = useState<string | null>(null);

    const handleExtractPhysics = async () => {
        if (!inputText.trim()) {
            setError('Please enter physics text to analyze');
            return;
        }

        setIsAnalyzing(true);
        setError(null);

        try {
            const result = await bridgeClient.genesisAnalyze(inputText.trim(), blueprint.domain);
            
            if (result.success && result.equations && result.equations.length > 0) {
                setExtractedEquations(result.equations);
                // Auto-select all equations
                setSelectedEquations(new Set(result.equations.map((_: any, idx: number) => idx)));
            } else {
                setError(result.message || 'No equations extracted. Try more technical/physics-focused text.');
            }
        } catch (e: any) {
            setError(`Extraction failed: ${e.message}`);
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleCreateComponent = () => {
        if (selectedEquations.size === 0) {
            setError('Select at least one equation');
            return;
        }

        const name = componentName.trim() || `Component_${Date.now()}`;
        const selectedEqs = Array.from(selectedEquations).map(idx => extractedEquations[idx]);

        // Create component from extracted equations
        const newComponent: DeepSAFComponent = {
            id: crypto.randomUUID(),
            name,
            type: 'core',
            dependencies: [],
            parameters: [],
            outputs: [],
            equations: selectedEqs.map((eq: any) => eq.expression || eq),
            description: `Auto-generated from physics extraction. Laws: ${selectedEqs.map((e: any) => e.name || 'Unknown').join(', ')}`,
            position: {
                x: Math.random() * 400 + 100,
                y: Math.random() * 300 + 100,
            },
        };

        onAddComponents([newComponent]);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-8">
            <div className="w-full max-w-3xl bg-gray-900 border border-cyan-500/30 rounded-2xl shadow-2xl flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="shrink-0 p-6 border-b border-cyan-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <FileText className="w-6 h-6 text-cyan-400" />
                        <div>
                            <h2 className="text-xl font-bold text-white">Physics-to-Component Wizard</h2>
                            <p className="text-xs text-gray-500 mt-1">Extract equations from text and create SAF components</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg text-gray-400 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 space-y-6">
                    {/* Input Section */}
                    <div>
                        <label className="block text-sm font-bold text-cyan-400 mb-2 uppercase tracking-wider">
                            Physics Text / Research Content
                        </label>
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            placeholder="Paste physics equations, research paper excerpts, or technical descriptions here...

Example:
'The pressure drop across the nozzle follows Bernoulli's principle: P_out = P_in - 0.5*rho*v**2. The mass flow rate is conserved: m_in = m_out.'"
                            className="w-full h-48 bg-black/50 border border-cyan-900/30 rounded-lg p-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 font-mono resize-none"
                        />
                        <button
                            onClick={handleExtractPhysics}
                            disabled={isAnalyzing || !inputText.trim()}
                            className="mt-3 px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg hover:bg-cyan-500/30 transition-colors flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isAnalyzing ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Analyzing via Genesis Engine...
                                </>
                            ) : (
                                <>
                                    <FileText className="w-4 h-4" />
                                    Extract Equations
                                </>
                            )}
                        </button>
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <div className="text-sm font-bold text-red-400 mb-1">Extraction Error</div>
                                <div className="text-xs text-red-300">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Extracted Equations */}
                    {extractedEquations.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-emerald-400 mb-3 uppercase tracking-wider">
                                Extracted Equations ({extractedEquations.length})
                            </label>
                            <div className="space-y-2 max-h-64 overflow-y-auto">
                                {extractedEquations.map((eq: any, idx: number) => (
                                    <div
                                        key={idx}
                                        onClick={() => {
                                            const newSet = new Set(selectedEquations);
                                            if (newSet.has(idx)) {
                                                newSet.delete(idx);
                                            } else {
                                                newSet.add(idx);
                                            }
                                            setSelectedEquations(newSet);
                                        }}
                                        className={`p-4 rounded-lg border cursor-pointer transition-all ${
                                            selectedEquations.has(idx)
                                                ? 'bg-emerald-500/20 border-emerald-500/50'
                                                : 'bg-gray-800/50 border-gray-700/50 hover:border-cyan-500/30'
                                        }`}
                                    >
                                        <div className="flex items-start gap-3">
                                            <div className={`mt-1 w-5 h-5 rounded border-2 flex items-center justify-center ${
                                                selectedEquations.has(idx)
                                                    ? 'bg-emerald-500 border-emerald-500'
                                                    : 'border-gray-600'
                                            }`}>
                                                {selectedEquations.has(idx) && <Check className="w-3 h-3 text-white" />}
                                            </div>
                                            <div className="flex-1">
                                                {eq.name && (
                                                    <div className="text-sm font-bold text-white mb-1">{eq.name}</div>
                                                )}
                                                <div className="text-xs font-mono text-cyan-300 bg-black/30 p-2 rounded">
                                                    {eq.expression || eq}
                                                </div>
                                                {eq.vars && eq.vars.length > 0 && (
                                                    <div className="text-[10px] text-gray-500 mt-1">
                                                        Variables: {eq.vars.join(', ')}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Component Name Input */}
                    {extractedEquations.length > 0 && (
                        <div>
                            <label className="block text-sm font-bold text-purple-400 mb-2 uppercase tracking-wider">
                                Component Name
                            </label>
                            <input
                                type="text"
                                value={componentName}
                                onChange={(e) => setComponentName(e.target.value)}
                                placeholder="e.g., Nozzle, Heat Exchanger, Controller..."
                                className="w-full px-4 py-2 bg-black/50 border border-purple-900/30 rounded-lg text-sm text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    )}
                </div>

                {/* Footer Actions */}
                <div className="shrink-0 p-4 border-t border-cyan-500/20 flex items-center justify-between bg-gray-900/50">
                    <div className="text-xs text-gray-500">
                        {selectedEquations.size > 0 && `${selectedEquations.size} equation(s) selected`}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition-colors text-sm font-bold"
                        >
                            Cancel
                        </button>
                        {extractedEquations.length > 0 && (
                            <button
                                onClick={handleCreateComponent}
                                disabled={selectedEquations.size === 0}
                                className="px-6 py-2 bg-emerald-500/20 text-emerald-400 rounded-lg hover:bg-emerald-500/30 transition-colors disabled:opacity-50 disabled:cursor-not-allowed text-sm font-bold flex items-center gap-2"
                            >
                                <Plus className="w-4 h-4" />
                                Create Component
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PhysicsToComponentWizard;



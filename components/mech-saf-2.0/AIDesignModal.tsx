/**
 * AI Design Assistant Modal for SAF Lab
 * 
 * Uses Genesis Architect to generate system blueprints from natural language descriptions.
 * Integrates with the Python bridge backend.
 */

import React, { useState } from 'react';
import {
    Sparkles, Wand2, Cpu, Zap, Loader2, X,
    AlertTriangle, CheckCircle, Copy, ArrowRight,
    Factory, Droplets, Flame, Wind, Battery
} from 'lucide-react';
import { bridgeClient } from '../../services/bridgeClient';
import { useMechStore } from '../../stores/useMechStore';
import type { MechBlueprint } from '../../types';

interface AIDesignModalProps {
    isOpen: boolean;
    onClose: () => void;
    onBlueprintGenerated?: (blueprint: MechBlueprint) => void;
}

interface DomainPreset {
    id: string;
    name: string;
    icon: React.ElementType;
    description: string;
    example: string;
    color: string;
}

const DOMAIN_PRESETS: DomainPreset[] = [
    {
        id: 'hydraulic',
        name: 'Hydraulic',
        icon: Droplets,
        description: 'Pumps, valves, pipes, tanks',
        example: 'A water cooling system with a centrifugal pump, heat exchanger, and expansion tank',
        color: 'text-blue-400'
    },
    {
        id: 'thermal',
        name: 'Thermal',
        icon: Flame,
        description: 'Heat exchangers, boilers, coolers',
        example: 'A steam generation system with economizer, boiler drum, and superheater',
        color: 'text-orange-400'
    },
    {
        id: 'pneumatic',
        name: 'Pneumatic',
        icon: Wind,
        description: 'Compressors, air tanks, valves',
        example: 'Compressed air system with reciprocating compressor and receiver tank',
        color: 'text-cyan-400'
    },
    {
        id: 'electrical',
        name: 'Electrical',
        icon: Battery,
        description: 'Motors, generators, transformers',
        example: 'Motor drive system with VFD, induction motor, and load',
        color: 'text-yellow-400'
    },
    {
        id: 'process',
        name: 'Process Plant',
        icon: Factory,
        description: 'Complete industrial systems',
        example: 'Oil refinery distillation column with reboiler and condenser',
        color: 'text-purple-400'
    }
];

export const AIDesignModal: React.FC<AIDesignModalProps> = ({
    isOpen,
    onClose,
    onBlueprintGenerated
}) => {
    const [description, setDescription] = useState('');
    const [selectedDomain, setSelectedDomain] = useState<string | null>(null);
    const [complexity, setComplexity] = useState<'simple' | 'balanced' | 'detailed'>('balanced');
    const [constraints, setConstraints] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [result, setResult] = useState<any>(null);
    const [bridgeStatus, setBridgeStatus] = useState<'unknown' | 'online' | 'offline'>('unknown');

    // Living Mathematics Engine features
    const [fluidType, setFluidType] = useState<'auto' | 'water' | 'glycol_coolant' | 'thermal_oil' | 'refrigerant'>('auto');
    const [enableMolecularFluids, setEnableMolecularFluids] = useState(true);
    const [validatePhysics, setValidatePhysics] = useState(true);

    const { setBlueprint } = useMechStore();

    // Check bridge status on mount
    React.useEffect(() => {
        if (isOpen) {
            bridgeClient.checkBridgeHealth().then(healthy => {
                setBridgeStatus(healthy ? 'online' : 'offline');
            });
        }
    }, [isOpen]);

    const handleUseExample = (example: string, domain: string) => {
        setDescription(example);
        setSelectedDomain(domain);
    };

    const handleGenerate = async () => {
        if (!description.trim()) {
            setError('Please describe the system you want to design.');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setResult(null);

        try {
            const response = await bridgeClient.genesisArchitect({
                system_description: description,
                domain: selectedDomain || 'auto_detect',
                complexity,
                constraints: constraints || undefined
            });

            if (response && response.blueprint) {
                setResult(response);
            } else if (response && response.error) {
                setError(response.error);
            } else {
                setError('Unexpected response from AI Architect');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to generate design. Is the bridge running?');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleApplyBlueprint = () => {
        if (result?.blueprint) {
            // Convert the architect's blueprint format to MechBlueprint
            const blueprint: MechBlueprint = {
                id: `ai-${Date.now()}`,
                name: result.blueprint.name || 'AI Generated System',
                description: description,
                components: result.blueprint.components || [],
                connections: result.blueprint.connections || [],
                createdAt: new Date(),
                updatedAt: new Date(),
                author: 'AI Assistant',
                version: '1.0.0',
                domain: (selectedDomain as any) || 'fluid',
                tags: []
            };

            setBlueprint(blueprint);
            onBlueprintGenerated?.(blueprint);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-6">
            <div className="bg-[#1a1b26] border border-purple-500/30 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-hidden shadow-2xl flex flex-col">
                {/* Header */}
                <div className="p-5 border-b border-purple-500/20 bg-gradient-to-r from-purple-500/10 via-transparent to-pink-500/10">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-gradient-to-br from-purple-500/30 to-pink-500/30 rounded-xl">
                                <Sparkles className="w-6 h-6 text-purple-300" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-white flex items-center gap-2">
                                    AI Design Assistant
                                    <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded-full">BETA</span>
                                </h2>
                                <p className="text-xs text-slate-400">Describe your system in natural language</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Bridge Status */}
                            <div className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${bridgeStatus === 'online' ? 'bg-green-500/20 text-green-400' :
                                bridgeStatus === 'offline' ? 'bg-red-500/20 text-red-400' :
                                    'bg-gray-500/20 text-gray-400'
                                }`}>
                                <div className={`w-1.5 h-1.5 rounded-full ${bridgeStatus === 'online' ? 'bg-green-400' :
                                    bridgeStatus === 'offline' ? 'bg-red-400' :
                                        'bg-gray-400'
                                    }`} />
                                {bridgeStatus === 'online' ? 'Bridge Online' :
                                    bridgeStatus === 'offline' ? 'Bridge Offline' : 'Checking...'}
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                            >
                                <X className="w-5 h-5 text-slate-400" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-5 space-y-5">
                    {/* Domain Presets */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
                            Select Domain (Optional)
                        </label>
                        <div className="grid grid-cols-5 gap-2">
                            {DOMAIN_PRESETS.map(preset => {
                                const Icon = preset.icon;
                                const isSelected = selectedDomain === preset.id;
                                return (
                                    <button
                                        key={preset.id}
                                        onClick={() => setSelectedDomain(isSelected ? null : preset.id)}
                                        className={`flex flex-col items-center p-3 rounded-xl border transition-all ${isSelected
                                            ? 'bg-purple-500/20 border-purple-500/40'
                                            : 'bg-black/20 border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        <Icon className={`w-5 h-5 mb-1.5 ${isSelected ? preset.color : 'text-slate-500'}`} />
                                        <span className={`text-[10px] font-medium ${isSelected ? 'text-white' : 'text-slate-400'}`}>
                                            {preset.name}
                                        </span>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Description Input */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Describe Your System
                        </label>
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="E.g., A closed-loop water cooling system with a centrifugal pump at 50 GPM, a shell-and-tube heat exchanger, and a 100 gallon expansion tank..."
                            className="w-full h-32 bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50 resize-none"
                        />

                        {/* Quick Examples */}
                        {selectedDomain && (
                            <div className="mt-2 flex items-center gap-2">
                                <span className="text-xs text-slate-500">Try:</span>
                                <button
                                    onClick={() => handleUseExample(
                                        DOMAIN_PRESETS.find(p => p.id === selectedDomain)?.example || '',
                                        selectedDomain
                                    )}
                                    className="text-xs text-purple-400 hover:text-purple-300 underline"
                                >
                                    Use example description
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Complexity Selector */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Complexity Level
                        </label>
                        <div className="flex gap-2">
                            {(['simple', 'balanced', 'detailed'] as const).map(level => (
                                <button
                                    key={level}
                                    onClick={() => setComplexity(level)}
                                    className={`flex-1 py-2 px-4 rounded-lg text-xs font-medium transition-all ${complexity === level
                                        ? 'bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                        : 'bg-black/20 text-slate-400 border border-white/5 hover:border-white/20'
                                        }`}
                                >
                                    {level.charAt(0).toUpperCase() + level.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Living Mathematics Engine Section */}
                    <div className="p-4 bg-gradient-to-r from-cyan-900/20 to-purple-900/20 border border-cyan-500/20 rounded-xl">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="text-cyan-400 text-sm font-bold">⚗️ Living Mathematics Engine</span>
                            <span className="text-[10px] bg-cyan-500/20 text-cyan-300 px-2 py-0.5 rounded-full">NEW</span>
                        </div>

                        {/* Fluid Type Selector */}
                        <div className="mb-3">
                            <label className="block text-xs text-slate-400 mb-1.5">Primary Fluid Type</label>
                            <div className="flex gap-1.5 flex-wrap">
                                {[
                                    { id: 'auto', label: 'Auto', color: 'purple' },
                                    { id: 'water', label: 'Water', color: 'blue' },
                                    { id: 'glycol_coolant', label: '50% Glycol', color: 'cyan' },
                                    { id: 'thermal_oil', label: 'Thermal Oil', color: 'amber' },
                                    { id: 'refrigerant', label: 'Refrigerant', color: 'green' }
                                ].map(fluid => (
                                    <button
                                        key={fluid.id}
                                        onClick={() => setFluidType(fluid.id as any)}
                                        className={`px-2.5 py-1 text-xs rounded-lg transition-all ${fluidType === fluid.id
                                            ? `bg-${fluid.color}-500/30 text-${fluid.color}-300 border border-${fluid.color}-500/40`
                                            : 'bg-black/20 text-slate-400 border border-white/5 hover:border-white/20'
                                            }`}
                                    >
                                        {fluid.label}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Feature Toggles */}
                        <div className="flex gap-4">
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={enableMolecularFluids}
                                    onChange={(e) => setEnableMolecularFluids(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                                />
                                <span className="text-xs text-slate-300">Molecular Fluids</span>
                            </label>
                            <label className="flex items-center gap-2 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={validatePhysics}
                                    onChange={(e) => setValidatePhysics(e.target.checked)}
                                    className="w-3.5 h-3.5 rounded border-slate-600 bg-slate-800 text-cyan-500 focus:ring-cyan-500/50"
                                />
                                <span className="text-xs text-slate-300">Physics Validation</span>
                            </label>
                        </div>
                    </div>

                    {/* Constraints (Optional) */}
                    <div>
                        <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                            Constraints (Optional)
                        </label>
                        <input
                            value={constraints}
                            onChange={(e) => setConstraints(e.target.value)}
                            placeholder="E.g., Max pressure 150 PSI, operating temp range 20-80°C..."
                            className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-purple-500/50"
                        />
                    </div>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-start gap-3 p-4 bg-red-500/10 border border-red-500/30 rounded-xl">
                            <AlertTriangle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                            <div>
                                <div className="text-sm font-medium text-red-300">Generation Failed</div>
                                <div className="text-xs text-red-400/80 mt-1">{error}</div>
                            </div>
                        </div>
                    )}

                    {/* Result Display */}
                    {result && (
                        <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-xl space-y-3">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-400" />
                                    <span className="text-sm font-medium text-green-300">Design Generated!</span>
                                </div>
                                <button
                                    onClick={handleApplyBlueprint}
                                    className="flex items-center gap-2 px-4 py-2 bg-green-500 hover:bg-green-400 text-black rounded-lg text-xs font-bold transition-colors"
                                >
                                    Apply to Canvas
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </div>
                            <div className="text-xs text-slate-300">
                                <strong>Components:</strong> {result.blueprint?.components?.length || 0} |
                                <strong> Connections:</strong> {result.blueprint?.connections?.length || 0}
                            </div>
                            {result.explanation && (
                                <div className="text-xs text-slate-400 italic">{result.explanation}</div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-5 border-t border-white/10 bg-black/20">
                    <div className="flex items-center justify-between">
                        <p className="text-[10px] text-slate-500">
                            Powered by Genesis Architect • Requires Python Bridge
                        </p>
                        <button
                            onClick={handleGenerate}
                            disabled={isGenerating || bridgeStatus === 'offline' || !description.trim()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-400 hover:to-pink-400 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-purple-500/20"
                        >
                            {isGenerating ? (
                                <>
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    Generating...
                                </>
                            ) : (
                                <>
                                    <Wand2 className="w-4 h-4" />
                                    Generate Design
                                </>
                            )}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIDesignModal;

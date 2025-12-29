import React, { useState, useEffect } from 'react';
import { Wand2, Loader2, Zap, Flame, Droplets, Settings2, Beaker, Radio, ChevronRight, Sparkles, AlertCircle } from 'lucide-react';
import { bridgeClient } from '../../services/bridgeClient';

interface GenesisPromptInputProps {
    onBlueprintGenerated: (blueprint: any, variantName: string) => void;
    onClose?: () => void;
}

interface Template {
    id: string;
    name: string;
    description: string;
    domain: string;
    preview_description: string;
}

interface Variant {
    name: string;
    description: string;
    pros: string[];
    cons: string[];
    blueprint: any;
}

const DOMAIN_ICONS: Record<string, React.ReactNode> = {
    'power_systems': <Zap className="w-5 h-5" />,
    'thermal_systems': <Flame className="w-5 h-5" />,
    'fluid_systems': <Droplets className="w-5 h-5" />,
    'electromechanical': <Settings2 className="w-5 h-5" />,
    'chemical_process': <Beaker className="w-5 h-5" />,
    'control_systems': <Radio className="w-5 h-5" />,
};

const DOMAIN_COLORS: Record<string, string> = {
    'power_systems': 'from-yellow-500/20 to-orange-500/20 border-yellow-500/30',
    'thermal_systems': 'from-red-500/20 to-orange-500/20 border-red-500/30',
    'fluid_systems': 'from-blue-500/20 to-cyan-500/20 border-blue-500/30',
    'electromechanical': 'from-purple-500/20 to-pink-500/20 border-purple-500/30',
    'chemical_process': 'from-green-500/20 to-emerald-500/20 border-green-500/30',
    'control_systems': 'from-indigo-500/20 to-blue-500/20 border-indigo-500/30',
};

export const GenesisPromptInput: React.FC<GenesisPromptInputProps> = ({
    onBlueprintGenerated,
    onClose
}) => {
    const [description, setDescription] = useState('');
    const [constraints, setConstraints] = useState('');
    const [complexity, setComplexity] = useState<'minimal' | 'balanced' | 'comprehensive'>('balanced');
    const [isGenerating, setIsGenerating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [templates, setTemplates] = useState<Template[]>([]);
    const [variants, setVariants] = useState<Variant[]>([]);
    const [showVariants, setShowVariants] = useState(false);
    const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
    const [detectedDomain, setDetectedDomain] = useState<string>('');

    // Load templates on mount
    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const data = await bridgeClient.getArchitectTemplates();
                setTemplates(data.templates || []);
            } catch (e) {
                console.error('Failed to load templates:', e);
            }
        };
        loadTemplates();
    }, []);

    const handleGenerate = async () => {
        if (!description.trim()) {
            setError('Please describe the system you want to build');
            return;
        }

        setIsGenerating(true);
        setError(null);
        setVariants([]);
        setShowVariants(false);

        try {
            const result = await bridgeClient.genesisArchitect({
                system_description: description,
                complexity,
                constraints: constraints || undefined
            });

            if (result.success && result.variants?.length > 0) {
                setVariants(result.variants);
                setFollowUpQuestions(result.follow_up_questions || []);
                setDetectedDomain(result.domain_detected || '');
                setShowVariants(true);
            } else {
                setError(result.error || 'Failed to generate architecture');
            }
        } catch (e: any) {
            setError(e.message || 'Failed to connect to Genesis AI');
        } finally {
            setIsGenerating(false);
        }
    };

    const handleSelectVariant = (variant: Variant) => {
        // Transform blueprint to match SAF format
        const blueprint = variant.blueprint;

        // Normalize flows (from/to vs source/target)
        if (blueprint.flows) {
            blueprint.flows = blueprint.flows.map((f: any) => ({
                ...f,
                from: f.from || f.source,
                to: f.to || f.target
            }));
        }

        onBlueprintGenerated(blueprint, variant.name);
    };

    const handleTemplateClick = (template: Template) => {
        setDescription(template.preview_description);
    };

    // Variant Selection View
    if (showVariants && variants.length > 0) {
        return (
            <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-white/10">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center">
                            <Sparkles className="w-5 h-5 text-white" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold text-white">Choose Your Architecture</h2>
                            <p className="text-sm text-white/60">
                                {detectedDomain && `Domain: ${detectedDomain.replace('_', ' ')}`}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={() => setShowVariants(false)}
                        className="text-white/60 hover:text-white text-sm"
                    >
                        ← Back to prompt
                    </button>
                </div>

                {/* Variants Grid */}
                <div className="flex-1 overflow-y-auto p-6">
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        {variants.map((variant, idx) => (
                            <div
                                key={idx}
                                className={`group relative p-5 rounded-2xl border transition-all duration-300 cursor-pointer hover:scale-[1.02] ${idx === 1
                                        ? 'bg-gradient-to-br from-cyan-500/20 to-emerald-500/20 border-cyan-500/40 ring-2 ring-cyan-500/30'
                                        : 'bg-white/5 border-white/10 hover:border-white/20'
                                    }`}
                                onClick={() => handleSelectVariant(variant)}
                            >
                                {idx === 1 && (
                                    <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-gradient-to-r from-cyan-500 to-emerald-500 rounded-full text-xs font-medium text-white">
                                        Recommended
                                    </div>
                                )}

                                <h3 className="text-lg font-semibold text-white mb-2">{variant.name}</h3>
                                <p className="text-sm text-white/70 mb-4">{variant.description}</p>

                                <div className="space-y-3">
                                    <div>
                                        <p className="text-xs text-emerald-400 font-medium mb-1">Advantages</p>
                                        <ul className="space-y-1">
                                            {variant.pros.slice(0, 3).map((pro, i) => (
                                                <li key={i} className="text-xs text-white/60 flex items-start gap-1">
                                                    <span className="text-emerald-400 mt-0.5">✓</span>
                                                    {pro}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>

                                    <div>
                                        <p className="text-xs text-orange-400 font-medium mb-1">Trade-offs</p>
                                        <ul className="space-y-1">
                                            {variant.cons.slice(0, 2).map((con, i) => (
                                                <li key={i} className="text-xs text-white/60 flex items-start gap-1">
                                                    <span className="text-orange-400 mt-0.5">•</span>
                                                    {con}
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>

                                <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between">
                                    <span className="text-xs text-white/40">
                                        {variant.blueprint?.components?.length || 0} components
                                    </span>
                                    <ChevronRight className="w-4 h-4 text-white/40 group-hover:text-white/80 group-hover:translate-x-1 transition-all" />
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Follow-up Questions */}
                    {followUpQuestions.length > 0 && (
                        <div className="mt-6 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20">
                            <p className="text-sm font-medium text-blue-400 mb-2">💡 Consider refining with:</p>
                            <div className="flex flex-wrap gap-2">
                                {followUpQuestions.map((q, i) => (
                                    <button
                                        key={i}
                                        onClick={() => {
                                            setConstraints(prev => prev ? `${prev}\n${q}` : q);
                                            setShowVariants(false);
                                        }}
                                        className="px-3 py-1.5 text-xs bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 rounded-lg transition-colors"
                                    >
                                        {q}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        );
    }

    // Main Input View
    return (
        <div className="flex flex-col h-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-center py-8">
                <div className="text-center">
                    <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-cyan-500 via-emerald-500 to-teal-500 flex items-center justify-center shadow-lg shadow-cyan-500/25">
                        <Wand2 className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Genesis AI Architect</h1>
                    <p className="text-white/60 max-w-md">
                        Describe the system you want to build. I'll generate complete, physics-accurate blueprints.
                    </p>
                </div>
            </div>

            {/* Main Input Area */}
            <div className="flex-1 overflow-y-auto px-6 pb-6">
                <div className="max-w-2xl mx-auto space-y-6">
                    {/* Description Input */}
                    <div className="relative">
                        <textarea
                            value={description}
                            onChange={(e) => setDescription(e.target.value)}
                            placeholder="I want to design a home solar power system that stores excess energy in batteries and can power essential appliances during outages..."
                            className="w-full h-32 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 focus:border-cyan-500/50 transition-all"
                        />
                        <div className="absolute bottom-3 right-3 text-xs text-white/30">
                            {description.length} characters
                        </div>
                    </div>

                    {/* Complexity Selector */}
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-white/60">Complexity:</span>
                        <div className="flex gap-1 p-1 bg-white/5 rounded-lg">
                            {(['minimal', 'balanced', 'comprehensive'] as const).map((c) => (
                                <button
                                    key={c}
                                    onClick={() => setComplexity(c)}
                                    className={`px-3 py-1.5 text-xs rounded-md transition-all ${complexity === c
                                            ? 'bg-cyan-500 text-white'
                                            : 'text-white/60 hover:text-white hover:bg-white/10'
                                        }`}
                                >
                                    {c.charAt(0).toUpperCase() + c.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Constraints Input (Collapsible) */}
                    <details className="group">
                        <summary className="cursor-pointer text-sm text-white/60 hover:text-white/80 flex items-center gap-2">
                            <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90" />
                            Add constraints (optional)
                        </summary>
                        <textarea
                            value={constraints}
                            onChange={(e) => setConstraints(e.target.value)}
                            placeholder="Budget: $5000, Max power: 10kW, Must include battery backup, Prefer modular design..."
                            className="mt-2 w-full h-20 px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/30 resize-none focus:outline-none focus:ring-2 focus:ring-cyan-500/50 text-sm"
                        />
                    </details>

                    {/* Error Display */}
                    {error && (
                        <div className="flex items-center gap-2 p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                            <AlertCircle className="w-4 h-4 flex-shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* Generate Button */}
                    <button
                        onClick={handleGenerate}
                        disabled={isGenerating || !description.trim()}
                        className={`w-full py-4 rounded-xl font-medium text-white flex items-center justify-center gap-3 transition-all ${isGenerating
                                ? 'bg-cyan-500/50 cursor-wait'
                                : description.trim()
                                    ? 'bg-gradient-to-r from-cyan-500 to-emerald-500 hover:from-cyan-400 hover:to-emerald-400 shadow-lg shadow-cyan-500/25 hover:shadow-cyan-500/40'
                                    : 'bg-white/10 cursor-not-allowed'
                            }`}
                    >
                        {isGenerating ? (
                            <>
                                <Loader2 className="w-5 h-5 animate-spin" />
                                Generating Architecture...
                            </>
                        ) : (
                            <>
                                <Sparkles className="w-5 h-5" />
                                Generate System Architecture
                            </>
                        )}
                    </button>

                    {/* Templates */}
                    {templates.length > 0 && (
                        <div className="pt-6 border-t border-white/10">
                            <p className="text-sm text-white/60 mb-4 text-center">Or start from a template</p>
                            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                                {templates.map((template) => (
                                    <button
                                        key={template.id}
                                        onClick={() => handleTemplateClick(template)}
                                        className={`p-4 rounded-xl border text-left transition-all hover:scale-[1.02] bg-gradient-to-br ${DOMAIN_COLORS[template.domain] || 'from-white/5 to-white/10 border-white/10'
                                            }`}
                                    >
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="text-white/80">
                                                {DOMAIN_ICONS[template.domain] || <Settings2 className="w-5 h-5" />}
                                            </span>
                                            <span className="text-sm font-medium text-white truncate">{template.name}</span>
                                        </div>
                                        <p className="text-xs text-white/50 line-clamp-2">{template.description}</p>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

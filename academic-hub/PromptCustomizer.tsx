/**
 * Prompt Customizer Component
 * 
 * UI for editing AI system prompts per chapter with preset library.
 */

import React, { useState, useEffect } from 'react';
import { Settings, Save, RotateCcw, Sparkles, ChevronDown, Check, Copy, BookOpen, Zap, GraduationCap } from 'lucide-react';
import { AcademicModel, ChapterDefinition } from '../models/AcademicModels';

interface PromptCustomizerProps {
    model: AcademicModel;
    onSave: (customPrompts: Record<string, string>) => void;
    onClose: () => void;
}

interface PromptPreset {
    id: string;
    name: string;
    description: string;
    icon: React.ReactNode;
    prompt: string;
}

const PRESETS: PromptPreset[] = [
    {
        id: 'rigorous',
        name: 'Rigorous Academic',
        description: 'Formal, heavily cited, complex vocabulary',
        icon: <GraduationCap className="w-4 h-4" />,
        prompt: `You are a Senior Academic Supervisor with expertise in {DOMAIN}.
Your goal is to produce rigorous, publication-ready academic content.
Requirements:
- Use formal academic language with domain-specific terminology
- Include in-text citations in {CITATION_STYLE} format
- Employ complex sentence structures demonstrating analytical depth
- Reference theoretical frameworks and established literature
- Maintain objective, third-person perspective throughout
Target Audience: Academic reviewers, thesis committees, journal editors`
    },
    {
        id: 'accessible',
        name: 'Accessible Scholar',
        description: 'Clear explanations, readable, educational',
        icon: <BookOpen className="w-4 h-4" />,
        prompt: `You are an Educational Content Expert making complex topics accessible.
Your goal is to produce clear, well-structured academic content.
Requirements:
- Balance technical accuracy with readability
- Define specialized terms when first introduced
- Use examples and analogies to clarify concepts
- Include proper citations while maintaining flow
- Structure with clear headings and transitions
Target Audience: Undergraduate reviewers, general academic readers`
    },
    {
        id: 'technical',
        name: 'Technical Precision',
        description: 'Data-focused, methodology-heavy, precise',
        icon: <Zap className="w-4 h-4" />,
        prompt: `You are a Technical Research Specialist with expertise in {DOMAIN}.
Your goal is to produce precise, methodology-focused content.
Requirements:
- Emphasize quantitative data and measurements
- Detail experimental procedures and protocols
- Use technical notation and formulas where appropriate
- Maintain scientific precision in all claims
- Include error analysis and limitations
- Reference standards and established methods
Target Audience: Technical reviewers, research peers`
    },
    {
        id: 'creative',
        name: 'Creative Analysis',
        description: 'Insightful interpretations, novel perspectives',
        icon: <Sparkles className="w-4 h-4" />,
        prompt: `You are a Creative Academic Researcher known for novel insights.
Your goal is to produce thought-provoking academic analysis.
Requirements:
- Draw unexpected connections between concepts
- Propose innovative interpretations of data
- Challenge conventional assumptions constructively
- Support creative claims with evidence
- Maintain academic rigor while being engaging
- Suggest future research directions
Target Audience: Research innovators, interdisciplinary scholars`
    }
];

export const PromptCustomizer: React.FC<PromptCustomizerProps> = ({ model, onSave, onClose }) => {
    const [activeChapter, setActiveChapter] = useState<ChapterDefinition | null>(
        model.chapters[0] || null
    );
    const [customPrompts, setCustomPrompts] = useState<Record<string, string>>({});
    const [globalPrompt, setGlobalPrompt] = useState(model.aiConfig.systemPrompt);
    const [showPresets, setShowPresets] = useState(false);
    const [saved, setSaved] = useState(false);

    // Load saved prompts from localStorage
    useEffect(() => {
        try {
            const saved = localStorage.getItem(`eldoria-prompts-${model.id}`);
            if (saved) {
                setCustomPrompts(JSON.parse(saved));
            }
        } catch (e) {
            console.warn('Could not load saved prompts');
        }
    }, [model.id]);

    const handleChapterPromptChange = (chapterId: string, prompt: string) => {
        setCustomPrompts(prev => ({ ...prev, [chapterId]: prompt }));
        setSaved(false);
    };

    const handleApplyPreset = (preset: PromptPreset) => {
        const filledPrompt = preset.prompt
            .replace('{DOMAIN}', model.department)
            .replace('{CITATION_STYLE}', model.citationStyle);

        if (activeChapter) {
            handleChapterPromptChange(activeChapter.id, filledPrompt);
        }
        setShowPresets(false);
    };

    const handleApplyGlobally = (preset: PromptPreset) => {
        const filledPrompt = preset.prompt
            .replace('{DOMAIN}', model.department)
            .replace('{CITATION_STYLE}', model.citationStyle);

        setGlobalPrompt(filledPrompt);

        // Apply to all chapters
        const allPrompts: Record<string, string> = {};
        model.chapters.forEach(ch => {
            allPrompts[ch.id] = filledPrompt;
        });
        setCustomPrompts(allPrompts);
        setShowPresets(false);
        setSaved(false);
    };

    const handleReset = () => {
        if (activeChapter) {
            handleChapterPromptChange(activeChapter.id, '');
        }
    };

    const handleResetAll = () => {
        setCustomPrompts({});
        setGlobalPrompt(model.aiConfig.systemPrompt);
        setSaved(false);
    };

    const handleSave = () => {
        // Save to localStorage
        try {
            localStorage.setItem(`eldoria-prompts-${model.id}`, JSON.stringify(customPrompts));
            localStorage.setItem(`eldoria-global-prompt-${model.id}`, globalPrompt);
        } catch (e) {
            console.warn('Could not save prompts');
        }

        onSave(customPrompts);
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    const copyToClipboard = (text: string) => {
        navigator.clipboard.writeText(text);
    };

    return (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-8 animate-in fade-in duration-300">
            <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-purple-900/20 rounded-3xl border border-purple-500/20 w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl shadow-purple-500/10">
                {/* Header */}
                <div className="p-6 border-b border-purple-500/20 bg-purple-500/5">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-500/20 rounded-2xl">
                                <Settings className="w-6 h-6 text-purple-400" />
                            </div>
                            <div>
                                <h2 className="text-lg font-bold text-purple-100">Prompt Customizer</h2>
                                <p className="text-xs text-purple-400/60">
                                    Customize AI behavior for {model.name}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={handleSave}
                                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${saved
                                        ? 'bg-green-500/20 text-green-400 border border-green-500/40'
                                        : 'bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40'
                                    }`}
                            >
                                {saved ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
                                {saved ? 'Saved!' : 'Save All'}
                            </button>
                            <button
                                onClick={onClose}
                                className="px-4 py-2.5 bg-slate-800/50 hover:bg-slate-700/50 text-slate-400 rounded-xl text-xs font-bold uppercase tracking-widest border border-slate-700/50 transition-all"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    {/* Chapter List */}
                    <div className="w-64 border-r border-purple-500/10 bg-slate-900/50 p-4 overflow-y-auto">
                        <div className="text-[10px] font-bold text-purple-500/40 uppercase tracking-widest mb-3 px-2">
                            Chapters
                        </div>
                        <div className="space-y-1">
                            {model.chapters.map((chapter) => (
                                <button
                                    key={chapter.id}
                                    onClick={() => setActiveChapter(chapter)}
                                    className={`w-full p-3 rounded-xl text-left transition-all ${activeChapter?.id === chapter.id
                                            ? 'bg-purple-500/20 border border-purple-500/40 text-purple-200'
                                            : 'bg-slate-800/30 hover:bg-slate-800/50 text-slate-400 border border-transparent'
                                        }`}
                                >
                                    <div className="text-xs font-medium truncate">{chapter.name}</div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                        {customPrompts[chapter.id] ? '✨ Custom' : 'Default'}
                                    </div>
                                </button>
                            ))}
                        </div>

                        {/* Quick Actions */}
                        <div className="mt-6 pt-4 border-t border-purple-500/10">
                            <button
                                onClick={handleResetAll}
                                className="flex items-center gap-2 w-full px-3 py-2 text-xs text-slate-500 hover:text-orange-400 transition-colors rounded-lg hover:bg-orange-500/10"
                            >
                                <RotateCcw className="w-3.5 h-3.5" />
                                Reset All to Default
                            </button>
                        </div>
                    </div>

                    {/* Prompt Editor */}
                    <div className="flex-1 flex flex-col overflow-hidden">
                        {activeChapter ? (
                            <>
                                <div className="p-4 border-b border-purple-500/10 bg-slate-900/30">
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <h3 className="text-sm font-bold text-purple-200">{activeChapter.name}</h3>
                                            <p className="text-[10px] text-slate-500 mt-0.5">{activeChapter.description}</p>
                                        </div>
                                        <div className="relative">
                                            <button
                                                onClick={() => setShowPresets(!showPresets)}
                                                className="flex items-center gap-2 px-4 py-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 rounded-lg text-xs font-medium transition-all border border-purple-500/20"
                                            >
                                                <Sparkles className="w-3.5 h-3.5" />
                                                Presets
                                                <ChevronDown className={`w-3.5 h-3.5 transition-transform ${showPresets ? 'rotate-180' : ''}`} />
                                            </button>

                                            {/* Presets Dropdown */}
                                            {showPresets && (
                                                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-purple-500/30 rounded-xl shadow-2xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                                                    <div className="p-2">
                                                        {PRESETS.map((preset) => (
                                                            <button
                                                                key={preset.id}
                                                                onClick={() => handleApplyPreset(preset)}
                                                                className="w-full p-3 text-left rounded-lg hover:bg-purple-500/10 transition-all group"
                                                            >
                                                                <div className="flex items-center gap-3">
                                                                    <div className="p-2 bg-purple-500/20 rounded-lg text-purple-400 group-hover:bg-purple-500/30">
                                                                        {preset.icon}
                                                                    </div>
                                                                    <div>
                                                                        <div className="text-xs font-bold text-purple-200">{preset.name}</div>
                                                                        <div className="text-[10px] text-slate-500">{preset.description}</div>
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        ))}
                                                    </div>
                                                    <div className="border-t border-purple-500/20 p-2">
                                                        <button
                                                            onClick={() => handleApplyGlobally(PRESETS[0])}
                                                            className="w-full px-3 py-2 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors text-center"
                                                        >
                                                            Apply preset to ALL chapters
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>

                                <div className="flex-1 p-4 overflow-y-auto">
                                    <div className="space-y-4">
                                        <div>
                                            <div className="flex items-center justify-between mb-2">
                                                <label className="text-[10px] font-bold text-purple-500/60 uppercase tracking-widest">
                                                    Custom System Prompt
                                                </label>
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => copyToClipboard(customPrompts[activeChapter.id] || globalPrompt)}
                                                        className="p-1.5 text-slate-500 hover:text-purple-400 transition-colors"
                                                        title="Copy to clipboard"
                                                    >
                                                        <Copy className="w-3.5 h-3.5" />
                                                    </button>
                                                    <button
                                                        onClick={handleReset}
                                                        className="p-1.5 text-slate-500 hover:text-orange-400 transition-colors"
                                                        title="Reset to default"
                                                    >
                                                        <RotateCcw className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            </div>
                                            <textarea
                                                value={customPrompts[activeChapter.id] || ''}
                                                onChange={(e) => handleChapterPromptChange(activeChapter.id, e.target.value)}
                                                placeholder={`Default prompt will be used:\n\n${globalPrompt}`}
                                                className="w-full h-64 bg-slate-800/50 border border-purple-500/20 rounded-xl p-4 text-sm text-slate-300 font-mono leading-relaxed placeholder:text-slate-600 focus:outline-none focus:border-purple-500/50 resize-none"
                                            />
                                        </div>

                                        {/* AI Hint */}
                                        {activeChapter.aiPromptHint && (
                                            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                                                <div className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest mb-2">
                                                    Chapter-Specific Hint
                                                </div>
                                                <p className="text-xs text-cyan-200/70 italic">{activeChapter.aiPromptHint}</p>
                                            </div>
                                        )}

                                        {/* Variables Reference */}
                                        <div className="p-4 bg-slate-800/30 border border-slate-700/50 rounded-xl">
                                            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
                                                Available Variables
                                            </div>
                                            <div className="grid grid-cols-2 gap-2 text-[10px] font-mono">
                                                <div className="text-slate-400"><span className="text-purple-400">{'{TITLE}'}</span> - Project title</div>
                                                <div className="text-slate-400"><span className="text-purple-400">{'{AUTHOR}'}</span> - Author name</div>
                                                <div className="text-slate-400"><span className="text-purple-400">{'{DOMAIN}'}</span> - Engineering domain</div>
                                                <div className="text-slate-400"><span className="text-purple-400">{'{CITATION_STYLE}'}</span> - APA/IEEE/etc</div>
                                                <div className="text-slate-400"><span className="text-purple-400">{'{WORD_TARGET}'}</span> - Target word count</div>
                                                <div className="text-slate-400"><span className="text-purple-400">{'{CHAPTER}'}</span> - Current chapter</div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <div className="flex-1 flex items-center justify-center text-slate-500">
                                Select a chapter to customize its prompt
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PromptCustomizer;

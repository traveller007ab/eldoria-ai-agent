import React, { useState } from 'react';
import { AcademicModel, ChapterDefinition, createEmptyModel } from '../models/AcademicModels';
import { Plus, Trash2, GripVertical, Save, X, ChevronLeft, ChevronRight, Check, Building2, BookOpen, FileText, Settings, Sparkles } from 'lucide-react';

interface ModelCreatorProps {
    onSave: (model: AcademicModel) => void;
    onCancel: () => void;
    initialModel?: Partial<AcademicModel>;
}

export const ModelCreator: React.FC<ModelCreatorProps> = ({ onSave, onCancel, initialModel }) => {
    const [step, setStep] = useState(0);
    const [model, setModel] = useState<Partial<AcademicModel>>(initialModel || createEmptyModel());

    const steps = [
        { id: 'basics', label: 'Institution', icon: Building2 },
        { id: 'chapters', label: 'Chapters', icon: BookOpen },
        { id: 'formatting', label: 'Formatting', icon: FileText },
        { id: 'ai', label: 'AI Config', icon: Sparkles },
        { id: 'review', label: 'Review', icon: Check }
    ];

    const updateModel = (updates: Partial<AcademicModel>) => {
        setModel(prev => ({ ...prev, ...updates }));
    };

    const addChapter = () => {
        const newChapter: ChapterDefinition = {
            id: `chapter-${Date.now()}`,
            name: 'New Chapter',
            description: '',
            minWords: 1000,
            maxWords: 3000,
            required: true
        };
        updateModel({ chapters: [...(model.chapters || []), newChapter] });
    };

    const updateChapter = (index: number, updates: Partial<ChapterDefinition>) => {
        const chapters = [...(model.chapters || [])];
        chapters[index] = { ...chapters[index], ...updates };
        updateModel({ chapters });
    };

    const removeChapter = (index: number) => {
        const chapters = [...(model.chapters || [])];
        chapters.splice(index, 1);
        updateModel({ chapters });
    };

    const handleSave = () => {
        if (!model.id || !model.name) {
            model.id = `custom-${Date.now()}`;
        }
        model.createdAt = new Date().toISOString().split('T')[0];
        onSave(model as AcademicModel);
    };

    const canProceed = () => {
        switch (step) {
            case 0: return model.name && model.institution && model.department;
            case 1: return (model.chapters?.length || 0) > 0;
            default: return true;
        }
    };

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a1628] border border-cyan-500/20 rounded-3xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col shadow-[0_0_60px_rgba(34,211,238,0.1)]">
                {/* Header */}
                <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                    <div>
                        <h2 className="text-lg font-bold text-cyan-100">Create Thesis Model</h2>
                        <p className="text-[10px] text-cyan-500/50 mt-1">Define a custom template for your institution</p>
                    </div>
                    <button onClick={onCancel} className="p-2 text-cyan-500/40 hover:text-cyan-300 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Steps */}
                <div className="px-6 py-4 border-b border-cyan-500/10 flex items-center gap-2">
                    {steps.map((s, i) => (
                        <React.Fragment key={s.id}>
                            <button
                                onClick={() => setStep(i)}
                                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${step === i
                                        ? 'bg-cyan-500/20 text-cyan-200'
                                        : step > i
                                            ? 'bg-emerald-500/10 text-emerald-400'
                                            : 'text-cyan-500/30 hover:text-cyan-400'
                                    }`}
                            >
                                <s.icon className="w-3.5 h-3.5" />
                                {s.label}
                            </button>
                            {i < steps.length - 1 && <ChevronRight className="w-3 h-3 text-cyan-500/20" />}
                        </React.Fragment>
                    ))}
                </div>

                {/* Content */}
                <div className="flex-grow overflow-y-auto p-6 custom-scrollbar">
                    {step === 0 && (
                        <div className="space-y-6 max-w-xl mx-auto">
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Model Name *</label>
                                <input
                                    type="text"
                                    value={model.name || ''}
                                    onChange={e => updateModel({ name: e.target.value, id: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                                    placeholder="e.g., UNILAG Computer Science Thesis"
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder-cyan-500/30 focus:border-cyan-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Institution *</label>
                                <input
                                    type="text"
                                    value={model.institution || ''}
                                    onChange={e => updateModel({ institution: e.target.value })}
                                    placeholder="e.g., University of Lagos"
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder-cyan-500/30 focus:border-cyan-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Department *</label>
                                <input
                                    type="text"
                                    value={model.department || ''}
                                    onChange={e => updateModel({ department: e.target.value })}
                                    placeholder="e.g., Computer Science"
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder-cyan-500/30 focus:border-cyan-400 focus:outline-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Description</label>
                                <textarea
                                    value={model.description || ''}
                                    onChange={e => updateModel({ description: e.target.value })}
                                    placeholder="Brief description of this thesis format..."
                                    rows={3}
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder-cyan-500/30 focus:border-cyan-400 focus:outline-none resize-none"
                                />
                            </div>
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Citation Style</label>
                                <select
                                    value={model.citationStyle || 'APA'}
                                    onChange={e => updateModel({ citationStyle: e.target.value as any })}
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                >
                                    <option value="APA">APA (7th Edition)</option>
                                    <option value="MLA">MLA</option>
                                    <option value="IEEE">IEEE</option>
                                    <option value="Chicago">Chicago</option>
                                    <option value="Harvard">Harvard</option>
                                </select>
                            </div>
                        </div>
                    )}

                    {step === 1 && (
                        <div className="space-y-4">
                            <div className="flex items-center justify-between mb-4">
                                <div>
                                    <h3 className="text-sm font-bold text-cyan-100">Define Chapters</h3>
                                    <p className="text-[10px] text-cyan-500/50">Add the chapters required for this thesis format</p>
                                </div>
                                <button
                                    onClick={addChapter}
                                    className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add Chapter
                                </button>
                            </div>

                            <div className="space-y-3">
                                {(model.chapters || []).map((chapter, i) => (
                                    <div key={chapter.id} className="p-4 bg-black/40 border border-cyan-500/10 rounded-xl group">
                                        <div className="flex items-start gap-3">
                                            <GripVertical className="w-4 h-4 text-cyan-500/20 mt-2 cursor-grab" />
                                            <div className="flex-grow grid grid-cols-2 gap-3">
                                                <input
                                                    type="text"
                                                    value={chapter.name}
                                                    onChange={e => updateChapter(i, { name: e.target.value })}
                                                    placeholder="Chapter Name"
                                                    className="px-3 py-2 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 text-sm focus:border-cyan-400 focus:outline-none"
                                                />
                                                <input
                                                    type="text"
                                                    value={chapter.description}
                                                    onChange={e => updateChapter(i, { description: e.target.value })}
                                                    placeholder="Description"
                                                    className="px-3 py-2 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 text-sm focus:border-cyan-400 focus:outline-none"
                                                />
                                                <div className="flex gap-2">
                                                    <input
                                                        type="number"
                                                        value={chapter.minWords}
                                                        onChange={e => updateChapter(i, { minWords: Number(e.target.value) })}
                                                        placeholder="Min Words"
                                                        className="flex-1 px-3 py-2 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 text-sm focus:border-cyan-400 focus:outline-none"
                                                    />
                                                    <input
                                                        type="number"
                                                        value={chapter.maxWords}
                                                        onChange={e => updateChapter(i, { maxWords: Number(e.target.value) })}
                                                        placeholder="Max Words"
                                                        className="flex-1 px-3 py-2 bg-black/40 border border-cyan-500/20 rounded-lg text-cyan-100 text-sm focus:border-cyan-400 focus:outline-none"
                                                    />
                                                </div>
                                                <label className="flex items-center gap-2 text-[10px] text-cyan-400">
                                                    <input
                                                        type="checkbox"
                                                        checked={chapter.required}
                                                        onChange={e => updateChapter(i, { required: e.target.checked })}
                                                        className="rounded border-cyan-500/20"
                                                    />
                                                    Required Chapter
                                                </label>
                                            </div>
                                            <button
                                                onClick={() => removeChapter(i)}
                                                className="p-2 text-red-500/40 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                {(model.chapters?.length || 0) === 0 && (
                                    <div className="p-12 border border-dashed border-cyan-500/20 rounded-xl text-center">
                                        <p className="text-cyan-500/40 text-sm">No chapters defined yet. Click "Add Chapter" to start.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}

                    {step === 2 && (
                        <div className="space-y-6 max-w-xl mx-auto">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Font Family</label>
                                    <input
                                        type="text"
                                        value={model.formatting?.fontFamily || 'Times New Roman'}
                                        onChange={e => updateModel({ formatting: { ...model.formatting!, fontFamily: e.target.value } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Font Size (pt)</label>
                                    <input
                                        type="number"
                                        value={model.formatting?.fontSize || 12}
                                        onChange={e => updateModel({ formatting: { ...model.formatting!, fontSize: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Line Spacing</label>
                                    <input
                                        type="number"
                                        step="0.5"
                                        value={model.formatting?.lineSpacing || 2.0}
                                        onChange={e => updateModel({ formatting: { ...model.formatting!, lineSpacing: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Margins (inches)</label>
                                    <input
                                        type="number"
                                        step="0.25"
                                        value={model.formatting?.marginInches || 1.0}
                                        onChange={e => updateModel({ formatting: { ...model.formatting!, marginInches: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Min Total Words</label>
                                    <input
                                        type="number"
                                        value={model.targets?.totalMinWords || 15000}
                                        onChange={e => updateModel({ targets: { ...model.targets!, totalMinWords: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Min References</label>
                                    <input
                                        type="number"
                                        value={model.targets?.minReferences || 20}
                                        onChange={e => updateModel({ targets: { ...model.targets!, minReferences: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 3 && (
                        <div className="space-y-6 max-w-xl mx-auto">
                            <div>
                                <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">AI System Prompt</label>
                                <textarea
                                    value={model.aiConfig?.systemPrompt || ''}
                                    onChange={e => updateModel({ aiConfig: { ...model.aiConfig!, systemPrompt: e.target.value } })}
                                    placeholder="You are an expert academic writer specializing in..."
                                    rows={4}
                                    className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 placeholder-cyan-500/30 focus:border-cyan-400 focus:outline-none resize-none"
                                />
                                <p className="text-[9px] text-cyan-500/40 mt-2">This prompt guides the AI when generating content for this model.</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Temperature</label>
                                    <input
                                        type="number"
                                        step="0.1"
                                        min="0"
                                        max="1"
                                        value={model.aiConfig?.temperature || 0.6}
                                        onChange={e => updateModel({ aiConfig: { ...model.aiConfig!, temperature: Number(e.target.value) } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-2">Model</label>
                                    <select
                                        value={model.aiConfig?.model || 'llama-3.3-70b-versatile'}
                                        onChange={e => updateModel({ aiConfig: { ...model.aiConfig!, model: e.target.value } })}
                                        className="w-full px-4 py-3 bg-black/40 border border-cyan-500/20 rounded-xl text-cyan-100 focus:border-cyan-400 focus:outline-none"
                                    >
                                        <option value="llama-3.3-70b-versatile">Llama 3.3 70B (Recommended)</option>
                                        <option value="llama-3.1-8b-instant">Llama 3.1 8B (Fast)</option>
                                        <option value="mixtral-8x7b-32768">Mixtral 8x7B</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    )}

                    {step === 4 && (
                        <div className="max-w-2xl mx-auto">
                            <div className="p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl mb-6">
                                <h3 className="text-lg font-bold text-emerald-100 mb-2">{model.name}</h3>
                                <p className="text-sm text-emerald-300/60">{model.institution} — {model.department}</p>
                            </div>
                            <div className="grid grid-cols-2 gap-4 text-[10px]">
                                <div className="p-4 bg-black/40 border border-cyan-500/10 rounded-xl">
                                    <span className="text-cyan-500/40">Citation Style:</span>
                                    <span className="ml-2 text-cyan-100 font-bold">{model.citationStyle}</span>
                                </div>
                                <div className="p-4 bg-black/40 border border-cyan-500/10 rounded-xl">
                                    <span className="text-cyan-500/40">Chapters:</span>
                                    <span className="ml-2 text-cyan-100 font-bold">{model.chapters?.length || 0}</span>
                                </div>
                                <div className="p-4 bg-black/40 border border-cyan-500/10 rounded-xl">
                                    <span className="text-cyan-500/40">Min Words:</span>
                                    <span className="ml-2 text-cyan-100 font-bold">{model.targets?.totalMinWords?.toLocaleString()}</span>
                                </div>
                                <div className="p-4 bg-black/40 border border-cyan-500/10 rounded-xl">
                                    <span className="text-cyan-500/40">Min References:</span>
                                    <span className="ml-2 text-cyan-100 font-bold">{model.targets?.minReferences}</span>
                                </div>
                            </div>
                            <div className="mt-6 p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl">
                                <h4 className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest mb-3">Chapters Preview</h4>
                                <div className="space-y-1">
                                    {model.chapters?.map((ch, i) => (
                                        <div key={ch.id} className="flex items-center justify-between text-[11px]">
                                            <span className="text-cyan-100">{i + 1}. {ch.name}</span>
                                            <span className="text-cyan-500/40">{ch.minWords.toLocaleString()} - {ch.maxWords.toLocaleString()} words</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-cyan-500/10 flex items-center justify-between bg-black/40">
                    <button
                        onClick={() => step > 0 ? setStep(step - 1) : onCancel()}
                        className="flex items-center gap-2 px-4 py-2 text-cyan-400 hover:text-cyan-200 text-[10px] font-bold uppercase tracking-widest transition-all"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        {step === 0 ? 'Cancel' : 'Back'}
                    </button>

                    {step < steps.length - 1 ? (
                        <button
                            onClick={() => setStep(step + 1)}
                            disabled={!canProceed()}
                            className="flex items-center gap-2 px-6 py-2.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-cyan-500/40 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            Next
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    ) : (
                        <button
                            onClick={handleSave}
                            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-100 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-500/40 transition-all"
                        >
                            <Save className="w-4 h-4" />
                            Save Model
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

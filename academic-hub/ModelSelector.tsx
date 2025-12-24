import React, { useState } from 'react';
import { AcademicModel, getAllModels, DEFAULT_MODELS } from '../models/AcademicModels';
import { GraduationCap, Building2, BookOpen, Plus, Check, ChevronRight, FileText, Download, Upload } from 'lucide-react';

interface ModelSelectorProps {
    selectedModelId: string | null;
    onSelectModel: (model: AcademicModel) => void;
    onCreateNew: () => void;
}

export const ModelSelector: React.FC<ModelSelectorProps> = ({ selectedModelId, onSelectModel, onCreateNew }) => {
    const [customModels, setCustomModels] = useState<AcademicModel[]>(() => {
        const saved = localStorage.getItem('eldoria-custom-models');
        return saved ? JSON.parse(saved) : [];
    });

    const allModels = [...getAllModels(), ...customModels];

    const handleImportModel = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (file) {
                const text = await file.text();
                try {
                    const model = JSON.parse(text) as AcademicModel;
                    if (model.id && model.name && model.chapters) {
                        const updated = [...customModels, model];
                        setCustomModels(updated);
                        localStorage.setItem('eldoria-custom-models', JSON.stringify(updated));
                        alert(`Imported: ${model.name}`);
                    }
                } catch {
                    alert('Invalid model file');
                }
            }
        };
        input.click();
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h3 className="text-sm font-bold text-cyan-100 uppercase tracking-widest">Select Thesis Model</h3>
                    <p className="text-[10px] text-cyan-500/50 mt-1">Choose a template that matches your institution's requirements</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleImportModel}
                        className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 transition-all"
                    >
                        <Upload className="w-3 h-3" />
                        Import
                    </button>
                    <button
                        onClick={onCreateNew}
                        className="flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all"
                    >
                        <Plus className="w-3 h-3" />
                        Create New
                    </button>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {allModels.map((model) => (
                    <button
                        key={model.id}
                        onClick={() => onSelectModel(model)}
                        className={`p-5 rounded-2xl border text-left transition-all group ${selectedModelId === model.id
                                ? 'bg-emerald-500/10 border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
                                : 'bg-black/40 border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/5'
                            }`}
                    >
                        <div className="flex items-start justify-between mb-3">
                            <div className={`p-2 rounded-xl ${selectedModelId === model.id ? 'bg-emerald-500/20' : 'bg-cyan-500/10'}`}>
                                <GraduationCap className={`w-5 h-5 ${selectedModelId === model.id ? 'text-emerald-400' : 'text-cyan-400'}`} />
                            </div>
                            {selectedModelId === model.id && (
                                <div className="p-1 bg-emerald-500/20 rounded-full">
                                    <Check className="w-3 h-3 text-emerald-400" />
                                </div>
                            )}
                        </div>

                        <h4 className={`text-sm font-bold ${selectedModelId === model.id ? 'text-emerald-100' : 'text-cyan-100'}`}>
                            {model.name}
                        </h4>

                        <div className="flex items-center gap-2 mt-2">
                            <Building2 className="w-3 h-3 text-cyan-500/40" />
                            <span className="text-[10px] text-cyan-500/60">{model.institution}</span>
                        </div>

                        <div className="flex items-center gap-2 mt-1">
                            <BookOpen className="w-3 h-3 text-cyan-500/40" />
                            <span className="text-[10px] text-cyan-500/60">{model.department}</span>
                        </div>

                        <p className="text-[9px] text-cyan-500/40 mt-3 line-clamp-2 leading-relaxed">
                            {model.description}
                        </p>

                        <div className="flex items-center justify-between mt-4 pt-3 border-t border-cyan-500/10">
                            <div className="flex gap-2">
                                <span className="px-2 py-0.5 bg-cyan-500/10 rounded text-[8px] text-cyan-400 font-bold uppercase">
                                    {model.citationStyle}
                                </span>
                                <span className="px-2 py-0.5 bg-purple-500/10 rounded text-[8px] text-purple-400 font-bold uppercase">
                                    {model.chapters.length} Chapters
                                </span>
                            </div>
                            <ChevronRight className={`w-4 h-4 transition-transform ${selectedModelId === model.id ? 'text-emerald-400' : 'text-cyan-500/20 group-hover:text-cyan-400 group-hover:translate-x-1'}`} />
                        </div>
                    </button>
                ))}
            </div>
        </div>
    );
};

// Export model as JSON file
export function exportModel(model: AcademicModel) {
    const blob = new Blob([JSON.stringify(model, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${model.id}-thesis-model.json`;
    a.click();
    URL.revokeObjectURL(url);
}

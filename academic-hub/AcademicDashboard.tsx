import React, { useState } from 'react';
import { Layout, Plus, Search, BookOpen, GraduationCap, Building2, ChevronRight } from 'lucide-react';
import { AcademicProject, AcademicWizardState } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { getAllModels, AcademicModel, DEFAULT_MODELS } from '../models/AcademicModels';

interface AcademicDashboardProps {
    onSelectProject: (project: AcademicProject) => void;
}

export const AcademicDashboard: React.FC<AcademicDashboardProps> = ({ onSelectProject }) => {
    const { academicProjects, addAcademicProject } = useWorkspace();
    const [selectedModelId, setSelectedModelId] = useState<string>('rsu-mech-eng');

    // Get all models including custom ones from localStorage
    const customModels: AcademicModel[] = (() => {
        try {
            const saved = localStorage.getItem('eldoria-custom-models');
            return saved ? JSON.parse(saved) : [];
        } catch { return []; }
    })();
    const allModels = [...getAllModels(), ...customModels];

    const handleCreateProject = (modelId: string) => {
        const model = allModels.find(m => m.id === modelId) || DEFAULT_MODELS['rsu-mech-eng'];

        const initialState: AcademicWizardState = {
            step: 0,
            basics: { title: 'New Thesis Project', author: '', regNumber: '', year: new Date().getFullYear().toString() },
            objectives: { aim: '', specificObjectives: [] },
            scope: { scopeOfWork: '', significance: '', limitations: '' },
            literature: { keywords: [], searchQueries: [] },
            methodology: { materials: [], methods: '', costs: '', results_data: '' },
            finishing: { dedication: '', acknowledgements: '', preface: '' },
            compliance: { plagiarismChecked: false, wordCountValid: false, abstractReady: false },
            generationConfig: { targetPageCount: 80, depth: 'standard' }
        };

        const newProject: AcademicProject = {
            id: crypto.randomUUID(),
            name: 'New Research Project',
            format: model.id,
            created_at: new Date().toISOString(),
            wizard_state: initialState,
            draft_content: {},
            references: [],
            modelId: model.id // Store the model reference
        };

        addAcademicProject(newProject);
        onSelectProject(newProject);
    };

    return (
        <div className="panel flex-grow flex flex-col overflow-hidden">
            <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Layout className="w-4 h-4 text-cyan-400" />
                    <span className="text-xs font-bold uppercase tracking-widest text-cyan-300">Library</span>
                </div>
            </div>

            <div className="p-3">
                <div className="relative group">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/30 group-focus-within:text-cyan-400 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search research..."
                        className="w-full bg-black/20 border border-cyan-500/10 rounded-lg py-2 pl-9 pr-4 text-xs text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-500/30 transition-all font-sans"
                    />
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-3">
                <div className="text-[10px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] px-2 mb-1">Thesis Templates</div>

                {allModels.map(model => (
                    <button
                        key={model.id}
                        onClick={() => handleCreateProject(model.id)}
                        className={`w-full p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg text-left hover:bg-cyan-500/10 hover:border-cyan-500/30 transition-all group`}
                    >
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-cyan-500/20 rounded-md group-hover:bg-cyan-500/30 transition-colors">
                                <GraduationCap className="w-4 h-4 text-cyan-300" />
                            </div>
                            <div className="flex-grow">
                                <div className="text-[11px] font-bold text-cyan-100 uppercase tracking-tighter">{model.name}</div>
                                <div className="text-[9px] text-cyan-400/50 uppercase tracking-widest font-medium flex items-center gap-1">
                                    <Building2 className="w-2.5 h-2.5" />
                                    {model.institution}
                                </div>
                            </div>
                            <div className="flex items-center gap-2">
                                <span className="px-2 py-0.5 bg-purple-500/10 rounded text-[7px] text-purple-400 font-bold uppercase">
                                    {model.chapters.length} CH
                                </span>
                                <ChevronRight className="w-3.5 h-3.5 text-cyan-500/20 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                            </div>
                        </div>
                    </button>
                ))}

                <div className="pt-4 text-[10px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] px-2 mb-1">Recent Projects</div>
                {academicProjects.length === 0 ? (
                    <div className="p-8 text-center border border-dashed border-cyan-500/10 rounded-xl">
                        <p className="text-[10px] text-cyan-500/40 italic uppercase italic">No active research found.</p>
                    </div>
                ) : (
                    academicProjects.map(project => (
                        <div
                            key={project.id}
                            onClick={() => onSelectProject(project)}
                            className="p-3 bg-black/20 border border-cyan-500/10 rounded-lg cursor-pointer hover:border-cyan-500/30 transition-all group hover:scale-[1.02] active:scale-[0.98]"
                        >
                            <div className="text-[11px] font-bold text-cyan-200 group-hover:text-cyan-100 truncate mb-1 uppercase tracking-tight">
                                {project.wizard_state.basics.title || 'Untitled Project'}
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] text-cyan-500/50 uppercase font-bold tracking-widest">{project.format || project.modelId || 'Custom'}</span>
                                <span className="text-[8px] text-cyan-500/30 italic">{new Date(project.created_at).toLocaleDateString()}</span>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};


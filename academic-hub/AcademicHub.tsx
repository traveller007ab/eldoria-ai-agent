import React, { useState } from 'react';
import { BookOpen, GraduationCap, Plus, FileText, CheckCircle, ArrowRight, Save, Layout, FileDown, Bookmark, PenTool, Edit3, Check, Presentation, Loader2 } from 'lucide-react';
import { AcademicDashboard } from './AcademicDashboard';
import { AcademicWizard } from './AcademicWizard';
import { ComplianceSidebar } from './ComplianceSidebar';
import { AcademicProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { generateDefenseDeck } from '../services/DefenseDeckGenerator';

export const AcademicHub: React.FC = () => {
    const { addAcademicProject, updateAcademicProject } = useWorkspace();
    const [selectedProject, setSelectedProject] = useState<AcademicProject | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);

    const handleUpdateDraft = (chapter: string, content: string) => {
        if (!selectedProject) return;
        const updatedDrafts = { ...selectedProject.draft_content, [chapter]: content };
        const updatedProject = { ...selectedProject, draft_content: updatedDrafts };
        setSelectedProject(updatedProject);
        updateAcademicProject(updatedProject);
    };

    const handleExportDeck = async () => {
        if (!selectedProject) return;
        setIsGeneratingDeck(true);
        try {
            const deck = await generateDefenseDeck(selectedProject);
            const blob = new Blob([deck], { type: 'text/markdown' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `Defense_Deck_${selectedProject.wizard_state.basics.title.replace(/\s+/g, '_')}.md`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (e) {
            console.error("Deck export failed", e);
        } finally {
            setIsGeneratingDeck(false);
        }
    };

    const handleNewProject = () => {
        const newProject: AcademicProject = {
            id: crypto.randomUUID(),
            name: 'New Research Project',
            format: 'RSU_MECH_ENG',
            created_at: new Date().toISOString(),
            wizard_state: {
                step: 0,
                basics: { title: '', author: '', regNumber: '', year: '2024' },
                objectives: { aim: '', specificObjectives: [] },
                scope: { scopeOfWork: '', significance: '', limitations: '' },
                literature: { keywords: [], searchQueries: [] },
                methodology: { materials: [], methods: '', costs: '', results_data: '' },
                finishing: { dedication: '', acknowledgements: '', preface: '' },
                compliance: { plagiarismChecked: false, wordCountValid: false, abstractReady: false }
            },
            draft_content: {},
            references: []
        };
        addAcademicProject(newProject);
        setSelectedProject(newProject);
        setIsWizardOpen(true);
    };

    return (
        <div className="flex-grow flex gap-4 overflow-hidden h-full">
            {/* Left Sidebar: Projects & Dashboard */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
                <AcademicDashboard
                    onSelectProject={(project) => {
                        setSelectedProject(project);
                        setIsWizardOpen(true);
                    }}
                />
            </div>

            {/* Main Content: Wizard or Preview */}
            <div className="flex-grow flex flex-col gap-4 overflow-hidden">
                <div className="panel flex-grow flex flex-col overflow-hidden relative">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 opacity-50"></div>

                    {isWizardOpen && selectedProject ? (
                        <AcademicWizard
                            project={selectedProject}
                            onClose={() => setIsWizardOpen(false)}
                        />
                    ) : selectedProject ? (
                        <div className="flex-grow flex flex-col overflow-hidden bg-black/40">
                            <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                                <div>
                                    <h3 className="text-sm font-bold text-cyan-200 uppercase tracking-widest">{selectedProject.wizard_state.basics.title || 'Draft Thesis Preview'}</h3>
                                    <p className="text-[10px] text-cyan-500/60 mt-1 italic uppercase tracking-tighter">Draft Structure & AI Content</p>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isEditing ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'}`}
                                    >
                                        {isEditing ? <><Check className="w-3.5 h-3.5" /> Stop Editing</> : <><Edit3 className="w-3.5 h-3.5" /> Interactive Mode</>}
                                    </button>
                                    <button
                                        onClick={handleExportDeck}
                                        disabled={isGeneratingDeck}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingDeck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                                        {isGeneratingDeck ? 'Synthesizing...' : 'Defense Deck'}
                                    </button>
                                    <button onClick={() => setIsWizardOpen(true)} className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/40 transition-all">Setup Wizard</button>
                                    <button className="p-1.5 hover:bg-cyan-500/10 text-cyan-400 rounded-md transition-colors"><FileDown className="w-4 h-4" /></button>
                                </div>
                            </div>
                            <div className="flex-grow overflow-y-auto custom-scrollbar p-12">
                                <div className="max-w-3xl mx-auto space-y-12">
                                    {/* Front Matter Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <PenTool className="w-4 h-4" />
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">Front Matter</h4>
                                        </div>
                                        <div className="p-8 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl text-[13px] text-cyan-100/70 font-serif leading-relaxed whitespace-pre-wrap min-h-[100px]">
                                            {isEditing ? (
                                                <textarea
                                                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden h-auto font-serif"
                                                    value={selectedProject.draft_content['Front Matter'] || ""}
                                                    onChange={(e) => handleUpdateDraft('Front Matter', e.target.value)}
                                                    placeholder="Dedication, Acknowledgements, and Preface will appear here..."
                                                />
                                            ) : (
                                                selectedProject.draft_content['Front Matter'] || "Dedication, Acknowledgements, and Preface will appear here after synthesis."
                                            )}
                                        </div>
                                    </section>

                                    {/* Abstract Section */}
                                    <section className="space-y-4">
                                        <div className="flex items-center gap-2 text-cyan-400">
                                            <FileText className="w-4 h-4" />
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">Abstract</h4>
                                        </div>
                                        <div className="p-8 bg-black/40 border border-cyan-500/5 rounded-2xl text-[13px] text-cyan-100/70 leading-relaxed italic text-justify font-serif min-h-[150px]">
                                            {isEditing ? (
                                                <textarea
                                                    className="w-full bg-transparent border-none outline-none resize-none overflow-hidden h-auto font-serif italic"
                                                    value={selectedProject.draft_content['Abstract'] || ""}
                                                    onChange={(e) => handleUpdateDraft('Abstract', e.target.value)}
                                                    placeholder="Write your abstract here..."
                                                />
                                            ) : (
                                                selectedProject.draft_content['Abstract'] || "No content generated yet. Complete the Research Wizard to synthesize this section."
                                            )}
                                        </div>
                                    </section>

                                    {/* Chapters */}
                                    {['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Materials & Methods', 'Chapter 4: Results & Discussion', 'Chapter 5: Conclusion & Recommendations'].map(chapter => (
                                        <section key={chapter} className={`space-y-4 transition-opacity ${selectedProject.draft_content[chapter] ? 'opacity-100' : 'opacity-50'}`}>
                                            <div className="flex items-center gap-2 text-cyan-400">
                                                <CheckCircle className={`w-4 h-4 ${selectedProject.draft_content[chapter] ? 'text-emerald-400' : 'text-cyan-500/30'}`} />
                                                <h4 className="text-xs font-black uppercase tracking-[0.2em]">{chapter}</h4>
                                            </div>
                                            <div className="p-12 border-l-2 border-cyan-500/10 bg-white/[0.02] text-[13px] text-cyan-100/80 font-serif leading-relaxed whitespace-pre-wrap min-h-[300px]">
                                                {isEditing ? (
                                                    <textarea
                                                        className="w-full bg-transparent border-none outline-none resize-none overflow-hidden h-auto font-serif"
                                                        value={selectedProject.draft_content[chapter] || ""}
                                                        onChange={(e) => handleUpdateDraft(chapter, e.target.value)}
                                                        placeholder={`Synthesize or write ${chapter}...`}
                                                        rows={20}
                                                    />
                                                ) : (
                                                    selectedProject.draft_content[chapter] || "Section pending holographic synthesis..."
                                                )}
                                            </div>
                                        </section>
                                    ))}

                                    {/* Bibliography Section */}
                                    <section className="space-y-6 pt-12 border-t border-cyan-500/10">
                                        <div className="flex items-center gap-2 text-emerald-400">
                                            <Bookmark className="w-4 h-4" />
                                            <h4 className="text-xs font-black uppercase tracking-[0.2em]">References (APA Style)</h4>
                                        </div>
                                        <div className="space-y-4 pl-8">
                                            {(selectedProject.references || []).length > 0 ? selectedProject.references.map((ref, i) => (
                                                <div key={ref.id} className="text-[13px] text-cyan-100/60 font-serif leading-relaxed text-justify">
                                                    {ref.formattedApa || `${ref.authors} (${ref.year}). ${ref.title}. ${ref.journal}.`}
                                                </div>
                                            )) : (
                                                <div className="p-8 border border-dashed border-cyan-500/5 rounded-2xl text-center">
                                                    <p className="text-[10px] text-cyan-500/30 uppercase tracking-widest">No references added to the vault yet.</p>
                                                </div>
                                            )}
                                        </div>
                                    </section>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="flex-grow flex flex-col items-center justify-center text-cyan-500/30 p-12 text-center group">
                            <GraduationCap className="w-24 h-24 mb-6 opacity-10 group-hover:opacity-20 transition-opacity duration-500 animate-pulse" />
                            <h2 className="text-2xl font-bold tracking-widest uppercase mb-2">Academic Co-Pilot</h2>
                            <p className="max-w-md text-sm italic">
                                Select or create a thesis project to initiate the guided holographic research and generation environment.
                            </p>
                            <button
                                onClick={handleNewProject}
                                className="mt-8 flex items-center gap-2 px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full transition-all active:scale-95"
                            >
                                <Plus className="w-4 h-4" />
                                <span className="text-xs font-bold uppercase tracking-widest">Initiate Project</span>
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Compliance & Suggestions */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
                <ComplianceSidebar project={selectedProject} />
            </div>
        </div>
    );
};

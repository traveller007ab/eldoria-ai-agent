import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Save, Play, CheckCircle2, AlertCircle, Info, Plus, Trash2, Loader2, Search, ExternalLink, Bookmark, BookOpen, Layout } from 'lucide-react';
import { AcademicProject, AcademicWizardState } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { synthesizeChapter, searchScholarlyJournals } from '../services/academicService';
import { Loader2 as LoaderIcon, Search as SearchIcon, ExternalLink as ExtIcon } from 'lucide-react'; // Removing redundant imports

interface AcademicWizardProps {
    project: AcademicProject;
    onClose: () => void;
}

const steps = [
    { title: 'Project Basics', desc: 'Identify your research identity and title.' },
    { title: 'Aim & Objectives', desc: 'Define your SMART research goals.' },
    { title: 'Scope & Significance', desc: 'Establish boundaries and value.' },
    { title: 'Literature Strategy', desc: 'Map your theoretical background.' },
    { title: 'Materials & Methods', desc: 'Technical execution plan.' },
    { title: 'Academic Finishing', desc: 'Dedication, Acknowledgements & Front Matter.' },
    { title: 'Review & Generate', desc: 'Final audit before AI synthesis.' }
];

export const AcademicWizard: React.FC<AcademicWizardProps> = ({ project, onClose }) => {
    const { updateAcademicProject, runManualCommand } = useWorkspace();
    const [currentStep, setCurrentStep] = useState(0);
    const [localState, setLocalState] = useState<AcademicWizardState>(project.wizard_state);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [synthStatus, setSynthStatus] = useState('');
    const [isSearching, setIsSearching] = useState(false);
    const [searchResults, setSearchResults] = useState<any[]>([]);

    const updateState = (section: keyof AcademicWizardState, field: string, value: any) => {
        const newState = {
            ...localState,
            [section]: {
                ...(localState[section] as any),
                [field]: value
            }
        };
        setLocalState(newState);
        updateAcademicProject({ ...project, wizard_state: newState });
    };

    const handleSynthesize = async () => {
        // Construct the thesis input for the Python generator
        const thesisPayload = {
            ...project,
            wizard_state: localState
        };

        const command = `python services/academic-assistant/generate.py '${JSON.stringify(thesisPayload)}'`;
        await runManualCommand(command);
    };

    const handleSynthesizeChapters = async () => {
        setIsSynthesizing(true);
        const chapters = [
            'Front Matter',
            'Abstract',
            'Chapter 1: Introduction',
            'Chapter 2: Literature Review',
            'Chapter 3: Materials & Methods',
            'Chapter 4: Results & Discussion',
            'Chapter 5: Conclusion & Recommendations'
        ];
        let updatedDrafts = { ...project.draft_content };

        try {
            for (const chapter of chapters) {
                setSynthStatus(`Synthesizing ${chapter}...`);
                let chapterContent = '';
                const stream = synthesizeChapter({ ...project, wizard_state: localState }, chapter);

                for await (const chunk of stream) {
                    chapterContent += chunk;
                    // Optimistic update for UI if needed? 
                    // For now we just update once per chapter to avoid too many global state changes
                }
                updatedDrafts[chapter] = chapterContent;
                updateAcademicProject({ ...project, draft_content: updatedDrafts, wizard_state: localState });
            }
            setSynthStatus('Synthesis Complete!');
            setTimeout(() => setSynthStatus(''), 3000);
        } catch (e) {
            console.error("Synthesis failed", e);
            setSynthStatus('Synthesis Failed.');
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handleSearch = async () => {
        if (localState.literature.keywords.length === 0) return;
        setIsSearching(true);
        try {
            const results = await searchScholarlyJournals(localState.literature.keywords);
            setSearchResults(results);
        } catch (e) {
            console.error("Search failed", e);
        } finally {
            setIsSearching(false);
        }
    };

    const handleAddReference = (res: any) => {
        const newRef: any = {
            id: crypto.randomUUID(),
            title: res.title,
            authors: "Research Team", // Placeholder for actual author parsing
            year: new Date().getFullYear().toString(),
            snippet: res.snippet,
            link: res.link,
            journal: "Scholarly Source",
            formattedApa: `Research Team (${new Date().getFullYear()}). ${res.title}. Scholarly Source.`
        };

        const updatedRefs = [...(project.references || []), newRef];
        updateAcademicProject({ ...project, references: updatedRefs });
    };

    return (
        <div className="flex-grow flex flex-col overflow-hidden">
            {/* Wizard Header */}
            <div className="p-6 bg-cyan-500/5 border-b border-cyan-500/20">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h3 className="text-lg font-bold text-cyan-200 tracking-tight">Academic Research Wizard</h3>
                        <p className="text-xs text-cyan-400/60 italic">{steps[currentStep].desc}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-[10px] font-bold uppercase tracking-widest text-cyan-500 hover:text-cyan-300 transition-colors"
                    >
                        Exit Hub
                    </button>
                </div>

                <div className="flex items-center justify-between relative px-4">
                    <div className="absolute top-1/2 left-0 w-full h-px bg-cyan-500/20 -translate-y-1/2 -z-10"></div>
                    {steps.map((step, index) => {
                        const isCompleted = index < currentStep;
                        const isActive = index === currentStep;
                        return (
                            <div key={index} className="flex flex-col items-center gap-2 group cursor-pointer" onClick={() => setCurrentStep(index)}>
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all duration-300 ${isCompleted ? 'bg-emerald-500/20 border-emerald-500 text-emerald-400' :
                                    isActive ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 scale-110 shadow-[0_0_15px_rgba(34,211,238,0.2)]' :
                                        'bg-black/40 border-cyan-500/10 text-cyan-500/30'
                                    }`}>
                                    {isCompleted ? <CheckCircle2 className="w-5 h-5" /> : <span className="text-xs font-bold">{index + 1}</span>}
                                </div>
                                <span className={`text-[9px] font-bold uppercase tracking-tighter transition-colors ${isActive ? 'text-cyan-300' : 'text-cyan-500/40'}`}>
                                    {step.title.split(' ')[0]}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-8">
                <div className="max-w-2xl mx-auto space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">

                    {/* STEP 1: BASICS */}
                    {currentStep === 0 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Proposed Thesis Title</label>
                                <textarea
                                    className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 transition-all min-h-[100px] leading-relaxed"
                                    value={localState.basics.title}
                                    onChange={(e) => updateState('basics', 'title', e.target.value)}
                                    placeholder="Enter the full title of your research..."
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Researcher Name</label>
                                    <input type="text" className="w-full bg-black/40 border border-cyan-500/20 rounded-lg p-3 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40" value={localState.basics.author} onChange={(e) => updateState('basics', 'author', e.target.value)} />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Reg Number</label>
                                    <input type="text" className="w-full bg-black/40 border border-cyan-500/20 rounded-lg p-3 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40" value={localState.basics.regNumber} onChange={(e) => updateState('basics', 'regNumber', e.target.value)} />
                                </div>
                            </div>
                        </div>
                    )}

                    {/* STEP 2: AIM & OBJECTIVES */}
                    {currentStep === 1 && (
                        <div className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Primary Aim</label>
                                <textarea
                                    className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 transition-all min-h-[80px]"
                                    value={localState.objectives.aim}
                                    onChange={(e) => updateState('objectives', 'aim', e.target.value)}
                                    placeholder="The main goal of this research is to..."
                                />
                            </div>
                            <div className="space-y-3">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Specific Objectives (SMART)</label>
                                {localState.objectives.specificObjectives.map((obj, i) => (
                                    <div key={i} className="flex gap-2">
                                        <input
                                            type="text"
                                            className="flex-grow bg-black/40 border border-cyan-500/20 rounded-lg p-3 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40"
                                            value={obj}
                                            onChange={(e) => {
                                                const newObjs = [...localState.objectives.specificObjectives];
                                                newObjs[i] = e.target.value;
                                                updateState('objectives', 'specificObjectives', newObjs);
                                            }}
                                        />
                                        <button onClick={() => {
                                            const newObjs = localState.objectives.specificObjectives.filter((_, idx) => idx !== i);
                                            updateState('objectives', 'specificObjectives', newObjs);
                                        }} className="p-2 text-red-500/50 hover:text-red-400 transition-colors"><Trash2 className="w-4 h-4" /></button>
                                    </div>
                                ))}
                                <button
                                    onClick={() => updateState('objectives', 'specificObjectives', [...localState.objectives.specificObjectives, ''])}
                                    className="flex items-center gap-2 text-[10px] font-bold text-cyan-400 hover:text-cyan-300 uppercase tracking-widest py-2"
                                >
                                    <Plus className="w-3.5 h-3.5" /> Add Objective
                                </button>
                            </div>
                        </div>
                    )}

                    {/* STEP 3: SCOPE & SIGNIFICANCE */}
                    {currentStep === 2 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Scope of Work</label>
                                <textarea className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 min-h-[100px]" value={localState.scope.scopeOfWork} onChange={(e) => updateState('scope', 'scopeOfWork', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Significance</label>
                                <textarea className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 min-h-[100px]" value={localState.scope.significance} onChange={(e) => updateState('scope', 'significance', e.target.value)} />
                            </div>
                        </div>
                    )}

                    {/* STEP 4: LITERATURE STRATEGY */}
                    {currentStep === 3 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-xl flex items-start gap-4 mb-6">
                                <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-cyan-300/70 leading-relaxed italic">
                                    Identify keywords that Eldoria will use to consult scholarly journals (Tavily AI) for Chapter 2.
                                </p>
                            </div>
                            <div className="space-y-4">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Research Keywords</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        placeholder="e.g. Solar thermal energy, Renewable fish drying, Rivers State aquaculture"
                                        className="flex-grow bg-black/40 border border-cyan-500/20 rounded-lg p-3 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40"
                                        value={localState.literature.keywords.join(', ')}
                                        onChange={(e) => updateState('literature', 'keywords', e.target.value.split(',').map(s => s.trim()))}
                                    />
                                    <button
                                        onClick={handleSearch}
                                        disabled={isSearching}
                                        className="px-4 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded-lg text-cyan-400 flex items-center gap-2 transition-all disabled:opacity-50"
                                    >
                                        {isSearching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                                        <span className="text-[10px] font-bold uppercase tracking-widest">Search</span>
                                    </button>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6 mt-6 overflow-hidden">
                                {/* Search Results */}
                                <div className="space-y-3 flex flex-col h-[350px]">
                                    <div className="text-[10px] font-bold text-cyan-500/40 uppercase tracking-widest ml-1">Detected Literature</div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                        {searchResults.length > 0 ? searchResults.map((res, i) => (
                                            <div key={i} className="p-3 bg-black/40 border border-cyan-500/10 rounded-xl flex items-center justify-between group hover:border-cyan-500/30 transition-all">
                                                <div className="flex-grow overflow-hidden">
                                                    <div className="text-xs font-bold text-cyan-200 truncate">{res.title}</div>
                                                    <div className="text-[10px] text-cyan-500/60 mt-0.5 line-clamp-1 italic">{res.snippet}</div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                                                    <button onClick={() => handleAddReference(res)} className="p-2 text-cyan-400 hover:text-cyan-200 transition-colors" title="Save Reference"><Bookmark className="w-3.5 h-3.5" /></button>
                                                    <button className="p-2 text-cyan-500 hover:text-cyan-300 transition-colors"><ExternalLink className="w-3.5 h-3.5" /></button>
                                                </div>
                                            </div>
                                        )) : (
                                            <div className="p-8 border border-dashed border-cyan-500/10 rounded-2xl text-center">
                                                <SearchIcon className="w-6 h-6 text-cyan-500/20 mx-auto mb-2" />
                                                <p className="text-[10px] text-cyan-500/30 uppercase tracking-widest">No results yet</p>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Reference Vault */}
                                <div className="space-y-3 flex flex-col h-[350px]">
                                    <div className="text-[10px] font-bold text-emerald-500/40 uppercase tracking-widest ml-1">Reference Vault</div>
                                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-2">
                                        {(project.references || []).length > 0 ? project.references.map((ref, i) => (
                                            <div key={ref.id} className="p-3 bg-emerald-500/5 border border-emerald-500/10 rounded-xl flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                                                <div className="flex-grow overflow-hidden">
                                                    <div className="flex items-center gap-2">
                                                        <BookOpen className="w-3 h-3 text-emerald-400/50" />
                                                        <div className="text-xs font-bold text-emerald-200 truncate">{ref.title}</div>
                                                    </div>
                                                    <div className="text-[9px] text-emerald-500/60 mt-0.5 uppercase tracking-tighter line-clamp-1">APA: {ref.authors} ({ref.year})</div>
                                                </div>
                                                <button
                                                    onClick={() => {
                                                        const updated = project.references.filter(r => r.id !== ref.id);
                                                        updateAcademicProject({ ...project, references: updated });
                                                    }}
                                                    className="p-2 text-emerald-500/50 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-all shrink-0"
                                                >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )) : (
                                            <div className="p-8 border border-dashed border-emerald-500/10 rounded-2xl text-center">
                                                <Bookmark className="w-6 h-6 text-emerald-500/20 mx-auto mb-2" />
                                                <p className="text-[10px] text-emerald-500/30 uppercase tracking-widest">Vault Empty</p>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                        </div>
                    )}

                    {/* STEP 5: MATERIALS & METHODS */}
                    {currentStep === 4 && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Proposed Materials</label>
                                <textarea className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 min-h-[80px]" value={localState.methodology.materials.join(', ')} onChange={(e) => updateState('methodology', 'materials', e.target.value.split(',').map(s => s.trim()))} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest ml-1">Calculations & Costs</label>
                                <textarea className="w-full bg-black/40 border border-cyan-500/20 rounded-xl p-4 text-sm text-cyan-100 focus:outline-none focus:border-cyan-500/40 min-h-[80px]" value={localState.methodology.costs} onChange={(e) => updateState('methodology', 'costs', e.target.value)} />
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-orange-500/60 uppercase tracking-widest ml-1">Simulated Results Data (Manual Input)</label>
                                <textarea
                                    placeholder="e.g. Temperature reached 350C, Efficiency calculated at 78%, Cost-benefit ratio of 1.4:1..."
                                    className="w-full bg-black/40 border border-orange-500/20 rounded-xl p-4 text-sm text-orange-100 focus:outline-none focus:border-orange-500/40 min-h-[80px]"
                                    value={localState.methodology.results_data}
                                    onChange={(e) => updateState('methodology', 'results_data', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 6: REVIEW & GENERATE */}
                    {/* STEP 6: ACADEMIC FINISHING */}
                    {currentStep === 5 && (
                        <div className="space-y-4">
                            <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl flex items-start gap-4 mb-6">
                                <Info className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                                <p className="text-xs text-emerald-300/70 leading-relaxed italic">
                                    Provide the personal touches for your thesis. AI will use these to synthesize the Front Matter section.
                                </p>
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest ml-1">Dedication</label>
                                    <textarea
                                        placeholder="e.g. To my parents, for their unwavering support..."
                                        className="w-full bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500/40 min-h-[100px]"
                                        value={localState.finishing.dedication}
                                        onChange={(e) => updateState('finishing', 'dedication', e.target.value)}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest ml-1">Acknowledgements</label>
                                    <textarea
                                        placeholder="e.g. I am grateful to my supervisor, Dr. Solomon..."
                                        className="w-full bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500/40 min-h-[100px]"
                                        value={localState.finishing.acknowledgements}
                                        onChange={(e) => updateState('finishing', 'acknowledgements', e.target.value)}
                                    />
                                </div>
                            </div>
                            <div className="space-y-2">
                                <label className="text-[10px] font-bold text-emerald-500/60 uppercase tracking-widest ml-1">Preface / Personal Note</label>
                                <textarea
                                    placeholder="Brief background on how you chose this topic..."
                                    className="w-full bg-black/40 border border-emerald-500/20 rounded-xl p-4 text-sm text-emerald-100 focus:outline-none focus:border-emerald-500/40 min-h-[80px]"
                                    value={localState.finishing.preface}
                                    onChange={(e) => updateState('finishing', 'preface', e.target.value)}
                                />
                            </div>
                        </div>
                    )}

                    {/* STEP 7: REVIEW & GENERATE */}
                    {currentStep === 6 && (
                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl flex flex-col items-center text-center">
                                    <CheckCircle2 className="w-10 h-10 text-emerald-400/50 mb-3" />
                                    <h4 className="text-sm font-bold text-emerald-300 mb-1">Thesis Package Ready</h4>
                                    <button onClick={handleSynthesize} className="mt-3 px-6 py-2 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest">Generate .docx</button>
                                </div>
                                <div className="p-4 bg-cyan-500/5 border border-cyan-500/20 rounded-2xl flex flex-col items-center text-center">
                                    <div className="relative">
                                        <Play className={`w-10 h-10 ${isSynthesizing ? 'text-cyan-400 animate-pulse' : 'text-cyan-400/50'} mb-3`} />
                                        {isSynthesizing && <Loader2 className="w-5 h-5 text-cyan-400 animate-spin absolute bottom-3 -right-2" />}
                                    </div>
                                    <h4 className="text-sm font-bold text-cyan-300 mb-1">Synthesize Chapters</h4>
                                    <span className="text-[9px] uppercase tracking-widest text-cyan-500/50 mb-3">
                                        {synthStatus || 'AI Synthesis v1.0'}
                                    </span>
                                    <button
                                        onClick={handleSynthesizeChapters}
                                        disabled={isSynthesizing}
                                        className="px-6 py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-full text-[10px] font-bold uppercase tracking-widest transition-all disabled:opacity-50"
                                    >
                                        {isSynthesizing ? 'Orchestrating...' : 'Start Engine'}
                                    </button>
                                </div>
                            </div>

                            {/* Research Map (Holographic Placeholder) */}
                            <div className="mt-8 p-6 bg-cyan-500/5 border border-cyan-500/10 rounded-2xl">
                                <div className="text-[10px] font-bold text-cyan-500/40 uppercase tracking-widest mb-4 flex items-center gap-2">
                                    <Layout className="w-3.5 h-3.5" />
                                    Holographic Research Map
                                </div>
                                <div className="h-32 border border-dashed border-cyan-500/20 rounded-xl flex items-center justify-center bg-black/40 group overflow-hidden relative">
                                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-emerald-500/5"></div>
                                    <div className="flex gap-4 relative z-10">
                                        {['CH1', 'CH2', 'CH3', 'CH4', 'CH5'].map((ch, i) => (
                                            <div key={ch} className="w-12 h-16 bg-cyan-500/10 border border-cyan-500/30 rounded-lg flex flex-col items-center justify-center gap-1 group-hover:scale-110 transition-transform cursor-pointer" style={{ transitionDelay: `${i * 100}ms` }}>
                                                <div className="text-[8px] font-bold text-cyan-300">{ch}</div>
                                                <div className={`w-2 h-2 rounded-full ${project.draft_content[`Chapter ${i + 1}`] ? 'bg-emerald-400' : 'bg-cyan-500/20 animate-pulse'}`}></div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Wizard Footer */}
            <div className="p-4 border-t border-cyan-500/10 flex justify-between items-center bg-black/20 shrink-0">
                <button
                    disabled={currentStep === 0}
                    onClick={() => setCurrentStep(prev => prev - 1)}
                    className="flex items-center gap-2 px-4 py-2 text-cyan-500 hover:text-cyan-300 disabled:opacity-0 transition-all font-bold uppercase tracking-widest text-xs"
                >
                    <ChevronLeft className="w-4 h-4" />
                    Back
                </button>

                <div className="flex items-center gap-4">
                    {currentStep < 6 && (
                        <button
                            onClick={() => setCurrentStep(prev => prev + 1)}
                            className="flex items-center gap-2 px-6 py-2 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-200 border border-cyan-500/40 rounded-lg shadow-[0_0_20px_rgba(34,211,238,0.15)] transition-all active:scale-95 font-bold uppercase tracking-widest text-xs"
                        >
                            Next Phase
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { BookOpen, GraduationCap, Plus, FileText, CheckCircle, ArrowRight, Save, Layout, FileDown, Bookmark, PenTool, Edit3, Check, Presentation, Loader2, Cog, Printer } from 'lucide-react';
import { AcademicDashboard } from './AcademicDashboard';
import { AcademicWizard } from './AcademicWizard';
import { ComplianceSidebar } from './ComplianceSidebar';
import { AcademicProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { ResearchService, BibliographyStyle } from '../services/researchService';
import { generateDefenseDeck } from '../services/DefenseDeckGenerator';
import { FormulaEditor } from '../components/FormulaEditor';
import { DefenseDeckUI } from './DefenseDeckUI';
import { runAutonomousResearch, DeepResearchResult, ResearchEvidence } from '../services/AutonomousResearcher';
import { Sigma, X, Microscope, Info, Terminal, Link, Zap, HardDrive, Image as ImageIcon, Table as TableIcon, Plus, ExternalLink } from 'lucide-react';
import { ProjectResources } from './ProjectResources';
import { bridgeClient } from '../services/bridgeClient';
import { runGroqGenerate } from '../services/groqService';
import { ModelCreator } from './ModelCreator';
import { AcademicModel } from '../models/AcademicModels';


export const AcademicHub: React.FC = () => {
    const { addAcademicProject, updateAcademicProject } = useWorkspace();
    const [selectedProject, setSelectedProject] = useState<AcademicProject | null>(null);
    const [isWizardOpen, setIsWizardOpen] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
    const [deckMarkdown, setDeckMarkdown] = useState<string | null>(null);
    const [isFormulaEditorOpen, setIsFormulaEditorOpen] = useState(false);
    const [isResearching, setIsResearching] = useState(false);
    const [researchResult, setResearchResult] = useState<DeepResearchResult | null>(null);
    const [isVaulting, setIsVaulting] = useState(false);
    const [isSynthesizing, setIsSynthesizing] = useState(false);
    const [isModelCreatorOpen, setIsModelCreatorOpen] = useState(false);
    const [bibStyle, setBibStyle] = useState<BibliographyStyle>('apa');

    const handleSaveNewModel = (model: AcademicModel) => {
        try {
            const existingModels = localStorage.getItem('eldoria-custom-models');
            const models = existingModels ? JSON.parse(existingModels) : [];
            models.push(model);
            localStorage.setItem('eldoria-custom-models', JSON.stringify(models));
            setIsModelCreatorOpen(false);
            alert(`Model "${model.name}" saved successfully!`);
        } catch (e) {
            console.error('Failed to save model', e);
        }
    };


    const handleUpdateDraft = (chapter: string, content: string) => {
        if (!selectedProject) return;
        const updatedDrafts = { ...selectedProject.draft_content, [chapter]: content };
        const updatedProject = { ...selectedProject, draft_content: updatedDrafts };
        setSelectedProject(updatedProject);
        updateAcademicProject(updatedProject);
    };

    const handleGenerateDeckPreview = async () => {
        if (!selectedProject) return;
        setIsGeneratingDeck(true);
        try {
            const deck = await generateDefenseDeck(selectedProject);
            setDeckMarkdown(deck);
        } catch (e) {
            console.error("Deck generation failed", e);
        } finally {
            setIsGeneratingDeck(false);
        }
    };

    const handleDeepResearch = async () => {
        if (!selectedProject) return;
        setIsResearching(true);
        try {
            const result = await runAutonomousResearch(selectedProject);
            setResearchResult(result);
        } catch (e) {
            console.error("Research failed", e);
        } finally {
            setIsResearching(false);
        }
    };

    const handleVaultArchive = async () => {
        if (!selectedProject) return;
        setIsVaulting(true);
        try {
            const result = await bridgeClient.archiveResearch(
                selectedProject.id,
                selectedProject.wizard_state.basics.title || 'Untitled Research',
                selectedProject.wizard_state,
                { last_vaulted: new Date().toISOString() }
            );
            if (result.success) {
                alert(`Research archived successfully to: ${result.entry.id}`);
            }
        } catch (e) {
            console.error("Vaulting failed", e);
        } finally {
            setIsVaulting(false);
        }
    };

    const handleSynthesizeThesis = async () => {
        if (!selectedProject) return;
        setIsSynthesizing(true);
        try {
            // Use the live project data from state for the direct synthesis
            const blob = await bridgeClient.synthesizeDirect(selectedProject);
            if (blob) {
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Thesis_${selectedProject.wizard_state.basics.title.replace(/\s+/g, '_') || 'Draft'}.docx`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } else {
                alert("Thesis synthesis failed. Ensure the Python Bridge is running.");
            }
        } catch (e) {
            console.error("Synthesis failed", e);
            alert("An error occurred during synthesis.");
        } finally {
            setIsSynthesizing(false);
        }
    };

    const handlePrintDraft = () => {
        if (!selectedProject) return;

        const printWindow = window.open('', '_blank');
        if (!printWindow) {
            alert("Please allow popups to print.");
            return;
        }

        // --- Selective Content Assembly & Robust Sanitization ---
        const chapters = [
            { name: 'Front Matter', content: selectedProject.draft_content['Front Matter'] },
            { name: 'Abstract', content: selectedProject.draft_content['Abstract'] },
            { name: 'Chapter 1: Introduction', content: selectedProject.draft_content['Chapter 1: Introduction'] },
            { name: 'Chapter 2: Literature Review', content: selectedProject.draft_content['Chapter 2: Literature Review'] },
            { name: 'Chapter 3: Materials & Methods', content: selectedProject.draft_content['Chapter 3: Materials & Methods'] },
            { name: 'Chapter 4: Results & Discussion', content: selectedProject.draft_content['Chapter 4: Results & Discussion'] },
            { name: 'Chapter 5: Conclusion & Recommendations', content: selectedProject.draft_content['Chapter 5: Conclusion & Recommendations'] }
        ];

        // Aggressive preamble regex
        // Aggressive preamble regex
        // Updated to handle Markdown prefixes (e.g. **Here is...) and colons, AND newlines ([\s\S])
        const preambleRegex = /^([\s\*\-_>]*)(To perform|I will|Sure|I'll|Certainly|Here is|Then, I'll proceed|In order to|Okay|I've|I can|I've noticed|First|I will first|Secondly|Let me)[\s\S]+?(\.|:|\n)/gim;

        let markdownContent = `# ${selectedProject.wizard_state.basics.title || 'ACADEMIC RESEARCH REPORT'}\n\n`;
        markdownContent += `**Investigator:** ${selectedProject.wizard_state.basics.author || 'N/A'}\n\n`;
        if (selectedProject.wizard_state.basics.regNumber) {
            markdownContent += `**Reg Number:** ${selectedProject.wizard_state.basics.regNumber}\n\n`;
        }
        markdownContent += `**Academic Year:** ${selectedProject.wizard_state.basics.year || '2024'}\n\n---\n\n`;

        chapters.forEach(ch => {
            if (ch.content) {
                // Sanitize chapter content individually (Multi-pass)
                let cleanedContent = ch.content.trim();
                let lastCleaned = "";
                while (cleanedContent !== lastCleaned) {
                    lastCleaned = cleanedContent;
                    cleanedContent = cleanedContent.replace(preambleRegex, '').trim();
                }

                if (cleanedContent) {
                    markdownContent += `## ${ch.name}\n\n${cleanedContent}\n\n`;
                }
            }
        });

        if (selectedProject.references?.length > 0) {
            markdownContent += `## REFERENCES\n\n`;
            selectedProject.references.forEach(ref => {
                markdownContent += `- ${ref.formattedApa || `${ref.authors} (${ref.year}). ${ref.title}.`}\n`;
            });
        }

        printWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>Draft Submission - ${selectedProject.wizard_state.basics.title}</title>
                <style>
                    @import url('https://fonts.googleapis.com/css2?family=Crimson+Pro:ital,wght@0,400;0,700;1,400&family=Inter:wght@400;700&display=swap');
                    body { 
                        font-family: 'Crimson Pro', serif; 
                        line-height: 1.8; 
                        color: #1a202c; 
                        max-width: 800px; 
                        margin: 40px auto; 
                        padding: 0 60px; 
                        background: white; 
                    }
                    .header { 
                        text-align: center; 
                        margin-bottom: 60px; 
                        border-bottom: 3px double #06b6d4; 
                        padding-bottom: 30px; 
                    }
                    .header .meta { 
                        font-family: 'Inter', sans-serif;
                        font-size: 10px; 
                        color: #718096; 
                        text-transform: uppercase; 
                        letter-spacing: 0.25em; 
                        font-weight: 800; 
                        margin-bottom: 15px; 
                    }
                    .header h1 { 
                        margin: 0; 
                        font-size: 32px; 
                        color: #0c4a6e; 
                        line-height: 1.1; 
                        font-weight: 700;
                    }
                    
                    #content { font-size: 16px; text-align: justify; }
                    h2 { 
                        font-family: 'Inter', sans-serif;
                        font-size: 18px; 
                        border-bottom: 1px solid #e2e8f0; 
                        padding-bottom: 10px; 
                        margin-top: 50px; 
                        color: #075985; 
                        text-transform: uppercase; 
                        letter-spacing: 0.1em; 
                        font-weight: 700;
                    }
                    p { margin-bottom: 1.5em; text-indent: 0; }
                    
                    blockquote { 
                        border-left: 4px solid #06b6d4; 
                        padding: 20px 30px; 
                        font-style: italic; 
                        color: #475569; 
                        margin: 30px 0; 
                        background: #f0f9ff; 
                    }
                    .footer { 
                        font-family: 'Inter', sans-serif;
                        text-align: center; 
                        margin-top: 100px; 
                        font-size: 9px; 
                        color: #94a3b8; 
                        border-top: 1px solid #f1f5f9; 
                        padding-top: 30px; 
                        font-weight: 600; 
                        text-transform: uppercase; 
                        letter-spacing: 0.2em; 
                    }
                    
                    @media print {
                        body { margin: 0; padding: 25mm; }
                        h2 { page-break-before: always; }
                    }
                </style>
            </head>
            <body>
                <div class="header">
                    <div class="meta">Strategic Academic Framework &bull; Draft Submission</div>
                    <h1>${(selectedProject.wizard_state.basics.title || 'UNTITLED RESEARCH').toUpperCase()}</h1>
                    <div style="margin-top: 25px; font-weight: 700; font-size: 14px; font-family: 'Inter', sans-serif; color: #1e293b;">PREPARED BY: ${(selectedProject.wizard_state.basics.author || 'N/A').toUpperCase()}</div>
                    <div style="font-size: 12px; color: #64748b; margin-top: 5px; font-family: 'Inter', sans-serif;">ACADEMIC SESSION: ${selectedProject.wizard_state.basics.year}</div>
                </div>
                <div id="content"></div>
                <div class="footer">
                    Eldoria AI Co-Pilot &bull; Project ID: ${selectedProject.id} &bull; Validated Draft Output
                </div>
                <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"></script>
                <script>
                    const rawContent = ${JSON.stringify(markdownContent)};
                    document.getElementById('content').innerHTML = marked.parse(rawContent);
                    window.onload = () => {
                        setTimeout(() => { window.print(); }, 1200);
                    };
                </script>
            </body>
            </html>
        `);
        printWindow.document.close();
    };

    const handleCopyBib = () => {
        if (!researchResult) return;
        const allSources = researchResult.evidenceChain.flatMap(ev => ev.sources);
        const bib = ResearchService.generateBibliography(allSources as any[], bibStyle);
        navigator.clipboard.writeText(bib);
        alert(`Bibliography (${bibStyle.toUpperCase()}) copied to clipboard!`);
    };

    const handleRunSAF = async (findings: string) => {
        if (!selectedProject) return;

        const systemPrompt = `You are Eldoria's SAF Analyst. Break down the following research findings into their core components using the Strategic Analysis Framework (SAF).
        Focus on:
        1. Core System (The main technical discovery)
        2. Dependencies (What makes this work?)
        3. Cascading Effects (Consequences of modifying this info)
        4. Academic Value (How it fits the thesis)
        
        Format as a structured technical deconstruction.`;

        try {
            alert("Eldoria is deconstructing these findings through the SAF framework...");
            const completion = await runGroqGenerate(
                [{ role: "user", content: `DECONSTRUCT THIS: ${findings}` }],
                { model: "llama-3.3-70b-versatile", system_prompt: systemPrompt }
            );

            const content = completion.choices?.[0]?.message?.content || "Deconstruction failed.";
            const name = `SAF Analysis: ${selectedProject.wizard_state.basics.title.substring(0, 20)}...`;

            // Note: createCanvas is normally available from WorkspaceContext, but here we would need to expose it or use bridge directly.
            // For now, alerting user.
            alert("SAF Deconstruction complete! Content: " + content);
        } catch (e) {
            console.error("SAF Deconstruction failed", e);
            alert("SAF Deconstruction failed. Check console for details.");
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
                compliance: { plagiarismChecked: false, wordCountValid: false, abstractReady: false },
                generationConfig: { targetPageCount: 80, depth: 'standard' }
            },
            draft_content: {},
            references: [],
            resources: []
        };
        addAcademicProject(newProject);
        setSelectedProject(newProject);
        setIsWizardOpen(true);
    };

    return (
        <div className="flex-grow flex gap-4 overflow-hidden h-full">
            {/* Model Creator Modal */}
            {isModelCreatorOpen && (
                <ModelCreator
                    onSave={handleSaveNewModel}
                    onCancel={() => setIsModelCreatorOpen(false)}
                />
            )}

            {/* Left Sidebar: Projects & Dashboard */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
                <button
                    onClick={() => setIsModelCreatorOpen(true)}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all"
                >
                    <Cog className="w-3.5 h-3.5" />
                    Create Custom Template
                </button>
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
                                        onClick={handleDeepResearch}
                                        disabled={isResearching}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isResearching ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 animate-pulse' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'}`}
                                    >
                                        {isResearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Microscope className="w-3.5 h-3.5" />}
                                        {isResearching ? 'Researching...' : 'Deep Research'}
                                    </button>
                                    <button
                                        onClick={() => setIsEditing(!isEditing)}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isEditing ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'}`}
                                    >
                                        {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                                        {isEditing ? 'Stop Editing' : 'Interactive Mode'}
                                    </button>
                                    <button
                                        onClick={handleGenerateDeckPreview}
                                        disabled={isGeneratingDeck}
                                        className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 transition-all disabled:opacity-50"
                                    >
                                        {isGeneratingDeck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                                        {isGeneratingDeck ? 'Synthesizing...' : 'Defense Deck'}
                                    </button>
                                    <NavLink to="/" className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2">
                                        <Layout className="w-3.5 h-3.5" />
                                        Warp to Workspace
                                    </NavLink>
                                    <button onClick={() => setIsWizardOpen(true)} className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/40 transition-all">Setup Wizard</button>
                                    <button
                                        onClick={handlePrintDraft}
                                        className="p-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg border border-cyan-500/20 transition-all mr-1"
                                        title="Print report preview"
                                    >
                                        <Printer className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={handleVaultArchive}
                                        disabled={isVaulting}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isVaulting ? 'bg-cyan-500/20 text-cyan-200 border-cyan-500/40 animate-pulse' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'}`}
                                        title="Archive to Neural Vault"
                                    >
                                        {isVaulting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <HardDrive className="w-3.5 h-3.5" />}
                                        {isVaulting ? 'Archiving...' : 'Vault Research'}
                                    </button>
                                    <button
                                        onClick={handleSynthesizeThesis}
                                        disabled={isSynthesizing}
                                        className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isSynthesizing ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40 animate-pulse' : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'}`}
                                        title="Generate Word Document"
                                    >
                                        {isSynthesizing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
                                        {isSynthesizing ? 'Synthesizing...' : 'Draft .DOCX'}
                                    </button>
                                    <button
                                        onClick={() => setIsFormulaEditorOpen(!isFormulaEditorOpen)}
                                        className={`p-1.5 rounded-md transition-colors ${isFormulaEditorOpen ? 'bg-cyan-500/20 text-cyan-200' : 'hover:bg-cyan-500/10 text-cyan-400'}`}
                                        title="Formula Bridge"
                                    >
                                        <Sigma className="w-4 h-4" />
                                    </button>
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

                    {/* Formula Editor Modal/Overlay */}
                    {isFormulaEditorOpen && (
                        <div className="absolute top-20 right-6 z-50 w-96 animate-in slide-in-from-right duration-300">
                            <div className="relative">
                                <button
                                    onClick={() => setIsFormulaEditorOpen(false)}
                                    className="absolute top-3 right-3 p-1.5 hover:bg-white/10 rounded-full text-cyan-500/40 hover:text-cyan-100 transition-colors z-[60]"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                                <FormulaEditor />
                            </div>
                        </div>
                    )}

                    {/* Defense Deck Modal */}
                    {deckMarkdown && (
                        <DefenseDeckUI
                            markdown={deckMarkdown}
                            onClose={() => setDeckMarkdown(null)}
                        />
                    )}

                    {/* Deep Research Results Modal */}
                    {researchResult && (
                        <div className="fixed inset-0 z-[110] bg-[#0c1a3e]/95 backdrop-blur-xl flex items-center justify-center p-12 overflow-y-auto custom-scrollbar">
                            <div className="w-full max-w-4xl bg-black/40 border border-cyan-500/20 rounded-[2rem] p-12 relative animate-in zoom-in-95 duration-500">
                                <button onClick={() => setResearchResult(null)} className="absolute top-8 right-8 p-3 bg-white/5 hover:bg-white/10 rounded-xl border border-white/5 text-white/40 hover:text-white transition-all">
                                    <X className="w-5 h-5" />
                                </button>

                                <div className="flex items-center gap-6 mb-12">
                                    <div className="p-4 bg-purple-500/20 rounded-2xl border border-purple-500/30">
                                        <Microscope className="w-8 h-8 text-purple-400" />
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.3em]">Autonomous Research Synthesis</h2>
                                        <p className="text-xs text-purple-400 font-bold uppercase tracking-widest mt-1">Llama 3.3 Versatile • Recursive Evidence Chain Active</p>
                                    </div>
                                </div>

                                <div className="space-y-12">
                                    <section>
                                        <div className="flex items-center gap-2 mb-4 text-cyan-400">
                                            <Info className="w-4 h-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Heuristic Analysis</h4>
                                        </div>
                                        <p className="text-[13px] text-cyan-100/70 leading-relaxed font-serif text-justify">{researchResult.analysis}</p>
                                    </section>

                                    <section>
                                        <div className="flex items-center gap-2 mb-6 text-purple-400">
                                            <Terminal className="w-4 h-4" />
                                            <h4 className="text-[10px] font-black uppercase tracking-widest">Evidence Chain</h4>
                                        </div>
                                        <div className="grid gap-4">
                                            {researchResult.evidenceChain.map((ev, i) => (
                                                <div key={i} className="p-6 bg-white/[0.02] border border-white/5 rounded-2xl">
                                                    <div className="text-[9px] font-black text-purple-400 uppercase tracking-widest mb-2">Query: {ev.query}</div>
                                                    <p className="text-[11px] text-white/60 leading-relaxed italic mb-4">"{ev.findings}"</p>
                                                    <div className="flex gap-2 mb-4">
                                                        <button
                                                            onClick={() => handleRunSAF(ev.findings)}
                                                            className="px-2 py-0.5 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded text-[7px] font-black text-purple-400 uppercase tracking-widest transition-all"
                                                        >
                                                            RUN SAF DECONSTRUCTION
                                                        </button>
                                                        <button
                                                            onClick={async () => {
                                                                // Note: this hook isn't directly exposed here, would need to be passed in.
                                                                alert("Inserting into canvas...");
                                                            }}
                                                            className="px-2 py-0.5 bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/30 rounded text-[7px] font-black text-cyan-400 uppercase tracking-widest transition-all"
                                                        >
                                                            INSERT INTO CANVAS
                                                        </button>
                                                    </div>
                                                    <div className="flex flex-wrap gap-2 mb-4">
                                                        {ev.sources.map((src, j) => (
                                                            <a key={j} href={src.url} target="_blank" rel="noopener noreferrer" className={`px-3 py-1 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-[9px] transition-all flex items-center gap-2 ${'type' in src && src.type !== 'web' ? 'text-purple-400 border-purple-500/30' : 'text-cyan-400'}`}>
                                                                {'type' in src && src.type !== 'web' ? <GraduationCap className="w-2.5 h-2.5" /> : <Link className="w-2.5 h-2.5" />}
                                                                {src.title}
                                                            </a>
                                                        ))}
                                                    </div>

                                                    {ev.media && (
                                                        <div className="space-y-4">
                                                            {ev.media.images.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2 text-[8px] font-bold text-white/40 uppercase tracking-widest">
                                                                        <ImageIcon className="w-3 h-3 text-purple-400" />
                                                                        Extracted Visuals
                                                                    </div>
                                                                    <div className="flex gap-4 overflow-x-auto pb-2 custom-scrollbar">
                                                                        {ev.media.images.map((img, k) => (
                                                                            <div key={k} className="shrink-0 group relative">
                                                                                <img
                                                                                    src={img.src}
                                                                                    alt={img.alt}
                                                                                    className="h-24 rounded-lg border border-white/10 bg-black/20 object-cover hover:border-purple-500/50 transition-all cursor-pointer"
                                                                                    onClick={() => window.open(img.src, '_blank')}
                                                                                />
                                                                                <button
                                                                                    title="Insert into active canvas"
                                                                                    className="absolute top-1 right-1 p-1 bg-purple-500 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                                                >
                                                                                    <Plus className="w-3 h-3 text-white" />
                                                                                </button>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}

                                                            {ev.media.tables.length > 0 && (
                                                                <div>
                                                                    <div className="flex items-center gap-2 mb-2 text-[8px] font-bold text-white/40 uppercase tracking-widest">
                                                                        <TableIcon className="w-3 h-3 text-cyan-400" />
                                                                        Extracted Tables
                                                                    </div>
                                                                    <div className="grid gap-2">
                                                                        {ev.media.tables.map((tab, k) => (
                                                                            <div key={k} className="p-3 bg-cyan-500/5 border border-cyan-500/20 rounded-lg flex items-center justify-between group">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-2 bg-cyan-500/20 rounded-md">
                                                                                        <TableIcon className="w-3 h-3 text-cyan-400" />
                                                                                    </div>
                                                                                    <div>
                                                                                        <div className="text-[9px] font-bold text-cyan-100">{tab.caption || `Table ${k + 1}`}</div>
                                                                                        <div className="text-[8px] text-cyan-400/50">{tab.headers.length} columns • {tab.rows.length} rows</div>
                                                                                    </div>
                                                                                </div>
                                                                                <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                                                    <button className="px-2 py-1 bg-cyan-500/20 hover:bg-cyan-500/30 text-[8px] font-bold text-cyan-400 rounded-md border border-cyan-500/30">VIEW DATA</button>
                                                                                    <button className="p-1 bg-cyan-500 text-white rounded-md"><Plus className="w-3 h-3" /></button>
                                                                                </div>
                                                                            </div>
                                                                        ))}
                                                                    </div>
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </section>


                                    <section>
                                        <div className="flex items-center justify-between mb-4 text-emerald-400">
                                            <div className="flex items-center gap-2">
                                                <Zap className="w-4 h-4" />
                                                <h4 className="text-[10px] font-black uppercase tracking-widest">Suggested Thesis Updates</h4>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <select
                                                    value={bibStyle}
                                                    onChange={(e) => setBibStyle(e.target.value as BibliographyStyle)}
                                                    className="bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-[8px] font-bold text-cyan-400 uppercase tracking-widest outline-none hover:border-cyan-500/30 transition-all"
                                                >
                                                    <option value="apa">APA</option>
                                                    <option value="ieee">IEEE</option>
                                                    <option value="bibtex">BibTeX</option>
                                                </select>
                                                <button
                                                    onClick={handleCopyBib}
                                                    className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500/30 text-[8px] font-black text-emerald-400 rounded-lg border border-emerald-500/30 transition-all"
                                                >
                                                    COPY BIBLIOGRAPHY
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            {researchResult.suggestedUpdates.map((upd, i) => (
                                                <div key={i} className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-[10px] text-emerald-100/60 leading-relaxed italic">
                                                    {upd}
                                                </div>
                                            ))}
                                        </div>
                                    </section>

                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Right Sidebar: Compliance & Resources */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
                <ComplianceSidebar project={selectedProject} />
                {selectedProject && (
                    <div className="h-1/2 flex flex-col overflow-hidden">
                        <ProjectResources project={selectedProject} />
                    </div>
                )}
            </div>
        </div>
    );
};

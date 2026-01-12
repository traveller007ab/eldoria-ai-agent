/**
 * Academic Hub - Original with Enhanced Agentic Mode
 * 
 * - Keeps original standard mode (3-column layout)
 * - Uses new AgenticDashboard for agentic mode
 * - Enhanced UI throughout
 */

import React, { useState, useEffect, useCallback } from 'react';
import { NavLink } from 'react-router-dom';
import {
  BookOpen, GraduationCap, Plus, FileText, CheckCircle, ArrowRight,
  Save, Layout, FileDown, Bookmark, PenTool, Edit3, Check, Presentation,
  Loader2, Cog, Printer, Brain, Sparkles, Settings, ChevronRight,
  Zap, Microscope, Mic, BarChart3, Users, Cloud, MessageSquare,
  LayoutDashboard, FileDiff, Search, Bell, Lightbulb, Wrench,
  Download, WifiOff, Wifi, Target, TrendingUp, Clock, AlertTriangle
} from 'lucide-react';
import { AcademicDashboard } from './AcademicDashboard';
import { AcademicWizard } from './AcademicWizard';
import { ComplianceSidebar } from './ComplianceSidebar';
import { AcademicProject, Reference } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { ResearchService, BibliographyStyle } from '../services/researchService';
import { generateDefenseDeck } from '../services/DefenseDeckGenerator';
import { DefenseDeckUI } from './DefenseDeckUI';
import { ProjectResources } from './ProjectResources';
import { bridgeClient } from '../services/bridgeClient';
import { runGroqGenerate } from '../services/groqService';
import { ModelCreator } from './ModelCreator';
import { AcademicModel, getModelById } from '../models/AcademicModels';
import { runAutonomousResearch, DeepResearchResult } from '../services/AutonomousResearcher';
import { ExportPanel } from './ExportPanel';
import { PromptCustomizer } from './PromptCustomizer';
import { AgenticOrchestrator, AgentEvent } from './agentic/AgenticOrchestrator';
import { CollaboratorPanel } from './CollaboratorPanel';

// NEW: Import Agentic Dashboard
import { AgenticDashboard } from './components/Agentic/AgenticDashboard';
import { Button, Card, CardTitle } from './components/Common';
import './AcademicHub.css';

type Mode = 'standard' | 'agentic';

interface AgentInsight {
  id: string;
  type: 'info' | 'suggestion' | 'warning' | 'success';
  category: string;
  title: string;
  message: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actions?: { id: string; label: string; type: string }[];
  read?: boolean;
}

interface ProgressMetrics {
  totalWords: number;
  targetWords: number;
  percentComplete: number;
  chaptersCompleted: number;
  totalChapters: number;
  referencesCount: number;
  dailyWordTarget: number;
  daysRemaining: number;
}

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
  const [isPrintMenuOpen, setIsPrintMenuOpen] = useState(false);

  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isPromptCustomizerOpen, setIsPromptCustomizerOpen] = useState(false);
  const [isCollaboratorOpen, setIsCollaboratorOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  const [mode, setMode] = useState<Mode>('standard');
  const [agentInsights, setAgentInsights] = useState<AgentInsight[]>([]);
  const [isAgentActive, setIsAgentActive] = useState(false);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>({
    totalWords: 0,
    targetWords: 15000,
    percentComplete: 0,
    chaptersCompleted: 0,
    totalChapters: 7,
    referencesCount: 0,
    dailyWordTarget: 500,
    daysRemaining: 30
  });

  // Load saved mode preference
  useEffect(() => {
    const savedMode = localStorage.getItem('academicHubMode') as Mode;
    if (savedMode) {
      setMode(savedMode);
    }
  }, []);

  // Update progress metrics when project changes
  useEffect(() => {
    if (selectedProject && mode === 'agentic') {
      calculateProgressMetrics(selectedProject);
    }
  }, [selectedProject, mode]);

  // Initialize Agentic Orchestrator
  useEffect(() => {
    if (mode === 'agentic' && selectedProject) {
      AgenticOrchestrator.initialize(selectedProject);
      setIsAgentActive(true);

      const unsubscribe = AgenticOrchestrator.subscribe((event: AgentEvent) => {
        const insight: AgentInsight = {
          id: event.id,
          type: event.type === 'warning' ? 'warning' :
            event.type === 'deadline_alert' ? 'warning' :
              event.type === 'suggestion' ? 'suggestion' : 'info',
          category: event.source,
          title: event.title,
          message: event.message,
          confidence: 0.8,
          priority: event.priority,
          timestamp: event.timestamp,
          actions: event.actions?.map(a => ({ id: a.id, label: a.label, type: a.type })),
          read: event.read
        };
        setAgentInsights(prev => [insight, ...prev].slice(0, 20));
      });

      const existingEvents = AgenticOrchestrator.getEvents();
      const mappedInsights: AgentInsight[] = existingEvents.map((event: AgentEvent) => ({
        id: event.id,
        type: (event.type === 'warning' ? 'warning' :
          event.type === 'deadline_alert' ? 'warning' :
            event.type === 'suggestion' ? 'suggestion' : 'info') as 'info' | 'suggestion' | 'warning' | 'success',
        category: event.source,
        title: event.title,
        message: event.message,
        confidence: 0.8,
        priority: event.priority as 'low' | 'medium' | 'high' | 'critical',
        timestamp: event.timestamp,
        actions: event.actions?.map(a => ({ id: a.id, label: a.label, type: a.type })),
        read: event.read
      }));
      setAgentInsights(mappedInsights);

      return () => {
        unsubscribe();
        AgenticOrchestrator.stopAgents();
      };
    } else {
      AgenticOrchestrator.stopAgents();
      setIsAgentActive(false);
    }
  }, [mode, selectedProject]);

  const calculateProgressMetrics = (project: AcademicProject) => {
    const draftContent = project.draft_content || {};
    let totalWords = 0;
    let chaptersCompleted = 0;

    Object.values(draftContent).forEach(content => {
      const words = (content as string).split(/\s+/).length;
      totalWords += words;
      if (words > 500) chaptersCompleted++;
    });

    const targetWords = project.wizard_state?.generationConfig?.targetPageCount
      ? project.wizard_state.generationConfig.targetPageCount * 250
      : 15000;

    setProgressMetrics(prev => ({
      ...prev,
      totalWords,
      targetWords,
      percentComplete: Math.min(100, (totalWords / targetWords) * 100),
      chaptersCompleted,
      referencesCount: project.references?.length || 0
    }));
  };

  const markInsightRead = useCallback((insightId: string) => {
    setAgentInsights(prev => prev.map(i =>
      i.id === insightId ? { ...i, read: true } : i
    ));
    AgenticOrchestrator.markRead(insightId);
  }, []);

  const handleDeepResearch = useCallback(async () => {
    if (!selectedProject) return;
    setIsResearching(true);
    try {
      const result = await runAutonomousResearch(selectedProject);
      setResearchResult(result);
    } catch (error) {
      console.error('Research failed:', error);
    } finally {
      setIsResearching(false);
    }
  }, [selectedProject]);

  const handleAgentAction = useCallback((actionId: string, payload?: any) => {
    switch (actionId) {
      case 'discover_citations':
      case 'add-citations':
        if (selectedProject) handleDeepResearch();
        break;
    }
  }, [selectedProject, handleDeepResearch]);

  const handleGenerateDeckPreview = useCallback(async () => {
    if (!selectedProject) return;
    setIsGeneratingDeck(true);
    try {
      const markdown = await generateDefenseDeck(selectedProject);
      setDeckMarkdown(markdown);
    } catch (error) {
      console.error('Deck generation failed:', error);
    } finally {
      setIsGeneratingDeck(false);
    }
  }, [selectedProject]);

  const handleNewProject = useCallback(() => {
    const newProject: AcademicProject = {
      id: crypto.randomUUID(),
      name: 'New Research Project',
      format: 'rsu-mech-eng',
      created_at: new Date().toISOString(),
      resources: [],
      wizard_state: {
        step: 0,
        basics: { title: '', author: '', regNumber: '', year: new Date().getFullYear().toString() },
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
      modelId: 'rsu-mech-eng'
    };
    addAcademicProject(newProject);
    setSelectedProject(newProject);
    setIsWizardOpen(true);
  }, [addAcademicProject]);

  const handleSaveNewModel = useCallback((model: AcademicModel) => {
    console.log('New model saved:', model);
    setIsModelCreatorOpen(false);
  }, []);

  const handleUpdateDraft = useCallback((section: string, content: string) => {
    if (!selectedProject) return;
    const updated = {
      ...selectedProject,
      draft_content: {
        ...selectedProject.draft_content,
        [section]: content
      }
    };
    updateAcademicProject(updated);
    setSelectedProject(updated);
  }, [selectedProject, updateAcademicProject]);

  return (
    <div className="academic-hub flex-grow flex flex-col overflow-hidden h-full">
      {isModelCreatorOpen && (
        <div className="ah-modal-overlay">
          <div className="ah-modal-overlay__content">
            <ModelCreator onSave={handleSaveNewModel} onCancel={() => setIsModelCreatorOpen(false)} />
          </div>
        </div>
      )}

      {isExportPanelOpen && selectedProject && (
        <div className="ah-modal-overlay">
          <div className="ah-modal-overlay__content">
            <ExportPanel project={selectedProject} onClose={() => setIsExportPanelOpen(false)} />
          </div>
        </div>
      )}

      {isPromptCustomizerOpen && selectedProject && (
        <div className="ah-modal-overlay">
          <div className="ah-modal-overlay__content">
            <PromptCustomizer
              model={getModelById(selectedProject.modelId || selectedProject.format || 'rsu-mech-eng') || {
                id: 'default', name: 'Default', institution: '', department: '',
                description: '', citationStyle: 'APA', version: '1.0', author: '',
                createdAt: '', chapters: [], formatting: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 2, marginInches: 1 },
                targets: { totalMinWords: 10000, totalMaxWords: 50000, minReferences: 10, abstractMaxWords: 300 },
                wizardFields: { showRegNumber: true, showSupervisor: true, showCoSupervisor: false, customFields: [] },
                aiConfig: { systemPrompt: 'You are an academic writing assistant.', temperature: 0.6, model: 'llama-3.3-70b-versatile' }
              }}
              onSave={(prompts) => { console.log('Custom prompts saved:', prompts); setIsPromptCustomizerOpen(false); }}
              onClose={() => setIsPromptCustomizerOpen(false)}
            />
          </div>
        </div>
      )}

      {isCollaboratorOpen && selectedProject && (
        <div className="ah-modal-overlay">
          <div className="ah-modal-overlay__content">
            <CollaboratorPanel
              project={selectedProject}
              onClose={() => setIsCollaboratorOpen(false)}
              onImport={(imported) => { setSelectedProject(imported); setIsCollaboratorOpen(false); }}
            />
          </div>
        </div>
      )}

      {deckMarkdown && (
        <DefenseDeckUI markdown={deckMarkdown} onClose={() => setDeckMarkdown(null)} />
      )}

      {isWizardOpen && selectedProject && (
        <div className="ah-modal-overlay">
          <div className="ah-modal-overlay__content ah-modal-overlay__content--full">
            <AcademicWizard project={selectedProject} onClose={() => setIsWizardOpen(false)} />
          </div>
        </div>
      )}

      {/* Always visible header with mode toggle */}
      <div className="ah-header shrink-0" style={{ background: mode === 'agentic' ? 'linear-gradient(90deg, var(--ah-agentic-soft), transparent)' : 'linear-gradient(90deg, var(--ah-accent-soft), transparent)' }}>
        <div className="flex items-center gap-4">
          <NavLink to="/" className="flex items-center gap-2 px-3 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all">
            <Layout className="w-3.5 h-3.5" />
            Warp to Workspace
          </NavLink>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-emerald-500/20 rounded-lg">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <div className="text-sm font-bold text-emerald-200 uppercase tracking-wider">Academic Hub</div>
              <div className="text-[9px] text-emerald-500/60 uppercase tracking-wider">Research Thesis Engine</div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-6">
          <div className="flex items-center gap-3">
            <div className={`flex items-center gap-2 ${mode === 'standard' ? 'text-cyan-300' : 'text-slate-400'}`}>
              <Brain className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Standard</span>
            </div>

            <button
              onClick={() => {
                const newMode: Mode = mode === 'standard' ? 'agentic' : 'standard';
                setMode(newMode);
                localStorage.setItem('academicHubMode', newMode);
              }}
              className={`relative w-14 h-7 rounded-full transition-all duration-300 ${mode === 'agentic'
                ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25'
                : 'bg-gradient-to-r from-cyan-600 to-emerald-600'
                }`}
            >
              <div className={`absolute top-0.5 w-6 h-6 rounded-full bg-white shadow-md transition-all duration-300 flex items-center justify-center ${mode === 'agentic' ? 'left-7' : 'left-0.5'
                }`}>
                {mode === 'agentic' ? (
                  <Sparkles className="w-3 h-3 text-purple-500 animate-pulse" />
                ) : (
                  <Brain className="w-3 h-3 text-cyan-500" />
                )}
              </div>
            </button>

            <div className={`flex items-center gap-2 ${mode === 'agentic' ? 'text-purple-400' : 'text-cyan-300'}`}>
              <Sparkles className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Agentic</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold uppercase tracking-widest border ${isOnline
            ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
            : 'bg-red-500/10 text-red-400 border-red-500/20'
            }`}>
            {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
            {isOnline ? 'Online' : 'Offline'}
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-800/50 rounded-lg text-cyan-400 text-xs font-bold uppercase tracking-widest border border-cyan-500/20">
            <Cog className="w-3.5 h-3.5" />
            v2.0
          </div>
        </div>
      </div>

      {/* Render based on mode */}
      {mode === 'agentic' ? (
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Main Layout - Horizontal with Sidebar */}
          <div className="ah-content gap-4 p-4 flex-grow overflow-hidden">
            {/* Left Column: Projects & Dashboard */}
            <div className="w-80 shrink-0 flex flex-col gap-4 overflow-hidden">
              <button
                onClick={() => setIsModelCreatorOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-xl text-[10px] font-bold uppercase tracking-widest border border-purple-500/20 transition-all"
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

            {/* Center: Agentic Dashboard */}
            <div className="flex-grow flex flex-col gap-4 overflow-hidden">
              <AgenticDashboard
                projectId={selectedProject?.id || ''}
                project={selectedProject ? {
                  id: selectedProject.id,
                  wizard_state: {
                    basics: {
                      title: selectedProject.wizard_state.basics.title,
                      author: selectedProject.wizard_state.basics.author,
                    }
                  },
                  draft_content: selectedProject.draft_content,
                  references: selectedProject.references || [],
                } : undefined}
                onOpenWizard={() => setIsWizardOpen(true)}
                onOpenExport={() => setIsExportPanelOpen(true)}
                onOpenCustomizer={() => setIsPromptCustomizerOpen(true)}
                onNewProject={handleNewProject}
                onSelectProject={(project) => {
                  setSelectedProject(project);
                  setIsWizardOpen(true);
                }}
              />
            </div>

            {/* Right Column: Compliance & Auditor */}
            <div className="w-80 shrink-0 flex flex-col overflow-hidden">
              <ComplianceSidebar project={selectedProject} />
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Main Layout - Horizontal 3-Column */}
          <div className="ah-content gap-4 p-4 flex-grow overflow-hidden">
            {/* Left Column: Projects & Dashboard */}
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

            {/* Center Column */}
            <div className="flex-grow flex flex-col gap-4 overflow-hidden relative">
              <div className="panel flex-grow flex flex-col overflow-hidden relative">
                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-emerald-500 via-cyan-500 to-emerald-500 opacity-50"></div>

                {selectedProject ? (
                  <div className="flex-grow flex flex-col overflow-hidden bg-black/40">
                    <div className="p-6 border-b border-cyan-500/10 flex items-center justify-between bg-cyan-500/5">
                      <div>
                        <h3 className="text-sm font-bold text-cyan-200 uppercase tracking-widest">{selectedProject.wizard_state.basics.title || 'Draft Thesis Preview'}</h3>
                        <p className="text-[10px] text-cyan-500/60 mt-1 italic uppercase tracking-tighter">Draft Structure & AI Content</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button onClick={() => setIsExportPanelOpen(true)} className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all">
                          <Download className="w-3.5 h-3.5" />Export
                        </button>
                        <button onClick={() => setIsPromptCustomizerOpen(true)} className="flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-purple-500/20 transition-all">
                          <Settings className="w-3.5 h-3.5" />Customize AI
                        </button>
                        <button onClick={handleDeepResearch} disabled={isResearching} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isResearching ? 'bg-purple-500/20 text-purple-200 border-purple-500/40 animate-pulse' : 'bg-purple-500/10 text-purple-400 border-purple-500/20 hover:bg-purple-500/20'}`}>
                          {isResearching ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Microscope className="w-3.5 h-3.5" />}
                          {isResearching ? 'Researching...' : 'Deep Research'}
                        </button>
                        <button onClick={() => setIsEditing(!isEditing)} className={`flex items-center gap-2 px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all ${isEditing ? 'bg-emerald-500/20 text-emerald-100 border-emerald-500/40' : 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20 hover:bg-cyan-500/20'}`}>
                          {isEditing ? <Check className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                          {isEditing ? 'Stop Editing' : 'Interactive Mode'}
                        </button>
                        <button onClick={handleGenerateDeckPreview} disabled={isGeneratingDeck} className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/20 transition-all disabled:opacity-50">
                          {isGeneratingDeck ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Presentation className="w-3.5 h-3.5" />}
                          {isGeneratingDeck ? 'Synthesizing...' : 'Defense Deck'}
                        </button>
                        <NavLink to="/" className="px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all flex items-center gap-2">
                          <Layout className="w-3.5 h-3.5" />Warp to Workspace
                        </NavLink>
                        <button onClick={() => setIsWizardOpen(true)} className="px-4 py-1.5 bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-100 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-cyan-500/40 transition-all">Setup Wizard</button>
                      </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-12">
                      <div className="max-w-3xl mx-auto space-y-12">
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
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-grow flex flex-col items-center justify-center bg-black/40">
                    <div className="flex flex-col items-center gap-6 p-12 bg-emerald-500/5 border border-emerald-500/10 rounded-3xl max-w-lg">
                      <div className="p-4 bg-emerald-500/10 rounded-full">
                        <GraduationCap className="w-12 h-12 text-emerald-400" />
                      </div>
                      <div className="text-center">
                        <h2 className="text-2xl font-bold text-emerald-400 mb-2">Welcome to Academic Hub</h2>
                        <p className="text-sm text-slate-400 mb-6">Create a new project or select an existing one to begin your research journey</p>
                      </div>
                      <div className="flex gap-4">
                        <button onClick={handleNewProject} className="flex items-center gap-2 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black rounded-xl font-bold transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)]">
                          <Plus className="w-5 h-5" />New Project
                        </button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Compliance & Auditor */}
            <div className="w-80 shrink-0 flex flex-col overflow-hidden">
              <ComplianceSidebar project={selectedProject} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AcademicHub;

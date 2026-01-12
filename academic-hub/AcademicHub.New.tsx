/**
 * Academic Hub - Integrated with New Components
 * 
 * This version integrates the new 3-column layout, wizard, and agentic dashboard
 */

import React, { useState, useEffect, useCallback } from 'react';
import { 
  BookOpen, GraduationCap, Plus, FileText, Save, 
  Settings, Brain, Sparkles, Layout, Download,
  Loader2, Microscope, Check, Edit3, Presentation
} from 'lucide-react';
import { AcademicDashboard } from './AcademicDashboard';
import { AcademicWizard } from './AcademicWizard';
import { ComplianceSidebar } from './ComplianceSidebar';
import { AcademicProject, Reference } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { ExportPanel } from './ExportPanel';
import { PromptCustomizer } from './PromptCustomizer';
import { AgenticOrchestrator, AgentEvent } from './agentic/AgenticOrchestrator';
import { CollaboratorPanel } from './CollaboratorPanel';
import { DefenseDeckUI } from './DefenseDeckUI';

// Import new components
import { Header, ThreeColumnLayout } from './components/Layout';
import { Wizard } from './components/Wizard';
import { AgenticDashboard } from './components/Agentic/AgenticDashboard';
import { Button, Card, CardTitle } from './components/Common';
import { academicApi } from '../services/apiClient';
import './AcademicHub.css';

type Mode = 'standard' | 'agentic';

interface AgentInsight {
  id: string;
  type: 'info' | 'suggestion' | 'warning' | 'success';
  category: string;
  title: string;
  message: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high';
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

// Template data for the new layout
const TEMPLATES = [
  { id: 'rsu-mech-eng', name: 'RSU Mechanical Engineering', institution: 'Rivers State University', chapters: 5 },
  { id: 'rsu-civil', name: 'RSU Civil Engineering', institution: 'Rivers State University', chapters: 5 },
  { id: 'general', name: 'General Thesis Template', institution: 'Custom', chapters: 5 },
];

export const AcademicHub: React.FC = () => {
  const { addAcademicProject, updateAcademicProject } = useWorkspace();
  const [selectedProject, setSelectedProject] = useState<AcademicProject | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGeneratingDeck, setIsGeneratingDeck] = useState(false);
  const [deckMarkdown, setDeckMarkdown] = useState<string | null>(null);
  const [isResearching, setIsResearching] = useState(false);
  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [bibStyle, setBibStyle] = useState<'apa' | 'mla' | 'chicago'>('apa');
  
  // New mode state
  const [mode, setMode] = useState<Mode>('standard');
  const [agentInsights, setAgentInsights] = useState<AgentInsight[]>([]);
  const [progressMetrics, setProgressMetrics] = useState<ProgressMetrics>({
    totalWords: 0,
    targetWords: 15000,
    percentComplete: 0,
    chaptersCompleted: 0,
    totalChapters: 5,
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

  // Save mode preference
  const toggleMode = useCallback(() => {
    const newMode = mode === 'standard' ? 'agentic' : 'standard';
    setMode(newMode);
    localStorage.setItem('academicHubMode', newMode);
    
    if (newMode === 'agentic' && selectedProject) {
      AgenticOrchestrator.initialize(selectedProject);
    }
  }, [mode, selectedProject]);

  // Calculate progress metrics
  const calculateProgressMetrics = useCallback((project: AcademicProject) => {
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
  }, []);

  // Update progress when project changes
  useEffect(() => {
    if (selectedProject) {
      calculateProgressMetrics(selectedProject);
    }
  }, [selectedProject, calculateProgressMetrics]);

  // Handle new project creation
  const handleNewProject = useCallback(async () => {
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

  // Handle wizard save
  const handleWizardSave = useCallback((wizardState: any) => {
    if (selectedProject) {
      const updated = {
        ...selectedProject,
        wizard_state: wizardState
      };
      updateAcademicProject(updated);
      setSelectedProject(updated);
    }
  }, [selectedProject, updateAcademicProject]);

  // Handle draft update
  const handleUpdateDraft = useCallback((section: string, content: string) => {
    if (selectedProject) {
      const updated = {
        ...selectedProject,
        draft_content: {
          ...selectedProject.draft_content,
          [section]: content
        }
      };
      updateAcademicProject(updated);
      setSelectedProject(updated);
      calculateProgressMetrics(updated);
    }
  }, [selectedProject, updateAcademicProject, calculateProgressMetrics]);

  // Get wizard data for new wizard component
  const getWizardData = useCallback(() => {
    if (!selectedProject) return null;
    return {
      basics: selectedProject.wizard_state.basics,
      objectives: selectedProject.wizard_state.objectives,
      scope: selectedProject.wizard_state.scope,
      literature: selectedProject.wizard_state.literature,
      methodology: selectedProject.wizard_state.methodology,
      finishing: selectedProject.wizard_state.finishing,
    };
  }, [selectedProject]);

  return (
    <div className="academic-hub flex-grow flex flex-col overflow-hidden h-full">
      {/* New Header with Mode Toggle */}
      <Header
        mode={mode}
        onToggleMode={toggleMode}
        projectTitle={selectedProject?.wizard_state?.basics?.title}
        userName={selectedProject?.wizard_state?.basics?.author}
      />

      {/* Wizard Modal - Uses new Wizard component */}
      {isWizardOpen && selectedProject && (
        <Wizard
          initialState={getWizardData() || undefined}
          onSave={handleWizardSave}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      {/* Legacy AcademicWizard for now */}
      {isWizardOpen && selectedProject && (
        <AcademicWizard
          project={selectedProject}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      {/* Export Panel */}
      {selectedProject && (
        <ExportPanel
          project={selectedProject}
          onClose={() => {}}
        />
      )}

      {/* Render based on mode */}
      {mode === 'agentic' ? (
        // AGENTIC MODE - Uses new Agentic Dashboard
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
        />
      ) : (
        // STANDARD MODE - Uses new ThreeColumnLayout
        <ThreeColumnLayout
          templates={TEMPLATES}
          projects={[]} // Would come from workspace context
          onSelectTemplate={(templateId) => {
            handleNewProject();
          }}
          onSelectProject={(projectId) => {
            // Find and select project
          }}
          onNewProject={handleNewProject}
          rightPanel={
            <div className="ah-compliance-panel">
              <Card>
                <CardTitle>
                  <span>Compliance Score</span>
                </CardTitle>
                <div className="compliance-score">
                  <div className="score-circle">
                    <span className="score-value">{Math.round(progressMetrics.percentComplete)}%</span>
                  </div>
                  <div className="score-details">
                    <p>{progressMetrics.totalWords.toLocaleString()} words written</p>
                    <p>{progressMetrics.chaptersCompleted} of 5 chapters complete</p>
                    <p>{progressMetrics.referencesCount} references</p>
                  </div>
                </div>
              </Card>
              
              {selectedProject && (
                <ComplianceSidebar project={selectedProject} />
              )}
            </div>
          }
        >
          {/* Main content area */}
          {selectedProject ? (
            <div className="ah-main-workspace">
              <div className="workspace-header">
                <h2>{selectedProject.wizard_state.basics.title || 'Untitled Project'}</h2>
                <div className="workspace-actions">
                  <Button variant="primary" size="sm" leftIcon={<Edit3 size={14} />}>
                    Edit
                  </Button>
                  <Button variant="secondary" size="sm" leftIcon={<Download size={14} />}>
                    Export
                  </Button>
                </div>
              </div>
              
              <div className="workspace-content">
                {Object.entries(selectedProject.draft_content || {}).map(([section, content]) => (
                  <Card key={section} className="draft-section">
                    <CardTitle>{section}</CardTitle>
                    <div className="draft-preview">
                      {(content as string).slice(0, 200)}...
                    </div>
                  </Card>
                ))}
                
                {Object.keys(selectedProject.draft_content || {}).length === 0 && (
                  <div className="empty-state">
                    <BookOpen size={48} />
                    <p>No content yet. Start writing or use the wizard.</p>
                    <Button variant="primary" onClick={() => setIsWizardOpen(true)}>
                      Open Wizard
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="ah-welcome-state">
              <div className="welcome-card">
                <GraduationCap size={48} />
                <h2>Welcome to Academic Hub</h2>
                <p>Create a new project or select a template to begin</p>
                <Button variant="primary" onClick={handleNewProject} leftIcon={<Plus size={16} />}>
                  New Project
                </Button>
              </div>
            </div>
          )}
        </ThreeColumnLayout>
      )}
    </div>
  );
};

export default AcademicHub;

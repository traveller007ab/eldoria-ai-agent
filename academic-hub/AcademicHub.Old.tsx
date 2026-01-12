/**
 * Academic Hub - Main Container with Agentic Mode Toggle
 * 
 * This component orchestrates the entire Academic Hub experience
 * with a seamless toggle between Standard and Agentic modes.
 * 
 * Enhanced with Agentic Orchestrator, Export Panel, Prompt Customization
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
import './AcademicHub.css';


// ============================================================================
// Types
// ============================================================================

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

// ============================================================================
// Main Component
// ============================================================================

export const AcademicHub: React.FC = () => {
  // Core state
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

  // New enhanced state
  const [isExportPanelOpen, setIsExportPanelOpen] = useState(false);
  const [isPromptCustomizerOpen, setIsPromptCustomizerOpen] = useState(false);
  const [isCollaboratorOpen, setIsCollaboratorOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [writingAnalysis, setWritingAnalysis] = useState<WritingAnalysis | null>(null);
  const [paceRecommendation, setPaceRecommendation] = useState<PaceRecommendation | null>(null);

  // Agentic mode state
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

  // ==========================================================================
  // AGENTIC ORCHESTRATOR INTEGRATION
  // ==========================================================================

  // Initialize Agentic Orchestrator when entering agentic mode with a project
  useEffect(() => {
    if (mode === 'agentic' && selectedProject) {
      // Initialize the orchestrator with the current project
      AgenticOrchestrator.initialize(selectedProject);
      setIsAgentActive(true);

      // Subscribe to orchestrator events and map to local state
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

      // Load existing events from orchestrator
      const existingEvents = AgenticOrchestrator.getEvents();
      const mappedInsights = existingEvents.map((event: AgentEvent) => ({
        id: event.id,
        type: event.type === 'warning' ? 'warning' :
          event.type === 'deadline_alert' ? 'warning' :
            event.type === 'suggestion' ? 'suggestion' : 'info' as const,
        category: event.source,
        title: event.title,
        message: event.message,
        confidence: 0.8,
        priority: event.priority,
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
      // Cleanup when leaving agentic mode
      AgenticOrchestrator.stopAgents();
      setIsAgentActive(false);
    }
  }, [mode, selectedProject]);

  // Update progress metrics when project changes (in agentic mode)

  // Calculate progress metrics
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

  // Generate agent insights
  const generateAgentInsight = (project: AcademicProject) => {
    const insights: AgentInsight[] = [];
    const draftContent = project.draft_content || {};
    const chapterCount = Object.keys(draftContent).length;

    // Progress insight
    if (progressMetrics.percentComplete < 50 && chapterCount > 0) {
      insights.push({
        id: `progress-${Date.now()}`,
        type: 'suggestion',
        category: 'progress',
        title: 'Behind Schedule',
        message: `You're at ${progressMetrics.percentComplete.toFixed(0)}% completion. Aim for ${progressMetrics.dailyWordTarget} words/day to meet your deadline.`,
        confidence: 0.85,
        priority: 'high',
        timestamp: new Date(),
        actions: [{ id: 'view-plan', label: 'View Plan', type: 'info' }]
      });
    }

    // Citation insight
    if (progressMetrics.referencesCount < progressMetrics.chaptersCompleted * 3) {
      insights.push({
        id: `citations-${Date.now()}`,
        type: 'suggestion',
        category: 'citations',
        title: 'More Citations Needed',
        message: `Average ${(progressMetrics.referencesCount / Math.max(1, progressMetrics.chaptersCompleted)).toFixed(1)} references per chapter. Aim for 3-5 per chapter.`,
        confidence: 0.75,
        priority: 'medium',
        timestamp: new Date(),
        actions: [{ id: 'add-citations', label: 'Add Citations', type: 'action' }]
      });
    }

    if (insights.length > 0) {
      setAgentInsights(prev => [...insights, ...prev].slice(0, 20));
    }
  };

  // ==========================================================================
  // WRITING COACH INTEGRATION
  // ==========================================================================

  // Analyze writing quality when draft content changes (debounced)
  const runWritingAnalysis = useCallback((content: string, chapterName: string) => {
    if (mode !== 'agentic' || !content || content.length < 200) return;

    const analysis = AgenticOrchestrator.analyzeWriting(content);

    // Emit writing tips as agent events if score is below threshold
    if (analysis.score < 80 && analysis.tips.length > 0) {
      AgenticOrchestrator.emit({
        id: `writing-tip-${Date.now()}`,
        type: 'writing_tip',
        source: 'writing',
        priority: analysis.score < 60 ? 'high' : 'medium',
        title: `Writing Quality: ${analysis.score}%`,
        message: analysis.tips[0],
        data: { allTips: analysis.tips, chapter: chapterName },
        timestamp: new Date(),
        read: false,
        actions: [
          { id: 'show-all-tips', label: 'View All Tips', type: 'custom' },
          { id: 'dismiss', label: 'Dismiss', type: 'dismiss' }
        ]
      });
    }
  }, [mode]);

  // Handle agent insight actions
  const handleAgentAction = useCallback((actionId: string, payload?: any) => {
    switch (actionId) {
      case 'discover_citations':
      case 'add-citations':
        // Trigger auto-discovery of citations
        if (selectedProject) {
          handleDeepResearch();
        }
        break;
      case 'show-all-tips':
        // Could open a modal with all tips - for now just log
        console.log('Writing tips:', payload);
        break;
      case 'view-plan':
        setIsWizardOpen(true);
        break;
      case 'tour':
        // Could trigger an onboarding tour
        console.log('Tour requested');
        break;
      case 'dismiss':
        // Mark as read handled separately
        break;
      default:
        console.log('Unknown action:', actionId);
    }
  }, [selectedProject]);

  // Mark insight as read
  const markInsightRead = useCallback((insightId: string) => {
    AgenticOrchestrator.markRead(insightId);
    setAgentInsights(prev => prev.map(i =>
      i.id === insightId ? { ...i, read: true } : i
    ));
  }, []);


  // Toggle agentic mode
  const handleModeToggle = useCallback(() => {
    const newMode = mode === 'standard' ? 'agentic' : 'standard';
    setMode(newMode);
    localStorage.setItem('academicHubMode', newMode);

    if (newMode === 'agentic') {
      setIsAgentActive(true);
      if (selectedProject) {
        // Add welcome insight
        setAgentInsights(prev => [{
          id: `welcome-${Date.now()}`,
          type: 'success',
          category: 'initialization',
          title: 'Agentic Mode Activated',
          message: 'Your AI research assistant is now monitoring progress and providing proactive suggestions.',
          confidence: 1,
          priority: 'low',
          timestamp: new Date(),
          actions: [
            { id: 'get-started', label: 'Get Started', type: 'info' },
            { id: 'tour', label: 'Take Tour', type: 'info' }
          ]
        }, ...prev]);
      }
    } else {
      setIsAgentActive(false);
    }
  }, [mode, selectedProject]);

  // ============================================================================
  // Render Methods
  // ============================================================================

  // Agentic mode header
  const renderAgenticHeader = () => (
    <div className="ah-header ah-header--agentic">
      <div className="ah-header__brand">
        <div className="ah-header__brand">
          <div className="ah-header__icon">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <h1 className="ah-header__title">Agentic Academic Hub</h1>
            <p className="ah-header__subtitle">
              AI-powered autonomous research assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 ml-4 px-3 py-1.5 bg-purple-500/10 rounded-full border border-purple-500/30">
          <div className={`w-2 h-2 rounded-full ${isAgentActive ? 'bg-green-400 animate-pulse' : 'bg-slate-500'}`} />
          <span className="text-xs text-purple-300">
            {isAgentActive ? 'Agent Active' : 'Agent Paused'}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {/* Agent Stats */}
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1.5 text-purple-300/70">
            <Lightbulb className="w-4 h-4" />
            <span>{agentInsights.filter(i => !i.read).length} new</span>
          </div>
          <div className="flex items-center gap-1.5 text-purple-300/70">
            <Zap className="w-4 h-4" />
            <span>{progressMetrics.percentComplete.toFixed(0)}% done</span>
          </div>
        </div>

        {/* Mode Toggle */}
        <AgenticToggle mode={mode} onToggle={handleModeToggle} />

        <button className="p-2 hover:bg-purple-500/20 rounded-lg text-purple-400 transition-colors">
          <Settings className="w-5 h-5" />
        </button>
      </div>
    </div>
  );

  // Standard mode header
  const renderStandardHeader = () => (
    <div className="ah-header ah-header--standard">
      <div className="ah-header__brand">
        <div className="ah-header__icon">
          <GraduationCap className="w-6 h-6" />
        </div>
        <div>
          <h1 className="ah-header__title">Academic Hub</h1>
          <p className="ah-header__subtitle">
            Thesis research and writing assistant
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <AgenticToggle mode={mode} onToggle={handleModeToggle} />

        <NavLink
          to="/"
          className="flex items-center gap-2 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 rounded-lg text-xs font-bold uppercase tracking-widest border border-cyan-500/20 transition-all"
        >
          <Layout className="w-3.5 h-3.5" />
          Warp to Workspace
        </NavLink>
      </div>
    </div>
  );

  // Agentic dashboard
  const renderAgenticDashboard = () => (
    <div className="flex h-full">
      {/* Agentic Sidebar */}
      <div className="w-80 shrink-0 flex flex-col gap-4 p-4 bg-gradient-to-b from-purple-900/20 to-slate-900/20 border-r border-purple-800/30 overflow-auto">
        {/* Progress Card */}
        <div className="bg-gradient-to-br from-purple-900/30 to-indigo-900/30 rounded-xl p-4 border border-purple-700/30">
          <div className="flex items-center gap-2 mb-3 text-purple-300">
            <BarChart3 className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">Progress</span>
          </div>

          <div className="space-y-3">
            <div>
              <div className="flex justify-between text-xs text-slate-400 mb-1">
                <span>Completion</span>
                <span className="text-purple-300">{progressMetrics.percentComplete.toFixed(0)}%</span>
              </div>
              <div className="h-2 bg-purple-900/50 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 transition-all"
                  style={{ width: `${progressMetrics.percentComplete}%` }}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-purple-900/20 rounded-lg p-2">
                <div className="text-slate-400">Words</div>
                <div className="text-white font-mono">{progressMetrics.totalWords.toLocaleString()}</div>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-2">
                <div className="text-slate-400">References</div>
                <div className="text-white font-mono">{progressMetrics.referencesCount}</div>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-2">
                <div className="text-slate-400">Chapters</div>
                <div className="text-white font-mono">{progressMetrics.chaptersCompleted}/{progressMetrics.totalChapters}</div>
              </div>
              <div className="bg-purple-900/20 rounded-lg p-2">
                <div className="text-slate-400">Days Left</div>
                <div className="text-white font-mono">{progressMetrics.daysRemaining}</div>
              </div>
            </div>
          </div>
        </div>

        {/* Insights Feed */}
        <div className="flex-1 overflow-auto">
          <div className="flex items-center gap-2 mb-3 text-purple-300">
            <MessageSquare className="w-4 h-4" />
            <span className="text-xs font-bold uppercase tracking-wider">AI Insights</span>
            {agentInsights.filter(i => !i.read).length > 0 && (
              <span className="ml-auto px-1.5 py-0.5 bg-purple-500 rounded-full text-[10px]">
                {agentInsights.filter(i => !i.read).length}
              </span>
            )}
          </div>

          <div className="space-y-2">
            {agentInsights.slice(0, 10).map((insight) => (
              <div
                key={insight.id}
                onClick={() => markInsightRead(insight.id)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${!insight.read
                  ? 'bg-purple-900/30 border-purple-500/30 hover:border-purple-500/50'
                  : 'bg-purple-900/10 border-purple-500/10 hover:border-purple-500/20'
                  }`}
              >
                <div className="flex items-start gap-2">
                  <div className={`w-1.5 h-1.5 rounded-full mt-1.5 ${insight.type === 'warning' ? 'bg-amber-400' :
                    insight.type === 'success' ? 'bg-green-400' :
                      'bg-purple-400'
                    }`} />
                  <div className="flex-1">
                    <div className="text-xs font-medium text-purple-200">{insight.title}</div>
                    <div className="text-[10px] text-slate-400 mt-1 line-clamp-2">{insight.message}</div>
                    {insight.actions && insight.actions.length > 0 && (
                      <div className="flex gap-1 mt-2">
                        {insight.actions.map(action => (
                          <button
                            key={action.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleAgentAction(action.id, (insight as any).data);
                              markInsightRead(insight.id);
                            }}
                            className="px-2 py-0.5 bg-purple-500/20 hover:bg-purple-500/40 rounded text-[10px] text-purple-300 transition-colors"
                          >
                            {action.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}

            {agentInsights.length === 0 && (
              <div className="text-center text-slate-500 text-xs py-8">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-50" />
                <p>No insights yet</p>
                <p className="mt-1">Agent is monitoring...</p>
              </div>
            )}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={handleDeepResearch}
            disabled={isResearching}
            className="flex items-center gap-2 p-2 bg-purple-900/20 hover:bg-purple-500/20 rounded-lg text-xs text-purple-300 transition-colors disabled:opacity-50"
          >
            <Search className="w-3.5 h-3.5" />
            {isResearching ? 'Researching...' : 'Research'}
          </button>
          <button
            onClick={() => setIsWizardOpen(true)}
            className="flex items-center gap-2 p-2 bg-purple-900/20 hover:bg-purple-500/20 rounded-lg text-xs text-purple-300 transition-colors"
          >
            <FileDiff className="w-3.5 h-3.5" />
            Citations
          </button>
          <button
            onClick={() => setIsExportPanelOpen(true)}
            className="flex items-center gap-2 p-2 bg-purple-900/20 hover:bg-purple-500/20 rounded-lg text-xs text-purple-300 transition-colors"
          >
            <Cloud className="w-3.5 h-3.5" />
            Export
          </button>
          <button
            onClick={() => setIsCollaboratorOpen(true)}
            className="flex items-center gap-2 p-2 bg-purple-900/20 hover:bg-purple-500/20 rounded-lg text-xs text-purple-300 transition-colors"
          >
            <Users className="w-3.5 h-3.5" />
            Collaborate
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-auto p-6">
        {selectedProject ? (
          <div className="max-w-4xl mx-auto">
            {/* Project Header */}
            <div className="mb-6">
              <h2 className="text-2xl font-bold text-white">
                {selectedProject.wizard_state.basics.title || 'Untitled Project'}
              </h2>
              <p className="text-slate-400 mt-1">
                {selectedProject.wizard_state.basics.author} • {selectedProject.format}
              </p>
            </div>

            {/* Chapter Progress */}
            <div className="bg-slate-900/50 rounded-xl p-4 border border-slate-800 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-purple-300 uppercase tracking-wider">Chapter Progress</h3>
                <button className="text-xs text-purple-400 hover:text-purple-300">View All</button>
              </div>

              <div className="space-y-3">
                {['Introduction', 'Literature Review', 'Materials & Methods', 'Results & Discussion', 'Conclusion'].map((chapter, idx) => {
                  const content = selectedProject.draft_content?.[`Chapter ${idx + 1}: ${chapter}`] || '';
                  const hasContent = content.length > 100;

                  return (
                    <div key={chapter} className="flex items-center gap-3">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${hasContent
                        ? 'bg-green-500/20 text-green-400'
                        : 'bg-slate-800 text-slate-500'
                        }`}>
                        {hasContent ? <Check className="w-3.5 h-3.5" /> : idx + 1}
                      </div>
                      <div className="flex-1">
                        <div className="text-sm text-slate-300">{chapter}</div>
                        <div className="h-1 mt-1 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-purple-500 transition-all"
                            style={{ width: hasContent ? '100%' : '0%' }}
                          />
                        </div>
                      </div>
                      <span className="text-xs text-slate-500">
                        {hasContent ? `${content.split(/\s+/).length} words` : 'Not started'}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Agent Suggestions - Dynamic from agentInsights */}
            <div className="bg-gradient-to-br from-purple-900/20 to-indigo-900/20 rounded-xl p-4 border border-purple-500/20">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-amber-400" />
                  <h3 className="text-sm font-bold text-amber-400 uppercase tracking-wider">AI Insights</h3>
                </div>
                <span className="text-xs text-purple-400">{agentInsights.filter(i => !i.read).length} unread</span>
              </div>

              <div className="space-y-3 max-h-64 overflow-y-auto">
                {agentInsights.length === 0 ? (
                  <div className="text-center py-6 text-slate-500">
                    <Brain className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p className="text-sm">Your AI agents are analyzing your project...</p>
                    <p className="text-xs mt-1">Insights will appear here as they're discovered.</p>
                  </div>
                ) : (
                  agentInsights.slice(0, 5).map((insight) => {
                    const bgColor = insight.type === 'warning' ? 'bg-amber-900/10 border-amber-500/20' :
                      insight.type === 'suggestion' ? 'bg-blue-900/10 border-blue-500/20' :
                        'bg-green-900/10 border-green-500/20';
                    const iconBgColor = insight.type === 'warning' ? 'bg-amber-500/20' :
                      insight.type === 'suggestion' ? 'bg-blue-500/20' : 'bg-green-500/20';
                    const iconColor = insight.type === 'warning' ? 'text-amber-400' :
                      insight.type === 'suggestion' ? 'text-blue-400' : 'text-green-400';
                    const textColor = insight.type === 'warning' ? 'text-amber-200' :
                      insight.type === 'suggestion' ? 'text-blue-200' : 'text-green-200';

                    return (
                      <div
                        key={insight.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${bgColor} ${!insight.read ? 'ring-1 ring-purple-500/30' : 'opacity-80'}`}
                        onClick={() => markInsightRead(insight.id)}
                      >
                        <div className={`w-8 h-8 rounded-lg ${iconBgColor} flex items-center justify-center shrink-0`}>
                          {insight.type === 'warning' ? <AlertTriangle className={`w-4 h-4 ${iconColor}`} /> :
                            insight.type === 'suggestion' ? <Lightbulb className={`w-4 h-4 ${iconColor}`} /> :
                              <Check className={`w-4 h-4 ${iconColor}`} />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className={`text-sm font-medium ${textColor}`}>{insight.title}</div>
                          <div className="text-xs text-slate-400 mt-1 line-clamp-2">{insight.message}</div>
                          {insight.actions && insight.actions.length > 0 && (
                            <div className="flex gap-2 mt-2">
                              {insight.actions.slice(0, 2).map(action => (
                                <button
                                  key={action.id}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleAgentAction(action.id, insight.data);
                                    markInsightRead(insight.id);
                                  }}
                                  className={`px-3 py-1 rounded text-xs font-medium transition-colors ${action.type === 'dismiss'
                                    ? 'bg-slate-700/50 hover:bg-slate-700 text-slate-300'
                                    : `${iconBgColor} hover:opacity-80 ${iconColor}`
                                    }`}
                                >
                                  {action.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                        <span className="text-[10px] text-slate-500 shrink-0">
                          {new Date(insight.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    );
                  })
                )}

                {agentInsights.length > 5 && (
                  <button className="w-full text-center text-xs text-purple-400 hover:text-purple-300 py-2">
                    View all {agentInsights.length} insights...
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-center">
            <div>
              <Brain className="w-16 h-16 mx-auto mb-4 text-purple-500/50" />
              <h2 className="text-xl font-bold text-white mb-2">Select a Project</h2>
              <p className="text-slate-400 mb-4">Choose a project to start working with the Agentic Hub</p>
              <button
                onClick={handleNewProject}
                className="px-4 py-2 bg-purple-500 hover:bg-purple-400 text-white rounded-lg text-sm font-medium"
              >
                Create New Project
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // ============================================================================
  // Event Handlers (from original)
  // ============================================================================

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

    // Trigger Writing Coach analysis in agentic mode (debounced via content length check)
    if (mode === 'agentic' && content.length > 200) {
      runWritingAnalysis(content, chapter);
    }
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
    setIsPrintMenuOpen(false);
    if (!selectedProject) return;
    setIsSynthesizing(true);
    try {
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
    setIsPrintMenuOpen(false);
    if (!selectedProject) return;
    // Print implementation from original...
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

  // ============================================================================
  // Main Render
  // ============================================================================

  return (
    <div className="academic-hub flex-grow flex flex-col overflow-hidden h-full">
      {/* Model Creator Modal */}
      {isModelCreatorOpen && (
        <ModelCreator
          onSave={handleSaveNewModel}
          onCancel={() => setIsModelCreatorOpen(false)}
        />
      )}

      {/* Export Panel Modal */}
      {isExportPanelOpen && selectedProject && (
        <ExportPanel
          project={selectedProject}
          onClose={() => setIsExportPanelOpen(false)}
        />
      )}

      {/* Prompt Customizer Modal */}
      {isPromptCustomizerOpen && selectedProject && (
        <PromptCustomizer
          model={getModelById(selectedProject.modelId || selectedProject.format || 'rsu-mech-eng') || {
            id: 'default', name: 'Default', institution: '', department: '',
            description: '', citationStyle: 'APA', version: '1.0', author: '',
            createdAt: '', chapters: [], formatting: { fontFamily: 'Times New Roman', fontSize: 12, lineSpacing: 2, marginInches: 1 },
            targets: { totalMinWords: 10000, totalMaxWords: 50000, minReferences: 10, abstractMaxWords: 300 },
            wizardFields: { showRegNumber: true, showSupervisor: true, showCoSupervisor: false, customFields: [] },
            aiConfig: { systemPrompt: 'You are an academic writing assistant.', temperature: 0.6, model: 'llama-3.3-70b-versatile' }
          }}
          onSave={(prompts) => {
            console.log('Custom prompts saved:', prompts);
            setIsPromptCustomizerOpen(false);
          }}
          onClose={() => setIsPromptCustomizerOpen(false)}
        />
      )}

      {/* Collaborator Panel Modal */}
      {isCollaboratorOpen && selectedProject && (
        <CollaboratorPanel
          project={selectedProject}
          onClose={() => setIsCollaboratorOpen(false)}
          onImport={(imported) => {
            setSelectedProject(imported);
            setIsCollaboratorOpen(false);
          }}
        />
      )}

      {/* Defense Deck UI */}
      {deckMarkdown && (
        <DefenseDeckUI
          markdown={deckMarkdown}
          onClose={() => setDeckMarkdown(null)}
        />
      )}

      {/* Main Wizard Modal - Now global */}
      {isWizardOpen && selectedProject && (
        <AcademicWizard
          project={selectedProject}
          onClose={() => setIsWizardOpen(false)}
        />
      )}

      {/* Render based on mode */}
      {mode === 'agentic' ? (
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Agentic Header */}
          {renderAgenticHeader()}

          {/* Agentic Dashboard */}
          {renderAgenticDashboard()}
        </div>
      ) : (
        <div className="flex-grow flex flex-col overflow-hidden">
          {/* Standard Mode Header */}
          {renderStandardHeader()}

          {/* Main Layout Area - Horizontal 3-Column */}
          <div className="ah-content gap-4 p-4">
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

            {/* Center Column: Main Content (Wizard or Draft) */}
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
                        <button
                          onClick={() => setIsExportPanelOpen(true)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20 transition-all"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Export
                        </button>
                        <button
                          onClick={() => setIsPromptCustomizerOpen(true)}
                          className="flex items-center gap-2 px-4 py-1.5 bg-purple-500/10 hover:bg-purple-500/20 text-purple-400 rounded-lg text-[10px] font-bold uppercase tracking-widest border border-purple-500/20 transition-all"
                        >
                          <Settings className="w-3.5 h-3.5" />
                          Customize AI
                        </button>
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
                      </div>
                    </div>

                    {/* Content area - abbreviated for brevity */}
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
                        {/* Additional sections would follow... */}
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
                          <Plus className="w-5 h-5" />
                          New Project
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

// ============================================================================
// Agentic Toggle Component
// ============================================================================

const AgenticToggle: React.FC<{ mode: Mode; onToggle: () => void }> = ({ mode, onToggle }) => (
  <div className="flex items-center gap-3 px-3 py-2 bg-gradient-to-r from-purple-900/40 to-indigo-900/40 rounded-lg border border-purple-700/40">
    <div className={`flex items-center gap-2 ${mode === 'standard' ? 'text-slate-300' : 'text-purple-400'}`}>
      <Brain className="w-4 h-4" />
      <span className="text-xs font-medium">Standard</span>
    </div>

    <button
      onClick={onToggle}
      className={`
        relative w-12 h-6 rounded-full transition-all duration-300
        ${mode === 'agentic'
          ? 'bg-gradient-to-r from-purple-500 to-indigo-500 shadow-lg shadow-purple-500/25'
          : 'bg-slate-700 hover:bg-slate-600'
        }
      `}
    >
      <div className={`
        absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-all duration-300
        ${mode === 'agentic' ? 'left-6' : 'left-0.5'}
      `}>
        {mode === 'agentic' && (
          <Sparkles className="w-2.5 h-2.5 text-purple-500 absolute -top-0.5 -left-0.5 animate-pulse" />
        )}
      </div>
    </button>

    <div className={`flex items-center gap-2 ${mode === 'agentic' ? 'text-purple-400' : 'text-slate-300'}`}>
      <Sparkles className="w-4 h-4" />
      <span className="text-xs font-medium">Agentic</span>
    </div>
  </div>
);

export default AcademicHub;

/**
 * Agentic Mode Manager - The Brain of Agentic Academic Hub
 * 
 * This service orchestrates all autonomous agent behaviors:
 * - Background monitoring
 * - Proactive suggestions
 * - Auto-completion actions
 * - Learning from user behavior
 * - Cross-component coordination
 */

import type { AcademicProject, AcademicWizardState, Reference } from '../../types';

export interface AgentConfig {
  checkInterval: number;
  autoSuggestEnabled: boolean;
  autoCiteEnabled: boolean;
  progressTrackingEnabled: boolean;
  learningEnabled: boolean;
  proactiveResearchEnabled: boolean;
  maxSuggestions: number;
  confidenceThreshold: number;
}

export interface AgentInsight {
  id: string;
  type: 'info' | 'suggestion' | 'warning' | 'success' | 'critical';
  category: string;
  title: string;
  message: string;
  confidence: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
  timestamp: Date;
  actions?: { id: string; label: string; type: 'info' | 'action' | 'auto' }[];
  metadata?: Record<string, unknown>;
  read?: boolean;
}

export interface AgentAction {
  id: string;
  type: 'info' | 'suggestion' | 'warning' | 'auto';
  label: string;
  description?: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'dismissed';
  actions?: { id: string; label: string; type: 'info' | 'action' | 'auto' }[];
  metadata?: Record<string, unknown>;
}

export class AgenticModeManager {
  private config: AgentConfig;
  private project: AcademicProject | null = null;
  private backgroundInterval: ReturnType<typeof setInterval> | null = null;
  private insightCallback: ((insight: AgentInsight) => void) | null = null;
  private actionCallback: ((action: AgentAction) => void) | null = null;
  private learnedPreferences: Map<string, unknown> = new Map();
  private suggestionHistory: AgentInsight[] = [];
  private actionHistory: AgentAction[] = [];

  constructor(config: Partial<AgentConfig> = {}) {
    this.config = {
      checkInterval: config.checkInterval || 5000,
      autoSuggestEnabled: config.autoSuggestEnabled ?? true,
      autoCiteEnabled: config.autoCiteEnabled ?? true,
      progressTrackingEnabled: config.progressTrackingEnabled ?? true,
      learningEnabled: config.learningEnabled ?? true,
      proactiveResearchEnabled: config.proactiveResearchEnabled ?? true,
      maxSuggestions: config.maxSuggestions || 50,
      confidenceThreshold: config.confidenceThreshold || 0.7,
    };
  }

  initialize(project: AcademicProject): void {
    this.project = project;
    this.loadLearnedPreferences();
    
    this.emitInsight({
      id: `init-${Date.now()}`,
      type: 'info',
      category: 'initialization',
      title: 'Agent Activated',
      message: `Agentic mode initialized for "${project.name}". I'm now monitoring your research progress.`,
      confidence: 1.0,
      priority: 'low',
      timestamp: new Date(),
      actions: [
        { id: 'get-started', label: 'Get Started Guide', type: 'info' },
        { id: 'tour', label: 'Take Tour', type: 'info' }
      ],
      metadata: { projectId: project.id }
    });
  }

  startBackgroundAgent(
    onInsight?: (insight: AgentInsight) => void,
    onAction?: (action: AgentAction) => void
  ): void {
    if (this.backgroundInterval) return;
    
    this.insightCallback = onInsight;
    this.actionCallback = onAction;
    
    this.backgroundInterval = setInterval(() => {
      this.runMonitoringCycle();
    }, this.config.checkInterval);
    
    setTimeout(() => this.runMonitoringCycle(), 1000);
  }

  stopBackgroundAgent(): void {
    if (this.backgroundInterval) {
      clearInterval(this.backgroundInterval);
      this.backgroundInterval = null;
    }
    
    this.insightCallback = null;
    this.actionCallback = null;
  }

  private async runMonitoringCycle(): Promise<void> {
    if (!this.project) return;

    await Promise.all([
      this.checkProgress(),
      this.checkCitations(),
      this.checkContentQuality(),
      this.checkDeadlines(),
      this.checkResearchGaps(),
    ]);
  }

  private async checkProgress(): Promise<void> {
    if (!this.project || !this.config.progressTrackingEnabled) return;

    const wizardState = this.project.wizard_state;
    if (!wizardState) return;

    const progress = this.calculateProjectProgress(wizardState);
    const prediction = this.predictCompletion(progress);
    
    if (prediction.insight) {
      this.emitInsight(prediction.insight);
    }
  }

  private async checkCitations(): Promise<void> {
    if (!this.project || !this.config.autoCiteEnabled) return;

    const missingCitations = await this.findMissingCitations();
    
    if (missingCitations.length > 0) {
      this.emitInsight({
        id: `citations-${Date.now()}`,
        type: 'suggestion',
        category: 'citations',
        title: 'Citation Opportunities Detected',
        message: `Found ${missingCitations.length} potential citation opportunities in your content.`,
        confidence: 0.85,
        priority: 'medium',
        timestamp: new Date(),
        actions: [
          { id: 'review-citations', label: 'Review Citations', type: 'action' },
          { id: 'auto-cite', label: 'Auto-Discover', type: 'auto' }
        ],
        metadata: { opportunities: missingCitations, projectId: this.project.id }
      });
    }
  }

  private async checkContentQuality(): Promise<void> {
    if (!this.project) return;

    const draftContent = this.project.draft_content;
    if (!draftContent || Object.keys(draftContent).length === 0) return;

    for (const [chapter, content] of Object.entries(draftContent)) {
      const quality = this.analyzeContentQuality(content as string, chapter);
      
      if (quality.insight) {
        this.emitInsight(quality.insight);
      }
    }
  }

  private async checkDeadlines(): Promise<void> {
    if (!this.project) return;
    // Deadline checking would go here
  }

  private async checkResearchGaps(): Promise<void> {
    if (!this.project || !this.config.proactiveResearchEnabled) return;

    const wizardState = this.project.wizard_state;
    if (!wizardState || !wizardState.objectives?.specificObjectives) return;

    const gaps = await this.findResearchGaps();
    
    if (gaps.length > 0) {
      this.emitInsight({
        id: `research-gaps-${Date.now()}`,
        type: 'suggestion',
        category: 'research',
        title: 'Research Gaps Identified',
        message: `Found ${gaps.length} areas that may need additional research based on your objectives.`,
        confidence: 0.8,
        priority: 'medium',
        timestamp: new Date(),
        actions: [
          { id: 'research-gaps', label: 'View Gaps', type: 'info' },
          { id: 'auto-research', label: 'Auto-Research', type: 'auto' }
        ],
        metadata: { gaps, projectId: this.project.id }
      });
    }
  }

  private emitInsight(insight: AgentInsight): void {
    this.suggestionHistory.unshift(insight);
    
    if (this.suggestionHistory.length > this.config.maxSuggestions) {
      this.suggestionHistory = this.suggestionHistory.slice(0, this.config.maxSuggestions);
    }
    
    this.insightCallback?.(insight);
  }

  async executeAction(action: AgentAction): Promise<void> {
    this.actionHistory.unshift(action);
    this.actionCallback?.(action);
  }

  learn(behavior: string, data: unknown): void {
    if (!this.config.learningEnabled) return;
    this.learnedPreferences.set(behavior, data);
    this.saveLearnedPreferences();
  }

  getLearnedPreferences(): Map<string, unknown> {
    return new Map(this.learnedPreferences);
  }

  getInsights(): AgentInsight[] {
    return this.suggestionHistory;
  }

  getActions(): AgentAction[] {
    return this.actionHistory;
  }

  clearInsights(): void {
    this.suggestionHistory = [];
  }

  updateConfig(config: Partial<AgentConfig>): void {
    this.config = { ...this.config, ...config };
  }

  // Helper methods
  private calculateProjectProgress(wizardState: AcademicWizardState): number {
    let totalSteps = 0;
    let completedSteps = 0;
    
    if (wizardState.basics?.title) { completedSteps++; }
    totalSteps++;
    
    if (wizardState.objectives?.specificObjectives?.length > 0) { completedSteps++; }
    totalSteps++;
    
    if (wizardState.methodology?.materials?.length > 0) { completedSteps++; }
    totalSteps++;
    
    if (wizardState.basics?.author) { completedSteps++; }
    totalSteps++;
    
    return totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;
  }

  private predictCompletion(progress: number): { insight: AgentInsight | null } {
    const expectedProgress = 50;
    const variance = progress - expectedProgress;
    
    if (variance < -20) {
      return {
        insight: {
          id: `progress-${Date.now()}`,
          type: 'warning',
          category: 'progress',
          title: 'Behind Schedule',
          message: `You're ${Math.abs(variance)}% behind expected progress. Consider increasing daily writing.`,
          confidence: 0.85,
          priority: 'high',
          timestamp: new Date(),
          actions: [
            { id: 'view-plan', label: 'View Plan', type: 'info' },
            { id: 'adjust-deadline', label: 'Adjust Timeline', type: 'action' }
          ]
        }
      };
    }
    
    return { insight: null };
  }

  private async findMissingCitations(): Promise<unknown[]> {
    return [];
  }

  private analyzeContentQuality(content: string, chapter: string): { insight: AgentInsight | null } {
    const wordCount = content.split(/\s+/).length;
    const sentenceCount = content.split(/[.!?]+/).length;
    const avgSentenceLength = wordCount / Math.max(1, sentenceCount);
    
    if (avgSentenceLength < 10) {
      return {
        insight: {
          id: `quality-${chapter}-${Date.now()}`,
          type: 'suggestion',
          category: 'quality',
          title: 'Sentence Length Analysis',
          message: `Chapter has many short sentences (avg ${avgSentenceLength.toFixed(1)} words). Consider combining for better flow.`,
          confidence: 0.75,
          priority: 'low',
          timestamp: new Date(),
          actions: [
            { id: 'improve-flow', label: 'Improve Flow', type: 'action' }
          ],
          metadata: { chapter, wordCount, sentenceCount, avgSentenceLength }
        }
      };
    }
    
    return { insight: null };
  }

  private async findResearchGaps(): Promise<unknown[]> {
    return [];
  }

  private loadLearnedPreferences(): void {
    const saved = localStorage.getItem('agentic-preferences');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        Object.entries(parsed).forEach(([key, value]) => {
          this.learnedPreferences.set(key, value);
        });
      } catch (e) {
        console.error('Failed to load learned preferences:', e);
      }
    }
  }

  private saveLearnedPreferences(): void {
    const obj: Record<string, unknown> = {};
    this.learnedPreferences.forEach((value, key) => {
      obj[key] = value;
    });
    localStorage.setItem('agentic-preferences', JSON.stringify(obj));
  }
}

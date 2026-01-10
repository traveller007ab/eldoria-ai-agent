/**
 * Agentic Mode Types - Type definitions for the Agentic Academic Hub
 */

import type { AcademicProject, AcademicWizardState, Reference } from '../../types';

// ============================================================================
// Agent Configuration
// ============================================================================

export interface AgentConfig {
  checkInterval: number;                    // How often to run monitoring (ms)
  autoSuggestEnabled: boolean;              // Enable proactive suggestions
  autoCiteEnabled: boolean;                 // Enable auto-citation
  progressTrackingEnabled: boolean;         // Track and predict progress
  learningEnabled: boolean;                 // Learn from user behavior
  proactiveResearchEnabled: boolean;        // Auto-research gaps
  maxSuggestions: number;                   // Max suggestions to keep
  confidenceThreshold: number;              // Min confidence for suggestions
}

// ============================================================================
// Insight Types
// ============================================================================

export type InsightType = 'info' | 'suggestion' | 'warning' | 'success' | 'critical';
export type InsightCategory = 'initialization' | 'progress' | 'citations' | 'quality' | 'research' | 'deadline' | 'compliance' | 'formatting';
export type InsightPriority = 'low' | 'medium' | 'high' | 'critical';

export interface AgentInsight {
  id: string;
  type: InsightType;
  category: InsightCategory;
  title: string;
  message: string;
  confidence: number;              // 0-1
  priority: InsightPriority;
  timestamp: Date;
  actions: AgentAction['actions'];
  metadata?: Record<string, any>;
  read?: boolean;
  dismissed?: boolean;
}

// ============================================================================
// Action Types
// ============================================================================

export type ActionType = 'info' | 'suggestion' | 'warning' | 'auto';

export interface AgentAction {
  id: string;
  type: ActionType;
  label: string;
  description?: string;
  icon?: string;
  timestamp: Date;
  status: 'pending' | 'executing' | 'completed' | 'failed' | 'dismissed';
  metadata?: Record<string, any>;
  
  // Nested actions
  actions?: {
    id: string;
    label: string;
    type: 'info' | 'action' | 'auto';
  }[];
}

// ============================================================================
// Research Types
// ============================================================================

export interface ResearchGap {
  id: string;
  topic: string;
  description: string;
  relatedObjectives: string[];
  priority: 'high' | 'medium' | 'low';
  searchQueries: string[];
  status: 'pending' | 'researching' | 'completed';
  findings?: ResearchFinding[];
}

export interface ResearchFinding {
  id: string;
  source: string;
  title: string;
  relevance: number;              // 0-1
  keyPoints: string[];
  citations: number;
  url?: string;
  extractedAt: Date;
}

// ============================================================================
// Citation Types
// ============================================================================

export interface CitationOpportunity {
  id: string;
  context: string;                // Text that needs citation
  claim: string;
  suggestedSources: CitationSource[];
  confidence: number;
}

export interface CitationSource {
  id: string;
  title: string;
  authors: string[];
  year: number;
  venue?: string;
  citations: number;
  url?: string;
  doi?: string;
  relevanceScore: number;
}

// ============================================================================
// Progress Types
// ============================================================================

export interface ProgressMetrics {
  totalWords: number;
  targetWords: number;
  percentComplete: number;
  chaptersCompleted: number;
  totalChapters: number;
  referencesCount: number;
  targetReferences: number;
  figuresCount: number;
  tablesCount: number;
}

export interface CompletionPrediction {
  predictedCompletionDate: Date;
  daysRemaining: number;
  dailyWordTarget: number;
  currentVelocity: number;         // words per day
  expectedVelocity: number;
  confidence: number;
  riskLevel: 'low' | 'medium' | 'high';
  recommendations: string[];
}

// ============================================================================
// Quality Types
// ============================================================================

export interface QualityMetrics {
  readabilityScore: number;
  academicToneScore: number;
  citationDensity: number;
  paragraphBalance: number;
  transitionQuality: number;
  grammarScore: number;
  plagiarismRisk: number;
}

export interface QualityIssue {
  id: string;
  chapter: string;
  type: 'readability' | 'tone' | 'citation' | 'structure' | 'grammar' | 'plagiarism';
  severity: 'low' | 'medium' | 'high';
  description: string;
  suggestions: string[];
  location?: {
    start: number;
    end: number;
  };
}

// ============================================================================
// Learning Types
// ============================================================================

export interface UserPreferences {
  writingStyle: 'formal' | 'semi-formal' | 'informal';
  citationStyle: string;
  preferredSources: string[];
  chapterOrderPreference: string[];
  feedbackResponseRate: number;
  commonCorrections: string[];
}

export interface LearnedBehavior {
  behavior: string;
  frequency: number;
  lastObserved: Date;
  successRate: number;
}

// ============================================================================
// Collaboration Types
// ============================================================================

export interface CollaborationSession {
  id: string;
  projectId: string;
  participants: Participant[];
  startedAt: Date;
  changes: Change[];
}

export interface Participant {
  id: string;
  name: string;
  role: 'author' | 'supervisor' | 'reviewer';
  cursor?: { line: number; column: number };
  lastActive: Date;
}

export interface Change {
  id: string;
  userId: string;
  chapter: string;
  type: 'insert' | 'delete' | 'replace';
  timestamp: Date;
  content: string;
}

// ============================================================================
// Export Types
// ============================================================================

export interface ExportConfig {
  format: 'pdf' | 'latex' | 'word' | 'markdown' | 'html';
  template?: string;
  includeFrontMatter: boolean;
  includeBibliography: boolean;
  includeAppendices: boolean;
  pageNumbers: boolean;
  fontSize: number;
  fontFamily: string;
  margins: {
    top: number;
    bottom: number;
    left: number;
    right: number;
  };
}

export interface ExportResult {
  success: boolean;
  fileUrl?: string;
  error?: string;
  metadata?: {
    pages: number;
    words: number;
    size: number;
  };
}

// ============================================================================
// Voice Command Types
// ============================================================================

export interface VoiceCommand {
  id: string;
  transcript: string;
  intent: VoiceIntent;
  entities: Record<string, string>;
  confidence: number;
  timestamp: Date;
}

export type VoiceIntent = 
  | 'create_project'
  | 'generate_chapter'
  | 'add_citation'
  | 'check_plagiarism'
  | 'export_document'
  | 'navigate'
  | 'search'
  | 'format'
  | 'save'
  | 'undo'
  | 'redo'
  | 'help';

// ============================================================================
// Dashboard Types
// ============================================================================

export interface AgenticDashboardState {
  isActive: boolean;
  insights: AgentInsight[];
  actions: AgentAction[];
  progress: ProgressMetrics;
  prediction: CompletionPrediction | null;
  quality: QualityMetrics;
  activeResearch: ResearchGap[];
  recentActivity: ActivityItem[];
}

export interface ActivityItem {
  id: string;
  type: 'generation' | 'research' | 'citation' | 'export' | 'edit';
  description: string;
  timestamp: Date;
  metadata?: Record<string, any>;
}

// ============================================================================
// Helper Functions
// ============================================================================

export function getInsightPriority(severity: InsightType): InsightPriority {
  const mapping: Record<InsightType, InsightPriority> = {
    info: 'low',
    suggestion: 'medium',
    success: 'low',
    warning: 'high',
    critical: 'critical'
  };
  return mapping[severity];
}

export function getConfidenceLabel(confidence: number): string {
  if (confidence >= 0.9) return 'Very High';
  if (confidence >= 0.75) return 'High';
  if (confidence >= 0.5) return 'Medium';
  if (confidence >= 0.25) return 'Low';
  return 'Very Low';
}

export function getRiskLevelColor(level: 'low' | 'medium' | 'high'): string {
  const colors = {
    low: 'text-green-400',
    medium: 'text-amber-400',
    high: 'text-red-400'
  };
  return colors[level];
}

export function formatPrediction(prediction: CompletionPrediction): string {
  const dateStr = prediction.predictedCompletionDate.toLocaleDateString();
  return `${prediction.daysRemaining} days (${dateStr})`;
}

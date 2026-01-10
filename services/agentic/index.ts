export type {
  AgentConfig,
  AgentInsight,
  AgentAction
} from './AgenticModeManager';

export {
  AgenticModeManager
} from './AgenticModeManager';

export type {
  ResearchQuery,
  ResearchFilters,
  ResearchPaper,
  ResearchResult,
  ResearchGap,
  TopicCluster
} from './ResearchIntelligenceEngine';

export {
  ResearchIntelligenceEngine,
  researchIntelligence
} from './ResearchIntelligenceEngine';

export type {
  CitationNode,
  CitationEdge,
  CitationGraph,
  CitationCluster,
  CitationPathway,
  CitationMetrics
} from './CitationGraphEngine';

export {
  CitationGraphEngine,
  citationGraphEngine
} from './CitationGraphEngine';

export type {
  ProgressMetrics,
  ChapterProgress,
  WordCountMetrics,
  CitationMetrics as ProgressCitationMetrics,
  TimelineMetrics,
  EstimatedCompletion,
  RiskFactor,
  WritingSession
} from './ProgressPredictor';

export {
  ProgressPredictor,
  progressPredictor
} from './ProgressPredictor';

export type {
  ExportFormat,
  ExportOptions,
  ExportResult,
  LaTeXTemplate
} from './ExportEngine';

export {
  ExportEngine,
  exportEngine
} from './ExportEngine';

export type {
  VoiceCommand,
  VoiceAction,
  VoiceActionType,
  VoiceRecognitionConfig,
  VoiceFeedback,
  SpeechSynthesisConfig
} from './VoiceCommandSystem';

export {
  VoiceCommandSystem,
  voiceSystem
} from './VoiceCommandSystem';

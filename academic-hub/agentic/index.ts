/**
 * Agentic Module Index
 * 
 * Central exports for all agentic capabilities.
 */

export { AgenticOrchestrator, type AgentEvent, type AgentAction, type AgentConfig } from './AgenticOrchestrator';
export { AutoResearchAgent, type DiscoveredPaper, type ResearchAgentState } from './AutoResearchAgent';
export { WritingCoach, type WritingAnalysis, type WritingIssue } from './WritingCoach';
export { DeadlineManager, type Milestone, type PaceRecommendation, type ProgressSnapshot } from './DeadlineManager';

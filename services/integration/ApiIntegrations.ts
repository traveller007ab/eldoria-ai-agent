import { bridgeClient } from '../bridgeClient';
import type { 
    MonteCarloConfig, 
    MonteCarloResult, 
    SensitivityInput, 
    SensitivityResult,
    OptimizationResult,
    ComponentOptimizerConfig 
} from './SimulationIntegration';

export interface MediaExtractionResult {
    images: Array<{
        url: string;
        alt: string;
        caption?: string;
        sourceUrl: string;
    }>;
    tables: Array<{
        headers: string[];
        rows: string[][];
        caption?: string;
        sourceUrl: string;
    }>;
    links: Array<{
        url: string;
        title: string;
        type: 'pdf' | 'html' | 'other';
    }>;
}

export interface MediaExtractionRequest {
    url: string;
    extractImages?: boolean;
    extractTables?: boolean;
    extractLinks?: boolean;
}

export async function extractMedia(request: MediaExtractionRequest): Promise<MediaExtractionResult> {
    const response = await bridgeClient.post('/research/extract-media', request);
    return response.data;
}

export interface MonteCarloRequest {
    blueprint: Record<string, unknown>;
    config: MonteCarloConfig;
}

export async function runMonteCarlo(request: MonteCarloRequest): Promise<MonteCarloResult> {
    const response = await bridgeClient.post('/simulation/monte-carlo', request);
    return response.data;
}

export interface SensitivityRequest {
    blueprint: Record<string, unknown>;
    inputs: SensitivityInput[];
    outputMetrics: { key: string; label: string }[];
}

export async function runSensitivityAnalysis(request: SensitivityRequest): Promise<SensitivityResult> {
    const response = await bridgeClient.post('/simulation/sensitivity', request);
    return response.data;
}

export interface OptimizationRequest {
    blueprint: Record<string, unknown>;
    componentId: string;
    componentType: 'pump' | 'heat_exchanger' | 'pipe' | 'valve' | 'motor' | 'engine';
    requirements: Record<string, number>;
    config?: Partial<ComponentOptimizerConfig>;
}

export async function runOptimization(request: OptimizationRequest): Promise<OptimizationResult> {
    const response = await bridgeClient.post('/optimize/component', request);
    return response.data;
}

export interface ComplianceCheckRequest {
    projectId: string;
    chapterContent: Record<string, string>;
    references: Array<{
        id: string;
        authors: string[];
        year: number;
        title: string;
        source: string;
    }>;
    checkApa?: boolean;
    checkStructure?: boolean;
    checkReferences?: boolean;
}

export interface ComplianceCheckResult {
    score: number;
    issues: Array<{
        type: 'error' | 'warning' | 'suggestion';
        category: string;
        message: string;
        location?: {
            chapter?: string;
            paragraph?: number;
        };
        suggestion?: string;
    }>;
    summary: {
        passed: number;
        warnings: number;
        suggestions: number;
    };
}

export async function checkCompliance(request: ComplianceCheckRequest): Promise<ComplianceCheckResult> {
    const response = await bridgeClient.post('/compliance/check', request);
    return response.data;
}

export interface CitationSearchRequest {
    query: string;
    context?: string;
    count?: number;
}

export interface CitationSearchResult {
    citations: Array<{
        id: string;
        title: string;
        authors: string[];
        year: number;
        source: string;
        relevanceScore: number;
        doi?: string;
        url?: string;
        abstract?: string;
    }>;
    suggestions: string[];
}

export async function searchCitations(request: CitationSearchRequest): Promise<CitationSearchResult> {
    const response = await bridgeClient.post('/citation/search', request);
    return response.data;
}

export interface SafAskRequest {
    question: string;
    systemContext?: Record<string, unknown>;
    componentCount?: number;
    hasSimulationResults?: boolean;
}

export interface SafAskResult {
    answer: string;
    source: 'ai' | 'demo';
    relevantComponents?: string[];
    suggestions: string[];
}

export async function askSaf(request: SafAskRequest): Promise<SafAskResult> {
    const response = await bridgeClient.post('/saf/ask', request);
    return response.data;
}

export interface ScenarioInfo {
    id: string;
    name: string;
    description: string;
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    objectives: string[];
    estimatedTime: number;
    rewards: {
        xp: number;
        badges: string[];
    };
}

export interface ScenarioListResult {
    scenarios: ScenarioInfo[];
    activeScenarioId?: string;
    progress: Record<string, {
        status: 'locked' | 'available' | 'in_progress' | 'completed';
        progress: number;
        score?: number;
    }>;
}

export async function listScenarios(): Promise<ScenarioListResult> {
    const response = await bridgeClient.get('/scenarios/list');
    return response.data;
}

export async function startScenario(scenarioId: string): Promise<{
    scenarioId: string;
    missionId: string;
    instructions: string;
}> {
    const response = await bridgeClient.post('/scenarios/start', { scenarioId });
    return response.data;
}

export async function completeMission(missionId: string, results: Record<string, unknown>): Promise<{
    completed: boolean;
    xpEarned: number;
    badges: string[];
    feedback: string;
}> {
    const response = await bridgeClient.post('/scenarios/complete', { missionId, results });
    return response.data;
}

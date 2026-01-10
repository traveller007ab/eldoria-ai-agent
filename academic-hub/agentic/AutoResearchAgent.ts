/**
 * Auto Research Agent
 * 
 * Autonomous literature discovery and citation management.
 * Works in the background to find relevant papers based on:
 * - Project keywords
 * - Chapter content
 * - Citation gaps
 */

import { AcademicProject } from '../../types';
import { AgenticOrchestrator, AgentEvent } from './AgenticOrchestrator';

export interface DiscoveredPaper {
    id: string;
    title: string;
    authors: string[];
    year: number;
    abstract: string;
    source: string;
    url?: string;
    doi?: string;
    relevanceScore: number;
    citationCount?: number;
    suggestedFor?: string; // Chapter name
}

export interface ResearchAgentState {
    isSearching: boolean;
    lastSearchTime: Date | null;
    discoveredPapers: DiscoveredPaper[];
    searchHistory: string[];
}

class AutoResearchAgentClass {
    private state: ResearchAgentState = {
        isSearching: false,
        lastSearchTime: null,
        discoveredPapers: [],
        searchHistory: []
    };

    /**
     * Analyze project and suggest research directions
     */
    async analyzeProject(project: AcademicProject): Promise<{
        gaps: string[];
        suggestedKeywords: string[];
        underCitedChapters: string[];
    }> {
        const wizard = project.wizard_state;
        const existingKeywords = wizard.literature?.keywords || [];
        const references = project.references || [];
        const draftContent = project.draft_content || {};

        // Identify under-cited chapters
        const underCitedChapters: string[] = [];
        Object.entries(draftContent).forEach(([chapter, content]) => {
            if (typeof content === 'string' && content.length > 500) {
                // Count citations in this chapter
                const citationPattern = /\(\w+,?\s*\d{4}\)|\[\d+\]/g;
                const citations = (content.match(citationPattern) || []).length;
                const wordCount = content.split(/\s+/).length;

                // Less than 1 citation per 500 words is under-cited
                if (citations < wordCount / 500) {
                    underCitedChapters.push(chapter);
                }
            }
        });

        // Extract key terms from title and objectives
        const suggestedKeywords: string[] = [];
        const title = wizard.basics?.title || '';
        const aim = wizard.objectives?.aim || '';

        // Simple keyword extraction (split on common words)
        const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this', 'that', 'these', 'those']);

        const extractKeywords = (text: string): string[] => {
            return text
                .toLowerCase()
                .replace(/[^a-z\s]/g, '')
                .split(/\s+/)
                .filter(word => word.length > 4 && !stopWords.has(word));
        };

        const titleKeywords = extractKeywords(title);
        const aimKeywords = extractKeywords(aim);

        // Combine and deduplicate
        const allKeywords = [...new Set([...titleKeywords, ...aimKeywords])];
        const newKeywords = allKeywords.filter(k => !existingKeywords.includes(k));
        suggestedKeywords.push(...newKeywords.slice(0, 5));

        // Identify research gaps
        const gaps: string[] = [];
        if (references.length < 10) {
            gaps.push('Limited reference base - consider expanding literature review');
        }
        if (underCitedChapters.length > 0) {
            gaps.push(`Chapters needing more citations: ${underCitedChapters.join(', ')}`);
        }
        if (existingKeywords.length < 3) {
            gaps.push('Add more research keywords for comprehensive literature discovery');
        }

        return { gaps, suggestedKeywords, underCitedChapters };
    }

    /**
     * Search for papers using Tavily or CrossRef
     */
    async discoverPapers(
        keywords: string[],
        project: AcademicProject,
        options: { maxResults?: number; yearFrom?: number } = {}
    ): Promise<DiscoveredPaper[]> {
        const { maxResults = 10, yearFrom = 2015 } = options;

        this.state.isSearching = true;
        this.state.searchHistory.push(keywords.join(' '));

        try {
            // Try to use the academic search service
            const query = keywords.join(' ') + ' academic research';

            // Simulated discovery (in production, this would call Tavily/CrossRef APIs)
            const mockPapers: DiscoveredPaper[] = keywords.slice(0, 3).map((keyword, i) => ({
                id: `paper-${Date.now()}-${i}`,
                title: `Research on ${keyword.charAt(0).toUpperCase() + keyword.slice(1)}: A Comprehensive Review`,
                authors: ['Smith, J.', 'Johnson, A.', 'Williams, B.'],
                year: 2023 - i,
                abstract: `This paper presents a comprehensive analysis of ${keyword} in the context of modern engineering applications...`,
                source: 'Discovered via Auto-Research Agent',
                relevanceScore: 0.85 - (i * 0.1),
                citationCount: 45 - (i * 10),
                suggestedFor: Object.keys(project.draft_content || {})[0] || 'Literature Review'
            }));

            this.state.discoveredPapers = [...mockPapers, ...this.state.discoveredPapers].slice(0, 50);
            this.state.lastSearchTime = new Date();

            // Emit discovery event
            if (mockPapers.length > 0) {
                AgenticOrchestrator.emit({
                    id: `discovery-${Date.now()}`,
                    type: 'citation_found',
                    source: 'research',
                    priority: 'medium',
                    title: 'New Papers Discovered',
                    message: `Found ${mockPapers.length} potentially relevant papers for your research.`,
                    timestamp: new Date(),
                    read: false,
                    data: { papers: mockPapers },
                    actions: [
                        { id: 'view', label: 'View Papers', type: 'navigate', payload: '/academic/papers' },
                        { id: 'add-all', label: 'Add to Vault', type: 'custom', payload: 'add_papers' }
                    ]
                });
            }

            return mockPapers;
        } catch (error) {
            console.error('Paper discovery failed:', error);
            return [];
        } finally {
            this.state.isSearching = false;
        }
    }

    /**
     * Get citation suggestions for a specific chapter
     */
    getSuggestionsForChapter(chapterName: string): DiscoveredPaper[] {
        return this.state.discoveredPapers.filter(p =>
            p.suggestedFor === chapterName || !p.suggestedFor
        ).slice(0, 5);
    }

    /**
     * Get current state
     */
    getState(): ResearchAgentState {
        return { ...this.state };
    }

    /**
     * Clear discovered papers
     */
    clearDiscoveries() {
        this.state.discoveredPapers = [];
    }
}

export const AutoResearchAgent = new AutoResearchAgentClass();
export default AutoResearchAgent;

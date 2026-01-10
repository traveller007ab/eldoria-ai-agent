/**
 * Research Intelligence Engine
 * 
 * Advanced research discovery and analysis system:
 * - Semantic search across multiple sources
 * - Paper relationship mapping
 * - Research gap detection
 * - Citation network analysis
 * - Auto-discovery of related work
 */

import type { AcademicProject, Reference } from '../../types';
import { advancedSearchTavily } from '../tavilyService';
import { runGroqGenerate } from '../groqService';

export interface ResearchQuery {
  id: string;
  query: string;
  context?: string;
  filters?: ResearchFilters;
  priority: 'high' | 'medium' | 'low';
}

export interface ResearchFilters {
  dateRange?: { start: string; end: string };
  sources?: string[];
  domains?: string[];
  citationCount?: { min: number; max?: number };
  openAccess?: boolean;
}

export interface ResearchPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  year: number;
  venue?: string;
  doi?: string;
  url: string;
  citations: number;
  relevanceScore: number;
  keyFindings: string[];
  methodology?: string;
  limitations?: string;
  openAccess: boolean;
  pdfUrl?: string;
  tags: string[];
  publishedAt: Date;
}

export interface ResearchResult {
  query: ResearchQuery;
  papers: ResearchPaper[];
  totalFound: number;
  searchTime: number;
  suggestions: string[];
  relatedConcepts: string[];
}

export interface CitationNode {
  paperId: string;
  title: string;
  citations: number;
  referencedBy: string[];
  references: string[];
}

export interface CitationGraph {
  nodes: Map<string, CitationNode>;
  edges: Map<string, Set<string>>;
  centralPapers: string[];
  clusters: string[][];
}

export interface ResearchGap {
  id: string;
  topic: string;
  description: string;
  relatedObjectives: string[];
  priority: 'high' | 'medium' | 'low';
  searchQueries: string[];
  existingResearch: ResearchPaper[];
  potentialContributions: string[];
  feasibilityScore: number;
}

export interface TopicCluster {
  id: string;
  name: string;
  papers: ResearchPaper[];
  keywords: string[];
  centrality: number;
  emerging: boolean;
  mature: boolean;
}

export class ResearchIntelligenceEngine {
  private project: AcademicProject | null = null;
  private paperCache: Map<string, ResearchPaper> = new Map();
  private citationGraph: CitationGraph | null = null;
  private maxResults: number = 20;
  private minRelevanceScore: number = 0.5;

  constructor(project?: AcademicProject) {
    if (project) {
      this.initialize(project);
    }
  }

  /**
   * Initialize the engine with a project
   */
  initialize(project: AcademicProject): void {
    this.project = project;
    this.paperCache.clear();
    this.citationGraph = null;
  }

  /**
   * Perform comprehensive research search
   */
  async search(query: ResearchQuery): Promise<ResearchResult> {
    const startTime = Date.now();
    
    try {
      // Generate search variations using AI
      const expandedQueries = await this.expandSearchQuery(query);
      
      // Search multiple sources in parallel
      const searchPromises = expandedQueries.map(q => this.performSearch(q));
      const results = await Promise.all(searchPromises);
      
      // Merge and deduplicate results
      const mergedPapers = this.mergeSearchResults(results);
      
      // Score and rank papers
      const scoredPapers = await this.scoreAndRankPapers(mergedPapers, query);
      
      // Extract related concepts
      const relatedConcepts = await this.extractRelatedConcepts(scoredPapers);
      
      // Generate suggestions
      const suggestions = this.generateSuggestions(scoredPapers, query);
      
      const searchTime = Date.now() - startTime;
      
      return {
        query,
        papers: scoredPapers.slice(0, this.maxResults),
        totalFound: scoredPapers.length,
        searchTime,
        suggestions,
        relatedConcepts
      };
      
    } catch (error) {
      console.error('Research search failed:', error);
      throw error;
    }
  }

  /**
   * Expand a search query using AI
   */
  private async expandSearchQuery(query: ResearchQuery): Promise<ResearchQuery[]> {
    const context = query.context || this.getProjectContext();
    
    const prompt = `Given the following research context, generate 3-5 alternative search queries that would find relevant academic papers. Also suggest related keywords and concepts.

Context: ${context}
Original Query: ${query.query}

Generate variations that:
1. Use different terminology for the same concepts
2. Include specific methodologies or techniques
3. Cover broader and narrower aspects
4. Include known author names if applicable

Respond with JSON array of {query, priority} objects.`;

    try {
      const response = await runGroqGenerate([
        { role: 'system', content: 'You are a research librarian assistant.' },
        { role: 'user', content: prompt }
      ], { temperature: 0.7 });

      const variations = JSON.parse(response);
      
      return variations.map((v: { query: string; priority?: string }) => ({
        ...query,
        id: `${query.id}-${Math.random().toString(36).substr(2, 9)}`,
        query: v.query,
        priority: (v.priority as 'high' | 'medium' | 'low') || query.priority
      }));
    } catch {
      // Fallback to original query
      return [query];
    }
  }

  /**
   * Perform search using Tavily
   */
   private async performSearch(query: ResearchQuery): Promise<ResearchPaper[]> {
    try {
      const data = await advancedSearchTavily(query.query);
      const results = data.results || [];

      return results.map((r: any) => this.convertToResearchPaper(r, query));
    } catch (error) {
      console.error('Tavily search failed:', error);
      return [];
    }
  }

  /**
   * Convert Tavily results to ResearchPaper format
   */
  private convertToResearchPaper(result: any, query: ResearchQuery): ResearchPaper {
    const id = this.generatePaperId(result.url);
    
    return {
      id,
      title: result.title || 'Untitled',
      authors: this.parseAuthors(result.author || ''),
      abstract: result.content?.substring(0, 500) || '',
      year: this.parseYear(result.publishedAt || result.date),
      venue: result.venue || result.source,
      doi: result.doi,
      url: result.url,
      citations: result.citations || 0,
      relevanceScore: this.calculateRelevanceScore(result, query),
      keyFindings: this.extractKeyFindings(result.content),
      methodology: result.methodology,
      limitations: result.limitations,
      openAccess: result.isOpenAccess || false,
      pdfUrl: result.pdfUrl,
      tags: result.tags || [],
      publishedAt: new Date(result.publishedAt || Date.now())
    };
  }

  /**
   * Merge results from multiple searches
   */
  private mergeSearchResults(results: ResearchPaper[][]): ResearchPaper[] {
    const paperMap = new Map<string, ResearchPaper>();
    
    for (const papers of results) {
      for (const paper of papers) {
        const existing = paperMap.get(paper.id);
        if (!existing || paper.relevanceScore > existing.relevanceScore) {
          paperMap.set(paper.id, paper);
        }
      }
    }
    
    return Array.from(paperMap.values());
  }

  /**
   * Score and rank papers using ML-like scoring
   */
  private async scoreAndRankPapers(
    papers: ResearchPaper[],
    query: ResearchQuery
  ): Promise<ResearchPaper[]> {
    // Get project context for relevance scoring
    const context = this.getProjectContext();
    
    const scoredPapers = papers.map(paper => {
      let score = paper.relevanceScore;
      
      // Recency boost
      const yearsSince = new Date().getFullYear() - paper.year;
      if (yearsSince <= 2) score += 0.1;
      else if (yearsSince <= 5) score += 0.05;
      
      // Citation boost (with diminishing returns)
      if (paper.citations > 100) score += 0.1;
      else if (paper.citations > 50) score += 0.05;
      else if (paper.citations > 10) score += 0.02;
      
      // Open access bonus
      if (paper.openAccess) score += 0.05;
      
      // PDF availability bonus
      if (paper.pdfUrl) score += 0.03;
      
      // Context relevance
      const contextRelevance = this.calculateContextRelevance(paper, context);
      score = score * 0.7 + contextRelevance * 0.3;
      
      return { ...paper, relevanceScore: Math.min(1, score) };
    });
    
    // Sort by score descending
    return scoredPapers
      .filter(p => p.relevanceScore >= this.minRelevanceScore)
      .sort((a, b) => b.relevanceScore - a.relevanceScore);
  }

  /**
   * Extract related concepts from search results
   */
  private async extractRelatedConcepts(papers: ResearchPaper[]): Promise<string[]> {
    const allKeywords = new Set<string>();
    
    papers.forEach(paper => {
      paper.tags.forEach(tag => allKeywords.add(tag));
      this.extractKeywordsFromText(paper.title + ' ' + paper.abstract)
        .forEach(kw => allKeywords.add(kw));
    });
    
    // Use AI to find the most relevant concepts
    const topKeywords = Array.from(allKeywords).slice(0, 20);
    
    return topKeywords;
  }

  /**
   * Generate search suggestions
   */
  private generateSuggestions(papers: ResearchPaper[], query: ResearchQuery): string[] {
    const suggestions: string[] = [];
    
    // Suggest based on common themes
    const themes = this.identifyCommonThemes(papers);
    themes.forEach(theme => {
      suggestions.push(`Explore more on "${theme}"`);
    });
    
    // Suggest based on methodology patterns
    const methods = this.identifyCommonMethods(papers);
    methods.forEach(method => {
      suggestions.push(`Compare ${method} approaches`);
    });
    
    return suggestions.slice(0, 5);
  }

  /**
   * Build citation graph from papers
   */
  buildCitationGraph(papers: ResearchPaper[]): CitationGraph {
    const nodes = new Map<string, CitationNode>();
    const edges = new Map<string, Set<string>>();
    
    papers.forEach(paper => {
      nodes.set(paper.id, {
        paperId: paper.id,
        title: paper.title,
        citations: paper.citations,
        referencedBy: [],
        references: []
      });
    });
    
    // Build edges based on common citations
    for (const [id1, node1] of nodes) {
      for (const [id2, node2] of nodes) {
        if (id1 !== id2) {
          // Check for citation relationship (simplified)
          if (this.papersAreRelated(node1.title, node2.title)) {
            if (!edges.has(id1)) edges.set(id1, new Set());
            edges.get(id1)!.add(id2);
          }
        }
      }
    }
    
    // Identify central papers (most cited)
    const centralPapers = Array.from(nodes.values())
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 5)
      .map(n => n.paperId);
    
    // Identify clusters
    const clusters = this.identifyClusters(nodes, edges);
    
    this.citationGraph = { nodes, edges, centralPapers, clusters };
    
    return this.citationGraph;
  }

  /**
   * Find research gaps based on project objectives
   */
  async findResearchGaps(): Promise<ResearchGap[]> {
    if (!this.project) return [];
    
    const objectives = this.project.wizard_state.objectives;
    if (!objectives?.specificObjectives) return [];
    
    const gaps: ResearchGap[] = [];
    
    for (const objective of objectives.specificObjectives) {
      // Search for existing research on this objective
      const result = await this.search({
        id: `gap-${objective}`,
        query: objective,
        priority: 'high'
      });
      
      // Analyze coverage
      const coverage = this.analyzeResearchCoverage(result.papers, objective);
      
      if (coverage < 0.7) {
        gaps.push({
          id: `gap-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          topic: objective,
          description: `Limited research found for: ${objective}`,
          relatedObjectives: [objective],
          priority: 'medium',
          searchQueries: this.generateGapSearchQueries(objective),
          existingResearch: result.papers.slice(0, 5),
          potentialContributions: this.suggestContributions(objective, result.papers),
          feasibilityScore: this.calculateFeasibility(result.papers)
        });
      }
    }
    
    return gaps.sort((a, b) => {
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      return priorityOrder[a.priority] - priorityOrder[b.priority];
    });
  }

  /**
   * Cluster papers by topic
   */
  clusterPapers(papers: ResearchPaper[]): TopicCluster[] {
    const clusters: Map<string, ResearchPaper[]> = new Map();
    
    // Simple clustering by tags/keywords
    papers.forEach(paper => {
      const mainTag = paper.tags[0] || 'Other';
      if (!clusters.has(mainTag)) {
        clusters.set(mainTag, []);
      }
      clusters.get(mainTag)!.push(paper);
    });
    
    return Array.from(clusters.entries()).map(([name, clusterPapers]) => ({
      id: `cluster-${name.toLowerCase().replace(/\s+/g, '-')}`,
      name,
      papers: clusterPapers,
      keywords: this.extractClusterKeywords(clusterPapers),
      centrality: this.calculateClusterCentrality(clusterPapers),
      emerging: this.isEmergingCluster(clusterPapers),
      mature: this.isMatureCluster(clusterPapers)
    }));
  }

  /**
   * Auto-discover related papers for a given paper
   */
  async discoverRelatedPapers(paperId: string): Promise<ResearchPaper[]> {
    const paper = this.paperCache.get(paperId);
    if (!paper) return [];
    
    // Search using paper's keywords and title
    const query: ResearchQuery = {
      id: `related-${paperId}`,
      query: `${paper.title} ${paper.tags.join(' ')}`,
      priority: 'medium',
      filters: {
        citationCount: { min: 10 },
        dateRange: {
          start: new Date(paper.year - 5, 1, 1).toISOString().split('T')[0],
          end: new Date().toISOString().split('T')[0]
        }
      }
    };
    
    const result = await this.search(query);
    
    // Filter out the original paper
    return result.papers.filter(p => p.id !== paperId).slice(0, 10);
  }

  /**
   * Get research analytics
   */
  getAnalytics(papers: ResearchPaper[]): {
    totalPapers: number;
    avgCitations: number;
    yearRange: { min: number; max: number };
    topAuthors: { name: string; count: number }[];
    topVenues: { name: string; count: number }[];
    openAccessPercent: number;
    citationDistribution: { range: string; count: number }[];
  } {
    const citations = papers.map(p => p.citations);
    const years = papers.map(p => p.year);
    const authorCounts = new Map<string, number>();
    const venueCounts = new Map<string, number>();
    
    papers.forEach(paper => {
      paper.authors.forEach(author => {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
      });
      if (paper.venue) {
        venueCounts.set(paper.venue, (venueCounts.get(paper.venue) || 0) + 1);
      }
    });
    
    const citationDistribution = [
      { range: '0-10', count: citations.filter(c => c < 10).length },
      { range: '10-50', count: citations.filter(c => c >= 10 && c < 50).length },
      { range: '50-100', count: citations.filter(c => c >= 50 && c < 100).length },
      { range: '100+', count: citations.filter(c => c >= 100).length }
    ];
    
    return {
      totalPapers: papers.length,
      avgCitations: citations.reduce((a, b) => a + b, 0) / Math.max(1, papers.length),
      yearRange: {
        min: Math.min(...years),
        max: Math.max(...years)
      },
      topAuthors: Array.from(authorCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      topVenues: Array.from(venueCounts.entries())
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([name, count]) => ({ name, count })),
      openAccessPercent: (papers.filter(p => p.openAccess).length / papers.length) * 100,
      citationDistribution
    };
  }

  // Helper methods

  private getProjectContext(): string {
    if (!this.project) return '';
    const ws = this.project.wizard_state;
    return `
      Topic: ${ws.basics?.title || ''}
      Objectives: ${ws.objectives?.specificObjectives?.join('; ') || ''}
      Scope: ${ws.scope?.scopeOfWork || ''}
      Keywords: ${ws.literature?.keywords?.join(', ') || ''}
    `.trim();
  }

  private generatePaperId(url: string): string {
    return Buffer.from(url).toString('base64').substring(0, 16);
  }

  private parseAuthors(authorString: string): string[] {
    if (!authorString) return [];
    return authorString.split(/[,;&]/).map(a => a.trim()).filter(a => a.length > 0);
  }

  private parseYear(dateString: string): number {
    const match = dateString?.match(/\d{4}/);
    return match ? parseInt(match[0]) : new Date().getFullYear();
  }

  private calculateRelevanceScore(result: any, query: ResearchQuery): number {
    // Simple relevance scoring based on title match
    const titleLower = result.title?.toLowerCase() || '';
    const queryLower = query.query.toLowerCase();
    const queryWords = queryLower.split(/\s+/);
    
    let score = 0;
    queryWords.forEach(word => {
      if (titleLower.includes(word)) score += 0.2;
    });
    
    return Math.min(1, score);
  }

  private calculateContextRelevance(paper: ResearchPaper, context: string): number {
    const paperText = (paper.title + ' ' + paper.abstract + ' ' + paper.tags.join(' ')).toLowerCase();
    const contextWords = context.toLowerCase().split(/\s+/);
    
    let matches = 0;
    contextWords.forEach(word => {
      if (word.length > 3 && paperText.includes(word)) matches++;
    });
    
    return Math.min(1, matches / Math.max(1, contextWords.length / 10));
  }

  private extractKeyFindings(content: string): string[] {
    // Simplified - would use NLP in production
    const sentences = content.split(/[.!?]+/).slice(0, 5);
    return sentences.filter(s => s.length > 20 && s.length < 200).map(s => s.trim());
  }

  private extractKeywordsFromText(text: string): string[] {
    // Simplified keyword extraction
    const words = text.toLowerCase().split(/\s+/);
    const stopWords = new Set(['the', 'a', 'an', 'and', 'or', 'but', 'is', 'are', 'was', 'were', 'of', 'in', 'on', 'at', 'to', 'for', 'with', 'by', 'this', 'that', 'these', 'those']);
    return [...new Set(words.filter(w => w.length > 4 && !stopWords.has(w)))].slice(0, 10);
  }

  private identifyCommonThemes(papers: ResearchPaper[]): string[] {
    const tagCounts = new Map<string, number>();
    papers.forEach(p => {
      p.tags.forEach(tag => {
        tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
      });
    });
    
    return Array.from(tagCounts.entries())
      .filter(([_, count]) => count > 1)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([tag]) => tag);
  }

  private identifyCommonMethods(papers: ResearchPaper[]): string[] {
    const methodPatterns = ['machine learning', 'experimental', 'survey', 'case study', 'simulation', 'analysis'];
    const found = new Set<string>();
    
    papers.forEach(p => {
      const text = (p.title + ' ' + p.abstract).toLowerCase();
      methodPatterns.forEach(pattern => {
        if (text.includes(pattern)) found.add(pattern);
      });
    });
    
    return Array.from(found);
  }

  private papersAreRelated(title1: string, title2: string): boolean {
    const words1 = new Set(title1.toLowerCase().split(/\s+/));
    const words2 = new Set(title2.toLowerCase().split(/\s+/));
    
    let common = 0;
    words1.forEach(w => {
      if (w.length > 4 && words2.has(w)) common++;
    });
    
    return common >= 2;
  }

  private identifyClusters(nodes: Map<string, CitationNode>, edges: Map<string, Set<string>>): string[][] {
    // Simplified clustering - would use graph algorithms in production
    const visited = new Set<string>();
    const clusters: string[][] = [];
    
    nodes.forEach((_, id) => {
      if (visited.has(id)) return;
      
      const cluster: string[] = [];
      const stack = [id];
      
      while (stack.length > 0) {
        const current = stack.pop()!;
        if (visited.has(current)) continue;
        
        visited.add(current);
        cluster.push(current);
        
        const connected = edges.get(current);
        if (connected) {
          connected.forEach(neighbor => {
            if (!visited.has(neighbor)) {
              stack.push(neighbor);
            }
          });
        }
      }
      
      if (cluster.length > 1) {
        clusters.push(cluster);
      }
    });
    
    return clusters;
  }

  private analyzeResearchCoverage(papers: ResearchPaper[], objective: string): number {
    // Simplified coverage analysis
    if (papers.length === 0) return 0;
    if (papers.length >= 10) return 1;
    if (papers.length >= 5) return 0.7;
    return 0.4;
  }

  private generateGapSearchQueries(objective: string): string[] {
    return [
      `${objective} recent advances`,
      `${objective} limitations`,
      `${objective} future research`,
      `${objective} open questions`
    ];
  }

  private suggestContributions(objective: string, papers: ResearchPaper[]): string[] {
    return [
      `Validate findings in new context`,
      `Extend methodology to related areas`,
      `Compare with alternative approaches`,
      `Develop practical applications`
    ];
  }

  private calculateFeasibility(papers: ResearchPaper[]): number {
    // Higher feasibility if there's existing research to build on
    if (papers.length === 0) return 0.3;
    if (papers.length < 5) return 0.5;
    return 0.7;
  }

  private extractClusterKeywords(papers: ResearchPaper[]): string[] {
    const keywords = new Set<string>();
    papers.forEach(p => {
      this.extractKeywordsFromText(p.title + ' ' + p.abstract)
        .forEach(kw => keywords.add(kw));
    });
    return Array.from(keywords).slice(0, 10);
  }

  private calculateClusterCentrality(papers: ResearchPaper[]): number {
    const avgCitations = papers.reduce((sum, p) => sum + p.citations, 0) / papers.length;
    return Math.min(1, avgCitations / 100);
  }

  private isEmergingCluster(papers: ResearchPaper[]): boolean {
    const recentPapers = papers.filter(p => p.year >= new Date().getFullYear() - 3);
    return recentPapers.length > papers.length * 0.5;
  }

  private isMatureCluster(papers: ResearchPaper[]): boolean {
    const oldPapers = papers.filter(p => p.year < new Date().getFullYear() - 10);
    return oldPapers.length > papers.length * 0.5;
  }
}

// Export singleton instance
export const researchIntelligence = new ResearchIntelligenceEngine();

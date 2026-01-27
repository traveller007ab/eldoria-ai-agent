import type { Reference } from '../../types';

export interface CitationNode {
  paperId: string;
  title: string;
  authors: string[];
  year: number;
  citations: number;
  referencedBy: string[];
  references: string[];
  relevanceScore: number;
}

export interface CitationEdge {
  source: string;
  target: string;
  strength: number;
  type: 'cites' | 'related' | 'influenced';
}

export interface CitationGraph {
  nodes: Map<string, CitationNode>;
  edges: CitationEdge[];
  centralPapers: string[];
  researchClusters: CitationCluster[];
  citationPathways: CitationPathway[];
}

export interface CitationCluster {
  id: string;
  name: string;
  paperIds: string[];
  centrality: number;
  coherence: number;
  theme: string;
}

export interface CitationPathway {
  from: string;
  to: string;
  path: string[];
  influence: number;
}

export interface CitationMetrics {
  hIndex: number;
  i10Index: number;
  citationVelocity: number;
  fieldWeightedCitationImpact: number;
  topCitedPapers: { id: string; title: string; citations: number }[];
  citationTrends: { year: number; citations: number }[];
}

export class CitationGraphEngine {
  private graph: CitationGraph | null = null;
  private references: Reference[] = [];

  constructor(references?: Reference[]) {
    if (references) {
      this.buildGraph(references);
    }
  }

  buildGraph(references: Reference[]): CitationGraph {
    this.references = references;
    this.graph = {
      nodes: new Map(),
      edges: [],
      centralPapers: [],
      researchClusters: [],
      citationPathways: []
    };

    for (const ref of references) {
      const node: CitationNode = {
        paperId: ref.id,
        title: ref.title,
        authors: Array.isArray(ref.authors)
          ? ref.authors.map(a => `${a.firstName} ${a.lastName}`).filter(Boolean)
          : [],
        year: ref.year || new Date().getFullYear(),
        citations: 0,
        referencedBy: [],
        references: [],
        relevanceScore: 0.5
      };

      this.graph.nodes.set(ref.id, node);
    }

    this.buildEdges();
    this.findCentralPapers();
    this.identifyClusters();
    this.mapCitationPathways();

    return this.graph;
  }

  private buildEdges(): void {
    if (!this.graph) return;

    const nodeArray = Array.from(this.graph.nodes.values());

    for (let i = 0; i < nodeArray.length; i++) {
      for (let j = 0; j < nodeArray.length; j++) {
        if (i === j) continue;

        const source = nodeArray[i];
        const target = nodeArray[j];

        const similarity = this.calculateSimilarity(source, target);

        if (similarity > 0.3) {
          const edge: CitationEdge = {
            source: source.paperId,
            target: target.paperId,
            strength: similarity,
            type: similarity > 0.6 ? 'cites' : 'related'
          };

          this.graph.edges.push(edge);

          source.referencedBy.push(target.paperId);
          target.references.push(source.paperId);
        }
      }
    }
  }

  private calculateSimilarity(node1: CitationNode, node2: CitationNode): number {
    let score = 0;

    const title1Words = new Set(node1.title.toLowerCase().split(/\s+/));
    const title2Words = new Set(node2.title.toLowerCase().split(/\s+/));

    let commonWords = 0;
    title1Words.forEach(word => {
      if (word.length > 3 && title2Words.has(word)) commonWords++;
    });

    score += Math.min(0.4, commonWords * 0.1);

    const authorOverlap = node1.authors.filter(a =>
      node2.authors.some(b => a.toLowerCase().includes(b.toLowerCase()) || b.toLowerCase().includes(a.toLowerCase()))
    ).length;
    score += Math.min(0.3, authorOverlap * 0.15);

    const yearDiff = Math.abs(node1.year - node2.year);
    if (yearDiff <= 3) score += 0.2;
    else if (yearDiff <= 5) score += 0.1;

    return Math.min(1, score);
  }

  private findCentralPapers(): void {
    if (!this.graph) return;

    const centralityScores = new Map<string, number>();

    this.graph.nodes.forEach((node, id) => {
      let score = 0;

      score += (node.citations || 0) * 0.01;

      const referencedByCount = node.referencedBy.length;
      score += referencedByCount * 0.05;

      const edgeStrengths = this.graph!.edges
        .filter(e => e.source === id)
        .reduce((sum, e) => sum + e.strength, 0);
      score += edgeStrengths * 0.02;

      centralityScores.set(id, score);
    });

    this.graph.centralPapers = Array.from(centralityScores.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([id]) => id);
  }

  private identifyClusters(): void {
    if (!this.graph) return;

    const visited = new Set<string>();
    const clusters: CitationCluster[] = [];

    const nodeArray = Array.from(this.graph.nodes.values());

    for (const node of nodeArray) {
      if (visited.has(node.paperId)) continue;

      const clusterPapers: string[] = [];
      const stack = [node.paperId];

      while (stack.length > 0) {
        const currentId = stack.pop()!;
        if (visited.has(currentId)) continue;

        visited.add(currentId);
        clusterPapers.push(currentId);

        const relatedEdges = this.graph!.edges.filter(e =>
          (e.source === currentId || e.target === currentId) && e.strength > 0.5
        );

        relatedEdges.forEach(edge => {
          const neighborId = edge.source === currentId ? edge.target : edge.source;
          if (!visited.has(neighborId)) {
            stack.push(neighborId);
          }
        });
      }

      if (clusterPapers.length >= 2) {
        const clusterNodes = clusterPapers.map(id => this.graph!.nodes.get(id)!).filter(Boolean);

        const coherence = this.calculateClusterCoherence(clusterNodes);
        const centrality = clusterNodes.reduce((sum, n) => sum + n.citations, 0) / clusterNodes.length;
        const theme = this.inferClusterTheme(clusterNodes);

        clusters.push({
          id: `cluster-${clusterPapers[0]}`,
          name: theme,
          paperIds: clusterPapers,
          centrality: Math.min(1, centrality / 100),
          coherence,
          theme
        });
      }
    }

    this.graph.researchClusters = clusters.sort((a, b) => b.coherence - a.coherence);
  }

  private calculateClusterCoherence(nodes: CitationNode[]): number {
    if (nodes.length < 2) return 0;

    let totalSimilarity = 0;
    let pairs = 0;

    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const edge = this.graph?.edges.find(e =>
          (e.source === nodes[i].paperId && e.target === nodes[j].paperId) ||
          (e.target === nodes[i].paperId && e.source === nodes[j].paperId)
        );
        if (edge) {
          totalSimilarity += edge.strength;
          pairs++;
        }
      }
    }

    return pairs > 0 ? totalSimilarity / pairs : 0;
  }

  private inferClusterTheme(nodes: CitationNode[]): string {
    const allText = nodes.map(n => n.title + ' ' + n.authors.join(' ')).join(' ').toLowerCase();

    const themes = [
      { keywords: ['neural', 'network', 'deep learning', 'transformer'], name: 'Deep Learning' },
      { keywords: ['optimization', 'algorithm', 'efficiency'], name: 'Optimization' },
      { keywords: ['experimental', 'measurement', 'analysis'], name: 'Experimental' },
      { keywords: ['theoretical', 'model', 'framework'], name: 'Theoretical' },
      { keywords: ['survey', 'review', 'bibliometric'], name: 'Survey/Review' },
      { keywords: ['application', 'case study', 'implementation'], name: 'Applied Research' }
    ];

    for (const theme of themes) {
      const matches = theme.keywords.filter(kw => allText.includes(kw)).length;
      if (matches >= 2) return theme.name;
    }

    const topAuthors = this.findMostCommonAuthor(nodes);
    return topAuthors ? `Research by ${topAuthors}` : 'General Research';
  }

  private findMostCommonAuthor(nodes: CitationNode[]): string | null {
    const authorCounts = new Map<string, number>();

    nodes.forEach(node => {
      node.authors.forEach(author => {
        authorCounts.set(author, (authorCounts.get(author) || 0) + 1);
      });
    });

    const sorted = Array.from(authorCounts.entries())
      .sort((a, b) => b[1] - a[1]);

    return sorted.length > 0 && sorted[0][1] > 1 ? sorted[0][0] : null;
  }

  private mapCitationPathways(): void {
    if (!this.graph) return;

    const pathways: CitationPathway[] = [];

    for (const centralId of this.graph.centralPapers.slice(0, 5)) {
      const centralNode = this.graph.nodes.get(centralId);
      if (!centralNode) continue;

      const influenced = this.graph.edges
        .filter(e => e.source === centralId && e.strength > 0.4)
        .map(e => e.target);

      influenced.forEach(targetId => {
        const targetNode = this.graph!.nodes.get(targetId);
        if (!targetNode) return;

        if (targetNode.year > centralNode.year) {
          pathways.push({
            from: centralNode.title,
            to: targetNode.title,
            path: [centralNode.paperId, targetNode.paperId],
            influence: this.calculateInfluence(centralNode, targetNode)
          });
        }
      });
    }

    this.graph.citationPathways = pathways.sort((a, b) => b.influence - a.influence);
  }

  private calculateInfluence(source: CitationNode, target: CitationNode): number {
    let influence = 0.3;

    influence += Math.min(0.3, source.citations * 0.001);

    const similarity = this.calculateSimilarity(source, target);
    influence += similarity * 0.4;

    const recency = Math.max(0, 1 - (new Date().getFullYear() - target.year) / 10);
    influence += recency * 0.2;

    return Math.min(1, influence);
  }

  getMetrics(): CitationMetrics {
    if (!this.graph) {
      return {
        hIndex: 0,
        i10Index: 0,
        citationVelocity: 0,
        fieldWeightedCitationImpact: 0,
        topCitedPapers: [],
        citationTrends: []
      };
    }

    const citations = Array.from(this.graph.nodes.values())
      .map(n => n.citations)
      .sort((a, b) => b - a);

    const hIndex = this.calculateHIndex(citations);
    const i10Index = citations.filter(c => c >= 10).length;

    const topCited = Array.from(this.graph.nodes.values())
      .sort((a, b) => b.citations - a.citations)
      .slice(0, 5)
      .map(n => ({ id: n.paperId, title: n.title, citations: n.citations }));

    const citationByYear = new Map<number, number>();
    this.graph.nodes.forEach(node => {
      const year = node.year;
      citationByYear.set(year, (citationByYear.get(year) || 0) + node.citations);
    });

    const citationTrends = Array.from(citationByYear.entries())
      .map(([year, citations]) => ({ year, citations }))
      .sort((a, b) => a.year - b.year);

    const avgCitations = citations.reduce((a, b) => a + b, 0) / citations.length;
    const citationVelocity = avgCitations / 3;

    return {
      hIndex,
      i10Index,
      citationVelocity,
      fieldWeightedCitationImpact: avgCitations > 0 ? 1.2 : 0,
      topCitedPapers: topCited,
      citationTrends
    };
  }

  private calculateHIndex(citations: number[]): number {
    let h = 0;
    for (let i = 0; i < citations.length; i++) {
      if (citations[i] >= i + 1) {
        h = i + 1;
      } else {
        break;
      }
    }
    return h;
  }

  findCitationOpportunities(): { paperId: string; missingCitations: string[] }[] {
    if (!this.graph) return [];

    const opportunities: { paperId: string; missingCitations: string[] }[] = [];

    const sortedByCitations = Array.from(this.graph.nodes.values())
      .sort((a, b) => b.citations - a.citations);

    const highlyCited = sortedByCitations.slice(0, 5);

    for (const paper of highlyCited) {
      const referencedIds = new Set(paper.references);

      const potentialCitations: string[] = [];

      this.graph.nodes.forEach(otherPaper => {
        if (otherPaper.paperId === paper.paperId) return;
        if (referencedIds.has(otherPaper.paperId)) return;

        const similarity = this.calculateSimilarity(paper, otherPaper);
        if (similarity > 0.5 && otherPaper.citations > 10) {
          potentialCitations.push(otherPaper.paperId);
        }
      });

      if (potentialCitations.length > 0) {
        opportunities.push({
          paperId: paper.paperId,
          missingCitations: potentialCitations.slice(0, 5)
        });
      }
    }

    return opportunities;
  }

  getGraph(): CitationGraph | null {
    return this.graph;
  }
}

export const citationGraphEngine = new CitationGraphEngine();

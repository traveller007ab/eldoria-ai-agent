import axios from 'axios';
import { logger } from '@/utils/logger';

interface AcademicPaper {
  id: string;
  title: string;
  authors: string[];
  abstract: string;
  url: string;
  pdfUrl?: string;
  publicationDate?: string;
  journal?: string;
  citationCount?: number;
  source: string;
  doi?: string;
  arxivId?: string;
}

interface AcademicSearchProvider {
  name: string;
  search(query: string, limit: number, filters?: Record<string, any>): Promise<AcademicPaper[]>;
  getPaperDetails(id: string): Promise<AcademicPaper | null>;
  isAvailable(): Promise<boolean>;
}

export class AcademicSearchService {
  private providers: AcademicSearchProvider[] = [];
  private defaultProvider: AcademicSearchProvider | null = null;

  constructor() {
    this.registerDefaultProviders();
  }

  private registerDefaultProviders() {
    // arXiv API
    this.providers.push(new ArxivProvider());

    // Semantic Scholar (if API key available)
    if (process.env.SEMANTIC_SCHOLAR_API_KEY) {
      this.providers.push(new SemanticScholarProvider());
    }

    // IEEE Xplore (if API key available)
    if (process.env.IEEE_API_KEY) {
      this.providers.push(new IeeeXploreProvider());
    }

    // Set default provider
    this.defaultProvider = this.providers.length > 0 ? this.providers[0] : null;

    logger.info(`🎓 Academic search service initialized with ${this.providers.length} providers`);
  }

  async searchPapers(
    query: string,
    limit: number = 10,
    filters: Record<string, any> = {}
  ): Promise<AcademicPaper[]> {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    if (!this.defaultProvider) {
      throw new Error('No academic search providers available');
    }

    try {
      logger.info(`🔬 Searching academic papers for: "${query}" (limit: ${limit})`);
      
      const results = await this.defaultProvider.search(query, limit, filters);
      
      logger.info(`📚 Found ${results.length} academic papers for "${query}"`);
      return results;
    } catch (error) {
      logger.error(`❌ Academic search failed for "${query}":`, 
        error instanceof Error ? error.message : error);

      // Try fallback providers
      for (const provider of this.providers) {
        if (provider !== this.defaultProvider) {
          try {
            const fallbackResults = await provider.search(query, limit, filters);
            logger.warn(`🔄 Using fallback academic provider: ${provider.name}`);
            return fallbackResults;
          } catch (fallbackError) {
            logger.warn(`⚠️ Fallback academic provider ${provider.name} failed`);
          }
        }
      }

      throw new Error(`All academic search providers failed for query: "${query}"`);
    }
  }

  async getPaperDetails(paperId: string, source?: string): Promise<AcademicPaper | null> {
    if (!paperId) {
      throw new Error('Paper ID cannot be empty');
    }

    // Try to determine the provider based on the ID format
    let providerToUse: AcademicSearchProvider | null = null;

    if (source) {
      // Use specified source
      providerToUse = this.providers.find(p => p.name.toLowerCase().includes(source.toLowerCase())) || null;
    } else {
      // Auto-detect based on ID format
      if (paperId.startsWith('arxiv:')) {
        providerToUse = this.providers.find(p => p instanceof ArxivProvider) || null;
      } else if (paperId.includes('semanticscholar')) {
        providerToUse = this.providers.find(p => p instanceof SemanticScholarProvider) || null;
      } else if (paperId.includes('ieee')) {
        providerToUse = this.providers.find(p => p instanceof IeeeXploreProvider) || null;
      }
    }

    if (!providerToUse) {
      providerToUse = this.defaultProvider;
    }

    if (!providerToUse) {
      throw new Error('No suitable provider found for paper details');
    }

    try {
      return await providerToUse.getPaperDetails(paperId);
    } catch (error) {
      logger.error(`Failed to get paper details for ${paperId}:`, 
        error instanceof Error ? error.message : error);
      return null;
    }
  }

  async searchAndAnalyze(
    query: string,
    limit: number = 5,
    analysisPrompt: string = 'Summarize the key contributions and methodology'
  ): Promise<{ papers: AcademicPaper[]; analysis: string }> {
    // First search for papers
    const papers = await this.searchPapers(query, limit);

    if (papers.length === 0) {
      return { papers: [], analysis: 'No papers found for the given query.' };
    }

    // Create analysis prompt with paper details
    const paperSummaries = papers.map(paper => {
      return `Title: ${paper.title}\n` +
             `Authors: ${paper.authors.join(', ')}\n` +
             `Abstract: ${paper.abstract.substring(0, 500)}...\n` +
             `URL: ${paper.url}\n`;
    }).join('\n\n');

    const fullAnalysisPrompt = `
    ${analysisPrompt}\n\n` +
    `Papers found:\n\n` +
    `${paperSummaries}\n\n` +
    `Provide a comprehensive analysis including:\n` +
    `1. Key themes and contributions\n` +
    `2. Methodological approaches\n` +
    `3. Gaps or opportunities for further research\n` +
    `4. Most relevant papers for the query`;

    // Use LLM to analyze the results (this would be integrated with our existing LLM services)
    // For now, we'll return a placeholder - this would be enhanced in Phase 2
    const analysis = `Analysis of ${papers.length} papers on "${query}":\n\n` +
                   `Found ${papers.length} relevant academic papers. ` +
                   `Key themes include various approaches to the topic. ` +
                   `The most recent paper was published in ${papers[0].publicationDate || 'recent years'}.`;

    return { papers, analysis };
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }

  async checkProviderAvailability(): Promise<{ provider: string; available: boolean }[]> {
    return Promise.all(
      this.providers.map(async (provider) => ({
        provider: provider.name,
        available: await provider.isAvailable().catch(() => false),
      }))
    );
  }
}

class ArxivProvider implements AcademicSearchProvider {
  name = 'arXiv';

  async search(query: string, limit: number, filters: Record<string, any> = {}): Promise<AcademicPaper[]> {
    try {
      const params: Record<string, any> = {
        search_query: query,
        max_results: Math.min(limit, 50),
        sortBy: 'relevance',
        sortOrder: 'descending',
      };

      // Add filters if provided
      if (filters.subject) {
        params.search_query += ` cat:${filters.subject}`;
      }
      if (filters.dateFrom) {
        params.search_query += ` submittedDate:[${filters.dateFrom} TO NOW]`;
      }

      const response = await axios.get('http://export.arxiv.org/api/query', { params });

      const papers: AcademicPaper[] = [];

      response.data?.feed?.entry?.forEach((entry: any) => {
        papers.push({
          id: `arxiv:${entry.id.split('/').pop()}`,
          title: entry.title?.[0]?._?.replace(/\n/g, ' ') || 'No title',
          authors: entry.author?.map((a: any) => a.name?.[0]?._ || 'Unknown') || [],
          abstract: entry.summary?.[0]?._?.replace(/\n/g, ' ') || 'No abstract',
          url: entry.link?.find((l: any) => l['@_type'] === 'text/html')?['@_href'] || '',
          pdfUrl: entry.link?.find((l: any) => l['@_type'] === 'application/pdf')?['@_href'] || '',
          publicationDate: entry.published?.[0] || '',
          source: 'arXiv',
          arxivId: entry.id.split('/').pop(),
        });
      });

      return papers.slice(0, limit);
    } catch (error) {
      logger.error('arXiv search error:', error instanceof Error ? error.message : error);
      throw new Error('arXiv search failed');
    }
  }

  async getPaperDetails(paperId: string): Promise<AcademicPaper | null> {
    try {
      // Extract arXiv ID from paperId (expecting format arxiv:XXXXXXXX or XXXXXXXX)
      const id = paperId.replace('arxiv:', '');
      
      const response = await axios.get(`http://export.arxiv.org/api/query?id_list=${id}`);
      
      const entry = response.data?.feed?.entry?.[0];
      if (!entry) return null;

      return {
        id: `arxiv:${id}`,
        title: entry.title?.[0]?._?.replace(/\n/g, ' ') || 'No title',
        authors: entry.author?.map((a: any) => a.name?.[0]?._ || 'Unknown') || [],
        abstract: entry.summary?.[0]?._?.replace(/\n/g, ' ') || 'No abstract',
        url: entry.link?.find((l: any) => l['@_type'] === 'text/html')?['@_href'] || '',
        pdfUrl: entry.link?.find((l: any) => l['@_type'] === 'application/pdf')?['@_href'] || '',
        publicationDate: entry.published?.[0] || '',
        source: 'arXiv',
        arxivId: id,
      };
    } catch (error) {
      logger.error(`Failed to get arXiv paper details for ${paperId}:`, 
        error instanceof Error ? error.message : error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    // arXiv is always available (no API key required)
    return true;
  }
}

class SemanticScholarProvider implements AcademicSearchProvider {
  name = 'Semantic Scholar';

  async search(query: string, limit: number, filters: Record<string, any> = {}): Promise<AcademicPaper[]> {
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    
    if (!apiKey) {
      throw new Error('Semantic Scholar API key not configured');
    }

    try {
      const params = {
        query,
        limit: Math.min(limit, 100),
        fields: 'title,authors,abstract,url,pdfUrls,publicationDate,journal,citationCount,doi',
      };

      // Add filters
      if (filters.yearFrom) params['year'] = `>${filters.yearFrom}`;
      if (filters.fieldOfStudy) params['fieldsOfStudy'] = filters.fieldOfStudy;

      const response = await axios.get('https://api.semanticscholar.org/graph/v1/paper/search', {
        params,
        headers: { 'x-api-key': apiKey },
      });

      return response.data.data.map((paper: any) => ({
        id: `semanticscholar:${paper.paperId}`,
        title: paper.title || 'No title',
        authors: paper.authors?.map((a: any) => a.name || 'Unknown') || [],
        abstract: paper.abstract || 'No abstract',
        url: paper.url || '',
        pdfUrl: paper.pdfUrls?.[0]?.url || paper.openAccessPdf?.url || '',
        publicationDate: paper.publicationDate || '',
        journal: paper.journal?.name || '',
        citationCount: paper.citationCount || 0,
        source: 'Semantic Scholar',
        doi: paper.doi || '',
      }));
    } catch (error) {
      logger.error('Semantic Scholar search error:', error instanceof Error ? error.message : error);
      throw new Error('Semantic Scholar search failed');
    }
  }

  async getPaperDetails(paperId: string): Promise<AcademicPaper | null> {
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    
    if (!apiKey) {
      throw new Error('Semantic Scholar API key not configured');
    }

    try {
      // Extract Semantic Scholar ID
      const id = paperId.replace('semanticscholar:', '');
      
      const response = await axios.get(`https://api.semanticscholar.org/graph/v1/paper/${id}`, {
        params: { fields: 'title,authors,abstract,url,pdfUrls,publicationDate,journal,citationCount,doi' },
        headers: { 'x-api-key': apiKey },
      });

      const paper = response.data;
      
      return {
        id: `semanticscholar:${paper.paperId}`,
        title: paper.title || 'No title',
        authors: paper.authors?.map((a: any) => a.name || 'Unknown') || [],
        abstract: paper.abstract || 'No abstract',
        url: paper.url || '',
        pdfUrl: paper.pdfUrls?.[0]?.url || paper.openAccessPdf?.url || '',
        publicationDate: paper.publicationDate || '',
        journal: paper.journal?.name || '',
        citationCount: paper.citationCount || 0,
        source: 'Semantic Scholar',
        doi: paper.doi || '',
      };
    } catch (error) {
      logger.error(`Failed to get Semantic Scholar paper details for ${paperId}:`, 
        error instanceof Error ? error.message : error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.SEMANTIC_SCHOLAR_API_KEY;
  }
}

class IeeeXploreProvider implements AcademicSearchProvider {
  name = 'IEEE Xplore';

  async search(query: string, limit: number, filters: Record<string, any> = {}): Promise<AcademicPaper[]> {
    const apiKey = process.env.IEEE_API_KEY;
    
    if (!apiKey) {
      throw new Error('IEEE Xplore API key not configured');
    }

    try {
      const params = {
        querytext: query,
        rows: Math.min(limit, 100),
        start: 0,
        sort: 'relevance',
        order: 'desc',
      };

      const response = await axios.get('https://ieeexploreapi.ieee.org/api/v1/search/articles', {
        params,
        headers: { 'x-api-key': apiKey },
      });

      return response.data.articles?.map((article: any) => ({
        id: `ieee:${article.article_number}`,
        title: article.title || 'No title',
        authors: article.authors?.author?.map((a: any) => a.full_name || 'Unknown') || [],
        abstract: article.abstract || 'No abstract',
        url: article.html_url || '',
        pdfUrl: article.pdf_url || '',
        publicationDate: article.publication_date || '',
        journal: article.publication_title || '',
        source: 'IEEE Xplore',
        doi: article.doi || '',
      })) || [];
    } catch (error) {
      logger.error('IEEE Xplore search error:', error instanceof Error ? error.message : error);
      throw new Error('IEEE Xplore search failed');
    }
  }

  async getPaperDetails(paperId: string): Promise<AcademicPaper | null> {
    const apiKey = process.env.IEEE_API_KEY;
    
    if (!apiKey) {
      throw new Error('IEEE Xplore API key not configured');
    }

    try {
      const id = paperId.replace('ieee:', '');
      
      const response = await axios.get(`https://ieeexploreapi.ieee.org/api/v1/articles/${id}`, {
        headers: { 'x-api-key': apiKey },
      });

      const article = response.data;
      
      return {
        id: `ieee:${article.article_number}`,
        title: article.title || 'No title',
        authors: article.authors?.author?.map((a: any) => a.full_name || 'Unknown') || [],
        abstract: article.abstract || 'No abstract',
        url: article.html_url || '',
        pdfUrl: article.pdf_url || '',
        publicationDate: article.publication_date || '',
        journal: article.publication_title || '',
        source: 'IEEE Xplore',
        doi: article.doi || '',
      };
    } catch (error) {
      logger.error(`Failed to get IEEE paper details for ${paperId}:`, 
        error instanceof Error ? error.message : error);
      return null;
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.IEEE_API_KEY;
  }
}
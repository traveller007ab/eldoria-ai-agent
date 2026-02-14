import axios from 'axios';
import { logger } from '@/utils/logger';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  source: string;
  timestamp?: string;
}

interface SearchProvider {
  name: string;
  search(query: string, limit: number): Promise<SearchResult[]>;
  isAvailable(): Promise<boolean>;
}

export class SearchService {
  private providers: SearchProvider[] = [];
  private defaultProvider: SearchProvider | null = null;

  constructor() {
    // Initialize with available providers
    this.registerDefaultProviders();
  }

  private registerDefaultProviders() {
    // Google Custom Search JSON API
    if (process.env.GOOGLE_SEARCH_API_KEY && process.env.GOOGLE_CSE_ID) {
      this.providers.push(new GoogleSearchProvider());
    }

    // SerpAPI
    if (process.env.SERPAPI_KEY) {
      this.providers.push(new SerpAPIProvider());
    }

    // DuckDuckGo (no API key required)
    this.providers.push(new DuckDuckGoProvider());

    // Set default provider
    this.defaultProvider = this.providers.length > 0 ? this.providers[0] : null;

    logger.info(`🔍 Search service initialized with ${this.providers.length} providers`);
  }

  async search(query: string, limit: number = 10): Promise<SearchResult[]> {
    if (!query || query.trim() === '') {
      throw new Error('Search query cannot be empty');
    }

    if (!this.defaultProvider) {
      throw new Error('No search providers available');
    }

    try {
      logger.info(`🔎 Searching for: "${query}" (limit: ${limit})`);
      
      const results = await this.defaultProvider.search(query, limit);
      
      logger.info(`📊 Found ${results.length} results for "${query}"`);
      return results;
    } catch (error) {
      logger.error(`❌ Search failed for "${query}": ${error instanceof Error ? error.message : String(error)}`);
      
      // Try fallback providers if available
      for (const provider of this.providers) {
        if (provider !== this.defaultProvider) {
          try {
            const fallbackResults = await provider.search(query, limit);
            logger.warn(`🔄 Using fallback provider: ${provider.name}`);
            return fallbackResults;
          } catch (fallbackError) {
            logger.warn(`⚠️ Fallback provider ${provider.name} also failed`);
          }
        }
      }

      throw new Error(`All search providers failed for query: "${query}"`);
    }
  }

  async checkProviderAvailability(): Promise<{ provider: string; available: boolean }[]> {
    return Promise.all(
      this.providers.map(async (provider) => ({
        provider: provider.name,
        available: await provider.isAvailable().catch(() => false),
      }))
    );
  }

  getAvailableProviders(): string[] {
    return this.providers.map(p => p.name);
  }
}

class GoogleSearchProvider implements SearchProvider {
  name = 'Google Custom Search';

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const apiKey = process.env.GOOGLE_SEARCH_API_KEY;
    const cseId = process.env.GOOGLE_CSE_ID;
    
    if (!apiKey || !cseId) {
      throw new Error('Google Search API not properly configured');
    }

    try {
      const response = await axios.get('https://www.googleapis.com/customsearch/v1', {
        params: {
          key: apiKey,
          cx: cseId,
          q: query,
          num: Math.min(limit, 10), // Google max is 10
        },
      });

      return response.data.items?.map((item: any) => ({
        title: item.title,
        url: item.link,
        snippet: item.snippet,
        source: 'Google',
        timestamp: new Date().toISOString(),
      })) || [];
    } catch (error) {
      logger.error('Google Search API error:', error instanceof Error ? error.message : error);
      throw new Error('Google search failed');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.GOOGLE_SEARCH_API_KEY && !!process.env.GOOGLE_CSE_ID;
  }
}

class SerpAPIProvider implements SearchProvider {
  name = 'SerpAPI';

  async search(query: string, limit: number): Promise<SearchResult[]> {
    const apiKey = process.env.SERPAPI_KEY;
    
    if (!apiKey) {
      throw new Error('SerpAPI not properly configured');
    }

    try {
      const response = await axios.get('https://serpapi.com/search', {
        params: {
          api_key: apiKey,
          q: query,
          num: Math.min(limit, 20),
        },
      });

      return response.data.organic_results?.map((result: any) => ({
        title: result.title,
        url: result.link,
        snippet: result.snippet,
        source: 'SerpAPI',
        timestamp: new Date().toISOString(),
      })) || [];
    } catch (error) {
      logger.error('SerpAPI error:', error instanceof Error ? error.message : error);
      throw new Error('SerpAPI search failed');
    }
  }

  async isAvailable(): Promise<boolean> {
    return !!process.env.SERPAPI_KEY;
  }
}

class DuckDuckGoProvider implements SearchProvider {
  name = 'DuckDuckGo';

  async search(query: string, limit: number): Promise<SearchResult[]> {
    try {
      // Note: This uses the unofficial DuckDuckGo API
      // For production, consider using the official API or a wrapper service
      const response = await axios.get('https://api.duckduckgo.com/', {
        params: {
          q: query,
          format: 'json',
          no_redirect: 1,
        },
      });

      if (response.data.Abstract) {
        return [{
          title: response.data.Heading || query,
          url: response.data.AbstractURL || `https://duckduckgo.com/?q=${encodeURIComponent(query)}`,
          snippet: response.data.Abstract,
          source: 'DuckDuckGo',
          timestamp: new Date().toISOString(),
        }];
      }

      // If no abstract, return related topics
      return response.data.RelatedTopics?.map((topic: any) => ({
        title: topic.Text,
        url: topic.FirstURL,
        snippet: topic.Result || '',
        source: 'DuckDuckGo',
        timestamp: new Date().toISOString(),
      })) || [];
    } catch (error) {
      logger.error('DuckDuckGo search error:', error instanceof Error ? error.message : error);
      throw new Error('DuckDuckGo search failed');
    }
  }

  async isAvailable(): Promise<boolean> {
    // DuckDuckGo doesn't require API key
    return true;
  }
}
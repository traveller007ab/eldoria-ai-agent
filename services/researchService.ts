/**
 * ResearchService - Multi-source academic research API integrations
 * Phase 44: Enhanced Research Pipeline
 */

// ============ TYPES ============

export interface ResearchResult {
    id: string;
    title: string;
    authors: Author[];
    abstract?: string;
    url: string;
    pdfUrl?: string;
    type: 'paper' | 'article' | 'preprint' | 'blog';
    year?: number;
    citations?: number;
    venue?: string; // Journal/Conference name
    doi?: string;
    openAccess?: boolean;
    images?: ExtractedImage[];
    tables?: ExtractedTable[];
}

export interface Author {
    name: string;
    affiliations?: string[];
}

export interface ExtractedImage {
    src: string;
    alt: string;
    caption?: string;
    width?: number;
    height?: number;
}

export interface ExtractedTable {
    headers: string[];
    rows: string[][];
    caption?: string;
}

export interface SearchOptions {
    limit?: number;
    offset?: number;
    yearFrom?: number;
    yearTo?: number;
    openAccessOnly?: boolean;
    fields?: string[];
}

// ============ CACHE ============

const CACHE_KEY = 'eldoria_research_cache';
const CACHE_TTL = 1000 * 60 * 30; // 30 minutes

interface CacheEntry {
    query: string;
    results: ResearchResult[];
    timestamp: number;
}

function getCachedResults(query: string): ResearchResult[] | null {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        if (!cache) return null;

        const entries: CacheEntry[] = JSON.parse(cache);
        const entry = entries.find(e => e.query === query.toLowerCase());

        if (entry && Date.now() - entry.timestamp < CACHE_TTL) {
            console.log('[Research] Cache hit:', query);
            return entry.results;
        }
        return null;
    } catch {
        return null;
    }
}

function setCachedResults(query: string, results: ResearchResult[]): void {
    try {
        const cache = localStorage.getItem(CACHE_KEY);
        let entries: CacheEntry[] = cache ? JSON.parse(cache) : [];

        // Remove old entry if exists
        entries = entries.filter(e => e.query !== query.toLowerCase());

        // Add new entry
        entries.push({
            query: query.toLowerCase(),
            results,
            timestamp: Date.now()
        });

        // Keep only last 20 searches
        if (entries.length > 20) {
            entries = entries.slice(-20);
        }

        localStorage.setItem(CACHE_KEY, JSON.stringify(entries));
    } catch (e) {
        console.warn('[Research] Cache write failed:', e);
    }
}

// ============ RATE LIMITING ============

const rateLimiter = {
    lastCall: 0,
    minInterval: 500, // 500ms between calls (safe for 100 req/5min)

    async wait(): Promise<void> {
        const now = Date.now();
        const elapsed = now - this.lastCall;
        if (elapsed < this.minInterval) {
            await new Promise(r => setTimeout(r, this.minInterval - elapsed));
        }
        this.lastCall = Date.now();
    }
};

// ============ SEMANTIC SCHOLAR API ============

const SEMANTIC_SCHOLAR_BASE = 'https://api.semanticscholar.org/graph/v1';

/**
 * Search Semantic Scholar for academic papers
 * API Docs: https://api.semanticscholar.org/api-docs/
 */
export async function searchSemanticScholar(
    query: string,
    options: SearchOptions = {}
): Promise<ResearchResult[]> {
    const { limit = 10, offset = 0, yearFrom, yearTo, openAccessOnly } = options;

    // Check cache first
    const cacheKey = `ss:${query}:${limit}:${offset}`;
    const cached = getCachedResults(cacheKey);
    if (cached) return cached;

    await rateLimiter.wait();

    const fields = [
        'paperId',
        'title',
        'abstract',
        'authors',
        'year',
        'citationCount',
        'venue',
        'externalIds',
        'isOpenAccess',
        'openAccessPdf',
        'url'
    ].join(',');

    let yearFilter = '';
    if (yearFrom || yearTo) {
        yearFilter = `&year=${yearFrom || ''}-${yearTo || ''}`;
    }

    const url = `${SEMANTIC_SCHOLAR_BASE}/paper/search?query=${encodeURIComponent(query)}&limit=${limit}&offset=${offset}&fields=${fields}${yearFilter}`;

    try {
        console.log('[Research] Searching Semantic Scholar:', query);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`Semantic Scholar API error: ${response.status}`);
        }

        const data = await response.json();

        const results: ResearchResult[] = (data.data || []).map((paper: any) => ({
            id: paper.paperId,
            title: paper.title,
            authors: (paper.authors || []).map((a: any) => ({ name: a.name })),
            abstract: paper.abstract,
            url: paper.url || `https://www.semanticscholar.org/paper/${paper.paperId}`,
            pdfUrl: paper.openAccessPdf?.url,
            type: 'paper' as const,
            year: paper.year,
            citations: paper.citationCount,
            venue: paper.venue,
            doi: paper.externalIds?.DOI,
            openAccess: paper.isOpenAccess
        })).filter((p: ResearchResult) => !openAccessOnly || p.openAccess);

        setCachedResults(cacheKey, results);
        console.log(`[Research] Found ${results.length} papers`);

        return results;
    } catch (error) {
        console.error('[Research] Semantic Scholar error:', error);
        return [];
    }
}

// ============ ARXIV API ============

const ARXIV_BASE = 'https://export.arxiv.org/api/query';

/**
 * Search arXiv for preprints
 * API Docs: https://info.arxiv.org/help/api/index.html
 */
export async function searchArxiv(
    query: string,
    options: SearchOptions = {}
): Promise<ResearchResult[]> {
    const { limit = 10, offset = 0 } = options;

    const cacheKey = `arxiv:${query}:${limit}:${offset}`;
    const cached = getCachedResults(cacheKey);
    if (cached) return cached;

    await rateLimiter.wait();

    const url = `${ARXIV_BASE}?search_query=all:${encodeURIComponent(query)}&start=${offset}&max_results=${limit}`;

    try {
        console.log('[Research] Searching arXiv:', query);
        const response = await fetch(url);

        if (!response.ok) {
            throw new Error(`arXiv API error: ${response.status}`);
        }

        const text = await response.text();
        const parser = new DOMParser();
        const xml = parser.parseFromString(text, 'text/xml');

        const entries = xml.querySelectorAll('entry');
        const results: ResearchResult[] = [];

        entries.forEach(entry => {
            const id = entry.querySelector('id')?.textContent || '';
            const arxivId = id.split('/abs/').pop() || id;

            results.push({
                id: arxivId,
                title: entry.querySelector('title')?.textContent?.trim() || 'Untitled',
                authors: Array.from(entry.querySelectorAll('author name')).map(n => ({
                    name: n.textContent || 'Unknown'
                })),
                abstract: entry.querySelector('summary')?.textContent?.trim(),
                url: id,
                pdfUrl: id.replace('/abs/', '/pdf/') + '.pdf',
                type: 'preprint',
                year: new Date(entry.querySelector('published')?.textContent || '').getFullYear() || undefined,
                openAccess: true
            });
        });

        setCachedResults(cacheKey, results);
        console.log(`[Research] Found ${results.length} preprints`);

        return results;
    } catch (error) {
        console.error('[Research] arXiv error:', error);
        return [];
    }
}

// ============ UNIFIED SEARCH ============

export type SourceType = 'all' | 'papers' | 'preprints' | 'web';

/**
 * Search across multiple sources
 */
export async function searchResearch(
    query: string,
    sources: SourceType = 'all',
    options: SearchOptions = {}
): Promise<ResearchResult[]> {
    const results: ResearchResult[] = [];

    if (sources === 'all' || sources === 'papers') {
        const papers = await searchSemanticScholar(query, options);
        results.push(...papers);
    }

    if (sources === 'all' || sources === 'preprints') {
        const preprints = await searchArxiv(query, options);
        results.push(...preprints);
    }

    // Deduplicate by title similarity
    const seen = new Set<string>();
    return results.filter(r => {
        const key = r.title.toLowerCase().substring(0, 50);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
    });
}

// ============ BIBLIOGRAPHY GENERATION ============

export type BibliographyStyle = 'apa' | 'ieee' | 'bibtex';

/**
 * Generate a formatted citation for a research result
 */
export function generateCitation(result: ResearchResult | { title: string, url: string, type?: string }, style: BibliographyStyle = 'apa'): string {
    const isPaper = (result as any).type !== 'web';
    const authors = (result as any).authors || [];
    const title = result.title;
    const year = (result as any).year || new Date().getFullYear();
    const url = result.url;
    const venue = (result as any).venue;
    const doi = (result as any).doi;

    // Format authors
    let authorStr = 'Unknown Author';
    if (authors.length > 0) {
        if (style === 'apa') {
            if (authors.length === 1) authorStr = authors[0].name;
            else if (authors.length === 2) authorStr = `${authors[0].name} & ${authors[1].name}`;
            else authorStr = `${authors[0].name} et al.`;
        } else {
            authorStr = authors.map((a: any) => a.name).join(', ');
        }
    }

    if (style === 'apa') {
        if (isPaper) {
            return `${authorStr} (${year}). ${title}. ${venue ? venue + '. ' : ''}${doi ? 'https://doi.org/' + doi : url}`;
        } else {
            return `${authorStr} (${year}). ${title}. Retrieved from ${url}`;
        }
    } else if (style === 'ieee') {
        if (isPaper) {
            return `[${authorStr}], "${title}," ${venue ? venue + ', ' : ''}${year}.${doi ? ' DOI: ' + doi : ''}`;
        } else {
            return `[${authorStr}], "${title}," ${url} (accessed ${new Date().toLocaleDateString()}).`;
        }
    } else if (style === 'bibtex') {
        const id = (result as any).id || title.toLowerCase().replace(/\s+/g, '_').substring(0, 20);
        if (isPaper) {
            return `@article{${id},\n  title={${title}},\n  author={${authors.map((a: any) => a.name).join(' and ')}},\n  year={${year}},\n  journal={${venue || 'Journal Unknown'}}\n}`;
        } else {
            return `@misc{${id},\n  title={${title}},\n  author={${authorStr}},\n  year={${year}},\n  howpublished={\\url{${url}}}\n}`;
        }
    }

    return `${authorStr}. ${title}. ${url}`;
}

/**
 * Generate a full bibliography for multiple results
 */
export function generateBibliography(results: (ResearchResult | { title: string, url: string })[], style: BibliographyStyle = 'apa'): string {
    return results.map(r => generateCitation(r, style)).join('\n\n');
}

// ============ EXPORT ============

export const ResearchService = {
    searchSemanticScholar,
    searchArxiv,
    searchResearch,
    generateCitation,
    generateBibliography,
    clearCache: () => localStorage.removeItem(CACHE_KEY)
};

export default ResearchService;


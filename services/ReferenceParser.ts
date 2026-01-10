/**
 * Reference Parser Service
 * 
 * Smart parsing of citation metadata from various sources.
 * Extracts: authors, year, journal, DOI, etc.
 */

export interface ParsedReference {
    id: string;
    title: string;
    authors: Author[];
    year: number | null;
    journal: string | null;
    volume: string | null;
    issue: string | null;
    pages: string | null;
    doi: string | null;
    url: string | null;
    abstract: string | null;
    source: 'crossref' | 'openalex' | 'manual' | 'tavily' | 'unknown';
    confidence: number;
    rawData?: any;
}

export interface Author {
    firstName: string;
    lastName: string;
    fullName: string;
    orcid?: string;
}

export interface CitationStyle {
    name: 'APA' | 'MLA' | 'IEEE' | 'Chicago' | 'Harvard';
    format: (ref: ParsedReference) => string;
}

class ReferenceParserClass {

    /**
     * Parse author string into structured Author objects
     */
    parseAuthors(authorString: string): Author[] {
        if (!authorString || authorString.trim() === '') {
            return [];
        }

        const authors: Author[] = [];

        // Try different separators
        let parts: string[];
        if (authorString.includes(';')) {
            parts = authorString.split(';');
        } else if (authorString.includes(' and ')) {
            parts = authorString.split(' and ');
        } else if (authorString.includes(', ') && authorString.includes('.')) {
            // Likely "Last, F., Last2, F2." format
            parts = authorString.split(/,\s*(?=[A-Z])/);
        } else {
            parts = authorString.split(',');
        }

        parts.forEach(part => {
            const trimmed = part.trim().replace(/\.$/, '');
            if (!trimmed) return;

            let firstName = '';
            let lastName = '';

            // Check for "et al."
            if (trimmed.toLowerCase().includes('et al')) {
                authors.push({
                    firstName: '',
                    lastName: 'et al.',
                    fullName: 'et al.'
                });
                return;
            }

            // Format: "Last, First" or "Last, F."
            if (trimmed.includes(',')) {
                const [last, first] = trimmed.split(',').map(s => s.trim());
                lastName = last;
                firstName = first || '';
            }
            // Format: "First Last" or "F. Last"
            else {
                const words = trimmed.split(/\s+/);
                if (words.length === 1) {
                    lastName = words[0];
                } else {
                    lastName = words[words.length - 1];
                    firstName = words.slice(0, -1).join(' ');
                }
            }

            authors.push({
                firstName: firstName.replace(/\.$/, ''),
                lastName,
                fullName: `${firstName} ${lastName}`.trim()
            });
        });

        return authors;
    }

    /**
     * Parse year from various formats
     */
    parseYear(input: string | number | null | undefined): number | null {
        if (!input) return null;

        const str = String(input);
        const match = str.match(/\b(19|20)\d{2}\b/);
        if (match) {
            return parseInt(match[0], 10);
        }
        return null;
    }

    /**
     * Extract DOI from text
     */
    extractDoi(text: string): string | null {
        if (!text) return null;

        const doiPattern = /\b(10\.\d{4,}\/[^\s]+)\b/i;
        const match = text.match(doiPattern);
        return match ? match[1].replace(/[.,;)]+$/, '') : null;
    }

    /**
     * Parse a search result into structured reference
     */
    parseSearchResult(result: any): ParsedReference {
        const authors = this.parseAuthors(
            result.authors || result.author || result.creator || ''
        );

        const year = this.parseYear(
            result.year || result.date || result.published || result.publicationDate
        );

        const doi = this.extractDoi(result.doi || result.link || result.url || '');

        // Calculate confidence based on available data
        let confidence = 0.5;
        if (authors.length > 0 && authors[0].lastName !== 'Research Team') confidence += 0.2;
        if (year) confidence += 0.1;
        if (doi) confidence += 0.1;
        if (result.journal || result.source) confidence += 0.1;

        return {
            id: result.id || `ref-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            title: result.title || 'Untitled',
            authors: authors.length > 0 ? authors : [{ firstName: '', lastName: 'Unknown Author', fullName: 'Unknown Author' }],
            year,
            journal: result.journal || result.source || result.publisher || null,
            volume: result.volume || null,
            issue: result.issue || null,
            pages: result.pages || null,
            doi,
            url: result.link || result.url || null,
            abstract: result.snippet || result.abstract || result.description || null,
            source: this.detectSource(result),
            confidence: Math.min(1, confidence),
            rawData: result
        };
    }

    /**
     * Detect the source of the reference data
     */
    private detectSource(result: any): ParsedReference['source'] {
        if (result._source === 'crossref') return 'crossref';
        if (result._source === 'openalex') return 'openalex';
        if (result.link?.includes('scholar.google')) return 'tavily';
        if (result.source === 'manual') return 'manual';
        return 'unknown';
    }

    /**
     * Format reference in APA style
     */
    formatAPA(ref: ParsedReference): string {
        const authorStr = this.formatAuthorsAPA(ref.authors);
        const year = ref.year ? `(${ref.year})` : '(n.d.)';
        const title = ref.title;
        const journal = ref.journal ? `*${ref.journal}*` : '';
        const volume = ref.volume ? `, *${ref.volume}*` : '';
        const issue = ref.issue ? `(${ref.issue})` : '';
        const pages = ref.pages ? `, ${ref.pages}` : '';
        const doi = ref.doi ? ` https://doi.org/${ref.doi}` : '';

        return `${authorStr} ${year}. ${title}. ${journal}${volume}${issue}${pages}.${doi}`.replace(/\s+/g, ' ').trim();
    }

    /**
     * Format authors in APA style
     */
    private formatAuthorsAPA(authors: Author[]): string {
        if (authors.length === 0) return 'Unknown Author';
        if (authors.length === 1) {
            const a = authors[0];
            return `${a.lastName}, ${a.firstName ? a.firstName.charAt(0) + '.' : ''}`.replace(/, $/, '');
        }
        if (authors.length === 2) {
            return `${authors[0].lastName}, ${authors[0].firstName?.charAt(0) || ''}. & ${authors[1].lastName}, ${authors[1].firstName?.charAt(0) || ''}.`;
        }
        if (authors.length <= 7) {
            const allButLast = authors.slice(0, -1).map(a =>
                `${a.lastName}, ${a.firstName?.charAt(0) || ''}.`
            ).join(', ');
            const last = authors[authors.length - 1];
            return `${allButLast}, & ${last.lastName}, ${last.firstName?.charAt(0) || ''}.`;
        }
        // More than 7 authors: first 6, ..., last
        const first6 = authors.slice(0, 6).map(a =>
            `${a.lastName}, ${a.firstName?.charAt(0) || ''}.`
        ).join(', ');
        const last = authors[authors.length - 1];
        return `${first6}, ... ${last.lastName}, ${last.firstName?.charAt(0) || ''}.`;
    }

    /**
     * Format reference in IEEE style
     */
    formatIEEE(ref: ParsedReference, index: number = 1): string {
        const authorStr = ref.authors.map(a =>
            `${a.firstName?.charAt(0) || ''}. ${a.lastName}`
        ).join(', ');
        const title = `"${ref.title},"`;
        const journal = ref.journal ? ` *${ref.journal}*,` : '';
        const volume = ref.volume ? ` vol. ${ref.volume},` : '';
        const pages = ref.pages ? ` pp. ${ref.pages},` : '';
        const year = ref.year ? ` ${ref.year}.` : '.';

        return `[${index}] ${authorStr}, ${title}${journal}${volume}${pages}${year}`;
    }

    /**
     * Format reference in Harvard style
     */
    formatHarvard(ref: ParsedReference): string {
        const authorStr = ref.authors.map(a => a.lastName).join(', ');
        const year = ref.year || 'n.d.';
        const title = `'${ref.title}'`;
        const journal = ref.journal ? `, *${ref.journal}*` : '';
        const volume = ref.volume ? `, ${ref.volume}` : '';
        const pages = ref.pages ? `, pp. ${ref.pages}` : '';

        return `${authorStr} (${year}) ${title}${journal}${volume}${pages}.`;
    }

    /**
     * Format based on style
     */
    format(ref: ParsedReference, style: 'APA' | 'MLA' | 'IEEE' | 'Chicago' | 'Harvard' = 'APA', index?: number): string {
        switch (style) {
            case 'IEEE':
                return this.formatIEEE(ref, index);
            case 'Harvard':
                return this.formatHarvard(ref);
            case 'APA':
            default:
                return this.formatAPA(ref);
        }
    }

    /**
     * Batch parse multiple search results
     */
    parseMany(results: any[]): ParsedReference[] {
        return results.map(r => this.parseSearchResult(r));
    }

    /**
     * Try to fetch metadata from CrossRef (if available)
     */
    async enrichFromDoi(doi: string): Promise<Partial<ParsedReference> | null> {
        try {
            const response = await fetch(`https://api.crossref.org/works/${encodeURIComponent(doi)}`);
            if (!response.ok) return null;

            const data = await response.json();
            const work = data.message;

            return {
                title: work.title?.[0] || undefined,
                authors: (work.author || []).map((a: any) => ({
                    firstName: a.given || '',
                    lastName: a.family || '',
                    fullName: `${a.given || ''} ${a.family || ''}`.trim(),
                    orcid: a.ORCID
                })),
                year: work.published?.['date-parts']?.[0]?.[0] || undefined,
                journal: work['container-title']?.[0] || undefined,
                volume: work.volume || undefined,
                issue: work.issue || undefined,
                pages: work.page || undefined,
                doi: doi,
                source: 'crossref',
                confidence: 0.95
            };
        } catch (e) {
            console.warn('CrossRef lookup failed:', e);
            return null;
        }
    }
}

export const ReferenceParser = new ReferenceParserClass();
export default ReferenceParser;

/**
 * Citation Engine Service
 * 
 * Handles citation formatting, validation, and reference list generation.
 * Supports APA 7th Edition, IEEE, Harvard, MLA, and Chicago styles.
 * 
 * This service can be extended with a proper CSL processor library (citeproc-js)
 * for more complex citation formatting.
 */

export type CitationStyle = 'apa' | 'ieee' | 'harvard' | 'mla' | 'chicago';

export interface Reference {
    id: string;
    type: 'journal' | 'book' | 'website' | 'conference' | 'thesis' | 'report' | 'patent' | 'software' | 'other';
    
    // Author information
    authors: Author[];
    
    // Date information
    year: number;
    month?: number;
    day?: number;
    
    // Title information
    title: string;
    secondaryTitle?: string;
    
    // Journal/Book information
    journal?: string;
    volume?: string;
    issue?: string;
    pages: string;  // "start-end" or just start page
    edition?: string;
    publisher?: string;
    institution?: string;
    
    // Digital identifiers
    doi?: string;
    url?: string;
    issn?: string;
    isbn?: string;
    
    // Conference information
    conference?: string;
    conferenceLocation?: string;
    
    // Additional metadata
    abstract?: string;
    keywords?: string[];
    language?: string;
    accessDate?: string;
    
    // Formatted citations (cached)
    formattedApa?: string;
    formattedIeee?: string;
    formattedHarvard?: string;
    formattedMla?: string;
    formattedChicago?: string;
    
    // Source tracking
    source: 'manual' | 'google-scholar' | 'researchgate' | 'bibtex' | 'ris' | 'csv' | 'crossref' | 'other';
    addedAt: Date;

    // User notes/tags
    notes?: string;
    tags?: string[];
    favorite?: boolean;
}

export interface Author {
    firstName: string;
    lastName: string;
    middleName?: string;
    initials?: string;
    orcid?: string;
    affiliation?: string;
}

export interface CitationValidationResult {
    isValid: boolean;
    style: CitationStyle;
    errors: string[];
    warnings: string[];
    suggestions: string[];
    formattedCitation?: string;
}

export interface ValidationIssue {
    type: 'error' | 'warning' | 'suggestion';
    field: string;
    message: string;
    code: string;
}

// ============================================================================
// AUTHOR FORMATTING
// ============================================================================

export class AuthorFormatter {
    /**
     * Format author name for APA style
     * APA: "Smith, J. A." or "Smith, John Andrew"
     */
    static formatApa(author: Author, includeInitials: boolean = true): string {
        const { lastName, firstName, middleName } = author;
        
        if (includeInitials) {
            const initials = [firstName, middleName]
                .filter(Boolean)
                .map(name => name.charAt(0).toUpperCase() + '.')
                .join(' ');
            return `${lastName}, ${initials}`;
        }
        
        return `${lastName}, ${firstName}`;
    }
    
    /**
     * Format author name for IEEE style
     * IEEE: "J. A. Smith" or "John A. Smith"
     */
    static formatIeee(author: Author, initialsOnly: boolean = true): string {
        const { firstName, middleName, lastName } = author;
        
        if (initialsOnly) {
            const initials = [firstName, middleName]
                .filter(Boolean)
                .map(name => name.charAt(0).toUpperCase() + '.')
                .join(' ');
            return `${initials} ${lastName}`;
        }
        
        return `${firstName} ${middleName ? middleName + ' ' : ''}${lastName}`;
    }
    
    /**
     * Format author name for Harvard style
     * Harvard: "Smith, J. (2023)" or "Smith, John (2023)"
     */
    static formatHarvard(author: Author): string {
        return `${author.lastName}, ${author.firstName.charAt(0)}.`;
    }
    
    /**
     * Format author name for MLA style
     * MLA: "Smith, John Andrew"
     */
    static formatMla(author: Author): string {
        return `${author.lastName}, ${author.firstName}${author.middleName ? ' ' + author.middleName : ''}`;
    }
    
    /**
     * Format author name for Chicago style
     * Chicago: "Smith, John Andrew
     */
    static formatChicago(author: Author): string {
        return `${author.lastName}, ${author.firstName}${author.middleName ? ' ' + author.middleName : ''}`;
    }
    
    /**
     * Format multiple authors for different citation styles
     */
    static formatAuthors(authors: Author[], style: CitationStyle, maxAuthors: number = 7): string {
        if (!authors || authors.length === 0) {
            return 'Anonymous';
        }
        
        if (authors.length === 1) {
            return this.formatSingleAuthor(authors[0], style);
        }
        
        const allFormatted = authors.map(a => this.formatSingleAuthor(a, style));
        
        switch (style) {
            case 'apa':
                // APA: First 19 authors, use ampersand
                if (authors.length <= 20) {
                    const lastIndex = allFormatted.length - 1;
                    const lastAuthor = allFormatted[lastIndex];
                    const otherAuthors = allFormatted.slice(0, lastIndex).join(', ');
                    return `${otherAuthors} & ${lastAuthor}`;
                }
                // More than 20: First 19, ..., last
                const first19 = allFormatted.slice(0, 19).join(', ');
                const last = allFormatted[allFormatted.length - 1];
                return `${first19}, ... , ${last}`;
            
            case 'ieee':
                // IEEE: Comma-separated, use "and" for last
                const lastIdx = allFormatted.length - 1;
                const lastAuth = allFormatted[lastIdx];
                const others = allFormatted.slice(0, lastIdx).join(', ');
                return `${others}, and ${lastAuth}`;
            
            case 'harvard':
            case 'mla':
            case 'chicago':
                // Use ampersand
                const lastI = allFormatted.length - 1;
                const lastA = allFormatted[lastI];
                const otherA = allFormatted.slice(0, lastI).join(', ');
                return `${otherA} and ${lastA}`;
            
            default:
                return allFormatted.join(', ');
        }
    }
    
    private static formatSingleAuthor(author: Author, style: CitationStyle): string {
        switch (style) {
            case 'apa': return this.formatApa(author);
            case 'ieee': return this.formatIeee(author);
            case 'harvard': return this.formatHarvard(author);
            case 'mla': return this.formatMla(author);
            case 'chicago': return this.formatChicago(author);
            default: return `${author.lastName}, ${author.firstName}`;
        }
    }
}

// ============================================================================
// CITATION FORMATTING
// ============================================================================

export class CitationEngine {
    private references: Map<string, Reference> = new Map();
    
    constructor(initialReferences?: Reference[]) {
        if (initialReferences) {
            initialReferences.forEach(ref => {
                this.references.set(ref.id, ref);
            });
        }
    }
    
    /**
     * Add a reference to the engine
     */
    addReference(reference: Reference): void {
        this.references.set(reference.id, reference);
    }
    
    /**
     * Get a reference by ID
     */
    getReference(id: string): Reference | undefined {
        return this.references.get(id);
    }
    
    /**
     * Get all references
     */
    getAllReferences(): Reference[] {
        return Array.from(this.references.values());
    }
    
    /**
     * Remove a reference
     */
    removeReference(id: string): boolean {
        return this.references.delete(id);
    }
    
    /**
     * Format a single citation in the specified style
     */
    formatCitation(reference: Reference, style: CitationStyle): string {
        switch (reference.type) {
            case 'journal':
                return this.formatJournal(reference, style);
            case 'book':
                return this.formatBook(reference, style);
            case 'website':
                return this.formatWebsite(reference, style);
            case 'conference':
                return this.formatConference(reference, style);
            case 'thesis':
                return this.formatThesis(reference, style);
            case 'report':
                return this.formatReport(reference, style);
            default:
                return this.formatGeneric(reference, style);
        }
    }
    
    /**
     * Format journal article
     */
    formatJournal(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        const title = ref.title.endsWith('.') ? ref.title : ref.title + '.';
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title. Journal, Volume(Issue), Pages. DOI
                const apaIssue = ref.issue ? `(${ref.issue})` : '';
                const apaPages = ref.pages ? `, ${ref.pages}` : '';
                const apaDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                return `${authors} ${year}. ${title} ${ref.journal || ''}${ref.volume ? `, ${ref.volume}${apaIssue}` : ''}${apaPages}${apaDoi}`;
            
            case 'ieee':
                // IEEE: Authors, "Title," Journal, vol. X, no. X, pp. XX-XX, Year.
                const ieeeIssue = ref.issue ? `, no. ${ref.issue}` : '';
                const ieeePages = ref.pages ? `, pp. ${ref.pages}` : '';
                return `${authors}, "${title.replace(/\.$/, '')}," ${ref.journal || ''}, vol. ${ref.volume || ''}${ieeeIssue}${ieeePages}, ${ref.year}.`;
            
            case 'harvard':
                // Harvard: Authors (Year) 'Title', Journal, Volume(Issue), Pages.
                const harvardIssue = ref.issue ? `(${ref.issue})` : '';
                const harvardPages = ref.pages ? `, ${ref.pages}` : '';
                return `${authors} ${year} '${title.replace(/\.$/, '')}', ${ref.journal || ''}${ref.volume ? `, ${ref.volume}${harvardIssue}` : ''}${harvardPages}.`;
            
            case 'mla':
                // MLA: Authors. "Title." Journal, vol. X, no. X, Year, pp. XX-XX.
                const mlaIssue = ref.issue ? `, no. ${ref.issue}` : '';
                const mlaPages = ref.pages ? `, pp. ${ref.pages}` : '';
                return `${authors}. "${title.replace(/\.$/, '')}" ${ref.journal || ''}, vol. ${ref.volume || ''}${mlaIssue}, ${ref.year}${mlaPages}.`;
            
            case 'chicago':
                // Chicago: Authors. "Title." Journal Volume, no. Issue (Year): Pages.
                const chiIssue = ref.issue ? `, no. ${ref.issue}` : '';
                const chiPages = ref.pages ? `: ${ref.pages}` : '';
                return `${authors}. "${title.replace(/\.$/, '')}" ${ref.journal || ''} ${ref.volume || ''}${chiIssue} (${ref.year})${chiPages}.`;
            
            default:
                return `${authors} ${year} ${title} ${ref.journal || ''} ${ref.volume || ''} ${ref.pages || ''}`;
        }
    }
    
    /**
     * Format book
     */
    formatBook(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        const title = ref.title.endsWith('.') ? ref.title : ref.title + '.';
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title (Edition). Publisher. DOI
                const apaEdition = ref.edition ? ` (${ref.edition} ed.)` : '';
                const apaDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                return `${authors} ${year}${apaEdition}. ${title} ${ref.publisher || ''}${apaDoi}`;
            
            case 'ieee':
                // IEEE: Authors, Title. Edition. Publisher, Year.
                const ieeeEdition = ref.edition ? `, ${ref.edition}` : '';
                return `${authors}, ${title.replace(/\.$/, '')}${ieeeEdition}. ${ref.publisher || ''}, ${ref.year}.`;
            
            case 'harvard':
                // Harvard: Authors (Year) Title (Edition). Place of publication: Publisher.
                return `${authors} ${year} ${title} ${ref.edition || ''}. ${ref.publisher || ''}.`;
            
            default:
                return `${authors} ${year} ${title} ${ref.publisher || ''} ${ref.edition || ''}`;
        }
    }
    
    /**
     * Format website
     */
    formatWebsite(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        const title = ref.title.endsWith('.') ? ref.title : ref.title + '.';
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title. Site Name. URL
                const accessDate = ref.accessDate ? `. Retrieved from ${ref.accessDate}` : '';
                return `${authors} ${year}. ${title} ${ref.url || ''}${accessDate}`;
            
            case 'ieee':
                // IEEE: Authors, "Title," Website, Year. [Online]. Available: URL
                return `${authors}, "${title.replace(/\.$/, '')}," ${ref.url || ''} [Online].`;
            
            case 'harvard':
                return `${authors} ${year} ${title} Available at: ${ref.url || ''} (Accessed: ${ref.accessDate || 'N/A'}).`;
            
            default:
                return `${authors} ${year} ${title} ${ref.url || ''}`;
        }
    }
    
    /**
     * Format conference paper
     */
    formatConference(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        const title = ref.title.endsWith('.') ? ref.title : ref.title + '.';
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title. In Conference Name, Location. DOI
                const location = ref.conferenceLocation ? `${ref.conference}, ${ref.conferenceLocation}` : ref.conference || '';
                const doi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                return `${authors} ${year}. ${title} In ${location}${doi}`;
            
            case 'ieee':
                // IEEE: Authors, "Title," in Proc. Conference, Year, pp. XX-XX.
                const pages = ref.pages ? `, pp. ${ref.pages}` : '';
                return `${authors}, "${title.replace(/\.$/, '')}" ${ref.conference || ''}, ${ref.year}${pages}.`;
            
            default:
                return `${authors} ${year} ${title} ${ref.conference || ''} ${ref.conferenceLocation || ''}`;
        }
    }
    
    /**
     * Format thesis/dissertation
     */
    formatThesis(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title (Publication No.) [Doctor's thesis]. Institution. DOI
                return `${authors} ${year}. ${ref.title}. ${ref.institution || ''}.`;
            
            default:
                return `${authors} ${year} ${ref.title} (${ref.institution || ''})`;
        }
    }
    
    /**
     * Format report
     */
    formatReport(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        const year = `(${ref.year})`;
        
        switch (style) {
            case 'apa':
                // APA: Authors (Year). Title (Report No.). Institution. DOI
                return `${authors} ${year}. ${ref.title}. ${ref.institution || ''}.`;
            
            default:
                return `${authors} ${year} ${ref.title} ${ref.institution || ''}`;
        }
    }
    
    /**
     * Format generic/unknown type
     */
    formatGeneric(ref: Reference, style: CitationStyle): string {
        const authors = AuthorFormatter.formatAuthors(ref.authors, style);
        return `${authors} (${ref.year}). ${ref.title}.`;
    }
    
    /**
     * Generate a complete reference list in the specified style
     */
    generateReferenceList(style: CitationStyle, options?: {
        sortBy?: 'author' | 'year' | 'title';
        sortOrder?: 'asc' | 'desc';
        filter?: (ref: Reference) => boolean;
    }): string[] {
        let references = Array.from(this.references.values());
        
        // Apply filter if provided
        if (options?.filter) {
            references = references.filter(options.filter);
        }
        
        // Sort references
        if (options?.sortBy) {
            references.sort((a, b) => {
                let comparison = 0;
                switch (options.sortBy) {
                    case 'author':
                        const aAuthor = a.authors[0]?.lastName.toLowerCase() || '';
                        const bAuthor = b.authors[0]?.lastName.toLowerCase() || '';
                        comparison = aAuthor.localeCompare(bAuthor);
                        break;
                    case 'year':
                        comparison = a.year - b.year;
                        break;
                    case 'title':
                        comparison = a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                        break;
                }
                return options.sortOrder === 'desc' ? -comparison : comparison;
            });
        } else {
            // Default: alphabetical by first author
            references.sort((a, b) => {
                const aAuthor = a.authors[0]?.lastName.toLowerCase() || '';
                const bAuthor = b.authors[0]?.lastName.toLowerCase() || '';
                return aAuthor.localeCompare(bAuthor);
            });
        }
        
        // Format each reference
        return references.map(ref => this.formatCitation(ref, style));
    }
    
    /**
     * Extract in-text citations from text content
     * Returns array of citation strings found in the text
     */
    static extractInTextCitations(content: string, style: CitationStyle): string[] {
        const citations: string[] = [];
        
        if (style === 'apa') {
            // APA pattern: (Author, Year) or (Author, Year, p. XX)
            const apaPattern = /\([A-Za-z&\s\.]+,?\s*\d{4}(?:,\s*p\.\s*\d+(?:-\d+)?)?\)/g;
            const matches = content.match(apaPattern);
            if (matches) {
                citations.push(...matches);
            }
        } else if (style === 'ieee') {
            // IEEE pattern: [1] or [1-3]
            const ieeePattern = /\[\d+(?:-\d+)?\]/g;
            const matches = content.match(ieeePattern);
            if (matches) {
                citations.push(...matches);
            }
        }
        
        return citations;
    }
    
    /**
     * Find citations in text that don't have corresponding references
     */
    findMissingCitations(content: string, style: CitationStyle): string[] {
        const inTextCitations = CitationEngine.extractInTextCitations(content, style);
        const missing: string[] = [];
        
        inTextCitations.forEach(citation => {
            // Extract author/year from citation
            let authorYear = '';
            if (style === 'apa') {
                const match = citation.match(/\(([^)]+),\s*\d{4}/);
                if (match) {
                    authorYear = match[1].trim();
                }
            }
            
            // Check if any reference matches
            const hasMatch = Array.from(this.references.values()).some(ref => {
                const refAuthor = ref.authors[0]?.lastName || '';
                return authorYear.toLowerCase().includes(refAuthor.toLowerCase()) ||
                       authorYear.toLowerCase().includes('et al');
            });
            
            if (!hasMatch) {
                missing.push(citation);
            }
        });
        
        return missing;
    }
}

// ============================================================================
// CITATION VALIDATION
// ============================================================================

export class CitationValidator {
    /**
     * Validate an in-text citation
     */
    static validateInTextCitation(citation: string, style: CitationStyle): CitationValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];
        
        if (style === 'apa') {
            // Check for APA format: (Author, Year) or (Author, Year, p. XX)
            const apaPattern = /^\([A-Za-z&\s\.]+,?\s+\d{4}(?:,\s*p\.\s*\d+(?:-\d+)?)?\)$/;
            
            if (!apaPattern.test(citation)) {
                errors.push('Invalid APA in-text citation format. Expected: (Author, Year) or (Author, Year, p. XX)');
            }
            
            // Check for proper author formatting
            const authorPart = citation.match(/\(([^)]+),/);
            if (authorPart) {
                const authors = authorPart[1].trim();
                if (authors.includes(' and ')) {
                    warnings.push('Use "&" instead of "and" in APA citations');
                }
            }
        } else if (style === 'ieee') {
            // Check for IEEE format: [1] or [1-3]
            const ieeePattern = /^\[\d+(?:-\d+)?\]$/;
            
            if (!ieeePattern.test(citation)) {
                errors.push('Invalid IEEE in-text citation format. Expected: [1] or [1-3]');
            }
        }
        
        return {
            isValid: errors.length === 0,
            style,
            errors,
            warnings,
            suggestions,
            formattedCitation: errors.length === 0 ? citation : undefined
        };
    }
    
    /**
     * Validate a reference list entry
     */
    static validateReference(reference: Reference, style: CitationStyle): CitationValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];
        
        // Check required fields
        if (!reference.authors || reference.authors.length === 0) {
            errors.push('Reference must have at least one author');
        }
        
        if (!reference.year) {
            errors.push('Reference must have a year');
        }
        
        if (!reference.title) {
            errors.push('Reference must have a title');
        }
        
        // Check DOI format if present
        if (reference.doi) {
            const doiPattern = /^10\.\d{4,}\/[^\s]+$/;
            if (!doiPattern.test(reference.doi)) {
                warnings.push('DOI format may be incorrect. Expected: 10.xxxx/xxxxx');
                suggestions.push('Verify DOI at https://doi.org');
            }
        }
        
        // Check URL format if present
        if (reference.url && !reference.url.startsWith('http')) {
            errors.push('URL must start with http:// or https://');
        }
        
        // Journal-specific checks
        if (reference.type === 'journal') {
            if (!reference.journal) {
                warnings.push('Journal articles should include journal name');
            }
            if (!reference.volume) {
                warnings.push('Journal articles should include volume number');
            }
        }
        
        // Book-specific checks
        if (reference.type === 'book') {
            if (!reference.publisher) {
                warnings.push('Books should include publisher name');
            }
        }
        
        return {
            isValid: errors.length === 0,
            style,
            errors,
            warnings,
            suggestions
        };
    }
    
    /**
     * Validate entire reference list
     */
    static validateReferenceList(references: Reference[], style: CitationStyle): CitationValidationResult {
        const errors: string[] = [];
        const warnings: string[] = [];
        const suggestions: string[] = [];
        
        // Check for duplicate references
        const seenCitations = new Set<string>();
        const duplicates: string[] = [];
        
        references.forEach(ref => {
            const citation = `${ref.authors[0]?.lastName}, ${ref.year}`;
            if (seenCitations.has(citation)) {
                duplicates.push(citation);
            }
            seenCitations.add(citation);
        });
        
        if (duplicates.length > 0) {
            errors.push(`Found ${duplicates.length} duplicate reference(s): ${duplicates.join(', ')}`);
        }
        
        // Check for alphabetical order
        for (let i = 1; i < references.length; i++) {
            const current = references[i].authors[0]?.lastName.toLowerCase() || '';
            const previous = references[i - 1].authors[0]?.lastName.toLowerCase() || '';
            
            if (current < previous) {
                warnings.push(`Reference ${i + 1} is not in alphabetical order`);
            }
        }
        
        // Check minimum references
        if (references.length < 20) {
            warnings.push(`Only ${references.length} references found. RSU requires minimum 20.`);
        }
        
        return {
            isValid: errors.length === 0,
            style,
            errors,
            warnings,
            suggestions,
            formattedCitation: errors.length === 0 ? `${references.length} references` : undefined
        };
    }
}

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Parse author string into Author objects
 * Supports formats: "Smith, John", "John Smith", "J. Smith"
 */
export function parseAuthorString(authorString: string): Author[] {
    if (!authorString || !authorString.trim()) {
        return [];
    }
    
    // Split by "and" or "&" for multiple authors
    const authorStrings = authorString.split(/\s+(?:and|&)\s+/);
    
    return authorStrings.map(auth => {
        auth = auth.trim();
        
        // Try "Last, First" format
        if (auth.includes(',')) {
            const [lastName, firstName] = auth.split(',').map(s => s.trim());
            return {
                lastName,
                firstName,
                middleName: undefined,
                initials: firstName.split(' ').map(n => n.charAt(0)).join('').toUpperCase()
            };
        }
        
        // Try "First Last" format
        const parts = auth.split(' ');
        if (parts.length >= 2) {
            const lastName = parts[parts.length - 1];
            const firstName = parts[0];
            const middleName = parts.length > 2 ? parts.slice(0, -1).join(' ') : undefined;
            return {
                lastName,
                firstName,
                middleName,
                initials: parts.slice(0, -1).map(n => n.charAt(0)).join('').toUpperCase()
            };
        }
        
        // Fallback
        return {
            lastName: auth,
            firstName: '',
            middleName: undefined,
            initials: ''
        };
    });
}

/**
 * Create a new reference with default values
 */
export function createEmptyReference(overrides?: Partial<Reference>): Reference {
    return {
        id: crypto.randomUUID(),
        type: 'other',
        authors: [],
        year: new Date().getFullYear(),
        title: '',
        pages: '',
        source: 'manual',
        addedAt: new Date(),
        ...overrides
    };
}

// ============================================================================
// CSL STYLE DEFINITIONS (Simplified)
// ============================================================================

export const CSL_STYLES: Record<CitationStyle, { name: string; description: string }> = {
    apa: {
        name: 'APA 7th Edition',
        description: 'American Psychological Association style, used in social sciences'
    },
    ieee: {
        name: 'IEEE',
        description: 'Institute of Electrical and Electronics Engineers style, used in engineering'
    },
    harvard: {
        name: 'Harvard',
        description: 'Author-date referencing style, used in humanities and sciences'
    },
    mla: {
        name: 'MLA 9th Edition',
        description: 'Modern Language Association style, used in literature and humanities'
    },
    chicago: {
        name: 'Chicago 17th Edition',
        description: 'Chicago Manual of Style, used in history and publishing'
    }
};

export function getAvailableStyles(): CitationStyle[] {
    return ['apa', 'ieee', 'harvard', 'mla', 'chicago'];
}

export function getStyleInfo(style: CitationStyle) {
    return CSL_STYLES[style] || { name: style, description: '' };
}

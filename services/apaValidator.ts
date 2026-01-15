/**
 * APA Validator Service
 * 
 * Comprehensive APA 7th Edition validation for academic writing.
 * Validates in-text citations, reference lists, headings, numbers,
 * tables, figures, and general APA formatting rules.
 */

import { Reference } from './citationEngine';

// ============================================================================
// TYPES
// ============================================================================

export type CitationStyle = 'apa' | 'ieee' | 'harvard' | 'mla' | 'chicago';

export interface APAValidationResult {
    isValid: boolean;
    score: number;  // 0-100
    summary: string;
    issues: APAIssue[];
    statistics: APAStatistics;
}

export interface APAIssue {
    type: 'error' | 'warning' | 'suggestion';
    category: APAIssueCategory;
    message: string;
    location?: string;
    suggestion?: string;
    context?: string;
}

export type APAIssueCategory = 
    | 'in_text_citation'
    | 'reference_list'
    | 'heading'
    | 'number_format'
    | 'table_figure'
    | 'punctuation'
    | 'spelling'
    | 'grammar'
    | 'formatting'
    | 'structure';

export interface APAStatistics {
    totalWords: number;
    totalCitations: number;
    totalReferences: number;
    referencesWithDOI: number;
    referencesWithURL: number;
    averageCitationsPerChapter: number;
    citationDensity: number;  // citations per 1000 words
    headingCount: number;
    tableCount: number;
    figureCount: number;
}

export interface HeadingInfo {
    level: number;
    text: string;
    lineNumber?: number;
}

export interface CitationInfo {
    raw: string;
    author?: string;
    year?: string;
    page?: string;
    position: { start: number; end: number };
}

// ============================================================================
// APA VALIDATOR CLASS
// ============================================================================

export class APAValidator {
    private content: string;
    private references: Reference[];
    private style: CitationStyle;

    constructor(content: string, references: Reference[] = [], style: CitationStyle = 'apa') {
        this.content = content;
        this.references = references;
        this.style = style;
    }

    /**
     * Run all validations and return comprehensive result
     */
    validate(): APAValidationResult {
        const allIssues: APAIssue[] = [];

        // Run all validation categories
        allIssues.push(...this.validateInTextCitations());
        allIssues.push(...this.validateReferenceList());
        allIssues.push(...this.validateHeadings());
        allIssues.push(...this.validateNumbers());
        allIssues.push(...this.validatePunctuation());
        allIssues.push(...this.validateStructure());

        // Calculate statistics
        const stats = this.calculateStatistics();

        // Calculate score
        const score = this.calculateScore(allIssues, stats);

        // Generate summary
        const summary = this.generateSummary(allIssues, score, stats);

        return {
            isValid: allIssues.filter(i => i.type === 'error').length === 0,
            score,
            summary,
            issues: allIssues,
            statistics: stats
        };
    }

    /**
     * Validate in-text citations
     */
    validateInTextCitations(): APAIssue[] {
        const issues: APAIssue[] = [];

        // Extract all citations
        const citations = this.extractCitations();

        if (citations.length === 0) {
            issues.push({
                type: 'warning',
                category: 'in_text_citation',
                message: 'No in-text citations found',
                suggestion: 'Add citations to support your arguments with proper APA formatting'
            });
            return issues;
        }

        // Validate each citation
        const seenCitations = new Set<string>();
        
        citations.forEach((cit, index) => {
            // Check for duplicate citations
            if (seenCitations.has(cit.raw)) {
                issues.push({
                    type: 'warning',
                    category: 'in_text_citation',
                    message: `Duplicate citation found: "${cit.raw}"`,
                    location: `Position ${cit.position.start}`,
                    suggestion: 'Consider using "as cited in" or consolidate references'
                });
            }
            seenCitations.add(cit.raw);

            // Validate APA format
            if (this.style === 'apa') {
                // Check for basic APA pattern: (Author, Year) or (Author, Year, p. XX)
                const apaPattern = /^\([A-Za-z&\s\.]+,?\s+\d{4}(?:,\s*p\.\s*\d+(?:-\d+)?)?\)$/;
                
                if (!apaPattern.test(cit.raw)) {
                    issues.push({
                        type: 'error',
                        category: 'in_text_citation',
                        message: `Invalid APA citation format: "${cit.raw}"`,
                        location: `Position ${cit.position.start}`,
                        suggestion: 'Expected format: (Author, Year) or (Author, Year, p. XX)'
                    });
                }

                // Check for common APA errors
                if (cit.raw.includes(' and ')) {
                    issues.push({
                        type: 'error',
                        category: 'in_text_citation',
                        message: `Use "&" instead of "and" in citations: "${cit.raw}"`,
                        location: `Position ${cit.position.start}`,
                        suggestion: 'Replace "and" with "&" in APA in-text citations'
                    });
                }

                // Check for page reference formatting
                if (cit.raw.includes('page')) {
                    const pagePattern = /p\.\s*\d+/;
                    if (!pagePattern.test(cit.raw)) {
                        issues.push({
                            type: 'warning',
                            category: 'in_text_citation',
                            message: `Page reference may be incorrectly formatted: "${cit.raw}"`,
                            location: `Position ${cit.position.start}`,
                            suggestion: 'Use "p." before page numbers (e.g., p. 25)'
                        });
                    }
                }
            }

            // Check if cited work exists in reference list
            if (cit.author) {
                const hasReference = this.references.some(ref => 
                    ref.authors?.some(a => 
                        a.lastName.toLowerCase().includes(cit.author?.toLowerCase() || '') ||
                        `${a.firstName} ${a.lastName}`.toLowerCase().includes(cit.author?.toLowerCase() || '')
                    )
                );

                if (!hasReference) {
                    issues.push({
                        type: 'warning',
                        category: 'in_text_citation',
                        message: `Citation may not have corresponding reference: "${cit.raw}"`,
                        location: `Position ${cit.position.start}`,
                        suggestion: 'Ensure all cited works are listed in the reference list'
                    });
                }
            }
        });

        // Check for citation frequency
        const authorCounts = new Map<string, number>();
        citations.forEach(cit => {
            if (cit.author) {
                const key = cit.author.toLowerCase();
                authorCounts.set(key, (authorCounts.get(key) || 0) + 1);
            }
        });

        authorCounts.forEach((count, author) => {
            if (count > 10) {
                issues.push({
                    type: 'suggestion',
                    category: 'in_text_citation',
                    message: `Citation "${author}" appears ${count} times`,
                    suggestion: 'Consider varying citation approaches or consolidating sources'
                });
            }
        });

        return issues;
    }

    /**
     * Validate reference list
     */
    validateReferenceList(): APAIssue[] {
        const issues: APAIssue[] = [];

        if (this.references.length === 0) {
            issues.push({
                type: 'error',
                category: 'reference_list',
                message: 'No references found',
                suggestion: 'Add references to support your research'
            });
            return issues;
        }

        // Check minimum reference count
        if (this.references.length < 20) {
            issues.push({
                type: 'warning',
                category: 'reference_list',
                message: `Only ${this.references.length} references found`,
                suggestion: 'RSU Mechanical Engineering requires minimum 20 references'
            });
        }

        // Check alphabetical order
        const sortedRefs = [...this.references].sort((a, b) => {
            const aAuthor = a.authors?.[0]?.lastName?.toLowerCase() || '';
            const bAuthor = b.authors?.[0]?.lastName?.toLowerCase() || '';
            return aAuthor.localeCompare(bAuthor);
        });

        for (let i = 1; i < sortedRefs.length; i++) {
            const current = sortedRefs[i].authors?.[0]?.lastName?.toLowerCase() || '';
            const previous = sortedRefs[i - 1].authors?.[0]?.lastName?.toLowerCase() || '';
            
            if (current < previous) {
                issues.push({
                    type: 'error',
                    category: 'reference_list',
                    message: `References not in alphabetical order: "${sortedRefs[i].title}"`,
                    suggestion: 'Sort references alphabetically by first author\'s last name'
                });
            }
        }

        // Check for duplicate references
        const seenCitations = new Set<string>();
        this.references.forEach(ref => {
            const citation = `${ref.authors?.[0]?.lastName}, ${ref.year}`;
            if (seenCitations.has(citation)) {
                issues.push({
                    type: 'error',
                    category: 'reference_list',
                    message: `Duplicate reference found: "${ref.title}"`,
                    suggestion: 'Remove duplicate or consolidate similar references'
                });
            }
            seenCitations.add(citation);
        });

        // Validate individual references
        this.references.forEach((ref, index) => {
            // Check for DOI
            if (!ref.doi && !ref.url) {
                issues.push({
                    type: 'suggestion',
                    category: 'reference_list',
                    message: `Reference ${index + 1} missing DOI/URL: "${ref.title}"`,
                    suggestion: 'Add DOI or URL when available for better accessibility'
                });
            }

            // Check DOI format
            if (ref.doi) {
                const doiPattern = /^10\.\d{4,}\/[^\s]+$/;
                if (!doiPattern.test(ref.doi)) {
                    issues.push({
                        type: 'error',
                        category: 'reference_list',
                        message: `Invalid DOI format: ${ref.doi}`,
                        suggestion: 'DOI should be in format: 10.xxxx/xxxxx'
                    });
                }
            }

            // Check for required fields based on type
            switch (ref.type) {
                case 'journal':
                    if (!ref.journal) {
                        issues.push({
                            type: 'error',
                            category: 'reference_list',
                            message: `Journal article missing journal name: "${ref.title}"`,
                            suggestion: 'Add the journal name for journal articles'
                        });
                    }
                    if (!ref.volume) {
                        issues.push({
                            type: 'warning',
                            category: 'reference_list',
                            message: `Journal article missing volume: "${ref.title}"`,
                            suggestion: 'Add volume number for journal articles'
                        });
                    }
                    break;
                
                case 'book':
                    if (!ref.publisher) {
                        issues.push({
                            type: 'error',
                            category: 'reference_list',
                            message: `Book missing publisher: "${ref.title}"`,
                            suggestion: 'Add publisher name for books'
                        });
                    }
                    break;
                
                case 'website':
                    if (!ref.url && !ref.doi) {
                        issues.push({
                            type: 'warning',
                            category: 'reference_list',
                            message: `Website missing URL: "${ref.title}"`,
                            suggestion: 'Add URL for web sources'
                        });
                    }
                    if (!ref.accessDate && !ref.year) {
                        issues.push({
                            type: 'warning',
                            category: 'reference_list',
                            message: `Website missing access date or publication date: "${ref.title}"`,
                            suggestion: 'Add "Retrieved from [URL]" or publication date'
                        });
                    }
                    break;
            }

            // Check year
            if (!ref.year || ref.year < 1900 || ref.year > new Date().getFullYear() + 1) {
                issues.push({
                    type: 'error',
                    category: 'reference_list',
                    message: `Invalid publication year: ${ref.year}`,
                    suggestion: 'Add a valid publication year (1900-present)'
                });
            }
        });

        return issues;
    }

    /**
     * Validate heading hierarchy
     */
    validateHeadings(): APAIssue[] {
        const issues: APAIssue[] = [];
        const headings = this.extractHeadings();

        if (headings.length === 0) {
            return issues;
        }

        // Check for heading hierarchy
        let lastLevel = 0;
        headings.forEach((heading, index) => {
            // Check for skipped levels (e.g., jumping from H1 to H3)
            if (heading.level > lastLevel + 1 && lastLevel !== 0) {
                issues.push({
                    type: 'warning',
                    category: 'heading',
                    message: `Heading level skipped: H${lastLevel} to H${heading.level}`,
                    location: heading.text?.substring(0, 50),
                    suggestion: `Consider adding an H${lastLevel + 1} heading before H${heading.level}`
                });
            }

            // Check heading capitalization (APA uses sentence case for H1-H5)
            if (heading.text) {
                const words = heading.text.split(' ');
                const capitalizedWords = words.filter(w => /^[A-Z]/.test(w));
                const ratio = capitalizedWords.length / words.length;
                
                if (ratio > 0.5 && heading.level <= 5) {
                    issues.push({
                        type: 'warning',
                        category: 'heading',
                        message: `Heading may use title case instead of sentence case: "${heading.text.substring(0, 30)}..."`,
                        location: heading.text,
                        suggestion: 'APA headings should use sentence case (only first word capitalized)'
                    });
                }
            }

            // Check for empty headings
            if (!heading.text || heading.text.trim().length === 0) {
                issues.push({
                    type: 'error',
                    category: 'heading',
                    message: `Empty heading found`,
                    location: `Position ${index}`,
                    suggestion: 'Remove or properly label headings'
                });
            }

            lastLevel = heading.level;
        });

        // Check for required chapter headings (RSU Mechanical Engineering)
        const headingTexts = headings.map(h => h.text?.toLowerCase() || '');
        const requiredHeadings = ['introduction', 'literature review', 'materials and methods', 'results', 'discussion', 'conclusion'];
        
        requiredHeadings.forEach(required => {
            const found = headingTexts.some(ht => ht.includes(required));
            if (!found) {
                issues.push({
                    type: 'suggestion',
                    category: 'heading',
                    message: `Missing expected heading: "${required}"`,
                    suggestion: 'Consider adding this section to your thesis'
                });
            }
        });

        return issues;
    }

    /**
     * Validate number formatting
     */
    validateNumbers(): APAIssue[] {
        const issues: APAIssue[] = [];

        // Check for numbers 0-9 that should be spelled out
        const spelledOutNumbers = this.content.match(/\b(one|two|three|four|five|six|seven|eight|nine)\b/gi);
        if (spelledOutNumbers && spelledOutNumbers.length > 5) {
            issues.push({
                type: 'suggestion',
                category: 'number_format',
                message: `Found ${spelledOutNumbers.length} spelled-out numbers (one-nine)`,
                suggestion: 'APA recommends using numerals for numbers 10 and above, but spell out zero through nine'
            });
        }

        // Check for percentage formatting
        const percentMatches = this.content.match(/\d+\s*percent/gi);
        if (percentMatches && percentMatches.length > 0) {
            issues.push({
                type: 'warning',
                category: 'number_format',
                message: `Found "${percentMatches[0]}" - use symbol "%" instead of "percent"`,
                suggestion: 'APA style uses the % symbol, not the word "percent"'
            });
        }

        // Check for p-value formatting
        const pValueMatches = this.content.match(/p\s*=\s*0\.0*\d+/gi);
        if (pValueMatches) {
            pValueMatches.forEach(match => {
                if (match.includes('0.00') || match.includes('0.0')) {
                    issues.push({
                        type: 'warning',
                        category: 'number_format',
                        message: `P-value formatting: "${match}"`,
                        suggestion: 'Use "p < .001" instead of "p = 0.000" for values less than .001'
                    });
                }
            });
        }

        // Check for leading zeros
        const leadingZeroMatches = this.content.match(/0\.\d+/g);
        if (leadingZeroMatches && leadingZeroMatches.length > 0) {
            // Leading zeros are actually correct in APA for values < 1
            // This is informational, not an issue
        }

        // Check for time formatting
        const timeMatches = this.content.match(/\d+\s*(seconds?|minutes?|hours?|days?|weeks?|months?|years?)/gi);
        if (timeMatches && timeMatches.length > 10) {
            issues.push({
                type: 'suggestion',
                category: 'number_format',
                message: 'Review time formatting for consistency',
                suggestion: 'Use numerals with unit abbreviations (e.g., 5 s, 10 min, 2 h) or spell out in narrative'
            });
        }

        return issues;
    }

    /**
     * Validate punctuation
     */
    validatePunctuation(): APAIssue[] {
        const issues: APAIssue[] = [];

        // Check for multiple spaces
        const multipleSpaces = this.content.match(/  +/g);
        if (multipleSpaces && multipleSpaces.length > 0) {
            issues.push({
                type: 'error',
                category: 'punctuation',
                message: `Found ${multipleSpaces.length} instances of multiple spaces`,
                suggestion: 'Use single spaces between words'
            });
        }

        // Check for double periods
        const doublePeriods = this.content.match(/\.\./g);
        if (doublePeriods && doublePeriods.length > 0) {
            issues.push({
                type: 'error',
                category: 'punctuation',
                message: `Found ${doublePeriods.length} instances of double periods`,
                suggestion: 'Remove extra periods'
            });
        }

        // Check for spaces before punctuation
        const spaceBeforePunct = this.content.match(/[a-z]\s+([,.!?:;])/g);
        if (spaceBeforePunct && spaceBeforePunct.length > 0) {
            issues.push({
                type: 'warning',
                category: 'punctuation',
                message: `Found ${spaceBeforePunct.length} instances of space before punctuation`,
                suggestion: 'Remove spaces before punctuation marks'
            });
        }

        // Check for ampersand usage
        const andInNarrative = /\b[a-z]+\s+and\s+[a-z]+\b/i.exec(this.content);
        if (andInNarrative) {
            const andCount = (this.content.match(/\band\b/g) || []).length;
            if (andCount > 3) {
                issues.push({
                    type: 'suggestion',
                    category: 'punctuation',
                    message: 'Consider using "&" instead of "and" when referring to parenthetical materials',
                    suggestion: 'APA uses "&" in parentheses, "and" in narrative'
                });
            }
        }

        return issues;
    }

    /**
     * Validate document structure
     */
    validateStructure(): APAIssue[] {
        const issues: APAIssue[] = [];

        // Check for abstract
        const hasAbstract = /abstract/i.test(this.content);
        if (!hasAbstract && this.content.length > 2000) {
            issues.push({
                type: 'suggestion',
                category: 'structure',
                message: 'No abstract detected',
                suggestion: 'Consider adding an abstract (150-250 words for most papers)'
            });
        }

        // Check for page breaks
        const pageBreaks = (this.content.match(/\f/g) || []).length;
        if (pageBreaks === 0 && this.content.length > 10000) {
            issues.push({
                type: 'suggestion',
                category: 'structure',
                message: 'No page breaks detected',
                suggestion: 'Consider using page breaks between major sections'
            });
        }

        // Check for references section
        const hasReferences = /references?\s*$/i.test(this.content) || 
                             /\nreferences?\s*\n/i.test(this.content);
        if (!hasReferences) {
            issues.push({
                type: 'warning',
                category: 'structure',
                message: 'No "References" section heading found',
                suggestion: 'Add a "References" heading for your bibliography'
            });
        }

        // Check for appendices
        const hasAppendices = /appendices?|appendix/i.test(this.content);
        if (this.content.length > 15000 && !hasAppendices) {
            issues.push({
                type: 'suggestion',
                category: 'structure',
                message: 'No appendices section detected',
                suggestion: 'Consider adding appendices for supplementary material'
            });
        }

        return issues;
    }

    // ============================================================================
    // HELPER METHODS
    // ============================================================================

    private extractCitations(): CitationInfo[] {
        const citations: CitationInfo[] = [];
        
        if (this.style === 'apa') {
            // APA pattern: (Author, Year) or (Author, Year, p. XX)
            const pattern = /\(([^)]+)\)/g;
            let match;
            
            while ((match = pattern.exec(this.content)) !== null) {
                const fullMatch = match[0];
                const inner = match[1];
                
                // Extract author and year
                const parts = inner.split(',');
                const author = parts[0]?.trim();
                const yearMatch = inner.match(/\d{4}/);
                const year = yearMatch?.[0];
                const page = inner.match(/p\.\s*(\d+(?:-\d+)?)/)?.[1];

                citations.push({
                    raw: fullMatch,
                    author,
                    year,
                    page,
                    position: { start: match.index, end: match.index + fullMatch.length }
                });
            }
        }

        return citations;
    }

    private extractHeadings(): HeadingInfo[] {
        const headings: HeadingInfo[] = [];
        
        // Look for markdown-style headings
        const markdownPattern = /^(#{1,6})\s+(.+)$/gm;
        let match;
        
        while ((match = markdownPattern.exec(this.content)) !== null) {
            headings.push({
                level: match[1].length,
                text: match[2],
                lineNumber: this.content.substring(0, match.index).split('\n').length
            });
        }

        return headings;
    }

    private calculateStatistics(): APAStatistics {
        // Word count
        const words = this.content.split(/\s+/).filter(w => w.length > 0);
        const totalWords = words.length;

        // Citation count
        const citations = this.extractCitations();
        const totalCitations = citations.length;

        // Reference count
        const totalReferences = this.references.length;

        // DOI/URL count
        const referencesWithDOI = this.references.filter(r => r.doi).length;
        const referencesWithURL = this.references.filter(r => r.url).length;

        // Calculate averages
        const averageCitationsPerChapter = totalWords > 0 ? totalCitations / 5 : 0;  // Assuming 5 chapters
        const citationDensity = totalWords > 0 ? (totalCitations / totalWords) * 1000 : 0;

        // Heading count
        const headings = this.extractHeadings();
        const headingCount = headings.length;

        // Table and figure counts (rough estimate)
        const tableCount = (this.content.match(/table\s*\d+/gi) || []).length;
        const figureCount = (this.content.match(/figure\s*\d+/gi) || []).length;

        return {
            totalWords,
            totalCitations,
            totalReferences,
            referencesWithDOI,
            referencesWithURL,
            averageCitationsPerChapter,
            citationDensity,
            headingCount,
            tableCount,
            figureCount
        };
    }

    private calculateScore(issues: APAIssue[], stats: APAStatistics): number {
        let score = 100;

        // Deduct for errors
        const errors = issues.filter(i => i.type === 'error');
        score -= errors.length * 5;

        // Deduct for warnings
        const warnings = issues.filter(i => i.type === 'warning');
        score -= warnings.length * 2;

        // Deduct for suggestions
        const suggestions = issues.filter(i => i.type === 'suggestion');
        score -= suggestions.length * 0.5;

        // Bonus for good practices
        if (stats.referencesWithDOI > stats.totalReferences * 0.7) {
            score += 2;  // Bonus for good DOI coverage
        }

        if (stats.citationDensity >= 2 && stats.citationDensity <= 5) {
            score += 2;  // Bonus for appropriate citation density
        }

        if (stats.totalReferences >= 20) {
            score += 3;  // Bonus for meeting reference requirement
        }

        // Cap score
        return Math.max(0, Math.min(100, Math.round(score)));
    }

    private generateSummary(issues: APAIssue[], score: number, stats: APAStatistics): string {
        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const suggestionCount = issues.filter(i => i.type === 'suggestion').length;

        let summary = `APA Compliance Score: ${score}/100. `;
        
        if (errorCount > 0) {
            summary += `Found ${errorCount} error(s) that should be fixed. `;
        }
        if (warningCount > 0) {
            summary += `${warningCount} warning(s) to review. `;
        }
        if (suggestionCount > 0) {
            summary += `${suggestionCount} suggestion(s) for improvement.`;
        }

        if (score >= 90) {
            summary = 'Excellent APA formatting! ' + summary;
        } else if (score >= 75) {
            summary = 'Good APA formatting with some issues. ' + summary;
        } else if (score >= 60) {
            summary = 'APA formatting needs attention. ' + summary;
        } else {
            summary = 'Significant APA formatting issues. ' + summary;
        }

        return summary;
    }
}

// ============================================================================
// CONVENIENCE FUNCTIONS
// ============================================================================

export function validateInTextCitation(citation: string): APAIssue[] {
    const validator = new APAValidator(citation, [], 'apa');
    return validator.validateInTextCitations();
}

export function validateReference(reference: Reference): APAIssue[] {
    const validator = new APAValidator('', [reference], 'apa');
    return validator.validateReferenceList();
}

export function getAPAComplianceLevel(score: number): 'excellent' | 'good' | 'needs-work' | 'poor' {
    if (score >= 90) return 'excellent';
    if (score >= 75) return 'good';
    if (score >= 60) return 'needs-work';
    return 'poor';
}

export function getComplianceColor(level: 'excellent' | 'good' | 'needs-work' | 'poor'): string {
    switch (level) {
        case 'excellent': return '#22c55e';
        case 'good': return '#84cc16';
        case 'needs-work': return '#f59e0b';
        case 'poor': return '#ef4444';
    }
}

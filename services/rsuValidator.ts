/**
 * RSU Compliance Validator
 * 
 * Validates thesis projects against Rivers State University (RSU) requirements.
 * Based on standard Nigerian university thesis guidelines with RSU-specific requirements.
 */

import { Reference } from './citationEngine';

export type RSUCourseLevel = '500' | '600' | '700' | '800' | 'postgraduate';

export interface RSURequirements {
    minWordCount: number;
    maxWordCount: number;
    minReferences: number;
    maxChapters: number;
    requiredChapters: string[];
    maxAuthorsPerCitation: number;
    requiredFont: string[];
    requiredFontSize: Record<string, number>;
    requiredMargin: {
        top: number;
        bottom: number;
        left: number;
        right: number;
    };
    lineSpacing: number;
    referenceStyle: string;
}

export interface RSUValidationResult {
    isCompliant: boolean;
    score: number;
    requirements: RSURequirements;
    issues: RSUIssue[];
    statistics: RSUStatistics;
    level: RSUCourseLevel;
}

export interface RSUIssue {
    type: 'error' | 'warning' | 'suggestion';
    category: RSUIssueCategory;
    message: string;
    location?: string;
    suggestion?: string;
}

export type RSUIssueCategory = 
    | 'structure'
    | 'word_count'
    | 'references'
    | 'formatting'
    | 'chapters'
    | 'content';

export interface RSUStatistics {
    totalWords: number;
    totalChapters: number;
    totalReferences: number;
    chaptersWithContent: number;
    averageWordsPerChapter: number;
    referencesWithDOI: number;
    referenceTypes: Record<string, number>;
}

export interface RSUChapterInfo {
    id: string;
    title: string;
    wordCount: number;
    hasContent: boolean;
    subsections: string[];
}

export const RSU_REQUIREMENTS: Record<RSUCourseLevel, RSURequirements> = {
    '500': {
        minWordCount: 10000,
        maxWordCount: 15000,
        minReferences: 15,
        maxChapters: 6,
        requiredChapters: ['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Methodology', 'Chapter 4: Results/Findings', 'Chapter 5: Discussion', 'Chapter 6: Conclusion'],
        maxAuthorsPerCitation: 3,
        requiredFont: ['Times New Roman', 'Arial'],
        requiredFontSize: {
            body: 12,
            headings: 14,
            chapterTitle: 16,
            title: 18
        },
        requiredMargin: {
            top: 1.0,
            bottom: 1.0,
            left: 1.5,
            right: 1.0
        },
        lineSpacing: 1.5,
        referenceStyle: 'APA 7th Edition'
    },
    '600': {
        minWordCount: 12000,
        maxWordCount: 18000,
        minReferences: 20,
        maxChapters: 6,
        requiredChapters: ['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Methodology', 'Chapter 4: Results/Findings', 'Chapter 5: Discussion', 'Chapter 6: Conclusion'],
        maxAuthorsPerCitation: 3,
        requiredFont: ['Times New Roman', 'Arial'],
        requiredFontSize: {
            body: 12,
            headings: 14,
            chapterTitle: 16,
            title: 18
        },
        requiredMargin: {
            top: 1.0,
            bottom: 1.0,
            left: 1.5,
            right: 1.0
        },
        lineSpacing: 1.5,
        referenceStyle: 'APA 7th Edition'
    },
    '700': {
        minWordCount: 15000,
        maxWordCount: 25000,
        minReferences: 25,
        maxChapters: 7,
        requiredChapters: ['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Methodology', 'Chapter 4: Results/Findings', 'Chapter 5: Discussion', 'Chapter 6: Conclusion', 'References'],
        maxAuthorsPerCitation: 3,
        requiredFont: ['Times New Roman', 'Arial'],
        requiredFontSize: {
            body: 12,
            headings: 14,
            chapterTitle: 16,
            title: 18
        },
        requiredMargin: {
            top: 1.0,
            bottom: 1.0,
            left: 1.5,
            right: 1.0
        },
        lineSpacing: 1.5,
        referenceStyle: 'APA 7th Edition'
    },
    '800': {
        minWordCount: 20000,
        maxWordCount: 40000,
        minReferences: 30,
        maxChapters: 8,
        requiredChapters: ['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Methodology', 'Chapter 4: Results/Findings', 'Chapter 5: Discussion', 'Chapter 6: Conclusion', 'References', 'Appendices'],
        maxAuthorsPerCitation: 3,
        requiredFont: ['Times New Roman', 'Arial'],
        requiredFontSize: {
            body: 12,
            headings: 14,
            chapterTitle: 16,
            title: 18
        },
        requiredMargin: {
            top: 1.0,
            bottom: 1.0,
            left: 1.5,
            right: 1.0
        },
        lineSpacing: 1.5,
        referenceStyle: 'APA 7th Edition'
    },
    'postgraduate': {
        minWordCount: 25000,
        maxWordCount: 50000,
        minReferences: 40,
        maxChapters: 8,
        requiredChapters: ['Chapter 1: Introduction', 'Chapter 2: Literature Review', 'Chapter 3: Methodology', 'Chapter 4: Results/Findings', 'Chapter 5: Discussion', 'Chapter 6: Conclusion', 'References', 'Appendices'],
        maxAuthorsPerCitation: 3,
        requiredFont: ['Times New Roman', 'Arial'],
        requiredFontSize: {
            body: 12,
            headings: 14,
            chapterTitle: 16,
            title: 18
        },
        requiredMargin: {
            top: 1.0,
            bottom: 1.0,
            left: 1.5,
            right: 1.0
        },
        lineSpacing: 1.5,
        referenceStyle: 'APA 7th Edition'
    }
};

export class RSUValidator {
    private content: Record<string, string>;
    private references: Reference[];
    private level: RSUCourseLevel;

    constructor(content: Record<string, string>, references: Reference[], level: RSUCourseLevel = '500') {
        this.content = content;
        this.references = references;
        this.level = level;
    }

    validate(): RSUValidationResult {
        const requirements = RSU_REQUIREMENTS[this.level];
        const issues: RSUIssue[] = [];
        
        const stats = this.calculateStatistics();
        
        const wordCountIssues = this.validateWordCount(stats.totalWords, requirements);
        issues.push(...wordCountIssues);
        
        const chapterIssues = this.validateChapters(Object.keys(this.content), requirements);
        issues.push(...chapterIssues);
        
        const referenceIssues = this.validateReferences(this.references, requirements);
        issues.push(...referenceIssues);
        
        const structureIssues = this.validateStructure(stats, requirements);
        issues.push(...structureIssues);
        
        const errorCount = issues.filter(i => i.type === 'error').length;
        const warningCount = issues.filter(i => i.type === 'warning').length;
        const score = Math.max(0, Math.min(100, 
            100 - (errorCount * 15) - (warningCount * 5)
        ));
        
        const totalChapters = Object.keys(this.content).length;
        const chaptersWithContent = Object.values(this.content).filter(c => c.length > 100).length;
        
        return {
            isCompliant: errorCount === 0 && score >= 70,
            score,
            requirements,
            issues,
            statistics: {
                ...stats,
                totalChapters,
                chaptersWithContent,
                averageWordsPerChapter: totalChapters > 0 ? Math.round(stats.totalWords / totalChapters) : 0,
                referencesWithDOI: this.references.filter(r => r.doi).length,
                referenceTypes: this.getReferenceTypeCounts()
            },
            level: this.level
        };
    }

    private calculateStatistics(): RSUStatistics {
        const totalWords = Object.values(this.content).reduce((sum, text) => {
            return sum + text.split(/\s+/).filter(Boolean).length;
        }, 0);
        
        return {
            totalWords,
            totalChapters: Object.keys(this.content).length,
            totalReferences: this.references.length,
            chaptersWithContent: 0,
            averageWordsPerChapter: 0,
            referencesWithDOI: 0,
            referenceTypes: {}
        };
    }

    private validateWordCount(words: number, reqs: RSURequirements): RSUIssue[] {
        const issues: RSUIssue[] = [];
        
        if (words < reqs.minWordCount) {
            issues.push({
                type: 'warning',
                category: 'word_count',
                message: `Word count (${words.toLocaleString()}) is below minimum (${reqs.minWordCount.toLocaleString()})`,
                suggestion: `Add at least ${(reqs.minWordCount - words).toLocaleString()} more words`
            });
        } else if (words > reqs.maxWordCount) {
            issues.push({
                type: 'warning',
                category: 'word_count',
                message: `Word count (${words.toLocaleString()}) exceeds maximum (${reqs.maxWordCount.toLocaleString()})`,
                suggestion: `Reduce by approximately ${(words - reqs.maxWordCount).toLocaleString()} words`
            });
        } else {
            issues.push({
                type: 'suggestion',
                category: 'word_count',
                message: `Word count is within acceptable range (${reqs.minWordCount.toLocaleString()}-${reqs.maxWordCount.toLocaleString()})`
            });
        }
        
        return issues;
    }

    private validateChapters(chapters: string[], reqs: RSURequirements): RSUIssue[] {
        const issues: RSUIssue[] = [];
        const chapterNames = chapters.map(c => c.toLowerCase().replace(/chapter\s*\d*:?\s*/i, '').trim());
        
        const requiredPatterns = reqs.requiredChapters.map(c => 
            c.toLowerCase().replace(/chapter\s*\d*:?\s*/i, '').trim()
        );
        
        const foundChapters = chapterNames.filter(name => 
            requiredPatterns.some(pattern => name.includes(pattern) || pattern.includes(name))
        );
        
        if (foundChapters.length < requiredPatterns.length) {
            const missing = requiredPatterns.filter(p => 
                !foundChapters.some(f => f.includes(p) || p.includes(f))
            );
            issues.push({
                type: 'error',
                category: 'chapters',
                message: `Missing required chapters: ${missing.join(', ')}`,
                suggestion: 'Ensure all required chapters are present'
            });
        }
        
        if (chapters.length > reqs.maxChapters) {
            issues.push({
                type: 'warning',
                category: 'chapters',
                message: `Number of chapters (${chapters.length}) exceeds maximum (${reqs.maxChapters})`,
                suggestion: 'Consider consolidating some chapters'
            });
        }
        
        return issues;
    }

    private validateReferences(refs: Reference[], reqs: RSURequirements): RSUIssue[] {
        const issues: RSUIssue[] = [];
        
        if (refs.length < reqs.minReferences) {
            issues.push({
                type: 'error',
                category: 'references',
                message: `References (${refs.length}) below minimum (${reqs.minReferences})`,
                suggestion: `Add at least ${reqs.minReferences - refs.length} more references`
            });
        }
        
        const withoutDOI = refs.filter(r => !r.doi && !r.url);
        if (withoutDOI.length > refs.length * 0.3) {
            issues.push({
                type: 'warning',
                category: 'references',
                message: `${withoutDOI.length} references (${Math.round(withoutDOI.length / refs.length * 100)}%) lack DOI/URL`,
                suggestion: 'Include DOIs or URLs when available for academic credibility'
            });
        }
        
        const journalRefs = refs.filter(r => r.type === 'journal');
        if (journalRefs.length < refs.length * 0.4) {
            issues.push({
                type: 'suggestion',
                category: 'references',
                message: 'Consider including more journal articles for academic rigor',
                suggestion: 'Journal articles typically strengthen research credibility'
            });
        }
        
        return issues;
    }

    private validateStructure(stats: RSUStatistics, reqs: RSURequirements): RSUIssue[] {
        const issues: RSUIssue[] = [];
        
        if (stats.totalReferences < reqs.minReferences) {
            issues.push({
                type: 'error',
                category: 'structure',
                message: 'Insufficient references for comprehensive research',
                suggestion: `Minimum ${reqs.minReferences} references required for ${this.level} level`
            });
        }
        
        return issues;
    }

    private getReferenceTypeCounts(): Record<string, number> {
        return this.references.reduce((acc, ref) => {
            acc[ref.type] = (acc[ref.type] || 0) + 1;
            return acc;
        }, {} as Record<string, number>);
    }
}

export function getRSULevelForCourse(course: string): RSUCourseLevel {
    if (course.toLowerCase().includes('500') || course.toLowerCase().includes('final year')) {
        return '500';
    }
    if (course.toLowerCase().includes('600') || course.toLowerCase().includes('project')) {
        return '600';
    }
    if (course.toLowerCase().includes('700') || course.toLowerCase().includes('masters')) {
        return '700';
    }
    if (course.toLowerCase().includes('800') || course.toLowerCase().includes('mphil')) {
        return '800';
    }
    if (course.toLowerCase().includes('phd') || course.toLowerCase().includes('doctorate')) {
        return 'postgraduate';
    }
    return '500';
}

export function getComplianceLevel(score: number): 'excellent' | 'good' | 'needs-work' | 'poor' {
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

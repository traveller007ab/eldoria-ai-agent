/**
 * Writing Coach Agent
 * 
 * Real-time writing quality analysis and suggestions.
 * Analyzes academic tone, structure, and style.
 */

import { AgenticOrchestrator } from './AgenticOrchestrator';

export interface WritingAnalysis {
    overallScore: number;
    categories: {
        clarity: number;
        academicTone: number;
        structure: number;
        citations: number;
        grammar: number;
    };
    issues: WritingIssue[];
    suggestions: string[];
    wordCount: number;
    sentenceCount: number;
    avgWordsPerSentence: number;
    readabilityGrade: number;
}

export interface WritingIssue {
    id: string;
    type: 'passive_voice' | 'long_sentence' | 'first_person' | 'weak_word' | 'missing_citation' | 'jargon';
    severity: 'info' | 'warning' | 'error';
    message: string;
    position?: { start: number; end: number };
    suggestion?: string;
}

const WEAK_WORDS = [
    'very', 'really', 'quite', 'somewhat', 'basically', 'actually', 'generally',
    'mostly', 'probably', 'perhaps', 'maybe', 'things', 'stuff', 'good', 'bad',
    'nice', 'great', 'interesting', 'important', 'significant'
];

const ACADEMIC_TRANSITIONS = [
    'furthermore', 'moreover', 'consequently', 'therefore', 'thus', 'hence',
    'however', 'nevertheless', 'nonetheless', 'conversely', 'alternatively',
    'specifically', 'particularly', 'notably', 'significantly'
];

class WritingCoachClass {
    private analysisCache: Map<string, WritingAnalysis> = new Map();

    /**
     * Perform comprehensive writing analysis
     */
    analyze(content: string, chapterName?: string): WritingAnalysis {
        if (!content || content.trim().length === 0) {
            return this.emptyAnalysis();
        }

        // Check cache (using first 100 chars as key)
        const cacheKey = content.substring(0, 100);
        const cached = this.analysisCache.get(cacheKey);
        if (cached && content.length < 1000) {
            return cached;
        }

        const issues: WritingIssue[] = [];
        const suggestions: string[] = [];

        // Basic metrics
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const words = content.split(/\s+/).filter(w => w.length > 0);
        const wordCount = words.length;
        const sentenceCount = sentences.length;
        const avgWordsPerSentence = sentenceCount > 0 ? wordCount / sentenceCount : 0;

        // Calculate readability (Flesch-Kincaid approximation)
        const syllables = this.countSyllables(content);
        const readabilityGrade = 0.39 * (wordCount / Math.max(1, sentenceCount)) +
            11.8 * (syllables / Math.max(1, wordCount)) - 15.59;

        // 1. Passive Voice Detection
        const passivePattern = /\b(is|are|was|were|been|being|be)\s+(\w+ed|written|done|made|taken|given|shown|known)\b/gi;
        const passiveMatches = content.match(passivePattern) || [];
        const passiveRatio = passiveMatches.length / Math.max(1, sentenceCount);

        if (passiveRatio > 0.3) {
            issues.push({
                id: 'passive-1',
                type: 'passive_voice',
                severity: 'warning',
                message: `High passive voice usage (${Math.round(passiveRatio * 100)}% of sentences). Consider using active voice for stronger writing.`,
                suggestion: 'Rewrite passive constructions to active voice where possible.'
            });
        }

        // 2. Long Sentence Detection
        sentences.forEach((sentence, i) => {
            const wordCount = sentence.trim().split(/\s+/).length;
            if (wordCount > 40) {
                issues.push({
                    id: `long-${i}`,
                    type: 'long_sentence',
                    severity: 'warning',
                    message: `Sentence ${i + 1} has ${wordCount} words. Consider breaking it into smaller sentences.`
                });
            }
        });

        // 3. First Person Usage
        const firstPersonPattern = /\b(I|we|my|our|me|us)\b/g;
        const firstPersonMatches = content.match(firstPersonPattern) || [];
        if (firstPersonMatches.length > wordCount * 0.02) {
            issues.push({
                id: 'first-person-1',
                type: 'first_person',
                severity: 'info',
                message: 'Frequent first-person usage detected. Academic writing typically uses third person.',
                suggestion: 'Replace "I found" with "It was found" or "The results show".'
            });
        }

        // 4. Weak Words Detection
        let weakWordCount = 0;
        WEAK_WORDS.forEach(weak => {
            const regex = new RegExp(`\\b${weak}\\b`, 'gi');
            const matches = content.match(regex) || [];
            weakWordCount += matches.length;
        });
        if (weakWordCount > wordCount * 0.03) {
            issues.push({
                id: 'weak-words-1',
                type: 'weak_word',
                severity: 'info',
                message: `Found ${weakWordCount} weak/vague words. Academic writing benefits from precise language.`,
                suggestion: 'Replace words like "very", "really", "things" with more specific terms.'
            });
        }

        // 5. Citation Density
        const citationPattern = /\(\w+(?:\s+(?:et\s+al\.|and\s+\w+))?,?\s*\d{4}[a-z]?\)|\[\d+(?:,\s*\d+)*\]/g;
        const citations = content.match(citationPattern) || [];
        const citationDensity = citations.length / Math.max(1, sentenceCount / 10);

        if (wordCount > 500 && citationDensity < 0.5) {
            issues.push({
                id: 'citations-1',
                type: 'missing_citation',
                severity: 'warning',
                message: 'Low citation density. Academic writing should regularly cite sources.',
                suggestion: 'Add citations to support key claims and findings.'
            });
        }

        // Calculate category scores
        const categories = {
            clarity: Math.max(0, 100 - (issues.filter(i => i.type === 'long_sentence').length * 10)),
            academicTone: Math.max(0, 100 - (issues.filter(i => i.type === 'first_person').length * 15) - weakWordCount),
            structure: avgWordsPerSentence > 15 && avgWordsPerSentence < 25 ? 90 : 70,
            citations: Math.min(100, citationDensity * 100),
            grammar: 100 - (issues.filter(i => i.type === 'passive_voice').length * 10)
        };

        // Generate suggestions
        if (categories.clarity < 80) {
            suggestions.push('Break down complex sentences for better readability');
        }
        if (categories.academicTone < 80) {
            suggestions.push('Use third-person voice and precise terminology');
        }
        if (categories.citations < 60) {
            suggestions.push('Add more citations to strengthen academic credibility');
        }
        if (!ACADEMIC_TRANSITIONS.some(t => content.toLowerCase().includes(t))) {
            suggestions.push('Use academic transition words (however, therefore, moreover) to improve flow');
        }

        const overallScore = Math.round(
            (categories.clarity + categories.academicTone + categories.structure +
                categories.citations + categories.grammar) / 5
        );

        const analysis: WritingAnalysis = {
            overallScore,
            categories,
            issues,
            suggestions,
            wordCount,
            sentenceCount,
            avgWordsPerSentence: Math.round(avgWordsPerSentence * 10) / 10,
            readabilityGrade: Math.round(readabilityGrade * 10) / 10
        };

        // Cache result
        this.analysisCache.set(cacheKey, analysis);
        if (this.analysisCache.size > 100) {
            const firstKey = this.analysisCache.keys().next().value;
            if (firstKey) this.analysisCache.delete(firstKey);
        }

        // Emit significant issues as agent events
        if (overallScore < 60 && wordCount > 500) {
            AgenticOrchestrator.emit({
                id: `writing-${Date.now()}`,
                type: 'suggestion',
                source: 'writing',
                priority: 'medium',
                title: 'Writing Quality Alert',
                message: `${chapterName || 'Current section'} has a quality score of ${overallScore}%. Consider reviewing the suggestions.`,
                timestamp: new Date(),
                read: false,
                data: { analysis },
                actions: [
                    { id: 'view-tips', label: 'View Tips', type: 'custom' }
                ]
            });
        }

        return analysis;
    }

    /**
     * Count syllables in text (approximation)
     */
    private countSyllables(text: string): number {
        const words = text.toLowerCase().split(/\s+/);
        let count = 0;

        words.forEach(word => {
            word = word.replace(/[^a-z]/g, '');
            if (word.length <= 3) {
                count += 1;
            } else {
                const vowelGroups = word.match(/[aeiouy]+/g) || [];
                count += vowelGroups.length;
                if (word.endsWith('e')) count--;
                if (word.endsWith('le') && word.length > 2) count++;
                count = Math.max(1, count);
            }
        });

        return count;
    }

    /**
     * Empty analysis for blank content
     */
    private emptyAnalysis(): WritingAnalysis {
        return {
            overallScore: 0,
            categories: { clarity: 0, academicTone: 0, structure: 0, citations: 0, grammar: 0 },
            issues: [],
            suggestions: ['Start writing to receive feedback'],
            wordCount: 0,
            sentenceCount: 0,
            avgWordsPerSentence: 0,
            readabilityGrade: 0
        };
    }

    /**
     * Get quick feedback for real-time analysis
     */
    quickFeedback(content: string): string | null {
        const wordCount = content.split(/\s+/).length;
        if (wordCount < 50) return null;

        const analysis = this.analyze(content);

        if (analysis.overallScore >= 80) {
            return '✨ Great writing quality!';
        } else if (analysis.issues.length > 0) {
            return `💡 ${analysis.issues[0].message.slice(0, 60)}...`;
        }
        return null;
    }

    /**
     * Clear cache
     */
    clearCache() {
        this.analysisCache.clear();
    }
}

export const WritingCoach = new WritingCoachClass();
export default WritingCoach;

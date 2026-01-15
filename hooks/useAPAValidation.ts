import { useState, useEffect, useCallback, useMemo } from 'react';
import { APAValidator, APAValidationResult, APAIssue } from '../services/apaValidator';
import { Reference } from '../services/citationEngine';

/**
 * Hook for real-time APA validation
 */
export function useRealTimeAPAValidation(
    content: string,
    references: Reference[],
    options?: {
        debounceMs?: number;
        enabled?: boolean;
    }
) {
    const [result, setResult] = useState<APAValidationResult | null>(null);
    const [isValidating, setIsValidating] = useState(false);
    const [lastValidated, setLastValidated] = useState<Date | null>(null);

    const debounceMs = options?.debounceMs ?? 1000;
    const enabled = options?.enabled ?? true;

    useEffect(() => {
        if (!enabled || !content) {
            setResult(null);
            return;
        }

        setIsValidating(true);

        const timer = setTimeout(() => {
            try {
                const validator = new APAValidator(content, references, 'apa');
                const validationResult = validator.validate();
                setResult(validationResult);
                setLastValidated(new Date());
            } catch (error) {
                console.error('APA validation error:', error);
            } finally {
                setIsValidating(false);
            }
        }, debounceMs);

        return () => clearTimeout(timer);
    }, [content, references, debounceMs, enabled]);

    const validateNow = useCallback(() => {
        if (!content) return;
        
        setIsValidating(true);
        const validator = new APAValidator(content, references, 'apa');
        const validationResult = validator.validate();
        setResult(validationResult);
        setLastValidated(new Date());
        setIsValidating(false);
    }, [content, references]);

    const getIssuesByCategory = useCallback((category: string) => {
        return result?.issues.filter(i => i.category === category) ?? [];
    }, [result]);

    const getIssuesByType = useCallback((type: 'error' | 'warning' | 'suggestion') => {
        return result?.issues.filter(i => i.type === type) ?? [];
    }, [result]);

    const clearResults = useCallback(() => {
        setResult(null);
        setLastValidated(null);
    }, []);

    return {
        result,
        isValidating,
        lastValidated,
        validateNow,
        clearResults,
        getIssuesByCategory,
        getIssuesByType,
        score: result?.score ?? 0,
        isValid: result?.isValid ?? false,
        statistics: result?.statistics
    };
}

/**
 * Hook for monitoring citation compliance
 */
export function useCitationCompliance(
    content: string,
    references: Reference[]
) {
    const [citationCount, setCitationCount] = useState(0);
    const [missingCitations, setMissingCitations] = useState<string[]>([]);
    const [duplicateCitations, setDuplicateCitations] = useState<string[]>([]);

    useEffect(() => {
        // Count citations
        const citationPattern = /\([A-Za-z&\s\.]+,?\s+\d{4}/g;
        const matches: string[] = content.match(citationPattern) ?? [];
        setCitationCount(matches.length);

        // Find duplicates
        const seen = new Set<string>();
        const duplicates: string[] = [];
        matches.forEach((cit: string) => {
            if (seen.has(cit)) {
                duplicates.push(cit);
            }
            seen.add(cit);
        });
        setDuplicateCitations([...new Set(duplicates)]);

        // Find missing citations (simplified check)
        const citedAuthors = new Set<string>();
        matches.forEach((cit: string) => {
            const author = cit.split(',')[0]?.trim();
            if (author) citedAuthors.add(author.toLowerCase());
        });

        const missing: string[] = [];
        references.forEach(ref => {
            ref.authors?.forEach(author => {
                const authorName = `${author.firstName} ${author.lastName}`.toLowerCase();
                if (!citedAuthors.has(authorName) && !citedAuthors.has(author.lastName.toLowerCase())) {
                    missing.push(`${author.lastName}, ${author.firstName[0]}.`);
                }
            });
        });
        setMissingCitations([...new Set(missing)].slice(0, 10));  // Limit to 10
    }, [content, references]);

    const citationDensity = useMemo(() => {
        const words = content.split(/\s+/).length;
        return words > 0 ? Math.round((citationCount / words) * 1000 * 10) / 10 : 0;
    }, [content, citationCount]);

    return {
        citationCount,
        missingCitations,
        duplicateCitations,
        citationDensity,
        hasIssues: missingCitations.length > 0 || duplicateCitations.length > 0,
        isHealthy: citationDensity >= 2 && citationDensity <= 5
    };
}

/**
 * Hook for reference list monitoring
 */
export function useReferenceCompliance(references: Reference[]) {
    const stats = useMemo(() => {
        return {
            total: references.length,
            withDOI: references.filter(r => r.doi).length,
            withURL: references.filter(r => r.url).length,
            withoutIdentifier: references.filter(r => !r.doi && !r.url).length,
            byType: references.reduce((acc, ref) => {
                acc[ref.type] = (acc[ref.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>)
        };
    }, [references]);

    const score = useMemo(() => {
        let s = 100;
        
        // Deduct for missing identifiers
        s -= stats.withoutIdentifier * 3;
        
        // Bonus for DOIs
        if (stats.withDOI > stats.total * 0.7) s += 5;
        
        // Bonus for sufficient references
        if (stats.total >= 20) s += 5;
        else if (stats.total >= 15) s += 2;
        
        return Math.max(0, Math.min(100, s));
    }, [stats]);

    const issues = useMemo(() => {
        const issuesList: APAIssue[] = [];
        
        if (stats.total < 20) {
            issuesList.push({
                type: 'warning',
                category: 'reference_list',
                message: `Only ${stats.total} references found. Minimum 20 required.`,
                suggestion: 'Add more references to meet RSU requirements'
            });
        }
        
        if (stats.withoutIdentifier > 0) {
            issuesList.push({
                type: 'suggestion',
                category: 'reference_list',
                message: `${stats.withoutIdentifier} references missing DOI/URL`,
                suggestion: 'Add DOIs or URLs when available'
            });
        }
        
        return issuesList;
    }, [stats]);

    return {
        stats,
        score,
        issues,
        hasEnough: stats.total >= 20,
        hasGoodDOI: stats.withDOI > stats.total * 0.7
    };
}

/**
 * Hook for combined compliance dashboard
 */
export function useComplianceDashboard(content: string, references: Reference[]) {
    const apa = useRealTimeAPAValidation(content, references);
    const citations = useCitationCompliance(content, references);
    const referenceStats = useReferenceCompliance(references);

    const overallScore = useMemo(() => {
        const weights = {
            apa: 0.4,
            citations: 0.3,
            references: 0.3
        };
        
        return Math.round(
            (apa.score * weights.apa) +
            ((100 - Math.min(100, citations.missingCitations.length * 5 + citations.duplicateCitations.length * 10)) * weights.citations) +
            (referenceStats.score * weights.references)
        );
    }, [apa, citations, referenceStats]);

    return {
        apa,
        citations,
        references: referenceStats,
        overallScore,
        isCompliant: overallScore >= 75 && !citations.hasIssues
    };
}

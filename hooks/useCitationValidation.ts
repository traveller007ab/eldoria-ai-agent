import { useState, useEffect, useCallback, useMemo } from 'react';
import {
    CitationEngine,
    CitationValidator,
    Reference,
    CitationStyle,
    CitationValidationResult,
    ValidationIssue
} from '../services/citationEngine';

/**
 * Hook for validating citations and references in real-time
 */
export function useCitationValidation(
    content: string,
    references: Reference[],
    style: CitationStyle = 'apa'
) {
    const [inTextResult, setInTextResult] = useState<{
        citations: string[];
        missingCitations: string[];
        validation: CitationValidationResult;
    }>({
        citations: [],
        missingCitations: [],
        validation: { isValid: true, style, errors: [], warnings: [], suggestions: [] }
    });

    const [referenceResult, setReferenceResult] = useState<CitationValidationResult>({
        isValid: true,
        style,
        errors: [],
        warnings: [],
        suggestions: []
    });

    // Create citation engine with current references
    const engine = useMemo(() => {
        return new CitationEngine(references);
    }, [references]);

    // Validate in-text citations
    useEffect(() => {
        const citations = CitationEngine.extractInTextCitations(content, style);
        const missing = engine.findMissingCitations(content, style);
        
        // Validate each citation
        const allErrors: string[] = [];
        citations.forEach(cit => {
            const validation = CitationValidator.validateInTextCitation(cit, style);
            if (!validation.isValid) {
                allErrors.push(...validation.errors);
            }
        });

        setInTextResult({
            citations,
            missingCitations: missing,
            validation: {
                isValid: allErrors.length === 0,
                style,
                errors: allErrors,
                warnings: [],
                suggestions: []
            }
        });
    }, [content, style, engine]);

    // Validate reference list
    useEffect(() => {
        const validation = CitationValidator.validateReferenceList(references, style);
        setReferenceResult(validation);
    }, [references, style]);

    // Combined result
    const isValid = inTextResult.validation.isValid && referenceResult.isValid;
    const overallScore = calculateOverallScore(inTextResult, referenceResult, references.length);

    return {
        isValid,
        overallScore,
        inText: inTextResult,
        references: referenceResult,
        issues: [
            ...inTextResult.validation.errors.map(e => ({ type: 'error' as const, field: 'in-text', message: e, code: 'IN_TEXT_ERROR' })),
            ...inTextResult.missingCitations.map(c => ({ type: 'warning' as const, field: 'in-text', message: `Citation not in reference list: ${c}`, code: 'MISSING_REFERENCE' })),
            ...referenceResult.errors.map(e => ({ type: 'error' as const, field: 'references', message: e, code: 'REFERENCE_ERROR' })),
            ...referenceResult.warnings.map(w => ({ type: 'warning' as const, field: 'references', message: w, code: 'REFERENCE_WARNING' }))
        ]
    };
}

/**
 * Calculate overall APA compliance score (0-100)
 */
function calculateOverallScore(
    inText: { validation: CitationValidationResult; missingCitations: string[]; citations: string[] },
    references: CitationValidationResult,
    referenceCount: number
): number {
    let score = 100;

    // Deduct for in-text citation errors
    score -= inText.validation.errors.length * 5;

    // Deduct for missing citations
    score -= inText.missingCitations.length * 10;

    // Deduct for reference errors
    score -= references.errors.length * 10;

    // Deduct for reference warnings
    score -= references.warnings.length * 2;

    // Bonus for having enough references
    if (referenceCount >= 20) {
        score += 5;
    } else if (referenceCount >= 15) {
        score += 2;
    }

    // Cap score between 0 and 100
    return Math.max(0, Math.min(100, score));
}

/**
 * Hook for managing references
 */
export function useReferences(initialReferences?: Reference[]) {
    const [references, setReferences] = useState<Reference[]>(initialReferences || []);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'author' | 'year' | 'title'>('author');

    const engine = useMemo(() => new CitationEngine(references), [references]);

    // Filter and search references
    const filteredReferences = useMemo(() => {
        let filtered = [...references];

        // Filter by type
        if (filterType !== 'all') {
            filtered = filtered.filter(r => r.type === filterType);
        }

        // Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(r =>
                r.title.toLowerCase().includes(query) ||
                r.authors.some(a => a.lastName.toLowerCase().includes(query)) ||
                r.year.toString().includes(query)
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'author':
                    return (a.authors[0]?.lastName || '').localeCompare(b.authors[0]?.lastName || '');
                case 'year':
                    return b.year - a.year;
                case 'title':
                    return a.title.toLowerCase().localeCompare(b.title.toLowerCase());
                default:
                    return 0;
            }
        });

        return filtered;
    }, [references, searchQuery, filterType, sortBy]);

    // Add reference
    const addReference = useCallback((reference: Reference) => {
        setReferences(prev => [...prev, reference]);
    }, []);

    // Update reference
    const updateReference = useCallback((id: string, updates: Partial<Reference>) => {
        setReferences(prev => prev.map(r =>
            r.id === id ? { ...r, ...updates } : r
        ));
    }, []);

    // Remove reference
    const removeReference = useCallback((id: string) => {
        setReferences(prev => prev.filter(r => r.id !== id));
        setSelectedIds(prev => {
            const next = new Set(prev);
            next.delete(id);
            return next;
        });
    }, []);

    // Remove multiple references
    const removeSelectedReferences = useCallback(() => {
        setReferences(prev => prev.filter(r => !selectedIds.has(r.id)));
        setSelectedIds(new Set());
    }, [selectedIds]);

    // Toggle selection
    const toggleSelection = useCallback((id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    }, []);

    // Select all
    const selectAll = useCallback(() => {
        setSelectedIds(new Set(filteredReferences.map(r => r.id)));
    }, [filteredReferences]);

    // Deselect all
    const deselectAll = useCallback(() => {
        setSelectedIds(new Set());
    }, []);

    // Get formatted citation
    const getFormattedCitation = useCallback((id: string, style: CitationStyle): string | undefined => {
        const ref = references.find(r => r.id === id);
        if (!ref) return undefined;
        return engine.formatCitation(ref, style);
    }, [references, engine]);

    // Generate reference list
    const generateReferenceList = useCallback((style: CitationStyle) => {
        return engine.generateReferenceList(style);
    }, [engine]);

    return {
        references,
        filteredReferences,
        selectedIds,
        searchQuery,
        filterType,
        sortBy,
        setSearchQuery,
        setFilterType,
        setSortBy,
        addReference,
        updateReference,
        removeReference,
        removeSelectedReferences,
        toggleSelection,
        selectAll,
        deselectAll,
        getFormattedCitation,
        generateReferenceList,
        referenceCount: references.length,
        hasSelection: selectedIds.size > 0,
        allSelected: selectedIds.size === filteredReferences.length && filteredReferences.length > 0
    };
}

/**
 * Hook for citation statistics
 */
export function useCitationStats(references: Reference[]) {
    return useMemo(() => {
        const stats = {
            total: references.length,
            byType: {} as Record<string, number>,
            byYear: {} as Record<number, number>,
            withDoi: 0,
            withoutDoi: 0,
            recentlyAdded: 0
        };

        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        references.forEach(ref => {
            // Count by type
            stats.byType[ref.type] = (stats.byType[ref.type] || 0) + 1;

            // Count by year
            stats.byYear[ref.year] = (stats.byYear[ref.year] || 0) + 1;

            // DOI count
            if (ref.doi) {
                stats.withDoi++;
            } else {
                stats.withoutDoi++;
            }

            // Recently added
            if (new Date(ref.addedAt) > thirtyDaysAgo) {
                stats.recentlyAdded++;
            }
        });

        return stats;
    }, [references]);
}

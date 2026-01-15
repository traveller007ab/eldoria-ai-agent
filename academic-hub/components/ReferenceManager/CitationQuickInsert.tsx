import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Search, Plus, X, BookOpen, Quote, AtSign, Copy, Check } from 'lucide-react';
import { Button } from '../Common/Button';
import { Reference, CitationStyle, AuthorFormatter } from '../../../services/citationEngine';

interface CitationQuickInsertProps {
    references: Reference[];
    onInsertCitation: (citation: string) => void;
    onInsertBibliography?: () => void;
    selectedStyle?: CitationStyle;
    onStyleChange?: (style: CitationStyle) => void;
}

const STYLES: { value: CitationStyle; label: string }[] = [
    { value: 'apa', label: 'APA' },
    { value: 'ieee', label: 'IEEE' },
    { value: 'harvard', label: 'Harvard' },
    { value: 'mla', label: 'MLA' },
    { value: 'chicago', label: 'Chicago' }
];

export const CitationQuickInsert: React.FC<CitationQuickInsertProps> = ({
    references,
    onInsertCitation,
    onInsertBibliography,
    selectedStyle = 'apa',
    onStyleChange
}) => {
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedReferences, setSelectedReferences] = useState<Reference[]>([]);
    const [showResults, setShowResults] = useState(false);
    const [copied, setCopied] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowResults(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const filteredReferences = useMemo(() => {
        if (!searchQuery) return references.slice(0, 10);
        const query = searchQuery.toLowerCase();
        return references.filter(ref =>
            ref.title?.toLowerCase().includes(query) ||
            ref.authors?.some(a => a.lastName.toLowerCase().includes(query)) ||
            ref.year?.toString().includes(query)
        ).slice(0, 10);
    }, [references, searchQuery]);

    const handleSelect = (reference: Reference) => {
        if (!selectedReferences.find(r => r.id === reference.id)) {
            setSelectedReferences(prev => [...prev, reference]);
        }
        setSearchQuery('');
        setShowResults(false);
        inputRef.current?.focus();
    };

    const handleRemove = (id: string) => {
        setSelectedReferences(prev => prev.filter(r => r.id !== id));
    };

    const generateCitation = (reference: Reference): string => {
        switch (selectedStyle) {
            case 'apa':
                const apaAuthors = reference.authors?.map(a => `${a.lastName}, ${a.firstName.charAt(0)}.`).join(', ') || 'Unknown';
                return `(${apaAuthors}, ${reference.year})`;
            case 'ieee':
                const ieeeAuthors = reference.authors?.map(a => `${a.firstName.charAt(0)}. ${a.lastName}`).join(', ') || 'Unknown';
                return `[${ieeeAuthors}, ${reference.year}]`;
            case 'harvard':
                const harvardAuthors = reference.authors?.map(a => `${a.lastName}, ${a.firstName.charAt(0)}.`).join(' and ') || 'Unknown';
                return `(${harvardAuthors}, ${reference.year})`;
            case 'mla':
                const mlaAuthors = reference.authors?.map(a => `${a.lastName}, ${a.firstName}`).join(', ') || 'Unknown';
                return `(${mlaAuthors} ${reference.year})`;
            case 'chicago':
                const chicagoAuthors = reference.authors?.map(a => `${a.lastName}, ${a.firstName}`).join(', ') || 'Unknown';
                return `(${chicagoAuthors} ${reference.year})`;
            default:
                return `(${reference.authors?.[0]?.lastName}, ${reference.year})`;
        }
    };

    const handleInsert = (reference: Reference) => {
        const citation = generateCitation(reference);
        onInsertCitation(citation);
        setSelectedReferences(prev => prev.filter(r => r.id !== reference.id));
    };

    const handleInsertAll = () => {
        selectedReferences.forEach(ref => {
            const citation = generateCitation(ref);
            onInsertCitation(citation);
        });
        setSelectedReferences([]);
    };

    const handleCopyAll = async () => {
        const citations = selectedReferences.map(generateCitation).join('; ');
        await navigator.clipboard.writeText(citations);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const suggestedCitations = useMemo(() => {
        return references
            .filter(ref => !selectedReferences.find(r => r.id === ref.id))
            .slice(0, 5)
            .map(ref => ({
                reference: ref,
                citation: generateCitation(ref)
            }));
    }, [references, selectedReferences, selectedStyle]);

    return (
        <div className="citation-quick-insert">
            <div className="citation-quick-insert__header">
                <div className="citation-quick-insert__title">
                    <Quote className="w-5 h-5 text-cyan-400" />
                    <h2>Quick Citation</h2>
                </div>
                <div className="citation-quick-insert__style">
                    <select
                        value={selectedStyle}
                        onChange={(e) => onStyleChange?.(e.target.value as CitationStyle)}
                        className="citation-quick-insert__style-select"
                    >
                        {STYLES.map(style => (
                            <option key={style.value} value={style.value}>{style.label}</option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="citation-quick-insert__search" ref={dropdownRef}>
                <Search className="w-4 h-4 text-cyan-500/50" />
                <input
                    ref={inputRef}
                    type="text"
                    placeholder="Search references or paste citation..."
                    value={searchQuery}
                    onChange={(e) => {
                        setSearchQuery(e.target.value);
                        setShowResults(true);
                    }}
                    onFocus={() => setShowResults(true)}
                    className="citation-quick-insert__input"
                />
                {searchQuery && (
                    <button
                        className="citation-quick-insert__clear"
                        onClick={() => {
                            setSearchQuery('');
                            inputRef.current?.focus();
                        }}
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}

                {showResults && searchQuery && filteredReferences.length > 0 && (
                    <div className="citation-quick-insert__dropdown">
                        {filteredReferences.map(ref => (
                            <button
                                key={ref.id}
                                className="citation-quick-insert__dropdown-item"
                                onClick={() => handleSelect(ref)}
                            >
                                <div className="citation-quick-insert__ref-info">
                                    <span className="citation-quick-insert__ref-title">{ref.title}</span>
                                    <span className="citation-quick-insert__ref-author">
                                        {ref.authors?.map(a => a.lastName).join(', ') || 'Unknown'} ({ref.year})
                                    </span>
                                </div>
                                <Plus className="w-4 h-4 text-cyan-400" />
                            </button>
                        ))}
                    </div>
                )}
            </div>

            {selectedReferences.length > 0 && (
                <div className="citation-quick-insert__selected">
                    <div className="citation-quick-insert__selected-header">
                        <span>Selected ({selectedReferences.length})</span>
                        <div className="citation-quick-insert__selected-actions">
                            <Button variant="ghost" size="sm" onClick={handleCopyAll}>
                                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                            </Button>
                            <Button variant="ghost" size="sm" onClick={handleInsertAll}>
                                Insert All
                            </Button>
                        </div>
                    </div>
                    <div className="citation-quick-insert__selected-list">
                        {selectedReferences.map(ref => (
                            <div key={ref.id} className="citation-quick-insert__selected-item">
                                <span className="citation-quick-insert__selected-text">
                                    {generateCitation(ref)}
                                </span>
                                <div className="citation-quick-insert__selected-btns">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleInsert(ref)}
                                    >
                                        Insert
                                    </Button>
                                    <button
                                        className="citation-quick-insert__remove"
                                        onClick={() => handleRemove(ref.id)}
                                    >
                                        <X className="w-3 h-3" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {suggestedCitations.length > 0 && selectedReferences.length === 0 && (
                <div className="citation-quick-insert__suggestions">
                    <div className="citation-quick-insert__suggestions-header">
                        <span>Suggested Citations</span>
                    </div>
                    <div className="citation-quick-insert__suggestions-list">
                        {suggestedCitations.map(({ reference, citation }) => (
                            <button
                                key={reference.id}
                                className="citation-quick-insert__suggestion-item"
                                onClick={() => handleSelect(reference)}
                            >
                                <span className="citation-quick-insert__suggestion-citation">{citation}</span>
                                <Plus className="w-3 h-3 text-cyan-400" />
                            </button>
                        ))}
                    </div>
                </div>
            )}

            <div className="citation-quick-insert__footer">
                <div className="citation-quick-insert__help">
                    <AtSign className="w-4 h-4 text-cyan-500/40" />
                    <span>Select references to generate citations</span>
                </div>
                {onInsertBibliography && (
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={onInsertBibliography}
                        disabled={references.length === 0}
                    >
                        <BookOpen className="w-4 h-4" />
                        Insert Bibliography
                    </Button>
                )}
            </div>
        </div>
    );
};

export default CitationQuickInsert;

import React, { useState, useMemo } from 'react';
import { BookOpen, Copy, Check, Search, Download, FileText, Settings, ChevronDown } from 'lucide-react';
import { Button } from '../Common/Button';
import { Reference, CitationStyle, CitationEngine, AuthorFormatter } from '../../../services/citationEngine';

const formatReference = (ref: Reference, style: CitationStyle): string => {
    const authors = AuthorFormatter.formatAuthors(ref.authors, style);
    const year = `(${ref.year})`;
    const title = ref.title.endsWith('.') ? ref.title : ref.title + '.';

    switch (style) {
        case 'apa':
            switch (ref.type) {
                case 'journal':
                    const apaIssue = ref.issue ? `(${ref.issue})` : '';
                    const apaPages = ref.pages ? `, ${ref.pages}` : '';
                    const apaDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                    return `${authors} ${year}. ${title} ${ref.journal || ''}${ref.volume ? `, ${ref.volume}${apaIssue}` : ''}${apaPages}${apaDoi}`;
                case 'book':
                    const apaEdition = ref.edition ? ` (${ref.edition} ed.)` : '';
                    const apaBookDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                    return `${authors} ${year}${apaEdition}. ${title} ${ref.publisher || ''}${apaBookDoi}`;
                case 'website':
                    const accessDate = ref.accessDate ? `. Retrieved from ${ref.accessDate}` : '';
                    return `${authors} ${year}. ${title} ${ref.url || ''}${accessDate}`;
                case 'conference':
                    const location = ref.conferenceLocation ? `${ref.conference}, ${ref.conferenceLocation}` : ref.conference || '';
                    const confDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                    return `${authors} ${year}. ${title} In ${location}${confDoi}`;
                default:
                    const genericDoi = ref.doi ? `. https://doi.org/${ref.doi}` : '';
                    return `${authors} ${year}. ${title} ${ref.institution || ''}${genericDoi}`;
            }
        case 'ieee':
            switch (ref.type) {
                case 'journal':
                    const ieeeIssue = ref.issue ? `, no. ${ref.issue}` : '';
                    const ieeePages = ref.pages ? `, pp. ${ref.pages}` : '';
                    return `${authors}, "${title.replace(/\.$/, '')}," ${ref.journal || ''}, vol. ${ref.volume || ''}${ieeeIssue}${ieeePages}, ${ref.year}.`;
                case 'book':
                    const ieeeEdition = ref.edition ? `, ${ref.edition}` : '';
                    return `${authors}, ${title.replace(/\.$/, '')}${ieeeEdition}. ${ref.publisher || ''}, ${ref.year}.`;
                default:
                    return `${authors}, "${title.replace(/\.$/, '')}" ${ref.year}.`;
            }
        case 'harvard':
            switch (ref.type) {
                case 'journal':
                    const harvardIssue = ref.issue ? `(${ref.issue})` : '';
                    const harvardPages = ref.pages ? `, ${ref.pages}` : '';
                    return `${authors} ${year} '${title.replace(/\.$/, '')}', ${ref.journal || ''}${ref.volume ? `, ${ref.volume}${harvardIssue}` : ''}${harvardPages}.`;
                default:
                    return `${authors} ${year} ${title} ${ref.publisher || ''}`;
            }
        case 'mla':
            switch (ref.type) {
                case 'journal':
                    const mlaIssue = ref.issue ? `, no. ${ref.issue}` : '';
                    const mlaPages = ref.pages ? `, pp. ${ref.pages}` : '';
                    return `${authors}. "${title.replace(/\.$/, '')}" ${ref.journal || ''}, vol. ${ref.volume || ''}${mlaIssue}, ${ref.year}${mlaPages}.`;
                default:
                    return `${authors}. "${title.replace(/\.$/, '')}" ${ref.publisher || ''}, ${ref.year}.`;
            }
        case 'chicago':
            switch (ref.type) {
                case 'journal':
                    const chiIssue = ref.issue ? `, no. ${ref.issue}` : '';
                    const chiPages = ref.pages ? `: ${ref.pages}` : '';
                    return `${authors}. "${title.replace(/\.$/, '')}" ${ref.journal || ''} ${ref.volume || ''}${chiIssue} (${ref.year})${chiPages}.`;
                default:
                    return `${authors}. ${title} ${ref.publisher || ''}, ${ref.year}.`;
            }
        default:
            return `${authors} ${year} ${title}`;
    }
};

interface BibliographyPreviewProps {
    references: Reference[];
    selectedStyle?: CitationStyle;
    onStyleChange?: (style: CitationStyle) => void;
    onCopyAll?: () => void;
    onExport?: (format: 'bibtex' | 'ris' | 'text') => void;
}

interface BibliographyPreviewProps {
    references: Reference[];
    selectedStyle?: CitationStyle;
    onStyleChange?: (style: CitationStyle) => void;
    onCopyAll?: () => void;
    onExport?: (format: 'bibtex' | 'ris' | 'text') => void;
}

const STYLES: { value: CitationStyle; label: string; description: string }[] = [
    { value: 'apa', label: 'APA 7th Edition', description: 'American Psychological Association' },
    { value: 'ieee', label: 'IEEE', description: 'Institute of Electrical and Electronics Engineers' },
    { value: 'harvard', label: 'Harvard', description: 'Author-date referencing system' },
    { value: 'mla', label: 'MLA', description: 'Modern Language Association' },
    { value: 'chicago', label: 'Chicago', description: 'Chicago Manual of Style' }
];

export const BibliographyPreview: React.FC<BibliographyPreviewProps> = ({
    references,
    selectedStyle = 'apa',
    onStyleChange,
    onCopyAll,
    onExport
}) => {
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [showStyleDropdown, setShowStyleDropdown] = useState(false);
    const [sortBy, setSortBy] = useState<'alphabetical' | 'type' | 'year'>('alphabetical');

    const sortedReferences = useMemo(() => {
        let sorted = [...references];

        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            sorted = sorted.filter(ref =>
                ref.title?.toLowerCase().includes(query) ||
                ref.authors?.some(a => a.lastName.toLowerCase().includes(query)) ||
                ref.year?.toString().includes(query)
            );
        }

        switch (sortBy) {
            case 'alphabetical':
                sorted.sort((a, b) => {
                    const aFirst = a.authors?.[0]?.lastName || a.title || '';
                    const bFirst = b.authors?.[0]?.lastName || b.title || '';
                    return aFirst.localeCompare(bFirst);
                });
                break;
            case 'type':
                sorted.sort((a, b) => a.type.localeCompare(b.type));
                break;
            case 'year':
                sorted.sort((a, b) => (b.year || 0) - (a.year || 0));
                break;
        }

        return sorted;
    }, [references, searchQuery, sortBy]);

    const formattedReferences = useMemo(() => {
        return sortedReferences.map(ref => formatReference(ref, selectedStyle));
    }, [sortedReferences, selectedStyle]);

    const handleCopy = async (text: string, index: number) => {
        await navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    const handleCopyAll = async () => {
        const fullText = formattedReferences.join('\n\n');
        await navigator.clipboard.writeText(fullText);
        onCopyAll?.();
    };

    const groupedByType = useMemo(() => {
        const groups: Record<string, Reference[]> = {};
        sortedReferences.forEach(ref => {
            if (!groups[ref.type]) groups[ref.type] = [];
            groups[ref.type].push(ref);
        });
        return groups;
    }, [sortedReferences]);

    return (
        <div className="bibliography-preview">
            <div className="bibliography-preview__header">
                <div className="bibliography-preview__title">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <h2>Bibliography</h2>
                    <span className="bibliography-preview__count">{references.length} references</span>
                </div>
                <div className="bibliography-preview__actions">
                    <Button variant="ghost" size="sm" onClick={handleCopyAll}>
                        <Copy className="w-4 h-4" />
                        Copy All
                    </Button>
                    {onExport && (
                        <div className="bibliography-preview__export">
                            <Button variant="ghost" size="sm">
                                <Download className="w-4 h-4" />
                                Export
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="bibliography-preview__toolbar">
                <div className="bibliography-preview__search">
                    <Search className="w-4 h-4 text-cyan-500/50" />
                    <input
                        type="text"
                        placeholder="Search references..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="bibliography-preview__search-input"
                    />
                </div>

                <div className="bibliography-preview__style-selector">
                    <button
                        className="bibliography-preview__style-btn"
                        onClick={() => setShowStyleDropdown(!showStyleDropdown)}
                    >
                        <span>{STYLES.find(s => s.value === selectedStyle)?.label}</span>
                        <ChevronDown className="w-4 h-4" />
                    </button>
                    {showStyleDropdown && (
                        <div className="bibliography-preview__dropdown">
                            {STYLES.map(style => (
                                <button
                                    key={style.value}
                                    className={`bibliography-preview__dropdown-item ${selectedStyle === style.value ? 'is-active' : ''}`}
                                    onClick={() => {
                                        onStyleChange?.(style.value);
                                        setShowStyleDropdown(false);
                                    }}
                                >
                                    <span className="bibliography-preview__style-label">{style.label}</span>
                                    <span className="bibliography-preview__style-desc">{style.description}</span>
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                <div className="bibliography-preview__sort">
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                        className="bibliography-preview__sort-select"
                    >
                        <option value="alphabetical">Alphabetical</option>
                        <option value="type">By Type</option>
                        <option value="year">By Year</option>
                    </select>
                </div>
            </div>

            <div className="bibliography-preview__content">
                {formattedReferences.length === 0 ? (
                    <div className="bibliography-preview__empty">
                        <BookOpen className="w-12 h-12 text-cyan-500/20" />
                        <p>No references to display</p>
                        <span>Add references to see formatted bibliography</span>
                    </div>
                ) : (
                    <div className="bibliography-preview__list">
                        {sortBy === 'type' ? (
                            Object.entries(groupedByType).map(([type, refs]) => (
                                <div key={type} className="bibliography-preview__group">
                                    <div className="bibliography-preview__group-title">
                                        {type.charAt(0).toUpperCase() + type.slice(1)}s ({refs.length})
                                    </div>
                                    {refs.map((ref, idx) => {
                                        const globalIndex = sortedReferences.indexOf(ref);
                                        return (
                                            <BibliographyItem
                                                key={ref.id}
                                                citation={formattedReferences[globalIndex]}
                                                reference={ref}
                                                onCopy={() => handleCopy(formattedReferences[globalIndex], globalIndex)}
                                                copied={copiedIndex === globalIndex}
                                            />
                                        );
                                    })}
                                </div>
                            ))
                        ) : (
                            formattedReferences.map((citation, index) => (
                                <BibliographyItem
                                    key={sortedReferences[index].id}
                                    citation={citation}
                                    reference={sortedReferences[index]}
                                    onCopy={() => handleCopy(citation, index)}
                                    copied={copiedIndex === index}
                                />
                            ))
                        )}
                    </div>
                )}
            </div>

            <div className="bibliography-preview__footer">
                <div className="bibliography-preview__style-info">
                    <span className="bibliography-preview__style-badge">{selectedStyle.toUpperCase()}</span>
                    <span>Formatted using {STYLES.find(s => s.value === selectedStyle)?.label}</span>
                </div>
            </div>
        </div>
    );
};

interface BibliographyItemProps {
    citation: string;
    reference: Reference;
    onCopy: () => void;
    copied: boolean;
}

const BibliographyItem: React.FC<BibliographyItemProps> = ({ citation, reference, onCopy, copied }) => {
    const typeColors: Record<string, string> = {
        journal: 'text-blue-400',
        book: 'text-emerald-400',
        website: 'text-amber-400',
        conference: 'text-purple-400',
        thesis: 'text-pink-400',
        report: 'text-cyan-400',
        patent: 'text-orange-400',
        software: 'text-gray-400',
        other: 'text-slate-400'
    };

    return (
        <div className="bibliography-item">
            <div className="bibliography-item__type">
                <span className={`bibliography-item__type-badge ${typeColors[reference.type] || 'text-slate-400'}`}>
                    {reference.type}
                </span>
            </div>
            <div className="bibliography-item__citation">
                <p className="bibliography-item__text">{citation}</p>
                {reference.doi && (
                    <a
                        href={`https://doi.org/${reference.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bibliography-item__doi"
                    >
                        https://doi.org/{reference.doi}
                    </a>
                )}
            </div>
            <button
                className={`bibliography-item__copy ${copied ? 'copied' : ''}`}
                onClick={onCopy}
                title="Copy citation"
            >
                {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
            </button>
        </div>
    );
};

export default BibliographyPreview;

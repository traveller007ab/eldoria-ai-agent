import React, { useState, useCallback, useMemo } from 'react';
import {
    BookOpen, Plus, Trash2, Edit2, Search, Filter, Download,
    Upload, FileText, MoreVertical, Check, X, Save, Copy,
    ExternalLink, Tag, Star, Grid, List, ChevronDown, ChevronRight,
    AlertCircle, CheckCircle, Info, AlertTriangle
} from 'lucide-react';
import { Button } from '../Common/Button';
import { Card, CardTitle } from '../Common/Card';
import {
    Reference,
    CitationStyle,
    createEmptyReference,
    parseAuthorString
} from '../../../services/citationEngine';
import './ReferenceManager.css';

interface ReferenceManagerProps {
    references: Reference[];
    onAddReference: (reference: Reference) => void;
    onUpdateReference: (id: string, updates: Partial<Reference>) => void;
    onDeleteReference: (id: string) => void;
    onDeleteSelected: (ids: string[]) => void;
    onImportReferences: (references: Reference[]) => void;
    onExportReferences: (format: 'bibtex' | 'ris' | 'csv') => void;
    selectedIds: string[];
    onSelect: (id: string) => void;
    onSelectAll: () => void;
    onDeselectAll: () => void;
}

// ============================================================================
// REFERENCE ENTRY FORM
// ============================================================================

interface ReferenceFormProps {
    reference?: Partial<Reference>;
    onSave: (reference: Reference) => void;
    onCancel: () => void;
}

const ReferenceForm: React.FC<ReferenceFormProps> = ({ reference, onSave, onCancel }) => {
    const [formData, setFormData] = useState<Partial<Reference>>(
        reference || createEmptyReference()
    );

    const [authorsInput, setAuthorsInput] = useState(
        reference?.authors?.map(a => `${a.lastName}, ${a.firstName}${a.middleName ? ' ' + a.middleName : ''}`).join('; ') || ''
    );

    const handleAuthorsChange = (value: string) => {
        setAuthorsInput(value);
        
        // Parse authors immediately
        const authorStrings = value.split(';').map(s => s.trim()).filter(Boolean);
        const parsedAuthors = authorStrings.map(name => {
            const parts = name.split(',').map(s => s.trim());
            if (parts.length >= 2) {
                return {
                    firstName: parts[1] || '',
                    lastName: parts[0] || '',
                    middleName: undefined,
                    initials: parts[1]?.charAt(0)?.toUpperCase()
                };
            }
            return {
                firstName: name.split(' ')[0] || '',
                lastName: name.split(' ').slice(-1)[0] || '',
                middleName: undefined,
                initials: name.split(' ')[0]?.charAt(0)?.toUpperCase()
            };
        });
        
        setFormData(prev => ({ ...prev, authors: parsedAuthors }));
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        
        const newReference: Reference = {
            id: formData.id || crypto.randomUUID(),
            type: formData.type || 'journal',
            authors: formData.authors || [],
            year: formData.year || new Date().getFullYear(),
            title: formData.title || 'Untitled',
            pages: formData.pages || '',
            source: formData.source || 'manual',
            addedAt: new Date(),
            ...formData
        };
        
        onSave(newReference);
    };

    return (
        <form className="reference-form" onSubmit={handleSubmit}>
            <div className="reference-form__section">
                <h4>Reference Type</h4>
                <select
                    value={formData.type || 'journal'}
                    onChange={e => setFormData(prev => ({ ...prev, type: e.target.value as Reference['type'] }))}
                    className="reference-form__select"
                >
                    <option value="journal">Journal Article</option>
                    <option value="book">Book</option>
                    <option value="conference">Conference Paper</option>
                    <option value="thesis">Thesis/Dissertation</option>
                    <option value="report">Report</option>
                    <option value="website">Website</option>
                    <option value="patent">Patent</option>
                    <option value="software">Software</option>
                    <option value="other">Other</option>
                </select>
            </div>

            <div className="reference-form__section">
                <h4>Authors</h4>
                <input
                    type="text"
                    value={authorsInput}
                    onChange={e => handleAuthorsChange(e.target.value)}
                    placeholder="LastName, FirstName; LastName, FirstName"
                    className="reference-form__input"
                />
                <span className="reference-form__hint">Separate multiple authors with semicolons (;)</span>
            </div>

            <div className="reference-form__section">
                <h4>Year</h4>
                <input
                    type="number"
                    value={formData.year || ''}
                    onChange={e => setFormData(prev => ({ ...prev, year: parseInt(e.target.value) || undefined }))}
                    placeholder="2024"
                    className="reference-form__input"
                />
            </div>

            <div className="reference-form__section">
                <h4>Title</h4>
                <input
                    type="text"
                    value={formData.title || ''}
                    onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                    placeholder="Reference title"
                    className="reference-form__input"
                    required
                />
            </div>

            {(formData.type === 'journal' || formData.type === 'conference') && (
                <div className="reference-form__section">
                    <h4>Journal/Conference Name</h4>
                    <input
                        type="text"
                        value={formData.journal || ''}
                        onChange={e => setFormData(prev => ({ ...prev, journal: e.target.value }))}
                        placeholder={formData.type === 'journal' ? 'Journal Name' : 'Conference Name'}
                        className="reference-form__input"
                    />
                </div>
            )}

            {formData.type === 'journal' && (
                <>
                    <div className="reference-form__row">
                        <div className="reference-form__section">
                            <h4>Volume</h4>
                            <input
                                type="text"
                                value={formData.volume || ''}
                                onChange={e => setFormData(prev => ({ ...prev, volume: e.target.value }))}
                                placeholder="10"
                                className="reference-form__input"
                            />
                        </div>
                        <div className="reference-form__section">
                            <h4>Issue</h4>
                            <input
                                type="text"
                                value={formData.issue || ''}
                                onChange={e => setFormData(prev => ({ ...prev, issue: e.target.value }))}
                                placeholder="2"
                                className="reference-form__input"
                            />
                        </div>
                    </div>
                </>
            )}

            <div className="reference-form__section">
                <h4>Pages</h4>
                <input
                    type="text"
                    value={formData.pages || ''}
                    onChange={e => setFormData(prev => ({ ...prev, pages: e.target.value }))}
                    placeholder="100-150"
                    className="reference-form__input"
                />
            </div>

            <div className="reference-form__section">
                <h4>DOI</h4>
                <input
                    type="text"
                    value={formData.doi || ''}
                    onChange={e => setFormData(prev => ({ ...prev, doi: e.target.value }))}
                    placeholder="10.1234/xxxxx"
                    className="reference-form__input"
                />
            </div>

            <div className="reference-form__section">
                <h4>URL</h4>
                <input
                    type="url"
                    value={formData.url || ''}
                    onChange={e => setFormData(prev => ({ ...prev, url: e.target.value }))}
                    placeholder="https://..."
                    className="reference-form__input"
                />
            </div>

            {formData.type === 'book' && (
                <div className="reference-form__section">
                    <h4>Publisher</h4>
                    <input
                        type="text"
                        value={formData.publisher || ''}
                        onChange={e => setFormData(prev => ({ ...prev, publisher: e.target.value }))}
                        placeholder="Publisher Name"
                        className="reference-form__input"
                    />
                </div>
            )}

            <div className="reference-form__section">
                <h4>Tags (comma-separated)</h4>
                <input
                    type="text"
                    value={(formData.tags as string[] || []).join(', ') || ''}
                    onChange={e => setFormData({ 
                        ...formData, 
                        tags: e.target.value.split(',').map(t => t.trim()).filter(Boolean) 
                    })}
                    placeholder="tag1, tag2, tag3"
                    className="reference-form__input"
                />
            </div>

            <div className="reference-form__section">
                <h4>Notes</h4>
                <textarea
                    value={formData.notes || ''}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                    placeholder="Personal notes about this reference..."
                    className="reference-form__textarea"
                    rows={3}
                />
            </div>

            <div className="reference-form__actions">
                <Button type="button" variant="ghost" onClick={onCancel}>
                    Cancel
                </Button>
                <Button type="submit" variant="primary">
                    <Save size={16} />
                    Save Reference
                </Button>
            </div>
        </form>
    );
};

// ============================================================================
// REFERENCE CARD COMPONENT
// ============================================================================

interface ReferenceCardProps {
    reference: Reference;
    isSelected: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => void;
    onCopy: () => void;
    citationStyle: CitationStyle;
}

const ReferenceCard: React.FC<ReferenceCardProps> = ({
    reference,
    isSelected,
    onSelect,
    onEdit,
    onDelete,
    onCopy,
    citationStyle
}) => {
    const [showMenu, setShowMenu] = useState(false);

    const formattedCitation = useMemo(() => {
        // Simple formatter for display
        const authors = reference.authors?.map(a => a.lastName).join(', ') || 'Anonymous';
        return `${authors} (${reference.year}). ${reference.title}.`;
    }, [reference]);

    const typeLabels: Record<string, string> = {
        journal: 'Journal Article',
        book: 'Book',
        conference: 'Conference',
        thesis: 'Thesis',
        report: 'Report',
        website: 'Website',
        patent: 'Patent',
        software: 'Software',
        other: 'Other'
    };

    return (
        <div className={`reference-card ${isSelected ? 'reference-card--selected' : ''}`}>
            <div className="reference-card__header">
                <label className="reference-card__checkbox">
                    <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={onSelect}
                    />
                </label>
                
                <div className="reference-card__type">
                    <span className={`reference-type-badge reference-type-badge--${reference.type}`}>
                        {typeLabels[reference.type] || reference.type}
                    </span>
                </div>

                <div className="reference-card__actions">
                    <button 
                        className="reference-card__action"
                        onClick={onCopy}
                        title="Copy citation"
                    >
                        <Copy size={14} />
                    </button>
                    <button 
                        className="reference-card__action"
                        onClick={onEdit}
                        title="Edit"
                    >
                        <Edit2 size={14} />
                    </button>
                    <button 
                        className="reference-card__action reference-card__action--danger"
                        onClick={onDelete}
                        title="Delete"
                    >
                        <Trash2 size={14} />
                    </button>
                </div>
            </div>

            <div className="reference-card__content">
                <h4 className="reference-card__title">{reference.title}</h4>
                <p className="reference-card__authors">
                    {reference.authors?.map(a => `${a.lastName}, ${a.firstName[0]}.`).join('; ') || 'Unknown'}
                </p>
                <p className="reference-card__meta">
                    {reference.journal || reference.publisher || reference.conference || ''}
                    {reference.journal && reference.volume && `, Vol. ${reference.volume}`}
                    {reference.pages && `, pp. ${reference.pages}`}
                    {reference.year && ` (${reference.year})`}
                </p>
                {reference.doi && (
                    <a 
                        href={`https://doi.org/${reference.doi}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="reference-card__doi"
                    >
                        <ExternalLink size={12} />
                        DOI: {reference.doi}
                    </a>
                )}
            </div>

            {reference.tags && reference.tags.length > 0 && (
                <div className="reference-card__tags">
                    {reference.tags.map(tag => (
                        <span key={tag} className="reference-card__tag">
                            <Tag size={10} />
                            {tag}
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
};

// ============================================================================
// REFERENCE MANAGER MAIN COMPONENT
// ============================================================================

const ReferenceManager: React.FC<ReferenceManagerProps> = ({
    references,
    onAddReference,
    onUpdateReference,
    onDeleteReference,
    onDeleteSelected,
    onImportReferences,
    onExportReferences,
    selectedIds,
    onSelect,
    onSelectAll,
    onDeselectAll
}) => {
    const [view, setView] = useState<'list' | 'grid'>('list');
    const [searchQuery, setSearchQuery] = useState('');
    const [filterType, setFilterType] = useState<string>('all');
    const [sortBy, setSortBy] = useState<'author' | 'year' | 'title'>('author');
    const [showAddForm, setShowAddForm] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [citationStyle, setCitationStyle] = useState<CitationStyle>('apa');
    const [showImportModal, setShowImportModal] = useState(false);

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
                r.authors?.some(a => a.lastName.toLowerCase().includes(query)) ||
                r.year.toString().includes(query) ||
                r.journal?.toLowerCase().includes(query) ||
                r.tags?.some(t => t.toLowerCase().includes(query))
            );
        }

        // Sort
        filtered.sort((a, b) => {
            switch (sortBy) {
                case 'author':
                    const aAuthor = a.authors?.[0]?.lastName?.toLowerCase() || '';
                    const bAuthor = b.authors?.[0]?.lastName?.toLowerCase() || '';
                    return aAuthor.localeCompare(bAuthor);
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

    const handleSaveReference = useCallback((reference: Reference) => {
        if (editingId) {
            onUpdateReference(editingId, reference);
            setEditingId(null);
        } else {
            onAddReference(reference);
        }
        setShowAddForm(false);
    }, [editingId, onAddReference, onUpdateReference]);

    const handleDeleteSelected = useCallback(() => {
        if (selectedIds.length > 0) {
            onDeleteSelected(selectedIds);
        }
    }, [selectedIds, onDeleteSelected]);

    const handleImport = useCallback((importedRefs: Reference[]) => {
        onImportReferences(importedRefs);
        setShowImportModal(false);
    }, [onImportReferences]);

    // Stats
    const stats = useMemo(() => {
        return {
            total: references.length,
            byType: references.reduce((acc, r) => {
                acc[r.type] = (acc[r.type] || 0) + 1;
                return acc;
            }, {} as Record<string, number>),
            selected: selectedIds.length
        };
    }, [references, selectedIds]);

    return (
        <div className="reference-manager">
            {/* Header */}
            <div className="reference-manager__header">
                <div className="reference-manager__title">
                    <BookOpen size={20} />
                    <h3>Reference Manager</h3>
                    <span className="reference-manager__count">{stats.total} references</span>
                </div>

                <div className="reference-manager__controls">
                    <select
                        value={citationStyle}
                        onChange={e => setCitationStyle(e.target.value as CitationStyle)}
                        className="reference-manager__select"
                    >
                        <option value="apa">APA 7th</option>
                        <option value="ieee">IEEE</option>
                        <option value="harvard">Harvard</option>
                        <option value="mla">MLA</option>
                        <option value="chicago">Chicago</option>
                    </select>

                    <div className="reference-manager__view-toggle">
                        <button
                            className={`reference-manager__view-btn ${view === 'list' ? 'active' : ''}`}
                            onClick={() => setView('list')}
                        >
                            <List size={16} />
                        </button>
                        <button
                            className={`reference-manager__view-btn ${view === 'grid' ? 'active' : ''}`}
                            onClick={() => setView('grid')}
                        >
                            <Grid size={16} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Toolbar */}
            <div className="reference-manager__toolbar">
                <div className="reference-manager__search">
                    <Search size={16} />
                    <input
                        type="text"
                        value={searchQuery}
                        onChange={e => setSearchQuery(e.target.value)}
                        placeholder="Search references..."
                    />
                </div>

                <div className="reference-manager__filters">
                    <select
                        value={filterType}
                        onChange={e => setFilterType(e.target.value)}
                        className="reference-manager__select"
                    >
                        <option value="all">All Types</option>
                        <option value="journal">Journal Articles</option>
                        <option value="book">Books</option>
                        <option value="conference">Conference Papers</option>
                        <option value="thesis">Theses</option>
                        <option value="website">Websites</option>
                        <option value="report">Reports</option>
                    </select>

                    <select
                        value={sortBy}
                        onChange={e => setSortBy(e.target.value as any)}
                        className="reference-manager__select"
                    >
                        <option value="author">Sort by Author</option>
                        <option value="year">Sort by Year</option>
                        <option value="title">Sort by Title</option>
                    </select>
                </div>

                <div className="reference-manager__actions">
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => setShowImportModal(true)}
                    >
                        <Upload size={14} />
                        Import
                    </Button>
                    <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => onExportReferences('bibtex')}
                    >
                        <Download size={14} />
                        Export
                    </Button>
                </div>
            </div>

            {/* Selection Actions */}
            {selectedIds.length > 0 && (
                <div className="reference-manager__selection">
                    <span>{selectedIds.length} selected</span>
                    <Button variant="ghost" size="sm" onClick={onSelectAll}>
                        Select All
                    </Button>
                    <Button variant="ghost" size="sm" onClick={onDeselectAll}>
                        Deselect All
                    </Button>
                    <Button
                        variant="danger"
                        size="sm"
                        onClick={handleDeleteSelected}
                    >
                        <Trash2 size={14} />
                        Delete Selected
                    </Button>
                </div>
            )}

            {/* Add Button */}
            <div className="reference-manager__add">
                <Button
                    variant="primary"
                    onClick={() => {
                        setShowAddForm(true);
                        setEditingId(null);
                    }}
                >
                    <Plus size={16} />
                    Add Reference
                </Button>
            </div>

            {/* References List */}
            <div className={`reference-manager__list ${view}`}>
                {filteredReferences.length === 0 ? (
                    <div className="reference-manager__empty">
                        <BookOpen size={48} />
                        <h4>No references found</h4>
                        <p>
                            {searchQuery || filterType !== 'all'
                                ? 'Try adjusting your search or filters'
                                : 'Add your first reference to get started'}
                        </p>
                        {!searchQuery && filterType === 'all' && (
                            <Button
                                variant="primary"
                                onClick={() => setShowAddForm(true)}
                            >
                                <Plus size={16} />
                                Add Reference
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredReferences.map(ref => (
                        <ReferenceCard
                            key={ref.id}
                            reference={ref}
                            isSelected={selectedIds.includes(ref.id)}
                            onSelect={() => onSelect(ref.id)}
                            onEdit={() => {
                                setEditingId(ref.id);
                                setShowAddForm(true);
                            }}
                            onDelete={() => onDeleteReference(ref.id)}
                            onCopy={() => navigator.clipboard.writeText(
                                `${ref.authors?.[0]?.lastName}, ${ref.year}. ${ref.title}.`
                            )}
                            citationStyle={citationStyle}
                        />
                    ))
                )}
            </div>

            {/* Add/Edit Modal */}
            {(showAddForm || editingId) && (
                <div className="reference-manager__modal">
                    <div className="reference-manager__modal-content">
                        <div className="reference-manager__modal-header">
                            <h3>{editingId ? 'Edit Reference' : 'Add New Reference'}</h3>
                            <button
                                className="reference-manager__modal-close"
                                onClick={() => {
                                    setShowAddForm(false);
                                    setEditingId(null);
                                }}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <ReferenceForm
                            reference={editingId ? references.find(r => r.id === editingId) : undefined}
                            onSave={handleSaveReference}
                            onCancel={() => {
                                setShowAddForm(false);
                                setEditingId(null);
                            }}
                        />
                    </div>
                </div>
            )}

            {/* Import Modal */}
            {showImportModal && (
                <div className="reference-manager__modal">
                    <div className="reference-manager__modal-content reference-manager__modal-content--large">
                        <div className="reference-manager__modal-header">
                            <h3>Import References</h3>
                            <button
                                className="reference-manager__modal-close"
                                onClick={() => setShowImportModal(false)}
                            >
                                <X size={20} />
                            </button>
                        </div>
                        <ImportPanel onImport={handleImport} />
                    </div>
                </div>
            )}
        </div>
    );
};

// ============================================================================
// IMPORT PANEL COMPONENT
// ============================================================================

interface ImportPanelProps {
    onImport: (references: Reference[]) => void;
}

const ImportPanel: React.FC<ImportPanelProps> = ({ onImport }) => {
    const [importText, setImportText] = useState('');
    const [importFormat, setImportFormat] = useState<'bibtex' | 'ris' | 'csv'>('bibtex');
    const [errors, setErrors] = useState<string[]>([]);
    const [preview, setPreview] = useState<Reference[]>([]);

    const parseBibTeX = (text: string): Reference[] => {
        const references: Reference[] = [];
        const entryRegex = /@(\w+)\s*\{([^@]+)\s*,([^@]*)\}/g;
        
        let match;
        while ((match = entryRegex.exec(text)) !== null) {
            const type = match[1].toLowerCase();
            const key = match[2];
            const fields = match[3];
            
            const ref: Partial<Reference> = {
                id: key || crypto.randomUUID(),
                type: type === 'article' ? 'journal' : type === 'book' ? 'book' : 'other',
                authors: [],
                year: new Date().getFullYear(),
                title: '',
                pages: '',
                source: 'bibtex',
                addedAt: new Date()
            };
            
            // Parse fields
            const fieldRegex = /(\w+)\s*=\s*[{"]([^}"]+)[}"]/g;
            let fieldMatch;
            while ((fieldMatch = fieldRegex.exec(fields)) !== null) {
                const fieldName = fieldMatch[1].toLowerCase();
                const fieldValue = fieldMatch[2].trim();
                
                switch (fieldName) {
                    case 'author':
                        const authorParts = fieldValue.split(' and ').map(a => {
                            const [last, first] = a.split(',');
                            return {
                                firstName: first?.trim() || '',
                                lastName: last?.trim() || a,
                                middleName: undefined,
                                initials: first?.trim()?.[0]?.toUpperCase()
                            };
                        });
                        ref.authors = authorParts;
                        break;
                    case 'title':
                        ref.title = fieldValue;
                        break;
                    case 'year':
                        ref.year = parseInt(fieldValue) || new Date().getFullYear();
                        break;
                    case 'journal':
                        ref.journal = fieldValue;
                        ref.type = 'journal';
                        break;
                    case 'publisher':
                        ref.publisher = fieldValue;
                        ref.type = 'book';
                        break;
                    case 'volume':
                        ref.volume = fieldValue;
                        break;
                    case 'number':
                    case 'issue':
                        ref.issue = fieldValue;
                        break;
                    case 'pages':
                        ref.pages = fieldValue;
                        break;
                    case 'doi':
                        ref.doi = fieldValue;
                        break;
                    case 'url':
                        ref.url = fieldValue;
                        break;
                }
            }
            
            references.push(ref as Reference);
        }
        
        return references;
    };

    const parseRIS = (text: string): Reference[] => {
        const references: Reference[] = [];
        const entries = text.split('\nER -').filter(e => e.trim());
        
        entries.forEach(entry => {
            const ref: Partial<Reference> = {
                id: crypto.randomUUID(),
                authors: [],
                year: new Date().getFullYear(),
                title: '',
                pages: '',
                source: 'ris',
                addedAt: new Date()
            };
            
            const lines = entry.split('\n');
            lines.forEach(line => {
                const [tag, ...valueParts] = line.split('  ');
                const value = valueParts.join('  ').trim();
                
                switch (tag?.trim()) {
                    case 'TY':
                        if (value === 'JOUR') ref.type = 'journal';
                        else if (value === 'BOOK') ref.type = 'book';
                        else if (value === 'CONF') ref.type = 'conference';
                        break;
                    case 'AU':
                        const [last, first] = value.split(',');
                        ref.authors?.push({
                            firstName: first?.trim() || '',
                            lastName: last?.trim() || value,
                            middleName: undefined
                        });
                        break;
                    case 'TI':
                        ref.title = value;
                        break;
                    case 'PY':
                        ref.year = parseInt(value) || new Date().getFullYear();
                        break;
                    case 'JO':
                        ref.journal = value;
                        break;
                    case 'VL':
                        ref.volume = value;
                        break;
                    case 'IS':
                        ref.issue = value;
                        break;
                    case 'SP':
                        ref.pages = value;
                        break;
                    case 'DO':
                        ref.doi = value;
                        break;
                    case 'UR':
                        ref.url = value;
                        break;
                    case 'PB':
                        ref.publisher = value;
                        break;
                }
            });
            
            references.push(ref as Reference);
        });
        
        return references;
    };

    const handlePreview = () => {
        setErrors([]);
        
        try {
            let parsed: Reference[] = [];
            
            switch (importFormat) {
                case 'bibtex':
                    parsed = parseBibTeX(importText);
                    break;
                case 'ris':
                    parsed = parseRIS(importText);
                    break;
                case 'csv':
                    // Simple CSV parsing
                    const lines = importText.split('\n');
                    const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
                    parsed = lines.slice(1).filter(l => l.trim()).map((line, idx) => {
                        const values = line.split(',');
                        const ref: Partial<Reference> = {
                            id: `csv-${idx}`,
                            type: 'other',
                            authors: [{ firstName: '', lastName: values[headers.indexOf('author')] || '', middleName: undefined }],
                            year: parseInt(values[headers.indexOf('year')]) || new Date().getFullYear(),
                            title: values[headers.indexOf('title')] || '',
                            pages: values[headers.indexOf('pages')] || '',
                            source: 'csv',
                            addedAt: new Date()
                        };
                        return ref as Reference;
                    });
                    break;
            }
            
            if (parsed.length === 0) {
                setErrors(['No references found in the input.']);
            } else {
                setPreview(parsed);
            }
        } catch (e) {
            setErrors([`Parse error: ${e.message}`]);
        }
    };

    const handleImport = () => {
        if (preview.length > 0) {
            onImport(preview);
        }
    };

    return (
        <div className="import-panel">
            <div className="import-panel__format">
                <label>Import Format:</label>
                <select
                    value={importFormat}
                    onChange={e => setImportFormat(e.target.value as any)}
                >
                    <option value="bibtex">BibTeX</option>
                    <option value="ris">RIS</option>
                    <option value="csv">CSV</option>
                </select>
            </div>

            <div className="import-panel__input">
                <textarea
                    value={importText}
                    onChange={e => setImportText(e.target.value)}
                    placeholder={`Paste your ${importFormat.toUpperCase()} data here...`}
                    rows={10}
                />
            </div>

            {errors.length > 0 && (
                <div className="import-panel__errors">
                    {errors.map((err, i) => (
                        <div key={i} className="import-panel__error">
                            <AlertCircle size={16} />
                            {err}
                        </div>
                    ))}
                </div>
            )}

            <div className="import-panel__actions">
                <Button variant="secondary" onClick={handlePreview}>
                    Preview
                </Button>
                <Button 
                    variant="primary" 
                    onClick={handleImport}
                    disabled={preview.length === 0}
                >
                    Import {preview.length} References
                </Button>
            </div>

            {preview.length > 0 && (
                <div className="import-panel__preview">
                    <h4>Preview ({preview.length} references)</h4>
                    <ul>
                        {preview.slice(0, 5).map((ref, i) => (
                            <li key={i}>
                                {ref.authors?.[0]?.lastName || 'Unknown'} ({ref.year}) - {ref.title?.substring(0, 50)}...
                            </li>
                        ))}
                        {preview.length > 5 && (
                            <li>...and {preview.length - 5} more</li>
                        )}
                    </ul>
                </div>
            )}
        </div>
    );
};

export default ReferenceManager;

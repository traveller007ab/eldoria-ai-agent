import React, { useState, useMemo } from 'react';
import { Eye, Download, FileText, ZoomIn, ZoomOut, ChevronLeft, ChevronRight, X, Maximize2, Copy, Check } from 'lucide-react';
import { Button } from '../Common/Button';

interface ThesisPreviewProps {
    project: {
        wizard_state?: {
            basics?: {
                title?: string;
                author?: string;
                supervisor?: string;
                department?: string;
                university?: string;
            };
        };
        draft_content?: Record<string, string>;
    };
    references: Array<{
        id: string;
        authors?: Array<{ lastName: string; firstName: string }>;
        year?: number;
        title?: string;
        source?: string;
    }>;
}

export const ThesisPreview: React.FC<ThesisPreviewProps> = ({ project, references }) => {
    const [zoom, setZoom] = useState(100);
    const [currentPage, setCurrentPage] = useState(1);
    const [showPageNumbers, setShowPageNumbers] = useState(true);
    const [copied, setCopied] = useState(false);
    const [activeSection, setActiveSection] = useState<string>('all');

    const chapters = useMemo(() => {
        if (!project.draft_content) return [];
        return Object.entries(project.draft_content).map(([chapter, content]) => ({
            id: chapter,
            title: chapter.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            content
        }));
    }, [project.draft_content]);

    const allContent = useMemo(() => {
        return chapters.map(ch => ch.content).join('\n\n');
    }, [chapters]);

    const totalWords = useMemo(() => {
        return allContent.split(/\s+/).filter(Boolean).length;
    }, [allContent]);

    const totalPages = useMemo(() => {
        const wordsPerPage = 300;
        return Math.ceil(totalWords / wordsPerPage) + 10;
    }, [totalWords]);

    const pageContent = useMemo(() => {
        const wordsPerPage = 300;
        const words = allContent.split(/\s+/);
        const startWord = (currentPage - 1) * wordsPerPage;
        const pageWords = words.slice(startWord, startWord + wordsPerPage);
        return pageWords.join(' ');
    }, [allContent, currentPage, zoom]);

    const formatReference = (ref: ThesisPreviewProps['references'][0]) => {
        const authors = ref.authors?.map(a => `${a.lastName}, ${a.firstName?.charAt(0) || ''}.`).join(', ') || 'Unknown';
        return `${authors} (${ref.year || 'n.d.'}). ${ref.title || 'Untitled'}. ${ref.source || ''}`;
    };

    const handleCopyAll = async () => {
        await navigator.clipboard.writeText(allContent);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="thesis-preview">
            <div className="thesis-preview__header">
                <div className="thesis-preview__title">
                    <Eye className="w-5 h-5 text-emerald-400" />
                    <h2>Thesis Preview</h2>
                </div>
                <div className="thesis-preview__meta">
                    <span className="thesis-preview__word-count">{totalWords.toLocaleString()} words</span>
                    <span className="thesis-preview__page-count">~{totalPages} pages</span>
                </div>
            </div>

            <div className="thesis-preview__toolbar">
                <div className="thesis-preview__zoom">
                    <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.max(50, z - 10))}>
                        <ZoomOut className="w-4 h-4" />
                    </Button>
                    <span className="thesis-preview__zoom-value">{zoom}%</span>
                    <Button variant="ghost" size="sm" onClick={() => setZoom(z => Math.min(150, z + 10))}>
                        <ZoomIn className="w-4 h-4" />
                    </Button>
                </div>

                <div className="thesis-preview__navigation">
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                    >
                        <ChevronLeft className="w-4 h-4" />
                    </Button>
                    <span className="thesis-preview__page-info">
                        Page {currentPage} of {totalPages}
                    </span>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                    >
                        <ChevronRight className="w-4 h-4" />
                    </Button>
                </div>

                <div className="thesis-preview__actions">
                    <Button variant="ghost" size="sm" onClick={() => setShowPageNumbers(!showPageNumbers)}>
                        <Maximize2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={handleCopyAll}>
                        {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                    </Button>
                    <Button variant="ghost" size="sm">
                        <Download className="w-4 h-4" />
                    </Button>
                </div>
            </div>

            <div className="thesis-preview__content">
                <div className="thesis-preview__sidebar">
                    <div className="thesis-preview__section-title">Sections</div>
                    <div className="thesis-preview__sections">
                        <button
                            className={`thesis-preview__section-btn ${activeSection === 'all' ? 'is-active' : ''}`}
                            onClick={() => setActiveSection('all')}
                        >
                            <FileText className="w-4 h-4" />
                            <span>Full Document</span>
                        </button>
                        {chapters.map(chapter => (
                            <button
                                key={chapter.id}
                                className={`thesis-preview__section-btn ${activeSection === chapter.id ? 'is-active' : ''}`}
                                onClick={() => setActiveSection(chapter.id)}
                            >
                                <FileText className="w-4 h-4" />
                                <span>{chapter.title}</span>
                            </button>
                        ))}
                        <button
                            className={`thesis-preview__section-btn ${activeSection === 'references' ? 'is-active' : ''}`}
                            onClick={() => setActiveSection('references')}
                        >
                            <FileText className="w-4 h-4" />
                            <span>References</span>
                        </button>
                    </div>

                    {references.length > 0 && (
                        <div className="thesis-preview__ref-preview">
                            <div className="thesis-preview__section-title">Preview References</div>
                            <div className="thesis-preview__ref-list">
                                {references.slice(0, 5).map(ref => (
                                    <div key={ref.id} className="thesis-preview__ref-item">
                                        {formatReference(ref)}
                                    </div>
                                ))}
                                {references.length > 5 && (
                                    <div className="thesis-preview__ref-more">
                                        +{references.length - 5} more
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>

                <div className="thesis-preview__document" style={{ zoom: zoom / 100 }}>
                    <div className="thesis-preview__paper">
                        {activeSection === 'all' && (
                            <>
                                <div className="thesis-preview__doc-header">
                                    <h1 className="thesis-preview__doc-title">
                                        {project.wizard_state?.basics?.title || 'Untitled Thesis'}
                                    </h1>
                                    <p className="thesis-preview__doc-author">
                                        {project.wizard_state?.basics?.author || 'Author Name'}
                                    </p>
                                    <p className="thesis-preview__doc-meta">
                                        {project.wizard_state?.basics?.department || 'Department'}
                                        {project.wizard_state?.basics?.university && ` • ${project.wizard_state.basics.university}`}
                                    </p>
                                </div>
                                {showPageNumbers && (
                                    <div className="thesis-preview__page-numbers">
                                        {[...Array(Math.min(5, totalPages))].map((_, i) => (
                                            <span key={i} className="thesis-preview__page-num">{i + 1}</span>
                                        ))}
                                    </div>
                                )}
                                <div className="thesis-preview__doc-body">
                                    {allContent || (
                                        <p className="thesis-preview__empty">No content yet. Start writing in the editor.</p>
                                    )}
                                </div>
                            </>
                        )}

                        {activeSection === 'references' && (
                            <div className="thesis-preview__references">
                                <h2 className="thesis-preview__ref-header">References</h2>
                                {references.map(ref => (
                                    <div key={ref.id} className="thesis-preview__ref-entry">
                                        {formatReference(ref)}
                                    </div>
                                ))}
                                {references.length === 0 && (
                                    <p className="thesis-preview__empty">No references added yet.</p>
                                )}
                            </div>
                        )}

                        {activeSection !== 'all' && activeSection !== 'references' && (
                            <div className="thesis-preview__chapter">
                                {chapters.filter(ch => ch.id === activeSection).map(chapter => (
                                    <React.Fragment key={chapter.id}>
                                        <h2 className="thesis-preview__chapter-title">{chapter.title}</h2>
                                        <div className="thesis-preview__chapter-content">
                                            {chapter.content || (
                                                <p className="thesis-preview__empty">This chapter is empty.</p>
                                            )}
                                        </div>
                                    </React.Fragment>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

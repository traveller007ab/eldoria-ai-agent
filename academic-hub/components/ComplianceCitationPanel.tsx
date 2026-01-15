import React, { useState } from 'react';
import { 
    Shield, 
    BookOpen, 
    AlertCircle, 
    Check, 
    Search,
    RefreshCw,
    FileText,
    ExternalLink
} from 'lucide-react';
import { checkCompliance, searchCitations, type ComplianceCheckResult, type CitationSearchResult } from '../../services/integration/ApiIntegrations';

interface ComplianceCitationPanelProps {
    projectId: string;
    chapterContent: Record<string, string>;
    references: Array<{
        id: string;
        authors: string[];
        year: number;
        title: string;
        source: string;
    }>;
}

export const ComplianceCitationPanel: React.FC<ComplianceCitationPanelProps> = ({
    projectId,
    chapterContent,
    references
}) => {
    const [activeTab, setActiveTab] = useState<'compliance' | 'citations'>('compliance');
    const [isChecking, setIsChecking] = useState(false);
    const [isSearching, setIsSearching] = useState(false);
    const [complianceResult, setComplianceResult] = useState<ComplianceCheckResult | null>(null);
    const [citationResults, setCitationResults] = useState<CitationSearchResult | null>(null);
    const [citationQuery, setCitationQuery] = useState('');
    const [checkApa, setCheckApa] = useState(true);
    const [checkStructure, setCheckStructure] = useState(true);
    const [checkReferences, setCheckReferences] = useState(true);

    const handleComplianceCheck = async () => {
        setIsChecking(true);
        try {
            const result = await checkCompliance({
                projectId,
                chapterContent,
                references,
                checkApa,
                checkStructure,
                checkReferences
            });
            setComplianceResult(result);
        } catch (err) {
            console.error('Compliance check failed:', err);
        } finally {
            setIsChecking(false);
        }
    };

    const handleCitationSearch = async () => {
        if (!citationQuery.trim()) return;
        setIsSearching(true);
        try {
            const result = await searchCitations({
                query: citationQuery,
                context: Object.values(chapterContent).join(' ').substring(0, 500),
                count: 10
            });
            setCitationResults(result);
        } catch (err) {
            console.error('Citation search failed:', err);
        } finally {
            setIsSearching(false);
        }
    };

    return (
        <div className="compliance-citation-panel">
            <div className="compliance-citation-panel__header">
                <h3>Compliance & Citations</h3>
                <div className="compliance-citation-panel__tabs">
                    <button 
                        className={`tab ${activeTab === 'compliance' ? 'active' : ''}`}
                        onClick={() => setActiveTab('compliance')}
                    >
                        <Shield size={16} />
                        Compliance
                    </button>
                    <button 
                        className={`tab ${activeTab === 'citations' ? 'active' : ''}`}
                        onClick={() => setActiveTab('citations')}
                    >
                        <BookOpen size={16} />
                        Citations
                    </button>
                </div>
            </div>

            <div className="compliance-citation-panel__content">
                {activeTab === 'compliance' && (
                    <div className="compliance-section">
                        <div className="check-options">
                            <label className="checkbox-label">
                                <input type="checkbox" checked={checkApa} onChange={(e) => setCheckApa(e.target.checked)} />
                                APA Formatting
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={checkStructure} onChange={(e) => setCheckStructure(e.target.checked)} />
                                Structure
                            </label>
                            <label className="checkbox-label">
                                <input type="checkbox" checked={checkReferences} onChange={(e) => setCheckReferences(e.target.checked)} />
                                References
                            </label>
                        </div>

                        <button 
                            className="btn-primary"
                            onClick={handleComplianceCheck}
                            disabled={isChecking}
                        >
                            <RefreshCw size={16} className={isChecking ? 'spinning' : ''} />
                            {isChecking ? 'Checking...' : 'Run Compliance Check'}
                        </button>

                        {complianceResult && (
                            <div className="compliance-results">
                                <div className="score-card">
                                    <span className="score">{complianceResult.score}%</span>
                                    <span className="label">Compliance Score</span>
                                </div>
                                <div className="summary">
                                    <span className="passed"><Check size={14}/> {complianceResult.summary.passed} passed</span>
                                    <span className="warnings"><AlertCircle size={14}/> {complianceResult.summary.warnings} warnings</span>
                                    <span className="suggestions"><FileText size={14}/> {complianceResult.summary.suggestions} suggestions</span>
                                </div>
                                <div className="issues-list">
                                    {complianceResult.issues.map((issue, idx) => (
                                        <div key={idx} className={`issue-item ${issue.type}`}>
                                            <span className="issue-type">{issue.type}</span>
                                            <span className="issue-category">{issue.category}</span>
                                            <p className="issue-message">{issue.message}</p>
                                            {issue.suggestion && (
                                                <p className="issue-suggestion"><strong>Suggestion:</strong> {issue.suggestion}</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'citations' && (
                    <div className="citations-section">
                        <div className="search-box">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search for citations..."
                                value={citationQuery}
                                onChange={(e) => setCitationQuery(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleCitationSearch()}
                            />
                            <button onClick={handleCitationSearch} disabled={isSearching}>
                                {isSearching ? 'Searching...' : 'Search'}
                            </button>
                        </div>

                        {citationResults && (
                            <div className="citation-results">
                                {citationResults.citations.map((cit, idx) => (
                                    <div key={idx} className="citation-item">
                                        <h4>{cit.title}</h4>
                                        <p className="citation-authors">{cit.authors.join(', ')} ({cit.year})</p>
                                        <p className="citation-source">{cit.source}</p>
                                        {cit.doi && (
                                            <a href={`https://doi.org/${cit.doi}`} target="_blank" rel="noopener noreferrer">
                                                <ExternalLink size={12} /> DOI
                                            </a>
                                        )}
                                        <span className="relevance-score">Relevance: {(cit.relevanceScore * 100).toFixed(0)}%</span>
                                    </div>
                                ))}
                                {citationResults.suggestions.length > 0 && (
                                    <div className="suggestions-box">
                                        <h5>Search Suggestions</h5>
                                        {citationResults.suggestions.map((s, i) => (
                                            <button key={i} className="suggestion-chip" onClick={() => setCitationQuery(s)}>
                                                {s}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

export default ComplianceCitationPanel;

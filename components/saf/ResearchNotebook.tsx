import React, { useState, useMemo } from 'react';
import { DeepSAFBlueprint } from './types';
import { BookOpen, Save, FileText, Plus, X, Calendar, User, Tag } from 'lucide-react';

interface ResearchNotebookProps {
    blueprint: DeepSAFBlueprint;
    isExpanded: boolean;
    onToggleExpand: () => void;
    onClose: () => void;
    onSave: (notes: ResearchNotes) => void;
}

export interface ResearchNotes {
    methodology: string;
    assumptions: string;
    citations: string[];
    observations: string;
    nextSteps: string;
    tags: string[];
    timestamp: string;
    author?: string;
}

/**
 * Research Notebook - Document methodology, assumptions, citations
 * Professional research documentation tool
 */
export const ResearchNotebook: React.FC<ResearchNotebookProps> = ({
    blueprint,
    isExpanded,
    onToggleExpand,
    onClose,
    onSave,
}) => {
    const [methodology, setMethodology] = useState('');
    const [assumptions, setAssumptions] = useState('');
    const [citations, setCitations] = useState<string[]>(['']);
    const [observations, setObservations] = useState('');
    const [nextSteps, setNextSteps] = useState('');
    const [tags, setTags] = useState<string[]>(['']);
    const [activeSection, setActiveSection] = useState<string>('methodology');

    const handleAddCitation = () => {
        setCitations([...citations, '']);
    };

    const handleRemoveCitation = (idx: number) => {
        setCitations(citations.filter((_, i) => i !== idx));
    };

    const handleCitationChange = (idx: number, value: string) => {
        const newCitations = [...citations];
        newCitations[idx] = value;
        setCitations(newCitations);
    };

    const handleAddTag = () => {
        setTags([...tags, '']);
    };

    const handleRemoveTag = (idx: number) => {
        setTags(tags.filter((_, i) => i !== idx));
    };

    const handleTagChange = (idx: number, value: string) => {
        const newTags = [...tags];
        newTags[idx] = value;
        setTags(newTags);
    };

    const handleSaveNotes = () => {
        const notes: ResearchNotes = {
            methodology,
            assumptions,
            citations: citations.filter(c => c.trim() !== ''),
            observations,
            nextSteps,
            tags: tags.filter(t => t.trim() !== ''),
            timestamp: new Date().toISOString(),
        };
        onSave(notes);
    };

    const sections = [
        { id: 'methodology', label: 'Methodology', icon: FileText },
        { id: 'assumptions', label: 'Assumptions', icon: Tag },
        { id: 'citations', label: 'Citations', icon: BookOpen },
        { id: 'observations', label: 'Observations', icon: Calendar },
        { id: 'nextSteps', label: 'Next Steps', icon: Plus },
    ];

    if (!isExpanded) {
        return (
            <div className="fixed bottom-0 left-0 w-96 bg-gray-900 border-t border-r border-cyan-500/30 rounded-tr-2xl shadow-2xl z-50">
                <div className="p-3 flex items-center justify-between border-b border-cyan-500/20">
                    <div className="flex items-center gap-2">
                        <BookOpen className="w-4 h-4 text-cyan-400" />
                        <span className="text-xs font-bold text-white uppercase tracking-wider">Research Notebook</span>
                    </div>
                    <button
                        onClick={onToggleExpand}
                        className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors"
                    >
                        Expand
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="fixed bottom-0 left-0 w-[600px] h-[600px] bg-gray-900 border-t border-r border-cyan-500/30 rounded-tr-2xl shadow-2xl z-50 flex flex-col">
            {/* Header */}
            <div className="shrink-0 p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gray-900/50">
                <div className="flex items-center gap-3">
                    <BookOpen className="w-5 h-5 text-cyan-400" />
                    <div>
                        <h3 className="text-sm font-bold text-white">Research Notebook</h3>
                        <p className="text-[10px] text-gray-500">{blueprint.project_name}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleSaveNotes}
                        className="px-3 py-1.5 text-xs bg-emerald-500/10 text-emerald-400 rounded hover:bg-emerald-500/20 transition-colors flex items-center gap-1"
                    >
                        <Save className="w-3 h-3" />
                        Save
                    </button>
                    <button
                        onClick={onToggleExpand}
                        className="px-3 py-1.5 text-xs bg-gray-800 text-gray-400 rounded hover:bg-gray-700 transition-colors"
                    >
                        Collapse
                    </button>
                    <button
                        onClick={onClose}
                        className="px-3 py-1.5 text-xs bg-red-500/10 text-red-400 rounded hover:bg-red-500/20 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {/* Section Tabs */}
            <div className="shrink-0 flex items-center gap-1 p-2 border-b border-cyan-500/10 bg-gray-900/30 overflow-x-auto">
                {sections.map(section => {
                    const Icon = section.icon;
                    return (
                        <button
                            key={section.id}
                            onClick={() => setActiveSection(section.id)}
                            className={`px-3 py-2 text-xs rounded transition-colors flex items-center gap-1 whitespace-nowrap ${
                                activeSection === section.id
                                    ? 'bg-cyan-500/20 text-cyan-400'
                                    : 'text-gray-400 hover:text-white hover:bg-gray-800/50'
                            }`}
                        >
                            <Icon className="w-3 h-3" />
                            {section.label}
                        </button>
                    );
                })}
            </div>

            {/* Content */}
            <div className="flex-grow overflow-y-auto p-4">
                {activeSection === 'methodology' && (
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            Methodology & Approach
                        </label>
                        <textarea
                            value={methodology}
                            onChange={(e) => setMethodology(e.target.value)}
                            placeholder="Describe your research methodology, simulation approach, and analytical framework..."
                            className="w-full h-64 bg-black/50 border border-cyan-900/30 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                        />
                    </div>
                )}

                {activeSection === 'assumptions' && (
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            Key Assumptions
                        </label>
                        <textarea
                            value={assumptions}
                            onChange={(e) => setAssumptions(e.target.value)}
                            placeholder="List key assumptions, simplifications, and boundary conditions..."
                            className="w-full h-64 bg-black/50 border border-cyan-900/30 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                        />
                    </div>
                )}

                {activeSection === 'citations' && (
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                References & Citations
                            </label>
                            <button
                                onClick={handleAddCitation}
                                className="px-2 py-1 text-xs bg-cyan-500/10 text-cyan-400 rounded hover:bg-cyan-500/20 transition-colors flex items-center gap-1"
                            >
                                <Plus className="w-3 h-3" />
                                Add
                            </button>
                        </div>
                        <div className="space-y-2">
                            {citations.map((citation, idx) => (
                                <div key={idx} className="flex items-center gap-2">
                                    <input
                                        type="text"
                                        value={citation}
                                        onChange={(e) => handleCitationChange(idx, e.target.value)}
                                        placeholder="Author et al. (Year). Title. Journal..."
                                        className="flex-1 px-3 py-2 bg-black/50 border border-cyan-900/30 rounded text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500"
                                    />
                                    {citations.length > 1 && (
                                        <button
                                            onClick={() => handleRemoveCitation(idx)}
                                            className="p-1.5 text-red-400 hover:bg-red-500/10 rounded transition-colors"
                                        >
                                            <X className="w-3 h-3" />
                                        </button>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {activeSection === 'observations' && (
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            Observations & Findings
                        </label>
                        <textarea
                            value={observations}
                            onChange={(e) => setObservations(e.target.value)}
                            placeholder="Document key observations, unexpected results, and preliminary findings..."
                            className="w-full h-64 bg-black/50 border border-cyan-900/30 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                        />
                    </div>
                )}

                {activeSection === 'nextSteps' && (
                    <div className="space-y-3">
                        <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                            Next Steps & Future Work
                        </label>
                        <textarea
                            value={nextSteps}
                            onChange={(e) => setNextSteps(e.target.value)}
                            placeholder="Outline planned next steps, additional experiments, and future research directions..."
                            className="w-full h-64 bg-black/50 border border-cyan-900/30 rounded-lg p-3 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500 resize-none font-mono"
                        />
                        <div className="mt-4">
                            <div className="flex items-center justify-between mb-2">
                                <label className="block text-xs font-bold text-cyan-400 uppercase tracking-wider">
                                    Tags
                                </label>
                                <button
                                    onClick={handleAddTag}
                                    className="px-2 py-1 text-xs bg-purple-500/10 text-purple-400 rounded hover:bg-purple-500/20 transition-colors flex items-center gap-1"
                                >
                                    <Plus className="w-3 h-3" />
                                    Add
                                </button>
                            </div>
                            <div className="flex flex-wrap gap-2">
                                {tags.map((tag, idx) => (
                                    <div key={idx} className="flex items-center gap-1 bg-purple-500/10 border border-purple-500/30 rounded px-2 py-1">
                                        <input
                                            type="text"
                                            value={tag}
                                            onChange={(e) => handleTagChange(idx, e.target.value)}
                                            placeholder="tag"
                                            className="bg-transparent text-xs text-purple-300 placeholder-purple-500/50 focus:outline-none w-20"
                                        />
                                        {tags.length > 1 && (
                                            <button
                                                onClick={() => handleRemoveTag(idx)}
                                                className="text-red-400 hover:text-red-300"
                                            >
                                                <X className="w-3 h-3" />
                                            </button>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ResearchNotebook;



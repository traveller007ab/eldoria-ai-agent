import React, { useState, useMemo } from 'react';
import { Search, ChevronRight, Star, Cpu, BarChart3, GraduationCap, Shield, Play, Eye, X, BookOpen, Zap } from 'lucide-react';
import { promptSchemas, searchSchemas, getCategories, composePrompt, PromptSchema, getSchemaById } from '../../prompt_schemas';
import { useWorkspace } from '../../context/WorkspaceContext';
import { PromptMemoryService } from '../../services/PromptMemoryService';

interface PromptLibraryPanelProps {
    isOpen: boolean;
    onClose: () => void;
    onExecute: (composedPrompt: string, schema: PromptSchema) => void;
}

const iconMap: Record<string, React.FC<{ className?: string }>> = {
    Cpu: Cpu,
    BarChart3: BarChart3,
    GraduationCap: GraduationCap,
    Shield: Shield,
    BookOpen: BookOpen
};

const categoryColors: Record<string, string> = {
    engineering: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    business: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    academic: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    development: 'bg-orange-500/20 text-orange-400 border-orange-500/30'
};

export const PromptLibraryPanel: React.FC<PromptLibraryPanelProps> = ({ isOpen, onClose, onExecute }) => {
    const { academicProjects, activeCanvas, state, dispatch } = useWorkspace();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedSchema, setSelectedSchema] = useState<PromptSchema | null>(null);
    const [variables, setVariables] = useState<Record<string, string>>({});
    const [showPreview, setShowPreview] = useState(false);
    const [favorites, setFavorites] = useState<string[]>(() => {
        try {
            return JSON.parse(localStorage.getItem('eldoria-favorite-prompts') || '[]');
        } catch { return []; }
    });

    const categories = useMemo(() => getCategories(), []);
    const [recentSchemaIds, setRecentSchemaIds] = useState<string[]>(() => PromptMemoryService.getRecentSchemas());

    const filteredSchemas = useMemo(() => searchSchemas(searchQuery), [searchQuery]);

    // Externally triggered pre-fill
    React.useEffect(() => {
        if (isOpen && state.promptLibraryConfig.schemaId) {
            const schema = getSchemaById(state.promptLibraryConfig.schemaId);
            if (schema) {
                setSelectedSchema(schema);
                // Merge context auto-fill with explicitly suggested variables
                const contextFill = autoFillFromContext(schema);
                setVariables({ ...contextFill, ...state.promptLibraryConfig.variables });
                setShowPreview(true);
            }
        }
    }, [isOpen, state.promptLibraryConfig, academicProjects, activeCanvas]);

    const handleClearHistory = () => {
        if (confirm('Clear all prompt history and recent values?')) {
            PromptMemoryService.clearMemory();
            setFavorites([]);
            setRecentSchemaIds([]);
            alert('Prompt history cleared.');
        }
    };

    // Auto-prefill from context
    const autoFillFromContext = (schema: PromptSchema) => {
        const prefilled: Record<string, string> = {};
        const activeProject = academicProjects[academicProjects.length - 1];

        // Try to prefill common variables
        if (schema.variables.some(v => v.name === 'thesis_topic') && activeProject) {
            prefilled.thesis_topic = activeProject.wizard_state?.basics?.title || '';
        }
        if (schema.variables.some(v => v.name === 'system_name') && activeCanvas) {
            // Try to extract from canvas content
            const textContent = activeCanvas.content?.find(p => p.type === 'text');
            if (textContent && 'content' in textContent) {
                const firstLine = (textContent.content as string).split('\n')[0].slice(0, 50);
                prefilled.system_name = firstLine || '';
            }
        }

        return prefilled;
    };

    const handleSelectSchema = (schema: PromptSchema) => {
        setSelectedSchema(schema);
        setVariables(autoFillFromContext(schema));
        setShowPreview(false);
    };

    const handleVariableChange = (name: string, value: string) => {
        setVariables(prev => ({ ...prev, [name]: value }));
    };

    const toggleFavorite = (id: string) => {
        const newFavorites = favorites.includes(id)
            ? favorites.filter(f => f !== id)
            : [...favorites, id];
        setFavorites(newFavorites);
        localStorage.setItem('eldoria-favorite-prompts', JSON.stringify(newFavorites));
    };

    const composedPrompt = selectedSchema ? composePrompt(selectedSchema, variables) : '';

    const handleExecute = () => {
        if (selectedSchema && composedPrompt) {
            // Save to memory
            PromptMemoryService.saveValues(selectedSchema.id, variables);
            setRecentSchemaIds(PromptMemoryService.getRecentSchemas());

            onExecute(composedPrompt, selectedSchema);
            // Reset config on execute
            dispatch({ type: 'SET_PROMPT_LIBRARY_CONFIG', payload: { schemaId: null, variables: {} } });
            onClose();
        }
    };

    const handleClose = () => {
        // Reset config on close
        dispatch({ type: 'SET_PROMPT_LIBRARY_CONFIG', payload: { schemaId: null, variables: {} } });
        onClose();
    };

    if (!isOpen) return null;

    const Icon = selectedSchema ? (iconMap[selectedSchema.icon] || BookOpen) : BookOpen;

    return (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-[#0a1628] border border-cyan-500/20 rounded-3xl w-full max-w-5xl max-h-[85vh] overflow-hidden flex shadow-[0_0_60px_rgba(34,211,238,0.1)]">

                {/* Left: Schema Browser */}
                <div className="w-1/3 border-r border-cyan-500/10 flex flex-col">
                    <div className="p-4 border-b border-cyan-500/10">
                        <div className="flex items-center justify-between mb-3">
                            <h2 className="text-sm font-bold text-cyan-300 uppercase tracking-widest flex items-center gap-2">
                                <BookOpen className="w-4 h-4" />
                                Prompt Library
                            </h2>
                            <button onClick={onClose} className="p-1.5 hover:bg-white/5 rounded-lg text-cyan-500/50 hover:text-cyan-300 transition-colors">
                                <X className="w-4 h-4" />
                            </button>
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-cyan-500/30" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="Search prompts..."
                                className="w-full bg-black/20 border border-cyan-500/10 rounded-lg py-2 pl-9 pr-4 text-xs text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-500/30"
                            />
                        </div>
                    </div>

                    <div className="flex-grow overflow-y-auto custom-scrollbar p-3 space-y-4">
                        {/* Recently Used */}
                        {recentSchemaIds.length > 0 && (
                            <div className="mb-4">
                                <div className="text-[9px] font-bold text-cyan-400 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
                                    <Zap className="w-3 h-3" /> Recently Used
                                </div>
                                {recentSchemaIds.map(id => {
                                    const schema = getSchemaById(id);
                                    if (!schema) return null;
                                    return (
                                        <SchemaCard
                                            key={`recent-${id}`}
                                            schema={schema}
                                            isSelected={selectedSchema?.id === id}
                                            isFavorite={favorites.includes(id)}
                                            searchQuery={searchQuery}
                                            onSelect={() => handleSelectSchema(schema)}
                                            onToggleFavorite={() => toggleFavorite(id)}
                                            onTagClick={(tag) => setSearchQuery(tag)}
                                        />
                                    );
                                })}
                            </div>
                        )}

                        {/* Favorites */}
                        {favorites.length > 0 && (
                            <div>
                                <div className="text-[9px] font-bold text-yellow-500/60 uppercase tracking-widest px-2 mb-2 flex items-center gap-1">
                                    <Star className="w-3 h-3" /> Favorites
                                </div>
                                {promptSchemas.filter(s => favorites.includes(s.id)).map(schema => (
                                    <SchemaCard
                                        key={schema.id}
                                        schema={schema}
                                        isSelected={selectedSchema?.id === schema.id}
                                        isFavorite={true}
                                        searchQuery={searchQuery}
                                        onSelect={() => handleSelectSchema(schema)}
                                        onToggleFavorite={() => toggleFavorite(schema.id)}
                                        onTagClick={(tag) => setSearchQuery(tag)}
                                    />
                                ))}
                            </div>
                        )}

                        {/* By Category */}
                        {categories.map(category => (
                            <div key={category}>
                                <div className="text-[9px] font-bold text-cyan-500/40 uppercase tracking-widest px-2 mb-2">
                                    {category}
                                </div>
                                {filteredSchemas.filter(s => s.category === category).map(schema => (
                                    <SchemaCard
                                        key={schema.id}
                                        schema={schema}
                                        isSelected={selectedSchema?.id === schema.id}
                                        isFavorite={favorites.includes(schema.id)}
                                        searchQuery={searchQuery}
                                        onSelect={() => handleSelectSchema(schema)}
                                        onToggleFavorite={() => toggleFavorite(schema.id)}
                                        onTagClick={(tag) => setSearchQuery(tag)}
                                    />
                                ))}
                            </div>
                        ))}
                    </div>
                    <div className="p-3 border-t border-cyan-500/10">
                        <button
                            onClick={handleClearHistory}
                            className="w-full py-2 text-[8px] font-bold text-cyan-500/40 hover:text-red-400 uppercase tracking-widest transition-all text-center"
                        >
                            Clear Prompt History
                        </button>
                    </div>
                </div>


                {/* Right: Composer */}
                <div className="flex-grow flex flex-col">
                    {selectedSchema ? (
                        <>
                            <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5">
                                <div className="flex items-center gap-3">
                                    <div className={`p-2.5 rounded-xl ${categoryColors[selectedSchema.category] || 'bg-cyan-500/20'}`}>
                                        <Icon className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <h3 className="text-sm font-bold text-cyan-100">{selectedSchema.name}</h3>
                                        <p className="text-[10px] text-cyan-500/50 mt-0.5">{selectedSchema.description}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex-grow overflow-y-auto custom-scrollbar p-4">
                                {showPreview ? (
                                    <div className="space-y-3">
                                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Composed Prompt Preview</div>
                                        <pre className="bg-black/30 border border-cyan-500/10 rounded-xl p-4 text-xs text-cyan-200 whitespace-pre-wrap font-mono">
                                            {composedPrompt}
                                        </pre>
                                        <p className="text-[9px] text-cyan-500/40 italic">
                                            ⚠️ Review and edit the AI's output in your own words.
                                        </p>
                                    </div>
                                ) : (
                                    <div className="space-y-4">
                                        <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest">Fill Variables</div>
                                        {selectedSchema.variables.map(variable => (
                                            <div key={variable.name}>
                                                <label className="block text-[10px] font-bold text-cyan-300 mb-1">
                                                    {variable.label}
                                                    {variable.required && <span className="text-red-400 ml-1">*</span>}
                                                </label>
                                                {variable.type === 'string' && variable.name.includes('description') ? (
                                                    <textarea
                                                        value={variables[variable.name] || ''}
                                                        onChange={e => handleVariableChange(variable.name, e.target.value)}
                                                        placeholder={variable.placeholder}
                                                        rows={3}
                                                        className="w-full bg-black/20 border border-cyan-500/10 rounded-lg py-2 px-3 text-xs text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-500/30 resize-none"
                                                    />
                                                ) : (
                                                    <input
                                                        type={variable.type === 'number' ? 'number' : 'text'}
                                                        value={variables[variable.name] || ''}
                                                        onChange={e => handleVariableChange(variable.name, e.target.value)}
                                                        placeholder={variable.placeholder}
                                                        className="w-full bg-black/20 border border-cyan-500/10 rounded-lg py-2 px-3 text-xs text-cyan-100 placeholder:text-cyan-500/30 focus:outline-none focus:border-cyan-500/30"
                                                    />
                                                )}

                                                {/* Recent Chips */}
                                                {PromptMemoryService.getRecentValues(selectedSchema.id, variable.name).length > 0 && (
                                                    <div className="flex flex-wrap gap-1 mt-1.5 overflow-hidden max-h-12 overflow-y-auto custom-scrollbar">
                                                        {PromptMemoryService.getRecentValues(selectedSchema.id, variable.name).map((val, idx) => (
                                                            <button
                                                                key={idx}
                                                                onClick={() => handleVariableChange(variable.name, val)}
                                                                title={`Paste: ${val}`}
                                                                className="px-2 py-0.5 bg-cyan-500/5 hover:bg-cyan-500/10 border border-cyan-500/10 rounded-md text-[8px] text-cyan-500/60 hover:text-cyan-400 transition-all truncate max-w-[120px]"
                                                            >
                                                                {val}
                                                            </button>
                                                        ))}
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>

                                )}
                            </div>

                            <div className="p-4 border-t border-cyan-500/10 flex items-center gap-3">
                                <button
                                    onClick={() => setShowPreview(!showPreview)}
                                    className="flex-1 py-2.5 px-4 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2"
                                >
                                    <Eye className="w-4 h-4" />
                                    {showPreview ? 'Edit Variables' : 'Preview'}
                                </button>
                                <button
                                    onClick={handleExecute}
                                    disabled={!composedPrompt}
                                    className="flex-1 py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 disabled:bg-cyan-500/20 disabled:text-cyan-500/50 text-slate-900 rounded-xl text-xs font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(34,211,238,0.3)]"
                                >
                                    <Play className="w-4 h-4" />
                                    Execute
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex-grow flex items-center justify-center text-cyan-500/30 text-sm">
                            Select a prompt schema to begin
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

const HighlightText: React.FC<{ text: string; query: string }> = ({ text, query }) => {
    if (!query.trim()) return <>{text}</>;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return (
        <>
            {parts.map((part, i) =>
                part.toLowerCase() === query.toLowerCase()
                    ? <span key={i} className="text-cyan-400 bg-cyan-400/20 px-0.5 rounded-sm font-medium">{part}</span>
                    : part
            )}
        </>
    );
};

// Schema Card Component
const SchemaCard: React.FC<{
    schema: PromptSchema;
    isSelected: boolean;
    isFavorite: boolean;
    searchQuery: string;
    onSelect: () => void;
    onToggleFavorite: () => void;
    onTagClick: (tag: string) => void;
}> = ({ schema, isSelected, isFavorite, searchQuery, onSelect, onToggleFavorite, onTagClick }) => {
    const Icon = iconMap[schema.icon] || BookOpen;

    return (
        <button
            onClick={onSelect}
            className={`w-full p-3 rounded-xl text-left transition-all group mb-2 border ${isSelected
                ? 'bg-cyan-500/20 border-cyan-500/40 shadow-[0_0_15px_rgba(34,211,238,0.1)]'
                : 'bg-black/20 border-transparent hover:bg-cyan-500/10 hover:border-cyan-500/20'
                }`}
        >
            <div className="flex items-center gap-3">
                <div className={`p-1.5 rounded-lg shrink-0 transition-transform group-hover:scale-110 ${categoryColors[schema.category] || 'bg-cyan-500/20'}`}>
                    <Icon className="w-3.5 h-3.5" />
                </div>
                <div className="flex-grow min-w-0">
                    <div className="text-[11px] font-bold text-cyan-100 truncate">
                        <HighlightText text={schema.name} query={searchQuery} />
                    </div>
                    <div className="text-[9px] text-cyan-500/40 truncate mt-0.5">
                        <HighlightText text={schema.description} query={searchQuery} />
                    </div>
                    <div className="text-[8px] text-cyan-500/20 truncate flex flex-wrap gap-1 mt-1.5 transition-opacity">
                        {schema.tags.map(tag => (
                            <span
                                key={tag}
                                onClick={(e) => { e.stopPropagation(); onTagClick(tag); }}
                                className={`px-1.5 py-0.5 rounded-md border border-cyan-500/10 hover:border-cyan-500/30 hover:bg-cyan-500/10 transition-colors cursor-pointer ${tag.toLowerCase().includes(searchQuery.toLowerCase()) && searchQuery ? 'text-cyan-400 border-cyan-500/30 bg-cyan-500/5 font-bold' : ''}`}
                            >
                                #{tag}
                            </span>
                        ))}
                    </div>
                </div>
                <button
                    onClick={e => { e.stopPropagation(); onToggleFavorite(); }}
                    className={`p-1 rounded transition-colors ${isFavorite ? 'text-yellow-400' : 'text-cyan-500/10 hover:text-yellow-400/50'}`}
                >
                    <Star className="w-3.5 h-3.5" fill={isFavorite ? 'currentColor' : 'none'} />
                </button>
                <ChevronRight className={`w-3.5 h-3.5 text-cyan-500/10 transition-transform ${isSelected ? 'text-cyan-400 translate-x-1' : ''}`} />
            </div>
        </button>
    );
};

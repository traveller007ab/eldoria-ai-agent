import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    FolderOpen, Plus, MoreVertical, Trash2, Edit3,
    Download, Upload, Check, X, Layers, ChevronDown
} from 'lucide-react';
import { useNexusStore, Project } from '../../../stores/useNexusStore';

export const WorkspaceManager: React.FC = () => {
    const {
        projects, activeProjectId, createProject,
        switchProject, renameProject, deleteProject, importProject
    } = useNexusStore();

    const [isOpen, setIsOpen] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [newProjectName, setNewProjectName] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const menuRef = useRef<HTMLDivElement>(null);
    const activeProject = projects[activeProjectId];

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };
        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
        }
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [isOpen]);

    const handleCreate = () => {
        if (newProjectName.trim()) {
            createProject(newProjectName.trim());
            setNewProjectName('');
            setIsCreating(false);
        }
    };

    const handleRename = (id: string) => {
        if (editName.trim()) {
            renameProject(id, editName.trim());
            setEditingId(null);
        }
    };

    const handleExport = (project: Project) => {
        const dataStr = JSON.stringify(project, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        const exportFileDefaultName = `${project.name.toLowerCase().replace(/\s+/g, '-')}.nexus`;

        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const project = JSON.parse(e.target?.result as string);
                if (project.nodes && project.edges) {
                    importProject(project);
                }
            } catch (err) {
                console.error('Failed to import project:', err);
            }
        };
        reader.readAsText(file);
    };

    return (
        <div className="relative pointer-events-auto" ref={menuRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-3 px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-xl hover:bg-slate-800 transition-all group"
            >
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <Layers className="w-4 h-4 text-white" />
                </div>
                <div className="text-left hidden sm:block">
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Workspace</p>
                    <h3 className="text-xs font-bold text-white max-w-[120px] truncate">
                        {activeProject?.name || 'Loading...'}
                    </h3>
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-500 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 10, scale: 0.95 }}
                        className="absolute top-14 left-0 w-80 bg-slate-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden z-[100]"
                    >
                        {/* Header */}
                        <div className="p-4 border-b border-white/5 flex items-center justify-between bg-white/5">
                            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Projects</span>
                            <div className="flex gap-2">
                                <label className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-cyan-400 transition-colors cursor-pointer">
                                    <Upload className="w-4 h-4" />
                                    <input type="file" accept=".nexus" className="hidden" onChange={handleImport} />
                                </label>
                                <button
                                    onClick={() => setIsCreating(true)}
                                    className="p-1.5 hover:bg-white/5 rounded-lg text-slate-400 hover:text-emerald-400 transition-colors"
                                >
                                    <Plus className="w-4 h-4" />
                                </button>
                            </div>
                        </div>

                        {/* Search/New Input */}
                        {isCreating && (
                            <div className="p-4 bg-emerald-500/5 border-b border-emerald-500/20 animate-in fade-in slide-in-from-top-2">
                                <div className="flex gap-2">
                                    <input
                                        autoFocus
                                        type="text"
                                        placeholder="Project Name..."
                                        value={newProjectName}
                                        onChange={(e) => setNewProjectName(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                                        className="flex-1 bg-slate-950 border border-emerald-500/30 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                                    />
                                    <button onClick={handleCreate} className="p-2 bg-emerald-500 text-slate-950 rounded-lg">
                                        <Check className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => setIsCreating(false)} className="p-2 bg-slate-800 text-slate-400 rounded-lg">
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* Project List */}
                        <div className="max-h-64 overflow-y-auto p-2 space-y-1">
                            {Object.values(projects).map((project) => (
                                <div
                                    key={project.id}
                                    className={`
                                        group relative flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer
                                        ${activeProjectId === project.id
                                            ? 'bg-white/10 border border-white/10'
                                            : 'hover:bg-white/5 border border-transparent'}
                                    `}
                                    onClick={() => switchProject(project.id)}
                                >
                                    <div className={`w-2 h-2 rounded-full ${activeProjectId === project.id ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />

                                    <div className="flex-1">
                                        {editingId === project.id ? (
                                            <input
                                                autoFocus
                                                type="text"
                                                value={editName}
                                                onChange={(e) => setEditName(e.target.value)}
                                                onKeyDown={(e) => e.key === 'Enter' && handleRename(project.id)}
                                                onBlur={() => setEditingId(null)}
                                                className="w-full bg-slate-950 border border-white/10 rounded px-2 py-1 text-xs text-white"
                                                onClick={(e) => e.stopPropagation()}
                                            />
                                        ) : (
                                            <p className="text-sm font-medium text-slate-200 group-hover:text-white transition-colors">
                                                {project.name}
                                            </p>
                                        )}
                                        <p className="text-[9px] text-slate-500 font-mono mt-0.5">
                                            {project.nodes.length} Nodes • {new Date(project.lastModified).toLocaleDateString()}
                                        </p>
                                    </div>

                                    {/* Actions */}
                                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity" onClick={(e) => e.stopPropagation()}>
                                        <button
                                            onClick={() => {
                                                setEditName(project.name);
                                                setEditingId(project.id);
                                            }}
                                            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-white transition-colors"
                                        >
                                            <Edit3 className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => handleExport(project)}
                                            className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-cyan-400 transition-colors"
                                            title="Export"
                                        >
                                            <Download className="w-3.5 h-3.5" />
                                        </button>
                                        {Object.keys(projects).length > 1 && (
                                            <button
                                                onClick={() => deleteProject(project.id)}
                                                className="p-1.5 hover:bg-white/5 rounded-lg text-slate-500 hover:text-red-400 transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Footer Info */}
                        <div className="p-3 bg-white/5 border-t border-white/5 text-center">
                            <p className="text-[9px] text-slate-500 uppercase tracking-tighter">
                                All changes are persisted to Eldoria Neural Engine
                            </p>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

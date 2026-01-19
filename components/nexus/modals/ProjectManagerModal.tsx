import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
    Folder, Plus, Trash2, Edit2, Search,
    Clock, HardDrive, Check, X, LayoutGrid
} from 'lucide-react';
import { useNexusStore, Project } from '@/stores/useNexusStore';
import { formatDistanceToNow } from 'date-fns';

interface ProjectManagerModalProps {
    onClose: () => void;
}

export const ProjectManagerModal: React.FC<ProjectManagerModalProps> = ({ onClose }) => {
    const {
        projects,
        activeProjectId,
        createProject,
        switchProject,
        deleteProject,
        renameProject
    } = useNexusStore();

    const [searchQuery, setSearchQuery] = useState('');
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editName, setEditName] = useState('');

    const projectList = Object.values(projects).sort((a, b) => b.lastModified - a.lastModified);
    const filteredProjects = projectList.filter(p =>
        p.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleCreate = () => {
        createProject('New Research Nexus');
    };

    const handleRenameStart = (project: Project) => {
        setEditingId(project.id);
        setEditName(project.name);
    };

    const handleRenameSave = () => {
        if (editingId && editName.trim()) {
            renameProject(editingId, editName.trim());
            setEditingId(null);
        }
    };

    const handleDelete = (e: React.MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('Are you sure you want to delete this research space? This cannot be undone.')) {
            deleteProject(id);
        }
    };

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                onClick={onClose}
                className="absolute inset-0 bg-slate-950/80 backdrop-blur-sm"
            />

            <motion.div
                initial={{ scale: 0.95, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.95, opacity: 0, y: 20 }}
                className="relative w-full max-w-4xl bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
            >
                {/* Header */}
                <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 flex items-center justify-center border border-white/10 shadow-inner">
                            <Folder className="w-6 h-6 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-2xl font-bold text-white tracking-tight">Project Archives</h2>
                            <p className="text-slate-400 text-sm font-medium">Manage your research workspaces</p>
                        </div>
                    </div>

                    <button
                        onClick={onClose}
                        className="p-2 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                {/* Controls */}
                <div className="p-6 border-b border-white/5 flex items-center gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search archives..."
                            className="w-full bg-slate-950/50 border border-white/10 rounded-xl pl-12 pr-4 py-3 text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-cyan-500/50 transition-all"
                        />
                    </div>
                    <button
                        onClick={handleCreate}
                        className="px-6 py-3 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold rounded-xl flex items-center gap-2 transition-all shadow-lg shadow-cyan-500/20 active:scale-95"
                    >
                        <Plus className="w-5 h-5" />
                        <span>New Nexus</span>
                    </button>
                </div>

                {/* Grid */}
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <AnimatePresence>
                        {filteredProjects.map((project) => (
                            <motion.div
                                key={project.id}
                                layout
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.9 }}
                                onClick={() => {
                                    if (editingId !== project.id) {
                                        switchProject(project.id);
                                        onClose();
                                    }
                                }}
                                className={`group relative p-5 rounded-2xl border transition-all cursor-pointer ${activeProjectId === project.id
                                    ? 'bg-cyan-500/10 border-cyan-500/50 shadow-[0_0_30px_rgba(34,211,238,0.1)]'
                                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/20'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="flex-1 mr-4">
                                        {editingId === project.id ? (
                                            <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                                                <input
                                                    type="text"
                                                    value={editName}
                                                    onChange={(e) => setEditName(e.target.value)}
                                                    onKeyDown={(e) => e.key === 'Enter' && handleRenameSave()}
                                                    autoFocus
                                                    className="w-full bg-slate-950 border border-cyan-500/50 rounded px-2 py-1 text-sm text-white focus:outline-none"
                                                />
                                                <button onClick={handleRenameSave} className="p-1 text-emerald-400 hover:bg-emerald-500/10 rounded">
                                                    <Check className="w-4 h-4" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-2">
                                                <h3 className={`font-bold text-lg truncate ${activeProjectId === project.id ? 'text-cyan-400' : 'text-slate-200'}`}>
                                                    {project.name}
                                                </h3>
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); handleRenameStart(project); }}
                                                    className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-cyan-400 transition-all"
                                                >
                                                    <Edit2 className="w-3.5 h-3.5" />
                                                </button>
                                            </div>
                                        )}
                                        <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                                            <Clock className="w-3 h-3" />
                                            Active {formatDistanceToNow(project.lastModified)} ago
                                        </p>
                                    </div>
                                    <div className={`w-3 h-3 rounded-full ${activeProjectId === project.id ? 'bg-cyan-500 shadow-[0_0_10px_rgba(34,211,238,0.5)]' : 'bg-slate-700'}`} />
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-4 py-3 border-t border-white/5">
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <LayoutGrid className="w-4 h-4 text-slate-500" />
                                        <span>{project.nodes.length} Nodes</span>
                                    </div>
                                    <div className="flex items-center gap-2 text-xs text-slate-400">
                                        <HardDrive className="w-4 h-4 text-slate-500" />
                                        <span>{Math.round(JSON.stringify(project).length / 1024)} KB</span>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="absolute top-4 right-4 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => handleDelete(e, project.id)}
                                        className="p-2 text-slate-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.div>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="p-4 border-t border-white/5 bg-slate-950/30 text-center">
                    <p className="text-xs text-slate-600 font-medium">
                        All changes are automatically persisted to your local secure storage.
                    </p>
                </div>
            </motion.div>
        </div>
    );
};

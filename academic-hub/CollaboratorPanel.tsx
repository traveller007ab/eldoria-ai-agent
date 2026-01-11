/**
 * CollaboratorPanel - UI for Academic Hub Collaboration
 * 
 * Provides:
 * - Share link generation
 * - Project export/import
 * - Activity timeline
 * - (Future) Real-time participant list
 */

import React, { useState, useEffect, useRef } from 'react';
import {
    Share2, Download, Upload, Users, Clock, CheckCircle,
    Copy, ExternalLink, FileDown, FileUp, X, Loader2
} from 'lucide-react';
import { AcademicProject } from '../types';
import { CollaborationLayer, CollaborationEvent, ProjectSnapshot } from '../services/CollaborationLayer';
import { useWorkspace } from '../context/WorkspaceContext';

interface CollaboratorPanelProps {
    project: AcademicProject;
    onClose: () => void;
    onImport?: (project: AcademicProject) => void;
}

export const CollaboratorPanel: React.FC<CollaboratorPanelProps> = ({
    project,
    onClose,
    onImport
}) => {
    const { addAcademicProject } = useWorkspace();
    const [activeTab, setActiveTab] = useState<'share' | 'activity'>('share');
    const [shareCode, setShareCode] = useState<string>('');
    const [copied, setCopied] = useState(false);
    const [isExporting, setIsExporting] = useState(false);
    const [isImporting, setIsImporting] = useState(false);
    const [importError, setImportError] = useState<string | null>(null);
    const [activities, setActivities] = useState<CollaborationEvent[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        // Load or create session
        let session = CollaborationLayer.getCurrentSession();
        if (!session || session.projectId !== project.id) {
            session = CollaborationLayer.createSession(project, 'You');
        }
        setShareCode(session.shareCode);

        // Load activity log
        setActivities(CollaborationLayer.getActivityLog());

        // Subscribe to new activities
        const unsubscribe = CollaborationLayer.subscribe((event) => {
            setActivities(prev => [event, ...prev].slice(0, 50));
        });

        return unsubscribe;
    }, [project]);

    const handleCopyShareCode = () => {
        navigator.clipboard.writeText(shareCode);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleExport = () => {
        setIsExporting(true);
        try {
            CollaborationLayer.downloadProjectSnapshot(project, 'You');
            CollaborationLayer.logActivity('content_updated', 'you', { action: 'export' });
        } catch (e) {
            console.error('Export failed', e);
        } finally {
            setIsExporting(false);
        }
    };

    const handleImportClick = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsImporting(true);
        setImportError(null);

        try {
            const result = await CollaborationLayer.importFromFile(file);
            if (result.success && result.project) {
                // Add to workspace
                addAcademicProject(result.project);
                CollaborationLayer.logActivity('content_updated', 'you', { action: 'import' });
                onImport?.(result.project);
            } else {
                setImportError(result.error || 'Import failed');
            }
        } catch (e) {
            setImportError('Failed to import file');
        } finally {
            setIsImporting(false);
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const formatTime = (date: Date | string) => {
        const d = new Date(date);
        const now = new Date();
        const diff = now.getTime() - d.getTime();

        if (diff < 60000) return 'Just now';
        if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
        if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
        return d.toLocaleDateString();
    };

    const getActivityIcon = (type: CollaborationEvent['type']) => {
        switch (type) {
            case 'participant_joined': return Users;
            case 'content_updated': return FileDown;
            default: return Clock;
        }
    };

    const getActivityMessage = (event: CollaborationEvent) => {
        const action = event.data?.action;
        switch (event.type) {
            case 'participant_joined':
                return 'joined the session';
            case 'participant_left':
                return 'left the session';
            case 'content_updated':
                if (action === 'export') return 'exported the project';
                if (action === 'import') return 'imported a project';
                return 'updated content';
            case 'comment_added':
                return 'added a comment';
            default:
                return 'performed an action';
        }
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-8">
            <div className="bg-slate-900 border border-cyan-500/20 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
                {/* Header */}
                <div className="p-4 border-b border-cyan-500/20 flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-transparent">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-cyan-500/20 rounded-lg">
                            <Users className="w-5 h-5 text-cyan-400" />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-white">Collaborate</h2>
                            <p className="text-xs text-slate-400">Share and sync your research</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-slate-400" />
                    </button>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-cyan-500/10">
                    <button
                        onClick={() => setActiveTab('share')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'share'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Share2 className="w-4 h-4 inline-block mr-2" />
                        Share
                    </button>
                    <button
                        onClick={() => setActiveTab('activity')}
                        className={`flex-1 py-3 text-xs font-bold uppercase tracking-wider transition-colors ${activeTab === 'activity'
                                ? 'text-cyan-400 border-b-2 border-cyan-400'
                                : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Clock className="w-4 h-4 inline-block mr-2" />
                        Activity
                    </button>
                </div>

                {/* Content */}
                <div className="p-6">
                    {activeTab === 'share' && (
                        <div className="space-y-6">
                            {/* Share Code */}
                            <div>
                                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                                    Session Code
                                </label>
                                <div className="flex gap-2">
                                    <div className="flex-1 bg-black/40 border border-cyan-500/20 rounded-lg px-4 py-3 font-mono text-xl text-cyan-300 tracking-widest text-center">
                                        {shareCode}
                                    </div>
                                    <button
                                        onClick={handleCopyShareCode}
                                        className="px-4 bg-cyan-500/20 hover:bg-cyan-500/30 rounded-lg text-cyan-400 transition-colors"
                                    >
                                        {copied ? <CheckCircle className="w-5 h-5" /> : <Copy className="w-5 h-5" />}
                                    </button>
                                </div>
                                <p className="text-xs text-slate-500 mt-2 italic">
                                    Share this code with collaborators (future feature)
                                </p>
                            </div>

                            {/* Export/Import */}
                            <div className="grid grid-cols-2 gap-4">
                                <button
                                    onClick={handleExport}
                                    disabled={isExporting}
                                    className="flex flex-col items-center gap-2 p-4 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isExporting ? (
                                        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
                                    ) : (
                                        <Download className="w-8 h-8 text-emerald-400" />
                                    )}
                                    <span className="text-xs font-bold text-emerald-300 uppercase">Export Snapshot</span>
                                    <span className="text-[10px] text-slate-500">Download as JSON</span>
                                </button>

                                <button
                                    onClick={handleImportClick}
                                    disabled={isImporting}
                                    className="flex flex-col items-center gap-2 p-4 bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/20 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isImporting ? (
                                        <Loader2 className="w-8 h-8 text-purple-400 animate-spin" />
                                    ) : (
                                        <Upload className="w-8 h-8 text-purple-400" />
                                    )}
                                    <span className="text-xs font-bold text-purple-300 uppercase">Import Snapshot</span>
                                    <span className="text-[10px] text-slate-500">Load from file</span>
                                </button>
                            </div>

                            {importError && (
                                <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-lg text-xs text-red-400">
                                    {importError}
                                </div>
                            )}

                            {/* Hidden file input */}
                            <input
                                ref={fileInputRef}
                                type="file"
                                accept=".json"
                                onChange={handleFileSelect}
                                className="hidden"
                            />
                        </div>
                    )}

                    {activeTab === 'activity' && (
                        <div className="space-y-3 max-h-80 overflow-y-auto custom-scrollbar">
                            {activities.length === 0 ? (
                                <div className="text-center text-slate-500 py-8">
                                    <Clock className="w-8 h-8 mx-auto mb-2 opacity-50" />
                                    <p className="text-sm">No activity yet</p>
                                </div>
                            ) : (
                                activities.map((event, i) => {
                                    const Icon = getActivityIcon(event.type);
                                    return (
                                        <div
                                            key={i}
                                            className="flex items-start gap-3 p-3 bg-black/20 rounded-lg border border-white/5"
                                        >
                                            <div className="p-1.5 bg-cyan-500/10 rounded-lg">
                                                <Icon className="w-4 h-4 text-cyan-400" />
                                            </div>
                                            <div className="flex-1">
                                                <div className="text-xs text-slate-300">
                                                    <span className="font-medium text-cyan-300">
                                                        {event.participantId === 'you' ? 'You' : event.participantId}
                                                    </span>
                                                    {' '}{getActivityMessage(event)}
                                                </div>
                                                <div className="text-[10px] text-slate-500 mt-1">
                                                    {formatTime(event.timestamp)}
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-cyan-500/10 bg-black/20">
                    <p className="text-[10px] text-slate-500 text-center">
                        🚀 Real-time sync coming soon! For now, use Export/Import to share.
                    </p>
                </div>
            </div>
        </div>
    );
};

export default CollaboratorPanel;

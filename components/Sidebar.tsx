import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Layout, GraduationCap, Terminal, Settings, Database, Loader2, LogOut, DownloadCloud } from 'lucide-react';
import { KnowledgeIndexModal } from './KnowledgeIndexModal';
import { SettingsModal } from './SettingsModal';
import { EldoriaLogo } from './Icons';
import { useWorkspace } from '../context/WorkspaceContext';

export const Sidebar: React.FC = () => {
    const [isIndexOpen, setIsIndexOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [isMounted, setIsMounted] = useState(false);
    const { isIndexing } = useWorkspace();

    return (
        <>
            <div className="fixed left-0 top-0 bottom-0 w-16 bg-black/40 backdrop-blur-md border-r border-cyan-500/10 flex flex-col items-center py-6 gap-6 z-[99999]">
                <div className="mb-2 p-2 bg-cyan-500/10 rounded-xl">
                    <EldoriaLogo className="w-8 h-8 text-cyan-400 drop-shadow-[0_0_8px_rgba(34,211,238,0.4)]" />
                </div>

                <NavLink
                    id="nav-workspace"
                    to="/"
                    onClick={() => console.info('Sidebar: Strategic Workspace Clicked')}
                    className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5'}`}
                    title="Strategic Workspace"
                >
                    <Layout className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </NavLink>

                <NavLink
                    id="nav-academic-hub"
                    to="/academic-hub"
                    onClick={() => console.info('Sidebar: Academic Hub Clicked')}
                    className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-cyan-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'}`}
                    title="Academic Hub"
                >
                    <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </NavLink>

                <NavLink
                    id="nav-download-hub"
                    to="/download-hub"
                    className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-purple-500/20 text-purple-300 shadow-[0_0_15px_rgba(168,85,247,0.3)]' : 'text-cyan-500/40 hover:text-purple-400 hover:bg-purple-500/5'}`}
                    title="Download Hub"
                >
                    <DownloadCloud className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </NavLink>

                <div className="mt-auto flex flex-col gap-4">
                    <button
                        id="nav-knowledge-index"
                        onClick={() => setIsIndexOpen(true)}
                        className="p-3 text-cyan-500/40 hover:text-cyan-300 hover:bg-cyan-500/5 rounded-xl transition-all group relative"
                        title="Global Knowledge Index"
                    >
                        <Database className={`w-6 h-6 group-hover:scale-110 transition-transform ${isIndexing ? 'animate-pulse text-cyan-400' : ''}`} />
                        {isIndexing && <Loader2 className="w-3 h-3 absolute top-2 right-2 animate-spin text-cyan-400" />}
                    </button>
                    <button
                        id="nav-settings"
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-cyan-500/40 hover:text-cyan-300 hover:bg-cyan-500/5 rounded-xl transition-all group"
                        title="System Settings"
                    >
                        <Settings className="w-6 h-6 group-hover:rotate-45 transition-transform" />
                    </button>
                    <button className="p-3 text-cyan-500/40 hover:text-red-400 hover:bg-red-500/5 rounded-xl transition-all group" title="Disconnect Session">
                        <LogOut className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>

            {/* Modals rendered at root level to prevent layout inheritance */}
            {isIndexOpen && <KnowledgeIndexModal onClose={() => setIsIndexOpen(false)} />}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </>
    );
};

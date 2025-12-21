import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Layout, GraduationCap, Terminal, Settings, Database } from 'lucide-react';
import { KnowledgeIndexModal } from './KnowledgeIndexModal';
import { SettingsModal } from './SettingsModal';

export const Sidebar: React.FC = () => {
    const [isIndexOpen, setIsIndexOpen] = useState(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    return (
        <>
            <div className="w-16 shrink-0 bg-black/40 backdrop-blur-md border-r border-cyan-500/10 flex flex-col items-center py-6 gap-6 z-20">
                <NavLink
                    to="/"
                    className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-cyan-500/20 text-cyan-300 shadow-[0_0_15px_rgba(34,211,238,0.3)]' : 'text-cyan-500/40 hover:text-cyan-400 hover:bg-cyan-500/5'}`}
                    title="Strategic Workspace"
                >
                    <Layout className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </NavLink>

                <NavLink
                    to="/academic-hub"
                    className={({ isActive }) => `p-3 rounded-xl transition-all duration-300 group ${isActive ? 'bg-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.3)]' : 'text-cyan-500/40 hover:text-emerald-400 hover:bg-emerald-500/5'}`}
                    title="Academic Hub"
                >
                    <GraduationCap className="w-6 h-6 group-hover:scale-110 transition-transform" />
                </NavLink>

                <div className="mt-auto flex flex-col gap-6">
                    <button
                        onClick={() => setIsIndexOpen(true)}
                        className="p-3 text-cyan-500/40 hover:text-cyan-400 transition-colors"
                        title="Global Knowledge Index"
                    >
                        <Database className="w-5 h-5" />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="p-3 text-cyan-500/40 hover:text-cyan-400 transition-colors"
                        title="Settings"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {isIndexOpen && <KnowledgeIndexModal onClose={() => setIsIndexOpen(false)} />}
            {isSettingsOpen && <SettingsModal onClose={() => setIsSettingsOpen(false)} />}
        </>
    );
};

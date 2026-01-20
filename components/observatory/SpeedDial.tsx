import React from 'react';
import { Search, Compass, BookOpen, MessageSquare, Github, Database } from 'lucide-react';
import { useBrowserStore } from '../../stores/browserStore';

export const SpeedDial: React.FC = () => {
    const { navigateTab, activeTabId } = useBrowserStore();

    const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const query = formData.get('query') as string;
        if (query && activeTabId) {
            // Simple logic: if it looks like a URL, go there, else search Google
            const url = query.includes('.') && !query.includes(' ')
                ? (query.startsWith('http') ? query : `https://${query}`)
                : `https://www.google.com/search?q=${encodeURIComponent(query)}`;
            navigateTab(activeTabId, url);
        }
    };

    const shortcuts = [
        { name: 'Nexus Map', icon: Compass, url: 'internal://nexus', color: 'text-cyan-400' },
        { name: 'Knowledge Graph', icon: Database, url: 'internal://graph', color: 'text-purple-400' },
        { name: 'Chat', icon: MessageSquare, url: 'internal://chat', color: 'text-green-400' },
        { name: 'Documentation', icon: BookOpen, url: 'https://docs.google.com', color: 'text-yellow-400' },
        { name: 'GitHub', icon: Github, url: 'https://github.com', color: 'text-white' },
    ];

    return (
        <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 text-slate-200">
            <div className="w-full max-w-2xl px-6 flex flex-col items-center gap-10">

                {/* Hero / Logo Area */}
                <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
                    <div className="w-20 h-20 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] mb-6">
                        <Compass className="w-10 h-10 text-cyan-400" />
                    </div>
                    <h1 className="text-3xl font-light tracking-wider text-slate-100">
                        Observatory <span className="text-cyan-500 font-normal">Browser</span>
                    </h1>
                </div>

                {/* Search Bar */}
                <form onSubmit={handleSearch} className="w-full relative group">
                    <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <div className="relative flex items-center bg-slate-950/80 border border-slate-700/50 rounded-full px-6 py-4 shadow-xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
                        <Search className="w-5 h-5 text-slate-500 mr-4" />
                        <input
                            name="query"
                            type="text"
                            placeholder="Search the web or enter URL..."
                            className="bg-transparent border-none outline-none flex-1 text-lg text-slate-200 placeholder:text-slate-600"
                            autoFocus
                        />
                    </div>
                </form>

                {/* Shortcuts Grid */}
                <div className="grid grid-cols-3 md:grid-cols-5 gap-4 w-full">
                    {shortcuts.map((site) => (
                        <button
                            key={site.name}
                            onClick={() => activeTabId && navigateTab(activeTabId, site.url.startsWith('internal') ? 'about:blank' : site.url)}
                            className="flex flex-col items-center gap-3 p-4 rounded-xl hover:bg-slate-800/50 transition-colors group"
                        >
                            <div className={`p-3 rounded-lg bg-slate-900 border border-slate-800 group-hover:border-slate-700 group-hover:scale-110 transition-all duration-300 ${site.color}`}>
                                <site.icon className="w-6 h-6" />
                            </div>
                            <span className="text-xs font-medium text-slate-400 group-hover:text-slate-200">{site.name}</span>
                        </button>
                    ))}
                </div>

            </div>
        </div>
    );
};

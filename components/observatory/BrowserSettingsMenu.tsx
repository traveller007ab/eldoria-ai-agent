import React, { useState } from 'react';
import { Settings, Check, ChevronDown } from 'lucide-react';
import { useBrowserStore, SearchEngine } from '../../stores/browserStore';

export const BrowserSettingsMenu: React.FC = () => {
    const { searchEngine, setSearchEngine } = useBrowserStore();
    const [isOpen, setIsOpen] = useState(false);

    const engines: { id: SearchEngine; name: string }[] = [
        { id: 'google', name: 'Google' },
        { id: 'duckduckgo', name: 'DuckDuckGo' },
        { id: 'bing', name: 'Bing' },
        { id: 'brave', name: 'Brave' },
        { id: 'perplexity', name: 'Perplexity AI' },
    ];

    const toggleOpen = () => setIsOpen(!isOpen);

    return (
        <div className="relative">
            <button
                onClick={toggleOpen}
                className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors flex items-center gap-1"
                title="Browser Settings"
            >
                <Settings className="w-4 h-4" />
            </button>

            {isOpen && (
                <>
                    {/* Backdrop */}
                    <div className="fixed inset-0 z-40" onClick={() => setIsOpen(false)} />

                    {/* Menu */}
                    <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700/50 rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                        <div className="px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider bg-slate-950/50">
                            Search Engine
                        </div>
                        <div className="py-1">
                            {engines.map((eng) => (
                                <button
                                    key={eng.id}
                                    onClick={() => {
                                        setSearchEngine(eng.id);
                                        setIsOpen(false);
                                    }}
                                    className="w-full text-left px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white flex items-center justify-between group"
                                >
                                    <span>{eng.name}</span>
                                    {searchEngine === eng.id && (
                                        <Check className="w-4 h-4 text-cyan-400" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

import React, { useState, useEffect } from 'react';
import { Search, ArrowLeft, ArrowRight, RotateCw, X, Globe, Lock } from 'lucide-react';
import { useBrowserStore } from '../../stores/browserStore';
import { BrowserSettingsMenu } from './BrowserSettingsMenu';

interface BrowserOmniboxProps {
    currentUrl: string;
    isLoading?: boolean;
    onNavigate: (url: string) => void;
    onReload: () => void;
    onBack: () => void;
    onForward: () => void;
}

export const BrowserOmnibox: React.FC<BrowserOmniboxProps> = ({
    currentUrl,
    isLoading,
    onNavigate,
    onReload,
    onBack,
    onForward
}) => {
    const [inputVal, setInputVal] = useState(currentUrl);
    const [isFocused, setIsFocused] = useState(false);

    // Sync input with prop when not focused
    useEffect(() => {
        if (!isFocused) {
            // Don't show technical internal URLs in the bar
            if (currentUrl === 'about:blank' || currentUrl.startsWith('internal://')) {
                setInputVal('');
            } else {
                setInputVal(currentUrl);
            }
        }
    }, [currentUrl, isFocused]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!inputVal.trim()) return;

        let target = inputVal.trim();
        // Basic heuristics
        if (!target.includes('.') && !target.includes('://') && !target.startsWith('localhost')) {
            // It's a search
            target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
        } else if (!target.startsWith('http')) {
            target = `https://${target}`;
        }

        onNavigate(target);
        // Blur to show we are done
        (document.activeElement as HTMLElement)?.blur();
    };

    return (
        <div className="flex items-center gap-2 p-2 bg-slate-950 border-b border-slate-800 text-slate-200">
            {/* Nav Controls */}
            <div className="flex items-center gap-1">
                <button onClick={onBack} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button onClick={onForward} className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors">
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={onReload} className={`p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors ${isLoading ? 'animate-spin' : ''}`}>
                    <RotateCw className="w-4 h-4" />
                </button>
            </div>

            {/* Omnibox Input */}
            <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto relative group">
                <div className={`
          flex items-center bg-slate-900 border rounded-full px-4 py-1.5 transition-all
          ${isFocused
                        ? 'border-cyan-500 ring-2 ring-cyan-500/20 shadow-lg shadow-cyan-500/10'
                        : 'border-slate-800 hover:border-slate-700'
                    }
        `}>
                    {currentUrl.startsWith('https') ? (
                        <Lock className="w-3.5 h-3.5 text-emerald-500 mr-2 flex-shrink-0" />
                    ) : (
                        <Globe className="w-3.5 h-3.5 text-slate-500 mr-2 flex-shrink-0" />
                    )}

                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-600 font-medium"
                        placeholder="Search or enter website name"
                    />

                    {inputVal && isFocused && (
                        <button
                            type="button"
                            onMouseDown={(e) => { e.preventDefault(); setInputVal(''); }}
                            className="p-0.5 hover:bg-slate-700 rounded-full text-slate-500"
                        >
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </form>

            {/* Right Side Actions */}
            <div className="flex items-center justify-center px-4">
                <BrowserSettingsMenu />
            </div>
        </div>
    );
};

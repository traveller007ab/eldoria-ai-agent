import React, { useState, useEffect } from 'react';
import { Search, Globe, RotateCw, ArrowLeft, ArrowRight, Star } from 'lucide-react';

interface BrowserOmniboxProps {
    url: string;
    onNavigate: (url: string) => void;
    onBack: () => void;
    onForward: () => void;
    onReload: () => void;
    isLoading?: boolean;
    isDark?: boolean;
}

export const BrowserOmnibox: React.FC<BrowserOmniboxProps> = ({
    url,
    onNavigate,
    onBack,
    onForward,
    onReload,
    isLoading = false,
    isDark = false
}) => {
    const [inputVal, setInputVal] = useState(url);

    useEffect(() => {
        setInputVal(url);
    }, [url]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        let target = inputVal.trim();

        if (!target) return;

        // Basic URL detection
        const hasProtocol = target.startsWith('http://') || target.startsWith('https://');
        const hasDot = target.includes('.');

        if (hasProtocol) {
            onNavigate(target);
        } else if (hasDot && !target.includes(' ')) {
            onNavigate(`https://${target}`);
        } else {
            // Search Fallback (Tavily/Google)
            onNavigate(`https://www.google.com/search?q=${encodeURIComponent(target)}`);
        }
    };

    return (
        <div className={`
            flex items-center gap-2 px-4 py-2 border-b transition-colors
            ${isDark ? 'bg-[#151518] border-white/[0.06]' : 'bg-white/80 border-stone-200'}
        `}>
            {/* Nav Controls */}
            <div className="flex items-center gap-1">
                <button onClick={onBack} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                    <ArrowLeft className="w-4 h-4" />
                </button>
                <button onClick={onForward} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                    <ArrowRight className="w-4 h-4" />
                </button>
                <button onClick={onReload} className={`p-1.5 rounded-lg transition-colors ${isDark ? 'hover:bg-white/10 text-zinc-400' : 'hover:bg-stone-100 text-stone-500'}`}>
                    <RotateCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-cyan-500' : ''}`} />
                </button>
            </div>

            {/* Omnibox */}
            <form onSubmit={handleSubmit} className="flex-1">
                <div className={`
                    flex items-center gap-2 px-3 py-1.5 rounded-xl border transition-all
                    focus-within:ring-2 focus-within:ring-cyan-500/20
                    ${isDark
                        ? 'bg-black/20 border-white/10 text-zinc-300'
                        : 'bg-stone-50 border-stone-200 text-stone-700'}
                `}>
                    <Globe className={`w-3.5 h-3.5 ${isDark ? 'text-zinc-500' : 'text-stone-400'}`} />
                    <input
                        type="text"
                        value={inputVal}
                        onChange={(e) => setInputVal(e.target.value)}
                        placeholder="Search or enter website..."
                        className="flex-1 bg-transparent border-none outline-none text-sm placeholder:text-opacity-50"
                    />
                    <Star className={`w-3.5 h-3.5 cursor-pointer hover:text-amber-400 transition-colors ${isDark ? 'text-zinc-600' : 'text-stone-300'}`} />
                </div>
            </form>
        </div>
    );
};

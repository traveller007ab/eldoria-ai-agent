import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Search, ArrowLeft, ArrowRight, RotateCw, X, Globe, Lock, Star, History, Clock, ExternalLink } from 'lucide-react';
import { browserService } from '../../src/services/BrowserService';

interface Suggestion {
  type: 'history' | 'bookmark' | 'search' | 'url';
  title: string;
  url?: string;
  icon?: string;
}

interface BrowserOmniboxProps {
  currentUrl: string;
  isLoading?: boolean;
  onNavigate: (url: string) => void;
  onReload: () => void;
  onBack: () => void;
  onForward: () => void;
  canGoBack?: boolean;
  canGoForward?: boolean;
}

const SEARCH_ENGINES = [
  { name: 'Google', url: 'https://www.google.com/search?q=' },
  { name: 'DuckDuckGo', url: 'https://duckduckgo.com/?q=' },
  { name: 'Wikipedia', url: 'https://en.wikipedia.org/wiki/Special:Search?search=' },
  { name: 'GitHub', url: 'https://github.com/search?q=' },
];

export const BrowserOmnibox: React.FC<BrowserOmniboxProps> = ({
  currentUrl,
  isLoading,
  onNavigate,
  onReload,
  onBack,
  onForward,
  canGoBack = false,
  canGoForward = false
}) => {
  const [inputVal, setInputVal] = useState(currentUrl);
  const [isFocused, setIsFocused] = useState(false);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [showHistory, setShowHistory] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isFocused) {
      setInputVal(currentUrl === 'about:blank' || currentUrl.startsWith('internal://') ? '' : currentUrl);
      setSuggestions([]);
      setSelectedIndex(-1);
    }
  }, [currentUrl, isFocused]);

  useEffect(() => {
    if (!inputVal.trim() || !isFocused) {
      setSuggestions([]);
      return;
    }

    const query = inputVal.toLowerCase();
    const newSuggestions: Suggestion[] = [];

    const history = browserService.getHistory();
    const historyMatches = history
      .filter(h => h.title.toLowerCase().includes(query) || h.url.toLowerCase().includes(query))
      .slice(0, 5)
      .map(h => ({ type: 'history' as const, title: h.title, url: h.url }));

    const bookmarks = browserService.searchBookmarks(query);
    const bookmarkMatches = bookmarks
      .slice(0, 3)
      .map(b => ({ type: 'bookmark' as const, title: b.title, url: b.url, icon: b.favicon }));

    const searchMatches = SEARCH_ENGINES.map(eng => ({
      type: 'search' as const,
      title: `Search ${eng.name}: ${inputVal}`,
      url: eng.url + encodeURIComponent(inputVal)
    }));

    newSuggestions.push(...historyMatches, ...bookmarkMatches, ...searchMatches);
    setSuggestions(newSuggestions);
    setSelectedIndex(-1);
  }, [inputVal, isFocused]);

  const handleSubmit = (e: React.FormEvent, suggestion?: Suggestion) => {
    e.preventDefault();
    
    let target: string;
    
    if (suggestion?.url) {
      target = suggestion.url;
    } else if (!inputVal.trim()) {
      return;
    } else {
      target = inputVal.trim();
      
      const hasProtocol = target.startsWith('http://') || target.startsWith('https://');
      const hasDot = target.includes('.') && !target.includes(' ');
      
      if (hasProtocol) {
        target = target;
      } else if (hasDot) {
        target = `https://${target}`;
      } else {
        target = `https://www.google.com/search?q=${encodeURIComponent(target)}`;
      }
    }

    onNavigate(target);
    setIsFocused(false);
    inputRef.current?.blur();
    setSuggestions([]);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    const total = suggestions.length;
    
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex(prev => (prev < total - 1 ? prev + 1 : -1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex(prev => (prev > -1 ? prev - 1 : total - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (selectedIndex >= 0 && suggestions[selectedIndex]) {
        handleSubmit(e, suggestions[selectedIndex]);
      } else {
        handleSubmit(e);
      }
    } else if (e.key === 'Escape') {
      setIsFocused(false);
      inputRef.current?.blur();
    }
  };

  const getSuggestionIcon = (type: Suggestion['type']) => {
    switch (type) {
      case 'history': return <History className="w-3.5 h-3.5 text-amber-500" />;
      case 'bookmark': return <Star className="w-3.5 h-3.5 text-yellow-500" />;
      case 'search': return <Search className="w-3.5 h-3.5 text-blue-500" />;
      case 'url': return <Globe className="w-3.5 h-3.5 text-emerald-500" />;
    }
  };

  const displayUrl = useMemo(() => {
    if (!currentUrl || currentUrl === 'about:blank') return '';
    try {
      const url = new URL(currentUrl);
      return url.hostname + url.pathname;
    } catch {
      return currentUrl;
    }
  }, [currentUrl]);

  return (
    <div className="flex items-center gap-2 p-2 bg-slate-950 border-b border-slate-800 text-slate-200">
      <div className="flex items-center gap-1">
        <button 
          onClick={onBack} 
          disabled={!canGoBack}
          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowLeft className="w-4 h-4" />
        </button>
        <button 
          onClick={onForward} 
          disabled={!canGoForward}
          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <ArrowRight className="w-4 h-4" />
        </button>
        <button 
          onClick={onReload} 
          className={`p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors ${isLoading ? 'animate-spin' : ''}`}
        >
          <RotateCw className="w-4 h-4" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 max-w-4xl mx-auto relative">
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
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setTimeout(() => setIsFocused(false), 200)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent border-none outline-none text-sm text-slate-200 placeholder-slate-600 font-medium"
            placeholder="Search or enter website"
          />

          {inputVal && (
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); setInputVal(''); }}
              className="p-0.5 hover:bg-slate-700 rounded-full text-slate-500"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>

        {isFocused && suggestions.length > 0 && (
          <div 
            ref={listRef}
            className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50"
          >
            {suggestions.map((suggestion, index) => (
              <button
                key={`${suggestion.type}-${suggestion.url || suggestion.title}`}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); handleSubmit(e, suggestion); }}
                className={`
                  w-full flex items-center gap-3 px-4 py-3 text-left transition-colors
                  ${index === selectedIndex ? 'bg-cyan-500/10' : 'hover:bg-slate-800'}
                `}
              >
                {getSuggestionIcon(suggestion.type)}
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-200 truncate font-medium">{suggestion.title}</p>
                  {suggestion.url && (
                    <p className="text-xs text-slate-500 truncate">{suggestion.url}</p>
                  )}
                </div>
                {suggestion.type === 'history' && (
                  <Clock className="w-3.5 h-3.5 text-slate-600" />
                )}
              </button>
            ))}
          </div>
        )}

        {isFocused && inputVal && suggestions.length === 0 && (
          <div className="absolute top-full left-0 right-0 mt-2 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl overflow-hidden z-50">
            <button
              type="button"
              onMouseDown={(e) => { e.preventDefault(); handleSubmit(e); }}
              className="w-full flex items-center gap-3 px-4 py-3 text-left hover:bg-slate-800 transition-colors"
            >
              <Search className="w-3.5 h-3.5 text-blue-500" />
              <span className="text-sm text-slate-200">
                Search for <span className="text-cyan-400">"{inputVal}"</span> on Google
              </span>
            </button>
          </div>
        )}
      </form>

      <div className="flex items-center gap-2">
        <button 
          onClick={() => browserService.addBookmark()}
          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-amber-400 transition-colors"
          title="Bookmark this page"
        >
          <Star className="w-4 h-4" />
        </button>
        <a
          href={currentUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="p-1.5 hover:bg-slate-800 rounded-md text-slate-400 hover:text-white transition-colors"
          title="Open in new tab"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>
    </div>
  );
};

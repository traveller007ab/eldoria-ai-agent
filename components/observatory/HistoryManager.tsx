import React, { useState, useEffect } from 'react';
import { Clock, X, Search, ExternalLink, Trash2 } from 'lucide-react';
import { browserService } from '../../src/services/BrowserService';
import { HistoryEntry } from '../../src/services/BrowserService';

interface HistoryManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export const HistoryManager: React.FC<HistoryManagerProps> = ({ isOpen, onClose, onNavigate }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    if (isOpen) {
      setHistory(browserService.getHistory());
    }
  }, [isOpen]);

  const filteredHistory = searchQuery
    ? browserService.searchHistory(searchQuery)
    : history;

  const handleClearAll = () => {
    if (confirm('Clear all browsing history?')) {
      browserService.clearHistory();
      setHistory([]);
    }
  };

  const formatDate = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return 'Just now';
    if (diff < 3600000) return `${Math.floor(diff / 60000)} min ago`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)} hours ago`;
    if (diff < 604800000) return `${Math.floor(diff / 86400000)} days ago`;
    return date.toLocaleDateString();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-semibold text-white">History</h2>
          </div>
          <div className="flex items-center gap-2">
            {history.length > 0 && (
              <button
                onClick={handleClearAll}
                className="px-3 py-1 text-sm text-red-400 hover:text-red-300 transition-colors"
              >
                Clear All
              </button>
            )}
            <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search history..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredHistory.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Clock className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No history yet</p>
            </div>
          ) : (
            <div className="space-y-1">
              {filteredHistory.slice().reverse().map((entry, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 group transition-colors"
                >
                  <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                    <Clock className="w-4 h-4 text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{entry.title || entry.url}</p>
                    <p className="text-slate-500 text-sm truncate">{entry.url}</p>
                    <p className="text-slate-600 text-xs mt-1">{formatDate(entry.timestamp)}</p>
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onNavigate(entry.url)}
                      className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

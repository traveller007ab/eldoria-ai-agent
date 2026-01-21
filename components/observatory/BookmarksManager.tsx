import React, { useState, useEffect } from 'react';
import { Star, X, Search, Plus, ExternalLink, Trash2, Tag } from 'lucide-react';
import { browserService } from '../../src/services/BrowserService';
import { Bookmark } from '../../src/services/BrowserService';

interface BookmarksManagerProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (url: string) => void;
}

export const BookmarksManager: React.FC<BookmarksManagerProps> = ({ isOpen, onClose, onNavigate }) => {
  const [bookmarks, setBookmarks] = useState<Bookmark[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newBookmark, setNewBookmark] = useState({ url: '', title: '', tags: '' });

  useEffect(() => {
    if (isOpen) {
      setBookmarks(browserService.getBookmarks());
    }
  }, [isOpen]);

  const filteredBookmarks = searchQuery
    ? browserService.searchBookmarks(searchQuery)
    : bookmarks;

  const handleDelete = (id: string) => {
    browserService.removeBookmark(id);
    setBookmarks(browserService.getBookmarks());
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBookmark.url) return;
    browserService.addBookmark(newBookmark.url, newBookmark.title, newBookmark.tags.split(',').map(t => t.trim()).filter(Boolean));
    setBookmarks(browserService.getBookmarks());
    setShowAddModal(false);
    setNewBookmark({ url: '', title: '', tags: '' });
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl w-full max-w-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Star className="w-5 h-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-white">Bookmarks</h2>
          </div>
          <button onClick={onClose} className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 border-b border-slate-700">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-slate-500" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search bookmarks..."
              className="flex-1 bg-transparent border-none outline-none text-white placeholder:text-slate-500"
            />
            <button
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-1 px-3 py-1.5 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg text-sm transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {filteredBookmarks.length === 0 ? (
            <div className="text-center py-12 text-slate-500">
              <Star className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No bookmarks yet</p>
              <p className="text-sm mt-2">Star a page to add it here</p>
            </div>
          ) : (
            <div className="space-y-2">
              {filteredBookmarks.map((bookmark) => (
                <div
                  key={bookmark.id}
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-800/50 group transition-colors"
                >
                  {bookmark.favicon ? (
                    <img src={bookmark.favicon} alt="" className="w-8 h-8" onError={(e) => (e.currentTarget.style.display = 'none')} />
                  ) : (
                    <div className="w-8 h-8 rounded bg-slate-800 flex items-center justify-center">
                      <Star className="w-4 h-4 text-yellow-500" />
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-white font-medium truncate">{bookmark.title || bookmark.url}</p>
                    <p className="text-slate-500 text-sm truncate">{bookmark.url}</p>
                    {bookmark.tags.length > 0 && (
                      <div className="flex items-center gap-1 mt-1">
                        <Tag className="w-3 h-3 text-slate-600" />
                        <span className="text-xs text-slate-600">{bookmark.tags.join(', ')}</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => onNavigate(bookmark.url)}
                      className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-cyan-400"
                      title="Open"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(bookmark.id)}
                      className="p-2 hover:bg-slate-700 rounded text-slate-400 hover:text-red-400"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={() => setShowAddModal(false)}>
          <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
            <h3 className="text-lg font-semibold text-white mb-4">Add Bookmark</h3>
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="block text-sm text-slate-400 mb-1">URL</label>
                <input
                  type="url"
                  value={newBookmark.url}
                  onChange={(e) => setNewBookmark({ ...newBookmark, url: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="https://..."
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Title (optional)</label>
                <input
                  type="text"
                  value={newBookmark.title}
                  onChange={(e) => setNewBookmark({ ...newBookmark, title: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="My Bookmark"
                />
              </div>
              <div>
                <label className="block text-sm text-slate-400 mb-1">Tags (comma-separated)</label>
                <input
                  type="text"
                  value={newBookmark.tags}
                  onChange={(e) => setNewBookmark({ ...newBookmark, tags: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
                  placeholder="research, coding, docs"
                />
              </div>
              <div className="flex gap-3 justify-end">
                <button type="button" onClick={() => setShowAddModal(false)} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
                <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">Add Bookmark</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

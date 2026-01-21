import React, { useState, useEffect } from 'react';
import { Search, Plus, X, Edit2, ExternalLink, GripVertical } from 'lucide-react';

interface Shortcut {
  id: string;
  name: string;
  url: string;
  icon?: string;
  color: string;
}

interface SpeedDialProps {
  onNavigate: (url: string) => void;
}

const DEFAULT_SHORTCUTS: Shortcut[] = [
  { id: '1', name: 'Google', url: 'https://google.com', color: 'text-blue-400' },
  { id: '2', name: 'Wikipedia', url: 'https://en.wikipedia.org', color: 'text-slate-300' },
  { id: '3', name: 'GitHub', url: 'https://github.com', color: 'text-white' },
  { id: '4', name: 'YouTube', url: 'https://youtube.com', color: 'text-red-500' },
  { id: '5', name: 'Twitter', url: 'https://twitter.com', color: 'text-cyan-400' },
  { id: '6', name: 'Reddit', url: 'https://reddit.com', color: 'text-orange-500' },
];

export const SpeedDial: React.FC<SpeedDialProps> = ({ onNavigate }) => {
  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingShortcut, setEditingShortcut] = useState<Shortcut | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  useEffect(() => {
    const saved = localStorage.getItem('eldoria_speed_dial');
    if (saved) {
      try {
        setShortcuts(JSON.parse(saved));
      } catch {
        setShortcuts(DEFAULT_SHORTCUTS);
      }
    } else {
      setShortcuts(DEFAULT_SHORTCUTS);
    }
  }, []);

  const saveShortcuts = (newShortcuts: Shortcut[]) => {
    setShortcuts(newShortcuts);
    localStorage.setItem('eldoria_speed_dial', JSON.stringify(newShortcuts));
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const query = searchQuery.trim();
    const isUrl = query.includes('.') && !query.includes(' ');
    const url = isUrl 
      ? (query.startsWith('http') ? query : `https://${query}`)
      : `https://www.google.com/search?q=${encodeURIComponent(query)}`;

    onNavigate(url);
    setSearchQuery('');
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.dataTransfer.setData('shortcutIndex', String(index));
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    const dragIndex = parseInt(e.dataTransfer.getData('shortcutIndex'));
    if (dragIndex === dropIndex) return;

    const newShortcuts = [...shortcuts];
    const [removed] = newShortcuts.splice(dragIndex, 1);
    newShortcuts.splice(dropIndex, 0, removed);
    saveShortcuts(newShortcuts);
    setDragOverIndex(null);
  };

  const handleDragEnd = () => {
    setDragOverIndex(null);
  };

  const handleDeleteShortcut = (id: string) => {
    saveShortcuts(shortcuts.filter(s => s.id !== id));
  };

  const handleAddShortcut = (shortcut: Omit<Shortcut, 'id'>) => {
    const newShortcut: Shortcut = {
      ...shortcut,
      id: Date.now().toString(),
    };
    saveShortcuts([...shortcuts, newShortcut]);
    setShowAddModal(false);
  };

  const handleUpdateShortcut = (shortcut: Shortcut) => {
    saveShortcuts(shortcuts.map(s => s.id === shortcut.id ? shortcut : s));
    setEditingShortcut(null);
  };

  const colors = [
    'text-blue-400', 'text-cyan-400', 'text-emerald-400', 'text-yellow-400',
    'text-orange-400', 'text-red-400', 'text-pink-400', 'text-purple-400',
    'text-white', 'text-slate-300'
  ];

  return (
    <div className="flex-1 flex flex-col items-center justify-center bg-slate-900/50 text-slate-200">
      <div className="w-full max-w-3xl px-6 flex flex-col items-center gap-10">
        <div className="flex flex-col items-center animate-in fade-in zoom-in duration-500">
          <div className="w-16 h-16 bg-gradient-to-br from-cyan-500/20 to-blue-600/20 rounded-2xl flex items-center justify-center border border-cyan-500/30 shadow-[0_0_30px_-5px_rgba(6,182,212,0.3)] mb-4">
            <Search className="w-8 h-8 text-cyan-400" />
          </div>
          <h1 className="text-2xl font-light tracking-wider text-slate-100">
            Observatory <span className="text-cyan-500 font-normal">Browser</span>
          </h1>
        </div>

        <form onSubmit={handleSearch} className="w-full relative group">
          <div className="absolute inset-0 bg-cyan-500/20 rounded-full blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
          <div className="relative flex items-center bg-slate-950/80 border border-slate-700/50 rounded-full px-6 py-4 shadow-xl focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/20 transition-all">
            <Search className="w-5 h-5 text-slate-500 mr-4" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search or enter URL..."
              className="bg-transparent border-none outline-none flex-1 text-lg text-slate-200 placeholder:text-slate-600"
              autoFocus
            />
          </div>
        </form>

        <div className="w-full">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-slate-400 uppercase tracking-wider">Quick Links</h2>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsEditing(!isEditing)}
                className="text-xs text-slate-500 hover:text-cyan-400 transition-colors"
              >
                {isEditing ? 'Done' : 'Edit'}
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="p-1 rounded hover:bg-slate-800 text-slate-500 hover:text-cyan-400 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-3">
            {shortcuts.map((shortcut, index) => (
              <div
                key={shortcut.id}
                draggable={isEditing}
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`
                  relative group flex flex-col items-center gap-2 p-4 rounded-xl transition-all
                  ${dragOverIndex === index ? 'bg-cyan-500/20 scale-105' : 'hover:bg-slate-800/50'}
                  ${isEditing ? 'cursor-move' : 'cursor-pointer'}
                `}
                onClick={() => !isEditing && onNavigate(shortcut.url)}
              >
                {isEditing && (
                  <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
                    <button
                      onClick={(e) => { e.stopPropagation(); setEditingShortcut(shortcut); }}
                      className="p-1 rounded bg-cyan-500/20 text-cyan-400 hover:bg-cyan-500/30"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); handleDeleteShortcut(shortcut.id); }}
                      className="p-1 rounded bg-red-500/20 text-red-400 hover:bg-red-500/30"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                {isEditing && (
                  <GripVertical className="w-3 h-3 text-slate-600 absolute top-2 left-2" />
                )}

                <div className={`
                  w-12 h-12 rounded-lg bg-slate-900 border border-slate-800 flex items-center justify-center
                  ${isEditing ? 'group-hover:scale-110' : ''} transition-all duration-300
                `}>
                  {shortcut.icon ? (
                    <img src={shortcut.icon} alt={shortcut.name} className="w-8 h-8" />
                  ) : (
                    <span className={`text-lg font-semibold ${shortcut.color}`}>
                      {shortcut.name.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <span className="text-xs text-slate-400 text-center truncate w-full">
                  {shortcut.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {showAddModal && (
        <AddShortcutModal
          onClose={() => setShowAddModal(false)}
          onAdd={handleAddShortcut}
          colors={colors}
        />
      )}

      {editingShortcut && (
        <EditShortcutModal
          shortcut={editingShortcut}
          onClose={() => setEditingShortcut(null)}
          onSave={handleUpdateShortcut}
          colors={colors}
        />
      )}
    </div>
  );
};

interface AddShortcutModalProps {
  onClose: () => void;
  onAdd: (shortcut: Omit<Shortcut, 'id'>) => void;
  colors: string[];
}

const AddShortcutModal: React.FC<AddShortcutModalProps> = ({ onClose, onAdd, colors }) => {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [color, setColor] = useState(colors[0]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !url) return;
    onAdd({ name, url, color });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Add Shortcut</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="e.g., Wikipedia"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              placeholder="https://wikipedia.org"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg bg-slate-800 border-2 ${c} ${color === c ? 'border-cyan-500' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">Add</button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditShortcutModalProps {
  shortcut: Shortcut;
  onClose: () => void;
  onSave: (shortcut: Shortcut) => void;
  colors: string[];
}

const EditShortcutModal: React.FC<EditShortcutModalProps> = ({ shortcut, onClose, onSave, colors }) => {
  const [name, setName] = useState(shortcut.name);
  const [url, setUrl] = useState(shortcut.url);
  const [color, setColor] = useState(shortcut.color);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ ...shortcut, name, url, color });
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-slate-900 border border-slate-700 rounded-xl p-6 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <h3 className="text-lg font-semibold text-white mb-4">Edit Shortcut</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1">URL</label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-cyan-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-2">Color</label>
            <div className="flex flex-wrap gap-2">
              {colors.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={`w-8 h-8 rounded-lg bg-slate-800 border-2 ${c} ${color === c ? 'border-cyan-500' : 'border-transparent'}`}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-3 justify-end">
            <button type="button" onClick={onClose} className="px-4 py-2 text-slate-400 hover:text-white transition-colors">Cancel</button>
            <button type="submit" className="px-4 py-2 bg-cyan-500 hover:bg-cyan-600 text-white rounded-lg transition-colors">Save</button>
          </div>
        </form>
      </div>
    </div>
  );
};

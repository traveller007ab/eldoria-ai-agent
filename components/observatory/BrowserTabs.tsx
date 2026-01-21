import React, { useState } from 'react';
import { Plus, X, Globe, Lock, Loader2, Pin } from 'lucide-react';
import { useBrowserStore, BrowserTab } from '../../stores/browserStore';

interface TabItemProps {
  tab: BrowserTab;
  isActive: boolean;
  onSelect: () => void;
  onClose: (e: React.MouseEvent) => void;
  onPin: () => void;
  onUnpin: () => void;
}

const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose, onPin, onUnpin }) => {
  const [isDragging, setIsDragging] = useState(false);

  const getHostname = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return '';
    }
  };

  return (
    <div
      draggable
      onClick={onSelect}
      onDragStart={() => setIsDragging(true)}
      onDragEnd={() => setIsDragging(false)}
      className={`
        group relative flex items-center gap-2 px-3 py-2 min-w-[100px] max-w-[180px] 
        cursor-pointer select-none transition-all duration-200 border-r border-slate-700/30
        ${isActive
          ? 'bg-slate-800/80 text-cyan-100 shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.7)]'
          : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
        }
        ${isDragging ? 'opacity-50' : ''}
      `}
      title={tab.title || tab.url}
    >
      <div className="flex-shrink-0 flex items-center gap-1">
        {tab.isLoading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
        ) : tab.favicon ? (
          <img src={tab.favicon} alt="" className="w-3.5 h-3.5" onError={(e) => (e.currentTarget.style.display = 'none')} />
        ) : tab.url.startsWith('https') ? (
          <Lock className="w-3 h-3 text-emerald-500" />
        ) : (
          <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
        )}
      </div>

      <span className="flex-1 text-xs truncate font-medium">
        {tab.isPinned ? getHostname(tab.url) || 'Pinned' : (tab.title || 'New Tab')}
      </span>

      <div className="flex items-center gap-1">
        <button
          onClick={(e) => { e.stopPropagation(); tab.isPinned ? onUnpin() : onPin(); }}
          className="p-0.5 rounded opacity-0 group-hover:opacity-100 transition-opacity hover:bg-slate-700 text-slate-500 hover:text-cyan-400"
          title={tab.isPinned ? 'Unpin' : 'Pin'}
        >
          <Pin className={`w-3 h-3 ${tab.isPinned ? 'fill-cyan-400 text-cyan-400' : ''}`} />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onClose(e); }}
          className={`
            flex-shrink-0 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
            hover:bg-red-500/20 hover:text-red-400
            ${isActive ? 'opacity-100' : ''}
          `}
          title="Close tab"
        >
          <X className="w-3 h-3" />
        </button>
      </div>

      {isActive && (
        <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
      )}
    </div>
  );
};

export const BrowserTabs: React.FC = () => {
  const { tabs, activeTabId, setActiveTab, closeTab, addTab, pinTab, unpinTab, moveTab } = useBrowserStore();
  const [dragOverTabId, setDragOverTabId] = useState<string | null>(null);
  const [draggedTabId, setDraggedTabId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, tabId: string) => {
    setDraggedTabId(tabId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, tabId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== tabId) {
      setDragOverTabId(tabId);
    }
  };

  const handleDragLeave = () => {
    setDragOverTabId(null);
  };

  const handleDrop = (e: React.DragEvent, targetTabId: string) => {
    e.preventDefault();
    if (draggedTabId && draggedTabId !== targetTabId) {
      const sourceIndex = tabs.findIndex(t => t.id === draggedTabId);
      const targetIndex = tabs.findIndex(t => t.id === targetTabId);
      if (sourceIndex >= 0 && targetIndex >= 0) {
        moveTab(draggedTabId, targetIndex);
      }
    }
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleDragEnd = () => {
    setDraggedTabId(null);
    setDragOverTabId(null);
  };

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    if (tabs.length === 1) {
      e.stopPropagation();
      closeTab(tabId);
      setTimeout(() => addTab(), 50);
    } else {
      e.stopPropagation();
      closeTab(tabId);
    }
  };

  return (
    <div className="flex items-center w-full h-10 bg-slate-950 border-b border-slate-800/50 overflow-hidden select-none">
      <div className="flex-1 flex overflow-x-auto no-scrollbar items-end h-full pt-1 pl-1">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            draggable
            onDragStart={(e) => handleDragStart(e, tab.id)}
            onDragOver={(e) => handleDragOver(e, tab.id)}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, tab.id)}
            onDragEnd={handleDragEnd}
            className={`
              ${dragOverTabId === tab.id ? 'bg-cyan-500/20' : ''}
              transition-colors
            `}
          >
            <TabItem
              tab={tab}
              isActive={tab.id === activeTabId}
              onSelect={() => setActiveTab(tab.id)}
              onClose={(e) => handleCloseTab(e, tab.id)}
              onPin={() => pinTab(tab.id)}
              onUnpin={() => unpinTab(tab.id)}
            />
          </div>
        ))}

        <button
          onClick={() => addTab()}
          className="ml-1 p-1.5 rounded-md text-slate-400 hover:text-cyan-400 hover:bg-slate-800/50 transition-colors"
          title="New Tab"
        >
          <Plus className="w-4 h-4" />
        </button>
      </div>

      <div className="w-2" />
    </div>
  );
};

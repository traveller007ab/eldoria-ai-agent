import React from 'react';
import { X, Globe, Lock, AlertCircle, Loader2 } from 'lucide-react';
import { BrowserTab } from '../../stores/browserStore';

interface TabItemProps {
    tab: BrowserTab;
    isActive: boolean;
    onSelect: () => void;
    onClose: (e: React.MouseEvent) => void;
}

export const TabItem: React.FC<TabItemProps> = ({ tab, isActive, onSelect, onClose }) => {
    return (
        <div
            onClick={onSelect}
            className={`
        group relative flex items-center gap-2 px-3 py-2 min-w-[120px] max-w-[200px] 
        cursor-pointer select-none transition-all duration-200 border-r border-slate-700/30
        ${isActive
                    ? 'bg-slate-800/80 text-cyan-100 shadow-[inset_0_-2px_0_0_rgba(34,211,238,0.7)]'
                    : 'bg-slate-900/40 text-slate-400 hover:bg-slate-800/50 hover:text-slate-200'
                }
      `}
            title={tab.title || tab.url}
        >
            {/* Favicon or Icon */}
            <div className="flex-shrink-0">
                {tab.isLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                ) : tab.favicon ? (
                    <img src={tab.favicon} alt="" className="w-3.5 h-3.5" onError={(e) => (e.currentTarget.style.display = 'none')} />
                ) : (
                    <Globe className={`w-3.5 h-3.5 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                )}
            </div>

            {/* Title */}
            <span className="flex-1 text-xs truncate font-medium">
                {tab.title || 'New Tab'}
            </span>

            {/* Close Button - Visible on hover or active */}
            <button
                onClick={onClose}
                className={`
          flex-shrink-0 p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity
          hover:bg-red-500/20 hover:text-red-400
          ${isActive ? 'opacity-100' : ''}
        `}
            >
                <X className="w-3 h-3" />
            </button>

            {/* Active Indicator Gradient (Top) */}
            {isActive && (
                <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent" />
            )}
        </div>
    );
};

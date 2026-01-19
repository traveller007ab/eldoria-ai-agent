
import React from 'react';
import { Minus, Square, X, Layout, Compass } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';
import { useLocation } from 'react-router-dom';

export const TitleBar: React.FC = () => {
    // Check if we are in Electron to determine if we should show controls
    // But since this is a custom override, we should probably always show them if we can confirm functionality
    // OR we rely on window.eldoriaDesktop

    const { workspaceMode, setWorkspaceMode } = useWorkspace();
    const location = useLocation();
    const isHome = location.pathname === '/';

    const handleMinimize = () => window.eldoriaDesktop?.minimize();
    const handleMaximize = () => window.eldoriaDesktop?.maximize();
    const handleClose = () => window.eldoriaDesktop?.close();

    // Use black/40 to match Sidebar, or fixed dark slate to ensure coverage
    // User requested "match the sidebar", which is bg-black/40
    // But if we want to cover the phantom bar, we should use non-transparent OR ensure sidebar covers it
    // The phantom bar was Cyan. To hide it, we need solid color or z-index
    // Let's use standard dark color matching the app background #0a0a0f

    return (
        <div
            className="fixed top-0 left-0 right-0 h-8 bg-black/40 backdrop-blur-md flex items-center justify-between px-2 z-[100000] select-none border-b border-cyan-500/10"
            style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
        >
            <div className="flex items-center gap-2 pl-2 w-1/3">
                {/* Optional: Add Logo or Text if needed. User screenshot had "Eldoria AI IDE" */}
                <span className="text-xs font-bold text-cyan-500/60 uppercase tracking-widest pointer-events-none">Eldoria AI IDE</span>
            </div>

            {/* Center Toggle - Only on Home */}
            <div className="flex justify-center w-1/3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                {isHome && (
                    <div className="flex items-center bg-slate-800/80 rounded-md p-0.5 border border-slate-700/50">
                        <button
                            onClick={() => setWorkspaceMode('classic')}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${workspaceMode === 'classic'
                                ? 'bg-cyan-500/20 text-cyan-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                            title="Classic IDE"
                        >
                            <Layout className="w-3 h-3" />
                            <span>Classic</span>
                        </button>
                        <button
                            onClick={() => setWorkspaceMode('canvas')}
                            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-[10px] font-medium transition-all ${workspaceMode === 'canvas'
                                ? 'bg-emerald-500/20 text-emerald-400 shadow-sm'
                                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
                                }`}
                            title="Canvas Workspace"
                        >
                            <Compass className="w-3 h-3" />
                            <span>Canvas</span>
                        </button>
                    </div>
                )}
            </div>

            <div className="flex items-center justify-end h-full w-1/3" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={handleMinimize}
                    className="h-full w-10 flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <Minus className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full w-10 flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <Square className="w-3 h-3" />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full w-10 flex items-center justify-center hover:bg-red-500 hover:text-white text-slate-400 transition-colors"
                >
                    <X className="w-3.5 h-3.5" />
                </button>
            </div>
        </div>
    );
};

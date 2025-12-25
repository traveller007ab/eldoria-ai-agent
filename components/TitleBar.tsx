
import React from 'react';
import { Minus, Square, X } from 'lucide-react';

export const TitleBar: React.FC = () => {
    // Check if we are in Electron to determine if we should show controls
    // But since this is a custom override, we should probably always show them if we can confirm functionality
    // OR we rely on window.eldoriaDesktop

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
            <div className="flex items-center gap-2 pl-2">
                {/* Optional: Add Logo or Text if needed. User screenshot had "Eldoria AI IDE" */}
                <span className="text-xs font-bold text-cyan-500/60 uppercase tracking-widest pointer-events-none">Eldoria AI IDE</span>
            </div>

            <div className="flex items-center h-full" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
                <button
                    onClick={handleMinimize}
                    className="h-full w-12 flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <Minus className="w-4 h-4" />
                </button>
                <button
                    onClick={handleMaximize}
                    className="h-full w-12 flex items-center justify-center hover:bg-white/5 text-slate-400 hover:text-white transition-colors"
                >
                    <Square className="w-3.5 h-3.5" />
                </button>
                <button
                    onClick={handleClose}
                    className="h-full w-12 flex items-center justify-center hover:bg-red-500 hover:text-white text-slate-400 transition-colors"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>
        </div>
    );
};

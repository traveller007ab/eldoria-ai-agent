import React, { memo } from 'react';

export const TechnicalGrid = memo(() => {
    return (
        <div className="absolute inset-0 pointer-events-none select-none z-0 bg-slate-900/50">
            {/* CSS-based Grid for better performance than complex SVGs */}
            <div className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(148, 163, 184, 0.05) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148, 163, 184, 0.05) 1px, transparent 1px)
                    `,
                    backgroundSize: '20px 20px'
                }}
            />
            <div className="absolute inset-0"
                style={{
                    backgroundImage: `
                        linear-gradient(to right, rgba(148, 163, 184, 0.1) 1px, transparent 1px),
                        linear-gradient(to bottom, rgba(148, 163, 184, 0.1) 1px, transparent 1px)
                    `,
                    backgroundSize: '100px 100px'
                }}
            />

            {/* Decorative CAD elements */}
            <div className="absolute top-4 left-4 border-l-2 border-t-2 border-slate-700 w-8 h-8 opacity-50" />
            <div className="absolute top-4 right-4 border-r-2 border-t-2 border-slate-700 w-8 h-8 opacity-50" />
            <div className="absolute bottom-4 left-4 border-l-2 border-b-2 border-slate-700 w-8 h-8 opacity-50" />
            <div className="absolute bottom-4 right-4 border-r-2 border-b-2 border-slate-700 w-8 h-8 opacity-50" />

            {/* Subtle Crosshairs */}
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[200px] h-[1px] bg-cyan-500/10" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-[200px] bg-cyan-500/10" />
        </div>
    );
});

import React, { memo } from 'react';

// Simple SVG Gear Path
const GearIcon = ({ size, className, teeth = 8 }: { size: number, className?: string, teeth?: number }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M12 15C13.6569 15 15 13.6569 15 12C15 10.3431 13.6569 9 12 9C10.3431 9 9 10.3431 9 12C9 13.6569 10.3431 15 12 15Z" />
        <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.48 2 2 6.48 2 12C2 17.52 6.48 22 12 22C17.52 22 22 17.52 22 12C22 6.48 17.52 2 12 2ZM12 4C16.42 4 20 7.58 20 12C20 16.42 16.42 20 12 20C7.58 20 4 16.42 4 12C4 7.58 7.58 4 12 4Z" opacity="0.5" />
        <path d="M19.07 4.93L17.66 6.34C17.27 5.95 16.84 5.6 16.39 5.29L16.95 3.39C17.72 3.82 18.43 4.34 19.07 4.93ZM20.61 7.05L18.71 7.61C18.4 7.16 18.05 6.73 17.66 6.34L19.07 4.93C19.66 5.57 20.18 6.28 20.61 7.05ZM20.61 16.95C20.18 17.72 19.66 18.43 19.07 19.07L17.66 17.66C18.05 17.27 18.4 16.84 18.71 16.39L20.61 16.95ZM16.39 18.71C16.84 18.4 17.27 18.05 17.66 17.66L19.07 19.07C18.43 19.66 17.72 20.18 16.95 20.61L16.39 18.71ZM7.05 3.39L7.61 5.29C7.16 5.6 6.73 5.95 6.34 6.34L4.93 4.93C5.57 4.34 6.28 3.82 7.05 3.39ZM4.93 19.07L6.34 17.66C6.73 18.05 7.16 18.4 7.61 18.71L7.05 20.61C6.28 20.18 5.57 19.66 4.93 19.07ZM3.39 7.05C3.82 6.28 4.34 5.57 4.93 4.93L6.34 6.34C5.95 6.73 5.6 7.16 5.29 7.61L3.39 7.05ZM3.39 16.95L5.29 16.39C5.6 16.84 5.95 17.27 6.34 17.66L4.93 19.07C4.34 18.43 3.82 17.72 3.39 16.95Z" />
    </svg>
);

const BoltIcon = ({ size, className }: { size: number, className?: string }) => (
    <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="currentColor"
        className={className}
        xmlns="http://www.w3.org/2000/svg"
    >
        <path d="M11 2L7 11H3L13 22L17 13H21L11 2Z" />
    </svg>
);

// Predefined positions to look aesthetically pleasing
// (Not truly random to avoid overlap/messiness)
const gears = [
    { id: 1, x: '5%', y: '10%', size: 300, opacity: 0.03, duration: '60s', dir: 'normal' },
    { id: 2, x: '85%', y: '80%', size: 400, opacity: 0.04, duration: '80s', dir: 'reverse' },
    { id: 3, x: '15%', y: '85%', size: 200, opacity: 0.02, duration: '40s', dir: 'normal' },
    { id: 4, x: '80%', y: '5%', size: 250, opacity: 0.03, duration: '50s', dir: 'reverse' },
    { id: 5, x: '45%', y: '50%', size: 600, opacity: 0.02, duration: '120s', dir: 'normal' },
];

export const GearBackground = memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0">
            {gears.map(g => (
                <div
                    key={g.id}
                    className="absolute text-slate-400 flex items-center justify-center"
                    style={{
                        left: g.x,
                        top: g.y,
                        width: g.size,
                        height: g.size,
                        opacity: g.opacity,
                        animation: `spin ${g.duration} linear infinite`,
                        animationDirection: g.dir
                    }}
                >
                    <GearIcon size={g.size} />
                </div>
            ))}

            {/* Scattered Hex Nuts for texture */}
            <div className="absolute left-[30%] top-[20%] opacity-[0.02] text-slate-400 rotate-12">
                <BoltIcon size={40} />
            </div>
            <div className="absolute left-[70%] top-[60%] opacity-[0.02] text-slate-400 -rotate-45">
                <BoltIcon size={60} />
            </div>

            <style>
                {`
                    @keyframes spin {
                        from { transform: translate(-50%, -50%) rotate(0deg); }
                        to { transform: translate(-50%, -50%) rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
});

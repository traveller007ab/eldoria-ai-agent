import React from 'react';

export const NexusBackground: React.FC = () => {
    return (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {/* Ambient Background Effects (Transparent Overlay) */}
            <NexusBackgroundEffects />

            {/* Vignette effect */}
            <div
                className="absolute inset-0"
                style={{
                    background: 'radial-gradient(ellipse at center, transparent 30%, rgba(2, 6, 23, 0.5) 100%)'
                }}
            />
        </div>
    );
};

const MechanicalElement: React.FC<{
    type: 'gear' | 'bolt' | 'nut';
    size: number;
    top?: string;
    bottom?: string;
    left?: string;
    right?: string;
    speed: number;
    delay?: number;
}> = ({ type, size, top, bottom, left, right, speed, delay = 0 }) => {
    const rotationStyle = {
        animation: `spin ${Math.abs(speed)}s linear infinite ${speed < 0 ? 'reverse' : 'normal'}`,
        animationDelay: `${delay}s`,
    };

    return (
        <div
            className="absolute select-none pointer-events-none transition-all duration-1000"
            style={{ top, bottom, left, right, width: size, height: size }}
        >
            <div style={rotationStyle} className="w-full h-full">
                {type === 'gear' && <GearSVG />}
                {type === 'bolt' && <BoltSVG />}
                {type === 'nut' && <NutSVG />}
            </div>
        </div>
    );
};

const GearSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-cyan-500/20 stroke-cyan-400/30 stroke-1">
        <circle cx="50" cy="50" r="15" />
        <path d="M50 0 L55 15 A40 40 0 0 1 65 18 L75 5 L85 15 L72 25 A40 40 0 0 1 75 35 L90 40 L90 55 L75 60 A40 40 0 0 1 72 70 L85 80 L75 90 L65 77 A40 40 0 0 1 55 80 L50 95 L40 95 L35 80 A40 40 0 0 1 25 77 L15 90 L5 80 L18 70 A40 40 0 0 1 15 60 L0 55 L0 40 L15 35 A40 40 0 0 1 18 25 L5 15 L15 5 L25 18 A40 40 0 0 1 35 15 L40 0 Z" fillRule="evenodd" />
    </svg>
);

const BoltSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-slate-500/20 stroke-slate-400/30 stroke-1">
        <polygon points="50,5 90,25 90,75 50,95 10,75 10,25" />
        <circle cx="50" cy="50" r="15" fill="none" />
        <line x1="35" y1="50" x2="65" y2="50" strokeWidth="2" />
    </svg>
);

const NutSVG = () => (
    <svg viewBox="0 0 100 100" className="w-full h-full fill-emerald-500/20 stroke-emerald-400/30 stroke-1">
        <rect x="25" y="25" width="50" height="50" rx="5" />
        <circle cx="50" cy="50" r="10" />
    </svg>
);

const NexusBackgroundEffects: React.FC = () => (
    <>
        {/* Animated gradient orbs */}
        <div
            className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full opacity-20 blur-[100px] animate-pulse"
            style={{
                background: 'radial-gradient(circle, rgba(34, 211, 238, 0.4) 0%, transparent 70%)',
                animationDuration: '8s'
            }}
        />
        <div
            className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] rounded-full opacity-15 blur-[120px] animate-pulse"
            style={{
                background: 'radial-gradient(circle, rgba(16, 185, 129, 0.3) 0%, transparent 70%)',
                animationDuration: '10s',
                animationDelay: '2s'
            }}
        />

        {/* Grid pattern */}
        <div
            className="absolute inset-0 opacity-[0.03]"
            style={{
                backgroundImage: `
                    linear-gradient(rgba(34, 211, 238, 0.2) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(34, 211, 238, 0.2) 1px, transparent 1px)
                `,
                backgroundSize: '80px 80px'
            }}
        />

        {/* Scan lines */}
        <div className="absolute inset-0 opacity-[0.01] pointer-events-none bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] bg-[length:100%_4px,3px_100%]" />
    </>
);

export default NexusBackground;

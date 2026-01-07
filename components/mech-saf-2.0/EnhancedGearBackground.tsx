import React, { memo } from 'react';

// Technical Wireframe Gear
const TechGear = ({ size, className, teeth = 12, duration = '60s', direction = 'normal', opacity = 0.1 }: any) => (
    <div
        className={`absolute flex items-center justify-center ${className}`}
        style={{
            width: size,
            height: size,
            opacity: opacity,
            animation: `spin ${duration} linear infinite`,
            animationDirection: direction
        }}
    >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-full h-full text-slate-400">
            {/* Outer Ring */}
            <circle cx="50" cy="50" r="48" strokeDasharray="4 2" />

            {/* Gear Teeth Ring */}
            <path d={`
                M 50 5 
                ${Array.from({ length: teeth }).map((_, i) => {
                const angle = (i * 360) / teeth;
                const rad = (angle * Math.PI) / 180;
                const nextAngle = ((i + 0.5) * 360) / teeth;
                const nextRad = (nextAngle * Math.PI) / 180;
                // Simplified tooth path projection
                return `L ${50 + 45 * Math.sin(rad)} ${50 - 45 * Math.cos(rad)} 
                            L ${50 + 45 * Math.sin(nextRad)} ${50 - 45 * Math.cos(nextRad)}`;
            }).join(' ')}
                Z
            `} strokeWidth="1" />

            {/* Inner Hubs */}
            <circle cx="50" cy="50" r="20" strokeWidth="1" />
            <circle cx="50" cy="50" r="8" strokeWidth="2" />

            {/* Spokes */}
            <path d="M 50 10 L 50 90 M 10 50 L 90 50" strokeWidth="0.5" />
        </svg>
    </div>
);

const HexNut = ({ size, x, y, rotation = 0 }: any) => (
    <svg
        style={{ left: x, top: y, transform: `rotate(${rotation}deg)` }}
        className="absolute text-slate-600 opacity-10"
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
    >
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
        <circle cx="12" cy="12" r="5" />
    </svg>
);

export const EnhancedGearBackground = memo(() => {
    return (
        <div className="absolute inset-0 overflow-hidden pointer-events-none select-none z-0 bg-slate-950/50">
            {/* Gradient Overlay for Vignette */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(15,23,42,0.8)_100%)]" />

            {/* Large Framing Gears (Wireframe Style) */}
            <TechGear size={600} className="-left-40 -top-40" duration="120s" direction="normal" opacity={0.08} teeth={24} />
            <TechGear size={500} className="-right-20 -bottom-20" duration="90s" direction="reverse" opacity={0.07} teeth={18} />

            {/* Smaller Detail Gears */}
            <TechGear size={200} className="right-[20%] top-[10%]" duration="45s" direction="normal" opacity={0.05} teeth={12} />
            <TechGear size={150} className="left-[15%] bottom-[20%]" duration="35s" direction="reverse" opacity={0.05} teeth={8} />

            {/* Floating Nuts/Bolts */}
            <HexNut size={24} x="10%" y="40%" rotation={15} />
            <HexNut size={32} x="90%" y="60%" rotation={45} />
            <HexNut size={20} x="60%" y="15%" rotation={30} />

            <style>
                {`
                    @keyframes spin {
                        from { transform: rotate(0deg); }
                        to { transform: rotate(360deg); }
                    }
                `}
            </style>
        </div>
    );
});

import React, { memo } from 'react';
import { motion } from 'framer-motion';

// --- Assets ---

/** 
 * Reusable Gear SVG 
 */
const TechGear = ({ size, className, teeth = 12, duration = 60, direction = 1, opacity = 0.1, color = "text-slate-400" }: any) => (
    <motion.div
        className={`absolute flex items-center justify-center ${className} ${color}`}
        style={{ width: size, height: size, opacity }}
        animate={{ rotate: direction * 360 }}
        transition={{ duration, repeat: Infinity, ease: "linear" }}
    >
        <svg viewBox="0 0 100 100" fill="none" stroke="currentColor" strokeWidth="0.5" className="w-full h-full">
            {/* Outer Ring */}
            <circle cx="50" cy="50" r="48" strokeDasharray="4 2" />

            {/* Gear Teeth */}
            <path d={`
                M 50 5 
                ${Array.from({ length: teeth }).map((_, i) => {
                const angle = (i * 360) / teeth;
                const rad = (angle * Math.PI) / 180;
                const nextAngle = ((i + 0.5) * 360) / teeth;
                const nextRad = (nextAngle * Math.PI) / 180;
                return `L ${50 + 45 * Math.sin(rad)} ${50 - 45 * Math.cos(rad)} 
                        L ${50 + 45 * Math.sin(nextRad)} ${50 - 45 * Math.cos(nextRad)}`;
            }).join(' ')}
                Z
            `} strokeWidth="1" />

            {/* Inner Hubs */}
            <circle cx="50" cy="50" r="20" strokeWidth="1" />
            <circle cx="50" cy="50" r="8" strokeWidth="2" />
            <path d="M 50 10 L 50 90 M 10 50 L 90 50" strokeWidth="0.5" />
        </svg>
    </motion.div>
);

/**
 * Hex Nut SVG
 */
const HexNut = ({ size, x, y, duration = 20, delay = 0 }: any) => (
    <motion.svg
        style={{ left: x, top: y }}
        className="absolute text-slate-500 opacity-[0.08]"
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        animate={{
            y: [0, -20, 0],
            rotate: [0, 45, 0],
            opacity: [0.05, 0.1, 0.05]
        }}
        transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay
        }}
    >
        <path d="M12 2L21 7V17L12 22L3 17V7L12 2Z" />
        <circle cx="12" cy="12" r="5" />
    </motion.svg>
);

/**
 * Bolt SVG
 */
const Bolt = ({ size, x, y, duration = 25, delay = 5 }: any) => (
    <motion.svg
        style={{ left: x, top: y }}
        className="absolute text-slate-500 opacity-[0.08]"
        width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"
        animate={{
            y: [0, -30, 0],
            rotate: [0, -30, 0],
        }}
        transition={{
            duration,
            repeat: Infinity,
            ease: "easeInOut",
            delay
        }}
    >
        <path d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z" />
        <path d="M12 4v4" />
        <path d="M17 17l-1-1" />
        <path d="M7 17l1-1" />
        <path d="M12 20v-4" />
        <path d="M7 7l1 1" />
        <path d="M17 7l-1 1" />
        <circle cx="12" cy="12" r="10" />
    </motion.svg>
);

/**
 * Main Background Component
 */
export const MechanicalBackground = memo(() => {
    return (
        <div className="fixed inset-0 overflow-hidden pointer-events-none select-none z-[-1] bg-slate-950">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-900 to-slate-950" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(2,6,23,0.8)_100%)]" />

            {/* --- Large Framing Gears --- */}
            <TechGear size={800} className="-left-40 -top-40" duration={120} direction={1} opacity={0.03} teeth={32} />
            <TechGear size={600} className="-right-20 -bottom-20" duration={90} direction={-1} opacity={0.03} teeth={24} />

            {/* --- Medium Details --- */}
            <TechGear size={300} className="right-[15%] top-[10%]" duration={45} direction={1} opacity={0.04} teeth={16} />
            <TechGear size={250} className="left-[10%] bottom-[30%]" duration={50} direction={-1} opacity={0.04} teeth={12} />

            {/* --- Small Accent Gears --- */}
            <TechGear size={120} className="left-[40%] top-[20%]" duration={30} direction={1} opacity={0.02} teeth={8} />
            <TechGear size={100} className="right-[40%] bottom-[20%]" duration={35} direction={-1} opacity={0.02} teeth={8} />

            {/* --- Floating Hardware --- */}
            <HexNut size={32} x="20%" y="30%" duration={15} delay={0} />
            <HexNut size={48} x="85%" y="70%" duration={20} delay={2} />
            <HexNut size={24} x="50%" y="85%" duration={18} delay={4} />

            <Bolt size={40} x="75%" y="25%" duration={22} delay={1} />
            <Bolt size={30} x="15%" y="65%" duration={25} delay={3} />
            <Bolt size={20} x="35%" y="15%" duration={19} delay={5} />

            {/* --- Grid Overlay --- */}
            <div
                className="absolute inset-0 opacity-[0.03]"
                style={{
                    backgroundImage: `linear-gradient(to right, #ffffff 1px, transparent 1px), linear-gradient(to bottom, #ffffff 1px, transparent 1px)`,
                    backgroundSize: '40px 40px'
                }}
            />
        </div>
    );
});

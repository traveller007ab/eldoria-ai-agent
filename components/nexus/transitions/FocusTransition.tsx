/**
 * FocusTransition - Animated transition wrapper for Focus Modes
 * 
 * Handles the cinematic "zoom in" effect when entering a room
 * and the "zoom out" effect when returning to canvas.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexusStore, ViewMode } from '../../../stores/useNexusStore';
import { Home, X } from 'lucide-react';

interface FocusTransitionProps {
    children: React.ReactNode;
    roomType: ViewMode;
    roomLabel: string;
    accentColor: 'cyan' | 'emerald' | 'purple' | 'amber';
}

const colorMap = {
    cyan: {
        bg: 'bg-cyan-500/10',
        border: 'border-cyan-500/20',
        text: 'text-cyan-400',
        glow: 'rgba(34, 211, 238, 0.3)',
    },
    emerald: {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/20',
        text: 'text-emerald-400',
        glow: 'rgba(16, 185, 129, 0.3)',
    },
    purple: {
        bg: 'bg-purple-500/10',
        border: 'border-purple-500/20',
        text: 'text-purple-400',
        glow: 'rgba(139, 92, 246, 0.3)',
    },
    amber: {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/20',
        text: 'text-amber-400',
        glow: 'rgba(245, 158, 11, 0.3)',
    },
};

export const FocusTransition: React.FC<FocusTransitionProps> = ({
    children,
    roomType,
    roomLabel,
    accentColor
}) => {
    const { viewMode, exitRoom, focusedNodeId, getNodeById, isZenMode, toggleZenMode } = useNexusStore();
    const node = focusedNodeId ? getNodeById(focusedNodeId) : null;
    const colors = colorMap[accentColor];
    const isActive = viewMode === roomType;

    return (
        <AnimatePresence mode="wait">
            {isActive && (
                <motion.div
                    key={roomType}
                    className={`fixed inset-0 bg-slate-950 ${isZenMode ? 'z-[100000]' : 'z-50 pl-16'}`}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{
                        duration: 0.4,
                        ease: [0.22, 1, 0.36, 1] // Custom easing for smooth feel
                    }}
                >
                    {/* Entry flash effect */}
                    <motion.div
                        className="absolute inset-0 pointer-events-none"
                        initial={{ opacity: 0.5 }}
                        animate={{ opacity: 0 }}
                        transition={{ duration: 0.6 }}
                        style={{
                            background: `radial-gradient(circle at center, ${colors.glow} 0%, transparent 70%)`
                        }}
                    />

                    {/* Room Header - Offset by TitleBar height (h-8) */}
                    <AnimatePresence>
                        {!isZenMode && (
                            <motion.div
                                className="absolute top-8 left-0 right-0 z-50 h-14 bg-slate-900/80 backdrop-blur-md border-b border-white/5"
                                style={{ left: isZenMode ? 0 : '4rem' }} // 4rem = 16 (matches sidebar width)
                                initial={{ y: -56 }}
                                animate={{ y: 0 }}
                                exit={{ y: -70 }}
                                transition={{ duration: 0.3 }}
                            >
                                <div className="h-full flex items-center justify-between px-6">
                                    {/* Left: Exit Button */}
                                    <motion.button
                                        onClick={exitRoom}
                                        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-full text-sm font-medium text-slate-300 hover:text-white transition-all group"
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Home className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                        <span>Exit to Canvas</span>
                                    </motion.button>

                                    {/* Center: Room Label */}
                                    <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                                        <div className={`flex items-center gap-2 px-4 py-1.5 ${colors.bg} border ${colors.border} rounded-full`}>
                                            <div className={`w-2 h-2 rounded-full ${colors.text.replace('text-', 'bg-')} animate-pulse`} />
                                            <span className={`text-xs font-bold ${colors.text} uppercase tracking-widest`}>
                                                {roomLabel}
                                            </span>
                                        </div>
                                        {node && (
                                            <span className="text-sm text-slate-400">
                                                — {(node.data as any).name || (node.data as any).title || 'Untitled'}
                                            </span>
                                        )}
                                    </div>

                                    {/* Right: Close Button */}
                                    <motion.button
                                        onClick={exitRoom}
                                        className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Room Content */}
                    <motion.div
                        className={`h-full transition-all duration-500 ${isZenMode ? 'pt-0' : 'pt-[88px]'}`} // 32px (TitleBar) + 56px (RoomBar)
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25, duration: 0.35 }}
                    >
                        {children}
                    </motion.div>

                    {/* Quick Zen Toggle (Visible only when hovering bottom or in Zen mode) */}
                    {isZenMode && (
                        <motion.button
                            onClick={toggleZenMode}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2 bg-slate-900/80 backdrop-blur-md border border-white/10 rounded-full text-[10px] font-black uppercase tracking-widest text-slate-500 hover:text-cyan-400 transition-all shadow-2xl"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            whileHover={{ scale: 1.05 }}
                        >
                            Exit Zen Mode
                        </motion.button>
                    )}
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FocusTransition;

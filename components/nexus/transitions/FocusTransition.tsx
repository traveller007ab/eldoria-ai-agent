/**
 * FocusTransition - DIGITAL GARDEN AESTHETIC
 * 
 * "THE FRAME"
 * Light/Dark compatible wrapper.
 */

import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNexusStore, ViewMode } from '../../../stores/useNexusStore';
import { ArrowLeft, Maximize2, Minimize2, Moon, Sun } from 'lucide-react';

interface FocusTransitionProps {
    children: React.ReactNode;
    roomType: ViewMode;
    roomLabel: string;
    accentColor: 'cyan' | 'emerald' | 'purple' | 'amber' | 'slate';
}

const colorMap = {
    cyan: 'text-teal-600 dark:text-teal-400',
    emerald: 'text-emerald-600 dark:text-emerald-400',
    purple: 'text-violet-600 dark:text-violet-400',
    amber: 'text-amber-600 dark:text-amber-400',
    slate: 'text-stone-600 dark:text-stone-400',
};

const dotMap = {
    cyan: 'bg-teal-500',
    emerald: 'bg-emerald-500',
    purple: 'bg-violet-500',
    amber: 'bg-amber-500',
    slate: 'bg-stone-500',
};

export const FocusTransition: React.FC<FocusTransitionProps> = ({
    children,
    roomType,
    roomLabel,
    accentColor
}) => {
    const {
        viewMode, exitRoom, focusedNodeId, getNodeById,
        isZenMode, toggleZenMode, isDarkMode, toggleDarkMode
    } = useNexusStore();

    const node = focusedNodeId ? getNodeById(focusedNodeId) : null;
    const isActive = viewMode === roomType;

    const textColor = colorMap[accentColor] || 'text-stone-600 dark:text-stone-400';
    const dotColor = dotMap[accentColor] || 'bg-stone-500';

    const transition = { duration: 0.4, ease: "easeInOut" } as any;

    // Background changes based on theme
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]' // Deep charcoal for Moonlit Garden
        : 'bg-gradient-to-br from-stone-100 to-stone-200'; // Warm stone for Sunlit Garden

    return (
        <AnimatePresence mode="wait">
            {isActive && (
                <motion.div
                    key={roomType}
                    className={`fixed top-8 bottom-0 right-0 left-16 z-50 flex flex-col ${bgClass} transition-colors duration-500`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                >
                    {/* Header Bar */}
                    <AnimatePresence>
                        {!isZenMode && (
                            <motion.header
                                className={`h-14 border-b flex items-center justify-between px-4 md:px-6 shrink-0 z-[60] backdrop-blur-xl transition-colors duration-500
                                    ${isDarkMode
                                        ? 'bg-[#151518]/70 border-white/[0.06]'
                                        : 'bg-white/70 border-stone-200/50'
                                    }`}
                                initial={{ y: -56 }}
                                animate={{ y: 0 }}
                                exit={{ y: -56 }}
                                transition={transition}
                            >
                                {/* Left: Back */}
                                <button
                                    onClick={exitRoom}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all group
                                        ${isDarkMode
                                            ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                            : 'text-stone-500 hover:text-stone-800 hover:bg-stone-100'
                                        }`}
                                >
                                    <ArrowLeft className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                                    <span className="text-sm font-medium">Back</span>
                                </button>

                                {/* Center: Identity */}
                                <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-3">
                                    <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full shadow-sm border transition-colors duration-500
                                        ${isDarkMode
                                            ? 'bg-[#1A1A1D]/80 border-white/[0.06]'
                                            : 'bg-white/80 border-stone-200/50'
                                        }`}>
                                        <div className={`w-2 h-2 rounded-full ${dotColor}`} />
                                        <span className={`text-sm font-semibold ${textColor}`}>{roomLabel}</span>
                                    </div>
                                    {node && (
                                        <span className={`text-sm hidden md:inline transition-colors duration-500
                                            ${isDarkMode ? 'text-zinc-500' : 'text-stone-400'}
                                        `}>
                                            {(node.data as any).name || (node.data as any).title || 'Untitled'}
                                        </span>
                                    )}
                                </div>

                                {/* Right: Controls */}
                                <div className="flex items-center gap-2">
                                    {/* Theme Toggle */}
                                    <button
                                        onClick={toggleDarkMode}
                                        className={`p-2 rounded-xl transition-all
                                            ${isDarkMode
                                                ? 'text-amber-400 hover:bg-white/[0.06]'
                                                : 'text-violet-600 hover:bg-stone-100'
                                            }`}
                                        title={isDarkMode ? "Switch to Sunlit Garden" : "Switch to Moonlit Garden"}
                                    >
                                        {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                                    </button>

                                    {/* Zen Toggle */}
                                    <button
                                        onClick={toggleZenMode}
                                        className={`p-2 rounded-xl transition-all
                                            ${isDarkMode
                                                ? 'text-zinc-400 hover:text-zinc-200 hover:bg-white/[0.06]'
                                                : 'text-stone-400 hover:text-stone-700 hover:bg-stone-100'
                                            }`}
                                        title="Toggle Zen Mode"
                                    >
                                        <Maximize2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </motion.header>
                        )}
                    </AnimatePresence>

                    {/* Stage */}
                    <motion.main
                        className="flex-1 relative w-full h-full overflow-hidden" // Removed redundant layout constraints
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ ...transition, delay: 0.1 } as any}
                    >
                        {children}

                        {/* Exit Zen Button */}
                        <AnimatePresence>
                            {isZenMode && (
                                <motion.button
                                    className={`absolute top-4 right-4 p-2.5 backdrop-blur-md rounded-xl shadow-lg transition-all z-[100]
                                        ${isDarkMode
                                            ? 'bg-[#151518]/80 text-zinc-400 hover:text-white'
                                            : 'bg-white/80 text-stone-500 hover:text-stone-800'
                                        }`}
                                    onClick={toggleZenMode}
                                    initial={{ opacity: 0, scale: 0.9 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                >
                                    <Minimize2 className="w-4 h-4" />
                                </motion.button>
                            )}
                        </AnimatePresence>
                    </motion.main>
                </motion.div>
            )}
        </AnimatePresence>
    );
};

export default FocusTransition;

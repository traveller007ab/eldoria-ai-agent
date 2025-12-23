
import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { EldoriaLogo } from '../Icons';
import { useWorkspace } from '../../context/WorkspaceContext';

export const SplashScreen: React.FC = () => {
    const { isLowPerfMode } = useWorkspace();
    const [messageIndex, setMessageIndex] = useState(0);
    const messages = [
        "Awakening EmeraldMind...",
        "Initializing Strategic Intelligence...",
        "Syncing Neural Channels...",
        "Calibrating Sentient Core...",
        "Optimizing Research Pathways..."
    ];

    useEffect(() => {
        const interval = setInterval(() => {
            setMessageIndex((prev) => (prev + 1) % messages.length);
        }, 800);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="fixed inset-0 z-[9999] bg-[#0c1a3e] flex flex-col items-center justify-center overflow-hidden text-cyan-400">
            {/* Particle Field (CSS) - Disabled in Low-Perf Mode */}
            {!isLowPerfMode && (
                <div className="absolute inset-0 overflow-hidden pointer-events-none opacity-40">
                    {[...Array(20)].map((_, i) => (
                        <div
                            key={i}
                            className="absolute bg-cyan-400 rounded-full blur-[2px] animate-float"
                            style={{
                                width: Math.random() * 4 + 'px',
                                height: Math.random() * 4 + 'px',
                                left: Math.random() * 100 + '%',
                                top: Math.random() * 100 + '%',
                                animationDelay: Math.random() * 5 + 's',
                                animationDuration: (Math.random() * 10 + 10) + 's'
                            }}
                        />
                    ))}
                </div>
            )}

            {/* Glowing Aura */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-cyan-500/10 blur-[120px] rounded-full animate-pulse-slow"></div>

            {/* Logo & Content */}
            <div className="relative flex flex-col items-center">
                <div className="w-24 h-24 mb-10 relative">
                    <div className="absolute inset-0 bg-cyan-500/20 blur-xl rounded-full animate-pulse"></div>
                    <EldoriaLogo className="w-full h-full relative drop-shadow-[0_0_15px_rgba(34,211,238,0.5)] animate-draw" />
                </div>

                <h1 className="text-3xl font-black text-cyan-100 uppercase tracking-[0.5em] mb-4 text-glow">
                    ELDORIA
                </h1>

                <div className="flex flex-col items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Loader2 className="w-4 h-4 text-cyan-500 animate-spin" />
                        <p className="text-sm font-bold text-cyan-400/80 uppercase tracking-widest min-w-[280px] text-center transition-all duration-300">
                            {messages[messageIndex]}
                        </p>
                    </div>
                    <div className="w-48 h-0.5 bg-cyan-500/10 rounded-full overflow-hidden">
                        <div className="h-full bg-cyan-500/40 animate-progress"></div>
                    </div>
                </div>
            </div>

            <style>{`
                @keyframes progress {
                    0% { width: 0%; }
                    100% { width: 100%; }
                }
                .animate-progress {
                    animation: progress 3.5s linear infinite;
                }
                .animate-pulse-slow {
                    animation: pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite;
                }
                .animate-float {
                    animation: float linear infinite;
                }
                @keyframes float {
                    0% { transform: translateY(0) translateX(0) scale(1); }
                    50% { transform: translateY(-50px) translateX(20px) scale(1.2); }
                    100% { transform: translateY(-100px) translateX(0) scale(1); }
                }
                .text-glow {
                    text-shadow: 0 0 20px rgba(34,211,238,0.4);
                }
                @keyframes draw {
                    from { stroke-dasharray: 0 300; }
                    to { stroke-dasharray: 300 0; }
                }
                .animate-draw {
                    stroke-dasharray: 300;
                    animation: draw 2s ease-in-out forwards;
                }
            `}</style>
        </div>
    );
};

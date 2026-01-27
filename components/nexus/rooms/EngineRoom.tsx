/**
 * EngineRoom - DIGITAL GARDEN AESTHETIC (Themed)
 * 
 * "THE WORKBENCH"
 * Supports Sunlit and Moonlit modes.
 * Wraps the complex MechLabLayout in the Garden aesthetics.
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Play, Pause, RotateCcw, Settings2, Gauge, Zap, Activity } from 'lucide-react';
import { useNexusStore } from '../../../stores/useNexusStore';
import { MechLabLayout } from '../../mech-saf-2.0/MechLabLayout';
import { useMechStore } from '../../../stores/useMechStore';
import { ProjectService } from '../../../services/ProjectService';


interface EngineRoomProps {
    nodeId: string;
}

export const EngineRoom: React.FC<EngineRoomProps> = ({ nodeId }) => {
    const node = useNexusStore((state) => state.nodes.find((n) => n.id === nodeId));
    const setBlueprint = useMechStore((state) => state.setBlueprint);
    const { isDarkMode } = useNexusStore();

    React.useEffect(() => {
        if (node?.data?.type === 'blueprint' && node.data.blueprintId) {
            const blueprint = ProjectService.loadBlueprint(node.data.blueprintId);
            if (blueprint) {
                setBlueprint(blueprint);
            }
        }
    }, [node, setBlueprint]);

    if (!node) return null;

    // Theme Variables
    const bgClass = isDarkMode
        ? 'bg-[#0F0F12]'
        : 'bg-gradient-to-br from-stone-100 via-stone-200 to-emerald-50/50';

    return (
        <div className={`h-full w-full ${bgClass} p-4 md:p-6 flex flex-col transition-colors duration-500`}>
            {/* Main Stage wrapped in GlassCard */}
            <GlassCard className="flex-1 flex flex-col overflow-hidden" isDark={isDarkMode}>
                {/* Header / Toolbar Area */}
                <div className={`shrink-0 px-6 py-3 border-b flex items-center justify-between ${isDarkMode ? 'border-white/[0.06]' : 'border-stone-200/50'}`}>
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isDarkMode ? 'bg-cyan-500/20 text-cyan-400' : 'bg-cyan-100 text-cyan-700'}`}>
                            <Gauge className="w-5 h-5" />
                        </div>
                        <div>
                            <h2 className={`text-sm font-semibold ${isDarkMode ? 'text-zinc-200' : 'text-stone-800'}`}>
                                Engineering Workbench
                            </h2>
                            <p className={`text-xs ${isDarkMode ? 'text-zinc-500' : 'text-stone-500'}`}>
                                Simulation Kernel V3.0
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        <span className={`px-2 py-1 rounded text-xs font-mono
                            ${isDarkMode ? 'text-emerald-400 bg-emerald-500/10' : 'text-emerald-600 bg-emerald-100'}`}>
                            ACTIVE
                        </span>
                    </div>
                </div>

                {/* Content - MechLab */}
                <div className="flex-1 overflow-hidden relative bg-transparent">
                    {/* 
                        MechLabLayout likely has its own dark background. 
                        We might need to override it or just let it be a "terminal" window inside.
                        For now, we just contain it cleanly.
                     */}
                    <MechLabLayout hideHeader />
                </div>

                {/* Footer Status */}
                <div className={`px-6 py-2 border-t flex items-center justify-between text-xs font-mono
                    ${isDarkMode ? 'border-white/[0.06] bg-black/20 text-zinc-500' : 'border-stone-200/50 bg-white/30 text-stone-500'}`}>
                    <div className="flex items-center gap-4">
                        <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5" />
                            Latency: 4ms
                        </span>
                        <span>Threads: 8</span>
                    </div>
                    <div>
                        ID: {nodeId.slice(0, 8)}
                    </div>
                </div>
            </GlassCard>
        </div>
    );
};

// --- Subcomponents ---

const GlassCard = ({ children, className = '', isDark = false }: any) => (
    <div className={`
        relative backdrop-blur-xl rounded-2xl border transition-colors duration-500 flex flex-col
        shadow-[0_8px_32px_rgba(0,0,0,0.08)]
        ${isDark
            ? 'bg-[#151518]/70 border-white/[0.06]'
            : 'bg-white/70 border-white/80'
        }
        ${className}
    `}>
        {/* Bracket Connectors - Cyan for Engine Mode */}
        <div className={`absolute -left-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-r-0 rounded-l-full opacity-60 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-cyan-500' : 'border-cyan-400'}`}
        />
        <div className={`absolute -right-1.5 top-1/2 -translate-y-1/2 w-1.5 h-16 border-2 border-l-0 rounded-r-full opacity-60 pointer-events-none transition-colors duration-500
            ${isDark ? 'border-cyan-500' : 'border-cyan-400'}`}
        />

        <div className="relative z-10 flex-1 flex flex-col overflow-hidden">{children}</div>
    </div>
);

export default EngineRoom;

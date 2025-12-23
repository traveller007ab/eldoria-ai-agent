
import React from 'react';
import { Baby, Hammer, Rocket, Info } from 'lucide-react';
import { useWorkspace } from '../../context/WorkspaceContext';

interface UserLevelModalProps {
    onSelect: (level: 'newbie' | 'intermediate' | 'expert') => void;
}

export const UserLevelModal: React.FC<UserLevelModalProps> = ({ onSelect }) => {
    const { setUserLevel } = useWorkspace();

    const tiers = [
        {
            id: 'newbie',
            icon: <Baby className="w-8 h-8 text-emerald-400" />,
            title: "First-Time User",
            desc: "I've never used Eldoria before.",
            tip: "Mandatory 8-min Masterclass Tour",
            color: "border-emerald-500/20 hover:border-emerald-500/50 bg-emerald-500/5 hover:bg-emerald-500/10",
        },
        {
            id: 'intermediate',
            icon: <Hammer className="w-8 h-8 text-cyan-400" />,
            title: "Intermediate",
            desc: "I know the basics but want a refresher.",
            tip: "Optional 5-min Selective Refresher",
            color: "border-cyan-500/20 hover:border-cyan-500/50 bg-cyan-500/5 hover:bg-cyan-500/10",
        },
        {
            id: 'expert',
            icon: <Rocket className="w-8 h-8 text-purple-400" />,
            title: "Expert User",
            desc: "I'm familiar with all features.",
            tip: "Skip to Workspace (Retake anytime in Settings)",
            color: "border-purple-500/20 hover:border-purple-500/50 bg-purple-500/5 hover:bg-purple-500/10",
        }
    ] as const;

    const handleSelect = (level: 'newbie' | 'intermediate' | 'expert') => {
        setUserLevel(level);
        onSelect(level);
    };

    return (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center p-6 bg-[#0c1a3e]/80 backdrop-blur-xl animate-in fade-in duration-500">
            <div className="max-w-4xl w-full">
                <div className="text-center mb-12 animate-in slide-in-from-bottom-4 duration-700">
                    <h2 className="text-3xl font-black text-white uppercase tracking-[0.2em] mb-4 text-glow">
                        Identify Your Clearance
                    </h2>
                    <p className="text-cyan-400/60 font-medium tracking-widest uppercase text-xs">
                        Select your expertise level to tailor the Eldoria Awakening sequence
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {tiers.map((tier, i) => (
                        <button
                            key={tier.id}
                            onClick={() => handleSelect(tier.id)}
                            className={`group relative p-8 rounded-[2rem] border transition-all duration-500 flex flex-col items-center text-center animate-in slide-in-from-bottom-8 fill-mode-backwards ${tier.color}`}
                            style={{ animationDelay: `${i * 150}ms` }}
                        >
                            <div className="p-4 bg-black/40 rounded-2xl mb-6 group-hover:scale-110 transition-transform duration-500 border border-white/5 shadow-inner">
                                {tier.icon}
                            </div>

                            <h3 className="text-lg font-bold text-white mb-2 uppercase tracking-tight">
                                {tier.title}
                            </h3>
                            <p className="text-xs text-cyan-100/40 mb-6 leading-relaxed">
                                {tier.desc}
                            </p>

                            <div className="mt-auto pt-6 border-t border-white/5 w-full flex items-center justify-center gap-2">
                                <Info className="w-3 h-3 text-cyan-500/40" />
                                <span className="text-[10px] font-bold text-cyan-500/60 uppercase tracking-widest">
                                    {tier.tip}
                                </span>
                            </div>

                            {/* Hover Glow */}
                            <div className="absolute inset-0 rounded-[2rem] opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none shadow-[0_0_30px_rgba(34,211,238,0.1)]"></div>
                        </button>
                    ))}
                </div>

                <div className="mt-12 text-center text-[10px] text-white/20 uppercase tracking-[0.4em]">
                    Sentient Protocol AI-IDE • Phase 21 Awakening
                </div>
            </div>

            <style>{`
                .text-glow {
                    text-shadow: 0 0 20px rgba(255,255,255,0.2);
                }
            `}</style>
        </div>
    );
};

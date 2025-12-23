import React, { useMemo } from 'react';
import { AcademicWizardState } from '../types';
import { Target, List, Settings, BarChart3, ArrowRight, Zap } from 'lucide-react';

interface ResearchMapProps {
    state: AcademicWizardState;
}

export const ResearchMap: React.FC<ResearchMapProps> = ({ state }) => {
    const nodes = useMemo(() => {
        const list = [];

        // Root: Aim
        list.push({
            id: 'aim',
            label: state.basics.title || 'Untitled Research',
            type: 'aim',
            description: state.objectives.aim,
            icon: Target,
            color: 'text-cyan-400',
            bgColor: 'bg-cyan-500/10',
            borderColor: 'border-cyan-500/30'
        });

        // Objectives
        state.objectives.specificObjectives.forEach((obj, i) => {
            if (obj.trim()) {
                list.push({
                    id: `obj-${i}`,
                    label: `Objective ${i + 1}`,
                    type: 'objective',
                    description: obj,
                    parentId: 'aim',
                    icon: List,
                    color: 'text-emerald-400',
                    bgColor: 'bg-emerald-500/10',
                    borderColor: 'border-emerald-500/30'
                });
            }
        });

        // Methodology
        list.push({
            id: 'method',
            label: 'Methodology',
            type: 'method',
            description: state.methodology.methods,
            parentId: 'aim',
            icon: Settings,
            color: 'text-orange-400',
            bgColor: 'bg-orange-500/10',
            borderColor: 'border-orange-500/30'
        });

        // Results/Impact
        list.push({
            id: 'impact',
            label: 'Scientific Impact',
            type: 'impact',
            description: state.scope.significance,
            parentId: 'method',
            icon: BarChart3,
            color: 'text-purple-400',
            bgColor: 'bg-purple-500/10',
            borderColor: 'border-purple-500/30'
        });

        return list;
    }, [state]);

    return (
        <div className="relative p-6 bg-black/40 border border-cyan-500/10 rounded-2xl overflow-hidden min-h-[400px]">
            {/* Background Grid Pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #22d3ee 1px, transparent 1px)', backgroundSize: '30px 30px' }}></div>

            {/* Connection Lines (Simulated with CSS) */}
            <div className="absolute inset-0 flex items-center justify-center opacity-20 pointer-events-none">
                <div className="w-full h-px bg-gradient-to-r from-transparent via-cyan-500/50 to-transparent rotate-45"></div>
                <div className="w-full h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent -rotate-45"></div>
            </div>

            <div className="relative z-10 flex flex-col items-center gap-12">
                {/* Aim Node */}
                <div className="animate-in fade-in slide-in-from-top duration-700">
                    <NodeCard node={nodes[0]} isRoot />
                </div>

                {/* Objectives & Logic Layer */}
                <div className="flex flex-wrap justify-center gap-6 w-full">
                    {nodes.slice(1).map((node, i) => (
                        <div key={node.id} className="animate-in fade-in zoom-in duration-500" style={{ animationDelay: `${(i + 1) * 150}ms` }}>
                            <div className="relative">
                                {/* Connector Pipe */}
                                <div className="absolute -top-6 left-1/2 -translate-x-1/2 w-0.5 h-6 bg-gradient-to-b from-cyan-500/20 to-transparent"></div>
                                <NodeCard node={node} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Legend/Status */}
            <div className="absolute bottom-4 left-4 flex gap-4">
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-cyan-400"></div>
                    <span className="text-[8px] font-bold text-cyan-500/60 uppercase tracking-widest">Cognitive Aim</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
                    <span className="text-[8px] font-bold text-emerald-500/60 uppercase tracking-widest">Valid Logic</span>
                </div>
            </div>

            {/* Pulse Indicator */}
            <div className="absolute top-4 right-4 flex items-center gap-2 px-2 py-1 bg-cyan-500/5 border border-cyan-500/20 rounded-full animate-pulse">
                <Zap className="w-2.5 h-2.5 text-cyan-400" />
                <span className="text-[8px] font-bold text-cyan-400 uppercase tracking-widest leading-none">Live Neural Map</span>
            </div>
        </div>
    );
};

const NodeCard: React.FC<{ node: any; isRoot?: boolean }> = ({ node, isRoot }) => (
    <div className={`p-4 ${node.bgColor} border ${node.borderColor} rounded-2xl w-56 group hover:border-cyan-400/50 hover:shadow-[0_0_20px_rgba(34,211,238,0.1)] transition-all cursor-default`}>
        <div className="flex items-start gap-3 mb-2">
            <div className={`p-2 rounded-lg ${node.bgColor} ${node.color}`}>
                <node.icon className="w-4 h-4" />
            </div>
            <div>
                <div className={`text-[10px] font-black uppercase tracking-widest ${node.color}`}>{node.label}</div>
                <div className="text-[8px] text-cyan-500/40 uppercase font-bold">{node.type}</div>
            </div>
        </div>
        <p className="text-[10px] text-cyan-100/60 line-clamp-2 leading-relaxed italic group-hover:text-cyan-100 transition-colors">
            {node.description || 'Pending architectural definition...'}
        </p>

        {isRoot && (
            <div className="mt-3 pt-3 border-t border-cyan-500/10 flex items-center justify-between">
                <span className="text-[8px] font-bold text-cyan-500/40 uppercase">Complexity: High</span>
                <ArrowRight className="w-3 h-3 text-cyan-500/20" />
            </div>
        )}
    </div>
);

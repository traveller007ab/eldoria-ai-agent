import React, { useMemo } from 'react';
import { AcademicProject } from '../types';
import { Calendar, CheckCircle2, Circle, Clock, Rocket, Flag, AlertCircle } from 'lucide-react';

interface ProjectTimelineProps {
    project: AcademicProject;
}

export const ProjectTimeline: React.FC<ProjectTimelineProps> = ({ project }) => {
    const milestones = useMemo(() => {
        const createdAt = new Date(project.created_at);
        const steps = [
            { id: 'proposal', label: 'Proposal Definition', weight: 15, status: project.wizard_state.basics.title ? 'complete' : 'pending', date: createdAt.toLocaleDateString() },
            { id: 'literature', label: 'Literature Review', weight: 20, status: (project.references || []).length > 2 ? 'complete' : 'in-progress', date: new Date(createdAt.getTime() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString() },
            { id: 'methodology', label: 'Methodology Design', weight: 20, status: project.wizard_state.methodology.methods ? 'complete' : 'pending', date: new Date(createdAt.getTime() + 14 * 24 * 60 * 60 * 1000).toLocaleDateString() },
            { id: 'synthesis', label: 'AI Synthesis', weight: 25, status: Object.keys(project.draft_content).length >= 5 ? 'complete' : Object.keys(project.draft_content).length > 0 ? 'in-progress' : 'pending', date: new Date(createdAt.getTime() + 21 * 24 * 60 * 60 * 1000).toLocaleDateString() },
            { id: 'review', label: 'Expert Review', weight: 10, status: project.draft_content['Chapter 5: Conclusion & Recommendations'] ? 'complete' : 'pending', date: new Date(createdAt.getTime() + 28 * 24 * 60 * 60 * 1000).toLocaleDateString() },
            { id: 'submission', label: 'Final Submission', weight: 10, status: 'pending', date: new Date(createdAt.getTime() + 35 * 24 * 60 * 60 * 1000).toLocaleDateString() }
        ];
        return steps;
    }, [project]);

    const totalProgress = useMemo(() => {
        if (milestones.every(m => m.status === 'pending')) return 0;
        return milestones.reduce((acc, m) => {
            if (m.status === 'complete') return acc + m.weight;
            if (m.status === 'in-progress') return acc + (m.weight / 2);
            return acc;
        }, 0);
    }, [milestones]);

    const targetDate = useMemo(() => {
        const createdAt = new Date(project.created_at);
        return new Date(createdAt.getTime() + 45 * 24 * 60 * 60 * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }, [project.created_at]);

    const velocity = useMemo(() => {
        const chaptersCount = Object.keys(project.draft_content).length;
        if (chaptersCount > 4) return "1.4x (High)";
        if (chaptersCount > 2) return "1.1x (Stable)";
        return "1.0x (Optimal)";
    }, [project.draft_content]);

    return (
        <div className="bg-black/40 border border-cyan-500/10 rounded-2xl overflow-hidden">
            <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-cyan-400" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-cyan-100">Neural Timeline</span>
                </div>
                <div className={`flex items-center gap-1.5 px-2 py-0.5 border rounded-full transition-all ${totalProgress > 0 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-cyan-500/10 border-cyan-500/20 text-cyan-400'}`}>
                    <Clock className="w-2.5 h-2.5" />
                    <span className="text-[8px] font-bold uppercase tracking-tighter">
                        {totalProgress > 0 ? 'Project Active' : 'Awaiting Sequence'}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Progress Bar */}
                <div className="space-y-2">
                    <div className="flex justify-between items-end">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-widest">Global Completion</span>
                        <span className="text-sm font-black text-cyan-200">{Math.round(totalProgress)}%</span>
                    </div>
                    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-cyan-500 to-emerald-500 transition-all duration-1000"
                            style={{ width: `${totalProgress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Milestones */}
                <div className="space-y-4 relative">
                    {/* Vertical Line */}
                    <div className="absolute left-[11px] top-2 bottom-2 w-px bg-cyan-500/10"></div>

                    {milestones.map((m, i) => (
                        <div key={m.id} className="relative flex items-start gap-4 animate-in slide-in-from-left duration-500" style={{ animationDelay: `${i * 100}ms` }}>
                            <div className={`relative z-10 w-6 h-6 flex items-center justify-center rounded-full border transition-all ${m.status === 'complete' ? 'bg-emerald-500/20 border-emerald-500/40 text-emerald-400' :
                                m.status === 'in-progress' ? 'bg-cyan-500/20 border-cyan-500/40 text-cyan-400 animate-pulse' :
                                    'bg-black/40 border-white/10 text-white/10'
                                }`}>
                                {m.status === 'complete' ? <CheckCircle2 className="w-3.5 h-3.5" /> :
                                    m.status === 'in-progress' ? <Rocket className="w-3.5 h-3.5" /> :
                                        <Circle className="w-3 h-3 fill-current" />}
                            </div>

                            <div className="flex-grow">
                                <div className="flex justify-between items-start">
                                    <div className={`text-[10px] font-bold uppercase tracking-tight ${m.status === 'pending' ? 'text-white/10' : 'text-cyan-100'
                                        }`}>{m.label}</div>
                                    <div className="text-[8px] font-black text-white/10 uppercase tracking-widest">{m.date}</div>
                                </div>
                                <div className="text-[8px] text-cyan-500/40 uppercase font-medium mt-0.5">
                                    {m.status === 'complete' ? 'Node Consolidated' : m.status === 'in-progress' ? 'Processing Inference...' : 'Inert Node'}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Dynamic Recommendation */}
                {totalProgress < 100 && (
                    <div className="p-4 bg-orange-500/5 border border-orange-500/10 rounded-xl flex items-start gap-3">
                        <AlertCircle className="w-4 h-4 text-orange-400 shrink-0" />
                        <p className="text-[9px] text-orange-300/60 leading-relaxed italic">
                            {totalProgress === 0 ? "Project is in initial dormancy. Complete the Research Wizard to activate the first node." :
                                totalProgress < 50 ? "Research momentum established. Prioritize Literature Synthesis to increase completion velocity." :
                                    "Final chapters detected. Prepare for expert defense deck generation."}
                        </p>
                    </div>
                )}
            </div>

            <div className="p-4 bg-cyan-500/5 border-t border-cyan-500/10 flex items-center justify-between text-[8px] uppercase font-bold tracking-widest">
                <div className="flex items-center gap-1">
                    <Flag className="w-2.5 h-2.5 text-cyan-400" />
                    <span className="text-cyan-500/40">Target Date: <span className="text-cyan-200">{targetDate}</span></span>
                </div>
                <span className="text-emerald-400">Velocity: {velocity}</span>
            </div>
        </div>
    );
};

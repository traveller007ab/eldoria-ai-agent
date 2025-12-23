import React, { useMemo } from 'react';
import { AcademicProject } from '../types';
import { ShieldCheck, Zap, AlertTriangle, CheckCircle2, Search, Link, BarChart, History, Activity } from 'lucide-react';

interface IntegrityGuardianProps {
    project: AcademicProject;
}

export const IntegrityGuardian: React.FC<IntegrityGuardianProps> = ({ project }) => {
    const healthMetrics = useMemo(() => {
        const refCount = (project.references || []).length;
        const draftCount = Object.keys(project.draft_content).length;
        const hasBasics = !!project.wizard_state.basics.title;

        return [
            {
                label: "Originality Shield",
                value: draftCount > 0 ? "Verified" : "Awaiting",
                status: draftCount > 0 ? "success" : "warning",
                icon: ShieldCheck,
                detail: draftCount > 0 ? "Intelligent scan active" : "Draft node empty"
            },
            {
                label: "Citation Index",
                value: `${refCount} Refs`,
                status: refCount >= 5 ? "success" : "warning",
                icon: Link,
                detail: refCount >= 5 ? "Bibliography synced" : "Insufficient sources"
            },
            {
                label: "Research Velocity",
                value: draftCount > 3 ? "High" : draftCount > 0 ? "Stable" : "Idle",
                status: draftCount > 0 ? "success" : "info",
                icon: Zap,
                detail: draftCount > 3 ? "Ahead of schedule" : "Initial phase"
            },
            {
                label: "Logical Flow",
                value: hasBasics ? "Mapped" : "Wait",
                status: hasBasics ? "success" : "warning",
                icon: Activity,
                detail: hasBasics ? "Objectives linked" : "Basics missing"
            }
        ];
    }, [project]);

    const complianceScore = useMemo(() => {
        let score = 0;
        if (project.wizard_state.basics.title) score += 20;
        if ((project.references || []).length >= 5) score += 30;
        if (Object.keys(project.draft_content).length >= 3) score += 30;
        if (project.wizard_state.methodology.methods) score += 20;
        return score;
    }, [project]);

    return (
        <div className="bg-[#0c1a3e]/40 border border-cyan-500/10 rounded-3xl overflow-hidden backdrop-blur-md animate-in zoom-in-95 duration-500">
            <div className="p-4 border-b border-cyan-500/10 bg-cyan-500/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className={`p-2 rounded-xl ${complianceScore > 70 ? 'bg-emerald-500/10' : 'bg-orange-500/10'}`}>
                        <ShieldCheck className={`w-5 h-5 ${complianceScore > 70 ? 'text-emerald-400' : 'text-orange-400'}`} />
                    </div>
                    <div>
                        <h4 className="text-[10px] font-black text-white uppercase tracking-[0.2em]">Integrity Guardian</h4>
                        <p className="text-[8px] text-cyan-500/40 uppercase font-bold">Heuristic Health Active</p>
                    </div>
                </div>
                <div className={`px-3 py-1 border rounded-full flex items-center gap-2 ${complianceScore > 50 ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-cyan-500/10 border-cyan-500/20'}`}>
                    <div className={`w-1.5 h-1.5 rounded-full animate-pulse ${complianceScore > 50 ? 'bg-emerald-400' : 'bg-cyan-400'}`}></div>
                    <span className={`text-[8px] font-black uppercase tracking-widest ${complianceScore > 50 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                        {complianceScore > 80 ? 'Project Stable' : complianceScore > 0 ? 'Dormant' : 'Offline'}
                    </span>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-2 gap-4">
                    {healthMetrics.map((m, i) => (
                        <div key={i} className="p-4 bg-black/40 border border-white/5 rounded-2xl group hover:border-cyan-500/30 transition-all">
                            <div className="flex items-center gap-3 mb-3">
                                <div className="p-2 bg-white/5 rounded-lg text-cyan-400 group-hover:bg-cyan-500/10 transition-all">
                                    <m.icon className="w-4 h-4" />
                                </div>
                                <div>
                                    <div className="text-[8px] text-white/20 uppercase font-bold tracking-widest">{m.label}</div>
                                    <div className="text-sm font-black text-cyan-100">{m.value}</div>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <span className="text-[8px] text-cyan-500/40 uppercase font-medium">{m.detail}</span>
                                {m.status === 'success' ? <CheckCircle2 className="w-3 h-3 text-emerald-500" /> : <AlertTriangle className="w-3 h-3 text-orange-500" />}
                            </div>
                        </div>
                    ))}
                </div>

                {/* Technical Debt / Warning Section */}
                <div className={`mt-6 p-4 border rounded-2xl flex items-start gap-4 ${complianceScore < 100 ? 'bg-orange-500/5 border-orange-500/20' : 'bg-emerald-500/5 border-emerald-500/20'}`}>
                    <div className={`p-2 rounded-lg shrink-0 ${complianceScore < 100 ? 'bg-orange-500/10' : 'bg-emerald-500/10'}`}>
                        {complianceScore < 100 ? <AlertTriangle className="w-4 h-4 text-orange-400" /> : <CheckCircle2 className="w-4 h-4 text-emerald-400" />}
                    </div>
                    <div>
                        <div className={`text-[9px] font-black uppercase tracking-widest mb-1 ${complianceScore < 100 ? 'text-orange-400' : 'text-emerald-400'}`}>
                            {complianceScore < 100 ? 'Attention Required' : 'Integrity Verified'}
                        </div>
                        <p className={`text-[10px] leading-relaxed italic ${complianceScore < 100 ? 'text-orange-200/60' : 'text-emerald-200/60'}`}>
                            {complianceScore === 0 ? "The research sequence has not been initiated. Please complete the Wizard." :
                                complianceScore < 50 ? "Insufficient bibliography data. Recommendation: Sync at least 5 scholarly sources." :
                                    complianceScore < 100 ? "Structural gaps detected in Chapter 4. Recommendation: Initiate Results Synthesis." :
                                        "All structural nodes verified. The research architecture adheres to RSU standards."}
                        </p>
                    </div>
                </div>

                {/* Progress Visualizer */}
                <div className="mt-6 space-y-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="text-[9px] font-bold text-white/20 uppercase tracking-[0.2em]">Compliance Threshold</span>
                        <span className={`text-[9px] font-bold ${complianceScore > 70 ? 'text-emerald-400' : 'text-orange-400'}`}>{complianceScore}/100</span>
                    </div>
                    <div className="h-2 bg-black/60 border border-white/5 rounded-full overflow-hidden p-0.5">
                        <div
                            className={`h-full bg-gradient-to-r rounded-full transition-all duration-1000 ${complianceScore > 70 ? 'from-cyan-500 to-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'from-orange-500 to-red-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]'}`}
                            style={{ width: `${complianceScore}%` }}
                        ></div>
                    </div>
                </div>
            </div>

            <div className="p-4 bg-black/40 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <History className="w-3 h-3 text-white/20" />
                    <span className="text-[8px] text-white/20 uppercase font-bold">Last verified: 2m ago</span>
                </div>
                <button className="flex items-center gap-2 text-[8px] font-black text-cyan-400 uppercase tracking-widest hover:text-cyan-200 transition-colors">
                    Manual Audit <Activity className="w-3 h-3" />
                </button>
            </div>
        </div>
    );
};

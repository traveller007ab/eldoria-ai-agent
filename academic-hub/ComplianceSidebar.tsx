import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, InfoIcon, Loader2, ExternalLink, HeartPulse, History, FileText } from 'lucide-react';
import { AcademicProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { checkOriginality, generateComplianceReport, ComplianceReport } from '../services/academicService';
import { ProjectTimeline } from './ProjectTimeline';
import { IntegrityGuardian } from './IntegrityGuardian';

interface ComplianceSidebarProps {
    project: AcademicProject | null;
}

export const ComplianceSidebar: React.FC<ComplianceSidebarProps> = ({ project }) => {
    const { runManualCommand } = useWorkspace();
    const [auditResults, setAuditResults] = useState<ComplianceReport | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [scanResults, setScanResults] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<'audit' | 'timeline' | 'guardian'>('audit');

    useEffect(() => {
        if (!project) {
            setAuditResults(null);
            return;
        }

        // Run real compliance scoring
        const timer = setTimeout(() => {
            setIsAuditing(true);
            try {
                const report = generateComplianceReport(project);
                setAuditResults(report);
            } catch (e) {
                console.error("Compliance report failed", e);
            } finally {
                setIsAuditing(false);
            }
        }, 500);

        return () => clearTimeout(timer);
    }, [project?.wizard_state, project?.draft_content]);

    const handleInitiateScan = async () => {
        if (!project) return;
        setIsScanning(true);
        try {
            const allContent = Object.values(project.draft_content || {}).join('\n\n');
            const result = await checkOriginality(allContent);
            setScanResults(result);
        } catch (e) {
            console.error("Scan failed", e);
        } finally {
            setIsScanning(false);
        }
    };

    if (!project) {
        return (
            <div className="panel flex-grow flex flex-col items-center justify-center text-cyan-500/20 p-8 text-center italic">
                <ShieldCheck className="w-12 h-12 mb-4 opacity-5" />
                <p className="text-[10px] uppercase tracking-widest leading-loose">Select a project to initiate compliance monitoring.</p>
            </div>
        );
    }

    const score = auditResults?.score || 0;
    const checks = auditResults?.checks || [
        { label: "Title Definition", status: "info", detail: "Awaiting title..." },
        { label: "SMART Objectives", status: "info", detail: "Awaiting objectives..." },
        { label: "Execution Plan", status: "info", detail: "Awaiting methodology..." },
        { label: "Technical Results", status: "info", detail: "Awaiting Chapter 4..." },
        { label: "Thesis Concluding", status: "info", detail: "Awaiting final chapters..." }
    ];
    const totalWordCount = auditResults?.totalWordCount || 0;
    const wordCountByChapter = auditResults?.wordCountByChapter || {};


    return (
        <div className="panel flex-grow flex flex-col overflow-hidden">
            <div className="p-2 border-b border-cyan-500/10 bg-black/40 flex items-center gap-1">
                <button
                    onClick={() => setActiveTab('audit')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'audit' ? 'bg-cyan-500/20 text-cyan-200' : 'text-cyan-500/40 hover:text-cyan-300'}`}
                >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Audit
                </button>
                <button
                    onClick={() => setActiveTab('timeline')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'timeline' ? 'bg-emerald-500/20 text-emerald-200' : 'text-cyan-500/40 hover:text-emerald-300'}`}
                >
                    <History className="w-3.5 h-3.5" />
                    Timeline
                </button>
                <button
                    onClick={() => setActiveTab('guardian')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'guardian' ? 'bg-purple-500/20 text-purple-200' : 'text-cyan-500/40 hover:text-purple-300'}`}
                >
                    <HeartPulse className="w-3.5 h-3.5" />
                    Guardian
                </button>
            </div>

            <div className="flex-grow overflow-y-auto custom-scrollbar p-0">
                {activeTab === 'audit' && (
                    <div className="p-4 space-y-6">
                        {/* Overall Score */}
                        <div className="relative h-32 flex flex-col items-center justify-center">
                            <svg className="w-24 h-24 transform -rotate-90">
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-cyan-500/10" />
                                <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray="251.2" strokeDashoffset={251.2 * (1 - (score / 100))} className="text-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] transition-all duration-1000" />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-2xl font-black text-emerald-400">{score}%</span>
                                <span className="text-[8px] font-bold text-emerald-500/50 uppercase tracking-widest">Compliant</span>
                            </div>
                        </div>

                        {/* Specific Checks */}
                        <div className="space-y-3">
                            {checks.map((check: any, i: number) => (
                                <ComplianceItem
                                    key={i}
                                    label={check.label}
                                    status={check.status}
                                    detail={check.detail}
                                />
                            ))}
                        </div>

                        {/* Word Count Breakdown */}
                        {totalWordCount > 0 && (
                            <div className="pt-4">
                                <div className="text-[10px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] mb-3 px-1 flex items-center gap-2">
                                    <FileText className="w-3 h-3" />
                                    Word Count: {totalWordCount.toLocaleString()}
                                </div>
                                <div className="space-y-2">
                                    {Object.entries(wordCountByChapter).filter(([_, count]) => count > 0).map(([chapter, count]) => (
                                        <div key={chapter} className="flex items-center justify-between text-[9px] px-1">
                                            <span className="text-cyan-300/60 truncate max-w-[150px]">{chapter.replace('Chapter ', 'Ch ')}</span>
                                            <span className="text-cyan-100 font-mono">{count.toLocaleString()}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Plagiarism Section */}
                        <div className="pt-6">
                            <div className="text-[10px] font-bold text-cyan-500/40 uppercase tracking-[0.2em] mb-3 px-1">Originality Shield</div>
                            {scanResults ? (
                                <div className="space-y-4">
                                    <div className={`p-4 rounded-xl border ${scanResults.status === 'success' ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                        <div className="flex items-center justify-between mb-2">
                                            <span className="text-[10px] font-bold text-cyan-200">Similarity Score</span>
                                            <span className={`text-xs font-black ${scanResults.score > 25 ? 'text-orange-400' : 'text-emerald-400'}`}>{scanResults.score}%</span>
                                        </div>
                                        <div className="h-1 bg-white/5 rounded-full overflow-hidden">
                                            <div className={`h-full transition-all duration-1000 ${scanResults.score > 25 ? 'bg-orange-500 shadow-[0_0_10px_rgba(249,115,22,0.5)]' : 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]'}`} style={{ width: `${scanResults.score}%` }}></div>
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        {scanResults.matches.map((match: any, j: number) => (
                                            <div key={j} className="p-3 bg-black/40 border border-cyan-500/10 rounded-lg group hover:border-cyan-500/30 transition-all">
                                                <div className="flex items-center justify-between mb-1">
                                                    <div className="text-[9px] font-bold text-cyan-100 truncate flex-grow">"{match.segmentSnippet}"</div>
                                                    <span className="text-[8px] text-orange-400 ml-2 shrink-0">{match.intelligentScore}% match</span>
                                                </div>
                                                <div className="text-[8px] text-cyan-500/40 mb-2 italic leading-tight">
                                                    {match.reason}
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="text-[8px] text-cyan-500/60 truncate italic">{match.source}</div>
                                                    <a href={match.url} target="_blank" rel="noopener noreferrer" className="p-1 text-cyan-400 hover:text-cyan-200 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <ExternalLink className="w-2.5 h-2.5" />
                                                    </a>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button
                                        onClick={handleInitiateScan}
                                        disabled={isScanning}
                                        className="w-full py-2 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-xl text-[9px] font-bold uppercase tracking-widest transition-all"
                                    >
                                        Re-Scan Draft
                                    </button>
                                </div>
                            ) : (
                                <div className="p-4 bg-black/20 border border-cyan-500/10 rounded-xl flex flex-col items-center text-center gap-2">
                                    <div className="text-xs font-medium text-cyan-200">
                                        {isScanning ? "Scanning Web Repositories..." : "Plagiarism Scan Required"}
                                    </div>
                                    <p className="text-[9px] text-cyan-500/50 px-2 leading-relaxed">
                                        {isScanning ? "Contacting academic databases via Tavily AI..." : "Integrity check via Tavily Search + Llama 3 analysis is pending chapter completion."}
                                    </p>
                                    <button
                                        onClick={handleInitiateScan}
                                        disabled={isScanning}
                                        className="mt-2 px-4 py-1.5 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/20 rounded-full text-[9px] font-bold uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
                                    >
                                        {isScanning && <Loader2 className="w-3 h-3 animate-spin" />}
                                        {isScanning ? "Comparing..." : "Initiate Deep Scan"}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {activeTab === 'timeline' && (
                    <div className="p-4">
                        <ProjectTimeline project={project} />
                    </div>
                )}

                {activeTab === 'guardian' && (
                    <div className="p-4">
                        <IntegrityGuardian project={project} />
                    </div>
                )}
            </div>

            <div className="p-4 bg-cyan-500/5 border-t border-cyan-500/20 mt-auto">
                <div className="flex items-start gap-3">
                    <InfoIcon className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                    <p className="text-[9px] text-cyan-400/60 leading-relaxed italic">
                        Eldoria's academic auditor monitors your progress in real-time, ensuring strict adherence to Rivers State University's thesis guidelines.
                    </p>
                </div>
            </div>
        </div>
    );
};

interface ComplianceItemProps {
    label: string;
    detail: string;
    status: 'success' | 'warning' | 'error' | 'info';
}

const ComplianceItem: React.FC<ComplianceItemProps> = ({ label, detail, status }) => {
    const icons = {
        success: <CheckCircle className="w-3.5 h-3.5 text-emerald-500" />,
        warning: <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />,
        error: <AlertTriangle className="w-3.5 h-3.5 text-red-500" />,
        info: <Info className="w-3.5 h-3.5 text-cyan-400" />
    };

    return (
        <div className="group">
            <div className="flex items-center gap-2 mb-1">
                {icons[status]}
                <span className="text-[10px] font-bold text-cyan-100 uppercase tracking-tight">{label}</span>
            </div>
            <div className="pl-5.5 text-[9px] text-cyan-500/60 leading-snug group-hover:text-cyan-400 transition-colors">
                {detail}
            </div>
        </div>
    );
};

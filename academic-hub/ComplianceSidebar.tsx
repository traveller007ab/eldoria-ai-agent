import React, { useState, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, CheckCircle, Info, InfoIcon, Loader2, ExternalLink, HeartPulse, History, FileText, BookOpen, FileCheck, GraduationCap } from 'lucide-react';
import { AcademicProject } from '../types';
import { useWorkspace } from '../context/WorkspaceContext';
import { checkOriginality, generateComplianceReport, ComplianceReport } from '../services/academicService';
import { ProjectTimeline } from './ProjectTimeline';
import { IntegrityGuardian } from './IntegrityGuardian';
import { APAValidator, APAValidationResult } from '../services/apaValidator';
import { RSUValidator, RSUValidationResult, RSUCourseLevel, getRSULevelForCourse } from '../services/rsuValidator';
import { Reference } from '../services/citationEngine';

interface ComplianceSidebarProps {
    project: AcademicProject | null;
}

export const ComplianceSidebar: React.FC<ComplianceSidebarProps> = ({ project }) => {
    const { runManualCommand } = useWorkspace();
    const [auditResults, setAuditResults] = useState<ComplianceReport | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [scanResults, setScanResults] = useState<any>(null);
    const [isScanning, setIsScanning] = useState(false);
    const [activeTab, setActiveTab] = useState<'audit' | 'timeline' | 'guardian' | 'apa' | 'rsu'>('audit');
    const [apaResults, setApaResults] = useState<APAValidationResult | null>(null);
    const [isValidatingAPA, setIsValidatingAPA] = useState(false);
    const [rsuResults, setRsuResults] = useState<RSUValidationResult | null>(null);
    const [isValidatingRSU, setIsValidatingRSU] = useState(false);
    const [rsuLevel, setRsuLevel] = useState<RSUCourseLevel>('500');

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

    useEffect(() => {
        if (!project || activeTab !== 'apa') return;

        const validateAPA = async () => {
            setIsValidatingAPA(true);
            try {
                const allContent = Object.values(project.draft_content || {}).join('\n\n');
                const references: Reference[] = [];

                const validator = new APAValidator(allContent, references, 'apa');
                const results = validator.validate();
                setApaResults(results);
            } catch (e) {
                console.error("APA validation failed", e);
            } finally {
                setIsValidatingAPA(false);
            }
        };

        const timer = setTimeout(validateAPA, 300);
        return () => clearTimeout(timer);
    }, [project, activeTab]);

    useEffect(() => {
        if (!project || activeTab !== 'rsu') return;

        const validateRSU = async () => {
            setIsValidatingRSU(true);
            try {
                const allContent = project.draft_content || {};
                const references: Reference[] = [];

                const validator = new RSUValidator(allContent, references, rsuLevel);
                const results = validator.validate();
                setRsuResults(results);
            } catch (e) {
                console.error("RSU validation failed", e);
            } finally {
                setIsValidatingRSU(false);
            }
        };

        const timer = setTimeout(validateRSU, 300);
        return () => clearTimeout(timer);
    }, [project, activeTab, rsuLevel]);

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
                    <button
                        onClick={() => setActiveTab('apa')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'apa' ? 'bg-amber-500/20 text-amber-200' : 'text-cyan-500/40 hover:text-amber-300'}`}
                    >
                        <BookOpen className="w-3.5 h-3.5" />
                        APA
                    </button>
                    <button
                        onClick={() => setActiveTab('rsu')}
                        className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${activeTab === 'rsu' ? 'bg-violet-500/20 text-violet-200' : 'text-cyan-500/40 hover:text-violet-300'}`}
                    >
                        <GraduationCap className="w-3.5 h-3.5" />
                        RSU
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

                {activeTab === 'apa' && (
                    <div className="p-4 space-y-6">
                        <div className="text-[10px] font-bold text-amber-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <BookOpen className="w-4 h-4" />
                            APA 7th Edition Compliance
                        </div>

                        {isValidatingAPA ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-amber-500 mb-3" />
                                <span className="text-[10px] text-amber-400 uppercase tracking-widest">Validating Format...</span>
                            </div>
                        ) : apaResults ? (
                            <>
                                <div className="relative h-32 flex flex-col items-center justify-center">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-amber-500/10" />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            strokeDasharray="251.2"
                                            strokeDashoffset={251.2 * (1 - (apaResults.score / 100))}
                                            className={`${
                                                apaResults.score >= 80 ? 'text-emerald-500' :
                                                apaResults.score >= 60 ? 'text-amber-500' : 'text-red-500'
                                            } shadow-[0_0_10px_rgba(245,158,11,0.5)] transition-all duration-1000`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-amber-400">{apaResults.score}%</span>
                                        <span className="text-[8px] font-bold text-amber-500/50 uppercase tracking-widest">APA Score</span>
                                    </div>
                                </div>

                                <div className="p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                                    <p className="text-[10px] text-amber-200 font-medium">{apaResults.summary}</p>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[9px] font-bold text-amber-500/60 uppercase tracking-[0.2em]">
                                        Statistics
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-amber-500/40">Words</div>
                                            <div className="text-xs text-amber-200">{apaResults.statistics.totalWords}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-amber-500/40">Citations</div>
                                            <div className="text-xs text-amber-200">{apaResults.statistics.totalCitations}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-amber-500/40">References</div>
                                            <div className="text-xs text-amber-200">{apaResults.statistics.totalReferences}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-amber-500/40">Citations/1000 words</div>
                                            <div className="text-xs text-amber-200">{apaResults.statistics.citationDensity.toFixed(1)}</div>
                                        </div>
                                    </div>
                                </div>

                                {apaResults.issues.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-[9px] font-bold text-amber-500/60 uppercase tracking-[0.2em]">
                                            Issues ({apaResults.issues.length})
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            {apaResults.issues.slice(0, 10).map((issue, idx) => (
                                                <div key={idx} className={`p-2 rounded border ${
                                                    issue.type === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                                    issue.type === 'warning' ? 'bg-amber-500/5 border-amber-500/20' :
                                                    'bg-blue-500/5 border-blue-500/20'
                                                }`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {issue.type === 'error' ? (
                                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                                        ) : issue.type === 'warning' ? (
                                                            <AlertTriangle className="w-3 h-3 text-amber-500" />
                                                        ) : (
                                                            <Info className="w-3 h-3 text-blue-500" />
                                                        )}
                                                        <span className="text-[9px] font-bold text-amber-100 uppercase">{issue.category.replace('_', ' ')}</span>
                                                    </div>
                                                    <p className="text-[8px] text-amber-500/70 leading-tight">{issue.message}</p>
                                                    {issue.suggestion && (
                                                        <p className="text-[8px] text-emerald-400 mt-1 italic">Tip: {issue.suggestion}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-6 bg-black/20 border border-amber-500/10 rounded-xl flex flex-col items-center text-center gap-2">
                                <FileCheck className="w-10 h-10 text-amber-500/30 mb-2" />
                                <div className="text-xs font-medium text-amber-200">APA Validation Ready</div>
                                <p className="text-[9px] text-amber-500/50 px-2 leading-relaxed">
                                    Switch to this tab to validate your thesis against APA 7th Edition formatting rules.
                                </p>
                            </div>
                        )}
                    </div>
                )}

                {activeTab === 'rsu' && (
                    <div className="p-4 space-y-6">
                        <div className="text-[10px] font-bold text-violet-400 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                            <GraduationCap className="w-4 h-4" />
                            RSU Compliance
                        </div>

                        <div className="flex gap-2 mb-4">
                            {(['500', '600', '700', '800', 'postgraduate'] as const).map(level => (
                                <button
                                    key={level}
                                    onClick={() => setRsuLevel(level)}
                                    className={`px-3 py-1.5 rounded-lg text-[9px] font-bold uppercase tracking-widest transition-all ${
                                        rsuLevel === level
                                            ? 'bg-violet-500/20 text-violet-200 border border-violet-500/30'
                                            : 'bg-black/30 text-violet-500/40 hover:text-violet-300'
                                    }`}
                                >
                                    {level}
                                </button>
                            ))}
                        </div>

                        {isValidatingRSU ? (
                            <div className="flex flex-col items-center justify-center py-12">
                                <Loader2 className="w-8 h-8 animate-spin text-violet-500 mb-3" />
                                <span className="text-[10px] text-violet-400 uppercase tracking-widest">Validating RSU...</span>
                            </div>
                        ) : rsuResults ? (
                            <>
                                <div className="relative h-32 flex flex-col items-center justify-center">
                                    <svg className="w-24 h-24 transform -rotate-90">
                                        <circle cx="48" cy="48" r="40" stroke="currentColor" strokeWidth="4" fill="transparent" className="text-violet-500/10" />
                                        <circle
                                            cx="48"
                                            cy="48"
                                            r="40"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                            fill="transparent"
                                            strokeDasharray="251.2"
                                            strokeDashoffset={251.2 * (1 - (rsuResults.score / 100))}
                                            className={`${
                                                rsuResults.score >= 80 ? 'text-emerald-500' :
                                                rsuResults.score >= 60 ? 'text-violet-500' : 'text-red-500'
                                            } shadow-[0_0_10px_rgba(139,92,246,0.5)] transition-all duration-1000`}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <span className="text-2xl font-black text-violet-400">{rsuResults.score}%</span>
                                        <span className="text-[8px] font-bold text-violet-500/50 uppercase tracking-widest">RSU Score</span>
                                    </div>
                                </div>

                                <div className={`p-3 rounded-lg border ${rsuResults.isCompliant ? 'bg-emerald-500/5 border-emerald-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                    <div className="flex items-center gap-2">
                                        {rsuResults.isCompliant ? (
                                            <CheckCircle className="w-4 h-4 text-emerald-500" />
                                        ) : (
                                            <AlertTriangle className="w-4 h-4 text-orange-500" />
                                        )}
                                        <span className={`text-[10px] font-bold ${rsuResults.isCompliant ? 'text-emerald-200' : 'text-orange-200'}`}>
                                            {rsuResults.isCompliant ? 'Meets RSU Requirements' : 'Needs Attention'}
                                        </span>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[9px] font-bold text-violet-500/60 uppercase tracking-[0.2em]">
                                        Requirements (Level {rsuResults.level})
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Min Words</div>
                                            <div className="text-xs text-violet-200">{rsuResults.requirements.minWordCount.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Max Words</div>
                                            <div className="text-xs text-violet-200">{rsuResults.requirements.maxWordCount.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Min References</div>
                                            <div className="text-xs text-violet-200">{rsuResults.requirements.minReferences}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Max Chapters</div>
                                            <div className="text-xs text-violet-200">{rsuResults.requirements.maxChapters}</div>
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-3">
                                    <div className="text-[9px] font-bold text-violet-500/60 uppercase tracking-[0.2em]">
                                        Your Statistics
                                    </div>
                                    <div className="grid grid-cols-2 gap-2">
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Words</div>
                                            <div className="text-xs text-violet-200">{rsuResults.statistics.totalWords.toLocaleString()}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">References</div>
                                            <div className="text-xs text-violet-200">{rsuResults.statistics.totalReferences}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">Chapters</div>
                                            <div className="text-xs text-violet-200">{rsuResults.statistics.totalChapters}</div>
                                        </div>
                                        <div className="bg-black/30 rounded p-2">
                                            <div className="text-[8px] text-violet-500/40">With DOI</div>
                                            <div className="text-xs text-violet-200">{rsuResults.statistics.referencesWithDOI}</div>
                                        </div>
                                    </div>
                                </div>

                                {rsuResults.issues.length > 0 && (
                                    <div className="space-y-3">
                                        <div className="text-[9px] font-bold text-violet-500/60 uppercase tracking-[0.2em]">
                                            Issues ({rsuResults.issues.length})
                                        </div>
                                        <div className="space-y-2 max-h-48 overflow-y-auto custom-scrollbar">
                                            {rsuResults.issues.slice(0, 10).map((issue, idx) => (
                                                <div key={idx} className={`p-2 rounded border ${
                                                    issue.type === 'error' ? 'bg-red-500/5 border-red-500/20' :
                                                    issue.type === 'warning' ? 'bg-violet-500/5 border-violet-500/20' :
                                                    'bg-blue-500/5 border-blue-500/20'
                                                }`}>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        {issue.type === 'error' ? (
                                                            <AlertTriangle className="w-3 h-3 text-red-500" />
                                                        ) : issue.type === 'warning' ? (
                                                            <AlertTriangle className="w-3 h-3 text-violet-500" />
                                                        ) : (
                                                            <Info className="w-3 h-3 text-blue-500" />
                                                        )}
                                                        <span className="text-[9px] font-bold text-violet-100 uppercase">{issue.category.replace('_', ' ')}</span>
                                                    </div>
                                                    <p className="text-[8px] text-violet-500/70 leading-tight">{issue.message}</p>
                                                    {issue.suggestion && (
                                                        <p className="text-[8px] text-emerald-400 mt-1 italic">Tip: {issue.suggestion}</p>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="p-6 bg-black/20 border border-violet-500/10 rounded-xl flex flex-col items-center text-center gap-2">
                                <GraduationCap className="w-10 h-10 text-violet-500/30 mb-2" />
                                <div className="text-xs font-medium text-violet-200">RSU Validation Ready</div>
                                <p className="text-[9px] text-violet-500/50 px-2 leading-relaxed">
                                    Select your course level and switch to this tab to validate against Rivers State University requirements.
                                </p>
                            </div>
                        )}
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

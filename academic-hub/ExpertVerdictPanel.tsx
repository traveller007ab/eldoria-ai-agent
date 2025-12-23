import React, { useState } from 'react';
import { AcademicProject } from '../types';
import { ShieldAlert, UserCheck, MessageSquare, AlertCircle, CheckCircle2, Loader2, Sparkles, TrendingUp } from 'lucide-react';
import { getGroq } from '../services/groqService';

interface ExpertVerdictPanelProps {
    project: AcademicProject;
}

type Persona = 'rigorous' | 'practical' | 'innovative';

export const ExpertVerdictPanel: React.FC<ExpertVerdictPanelProps> = ({ project }) => {
    const [selectedPersona, setSelectedPersona] = useState<Persona>('rigorous');
    const [verdict, setVerdict] = useState<any>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);

    const personas = {
        rigorous: {
            name: "The Rigorous Academic",
            role: "Professor with 30+ years in peer review",
            icon: ShieldAlert,
            color: "text-red-400",
            borderColor: "border-red-500/20",
            bgColor: "bg-red-500/5"
        },
        practical: {
            name: "The Industry Expert",
            role: "Senior Lead Engineer focusing on ROI & Feasibility",
            icon: UserCheck,
            color: "text-blue-400",
            borderColor: "border-blue-500/20",
            bgColor: "bg-blue-500/5"
        },
        innovative: {
            name: "The Tech Visionary",
            role: "R&D Strategist looking for 'The Next Big Thing'",
            icon: Sparkles,
            color: "text-purple-400",
            borderColor: "border-purple-500/20",
            bgColor: "bg-purple-500/5"
        }
    };

    const handleGenerateVerdict = async () => {
        setIsAnalyzing(true);
        const groq = getGroq();

        const prompt = `
            You are acting as '${personas[selectedPersona].name}', high-level persona described as: '${personas[selectedPersona].role}'.
            Critique the following thesis project titled: "${project.wizard_state.basics.title}".
            
            PROJECT DATA:
            ${JSON.stringify(project.wizard_state)}
            
            DRAFT CONTENT:
            ${JSON.stringify(project.draft_content)}
            
            OUTPUT REQUIREMENTS (JSON):
            - score: overall 0-100
            - verdict_text: a punchy, 2-sentence overall summary in character
            - critiques: array of objects { section: string, findings: string, severity: 'high' | 'medium' | 'low' }
            - suggestions: array of strings
        `;

        try {
            const completion = await groq.chat.completions.create({
                messages: [
                    { role: "system", content: "You are a specialized academic reviewer providing brutal but constructive feedback in JSON format." },
                    { role: "user", content: prompt }
                ],
                model: "llama-3.3-70b-versatile",
                response_format: { type: "json_object" },
                temperature: 0.7
            });

            const content = completion.choices[0].message.content;
            if (content) {
                setVerdict(JSON.parse(content));
            }
        } catch (e) {
            console.error("Verdict failed", e);
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex gap-3">
                {(Object.keys(personas) as Persona[]).map(p => {
                    const persona = personas[p];
                    return (
                        <button
                            key={p}
                            onClick={() => setSelectedPersona(p)}
                            className={`flex-1 p-4 rounded-2xl border transition-all text-left ${selectedPersona === p ? `${persona.borderColor} ${persona.bgColor}` : 'bg-black/20 border-white/5 hover:border-white/10'}`}
                        >
                            <persona.icon className={`w-5 h-5 mb-2 ${selectedPersona === p ? persona.color : 'text-white/20'}`} />
                            <div className={`text-[10px] font-bold uppercase tracking-widest ${selectedPersona === p ? persona.color : 'text-white/40'}`}>{persona.name}</div>
                            <div className="text-[8px] text-white/20 mt-1 line-clamp-1">{persona.role}</div>
                        </button>
                    );
                })}
            </div>

            {!verdict && !isAnalyzing && (
                <div className="p-12 border border-dashed border-white/5 rounded-3xl flex flex-col items-center justify-center text-center gap-4 bg-black/20">
                    <MessageSquare className="w-12 h-12 text-white/5" />
                    <div className="max-w-xs">
                        <h4 className="text-sm font-bold text-white/40">Solicit an Expert Opinion</h4>
                        <p className="text-[10px] text-white/20 mt-2">Select a persona and Eldoria will simulate a high-stakes peer review of your current draft.</p>
                    </div>
                    <button
                        onClick={handleGenerateVerdict}
                        className="mt-4 px-8 py-2.5 bg-white/5 hover:bg-white/10 text-white rounded-xl text-[10px] font-bold uppercase tracking-widest border border-white/10 transition-all"
                    >
                        Initiate Verdict
                    </button>
                </div>
            )}

            {isAnalyzing && (
                <div className="p-20 flex flex-col items-center justify-center gap-4 bg-black/40 border border-white/5 rounded-3xl animate-pulse">
                    <Loader2 className="w-8 h-8 text-cyan-400 animate-spin" />
                    <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-[0.3em]">The Council is deliberating...</div>
                </div>
            )}

            {verdict && !isAnalyzing && (
                <div className="space-y-4 animate-in fade-in slide-in-from-bottom duration-500">
                    <div className="p-6 bg-white/[0.02] border border-white/5 rounded-3xl flex items-center justify-between">
                        <div className="flex items-center gap-6">
                            <div className="relative">
                                <svg className="w-20 h-20 -rotate-90">
                                    <circle cx="40" cy="40" r="32" className="stroke-white/5 fill-none" strokeWidth="4" />
                                    <circle
                                        cx="40"
                                        cy="40"
                                        r="32"
                                        className={`fill-none transition-all duration-1000 ${verdict.score > 70 ? 'stroke-emerald-400' : verdict.score > 40 ? 'stroke-orange-400' : 'stroke-red-400'}`}
                                        strokeWidth="4"
                                        strokeDasharray={2 * Math.PI * 32}
                                        strokeDashoffset={2 * Math.PI * 32 * (1 - verdict.score / 100)}
                                    />
                                </svg>
                                <div className="absolute inset-0 flex items-center justify-center text-xl font-black text-white">{verdict.score}</div>
                            </div>
                            <div>
                                <div className="text-[10px] font-black text-cyan-400 uppercase tracking-widest mb-1">Global Verdict</div>
                                <p className="text-[11px] text-white/80 italic leading-relaxed max-w-sm">"{verdict.verdict_text}"</p>
                            </div>
                        </div>
                        <button onClick={() => setVerdict(null)} className="text-[8px] font-bold text-white/20 hover:text-white/60 uppercase tracking-widest">Re-Analyze</button>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-3">
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Critical Findings</div>
                            {verdict.critiques.map((crit: any, i: number) => (
                                <div key={i} className={`p-4 rounded-2xl border ${crit.severity === 'high' ? 'bg-red-500/5 border-red-500/20' : 'bg-orange-500/5 border-orange-500/20'}`}>
                                    <div className="flex items-center justify-between mb-1">
                                        <span className={`text-[9px] font-black uppercase tracking-widest ${crit.severity === 'high' ? 'text-red-400' : 'text-orange-400'}`}>{crit.section}</span>
                                        <AlertCircle className={`w-3 h-3 ${crit.severity === 'high' ? 'text-red-400' : 'text-orange-400'}`} />
                                    </div>
                                    <p className="text-[10px] text-white/60 leading-relaxed">{crit.findings}</p>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-3">
                            <div className="text-[9px] font-black text-white/20 uppercase tracking-[0.2em] px-1">Expert Recommendations</div>
                            <div className="p-6 bg-emerald-500/[0.02] border border-emerald-500/10 rounded-3xl space-y-4">
                                {verdict.suggestions.map((sug: string, i: number) => (
                                    <div key={i} className="flex gap-3">
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                        <p className="text-[10px] text-emerald-100/60 leading-relaxed">{sug}</p>
                                    </div>
                                ))}
                                <div className="pt-4 mt-4 border-t border-emerald-500/10 flex items-center gap-3">
                                    <TrendingUp className="w-4 h-4 text-emerald-400" />
                                    <span className="text-[9px] font-bold text-emerald-400/60 uppercase tracking-widest">Potential Impact Boost: +15%</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

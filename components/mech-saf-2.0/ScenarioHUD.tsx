import React, { useState, useEffect } from 'react';
import { Target, CheckCircle2, Circle, Clock, Flame, HelpCircle, ChevronDown, ChevronUp, AlertCircle, X, Trophy, Medal } from 'lucide-react';
import { scenarioService } from '../../services/scenarios/ScenarioService';
import { ScenarioSession } from '../../services/scenarios/types';
import { useMechStore } from '../../stores/useMechStore';

type Grade = 'S' | 'A' | 'B' | 'C' | 'D' | 'F';

interface GradeInfo {
    grade: Grade;
    label: string;
    color: string;
    bgColor: string;
    borderColor: string;
    description: string;
    minPercent: number;
}

const GRADES: GradeInfo[] = [
    { grade: 'S', label: 'S-Rank', color: 'text-yellow-400', bgColor: 'bg-yellow-400', borderColor: 'border-yellow-400', description: 'Outstanding!', minPercent: 95 },
    { grade: 'A', label: 'A-Rank', color: 'text-emerald-400', bgColor: 'bg-emerald-400', borderColor: 'border-emerald-400', description: 'Excellent', minPercent: 85 },
    { grade: 'B', label: 'B-Rank', color: 'text-blue-400', bgColor: 'bg-blue-400', borderColor: 'border-blue-400', description: 'Good Job', minPercent: 70 },
    { grade: 'C', label: 'C-Rank', color: 'text-amber-400', bgColor: 'bg-amber-400', borderColor: 'border-amber-400', description: 'Satisfactory', minPercent: 55 },
    { grade: 'D', label: 'D-Rank', color: 'text-orange-400', bgColor: 'bg-orange-400', borderColor: 'border-orange-400', description: 'Needs Work', minPercent: 40 },
    { grade: 'F', label: 'F-Rank', color: 'text-red-400', bgColor: 'bg-red-400', borderColor: 'border-red-400', description: 'Try Again', minPercent: 0 }
];

function calculateGrade(achievedCount: number, totalCount: number, penalties: number): { grade: Grade; percent: number; achievedPoints: number; maxPoints: number } {
    const maxPoints = scenarioService['currentScenario']?.objectives?.reduce((sum, obj) => sum + (obj.points || 0), 0) || 100;
    const achievedPoints = Object.entries(scenarioService.getActiveSession()?.objectiveStatus || {}).reduce((sum, [id, status]) => {
        const obj = scenarioService['currentScenario']?.objectives?.find(o => o.id === id);
        return sum + (status.achieved ? (obj?.points || 0) : 0);
    }, 0);

    let percent = maxPoints > 0 ? ((achievedPoints - penalties) / maxPoints) * 100 : 0;
    percent = Math.max(0, Math.min(100, percent));

    const grade = GRADES.find(g => percent >= g.minPercent)?.grade || 'F';

    return { grade, percent, achievedPoints, maxPoints };
}

export const ScenarioHUD: React.FC = () => {
    const { lastSimulationResult, isSimulating } = useMechStore();
    const [session, setSession] = useState<ScenarioSession | null>(scenarioService.getActiveSession());
    const [isExpanded, setIsExpanded] = useState(true);
    const [timeRemaining, setTimeRemaining] = useState<number | null>(null);

    // Update session state locally on simulation update or timer
    useEffect(() => {
        const interval = setInterval(() => {
            const currentSession = scenarioService.getActiveSession();
            setSession(currentSession ? { ...currentSession } : null); // Force re-render

            if (currentSession && scenarioService['currentScenario']?.timeLimitSeconds) {
                const elapsed = (Date.now() - currentSession.startedAt.getTime()) / 1000;
                const remaining = scenarioService['currentScenario'].timeLimitSeconds - elapsed;
                setTimeRemaining(Math.max(0, remaining));
            }
        }, 500); // 2Hz update for UI

        return () => clearInterval(interval);
    }, []);

    if (!session) return null;

    const scenario = scenarioService['currentScenario'];
    if (!scenario) return null;

    const formatTime = (seconds: number) => {
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${s.toString().padStart(2, '0')}`;
    };

    const achievedCount = Object.values(session.objectiveStatus).filter(s => s.achieved).length;
    const totalCount = scenario.objectives.length;
    const penaltyPercent = session.hintPenalty || 0;
    const gradeInfo = calculateGrade(achievedCount, totalCount, penaltyPercent);
    const grade = GRADES.find(g => g.grade === gradeInfo.grade) || GRADES[GRADES.length - 1];

    return (
        <div className="fixed top-20 left-4 z-40 w-80 flex flex-col gap-2 pointer-events-none">
            {/* Header / Main Card */}
            <div className="bg-slate-900/90 backdrop-blur-md border border-slate-700/50 rounded-lg shadow-xl overflow-hidden pointer-events-auto transition-all duration-300">
                <div
                    className="p-3 bg-slate-800/80 border-b border-slate-700/50 flex items-center justify-between cursor-pointer"
                    onClick={() => setIsExpanded(!isExpanded)}
                >
                    <div className="flex items-center gap-2">
                        <div className="p-1.5 rounded-md bg-amber-500/10 text-amber-500">
                            <Target className="w-4 h-4" />
                        </div>
                        <div>
                            <div className="text-xs font-bold text-slate-200 leading-none mb-0.5">Current Mission</div>
                            <div className="text-[10px] text-slate-400 leading-none">{scenario.title}</div>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {/* Grade Display */}
                        <div className={`flex items-center gap-1.5 px-2 py-1 rounded border ${grade.bgColor} bg-opacity-10 ${grade.borderColor}`}>
                            <Medal className={`w-3 h-3 ${grade.color}`} />
                            <span className={`text-xs font-bold ${grade.color}`}>{grade.grade}</span>
                        </div>
                        
                        {timeRemaining !== null && (
                            <div className={`flex items-center gap-1.5 px-2 py-1 rounded bg-slate-950/50 text-xs font-mono border ${timeRemaining < 60 ? 'text-red-400 border-red-500/30 animate-pulse' : 'text-slate-300 border-slate-700'}`}>
                                <Clock className="w-3 h-3" />
                                {formatTime(timeRemaining)}
                            </div>
                        )}
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-500" /> : <ChevronDown className="w-4 h-4 text-slate-500" />}
                    </div>
                </div>

                {isExpanded && (
                    <div className="p-3 space-y-3 animate-fade-in relative">
                        {/* Mission Success Overlay with Grade */}
                        {session.status === 'success' && (
                            <div className="absolute inset-0 bg-emerald-950/90 backdrop-blur-sm z-10 flex flex-col items-center justify-center text-center p-4 rounded-b-lg animate-in fade-in zoom-in duration-300">
                                <div className={`p-4 rounded-full ${grade.bgColor} bg-opacity-20 mb-2`}>
                                    <Medal className={`w-12 h-12 ${grade.color}`} />
                                </div>
                                <h3 className="text-xl font-bold text-white mb-1">{grade.label}</h3>
                                <p className="text-sm text-emerald-200/80 mb-1">{grade.description}</p>
                                <p className="text-xs text-emerald-300/60 mb-3">{gradeInfo.percent.toFixed(1)}% Score</p>
                                <div className="flex items-center gap-4 text-xs text-slate-300 mb-4">
                                    <span>{achievedCount}/{totalCount} Objectives</span>
                                    {penaltyPercent > 0 && <span className="text-amber-400">-{penaltyPercent}% Penalty</span>}
                                </div>
                                <button
                                    onClick={() => {
                                        scenarioService.abandonScenario();
                                        setSession(null);
                                    }}
                                    className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-white text-xs font-bold rounded-full transition-colors"
                                >
                                    Continue
                                </button>
                            </div>
                        )}

                        {/* Progress Overview */}
                        <div className="flex items-center justify-between bg-slate-950/50 rounded p-2 border border-slate-800">
                            <div className="flex items-center gap-2">
                                <span className="text-[10px] text-slate-500 uppercase tracking-wider">Score</span>
                                <span className="text-sm font-semibold text-white">{gradeInfo.achievedPoints}/{gradeInfo.maxPoints}</span>
                            </div>
                            <div className="flex-1 mx-3">
                                <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                    <div
                                        className={`h-full transition-all duration-500 ${grade.bgColor}`}
                                        style={{ width: `${gradeInfo.percent}%` }}
                                    />
                                </div>
                            </div>
                            <span className={`text-xs font-bold ${grade.color}`}>{gradeInfo.percent.toFixed(0)}%</span>
                        </div>

                        {/* Objectives List */}
                        <div className="space-y-2">
                            {scenario.objectives.map(obj => {
                                const status = session.objectiveStatus[obj.id];
                                return (
                                    <div key={obj.id} className={`p-2 rounded border ${status.achieved ? 'bg-emerald-950/20 border-emerald-500/30' : 'bg-slate-950/30 border-slate-800'}`}>
                                        <div className="flex items-start gap-2">
                                            {status.achieved ? (
                                                <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                                            ) : (
                                                <Circle className="w-4 h-4 text-slate-600 shrink-0 mt-0.5" />
                                            )}
                                            <div className="flex-1 min-w-0">
                                                <div className={`text-xs ${status.achieved ? 'text-emerald-200 line-through opacity-70' : 'text-slate-300'}`}>
                                                    {obj.description}
                                                </div>

                                                {/* Progress Bar (if applicable) */}
                                                {!status.achieved && (obj.type === 'greater_than' || obj.type === 'less_than' || obj.type === 'maintain') && (
                                                    <div className="mt-1.5">
                                                        <div className="flex justify-between text-[9px] text-slate-500 mb-0.5">
                                                            <span>Current: {status.currentValue.toFixed(1)}</span>
                                                            <span>Target: {obj.target}</span>
                                                        </div>
                                                        <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                                                            <div
                                                                className={`h-full transition-all duration-500 ${obj.type === 'maintain' ? 'bg-blue-500' : 'bg-amber-500'}`}
                                                                style={{
                                                                    width: `${Math.min(100, Math.max(0, (status.currentValue / obj.target) * 100))}%`
                                                                }}
                                                            />
                                                        </div>
                                                        {obj.type === 'maintain' && (
                                                            <div className="text-[9px] text-blue-400 mt-1 flex items-center gap-1">
                                                                <Clock className="w-3 h-3" />
                                                                Held for {status.maintainedTime?.toFixed(1) || 0}s / {obj.maintainDurationSeconds}s
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        {/* Hints Button */}
                        {scenario.hints && scenario.hints.length > 0 && (
                            <div className="pt-2 border-t border-slate-800">
                                <button className="w-full py-1.5 text-xs text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded transition-colors flex items-center justify-center gap-2">
                                    <HelpCircle className="w-3 h-3" />
                                    <span>Hints Available ({scenario.hints.length})</span>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

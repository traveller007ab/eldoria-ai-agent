import React, { useState } from 'react';
import { X, Play, Trophy, Clock, Target, Flame, Droplet, Zap, BookOpen, Award } from 'lucide-react';
import { getScenarios, getScenarioById } from '../../services/scenarios/ScenarioRegistry';
import { Scenario } from '../../services/scenarios/types';
import { scenarioService } from '../../services/scenarios/ScenarioService';
import { useMechStore } from '../../stores/useMechStore';

interface ScenarioSelectModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const ScenarioSelectModal: React.FC<ScenarioSelectModalProps> = ({ isOpen, onClose }) => {
    const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<Scenario | null>(null);
    const { setBlueprint } = useMechStore();

    if (!isOpen) return null;

    const scenarios = getScenarios(selectedCategory ? { category: selectedCategory } : undefined);

    const getCategoryIcon = (cat: string) => {
        switch (cat) {
            case 'tutorial': return <BookOpen className="w-4 h-4" />;
            case 'challenge': return <Trophy className="w-4 h-4" />;
            case 'experiment': return <Zap className="w-4 h-4" />;
            case 'certification': return <Award className="w-4 h-4" />;
            default: return <Target className="w-4 h-4" />;
        }
    };

    const getDifficultyColor = (diff: string) => {
        switch (diff) {
            case 'beginner': return 'text-emerald-400 bg-emerald-500/10';
            case 'intermediate': return 'text-amber-400 bg-amber-500/10';
            case 'advanced': return 'text-orange-400 bg-orange-500/10';
            case 'expert': return 'text-red-400 bg-red-500/10';
            default: return 'text-slate-400 bg-slate-500/10';
        }
    };

    const handleStart = (scenario: Scenario) => {
        console.log('[Missions] Starting scenario:', scenario.id, scenario.title);
        console.log('[Missions] Initial blueprint:', scenario.initialBlueprint);

        // Load the scenario's initial blueprint
        setBlueprint(scenario.initialBlueprint);
        console.log('[Missions] Blueprint loaded');

        // Start the scenario session
        const session = scenarioService.startScenario(scenario);
        console.log('[Missions] Scenario session started:', session);

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-900 border border-slate-700 rounded-xl shadow-2xl w-full max-w-4xl max-h-[80vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-4 border-b border-slate-700 flex items-center justify-between bg-slate-800/50">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-6 h-6 text-amber-400" />
                        <div>
                            <h2 className="text-lg font-bold text-white">Mission Control</h2>
                            <p className="text-xs text-slate-400">Select a scenario to begin</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-white p-1.5 hover:bg-slate-700 rounded-lg transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Category Tabs */}
                <div className="p-3 border-b border-slate-700 flex gap-2">
                    <button
                        onClick={() => setSelectedCategory(null)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${!selectedCategory ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                            }`}
                    >
                        All
                    </button>
                    {['tutorial', 'challenge', 'experiment'].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setSelectedCategory(cat)}
                            className={`px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors ${selectedCategory === cat ? 'bg-cyan-600 text-white' : 'bg-slate-700/50 text-slate-400 hover:text-white'
                                }`}
                        >
                            {getCategoryIcon(cat)}
                            {cat.charAt(0).toUpperCase() + cat.slice(1)}s
                        </button>
                    ))}
                </div>

                {/* Scenario Grid */}
                <div className="flex-1 overflow-y-auto p-4 grid grid-cols-1 md:grid-cols-2 gap-4 custom-scrollbar">
                    {scenarios.map(scenario => (
                        <div
                            key={scenario.id}
                            onClick={() => setSelectedScenario(scenario)}
                            className={`p-4 rounded-lg border cursor-pointer transition-all hover:border-cyan-500/50 ${selectedScenario?.id === scenario.id
                                ? 'border-cyan-500 bg-cyan-950/30 shadow-lg shadow-cyan-500/10'
                                : 'border-slate-700 bg-slate-800/50 hover:bg-slate-800'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                <div className="p-2 rounded-lg bg-slate-700/50">
                                    {scenario.thumbnail === 'flame' && <Flame className="w-5 h-5 text-orange-400" />}
                                    {scenario.thumbnail === 'droplet' && <Droplet className="w-5 h-5 text-blue-400" />}
                                    {scenario.thumbnail === 'zap' && <Zap className="w-5 h-5 text-amber-400" />}
                                    {!scenario.thumbnail && <Target className="w-5 h-5 text-slate-400" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 mb-1">
                                        <h3 className="font-semibold text-white truncate">{scenario.title}</h3>
                                    </div>
                                    <p className="text-xs text-slate-400 line-clamp-2 mb-2">{scenario.description}</p>
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${getDifficultyColor(scenario.difficulty)}`}>
                                            {scenario.difficulty}
                                        </span>
                                        <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                            <Target className="w-3 h-3" />
                                            {scenario.objectives.length} objectives
                                        </span>
                                        {scenario.timeLimitSeconds && (
                                            <span className="text-[10px] text-slate-500 flex items-center gap-1">
                                                <Clock className="w-3 h-3" />
                                                {Math.floor(scenario.timeLimitSeconds / 60)}min
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Footer with Selected Scenario Details */}
                {selectedScenario && (
                    <div className="p-4 border-t border-slate-700 bg-slate-800/50">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm font-semibold text-white mb-1">{selectedScenario.title}</div>
                                <div className="text-xs text-slate-400">
                                    {selectedScenario.objectives.length} objectives •{' '}
                                    {selectedScenario.objectives.reduce((sum, o) => sum + o.points, 0)} max points
                                </div>
                            </div>
                            <button
                                onClick={() => handleStart(selectedScenario)}
                                className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg font-medium text-sm transition-all shadow-lg shadow-cyan-500/20"
                            >
                                <Play className="w-4 h-4" />
                                Start Mission
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

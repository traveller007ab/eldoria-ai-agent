import React, { useState, useEffect } from 'react';
import { 
    Gamepad2, 
    Play, 
    Lock, 
    CheckCircle, 
    Clock,
    Trophy,
    Star,
    ChevronRight,
    Target
} from 'lucide-react';
import { listScenarios, startScenario, completeMission, type ScenarioListResult, type ScenarioInfo } from '../../services/integration/ApiIntegrations';

interface ScenariosPanelProps {
    onScenarioStart?: (scenarioId: string) => void;
}

export const ScenariosPanel: React.FC<ScenariosPanelProps> = ({ onScenarioStart }) => {
    const [isLoading, setIsLoading] = useState(true);
    const [result, setResult] = useState<ScenarioListResult | null>(null);
    const [selectedScenario, setSelectedScenario] = useState<ScenarioInfo | null>(null);
    const [activeMission, setActiveMission] = useState<{missionId: string; instructions: string} | null>(null);

    useEffect(() => {
        loadScenarios();
    }, []);

    const loadScenarios = async () => {
        setIsLoading(true);
        try {
            const res = await listScenarios();
            setResult(res);
        } catch (err) {
            console.error('Failed to load scenarios:', err);
        } finally {
            setIsLoading(false);
        }
    };

    const handleStartScenario = async (scenarioId: string) => {
        try {
            const res = await startScenario(scenarioId);
            setActiveMission({ missionId: res.missionId, instructions: res.instructions });
            onScenarioStart?.(scenarioId);
            loadScenarios();
        } catch (err) {
            console.error('Failed to start scenario:', err);
        }
    };

    const handleCompleteMission = async () => {
        if (!activeMission) return;
        try {
            const res = await completeMission(activeMission.missionId, { completed: true });
            alert(`Mission complete! +${res.xpEarned} XP, Badges: ${res.badges.join(', ')}`);
            setActiveMission(null);
            loadScenarios();
        } catch (err) {
            console.error('Failed to complete mission:', err);
        }
    };

    const getDifficultyColor = (difficulty: string) => {
        switch (difficulty) {
            case 'beginner': return 'green';
            case 'intermediate': return 'blue';
            case 'advanced': return 'orange';
            case 'expert': return 'red';
            default: return 'gray';
        }
    };

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'completed': return <CheckCircle size={14} className="status-completed" />;
            case 'in_progress': return <Play size={14} className="status-active" />;
            case 'available': return <Target size={14} className="status-available" />;
            default: return <Lock size={14} className="status-locked" />;
        }
    };

    if (isLoading) {
        return (
            <div className="scenarios-panel">
                <div className="loading-state">
                    <Gamepad2 size={32} className="pulse" />
                    <p>Loading scenarios...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="scenarios-panel">
            <div className="scenarios-panel__header">
                <h3>
                    <Gamepad2 size={18} />
                    Learning Scenarios
                </h3>
                <button className="refresh-btn" onClick={loadScenarios}>
                    Refresh
                </button>
            </div>

            <div className="scenarios-panel__content">
                {activeMission && (
                    <div className="active-mission">
                        <h4>Active Mission</h4>
                        <p className="mission-instructions">{activeMission.instructions}</p>
                        <button className="btn-success" onClick={handleCompleteMission}>
                            <Trophy size={16} />
                            Complete Mission
                        </button>
                    </div>
                )}

                <div className="scenarios-grid">
                    {result?.scenarios.map((scenario) => {
                        const progress = result.progress[scenario.id];
                        return (
                            <div 
                                key={scenario.id} 
                                className={`scenario-card ${progress?.status || 'locked'}`}
                                onClick={() => progress?.status !== 'locked' && setSelectedScenario(scenario)}
                            >
                                <div className="scenario-header">
                                    <h4>{scenario.name}</h4>
                                    <span 
                                        className="difficulty-badge"
                                        style={{ backgroundColor: getDifficultyColor(scenario.difficulty) }}
                                    >
                                        {scenario.difficulty}
                                    </span>
                                </div>
                                
                                <p className="scenario-description">{scenario.description}</p>
                                
                                <div className="scenario-meta">
                                    <span className="time">
                                        <Clock size={12} />
                                        {scenario.estimatedTime} min
                                    </span>
                                    <span className="objectives">
                                        <Target size={12} />
                                        {scenario.objectives.length} objectives
                                    </span>
                                </div>

                                <div className="scenario-rewards">
                                    <span className="xp">
                                        <Star size={12} />
                                        {scenario.rewards.xp} XP
                                    </span>
                                    <div className="badges">
                                        {scenario.rewards.badges.slice(0, 3).map((badge, i) => (
                                            <span key={i} className="badge">{badge}</span>
                                        ))}
                                    </div>
                                </div>

                                <div className="scenario-progress">
                                    {getStatusIcon(progress?.status || 'locked')}
                                    <span className="status-text">
                                        {progress?.status === 'completed' && 'Completed'}
                                        {progress?.status === 'in_progress' && `In Progress (${progress.progress}%)`}
                                        {progress?.status === 'available' && 'Available'}
                                        {progress?.status === 'locked' && 'Locked'}
                                    </span>
                                    {progress?.score !== undefined && (
                                        <span className="score">Score: {progress.score}</span>
                                    )}
                                </div>

                                {progress?.status === 'available' && (
                                    <button 
                                        className="btn-primary start-btn"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleStartScenario(scenario.id);
                                        }}
                                    >
                                        <Play size={14} />
                                        Start
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>

            {selectedScenario && (
                <div className="scenario-modal" onClick={() => setSelectedScenario(null)}>
                    <div className="modal-content" onClick={(e) => e.stopPropagation()}>
                        <h3>{selectedScenario.name}</h3>
                        <p>{selectedScenario.description}</p>
                        
                        <h4>Objectives</h4>
                        <ul>
                            {selectedScenario.objectives.map((obj, i) => (
                                <li key={i}>{obj}</li>
                            ))}
                        </ul>

                        <div className="modal-actions">
                            <button className="btn-secondary" onClick={() => setSelectedScenario(null)}>
                                Close
                            </button>
                            <button 
                                className="btn-primary"
                                onClick={() => {
                                    handleStartScenario(selectedScenario.id);
                                    setSelectedScenario(null);
                                }}
                            >
                                <Play size={14} />
                                Start Scenario
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default ScenariosPanel;

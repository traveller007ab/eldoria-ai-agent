/**
 * ScenarioService
 * Manages scenario loading, objective tracking, and scoring.
 */

import { Scenario, ScenarioSession, ScenarioResult, ObjectiveStatus } from './types';
import { MechSimulationResult } from '../../types';

export class ScenarioService {
    private activeSession: ScenarioSession | null = null;
    private currentScenario: Scenario | null = null;

    /**
     * Start a new scenario session.
     */
    startScenario(scenario: Scenario): ScenarioSession {
        this.currentScenario = scenario;

        const objectiveStatus: Record<string, ObjectiveStatus> = {};
        for (const obj of scenario.objectives) {
            objectiveStatus[obj.id] = {
                achieved: false,
                currentValue: 0,
                maintainedTime: 0
            };
        }

        this.activeSession = {
            scenarioId: scenario.id,
            startedAt: new Date(),
            objectiveStatus,
            hintsRevealed: [],
            hintPenalty: 0,
            status: 'in_progress'
        };

        return this.activeSession;
    }

    /**
     * Update objective progress based on simulation results.
     * Call this after each simulation tick.
     */
    updateProgress(result: MechSimulationResult, deltaTimeSeconds: number = 0.1): ScenarioSession | null {
        if (!this.activeSession || !this.currentScenario) return null;

        for (const objective of this.currentScenario.objectives) {
            const status = this.activeSession.objectiveStatus[objective.id];
            const currentValue = result.variables[objective.variable] ?? 0;
            status.currentValue = currentValue;

            const conditionMet = this.checkCondition(objective, currentValue);

            if (objective.maintainDurationSeconds && objective.maintainDurationSeconds > 0) {
                if (conditionMet) {
                    status.maintainedTime = (status.maintainedTime || 0) + deltaTimeSeconds;
                    if (status.maintainedTime >= objective.maintainDurationSeconds) {
                        status.achieved = true;
                    }
                } else {
                    status.maintainedTime = 0; // Reset if condition breaks
                }
            } else {
                status.achieved = conditionMet;
            }
        }

        // Check if all objectives are complete
        const allComplete = Object.values(this.activeSession.objectiveStatus).every(s => s.achieved);
        if (allComplete) {
            this.activeSession.status = 'success';
        }

        return this.activeSession;
    }

    private checkCondition(objective: { type: string; target: number; targetMax?: number }, value: number): boolean {
        switch (objective.type) {
            case 'less_than':
                return value < objective.target;
            case 'greater_than':
                return value > objective.target;
            case 'equals':
                return Math.abs(value - objective.target) < 0.01;
            case 'range':
                return value >= objective.target && value <= (objective.targetMax || objective.target);
            default:
                return false;
        }
    }

    /**
     * Reveal a hint (applies penalty).
     */
    revealHint(hintIndex: number): void {
        if (!this.activeSession || !this.currentScenario) return;

        const hint = this.currentScenario.hints?.[hintIndex];
        if (hint && !this.activeSession.hintsRevealed.includes(hintIndex)) {
            this.activeSession.hintsRevealed.push(hintIndex);
            this.activeSession.hintPenalty += hint.penaltyPercent;
        }
    }

    /**
     * Complete the scenario and calculate final score.
     */
    completeScenario(): ScenarioResult | null {
        if (!this.activeSession || !this.currentScenario) return null;

        const elapsed = (Date.now() - this.activeSession.startedAt.getTime()) / 1000;

        let totalPoints = 0;
        let maxPoints = 0;
        const objectiveResults: Record<string, { achieved: boolean; points: number }> = {};

        for (const objective of this.currentScenario.objectives) {
            const status = this.activeSession.objectiveStatus[objective.id];
            const points = status.achieved ? objective.points : 0;
            totalPoints += points;
            maxPoints += objective.points;
            objectiveResults[objective.id] = { achieved: status.achieved, points };
        }

        // Apply hint penalty
        const penaltyMultiplier = 1 - (this.activeSession.hintPenalty / 100);
        totalPoints = Math.floor(totalPoints * penaltyMultiplier);

        // Determine medal
        const ratio = totalPoints / maxPoints;
        let medal: ScenarioResult['medal'] = 'none';
        if (ratio >= 0.95) medal = 'platinum';
        else if (ratio >= 0.80) medal = 'gold';
        else if (ratio >= 0.60) medal = 'silver';
        else if (ratio >= 0.40) medal = 'bronze';

        const result: ScenarioResult = {
            scenarioId: this.currentScenario.id,
            success: this.activeSession.status === 'success',
            totalPoints,
            maxPossiblePoints: maxPoints,
            timeElapsedSeconds: elapsed,
            objectiveResults,
            medal
        };

        // Save to localStorage for progress tracking
        this.saveProgress(result);

        return result;
    }

    private saveProgress(result: ScenarioResult): void {
        try {
            const key = `scenario_progress_${result.scenarioId}`;
            const existing = localStorage.getItem(key);
            const existingScore = existing ? JSON.parse(existing).totalPoints : 0;

            // Only save if new score is better
            if (result.totalPoints > existingScore) {
                localStorage.setItem(key, JSON.stringify({
                    ...result,
                    completedAt: new Date().toISOString()
                }));
            }
        } catch (e) {
            console.warn('Failed to save scenario progress:', e);
        }
    }

    getActiveSession(): ScenarioSession | null {
        return this.activeSession;
    }

    abandonScenario(): void {
        this.activeSession = null;
        this.currentScenario = null;
    }
}

export const scenarioService = new ScenarioService();

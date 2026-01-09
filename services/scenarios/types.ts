/**
 * Scenario System Types
 * Defines the structure for Engineering Challenges and Tutorials
 */

import { MechBlueprint } from '../../../types';

/**
 * A Scenario is a pre-configured challenge or tutorial with objectives.
 */
export interface Scenario {
    id: string;
    title: string;
    description: string;
    category: 'tutorial' | 'challenge' | 'experiment' | 'certification';
    difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
    thumbnail?: string; // Icon name

    /** The starting blueprint (the "broken" or initial state) */
    initialBlueprint: MechBlueprint;

    /** Success conditions */
    objectives: ScenarioObjective[];

    /** Hints available to the user (with score penalties) */
    hints?: ScenarioHint[];

    /** Time limit in seconds (optional) */
    timeLimitSeconds?: number;

    /** Tags for filtering */
    tags: string[];
}

/**
 * An objective is a measurable goal the user must achieve.
 */
export interface ScenarioObjective {
    id: string;
    description: string;

    /** The variable to monitor (from SimulationResult.variables) */
    variable: string;

    /** Comparison type */
    type: 'less_than' | 'greater_than' | 'equals' | 'range';

    /** Target value(s) */
    target: number;
    targetMax?: number; // For 'range' type

    /** For 'maintain' type: how long must the condition hold */
    maintainDurationSeconds?: number;

    /** Points awarded for completing this objective */
    points: number;
}

/**
 * A hint that can be revealed with a score penalty.
 */
export interface ScenarioHint {
    level: number; // 0 = free, 1 = -5%, 2 = -10%, etc.
    text: string;
    penaltyPercent: number;
}

/**
 * Runtime state for an active scenario session.
 */
export interface ScenarioSession {
    scenarioId: string;
    startedAt: Date;

    /** Current objective progress */
    objectiveStatus: Record<string, ObjectiveStatus>;

    /** Hints revealed so far */
    hintsRevealed: number[];

    /** Total accumulated penalty from hints */
    hintPenalty: number;

    /** Is the scenario complete? */
    status: 'in_progress' | 'success' | 'failed';

    /** Final score (if complete) */
    finalScore?: number;
}

export interface ObjectiveStatus {
    achieved: boolean;
    currentValue: number;
    maintainedTime?: number; // For 'maintain' type
}

/**
 * Result when a scenario completes.
 */
export interface ScenarioResult {
    scenarioId: string;
    success: boolean;
    totalPoints: number;
    maxPossiblePoints: number;
    timeElapsedSeconds: number;
    objectiveResults: Record<string, { achieved: boolean; points: number }>;
    medal: 'none' | 'bronze' | 'silver' | 'gold' | 'platinum';
}

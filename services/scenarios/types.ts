/**
 * Scenario System Types
 * Defines the structure for Engineering Challenges and Tutorials
 */

import { MechBlueprint } from '../../types';

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
    type: 'less_than' | 'greater_than' | 'equals' | 'range' | 'maintain';

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

/**
 * Time-based event for scenario timeline
 */
export interface MissionEvent {
    id: string;
    type: 'step' | 'ramp' | 'conditional' | 'periodic';
    name: string;
    description: string;

    /** When the event triggers (seconds from start) */
    triggerTime: number;

    /** What to modify */
    targetComponentId: string;
    targetParameter: string;

    /** Event configuration */
    value?: number;           // For step: new value
    duration?: number;        // For ramp: transition time
    condition?: string;       // For conditional: e.g., "temperature > 100"
    period?: number;          // For periodic: repeat interval
    maxRepeats?: number;      // For periodic: max occurrences

    /** Visual styling in timeline */
    color?: string;
    icon?: string;
}

/**
 * Mission constraints (budget, weight, etc.)
 */
export interface MissionConstraint {
    id: string;
    type: 'cost' | 'weight' | 'size' | 'efficiency' | 'emissions' | 'power';
    name: string;
    operator: 'less_than' | 'greater_than' | 'equals';
    value: number;
    unit: string;
    penalty?: number;  // Points deducted if violated
}

/**
 * Enhanced scenario with mission features
 */
export interface MissionScenario extends Scenario {
    /** Timeline events */
    events: MissionEvent[];

    /** Constraints for the mission */
    constraints: MissionConstraint[];

    /** Scoring configuration */
    scoring: {
        timeBonus: number;        // Points per second under time limit
        efficiencyBonus: number;  // Bonus for efficient solutions
        budgetBonus: number;      // Bonus for under budget
        perfectScore: number;     // Maximum possible score
    };

    /** Grading thresholds */
    grades: {
        platinum: number;  // % of max points
        gold: number;
        silver: number;
        bronze: number;
    };

    /** Background story/context */
    narrative?: string;

    /** Real-world context */
    context?: {
        industry: string;
        application: string;
        difficultyFactors: string[];
    };
}

/**
 * Mission session with enhanced tracking
 */
export interface MissionSession extends ScenarioSession {
    /** Current simulation time */
    currentTime: number;

    /** Active events */
    activeEvents: string[];

    /** Constraint status */
    constraintStatus: Record<string, { violated: boolean; currentValue: number }>;

    /** Running score breakdown */
    scoreBreakdown: {
        basePoints: number;
        timeBonus: number;
        efficiencyBonus: number;
        constraintPenalties: number;
        hintPenalties: number;
        total: number;
    };

    /** Milestones achieved */
    milestones: { id: string; time: number }[];
}

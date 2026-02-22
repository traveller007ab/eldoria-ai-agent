export interface ScenarioEvent {
    id: string;
    time: number; // seconds
    type: 'step' | 'ramp';
    targetComponentId: string;
    targetParameter: string; // e.g. "opening", "speed", "level"
    value: number;
    duration?: number; // for ramp
    status?: 'pending' | 'active' | 'completed';
}

export interface ScenarioDefinition {
    id: string;
    name: string;
    title?: string;
    description: string;
    duration: number; // Total simulation duration override
    timeLimitSeconds?: number;
    events: ScenarioEvent[];
}

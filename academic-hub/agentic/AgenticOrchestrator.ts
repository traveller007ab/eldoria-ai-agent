/**
 * Agentic Orchestrator - Central Hub for Academic Hub Agents
 * 
 * Coordinates all autonomous features:
 * - AutoResearchAgent: Discovers literature and citations
 * - WritingCoach: Provides real-time writing feedback
 * - DeadlineManager: Tracks milestones and pacing
 */

import { AcademicProject } from '../../types';

// Event types for agent communication
export type AgentEventType =
    | 'insight'
    | 'suggestion'
    | 'warning'
    | 'progress'
    | 'citation_found'
    | 'deadline_alert'
    | 'writing_tip';

export interface AgentEvent {
    id: string;
    type: AgentEventType;
    source: 'research' | 'writing' | 'deadline' | 'system';
    priority: 'low' | 'medium' | 'high' | 'critical';
    title: string;
    message: string;
    data?: Record<string, any>;
    timestamp: Date;
    read: boolean;
    actions?: AgentAction[];
}

export interface AgentAction {
    id: string;
    label: string;
    type: 'navigate' | 'apply' | 'dismiss' | 'custom';
    payload?: any;
}

export interface AgentConfig {
    enabled: boolean;
    researchAgent: {
        enabled: boolean;
        pollingIntervalMs: number;
        autoDiscover: boolean;
    };
    writingCoach: {
        enabled: boolean;
        checkOnChange: boolean;
        minWordsForAnalysis: number;
    };
    deadlineManager: {
        enabled: boolean;
        reminderDays: number[];
    };
}

const DEFAULT_CONFIG: AgentConfig = {
    enabled: true,
    researchAgent: {
        enabled: true,
        pollingIntervalMs: 60000,
        autoDiscover: true
    },
    writingCoach: {
        enabled: true,
        checkOnChange: true,
        minWordsForAnalysis: 100
    },
    deadlineManager: {
        enabled: true,
        reminderDays: [30, 14, 7, 3, 1]
    }
};

type EventCallback = (event: AgentEvent) => void;

class AgenticOrchestratorClass {
    private config: AgentConfig = DEFAULT_CONFIG;
    private events: AgentEvent[] = [];
    private listeners: Set<EventCallback> = new Set();
    private activeProject: AcademicProject | null = null;
    private intervalIds: number[] = [];

    /**
     * Initialize the orchestrator with a project
     */
    initialize(project: AcademicProject, customConfig?: Partial<AgentConfig>) {
        this.activeProject = project;
        this.config = { ...DEFAULT_CONFIG, ...customConfig };

        // Load saved events from localStorage
        this.loadEvents();

        // Start agent polling if enabled
        if (this.config.enabled) {
            this.startAgents();
        }

        // Emit welcome event
        this.emit({
            id: `welcome-${Date.now()}`,
            type: 'insight',
            source: 'system',
            priority: 'low',
            title: 'Agentic Mode Activated',
            message: 'Your AI research assistant is now monitoring your project.',
            timestamp: new Date(),
            read: false,
            actions: [
                { id: 'tour', label: 'Take Tour', type: 'custom' },
                { id: 'settings', label: 'Settings', type: 'navigate', payload: '/settings' }
            ]
        });
    }

    /**
     * Subscribe to agent events
     */
    subscribe(callback: EventCallback): () => void {
        this.listeners.add(callback);
        return () => this.listeners.delete(callback);
    }

    /**
     * Emit an event to all listeners
     */
    emit(event: AgentEvent) {
        this.events.unshift(event);
        this.events = this.events.slice(0, 100); // Keep last 100 events
        this.saveEvents();
        this.listeners.forEach(cb => cb(event));
    }

    /**
     * Get all events
     */
    getEvents(): AgentEvent[] {
        return [...this.events];
    }

    /**
     * Mark event as read
     */
    markRead(eventId: string) {
        const event = this.events.find(e => e.id === eventId);
        if (event) {
            event.read = true;
            this.saveEvents();
        }
    }

    /**
     * Get unread count
     */
    getUnreadCount(): number {
        return this.events.filter(e => !e.read).length;
    }

    /**
     * Start all enabled agents
     */
    private startAgents() {
        this.stopAgents(); // Clear any existing intervals

        // Research Agent Polling
        if (this.config.researchAgent.enabled) {
            const id = window.setInterval(() => {
                this.runResearchAgent();
            }, this.config.researchAgent.pollingIntervalMs);
            this.intervalIds.push(id);
        }

        // Deadline checks (once per hour)
        if (this.config.deadlineManager.enabled) {
            const id = window.setInterval(() => {
                this.runDeadlineManager();
            }, 3600000);
            this.intervalIds.push(id);

            // Run immediately
            this.runDeadlineManager();
        }
    }

    /**
     * Stop all agents
     */
    stopAgents() {
        this.intervalIds.forEach(id => window.clearInterval(id));
        this.intervalIds = [];
    }

    /**
     * Research Agent Logic
     */
    private runResearchAgent() {
        if (!this.activeProject) return;

        const refs = this.activeProject.references?.length || 0;
        const draftContent = this.activeProject.draft_content || {};
        const chaptersWithContent = Object.values(draftContent).filter(c =>
            typeof c === 'string' && c.length > 500
        ).length;

        // Suggest more citations if ratio is low
        if (chaptersWithContent > 0 && refs < chaptersWithContent * 3) {
            this.emit({
                id: `citation-${Date.now()}`,
                type: 'citation_found',
                source: 'research',
                priority: 'medium',
                title: 'Citations Needed',
                message: `You have ${refs} references for ${chaptersWithContent} substantial chapters. Academic rigor suggests 3-5 citations per chapter.`,
                timestamp: new Date(),
                read: false,
                actions: [
                    { id: 'discover', label: 'Auto-Discover', type: 'custom', payload: 'discover_citations' },
                    { id: 'dismiss', label: 'Dismiss', type: 'dismiss' }
                ]
            });
        }
    }

    /**
     * Deadline Manager Logic
     */
    private runDeadlineManager() {
        if (!this.activeProject) return;

        const wizard = this.activeProject.wizard_state;
        const draftContent = this.activeProject.draft_content || {};

        // Calculate completion percentage
        let totalWords = 0;
        Object.values(draftContent).forEach(content => {
            if (typeof content === 'string') {
                totalWords += content.split(/\s+/).length;
            }
        });

        const targetWords = wizard.generationConfig?.targetPageCount
            ? wizard.generationConfig.targetPageCount * 250
            : 15000;

        const completion = Math.min(100, (totalWords / targetWords) * 100);

        // Suggest pacing if behind
        if (completion < 30 && totalWords > 0) {
            this.emit({
                id: `pace-${Date.now()}`,
                type: 'deadline_alert',
                source: 'deadline',
                priority: 'high',
                title: 'Pacing Recommendation',
                message: `You're at ${completion.toFixed(0)}% completion. Consider setting daily writing goals to stay on track.`,
                timestamp: new Date(),
                read: false,
                actions: [
                    { id: 'plan', label: 'Create Writing Plan', type: 'custom' }
                ]
            });
        }
    }

    /**
     * Writing Coach - Analyze content quality
     */
    analyzeWriting(content: string): { score: number; tips: string[] } {
        const tips: string[] = [];
        let score = 100;

        // Check for passive voice patterns
        const passivePattern = /\b(is|are|was|were|been|being)\s+\w+ed\b/gi;
        const passiveMatches = content.match(passivePattern) || [];
        if (passiveMatches.length > 5) {
            tips.push('Consider reducing passive voice for stronger academic writing.');
            score -= 10;
        }

        // Check sentence length variation
        const sentences = content.split(/[.!?]+/).filter(s => s.trim().length > 0);
        const avgLength = sentences.reduce((sum, s) => sum + s.split(/\s+/).length, 0) / sentences.length;
        if (avgLength > 30) {
            tips.push('Some sentences are quite long. Consider breaking them up for readability.');
            score -= 10;
        }

        // Check for first person usage
        const firstPersonCount = (content.match(/\bI\b|\bwe\b|\bmy\b|\bour\b/gi) || []).length;
        if (firstPersonCount > 10) {
            tips.push('Academic writing typically uses third person. Consider revising first-person references.');
            score -= 5;
        }

        // Check for citations/references
        const citationPattern = /\(\d{4}\)|\[\d+\]/g;
        const citations = content.match(citationPattern) || [];
        if (sentences.length > 20 && citations.length < 3) {
            tips.push('Consider adding more in-text citations to support your claims.');
            score -= 15;
        }

        return { score: Math.max(0, score), tips };
    }

    /**
     * Persistence
     */
    private saveEvents() {
        try {
            localStorage.setItem('eldoria-agent-events', JSON.stringify(this.events.slice(0, 50)));
        } catch (e) {
            console.warn('Could not save agent events', e);
        }
    }

    private loadEvents() {
        try {
            const saved = localStorage.getItem('eldoria-agent-events');
            if (saved) {
                this.events = JSON.parse(saved);
            }
        } catch (e) {
            this.events = [];
        }
    }

    /**
     * Update config
     */
    updateConfig(updates: Partial<AgentConfig>) {
        this.config = { ...this.config, ...updates };
        if (this.config.enabled) {
            this.startAgents();
        } else {
            this.stopAgents();
        }
    }

    /**
     * Get current config
     */
    getConfig(): AgentConfig {
        return { ...this.config };
    }

    /**
     * Cleanup
     */
    destroy() {
        this.stopAgents();
        this.listeners.clear();
        this.activeProject = null;
    }
}

// Singleton export
export const AgenticOrchestrator = new AgenticOrchestratorClass();
export default AgenticOrchestrator;

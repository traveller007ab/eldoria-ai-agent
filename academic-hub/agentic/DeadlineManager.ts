/**
 * Deadline Manager Agent
 * 
 * Tracks project milestones, pacing, and deadline alerts.
 * Provides smart recommendations for staying on track.
 */

import { AcademicProject } from '../../types';
import { AgenticOrchestrator } from './AgenticOrchestrator';

export interface Milestone {
    id: string;
    name: string;
    dueDate: Date;
    completed: boolean;
    completedDate?: Date;
    description?: string;
    chapter?: string;
}

export interface ProjectDeadline {
    finalDeadline: Date | null;
    milestones: Milestone[];
    startDate: Date;
}

export interface PaceRecommendation {
    dailyWordTarget: number;
    weeklyWordTarget: number;
    currentPace: number;
    onTrack: boolean;
    daysRemaining: number;
    wordsRemaining: number;
    projectedCompletionDate: Date | null;
    message: string;
}

export interface ProgressSnapshot {
    date: Date;
    wordCount: number;
    chaptersCompleted: number;
}

class DeadlineManagerClass {
    private deadlines: Map<string, ProjectDeadline> = new Map();
    private progressHistory: Map<string, ProgressSnapshot[]> = new Map();

    /**
     * Initialize deadline tracking for a project
     */
    initializeProject(project: AcademicProject, finalDeadline?: Date) {
        const deadline: ProjectDeadline = {
            finalDeadline: finalDeadline || null,
            milestones: this.generateDefaultMilestones(project),
            startDate: new Date(project.created_at)
        };

        this.deadlines.set(project.id, deadline);
        this.loadFromStorage(project.id);

        return deadline;
    }

    /**
     * Generate default milestones based on project structure
     */
    private generateDefaultMilestones(project: AcademicProject): Milestone[] {
        const milestones: Milestone[] = [];
        const chapters = [
            'Front Matter',
            'Chapter 1: Introduction',
            'Chapter 2: Literature Review',
            'Chapter 3: Methodology',
            'Chapter 4: Results',
            'Chapter 5: Conclusion',
            'Final Review'
        ];

        const startDate = new Date(project.created_at);
        const weekMs = 7 * 24 * 60 * 60 * 1000;

        chapters.forEach((chapter, i) => {
            milestones.push({
                id: `milestone-${i}`,
                name: `Complete ${chapter}`,
                dueDate: new Date(startDate.getTime() + (weekMs * (i + 2))),
                completed: false,
                chapter
            });
        });

        return milestones;
    }

    /**
     * Set final deadline
     */
    setFinalDeadline(projectId: string, deadline: Date) {
        const project = this.deadlines.get(projectId);
        if (project) {
            project.finalDeadline = deadline;
            this.redistributeMilestones(projectId);
            this.saveToStorage(projectId);
        }
    }

    /**
     * Redistribute milestones evenly before deadline
     */
    private redistributeMilestones(projectId: string) {
        const deadline = this.deadlines.get(projectId);
        if (!deadline?.finalDeadline) return;

        const now = new Date();
        const totalTime = deadline.finalDeadline.getTime() - now.getTime();
        const incompleteMilestones = deadline.milestones.filter(m => !m.completed);
        const timePerMilestone = totalTime / (incompleteMilestones.length + 1);

        incompleteMilestones.forEach((milestone, i) => {
            milestone.dueDate = new Date(now.getTime() + timePerMilestone * (i + 1));
        });
    }

    /**
     * Mark milestone complete
     */
    completeMilestone(projectId: string, milestoneId: string) {
        const deadline = this.deadlines.get(projectId);
        const milestone = deadline?.milestones.find(m => m.id === milestoneId);
        if (milestone) {
            milestone.completed = true;
            milestone.completedDate = new Date();
            this.saveToStorage(projectId);

            AgenticOrchestrator.emit({
                id: `milestone-complete-${Date.now()}`,
                type: 'progress',
                source: 'deadline',
                priority: 'low',
                title: '🎉 Milestone Completed!',
                message: `"${milestone.name}" has been completed.`,
                timestamp: new Date(),
                read: false
            });
        }
    }

    /**
     * Calculate pacing recommendation
     */
    getPaceRecommendation(project: AcademicProject): PaceRecommendation {
        const deadline = this.deadlines.get(project.id);
        const wizard = project.wizard_state;
        const draftContent = project.draft_content || {};

        // Calculate current word count
        let currentWords = 0;
        Object.values(draftContent).forEach(content => {
            if (typeof content === 'string') {
                currentWords += content.split(/\s+/).length;
            }
        });

        // Target words
        const targetWords = (wizard.generationConfig?.targetPageCount || 60) * 250;
        const wordsRemaining = Math.max(0, targetWords - currentWords);

        // Days remaining
        const now = new Date();
        const finalDate = deadline?.finalDeadline || new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
        const msRemaining = Math.max(0, finalDate.getTime() - now.getTime());
        const daysRemaining = Math.ceil(msRemaining / (24 * 60 * 60 * 1000));

        // Calculate targets
        const dailyWordTarget = daysRemaining > 0 ? Math.ceil(wordsRemaining / daysRemaining) : 0;
        const weeklyWordTarget = dailyWordTarget * 7;

        // Calculate current pace from history
        const history = this.progressHistory.get(project.id) || [];
        let currentPace = 0;
        if (history.length >= 2) {
            const recent = history.slice(-7);
            const wordsDelta = recent[recent.length - 1].wordCount - recent[0].wordCount;
            const daysDelta = (recent[recent.length - 1].date.getTime() - recent[0].date.getTime()) / (24 * 60 * 60 * 1000);
            currentPace = daysDelta > 0 ? Math.round(wordsDelta / daysDelta) : 0;
        }

        // Project completion
        let projectedCompletionDate: Date | null = null;
        if (currentPace > 0 && wordsRemaining > 0) {
            const daysToComplete = wordsRemaining / currentPace;
            projectedCompletionDate = new Date(now.getTime() + daysToComplete * 24 * 60 * 60 * 1000);
        }

        const onTrack = currentPace >= dailyWordTarget || currentWords >= targetWords;

        // Generate message
        let message: string;
        if (currentWords >= targetWords) {
            message = '🎉 Congratulations! You\'ve reached your target word count!';
        } else if (onTrack) {
            message = `👍 Great pace! Keep writing ~${dailyWordTarget} words daily to finish on time.`;
        } else if (daysRemaining < 7) {
            message = `⚠️ Deadline approaching! Write ${dailyWordTarget} words daily to finish on time.`;
        } else {
            message = `📈 Increase your pace to ${dailyWordTarget} words/day (${daysRemaining} days left).`;
        }

        return {
            dailyWordTarget,
            weeklyWordTarget,
            currentPace,
            onTrack,
            daysRemaining,
            wordsRemaining,
            projectedCompletionDate,
            message
        };
    }

    /**
     * Record progress snapshot
     */
    recordProgress(project: AcademicProject) {
        const draftContent = project.draft_content || {};
        let wordCount = 0;
        let chaptersCompleted = 0;

        Object.values(draftContent).forEach(content => {
            if (typeof content === 'string') {
                wordCount += content.split(/\s+/).length;
                if (content.length > 500) chaptersCompleted++;
            }
        });

        const snapshot: ProgressSnapshot = {
            date: new Date(),
            wordCount,
            chaptersCompleted
        };

        const history = this.progressHistory.get(project.id) || [];
        history.push(snapshot);

        // Keep last 90 days
        const ninetyDaysAgo = Date.now() - 90 * 24 * 60 * 60 * 1000;
        this.progressHistory.set(
            project.id,
            history.filter(s => s.date.getTime() > ninetyDaysAgo)
        );

        this.saveToStorage(project.id);
    }

    /**
     * Get upcoming milestones
     */
    getUpcomingMilestones(projectId: string, days: number = 7): Milestone[] {
        const deadline = this.deadlines.get(projectId);
        if (!deadline) return [];

        const now = new Date();
        const cutoff = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);

        return deadline.milestones.filter(m =>
            !m.completed && m.dueDate <= cutoff
        ).sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
    }

    /**
     * Check and emit deadline alerts
     */
    checkDeadlines(projectId: string) {
        const upcoming = this.getUpcomingMilestones(projectId, 3);

        upcoming.forEach(milestone => {
            const daysUntil = Math.ceil(
                (milestone.dueDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)
            );

            if (daysUntil <= 1) {
                AgenticOrchestrator.emit({
                    id: `deadline-alert-${milestone.id}`,
                    type: 'deadline_alert',
                    source: 'deadline',
                    priority: 'critical',
                    title: '⏰ Deadline Tomorrow!',
                    message: `"${milestone.name}" is due ${daysUntil === 0 ? 'today' : 'tomorrow'}.`,
                    timestamp: new Date(),
                    read: false,
                    actions: [
                        { id: 'view', label: 'View Details', type: 'navigate' },
                        { id: 'complete', label: 'Mark Complete', type: 'custom', payload: milestone.id }
                    ]
                });
            }
        });
    }

    /**
     * Persistence
     */
    private saveToStorage(projectId: string) {
        try {
            const deadline = this.deadlines.get(projectId);
            const history = this.progressHistory.get(projectId);

            if (deadline) {
                localStorage.setItem(`eldoria-deadline-${projectId}`, JSON.stringify(deadline));
            }
            if (history) {
                localStorage.setItem(`eldoria-progress-${projectId}`, JSON.stringify(history));
            }
        } catch (e) {
            console.warn('Could not save deadline data', e);
        }
    }

    private loadFromStorage(projectId: string) {
        try {
            const deadlineData = localStorage.getItem(`eldoria-deadline-${projectId}`);
            if (deadlineData) {
                const parsed = JSON.parse(deadlineData);
                // Restore Date objects
                parsed.finalDeadline = parsed.finalDeadline ? new Date(parsed.finalDeadline) : null;
                parsed.startDate = new Date(parsed.startDate);
                parsed.milestones.forEach((m: Milestone) => {
                    m.dueDate = new Date(m.dueDate);
                    if (m.completedDate) m.completedDate = new Date(m.completedDate);
                });
                this.deadlines.set(projectId, parsed);
            }

            const historyData = localStorage.getItem(`eldoria-progress-${projectId}`);
            if (historyData) {
                const parsed = JSON.parse(historyData);
                parsed.forEach((s: ProgressSnapshot) => {
                    s.date = new Date(s.date);
                });
                this.progressHistory.set(projectId, parsed);
            }
        } catch (e) {
            console.warn('Could not load deadline data', e);
        }
    }

    /**
     * Get all milestones for a project
     */
    getMilestones(projectId: string): Milestone[] {
        return this.deadlines.get(projectId)?.milestones || [];
    }

    /**
     * Get progress history
     */
    getProgressHistory(projectId: string): ProgressSnapshot[] {
        return this.progressHistory.get(projectId) || [];
    }
}

export const DeadlineManager = new DeadlineManagerClass();
export default DeadlineManager;

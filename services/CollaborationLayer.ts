/**
 * CollaborationLayer - Foundation for Academic Hub Collaboration
 * 
 * MVP Implementation using localStorage for project export/import.
 * Prepared interface for future WebSocket/real-time integration.
 */

import { AcademicProject } from '../types';

// Types for collaboration
export interface CollaborationSession {
    id: string;
    projectId: string;
    hostName: string;
    createdAt: Date;
    lastActivity: Date;
    participants: Participant[];
    shareCode: string;
}

export interface Participant {
    id: string;
    name: string;
    role: 'owner' | 'editor' | 'viewer';
    joinedAt: Date;
    lastSeen: Date;
    color: string;
}

export interface ProjectSnapshot {
    version: number;
    timestamp: string;
    project: AcademicProject;
    exportedBy: string;
    checksum: string;
}

export interface CollaborationEvent {
    type: 'participant_joined' | 'participant_left' | 'content_updated' | 'comment_added';
    participantId: string;
    timestamp: Date;
    data?: Record<string, any>;
}

// Generate a simple share code
function generateShareCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
        code += chars[Math.floor(Math.random() * chars.length)];
    }
    return code;
}

// Generate a simple checksum for data integrity
function generateChecksum(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
        const char = data.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(8, '0');
}

// Participant colors for visual differentiation
const PARTICIPANT_COLORS = [
    '#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6',
    '#EF4444', '#06B6D4', '#84CC16', '#F97316', '#6366F1'
];

class CollaborationLayerClass {
    private sessions: Map<string, CollaborationSession> = new Map();
    private currentSession: CollaborationSession | null = null;
    private eventListeners: Set<(event: CollaborationEvent) => void> = new Set();

    constructor() {
        this.loadSessions();
    }

    // ==========================================================================
    // SESSION MANAGEMENT
    // ==========================================================================

    /**
     * Create a new collaboration session for a project
     */
    createSession(project: AcademicProject, hostName: string = 'Anonymous'): CollaborationSession {
        const session: CollaborationSession = {
            id: `session-${Date.now()}`,
            projectId: project.id,
            hostName,
            createdAt: new Date(),
            lastActivity: new Date(),
            shareCode: generateShareCode(),
            participants: [{
                id: `user-${Date.now()}`,
                name: hostName,
                role: 'owner',
                joinedAt: new Date(),
                lastSeen: new Date(),
                color: PARTICIPANT_COLORS[0]
            }]
        };

        this.sessions.set(session.id, session);
        this.currentSession = session;
        this.saveSessions();

        return session;
    }

    /**
     * Get the current active session
     */
    getCurrentSession(): CollaborationSession | null {
        return this.currentSession;
    }

    /**
     * End the current session
     */
    endSession(): void {
        if (this.currentSession) {
            this.sessions.delete(this.currentSession.id);
            this.currentSession = null;
            this.saveSessions();
        }
    }

    // ==========================================================================
    // EXPORT / IMPORT (MVP Collaboration)
    // ==========================================================================

    /**
     * Export a project as a shareable JSON snapshot
     */
    exportProject(project: AcademicProject, exporterName: string = 'Anonymous'): ProjectSnapshot {
        const projectJson = JSON.stringify(project);
        const snapshot: ProjectSnapshot = {
            version: 1,
            timestamp: new Date().toISOString(),
            project,
            exportedBy: exporterName,
            checksum: generateChecksum(projectJson)
        };

        return snapshot;
    }

    /**
     * Export to downloadable file
     */
    downloadProjectSnapshot(project: AcademicProject, exporterName: string = 'Anonymous'): void {
        const snapshot = this.exportProject(project, exporterName);
        const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const a = document.createElement('a');
        a.href = url;
        a.download = `${project.wizard_state?.basics?.title || 'thesis'}-snapshot-${Date.now()}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    /**
     * Import a project from a snapshot
     */
    importSnapshot(snapshotJson: string): { success: boolean; project?: AcademicProject; error?: string } {
        try {
            const snapshot: ProjectSnapshot = JSON.parse(snapshotJson);

            // Validate structure
            if (!snapshot.version || !snapshot.project || !snapshot.checksum) {
                return { success: false, error: 'Invalid snapshot format' };
            }

            // Verify checksum
            const projectJson = JSON.stringify(snapshot.project);
            const calculatedChecksum = generateChecksum(projectJson);
            if (calculatedChecksum !== snapshot.checksum) {
                console.warn('Checksum mismatch - project data may have been modified');
            }

            // Generate new ID to avoid conflicts
            const importedProject: AcademicProject = {
                ...snapshot.project,
                id: `imported-${Date.now()}`,
                created_at: new Date().toISOString()
            };

            return { success: true, project: importedProject };
        } catch (e) {
            return { success: false, error: `Failed to parse snapshot: ${(e as Error).message}` };
        }
    }

    /**
     * Import from file input
     */
    async importFromFile(file: File): Promise<{ success: boolean; project?: AcademicProject; error?: string }> {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.onload = (e) => {
                const content = e.target?.result as string;
                resolve(this.importSnapshot(content));
            };
            reader.onerror = () => {
                resolve({ success: false, error: 'Failed to read file' });
            };
            reader.readAsText(file);
        });
    }

    // ==========================================================================
    // ACTIVITY TIMELINE
    // ==========================================================================

    /**
     * Log an activity event
     */
    logActivity(type: CollaborationEvent['type'], participantId: string, data?: Record<string, any>): void {
        const event: CollaborationEvent = {
            type,
            participantId,
            timestamp: new Date(),
            data
        };

        // Store in localStorage for persistence
        const activities = this.getActivityLog();
        activities.unshift(event);
        localStorage.setItem('eldoria-collab-activities', JSON.stringify(activities.slice(0, 100)));

        // Notify listeners
        this.eventListeners.forEach(listener => listener(event));
    }

    /**
     * Get activity log
     */
    getActivityLog(): CollaborationEvent[] {
        try {
            const saved = localStorage.getItem('eldoria-collab-activities');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    }

    // ==========================================================================
    // EVENT SYSTEM
    // ==========================================================================

    /**
     * Subscribe to collaboration events
     */
    subscribe(callback: (event: CollaborationEvent) => void): () => void {
        this.eventListeners.add(callback);
        return () => this.eventListeners.delete(callback);
    }

    // ==========================================================================
    // PERSISTENCE
    // ==========================================================================

    private saveSessions(): void {
        try {
            const sessionsArray = Array.from(this.sessions.values());
            localStorage.setItem('eldoria-collab-sessions', JSON.stringify(sessionsArray));
        } catch (e) {
            console.warn('Failed to save collaboration sessions', e);
        }
    }

    private loadSessions(): void {
        try {
            const saved = localStorage.getItem('eldoria-collab-sessions');
            if (saved) {
                const sessionsArray: CollaborationSession[] = JSON.parse(saved);
                sessionsArray.forEach(session => {
                    this.sessions.set(session.id, session);
                });
            }
        } catch (e) {
            console.warn('Failed to load collaboration sessions', e);
        }
    }

    // ==========================================================================
    // FUTURE: REAL-TIME SYNC PREPARATION
    // ==========================================================================

    /**
     * Placeholder for WebSocket connection
     * To be implemented when real-time collaboration is needed
     */
    async connectRealtime(_sessionId: string): Promise<{ connected: boolean; message: string }> {
        console.log('Real-time collaboration not yet implemented');
        return {
            connected: false,
            message: 'Real-time sync is coming soon. Use export/import for now.'
        };
    }

    /**
     * Placeholder for syncing changes
     */
    async syncChanges(_projectId: string, _changes: any): Promise<boolean> {
        console.log('Real-time sync not yet implemented');
        return false;
    }
}

// Singleton export
export const CollaborationLayer = new CollaborationLayerClass();
export default CollaborationLayer;

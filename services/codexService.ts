/**
 * Neural Codex Service
 * 
 * Frontend service to interact with Convex database for Neural Codex.
 * Uses the Python bridge for Convex operations.
 */

import { bridgeClient } from './bridgeClient';

// Types
export interface CodexThread {
    _id: string;
    userId: string;
    projectId?: string;
    title: string;
    tags: string[];
    color?: string;
    pinned: boolean;
    archived: boolean;
    lastMessageAt: number;
    messageCount: number;
    preview?: string;
    createdAt: number;
    updatedAt: number;
}

export interface CodexMessage {
    _id: string;
    threadId: string;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    createdAt: number;
    attachments?: CodexAttachment[];
}

export interface CodexAttachment {
    _id: string;
    messageId: string;
    type: 'code' | 'file' | 'screenshot' | 'voice' | 'link';
    content?: string;
    fileUrl?: string;
    fileName?: string;
    language?: string;
    metadata?: any;
    createdAt: number;
}

export interface CodexStats {
    totalThreads: number;
    activeThreads: number;
    pinnedThreads: number;
    archivedThreads: number;
    totalMessages: number;
    uniqueTags: number;
    topTags: string[];
}

class CodexService {
    private baseUrl: string;

    constructor() {
        this.baseUrl = 'http://localhost:3001/api/codex';
    }

    // ============================================
    // THREAD OPERATIONS
    // ============================================

    async listThreads(options?: {
        includeArchived?: boolean;
        tag?: string;
        limit?: number;
    }): Promise<CodexThread[]> {
        try {
            const params = new URLSearchParams();
            if (options?.includeArchived) params.append('includeArchived', 'true');
            if (options?.tag) params.append('tag', options.tag);
            if (options?.limit) params.append('limit', options.limit.toString());

            const response = await fetch(`${this.baseUrl}/threads?${params}`);
            if (!response.ok) throw new Error('Failed to fetch threads');
            return await response.json();
        } catch (error) {
            console.error('CodexService.listThreads error:', error);
            return [];
        }
    }

    async getThread(threadId: string): Promise<CodexThread | null> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('CodexService.getThread error:', error);
            return null;
        }
    }

    async createThread(data: {
        title: string;
        projectId?: string;
        tags?: string[];
    }): Promise<CodexThread | null> {
        try {
            const response = await fetch(`${this.baseUrl}/threads`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to create thread');
            return await response.json();
        } catch (error) {
            console.error('CodexService.createThread error:', error);
            return null;
        }
    }

    async updateThread(threadId: string, data: {
        title?: string;
        tags?: string[];
        pinned?: boolean;
        archived?: boolean;
    }): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            return response.ok;
        } catch (error) {
            console.error('CodexService.updateThread error:', error);
            return false;
        }
    }

    async deleteThread(threadId: string): Promise<boolean> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}`, {
                method: 'DELETE'
            });
            return response.ok;
        } catch (error) {
            console.error('CodexService.deleteThread error:', error);
            return false;
        }
    }

    async searchThreads(query: string): Promise<CodexThread[]> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/search?q=${encodeURIComponent(query)}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('CodexService.searchThreads error:', error);
            return [];
        }
    }

    // ============================================
    // MESSAGE OPERATIONS
    // ============================================

    async listMessages(threadId: string, limit?: number): Promise<CodexMessage[]> {
        try {
            const params = new URLSearchParams();
            if (limit) params.append('limit', limit.toString());

            const response = await fetch(`${this.baseUrl}/threads/${threadId}/messages?${params}`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('CodexService.listMessages error:', error);
            return [];
        }
    }

    async addMessage(threadId: string, data: {
        role: 'user' | 'assistant' | 'system';
        content: string;
        metadata?: any;
    }): Promise<CodexMessage | null> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to add message');
            return await response.json();
        } catch (error) {
            console.error('CodexService.addMessage error:', error);
            return null;
        }
    }

    // ============================================
    // ATTACHMENT OPERATIONS
    // ============================================

    async addAttachment(messageId: string, data: {
        type: 'code' | 'file' | 'screenshot' | 'voice' | 'link';
        content?: string;
        fileUrl?: string;
        fileName?: string;
        language?: string;
    }): Promise<CodexAttachment | null> {
        try {
            const response = await fetch(`${this.baseUrl}/messages/${messageId}/attachments`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            });
            if (!response.ok) throw new Error('Failed to add attachment');
            return await response.json();
        } catch (error) {
            console.error('CodexService.addAttachment error:', error);
            return null;
        }
    }

    // ============================================
    // STATS & INSIGHTS
    // ============================================

    async getStats(): Promise<CodexStats | null> {
        try {
            const response = await fetch(`${this.baseUrl}/stats`);
            if (!response.ok) return null;
            return await response.json();
        } catch (error) {
            console.error('CodexService.getStats error:', error);
            return null;
        }
    }

    async getRelatedThreads(threadId: string): Promise<CodexThread[]> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}/related`);
            if (!response.ok) return [];
            return await response.json();
        } catch (error) {
            console.error('CodexService.getRelatedThreads error:', error);
            return [];
        }
    }

    // ============================================
    // EXPORT
    // ============================================

    async exportThread(threadId: string, format: 'markdown' | 'json' | 'pdf'): Promise<Blob | null> {
        try {
            const response = await fetch(`${this.baseUrl}/threads/${threadId}/export?format=${format}`);
            if (!response.ok) return null;
            return await response.blob();
        } catch (error) {
            console.error('CodexService.exportThread error:', error);
            return null;
        }
    }
}

export const codexService = new CodexService();
export default codexService;

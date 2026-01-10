/**
 * Offline Cache Service
 * 
 * IndexedDB-based caching for offline Academic Hub functionality.
 * Stores generated content, references, and project snapshots.
 */

import { AcademicProject } from '../types';

const DB_NAME = 'eldoria-academic-offline';
const DB_VERSION = 1;

export interface CachedContent {
    key: string;
    content: string;
    projectId: string;
    chapterName?: string;
    createdAt: Date;
    expiresAt?: Date;
    source: 'ai-generated' | 'user-authored' | 'imported';
}

export interface CachedResponse {
    prompt: string;
    response: string;
    model: string;
    timestamp: Date;
    projectId?: string;
}

class OfflineCacheClass {
    private db: IDBDatabase | null = null;
    private isOnline: boolean = navigator.onLine;
    private queuedRequests: Array<{ action: string; data: any }> = [];

    constructor() {
        // Listen for online/offline events
        if (typeof window !== 'undefined') {
            window.addEventListener('online', () => this.handleOnline());
            window.addEventListener('offline', () => this.handleOffline());
        }
    }

    /**
     * Initialize IndexedDB
     */
    async init(): Promise<boolean> {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(true);
                return;
            }

            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onerror = () => {
                console.error('IndexedDB failed to open');
                resolve(false);
            };

            request.onsuccess = () => {
                this.db = request.result;
                resolve(true);
            };

            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;

                // Content cache store
                if (!db.objectStoreNames.contains('content')) {
                    const contentStore = db.createObjectStore('content', { keyPath: 'key' });
                    contentStore.createIndex('projectId', 'projectId', { unique: false });
                    contentStore.createIndex('createdAt', 'createdAt', { unique: false });
                }

                // AI response cache
                if (!db.objectStoreNames.contains('responses')) {
                    const responseStore = db.createObjectStore('responses', { keyPath: 'prompt' });
                    responseStore.createIndex('timestamp', 'timestamp', { unique: false });
                }

                // Project snapshots
                if (!db.objectStoreNames.contains('projects')) {
                    db.createObjectStore('projects', { keyPath: 'id' });
                }

                // Reference cache
                if (!db.objectStoreNames.contains('references')) {
                    const refStore = db.createObjectStore('references', { keyPath: 'id' });
                    refStore.createIndex('projectId', 'projectId', { unique: false });
                }
            };
        });
    }

    /**
     * Check if we're online
     */
    get online(): boolean {
        return this.isOnline;
    }

    /**
     * Handle coming online
     */
    private async handleOnline() {
        this.isOnline = true;
        console.log('[OfflineCache] Back online, processing queued requests...');
        await this.processQueue();
    }

    /**
     * Handle going offline
     */
    private handleOffline() {
        this.isOnline = false;
        console.log('[OfflineCache] Gone offline, queuing requests...');
    }

    /**
     * Cache generated content
     */
    async cacheContent(item: Omit<CachedContent, 'createdAt'>): Promise<void> {
        await this.init();
        if (!this.db) return;

        const entry: CachedContent = {
            ...item,
            createdAt: new Date()
        };

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('content', 'readwrite');
            const store = tx.objectStore('content');
            const request = store.put(entry);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cached content
     */
    async getContent(key: string): Promise<CachedContent | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('content', 'readonly');
            const store = tx.objectStore('content');
            const request = store.get(key);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get all cached content for a project
     */
    async getProjectContent(projectId: string): Promise<CachedContent[]> {
        await this.init();
        if (!this.db) return [];

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('content', 'readonly');
            const store = tx.objectStore('content');
            const index = store.index('projectId');
            const request = index.getAll(projectId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Cache AI response
     */
    async cacheResponse(prompt: string, response: string, model: string, projectId?: string): Promise<void> {
        await this.init();
        if (!this.db) return;

        // Use hash of prompt for more efficient lookup
        const promptKey = await this.hashString(prompt);

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('responses', 'readwrite');
            const store = tx.objectStore('responses');
            const request = store.put({
                prompt: promptKey,
                originalPrompt: prompt.substring(0, 500), // Store truncated version for debugging
                response,
                model,
                timestamp: new Date(),
                projectId
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get cached AI response
     */
    async getCachedResponse(prompt: string): Promise<string | null> {
        await this.init();
        if (!this.db) return null;

        const promptKey = await this.hashString(prompt);

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('responses', 'readonly');
            const store = tx.objectStore('responses');
            const request = store.get(promptKey);

            request.onsuccess = () => resolve(request.result?.response || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Save project snapshot
     */
    async saveProjectSnapshot(project: AcademicProject): Promise<void> {
        await this.init();
        if (!this.db) return;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('projects', 'readwrite');
            const store = tx.objectStore('projects');
            const request = store.put({
                ...project,
                _cachedAt: new Date().toISOString()
            });

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Get project snapshot
     */
    async getProjectSnapshot(projectId: string): Promise<AcademicProject | null> {
        await this.init();
        if (!this.db) return null;

        return new Promise((resolve, reject) => {
            const tx = this.db!.transaction('projects', 'readonly');
            const store = tx.objectStore('projects');
            const request = store.get(projectId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    }

    /**
     * Queue request for later processing
     */
    queueRequest(action: string, data: any) {
        this.queuedRequests.push({ action, data });
        this.saveQueue();
    }

    /**
     * Process queued requests when back online
     */
    private async processQueue() {
        const queue = [...this.queuedRequests];
        this.queuedRequests = [];
        this.saveQueue();

        for (const item of queue) {
            try {
                console.log(`[OfflineCache] Processing queued: ${item.action}`);
                // Implement queue processing logic based on action type
            } catch (e) {
                console.error('Queue processing failed:', e);
                this.queuedRequests.push(item);
            }
        }
    }

    /**
     * Save queue to localStorage
     */
    private saveQueue() {
        try {
            localStorage.setItem('eldoria-offline-queue', JSON.stringify(this.queuedRequests));
        } catch (e) {
            console.warn('Could not save offline queue');
        }
    }

    /**
     * Load queue from localStorage
     */
    loadQueue() {
        try {
            const saved = localStorage.getItem('eldoria-offline-queue');
            if (saved) {
                this.queuedRequests = JSON.parse(saved);
            }
        } catch (e) {
            this.queuedRequests = [];
        }
    }

    /**
     * Hash string for cache key
     */
    private async hashString(str: string): Promise<string> {
        if (typeof crypto !== 'undefined' && crypto.subtle) {
            const buffer = new TextEncoder().encode(str);
            const hash = await crypto.subtle.digest('SHA-256', buffer);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
        }
        // Fallback for environments without crypto
        return btoa(str.substring(0, 100)).replace(/[^a-zA-Z0-9]/g, '');
    }

    /**
     * Clear all cached data
     */
    async clearAll(): Promise<void> {
        await this.init();
        if (!this.db) return;

        const stores = ['content', 'responses', 'projects', 'references'];

        for (const store of stores) {
            await new Promise<void>((resolve, reject) => {
                const tx = this.db!.transaction(store, 'readwrite');
                const storeObj = tx.objectStore(store);
                const request = storeObj.clear();
                request.onsuccess = () => resolve();
                request.onerror = () => reject(request.error);
            });
        }
    }

    /**
     * Get cache statistics
     */
    async getStats(): Promise<{
        contentCount: number;
        responsesCount: number;
        projectsCount: number;
        estimatedSize: string;
    }> {
        await this.init();
        if (!this.db) {
            return { contentCount: 0, responsesCount: 0, projectsCount: 0, estimatedSize: '0 KB' };
        }

        const getCounts = async (storeName: string): Promise<number> => {
            return new Promise((resolve) => {
                const tx = this.db!.transaction(storeName, 'readonly');
                const store = tx.objectStore(storeName);
                const request = store.count();
                request.onsuccess = () => resolve(request.result);
                request.onerror = () => resolve(0);
            });
        };

        const contentCount = await getCounts('content');
        const responsesCount = await getCounts('responses');
        const projectsCount = await getCounts('projects');

        // Estimate size based on counts
        const estimatedBytes = (contentCount * 5000) + (responsesCount * 2000) + (projectsCount * 10000);
        const estimatedSize = estimatedBytes > 1000000
            ? `${(estimatedBytes / 1000000).toFixed(1)} MB`
            : `${(estimatedBytes / 1000).toFixed(0)} KB`;

        return { contentCount, responsesCount, projectsCount, estimatedSize };
    }
}

export const OfflineCache = new OfflineCacheClass();
export default OfflineCache;

/**
 * useCodex - React Hook for Neural Codex
 * 
 * Provides state management and API integration for the Neural Codex terminal.
 */

import { useState, useEffect, useCallback } from 'react';
import codexService, {
    CodexThread,
    CodexMessage,
    CodexAttachment,
    CodexStats
} from '../services/codexService';

interface UseCodexReturn {
    // Thread state
    threads: CodexThread[];
    activeThread: CodexThread | null;
    isLoadingThreads: boolean;

    // Message state
    messages: CodexMessage[];
    isLoadingMessages: boolean;
    isSending: boolean;

    // Stats
    stats: CodexStats | null;

    // Thread actions
    loadThreads: (options?: { tag?: string; includeArchived?: boolean }) => Promise<void>;
    selectThread: (thread: CodexThread) => Promise<void>;
    createThread: (title: string, tags?: string[]) => Promise<CodexThread | null>;
    updateThread: (threadId: string, updates: Partial<CodexThread>) => Promise<void>;
    deleteThread: (threadId: string) => Promise<void>;
    pinThread: (threadId: string, pinned: boolean) => Promise<void>;
    archiveThread: (threadId: string) => Promise<void>;

    // Message actions
    sendMessage: (content: string, attachments?: Partial<CodexAttachment>[]) => Promise<void>;

    // Search
    searchThreads: (query: string) => Promise<CodexThread[]>;

    // Export
    exportThread: (format: 'markdown' | 'json' | 'pdf') => Promise<void>;

    // Clear
    clearActiveThread: () => void;
}

export function useCodex(): UseCodexReturn {
    // Thread state
    const [threads, setThreads] = useState<CodexThread[]>([]);
    const [activeThread, setActiveThread] = useState<CodexThread | null>(null);
    const [isLoadingThreads, setIsLoadingThreads] = useState(false);

    // Message state
    const [messages, setMessages] = useState<CodexMessage[]>([]);
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [isSending, setIsSending] = useState(false);

    // Stats
    const [stats, setStats] = useState<CodexStats | null>(null);

    // Load threads
    const loadThreads = useCallback(async (options?: { tag?: string; includeArchived?: boolean }) => {
        setIsLoadingThreads(true);
        try {
            const result = await codexService.listThreads(options);
            setThreads(result);
        } catch (error) {
            console.error('Failed to load threads:', error);
        } finally {
            setIsLoadingThreads(false);
        }
    }, []);

    // Select and load a thread
    const selectThread = useCallback(async (thread: CodexThread) => {
        setActiveThread(thread);
        setIsLoadingMessages(true);
        try {
            const result = await codexService.listMessages(thread._id);
            setMessages(result);
        } catch (error) {
            console.error('Failed to load messages:', error);
        } finally {
            setIsLoadingMessages(false);
        }
    }, []);

    // Create thread
    const createThread = useCallback(async (title: string, tags: string[] = []): Promise<CodexThread | null> => {
        try {
            const thread = await codexService.createThread({ title, tags });
            if (thread) {
                setThreads(prev => [thread, ...prev]);
                setActiveThread(thread);
                setMessages([]);
            }
            return thread;
        } catch (error) {
            console.error('Failed to create thread:', error);
            return null;
        }
    }, []);

    // Update thread
    const updateThread = useCallback(async (threadId: string, updates: Partial<CodexThread>) => {
        try {
            await codexService.updateThread(threadId, updates);
            setThreads(prev => prev.map(t =>
                t._id === threadId ? { ...t, ...updates } : t
            ));
            if (activeThread?._id === threadId) {
                setActiveThread(prev => prev ? { ...prev, ...updates } : null);
            }
        } catch (error) {
            console.error('Failed to update thread:', error);
        }
    }, [activeThread]);

    // Delete thread
    const deleteThread = useCallback(async (threadId: string) => {
        try {
            await codexService.deleteThread(threadId);
            setThreads(prev => prev.filter(t => t._id !== threadId));
            if (activeThread?._id === threadId) {
                setActiveThread(null);
                setMessages([]);
            }
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
    }, [activeThread]);

    // Pin/unpin thread
    const pinThread = useCallback(async (threadId: string, pinned: boolean) => {
        await updateThread(threadId, { pinned } as any);
    }, [updateThread]);

    // Archive thread
    const archiveThread = useCallback(async (threadId: string) => {
        await updateThread(threadId, { archived: true } as any);
    }, [updateThread]);

    // Send message
    const sendMessage = useCallback(async (content: string, attachments?: Partial<CodexAttachment>[]) => {
        if (!activeThread) return;

        setIsSending(true);
        try {
            // Add user message
            const userMessage = await codexService.addMessage(activeThread._id, {
                role: 'user',
                content
            });

            if (userMessage) {
                setMessages(prev => [...prev, userMessage]);

                // Add attachments if any
                if (attachments && attachments.length > 0) {
                    for (const att of attachments) {
                        await codexService.addAttachment(userMessage._id, att as any);
                    }
                }

                // Update thread stats locally
                setThreads(prev => prev.map(t =>
                    t._id === activeThread._id
                        ? { ...t, messageCount: t.messageCount + 1, lastMessageAt: Date.now() }
                        : t
                ));
            }

            // TODO: Actually send to AI and get response
            // For now, simulate AI response
            setTimeout(async () => {
                if (!activeThread) return;

                const aiMessage = await codexService.addMessage(activeThread._id, {
                    role: 'assistant',
                    content: `I understand you're asking about "${content.slice(0, 50)}...". Let me help you with that.`
                });

                if (aiMessage) {
                    setMessages(prev => [...prev, aiMessage]);
                }
                setIsSending(false);
            }, 1500);

        } catch (error) {
            console.error('Failed to send message:', error);
            setIsSending(false);
        }
    }, [activeThread]);

    // Search threads
    const searchThreads = useCallback(async (query: string): Promise<CodexThread[]> => {
        try {
            return await codexService.searchThreads(query);
        } catch (error) {
            console.error('Failed to search threads:', error);
            return [];
        }
    }, []);

    // Export thread
    const exportThread = useCallback(async (format: 'markdown' | 'json' | 'pdf') => {
        if (!activeThread) return;

        try {
            const blob = await codexService.exportThread(activeThread._id, format);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `${activeThread.title}.${format === 'markdown' ? 'md' : format}`;
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
            }
        } catch (error) {
            console.error('Failed to export thread:', error);
        }
    }, [activeThread]);

    // Clear active thread
    const clearActiveThread = useCallback(() => {
        setActiveThread(null);
        setMessages([]);
    }, []);

    // Load threads and stats on mount
    useEffect(() => {
        loadThreads();
        codexService.getStats().then(setStats);
    }, [loadThreads]);

    return {
        threads,
        activeThread,
        isLoadingThreads,
        messages,
        isLoadingMessages,
        isSending,
        stats,
        loadThreads,
        selectThread,
        createThread,
        updateThread,
        deleteThread,
        pinThread,
        archiveThread,
        sendMessage,
        searchThreads,
        exportThread,
        clearActiveThread,
    };
}

export default useCodex;

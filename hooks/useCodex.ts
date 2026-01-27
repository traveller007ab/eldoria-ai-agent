import { useState, useCallback, useMemo } from 'react';
import { useQuery, useMutation } from "convex/react";
import { api } from "../backend/convex/_generated/api";
import { Id } from "../backend/convex/_generated/dataModel";

export interface CodexThread {
    _id: Id<"codexThreads">;
    userId: Id<"users">;
    projectId?: Id<"projects">;
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
    _id: Id<"codexMessages">;
    threadId: Id<"codexThreads">;
    role: 'user' | 'assistant' | 'system';
    content: string;
    metadata?: any;
    createdAt: number;
    attachments?: CodexAttachment[];
}

export interface CodexAttachment {
    _id: Id<"codexAttachments">;
    messageId: Id<"codexMessages">;
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
    selectThread: (thread: CodexThread) => void;
    createThread: (title: string, tags?: string[]) => Promise<Id<"codexThreads"> | null>;
    updateThread: (threadId: Id<"codexThreads">, updates: Partial<CodexThread>) => Promise<void>;
    deleteThread: (threadId: Id<"codexThreads">) => Promise<void>;
    pinThread: (threadId: Id<"codexThreads">, pinned: boolean) => Promise<void>;
    archiveThread: (threadId: Id<"codexThreads">) => Promise<void>;

    // Message actions
    sendMessage: (content: string, attachments?: Partial<CodexAttachment>[]) => Promise<void>;

    // Search
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    searchResults: CodexThread[];

    // Export
    exportThread: (format: 'markdown' | 'json' | 'pdf') => Promise<void>;

    // Clear
    clearActiveThread: () => void;
}

export function useCodex(userId?: Id<"users">): UseCodexReturn {
    // State
    const [activeThreadId, setActiveThreadId] = useState<Id<"codexThreads"> | null>(null);
    const [searchQuery, setSearchQuery] = useState("");
    const [isSending, setIsSending] = useState(false);

    // Queries
    // @ts-ignore - codex module might not be fully infra-recognized in TS but exists in runtime
    const threads = useQuery(api.codex.listThreads, userId ? { userId } : "skip") as CodexThread[] | undefined;
    // @ts-ignore
    const messages = useQuery(api.codex.listMessages, activeThreadId ? { threadId: activeThreadId } : "skip") as CodexMessage[] | undefined;
    // @ts-ignore
    const stats = useQuery(api.codex.getStats, userId ? { userId } : "skip") as CodexStats | undefined;
    // @ts-ignore
    const searchResults = useQuery(api.codex.searchThreads, (userId && searchQuery) ? { userId, query: searchQuery } : "skip") as CodexThread[] | undefined;

    // Mutations
    // @ts-ignore
    const createThreadMutation = useMutation(api.codex.createThread);
    // @ts-ignore
    const updateThreadMutation = useMutation(api.codex.updateThread);
    // @ts-ignore
    const deleteThreadMutation = useMutation(api.codex.deleteThread);
    // @ts-ignore
    const addMessageMutation = useMutation(api.codex.addMessage);
    // @ts-ignore
    const addAttachmentMutation = useMutation(api.codex.addAttachment);

    // Computed
    const activeThread = useMemo(() => {
        if (!threads || !activeThreadId) return null;
        return threads.find(t => t._id === activeThreadId) || null;
    }, [threads, activeThreadId]);

    // Actions
    const selectThread = useCallback((thread: CodexThread) => {
        setActiveThreadId(thread._id);
    }, []);

    const createThread = useCallback(async (title: string, tags: string[] = []) => {
        if (!userId) return null;
        try {
            const threadId = await createThreadMutation({ userId, title, tags });
            setActiveThreadId(threadId);
            return threadId;
        } catch (error) {
            console.error('Failed to create thread:', error);
            return null;
        }
    }, [userId, createThreadMutation]);

    const updateThread = useCallback(async (threadId: Id<"codexThreads">, updates: any) => {
        try {
            await updateThreadMutation({ threadId, ...updates });
        } catch (error) {
            console.error('Failed to update thread:', error);
        }
    }, [updateThreadMutation]);

    const deleteThread = useCallback(async (threadId: Id<"codexThreads">) => {
        try {
            await deleteThreadMutation({ threadId });
            if (activeThreadId === threadId) {
                setActiveThreadId(null);
            }
        } catch (error) {
            console.error('Failed to delete thread:', error);
        }
    }, [activeThreadId, deleteThreadMutation]);

    const pinThread = useCallback(async (threadId: Id<"codexThreads">, pinned: boolean) => {
        await updateThread(threadId, { pinned });
    }, [updateThread]);

    const archiveThread = useCallback(async (threadId: Id<"codexThreads">) => {
        await updateThread(threadId, { archived: true });
    }, [updateThread]);

    const sendMessage = useCallback(async (content: string, attachments?: any[]) => {
        if (!activeThreadId) return;

        setIsSending(true);
        try {
            const messageId = await addMessageMutation({
                threadId: activeThreadId,
                role: 'user',
                content
            });

            if (attachments && attachments.length > 0) {
                for (const att of attachments) {
                    await addAttachmentMutation({
                        messageId,
                        ...att
                    });
                }
            }

            // AI response is usually handled by a separate background process or an action
            // For now, we'll monitor the messages list which is reactive

        } catch (error) {
            console.error('Failed to send message:', error);
        } finally {
            setIsSending(false);
        }
    }, [activeThreadId, addMessageMutation, addAttachmentMutation]);

    const exportThread = useCallback(async (format: 'markdown' | 'json' | 'pdf') => {
        if (!activeThread) return;

        // Import dynamically to avoid circular dependencies if any
        const { CodexExportEngine } = await import('../services/agentic/CodexExportEngine');

        if (format === 'markdown') {
            CodexExportEngine.downloadThreadExport(activeThread, messages || []);
        } else {
            console.warn(`Format ${format} not supported yet in CodexExportEngine`);
        }
    }, [activeThread, messages]);

    const clearActiveThread = useCallback(() => {
        setActiveThreadId(null);
    }, []);

    return {
        threads: threads || [],
        activeThread,
        isLoadingThreads: threads === undefined,
        messages: messages || [],
        isLoadingMessages: messages === undefined,
        isSending,
        stats: stats || null,
        selectThread,
        createThread,
        updateThread,
        deleteThread,
        pinThread,
        archiveThread,
        sendMessage,
        searchQuery,
        setSearchQuery,
        searchResults: searchResults || [],
        exportThread,
        clearActiveThread,
    };
}

export default useCodex;

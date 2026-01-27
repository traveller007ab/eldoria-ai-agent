/**
 * Neural Codex - Convex Functions
 * 
 * CRUD operations for the Neural Codex persistent AI conversation system.
 */

import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ============================================
// THREAD QUERIES
// ============================================

/**
 * List all threads for a user
 */
export const listThreads = query({
    args: {
        userId: v.id("users"),
        includeArchived: v.optional(v.boolean()),
        tag: v.optional(v.string()),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let threads = await ctx.db
            .query("codexThreads")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .order("desc")
            .collect();

        // Filter archived
        if (!args.includeArchived) {
            threads = threads.filter((t) => !t.archived);
        }

        // Filter by tag
        if (args.tag) {
            threads = threads.filter((t) => t.tags.includes(args.tag));
        }

        // Sort: pinned first, then by lastMessageAt
        threads.sort((a, b) => {
            if (a.pinned && !b.pinned) return -1;
            if (!a.pinned && b.pinned) return 1;
            return b.lastMessageAt - a.lastMessageAt;
        });

        // Limit
        if (args.limit) {
            threads = threads.slice(0, args.limit);
        }

        return threads;
    },
});

/**
 * Get a single thread by ID
 */
export const getThread = query({
    args: {
        threadId: v.id("codexThreads"),
    },
    handler: async (ctx, args) => {
        return await ctx.db.get(args.threadId);
    },
});

/**
 * Search threads by query
 */
export const searchThreads = query({
    args: {
        userId: v.id("users"),
        query: v.string(),
    },
    handler: async (ctx, args) => {
        const threads = await ctx.db
            .query("codexThreads")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const queryLower = args.query.toLowerCase();

        return threads.filter((t) =>
            t.title.toLowerCase().includes(queryLower) ||
            t.tags.some((tag) => tag.toLowerCase().includes(queryLower)) ||
            (t.preview && t.preview.toLowerCase().includes(queryLower))
        );
    },
});

// ============================================
// THREAD MUTATIONS
// ============================================

/**
 * Create a new thread
 */
export const createThread = mutation({
    args: {
        userId: v.id("users"),
        title: v.string(),
        projectId: v.optional(v.id("projects")),
        tags: v.optional(v.array(v.string())),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        const threadId = await ctx.db.insert("codexThreads", {
            userId: args.userId,
            projectId: args.projectId,
            title: args.title,
            tags: args.tags || [],
            pinned: false,
            archived: false,
            lastMessageAt: now,
            messageCount: 0,
            createdAt: now,
            updatedAt: now,
        });

        return threadId;
    },
});

/**
 * Update thread metadata
 */
export const updateThread = mutation({
    args: {
        threadId: v.id("codexThreads"),
        title: v.optional(v.string()),
        tags: v.optional(v.array(v.string())),
        pinned: v.optional(v.boolean()),
        archived: v.optional(v.boolean()),
    },
    handler: async (ctx, args) => {
        const { threadId, ...updates } = args;

        const existing = await ctx.db.get(threadId);
        if (!existing) throw new Error("Thread not found");

        await ctx.db.patch(threadId, {
            ...updates,
            updatedAt: Date.now(),
        });

        return threadId;
    },
});

/**
 * Delete a thread and all its messages
 */
export const deleteThread = mutation({
    args: {
        threadId: v.id("codexThreads"),
    },
    handler: async (ctx, args) => {
        // Delete all messages
        const messages = await ctx.db
            .query("codexMessages")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .collect();

        for (const msg of messages) {
            // Delete attachments first
            const attachments = await ctx.db
                .query("codexAttachments")
                .withIndex("by_message", (q) => q.eq("messageId", msg._id))
                .collect();

            for (const att of attachments) {
                await ctx.db.delete(att._id);
            }

            await ctx.db.delete(msg._id);
        }

        // Delete links
        const linksFrom = await ctx.db
            .query("codexLinks")
            .withIndex("by_from", (q) => q.eq("fromThreadId", args.threadId))
            .collect();

        const linksTo = await ctx.db
            .query("codexLinks")
            .withIndex("by_to", (q) => q.eq("toThreadId", args.threadId))
            .collect();

        for (const link of [...linksFrom, ...linksTo]) {
            await ctx.db.delete(link._id);
        }

        // Delete thread
        await ctx.db.delete(args.threadId);
    },
});

// ============================================
// MESSAGE QUERIES
// ============================================

/**
 * List messages in a thread
 */
export const listMessages = query({
    args: {
        threadId: v.id("codexThreads"),
        limit: v.optional(v.number()),
    },
    handler: async (ctx, args) => {
        let messages = await ctx.db
            .query("codexMessages")
            .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
            .order("asc")
            .collect();

        // Get attachments for each message
        const messagesWithAttachments = await Promise.all(
            messages.map(async (msg) => {
                const attachments = await ctx.db
                    .query("codexAttachments")
                    .withIndex("by_message", (q) => q.eq("messageId", msg._id))
                    .collect();

                return {
                    ...msg,
                    attachments,
                };
            })
        );

        if (args.limit) {
            return messagesWithAttachments.slice(-args.limit);
        }

        return messagesWithAttachments;
    },
});

// ============================================
// MESSAGE MUTATIONS
// ============================================

/**
 * Add a message to a thread
 */
export const addMessage = mutation({
    args: {
        threadId: v.id("codexThreads"),
        role: v.string(),
        content: v.string(),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const now = Date.now();

        // Insert message
        const messageId = await ctx.db.insert("codexMessages", {
            threadId: args.threadId,
            role: args.role,
            content: args.content,
            metadata: args.metadata,
            createdAt: now,
        });

        // Update thread stats
        const thread = await ctx.db.get(args.threadId);
        if (thread) {
            await ctx.db.patch(args.threadId, {
                lastMessageAt: now,
                messageCount: thread.messageCount + 1,
                preview: args.content.slice(0, 100),
                updatedAt: now,
            });
        }

        return messageId;
    },
});

/**
 * Add an attachment to a message
 */
export const addAttachment = mutation({
    args: {
        messageId: v.id("codexMessages"),
        type: v.string(),
        content: v.optional(v.string()),
        fileUrl: v.optional(v.string()),
        fileName: v.optional(v.string()),
        language: v.optional(v.string()),
        metadata: v.optional(v.any()),
    },
    handler: async (ctx, args) => {
        const attachmentId = await ctx.db.insert("codexAttachments", {
            messageId: args.messageId,
            type: args.type,
            content: args.content,
            fileUrl: args.fileUrl,
            fileName: args.fileName,
            language: args.language,
            metadata: args.metadata,
            createdAt: Date.now(),
        });

        return attachmentId;
    },
});

// ============================================
// LINK MUTATIONS
// ============================================

/**
 * Create a link between two threads
 */
export const linkThreads = mutation({
    args: {
        fromThreadId: v.id("codexThreads"),
        toThreadId: v.id("codexThreads"),
        linkType: v.optional(v.string()),
    },
    handler: async (ctx, args) => {
        // Check if link already exists
        const existing = await ctx.db
            .query("codexLinks")
            .withIndex("by_from", (q) => q.eq("fromThreadId", args.fromThreadId))
            .filter((q) => q.eq(q.field("toThreadId"), args.toThreadId))
            .first();

        if (existing) {
            return existing._id;
        }

        return await ctx.db.insert("codexLinks", {
            fromThreadId: args.fromThreadId,
            toThreadId: args.toThreadId,
            linkType: args.linkType || "related",
            createdAt: Date.now(),
        });
    },
});

/**
 * Get related threads for a thread
 */
export const getRelatedThreads = query({
    args: {
        threadId: v.id("codexThreads"),
    },
    handler: async (ctx, args) => {
        const linksFrom = await ctx.db
            .query("codexLinks")
            .withIndex("by_from", (q) => q.eq("fromThreadId", args.threadId))
            .collect();

        const linksTo = await ctx.db
            .query("codexLinks")
            .withIndex("by_to", (q) => q.eq("toThreadId", args.threadId))
            .collect();

        const relatedIds = new Set<Id<"codexThreads">>();

        for (const link of linksFrom) {
            relatedIds.add(link.toThreadId);
        }
        for (const link of linksTo) {
            relatedIds.add(link.fromThreadId);
        }

        const relatedThreads = await Promise.all(
            Array.from(relatedIds).map((id) => ctx.db.get(id))
        );

        return relatedThreads.filter(Boolean);
    },
});

// ============================================
// STATS
// ============================================

/**
 * Get user's Codex statistics
 */
export const getStats = query({
    args: {
        userId: v.id("users"),
    },
    handler: async (ctx, args) => {
        const threads = await ctx.db
            .query("codexThreads")
            .withIndex("by_user", (q) => q.eq("userId", args.userId))
            .collect();

        const totalMessages = threads.reduce((sum, t) => sum + t.messageCount, 0);
        const activeThreads = threads.filter((t) => !t.archived).length;
        const pinnedThreads = threads.filter((t) => t.pinned).length;

        // Get all unique tags
        const allTags = new Set<string>();
        threads.forEach((t) => t.tags.forEach((tag) => allTags.add(tag)));

        return {
            totalThreads: threads.length,
            activeThreads,
            pinnedThreads,
            archivedThreads: threads.length - activeThreads,
            totalMessages,
            uniqueTags: allTags.size,
            topTags: Array.from(allTags).slice(0, 10),
        };
    },
});

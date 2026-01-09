import { mutationGeneric, queryGeneric } from "convex/server";
import { v } from "convex/values";
import bcrypt from "bcryptjs";

const JWT_SECRET = process.env.JWT_SECRET || "dev-secret";

export const register = mutationGeneric({
  args: { email: v.string(), password: v.string(), name: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (existing) {
      throw new Error("User already exists");
    }

    const passwordHash = await bcrypt.hash(args.password, 12);

    const userId = await ctx.db.insert("users", {
      email: args.email,
      name: args.name,
      authProvider: "local",
      role: "user",
      apiQuota: 1000,
      storageQuota: 1073741824,
      passwordHash,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id: userId, email: args.email, name: args.name, role: "user" };
  },
});

export const login = mutationGeneric({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db.query("users")
      .withIndex("by_email", q => q.eq("email", args.email))
      .first();

    if (!user || !user.passwordHash) {
      throw new Error("Invalid credentials");
    }

    const isValid = await bcrypt.compare(args.password, user.passwordHash);
    if (!isValid) {
      throw new Error("Invalid credentials");
    }

    const token = `token_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    
    await ctx.db.insert("sessions", {
      userId: user._id,
      token,
      expiresAt: Date.now() + 7 * 24 * 60 * 60 * 1000,
      createdAt: Date.now(),
    });

    return {
      user: { id: user._id, email: user.email, name: user.name, role: user.role },
      token,
    };
  },
});

export const logout = mutationGeneric({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    const sessions = await ctx.db.query("sessions")
      .withIndex("by_token", q => q.eq("token", args.token))
      .collect();
    
    for (const session of sessions) {
      await ctx.db.delete(session._id);
    }
  },
});

export const getProfile = queryGeneric({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) return null;
    return users[0];
  },
});

export const listProjects = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("projects")
      .withIndex("by_status", q => q.eq("status", "active"))
      .collect();
  },
});

export const createProject = mutationGeneric({
  args: { name: v.string(), description: v.optional(v.string()), type: v.string() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      throw new Error("No users found - please register first");
    }

    const projectId = await ctx.db.insert("projects", {
      name: args.name,
      description: args.description,
      type: args.type,
      ownerId: users[0]._id,
      status: "active",
      visibility: "private",
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id: projectId, name: args.name, description: args.description, type: args.type };
  },
});

export const getProject = queryGeneric({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    const project = await ctx.db.get(args.projectId);
    return project;
  },
});

export const updateProject = mutationGeneric({
  args: { 
    projectId: v.id("projects"), 
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    settings: v.optional(v.any()),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const { projectId, ...updates } = args;
    const finalUpdates = { ...updates, updatedAt: Date.now() };
    
    await ctx.db.patch(projectId, finalUpdates);
    const updated = await ctx.db.get(projectId);
    return updated;
  },
});

export const deleteProject = mutationGeneric({
  args: { projectId: v.id("projects") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.projectId, { status: "archived", archivedAt: Date.now() });
    return { success: true };
  },
});

export const listChatSessions = queryGeneric({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("chatSessions")
      .order("desc")
      .collect();
  },
});

export const createChatSession = mutationGeneric({
  args: { title: v.optional(v.string()), model: v.string(), projectId: v.optional(v.id("projects")) },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) {
      throw new Error("No users found");
    }

    const sessionId = await ctx.db.insert("chatSessions", {
      userId: users[0]._id,
      projectId: args.projectId,
      title: args.title || "New Chat",
      model: args.model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });

    return { id: sessionId };
  },
});

export const getChatSession = queryGeneric({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const session = await ctx.db.get(args.sessionId);
    return session;
  },
});

export const getChatMessages = queryGeneric({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    return await ctx.db.query("chatMessages")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .order("asc")
      .collect();
  },
});

export const addChatMessage = mutationGeneric({
  args: { 
    sessionId: v.id("chatSessions"), 
    role: v.string(), 
    content: v.string(),
    metadata: v.optional(v.any())
  },
  handler: async (ctx, args) => {
    const messageId = await ctx.db.insert("chatMessages", {
      sessionId: args.sessionId,
      role: args.role,
      content: args.content,
      metadata: args.metadata,
      createdAt: Date.now(),
    });

    await ctx.db.patch(args.sessionId, { updatedAt: Date.now() });
    return { id: messageId };
  },
});

export const deleteChatSession = mutationGeneric({
  args: { sessionId: v.id("chatSessions") },
  handler: async (ctx, args) => {
    const messages = await ctx.db.query("chatMessages")
      .withIndex("by_session", q => q.eq("sessionId", args.sessionId))
      .collect();
    
    for (const msg of messages) {
      await ctx.db.delete(msg._id);
    }
    
    await ctx.db.delete(args.sessionId);
    return { success: true };
  },
});

export const trackUsage = mutationGeneric({
  args: { action: v.string(), resource: v.optional(v.string()), quantity: v.number() },
  handler: async (ctx, args) => {
    const users = await ctx.db.query("users").collect();
    if (users.length === 0) return;

    await ctx.db.insert("usage", {
      userId: users[0]._id,
      action: args.action,
      resource: args.resource,
      quantity: args.quantity,
      timestamp: Date.now(),
    });
  },
});

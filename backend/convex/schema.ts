import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // User Management
  users: defineTable({
    email: v.string(),
    name: v.optional(v.string()),
    avatar: v.optional(v.string()),
    authProvider: v.string(),
    authId: v.optional(v.string()),
    passwordHash: v.optional(v.string()),
    bio: v.optional(v.string()),
    organization: v.optional(v.string()),
    role: v.string(),
    preferences: v.optional(v.any()),
    apiQuota: v.number(),
    storageQuota: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
    lastLoginAt: v.optional(v.number()),
  }).index("by_email", ["email"])
    .index("by_auth", ["authProvider", "authId"]),

  // Sessions
  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    ipAddress: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_token", ["token"])
    .index("by_user", ["userId"]),

  // API Keys
  apiKeys: defineTable({
    userId: v.id("users"),
    name: v.string(),
    keyHash: v.string(),
    lastUsedAt: v.optional(v.number()),
    expiresAt: v.optional(v.number()),
    createdAt: v.number(),
    revokedAt: v.optional(v.number()),
  }).index("by_user", ["userId"])
    .index("by_keyHash", ["keyHash"]),

  // Workspaces
  workspaces: defineTable({
    name: v.string(),
    slug: v.string(),
    description: v.optional(v.string()),
    settings: v.optional(v.any()),
    storageQuota: v.number(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_slug", ["slug"]),

  // Workspace Members
  workspaceMembers: defineTable({
    workspaceId: v.id("workspaces"),
    userId: v.id("users"),
    role: v.string(),
    joinedAt: v.number(),
  }).index("by_workspace", ["workspaceId"])
    .index("by_user", ["userId"]),

  // Projects
  projects: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    type: v.string(),
    ownerId: v.id("users"),
    workspaceId: v.optional(v.id("workspaces")),
    files: v.optional(v.any()),
    settings: v.optional(v.any()),
    metadata: v.optional(v.any()),
    status: v.string(),
    visibility: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    archivedAt: v.optional(v.number()),
  }).index("by_owner", ["ownerId"])
    .index("by_workspace", ["workspaceId"])
    .index("by_status", ["status"]),

  // Chat Sessions
  chatSessions: defineTable({
    projectId: v.optional(v.id("projects")),
    userId: v.id("users"),
    title: v.optional(v.string()),
    model: v.string(),
    systemPrompt: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_user", ["userId"]),

  // Chat Messages
  chatMessages: defineTable({
    sessionId: v.id("chatSessions"),
    role: v.string(),
    content: v.string(),
    metadata: v.optional(v.any()),
    tokensInput: v.optional(v.number()),
    tokensOutput: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_session", ["sessionId"])
    .index("by_created", ["createdAt"]),

  // Engineering Blueprints
  blueprints: defineTable({
    projectId: v.id("projects"),
    name: v.string(),
    description: v.optional(v.string()),
    domain: v.string(),
    components: v.any(),
    connections: v.any(),
    parameters: v.any(),
    isTemplate: v.boolean(),
    templateCategory: v.optional(v.string()),
    version: v.number(),
    parentId: v.optional(v.id("blueprints")),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_project", ["projectId"])
    .index("by_template", ["isTemplate"]),

  // Simulations
  simulations: defineTable({
    blueprintId: v.id("blueprints"),
    projectId: v.id("projects"),
    name: v.optional(v.string()),
    type: v.string(),
    parameters: v.any(),
    status: v.string(),
    results: v.optional(v.any()),
    error: v.optional(v.string()),
    duration: v.optional(v.number()),
    iterations: v.optional(v.number()),
    resultsUrl: v.optional(v.string()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  }).index("by_blueprint", ["blueprintId"])
    .index("by_project", ["projectId"])
    .index("by_status", ["status"]),

  // Research Queries
  researchQueries: defineTable({
    userId: v.id("users"),
    query: v.string(),
    domain: v.optional(v.string()),
    results: v.optional(v.any()),
    resultCount: v.number(),
    createdAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  // Citations
  citations: defineTable({
    userId: v.id("users"),
    title: v.string(),
    authors: v.array(v.string()),
    year: v.optional(v.number()),
    journal: v.optional(v.string()),
    doi: v.optional(v.string()),
    url: v.optional(v.string()),
    apa: v.optional(v.string()),
    bibtex: v.optional(v.string()),
    tags: v.array(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_user", ["userId"])
    .index("by_doi", ["doi"]),

  // Usage Tracking
  usage: defineTable({
    userId: v.id("users"),
    action: v.string(),
    resource: v.optional(v.string()),
    quantity: v.number(),
    cost: v.optional(v.number()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_action", ["action"]),

  // Error Logs
  errorLogs: defineTable({
    userId: v.optional(v.id("users")),
    errorType: v.string(),
    message: v.string(),
    stack: v.optional(v.string()),
    endpoint: v.optional(v.string()),
    method: v.optional(v.string()),
    statusCode: v.optional(v.number()),
    metadata: v.optional(v.any()),
    timestamp: v.number(),
    resolved: v.boolean(),
  }).index("by_user", ["userId"])
    .index("by_timestamp", ["timestamp"])
    .index("by_type", ["errorType"]),
});
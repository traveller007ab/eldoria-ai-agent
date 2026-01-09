// Simple in-memory database for testing without PostgreSQL
const db = {
  users: new Map(),
  sessions: new Map(),
  projects: new Map(),
  chatSessions: new Map(),
  messages: new Map(),
};

export const mockDb = {
  user: {
    findUnique: async ({ where }: any) => {
      if (where.email) return db.users.get(where.email) || null;
      if (where.id) {
        for (const user of db.users.values()) {
          if (user.id === where.id) return user;
        }
      }
      return null;
    },
    create: async ({ data }: any) => {
      const user = { ...data, id: crypto.randomUUID(), createdAt: new Date(), updatedAt: new Date() };
      db.users.set(data.email, user);
      return user;
    },
    update: async ({ where, data }: any) => {
      const user = db.users.get(where.email) || db.users.get(where.id);
      if (user) {
        const updated = { ...user, ...data, updatedAt: new Date() };
        db.users.set(updated.email, updated);
        return updated;
      }
      return null;
    },
  },
  session: {
    create: async ({ data }: any) => {
      const session = { ...data, id: crypto.randomUUID(), createdAt: new Date() };
      db.sessions.set(data.token, session);
      return session;
    },
    findFirst: async ({ where }: any) => {
      for (const session of db.sessions.values()) {
        if (session.token === where.token && session.expiresAt > new Date()) {
          return session;
        }
      }
      return null;
    },
    deleteMany: async ({ where }: any) => {
      if (where.token) db.sessions.delete(where.token);
    },
  },
  project: {
    findMany: async () => Array.from(db.projects.values()),
    findFirst: async ({ where }: any) => {
      for (const project of db.projects.values()) {
        if (project.id === where.id && project.ownerId === where.ownerId) return project;
      }
      return null;
    },
    create: async ({ data }: any) => {
      const project = { 
        ...data, 
        id: crypto.randomUUID(), 
        createdAt: new Date(), 
        updatedAt: new Date(),
        status: 'active',
        visibility: 'private'
      };
      db.projects.set(project.id, project);
      return project;
    },
    update: async ({ where, data }: any) => {
      const project = db.projects.get(where.id);
      if (project) {
        const updated = { ...project, ...data, updatedAt: new Date() };
        db.projects.set(where.id, updated);
        return updated;
      }
      return null;
    },
    delete: async ({ where }: any) => {
      db.projects.delete(where.id);
    },
  },
  chatSession: {
    findMany: async () => Array.from(db.chatSessions.values()),
    findFirst: async ({ where }: any) => {
      for (const session of db.chatSessions.values()) {
        if (session.id === where.id && session.userId === where.userId) return session;
      }
      return null;
    },
    create: async ({ data }: any) => {
      const session = { 
        ...data, 
        id: crypto.randomUUID(), 
        createdAt: new Date(), 
        updatedAt: new Date(),
        messages: [] 
      };
      db.chatSessions.set(session.id, session);
      return session;
    },
    update: async ({ where, data }: any) => {
      const session = db.chatSessions.get(where.id);
      if (session) {
        const updated = { ...session, ...data, updatedAt: new Date() };
        db.chatSessions.set(where.id, updated);
        return updated;
      }
      return null;
    },
  },
};

export default mockDb;
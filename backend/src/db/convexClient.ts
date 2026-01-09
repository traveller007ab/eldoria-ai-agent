import { ConvexHttpClient } from "convex/server";

const CONVEX_URL = process.env.CONVEX_URL || "https://your-convex-project.convex.cloud";

export const convex = new ConvexHttpClient(CONVEX_URL);

// Helper functions that call Convex
export const convexDb = {
  // Users
  async findUserByEmail(email: string) {
    return await convex.query("users:findUserByEmail", { email });
  },
  
  async createUser(userData: any) {
    return await convex.query("users:create", userData);
  },

  // Projects
  async listProjects() {
    return await convex.query("projects:list");
  },
  
  async createProject(projectData: any) {
    return await convex.query("projects:create", projectData);
  },

  // Chat
  async listChatSessions() {
    return await convex.query("chatSessions:list");
  },
  
  async createChatSession(data: any) {
    return await convex.query("chatSessions:create", data);
  },

  // Auth
  async register(email: string, password: string, name?: string) {
    return await convex.mutation("auth:register", { email, password, name });
  },
  
  async login(email: string, password: string) {
    return await convex.mutation("auth:login", { email, password });
  },
};

export default convexDb;
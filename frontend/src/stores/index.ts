import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { immer } from 'zustand/middleware/immer';

// API Configuration
const API_URL = import.meta.env.VITE_API_URL || 'https://eldoria-ai-agent-production.up.railway.app';

// Types
export interface User {
  id: string;
  email: string;
  name: string;
  role: string;
  avatar?: string;
  organization?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  type: 'code' | 'research' | 'engineering' | 'mixed';
  ownerId: string;
  workspaceId?: string;
  status: 'active' | 'archived' | 'deleted';
  visibility: 'private' | 'workspace' | 'public';
  files?: any;
  settings?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  metadata?: any;
  tokensInput?: number;
  tokensOutput?: number;
  createdAt: string;
}

export interface ChatSession {
  id: string;
  projectId?: string;
  userId: string;
  title?: string;
  model: string;
  systemPrompt?: string;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
}

// Auth Slice
interface AuthSlice {
  auth: {
    user: User | null;
    token: string | null;
    refreshToken: string | null;
    isAuthenticated: boolean;
    isLoading: boolean;
  };
  register: (email: string, password: string, name?: string) => Promise<void>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateProfile: (data: Partial<User>) => Promise<void>;
}

const createAuthSlice: (set: any, get: any) => AuthSlice = (set, get) => ({
  auth: {
    user: null,
    token: null,
    refreshToken: null,
    isAuthenticated: false,
    isLoading: false,
  },
  
  register: async (email: string, password: string, name?: string) => {
    set((state: any) => {
      state.auth.isLoading = true;
    });
    
    try {
      const response = await fetch(`${API_URL}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, name }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Registration failed');
      }
      
      const data = await response.json();
      
      set((state: any) => {
        state.auth.user = data.user || { email, name };
        state.auth.token = data.token;
        state.auth.isAuthenticated = true;
        state.auth.isLoading = false;
      });
    } catch (error) {
      set((state: any) => {
        state.auth.isLoading = false;
      });
      throw error;
    }
  },
  
  login: async (email: string, password: string) => {
    set((state: any) => {
      state.auth.isLoading = true;
    });
    
    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.detail || 'Login failed');
      }
      
      const data = await response.json();
      
      set((state: any) => {
        state.auth.user = data.user;
        state.auth.token = data.token;
        state.auth.refreshToken = data.refreshToken;
        state.auth.isAuthenticated = true;
        state.auth.isLoading = false;
      });
    } catch (error) {
      set((state: any) => {
        state.auth.isLoading = false;
      });
      throw error;
    }
  },
  
  logout: () => {
    set((state: any) => {
      state.auth.user = null;
      state.auth.token = null;
      state.auth.refreshToken = null;
      state.auth.isAuthenticated = false;
    });
  },
  
  updateProfile: async (data: Partial<User>) => {
    const { token } = get().auth;
    if (!token) throw new Error('Not authenticated');
    
    const response = await fetch(`${API_URL}/auth/profile`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to update profile');
    
    const updated = await response.json();
    
    set((state: any) => {
      state.auth.user = { ...state.auth.user, ...updated };
    });
  },
});

// Projects Slice
interface ProjectsSlice {
  projects: {
    list: Project[];
    current: Project | null;
    isLoading: boolean;
  };
  fetchProjects: () => Promise<void>;
  createProject: (data: Partial<Project>) => Promise<void>;
  updateProject: (id: string, data: Partial<Project>) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  setCurrentProject: (project: Project | null) => void;
}

const createProjectsSlice: (set: any, get: any) => ProjectsSlice = (set, get) => ({
  projects: {
    list: [],
    current: null,
    isLoading: false,
  },
  
  fetchProjects: async () => {
    const token = get().auth.token;
    
    set((state: any) => {
      state.projects.isLoading = true;
    });
    
    try {
      const response = await fetch(`${API_URL}/projects`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) throw new Error('Failed to fetch projects');
      
      const data = await response.json();
      const projects = data.projects || data.data || [];
      
      set((state: any) => {
        state.projects.list = projects;
        state.projects.isLoading = false;
      });
    } catch (error) {
      set((state: any) => {
        state.projects.isLoading = false;
      });
      throw error;
    }
  },
  
  createProject: async (data: Partial<Project>) => {
    const token = get().auth.token;
    const response = await fetch(`${API_URL}/projects`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        name: data.name,
        description: data.description,
        type: data.type || 'code',
      }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create project');
    }
    
    const newProject = await response.json();
    
    set((state: any) => {
      state.projects.list.unshift(newProject.project || newProject);
    });
    
    return newProject;
  },
  
  updateProject: async (id: string, data: Partial<Project>) => {
    const token = get().auth.token;
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(data),
    });
    
    if (!response.ok) throw new Error('Failed to update project');
    
    const updatedProject = await response.json();
    
    set((state: any) => {
      state.projects.list = state.projects.list.map((p: Project) => 
        p.id === id ? { ...p, ...updatedProject.project || updatedProject } : p
      );
      if (state.projects.current?.id === id) {
        state.projects.current = { ...state.projects.current, ...updatedProject.project || updatedProject };
      }
    });
  },
  
  deleteProject: async (id: string) => {
    const token = get().auth.token;
    const response = await fetch(`${API_URL}/projects/${id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('Failed to delete project');
    
    set((state: any) => {
      state.projects.list = state.projects.list.filter((p: Project) => p.id !== id);
      if (state.projects.current?.id === id) {
        state.projects.current = null;
      }
    });
  },
  
  setCurrentProject: (project: Project | null) => {
    set((state: any) => {
      state.projects.current = project;
    });
  },
});

// AI/Chat Slice
interface AISlice {
  ai: {
    sessions: ChatSession[];
    currentSession: ChatSession | null;
    isLoading: boolean;
    isStreaming: boolean;
  };
  createSession: (projectId?: string, title?: string) => Promise<void>;
  sendMessage: (message: string, sessionId?: string) => Promise<void>;
  streamMessage: (message: string, sessionId?: string) => AsyncGenerator<string>;
  deleteSession: (sessionId: string) => Promise<void>;
  setCurrentSession: (session: ChatSession | null) => void;
  fetchSessions: () => Promise<void>;
}

const createAISlice: (set: any, get: any) => AISlice = (set, get) => ({
  ai: {
    sessions: [],
    currentSession: null,
    isLoading: false,
    isStreaming: false,
  },
  
  fetchSessions: async () => {
    const token = get().auth.token;
    
    try {
      const response = await fetch(`${API_URL}/chat/sessions`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      });
      
      if (!response.ok) throw new Error('Failed to fetch sessions');
      
      const data = await response.json();
      const sessions = data.sessions || [];
      
      set((state: any) => {
        state.ai.sessions = sessions;
      });
    } catch (error) {
      console.error('Failed to fetch chat sessions:', error);
    }
  },
  
  createSession: async (projectId?: string, title?: string) => {
    const token = get().auth.token;
    const response = await fetch(`${API_URL}/chat/sessions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ projectId, title, model: 'gemini-pro' }),
    });
    
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Failed to create session');
    }
    
    const data = await response.json();
    const session = data.session || data;
    
    set((state: any) => {
      state.ai.sessions.unshift(session);
      state.ai.currentSession = session;
    });
    
    return session;
  },
  
  sendMessage: async (message: string, sessionId?: string) => {
    const token = get().auth.token;
    const currentSessionId = sessionId || get().ai.currentSession?.id;
    
    if (!currentSessionId) throw new Error('No active session');
    
    set((state: any) => {
      state.ai.isLoading = true;
    });
    
    try {
      const response = await fetch(`${API_URL}/proxy/groq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [
            { role: 'user', content: message }
          ],
        }),
      });
      
      if (!response.ok) throw new Error('Failed to send message');
      
      const data = await response.json();
      const reply = data.choices?.[0]?.message?.content || '';
      
      // Add message to session
      await fetch(`${API_URL}/chat/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          role: 'user',
          content: message,
        }),
      });
      
      // Add assistant response
      await fetch(`${API_URL}/chat/sessions/${currentSessionId}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          session_id: currentSessionId,
          role: 'assistant',
          content: reply,
        }),
      });
      
      // Refresh messages
      const messagesResponse = await fetch(`${API_URL}/chat/sessions/${currentSessionId}/messages`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const messagesData = await messagesResponse.json();
      const messages = messagesData.messages || [];
      
      set((state: any) => {
        state.ai.isLoading = false;
        if (state.ai.currentSession?.id === currentSessionId) {
          state.ai.currentSession.messages = messages;
        }
        const sessionIndex = state.ai.sessions.findIndex((s: ChatSession) => s.id === currentSessionId);
        if (sessionIndex >= 0) {
          state.ai.sessions[sessionIndex].messages = messages;
        }
      });
    } catch (error) {
      set((state: any) => {
        state.ai.isLoading = false;
      });
      throw error;
    }
  },
  
  streamMessage: async function* (message: string, sessionId?: string) {
    const token = get().auth.token;
    const currentSessionId = sessionId || get().ai.currentSession?.id;
    
    if (!currentSessionId) throw new Error('No active session');
    
    set((state: any) => {
      state.ai.isStreaming = true;
    });
    
    try {
      const response = await fetch(`${API_URL}/proxy/groq`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          model: 'llama-3.3-70b-versatile',
          messages: [{ role: 'user', content: message }],
          stream: true,
        }),
      });
      
      if (!response.ok) throw new Error('Failed to stream message');
      
      const reader = response.body?.getReader();
      if (!reader) throw new Error('No response body');
      
      const decoder = new TextDecoder();
      let assistantMessage = '';
      
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value);
        
        // Parse SSE format
        const lines = chunk.split('\n');
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') continue;
            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantMessage += content;
                yield content;
              }
            } catch {}
          }
        }
      }
      
      // Save messages after streaming
      if (assistantMessage) {
        await fetch(`${API_URL}/chat/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            role: 'user',
            content: message,
          }),
        });
        
        await fetch(`${API_URL}/chat/sessions/${currentSessionId}/messages`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            session_id: currentSessionId,
            role: 'assistant',
            content: assistantMessage,
          }),
        });
      }
    } finally {
      set((state: any) => {
        state.ai.isStreaming = false;
      });
    }
  },
  
  deleteSession: async (sessionId: string) => {
    const token = get().auth.token;
    const response = await fetch(`${API_URL}/chat/sessions/${sessionId}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token}` },
    });
    
    if (!response.ok) throw new Error('Failed to delete session');
    
    set((state: any) => {
      state.ai.sessions = state.ai.sessions.filter((s: ChatSession) => s.id !== sessionId);
      if (state.ai.currentSession?.id === sessionId) {
        state.ai.currentSession = null;
      }
    });
  },
  
  setCurrentSession: (session: ChatSession | null) => {
    set((state: any) => {
      state.ai.currentSession = session;
    });
  },
});

// UI Slice
interface UISlice {
  ui: {
    theme: 'light' | 'dark' | 'system';
    sidebarOpen: boolean;
    notifications: Notification[];
  };
  setTheme: (theme: 'light' | 'dark' | 'system') => void;
  toggleSidebar: () => void;
  addNotification: (notification: Omit<Notification, 'id'>) => void;
  removeNotification: (id: string) => void;
}

export interface Notification {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title?: string;
  message: string;
  duration?: number;
}

const createUISlice: (set: any, get: any) => UISlice = (set, get) => ({
  ui: {
    theme: 'system',
    sidebarOpen: true,
    notifications: [],
  },
  
  setTheme: (theme: 'light' | 'dark' | 'system') => {
    set((state: any) => {
      state.ui.theme = theme;
    });
  },
  
  toggleSidebar: () => {
    set((state: any) => {
      state.ui.sidebarOpen = !state.ui.sidebarOpen;
    });
  },
  
  addNotification: (notification: Omit<Notification, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9);
    set((state: any) => {
      state.ui.notifications.push({ ...notification, id });
    });
    
    setTimeout(() => {
      set((state: any) => {
        state.ui.notifications = state.ui.notifications.filter((n: Notification) => n.id !== id);
      });
    }, 5000);
  },
  
  removeNotification: (id: string) => {
    set((state: any) => {
      state.ui.notifications = state.ui.notifications.filter((n: Notification) => n.id !== id);
    });
  },
});

// Combined store type
export type AppStore = AuthSlice & ProjectsSlice & AISlice & UISlice;

// Create store
export const useStore = create<AppStore>()(
  devtools(
    persist(
      subscribeWithSelector(
        immer((...a) => ({
          ...createAuthSlice(...a),
          ...createProjectsSlice(...a),
          ...createAISlice(...a),
          ...createUISlice(...a),
        }))
      ),
      {
        name: 'eldoria-store',
        partialize: (state) => ({
          auth: {
            user: state.auth.user,
            token: state.auth.token,
            refreshToken: state.auth.refreshToken,
            isAuthenticated: state.auth.isAuthenticated,
          },
          ui: {
            theme: state.ui.theme,
            sidebarOpen: state.ui.sidebarOpen,
          },
        }),
      }
    )
  )
);

import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Canvas, Folder, Source, CanvasPart, TextPart, SAFStatus, TaskLogEntry, ChatMessage, InlineAction, AcademicProject, Attachment } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import * as MemoryService from '../services/memoryService';
import { CodebaseService } from '../services/codebaseService';
import { runGroqGenerateStream, runGroqConversationStream, runGroqInlineActionStream, runGroqAuditStream } from '../services/groqService';
import { contextService } from '../services/ContextService';
import { supabase } from '../services/supabaseClient';
import { useCanvasOperations } from '../hooks/useCanvasOperations';
import { useAcademicSync } from '../hooks/useAcademicSync';
import { useWorkspaceAI } from '../hooks/useWorkspaceAI';


type SaveStatus = 'idle' | 'saving' | 'saved';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

export interface WorkspaceState {
  canvases: Canvas[];
  folders: Folder[];
  activeCanvasId: string | null;
  expandedFolderIds: Set<string>;
  isLoading: boolean; // For main generation
  isChatLoading: boolean; // For chat
  isInlineLoading: boolean; // For inline actions
  isDeleting: boolean; // For delete confirmation
  pendingDeletionCanvasId: string | null; // For two-stage delete
  saveStatus: SaveStatus;
  memoryStatus: MemoryStatus;
  safStatus: SAFStatus;
  isTerminalVisible: boolean;
  isTerminalExpanded: boolean;
  isTerminalMinimized: boolean;
  isIndexing: boolean;
  academicProjects: AcademicProject[];
  onboarding_completed: string | null;
  eldoria_user_level: 'newbie' | 'intermediate' | 'expert' | null;
  isLowPerfMode: boolean;
  isTerminalExecuting: boolean;
  isPromptLibraryOpen: boolean;
  shouldUseDevLinks: boolean;
  globalSettings: {
    witLevel: number;
    reverence: number;
    autonomousMode: boolean;
    proactiveAudit: boolean;
    personalityMode: string;
  };
  promptLibraryConfig: {
    schemaId: string | null;
    variables: Record<string, string>;
  };
  workspaceMode: 'classic' | 'canvas';
}

export type WorkspaceAction =
  | { type: 'LOAD_CANVASES'; payload: Canvas[] }
  | { type: 'SET_ACTIVE_CANVAS'; payload: string }
  | { type: 'ADD_CANVAS'; payload: Canvas }
  | { type: 'DELETE_CANVAS'; payload: string }
  | { type: 'UPDATE_CANVAS'; payload: Canvas }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_CHAT_LOADING'; payload: boolean }
  | { type: 'SET_INLINE_LOADING'; payload: boolean }
  | { type: 'SET_DELETING'; payload: boolean }
  | { type: 'INITIATE_DELETE'; payload: string }
  | { type: 'CANCEL_DELETE' }
  | { type: 'SET_SAVE_STATUS'; payload: SaveStatus }
  | { type: 'SET_MEMORY_STATUS'; payload: MemoryStatus }
  | { type: 'SET_SAF_STATUS'; payload: SAFStatus }
  | { type: 'LOAD_FOLDERS'; payload: Folder[] }
  | { type: 'ADD_FOLDER'; payload: Folder }
  | { type: 'DELETE_FOLDER'; payload: string }
  | { type: 'TOGGLE_FOLDER'; payload: string }
  | { type: 'SET_TERMINAL_VISIBLE'; payload: boolean }
  | { type: 'SET_TERMINAL_EXPANDED'; payload: boolean }
  | { type: 'TOGGLE_TERMINAL_EXPANSION' }
  | { type: 'TOGGLE_TERMINAL_MINIMIZED' }
  | { type: 'ADD_ACADEMIC_PROJECT'; payload: AcademicProject }
  | { type: 'UPDATE_ACADEMIC_PROJECT'; payload: AcademicProject }
  | { type: 'LOAD_ACADEMIC_PROJECTS'; payload: AcademicProject[] }
  | { type: 'SET_INDEXING'; payload: boolean }
  | { type: 'DELETE_ACADEMIC_PROJECT'; payload: string }
  | { type: 'SET_ONBOARDING_STATUS'; payload: string | null }
  | { type: 'SET_USER_LEVEL'; payload: 'newbie' | 'intermediate' | 'expert' | null }
  | { type: 'SET_LOW_PERF_MODE'; payload: boolean }
  | { type: 'SET_TERMINAL_EXECUTING'; payload: boolean }
  | { type: 'UPDATE_SETTINGS'; payload: Partial<WorkspaceState['globalSettings']> }
  | { type: 'TRIGGER_REINDEX_START' }
  | { type: 'TRIGGER_REINDEX_COMPLETE' }
  | { type: 'SET_PROMPT_LIBRARY_OPEN'; payload: boolean }
  | { type: 'SET_PROMPT_LIBRARY_CONFIG'; payload: WorkspaceState['promptLibraryConfig'] }
  | { type: 'SET_WORKSPACE_MODE'; payload: 'classic' | 'canvas' };

const initialState: WorkspaceState = {
  canvases: [],
  folders: [],
  activeCanvasId: null,
  expandedFolderIds: new Set(),
  isLoading: false,
  isChatLoading: false,
  isInlineLoading: false,
  isDeleting: false,
  pendingDeletionCanvasId: null,
  saveStatus: 'idle',
  memoryStatus: 'idle',
  safStatus: 'idle',
  isTerminalVisible: localStorage.getItem('isTerminalVisible') !== 'false',
  isTerminalExpanded: false,
  isTerminalMinimized: false,
  isIndexing: false,
  academicProjects: [],
  onboarding_completed: localStorage.getItem('onboarding_completed'),
  eldoria_user_level: localStorage.getItem('eldoria_user_level') as any,
  isLowPerfMode: localStorage.getItem('isLowPerfMode') === 'true' ||
    ((navigator as any).deviceMemory && (navigator as any).deviceMemory < 4),
  shouldUseDevLinks: localStorage.getItem('shouldUseDevLinks') === 'true',
  isTerminalExecuting: false,
  globalSettings: JSON.parse(localStorage.getItem('eldoria_settings') || '{"witLevel":50,"reverence":70,"autonomousMode":true,"proactiveAudit":true,"personalityMode":"jarvis"}'),
  isPromptLibraryOpen: false,
  promptLibraryConfig: { schemaId: null, variables: {} },
  workspaceMode: (localStorage.getItem('eldoria-workspace-mode') as 'classic' | 'canvas') || 'classic'
};

const workspaceReducer = (state: WorkspaceState, action: WorkspaceAction): WorkspaceState => {
  switch (action.type) {
    case 'LOAD_CANVASES':
      return { ...state, canvases: action.payload };
    case 'SET_ACTIVE_CANVAS':
      return { ...state, activeCanvasId: action.payload };
    case 'ADD_CANVAS':
      return { ...state, canvases: [action.payload, ...state.canvases] };
    case 'DELETE_CANVAS':
      return { ...state, canvases: state.canvases.filter(c => c.id !== action.payload) };
    case 'UPDATE_CANVAS':
      return {
        ...state,
        canvases: state.canvases.map(c => c.id === action.payload.id ? action.payload : c),
      };
    case 'SET_LOADING':
      return { ...state, isLoading: action.payload };
    case 'SET_CHAT_LOADING':
      return { ...state, isChatLoading: action.payload };
    case 'SET_INLINE_LOADING':
      return { ...state, isInlineLoading: action.payload };
    case 'SET_DELETING':
      return { ...state, isDeleting: action.payload };
    case 'INITIATE_DELETE':
      return { ...state, pendingDeletionCanvasId: action.payload };
    case 'CANCEL_DELETE':
      return { ...state, pendingDeletionCanvasId: null };
    case 'SET_SAVE_STATUS':
      return { ...state, saveStatus: action.payload };
    case 'SET_MEMORY_STATUS':
      return { ...state, memoryStatus: action.payload };
    case 'SET_SAF_STATUS':
      return { ...state, safStatus: action.payload };
    case 'LOAD_FOLDERS':
      return { ...state, folders: action.payload };
    case 'ADD_FOLDER':
      return { ...state, folders: [action.payload, ...state.folders] };
    case 'DELETE_FOLDER':
      return { ...state, folders: state.folders.filter(f => f.id !== action.payload) };
    case 'TOGGLE_FOLDER': {
      const newExpanded = new Set(state.expandedFolderIds);
      if (newExpanded.has(action.payload)) {
        newExpanded.delete(action.payload);
      } else {
        newExpanded.add(action.payload);
      }
      return { ...state, expandedFolderIds: newExpanded };
    }
    case 'SET_TERMINAL_VISIBLE':
      return { ...state, isTerminalVisible: action.payload };
    case 'SET_PROMPT_LIBRARY_OPEN':
      return { ...state, isPromptLibraryOpen: action.payload };
    case 'SET_PROMPT_LIBRARY_CONFIG':
      return { ...state, promptLibraryConfig: action.payload };
    case 'SET_TERMINAL_EXPANDED':
      return { ...state, isTerminalExpanded: action.payload, isTerminalMinimized: action.payload ? false : state.isTerminalMinimized };
    case 'TOGGLE_TERMINAL_EXPANSION':
      return { ...state, isTerminalExpanded: !state.isTerminalExpanded, isTerminalMinimized: false };
    case 'TOGGLE_TERMINAL_MINIMIZED':
      return { ...state, isTerminalMinimized: !state.isTerminalMinimized, isTerminalExpanded: false };
    case 'ADD_ACADEMIC_PROJECT':
      return { ...state, academicProjects: [action.payload, ...state.academicProjects] };
    case 'UPDATE_ACADEMIC_PROJECT':
      return { ...state, academicProjects: state.academicProjects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'LOAD_ACADEMIC_PROJECTS':
      return { ...state, academicProjects: action.payload };
    case 'SET_INDEXING':
      return { ...state, isIndexing: action.payload };
    case 'DELETE_ACADEMIC_PROJECT':
      return { ...state, academicProjects: state.academicProjects.filter(p => p.id !== action.payload) };
    case 'SET_ONBOARDING_STATUS':
      return { ...state, onboarding_completed: action.payload };
    case 'SET_USER_LEVEL':
      return { ...state, eldoria_user_level: action.payload };
    case 'SET_LOW_PERF_MODE':
      return { ...state, isLowPerfMode: action.payload };
    case 'SET_TERMINAL_EXECUTING':
      return { ...state, isTerminalExecuting: action.payload };
    case 'UPDATE_SETTINGS':
      const newSettings = { ...state.globalSettings, ...action.payload };
      localStorage.setItem('eldoria_settings', JSON.stringify(newSettings));
      return { ...state, globalSettings: newSettings };
    case 'TRIGGER_REINDEX_START':
      return { ...state, isIndexing: true };
    case 'TRIGGER_REINDEX_COMPLETE':
      return { ...state, isIndexing: false };
    case 'SET_WORKSPACE_MODE':
      localStorage.setItem('eldoria-workspace-mode', action.payload);
      return { ...state, workspaceMode: action.payload };
    default:
      return state;
  }
};

interface WorkspaceContextType extends WorkspaceState {
  activeCanvas: Canvas | undefined;
  createCanvas: (name?: string, content?: CanvasPart[]) => Promise<Canvas | null>;
  selectCanvas: (id: string) => void;
  deleteCanvas: (id: string) => Promise<void>;
  initiateDelete: (id: string) => void;
  cancelDelete: () => void;
  renameCanvas: (id: string, newName: string) => Promise<void>;
  updateCanvasPart: (id: string, partIndex: number, part: CanvasPart) => void;
  addCanvasPart: (id: string, part: CanvasPart, index?: number) => void;
  removeCanvasPart: (id: string, partIndex: number) => void;
  generate: () => Promise<void>;
  sendChatMessage: (message: string) => Promise<void>;
  acceptOutput: () => void;
  appendOutput: () => void;
  performInlineAction: (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => Promise<void>;
  clearTerminal: () => void;
  createFolder: (name: string, parentFolderId?: string | null) => void;
  toggleFolder: (folderId: string) => void;
  performProactiveAudit: () => Promise<void>;
  toggleTerminal: () => void;
  toggleTerminalExpansion: () => void;
  toggleTerminalMinimized: () => void;
  runManualCommand: (command: string) => Promise<{ output: string; error: string | null }>;
  isTerminalExpanded: boolean;
  isTerminalMinimized: boolean;
  addAcademicProject: (project: AcademicProject) => void;
  updateAcademicProject: (project: AcademicProject) => void;
  deleteAcademicProject: (id: string) => Promise<void>;
  publishToAcademicHub: (projectId?: string, fileName?: string, content?: string) => Promise<void>;
  openLocalFile: (path: string) => Promise<void>;
  isIndexing: boolean;
  completeOnboarding: () => void;
  setUserLevel: (level: 'newbie' | 'intermediate' | 'expert') => void;
  resetOnboarding: () => void;
  setLowPerfMode: (enabled: boolean) => void;
  isTerminalExecuting: boolean;
  updateGlobalSettings: (settings: Partial<any>) => void;
  reIndexWorkspace: () => Promise<void>;
  setWorkspaceMode: (mode: 'classic' | 'canvas') => void;
  state: WorkspaceState;
  dispatch: React.Dispatch<WorkspaceAction>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);

  // Custom Hooks
  const canvasOps = useCanvasOperations({ state, dispatch });
  const academicOps = useAcademicSync({ state, dispatch, activeCanvas });
  const aiOps = useWorkspaceAI({
    state,
    dispatch,
    activeCanvas,
    createCanvas: canvasOps.createCanvas,
    updateCanvasPart: canvasOps.updateCanvasPart,
    _updateCanvasDatabase: canvasOps._updateCanvasDatabase
  });

  // Local State/Refs
  const lastAuditedContentRef = useRef<string>('');

  // Initial Load
  useEffect(() => {
    console.log('[WORKSPACE_PROVIDER] Initial Load Effect starting...');
    const savedCanvasId = localStorage.getItem('activeCanvasId');

    // We only want to run this once on mount
    console.log('[WORKSPACE_PROVIDER] Fetching canvases...');
    canvasOps.refreshCanvases().then(() => {
      console.log('[WORKSPACE_PROVIDER] Canvases fetched.');
      if (savedCanvasId) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: savedCanvasId });
      }
    }).catch(err => console.error('[WORKSPACE_PROVIDER] Failed to fetch canvases:', err));

    console.log('Indexing Project...');
    CodebaseService.indexProject();

    // Cloud Academic Load with Local Fallback
    WorkspaceService.fetchAcademicProjects().then(cloudProjects => {
      if (cloudProjects.length > 0) {
        dispatch({ type: 'LOAD_ACADEMIC_PROJECTS', payload: cloudProjects });
      } else {
        const savedAcademic = localStorage.getItem('academicProjects');
        if (savedAcademic) {
          try {
            dispatch({ type: 'LOAD_ACADEMIC_PROJECTS', payload: JSON.parse(savedAcademic) });
          } catch (e) {
            console.error("Failed to load academic projects", e);
          }
        }
      }
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Only run once on mount to prevent infinite loops

  // Persistence Sync
  useEffect(() => {
    if (state.activeCanvasId) {
      localStorage.setItem('activeCanvasId', state.activeCanvasId);
    }
    localStorage.setItem('isTerminalVisible', String(state.isTerminalVisible));
    localStorage.setItem('academicProjects', JSON.stringify(state.academicProjects));
    if (state.onboarding_completed) localStorage.setItem('onboarding_completed', state.onboarding_completed);
    else localStorage.removeItem('onboarding_completed');
    if (state.eldoria_user_level) localStorage.setItem('eldoria_user_level', state.eldoria_user_level);
    else localStorage.removeItem('eldoria_user_level');
    localStorage.setItem('isLowPerfMode', String(state.isLowPerfMode));
  }, [state.activeCanvasId, state.isTerminalVisible, state.academicProjects, state.onboarding_completed, state.eldoria_user_level, state.isLowPerfMode]);


  // Sync ContextService with active state
  useEffect(() => {
    if (activeCanvas) {
      const content = Array.isArray(activeCanvas.content)
        ? activeCanvas.content
          .filter(p => p.type === 'text' || p.type === 'image')
          .map(p => (p as any).content || '')
          .join('\n')
        : activeCanvas.content;

      contextService.updateContext({
        activeFileName: activeCanvas.name,
        activeFileContent: content
      });
    }
  }, [activeCanvas]);

  useEffect(() => {
    if (state.academicProjects.length > 0) {
      const activeProject = state.academicProjects[state.academicProjects.length - 1];
      contextService.updateContext({
        academicProject: {
          id: activeProject.id,
          title: activeProject.wizard_state.basics.title || 'Untitled Research',
          mapSummary: `${Object.keys(activeProject.draft_content || {}).length} chapters drafted`
        }
      });
    }
  }, [state.academicProjects]);

  // Debounced Audit Trigger
  useEffect(() => {
    if (!activeCanvas) return;

    const currentContent = JSON.stringify(activeCanvas.content);
    if (currentContent === aiOps.lastAuditedContentRef.current) return;

    const timer = setTimeout(() => {
      // Only audit if we aren't already busy
      if (!state.isLoading) aiOps.performProactiveAudit();
    }, 60000); // Audit after 60 seconds of inactivity (less spam)

    return () => clearTimeout(timer);
  }, [activeCanvas?.content, aiOps.performProactiveAudit, state.isLoading]);


  // Simple UI/State Actions
  const toggleTerminal = useCallback(() => {
    const nextVisible = !state.isTerminalVisible;
    dispatch({ type: 'SET_TERMINAL_VISIBLE', payload: nextVisible });
    if (!nextVisible) {
      dispatch({ type: 'SET_TERMINAL_EXPANDED', payload: false });
    }
  }, [state.isTerminalVisible]);

  const toggleTerminalExpansion = useCallback(() => {
    dispatch({ type: 'TOGGLE_TERMINAL_EXPANSION' });
  }, []);

  const toggleTerminalMinimized = useCallback(() => {
    dispatch({ type: 'TOGGLE_TERMINAL_MINIMIZED' });
  }, []);

  const createFolder = useCallback((name: string, parentFolderId: string | null = null) => {
    const newFolder: Folder = {
      id: crypto.randomUUID(),
      name,
      parent_folder_id: parentFolderId,
      created_at: new Date().toISOString(),
    };
    dispatch({ type: 'ADD_FOLDER', payload: newFolder });
  }, []);

  const toggleFolder = useCallback((folderId: string) => {
    dispatch({ type: 'TOGGLE_FOLDER', payload: folderId });
  }, []);

  const completeOnboarding = useCallback(() => {
    dispatch({ type: 'SET_ONBOARDING_STATUS', payload: new Date().toISOString() });
  }, []);

  const setUserLevel = useCallback((level: 'newbie' | 'intermediate' | 'expert') => {
    dispatch({ type: 'SET_USER_LEVEL', payload: level });
  }, []);

  const resetOnboarding = useCallback(() => {
    dispatch({ type: 'SET_ONBOARDING_STATUS', payload: null });
    dispatch({ type: 'SET_USER_LEVEL', payload: null });
  }, []);

  const setLowPerfMode = useCallback((enabled: boolean) => {
    dispatch({ type: 'SET_LOW_PERF_MODE', payload: enabled });
  }, []);

  const updateGlobalSettings = useCallback((settings: Partial<any>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  // Bridge Functions
  const openLocalFile = useCallback(async (filePath: string) => {
    dispatch({ type: 'SET_LOADING', payload: true });
    try {
      const content = await CodebaseService.readFileContent(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || 'Untitled';

      // Check if a canvas with this name already exists
      const existing = state.canvases.find(c => c.name === fileName);
      if (existing) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: existing.id });
      } else {
        await canvasOps.createCanvas(fileName, [{ type: 'text', content }]);
      }
    } catch (e) {
      console.error("Failed to open local file:", e);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [canvasOps.createCanvas, state.canvases]);

  const reIndexWorkspace = useCallback(async () => {
    dispatch({ type: 'TRIGGER_REINDEX_START' });
    try {
      await CodebaseService.indexProject();
      // Force refresh context if needed
      contextService.updateContext({
        activeFileName: activeCanvas?.name || 'Index Update',
        activeFileContent: 'Refreshed Index'
      });
    } catch (e) {
      console.error("Manual re-index failed", e);
    } finally {
      dispatch({ type: 'TRIGGER_REINDEX_COMPLETE' });
    }
  }, [activeCanvas]);

  const clearTerminal = useCallback(() => {
    if (!state.activeCanvasId || !activeCanvas) return;
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, terminal_output: '' } });
    canvasOps._updateCanvasDatabase(state.activeCanvasId, { terminal_output: '' });
  }, [state.activeCanvasId, activeCanvas, canvasOps._updateCanvasDatabase]);

  return (
    <WorkspaceContext.Provider value={{
      ...state,
      activeCanvas,
      // Spread Hooks
      ...canvasOps,
      ...academicOps,
      ...aiOps,
      // Explicit Locals
      toggleTerminal,
      toggleTerminalExpansion,
      toggleTerminalMinimized,
      createFolder,
      toggleFolder,
      completeOnboarding,
      setUserLevel,
      resetOnboarding,
      setLowPerfMode,
      updateGlobalSettings,
      openLocalFile,
      setWorkspaceMode: (mode) => dispatch({ type: 'SET_WORKSPACE_MODE', payload: mode }),
      reIndexWorkspace,
      clearTerminal,
      // Dispatch
      state,
      dispatch
    }}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = () => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error('useWorkspace must be used within a WorkspaceProvider');
  }
  return context;
};

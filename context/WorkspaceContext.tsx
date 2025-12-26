import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Canvas, Folder, Source, CanvasPart, TextPart, SAFStatus, TaskLogEntry, ChatMessage, InlineAction, AcademicProject, Attachment } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import * as MemoryService from '../services/memoryService';
import { CodebaseService } from '../services/codebaseService';
import { runGroqGenerateStream, runGroqConversationStream, runGroqInlineActionStream, runGroqAuditStream } from '../services/groqService';
import { contextService } from '../services/ContextService';
import { supabase } from '../services/supabaseClient';


type SaveStatus = 'idle' | 'saving' | 'saved';
type MemoryStatus = 'idle' | 'searching' | 'saving' | 'error';

interface WorkspaceState {
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
}

type WorkspaceAction =
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
  | { type: 'TRIGGER_REINDEX_COMPLETE' };

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
  publishToAcademicHub: (projectId: string, fileName: string, content: string) => Promise<void>;
  openLocalFile: (path: string) => Promise<void>;
  isIndexing: boolean;
  completeOnboarding: () => void;
  setUserLevel: (level: 'newbie' | 'intermediate' | 'expert') => void;
  resetOnboarding: () => void;
  setLowPerfMode: (enabled: boolean) => void;
  isTerminalExecuting: boolean;
  updateGlobalSettings: (settings: Partial<any>) => void;
  reIndexWorkspace: () => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);
  const indexTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAuditedContentRef = useRef<string>('');

  const createCanvas = useCallback(async (name?: string, content?: CanvasPart[], shouldSwitch = true): Promise<Canvas | null> => {
    const newName = name || `New Canvas ${state.canvases.length + 1}`;
    const newCanvas = await WorkspaceService.createCanvas(newName, content);
    if (newCanvas) {
      dispatch({ type: 'ADD_CANVAS', payload: newCanvas });
      if (shouldSwitch) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newCanvas.id });
      }
    }
    return newCanvas;
  }, [state.canvases.length]);

  const refreshCanvases = useCallback(async () => {
    const fetchedCanvases = await WorkspaceService.fetchCanvases();
    dispatch({ type: 'LOAD_CANVASES', payload: fetchedCanvases });
    if (fetchedCanvases.length > 0) {
      dispatch({ type: 'SET_ACTIVE_CANVAS', payload: fetchedCanvases[0].id });
    } else {
      createCanvas();
    }
  }, [createCanvas]);

  // Initial Load
  useEffect(() => {
    const savedCanvasId = localStorage.getItem('activeCanvasId');
    refreshCanvases().then(() => {
      if (savedCanvasId) {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: savedCanvasId });
      }
    });
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
  }, [refreshCanvases]);

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

  const selectCanvas = (id: string) => {
    dispatch({ type: 'SET_ACTIVE_CANVAS', payload: id });
  };

  const initiateDelete = (id: string) => {
    dispatch({ type: 'INITIATE_DELETE', payload: id });
  };

  const cancelDelete = () => {
    dispatch({ type: 'CANCEL_DELETE' });
  };

  const deleteCanvas = async (id: string) => {
    dispatch({ type: 'SET_DELETING', payload: true });
    const success = await WorkspaceService.deleteCanvas(id);
    dispatch({ type: 'SET_DELETING', payload: false });
    dispatch({ type: 'CANCEL_DELETE' }); // Clear pending state regardless of outcome

    if (success) {
      const remainingCanvases = state.canvases.filter(c => c.id !== id);
      dispatch({ type: 'DELETE_CANVAS', payload: id });

      if (state.activeCanvasId === id) {
        if (remainingCanvases.length > 0) {
          dispatch({ type: 'SET_ACTIVE_CANVAS', payload: remainingCanvases[0].id });
        } else {
          createCanvas();
        }
      }
    } else {
      alert(
        "Failed to delete the canvas.\n\n" +
        "This is likely due to missing Row Level Security (RLS) policies in your Supabase project. " +
        "Please go to your Supabase SQL Editor and run the full setup script from 'services/supabaseClient.ts' to apply the necessary permissions."
      );
    }
  };

  const _updateCanvasDatabase = useCallback((id: string, updates: Partial<Omit<Canvas, 'id'>>) => {
    dispatch({ type: 'SET_SAVE_STATUS', payload: 'saving' });
    if (updateTimeout.current) clearTimeout(updateTimeout.current);

    updateTimeout.current = setTimeout(async () => {
      const updatedCanvas = await WorkspaceService.updateCanvas(id, updates);
      if (updatedCanvas) {
        dispatch({ type: 'UPDATE_CANVAS', payload: updatedCanvas });
      }
      dispatch({ type: 'SET_SAVE_STATUS', payload: 'saved' });
      setTimeout(() => dispatch({ type: 'SET_SAVE_STATUS', payload: 'idle' }), 2000);
    }, 500);
  }, []);

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

  const renameCanvas = async (id: string, newName: string) => {
    const canvas = state.canvases.find(c => c.id === id);
    if (canvas) {
      dispatch({ type: 'UPDATE_CANVAS', payload: { ...canvas, name: newName } });
      _updateCanvasDatabase(id, { name: newName });
    }
  };

  const updateCanvasPart = (id: string, partIndex: number, part: CanvasPart) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = [...targetCanvas.content];
    newContent[partIndex] = part;
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });

    // Trigger debounced indexing
    if (indexTimeout.current) clearTimeout(indexTimeout.current);
    const settings = JSON.parse(localStorage.getItem('eldoria_settings') || '{}');
    const debounceTime = settings.indexDebounce || 2000;

    if (!settings.indexOnSaveOnly) {
      const actualDebounce = state.isLowPerfMode ? Math.max(debounceTime, 10000) : debounceTime;
      indexTimeout.current = setTimeout(async () => {
        dispatch({ type: 'SET_INDEXING', payload: true });
        await CodebaseService.indexProject();
        dispatch({ type: 'SET_INDEXING', payload: false });
      }, actualDebounce);
    }
  };

  const addCanvasPart = (id: string, part: CanvasPart, index?: number) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = [...targetCanvas.content];
    if (index !== undefined) {
      newContent.splice(index, 0, part);
    } else {
      newContent.push(part);
    }
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });
  };

  const removeCanvasPart = (id: string, partIndex: number) => {
    const targetCanvas = state.canvases.find(c => c.id === id);
    if (!targetCanvas) return;
    const newContent = targetCanvas.content.filter((_, i) => i !== partIndex);
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
    _updateCanvasDatabase(id, { content: newContent });
  };

  const executeTool = useCallback(async (name: string, args: any): Promise<any> => {
    if (name === 'fetch_web_content') {
      const { data, error } = await supabase.functions.invoke('scrape', { body: { url: args.url } });
      return error ? { error: error.message } : { content: data.content };
    }
    if (name === 'create_new_canvas_with_content') {
      const newCanvas = await createCanvas(args.name, [{ type: 'text', content: args.content }], false);
      return { success: !!newCanvas, canvasId: newCanvas?.id, canvasName: newCanvas?.name };
    }
    if (name === 'run_command') {
      const command = args.command;
      const currentTerminal = activeCanvas?.terminal_output || '';
      const newTerminal = currentTerminal + `\n$ ${command}\n[SIMULATED OUTPUT]: Command "${command}" executed successfully.`;

      if (state.activeCanvasId) {
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas!, terminal_output: newTerminal } });
        _updateCanvasDatabase(state.activeCanvasId, { terminal_output: newTerminal });
      }
      return { success: true, output: `Executed: ${command}` };
    }
    if (name === 'deconstruct_system') {
      // SAF System Deconstruction Tool
      const safBlueprint = {
        project_name: args.system_name,
        modification_goal: args.modification_goal || 'Analysis only',
        components: [
          { id: 'core', name: `${args.system_name} Core`, type: 'core', dependencies: [] },
          { id: 'input', name: 'Input Layer', type: 'subcore', dependencies: ['core'] },
          { id: 'processing', name: 'Processing Unit', type: 'subcore', dependencies: ['core'] },
          { id: 'output', name: 'Output Layer', type: 'subcore', dependencies: ['processing'] }
        ],
        flows: [
          { from: 'input', to: 'processing', type: 'data_flow' },
          { from: 'processing', to: 'output', type: 'data_flow' }
        ],
        description: args.description
      };

      // Create a new canvas with the blueprint for visualization
      const blueprintContent = `# SAF Blueprint: ${args.system_name}\n\n## Goal\n${args.modification_goal || 'System Analysis'}\n\n## Description\n${args.description}\n\n## Component Tree\n\`\`\`json\n${JSON.stringify(safBlueprint, null, 2)}\n\`\`\`\n\n---\n*Use this blueprint to modify components and observe cascading effects.*`;
      const newCanvas = await createCanvas(`SAF: ${args.system_name}`, [{ type: 'text', content: blueprintContent }], false);

      return {
        success: true,
        blueprint: safBlueprint,
        canvasId: newCanvas?.id,
        message: `System "${args.system_name}" deconstructed. Blueprint saved to new canvas.`
      };
    }
    if (name === 'suggest_prompt') {
      // AI is recommending a prompt schema
      return {
        success: true,
        message: `Suggested prompt schema: ${args.schema_id}. Reasoning: ${args.reasoning}`,
        schema_id: args.schema_id,
        suggested_variables: args.suggested_variables || {},
        reasoning: args.reasoning
      };
    }
    // googleSearch is handled natively by the Gemini API.
    return { error: `Tool "${name}" is not implemented.` };
  }, [createCanvas, activeCanvas, state.activeCanvasId, _updateCanvasDatabase]);

  const generate = useCallback(async () => {
    if (!state.activeCanvasId || state.isLoading || !activeCanvas) return;
    if (!activeCanvas.content || activeCanvas.content.length === 0) return;

    dispatch({ type: 'SET_LOADING', payload: true });
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: '', output_sources: [], task_log: [] } });

    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'searching' });
    const queryText = activeCanvas.content.filter(p => p.type === 'text').map(p => p.content).join('\n');
    const memories = await MemoryService.searchMemories(queryText);
    const memoryContext = memories.map(m => m.content).join('\n---\n');
    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });

    let finalOutput = '';
    let taskLog: TaskLogEntry[] = [];
    try {
      const projectIndex = CodebaseService.getProjectIndex();
      const enhancedMemoryContext = `${memoryContext}\n\n--- PROJECT STRUCTURE ---\n${projectIndex}`;

      const stream = runGroqGenerateStream(activeCanvas.content, enhancedMemoryContext, executeTool);
      for await (const event of stream) {
        // console.log('Stream Event:', event); // Debug
        if (event.safStatus) {
          dispatch({ type: 'SET_SAF_STATUS', payload: event.safStatus });
        }
        if (event.taskLogEntry) {
          taskLog = [...taskLog, event.taskLogEntry];
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: [...taskLog] } });
        }
        if (event.textChunk) {
          finalOutput += event.textChunk;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, output: finalOutput, task_log: [...taskLog] } });
        }
      }
    } catch (e) {
      console.error(e);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
      dispatch({ type: 'SET_SAF_STATUS', payload: 'idle' });
      _updateCanvasDatabase(state.activeCanvasId, { output: finalOutput, task_log: taskLog });
    }
  }, [state.activeCanvasId, state.isLoading, activeCanvas, executeTool, _updateCanvasDatabase]);

  const performProactiveAudit = useCallback(async () => {
    if (!activeCanvas || state.isLoading) return;

    try {
      console.log("[AUDITOR] Starting proactive audit...");
      const projectIndex = CodebaseService.getProjectIndex();
      const stream = runGroqAuditStream(activeCanvas.content, projectIndex);

      let auditOutput = '';
      for await (const event of stream) {
        if (event.textChunk) {
          auditOutput += event.textChunk;
        }
      }

      if (auditOutput.trim() && auditOutput.trim() !== "NO_INSIGHT") {
        // Parse metadata
        let cleanText = auditOutput;
        let metadata = null;
        const metadataMatch = auditOutput.match(/\[METADATA\](.*?)\[\/METADATA\]/s);

        if (metadataMatch) {
          try {
            metadata = JSON.parse(metadataMatch[1].trim());
            cleanText = auditOutput.replace(/\[METADATA\].*?\[\/METADATA\]/s, '').trim();
          } catch (e) {
            console.error("Failed to parse insight metadata:", e);
          }
        }

        const insightEntry: ChatMessage = { sender: 'bot', text: `💡 **Eldoria Insight:**\n\n${cleanText}` };

        // Push to both chat and the new dedicated insights array
        const updatedInsights = [cleanText, ...(activeCanvas.insights || [])].slice(0, 10); // Keep last 10
        const updatedMetadata = [metadata, ...(activeCanvas.insight_metadata || [])].slice(0, 10);

        dispatch({
          type: 'UPDATE_CANVAS',
          payload: {
            ...activeCanvas,
            chat_history: [...(activeCanvas.chat_history || []), insightEntry],
            insights: updatedInsights,
            insight_metadata: updatedMetadata
          }
        });
      }

      // Track that we've audited this specific content
      lastAuditedContentRef.current = JSON.stringify(activeCanvas.content);
    } catch (e) {
      console.error("Proactive Audit Failed:", e);
    }
  }, [activeCanvas, state.isLoading]);

  // Debounced Audit Trigger
  useEffect(() => {
    if (!activeCanvas) return;

    const currentContent = JSON.stringify(activeCanvas.content);
    if (currentContent === lastAuditedContentRef.current) return;

    const timer = setTimeout(() => {
      // Only audit if we aren't already busy
      if (!state.isLoading) performProactiveAudit();
    }, 60000); // Audit after 60 seconds of inactivity (less spam)

    return () => clearTimeout(timer);
  }, [activeCanvas?.content, performProactiveAudit, state.isLoading]);

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

  const runManualCommand = useCallback(async (command: string): Promise<{ output: string; error: string | null }> => {
    if (!activeCanvas) return { output: '', error: 'No active canvas' };

    const timestamp = new Date().toLocaleTimeString();
    const commandLog = `\n[${timestamp}] $ ${command}\n`;

    // Auto-Peek: Expand if minimized
    const wasMinimized = state.isTerminalMinimized;
    if (wasMinimized) {
      dispatch({ type: 'TOGGLE_TERMINAL_MINIMIZED' });
    }

    dispatch({ type: 'SET_TERMINAL_EXECUTING', payload: true });
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, terminal_output: (activeCanvas.terminal_output || '') + commandLog } });

    const result = await WorkspaceService.runCommand(command);

    dispatch({
      type: 'UPDATE_CANVAS', payload: {
        ...activeCanvas,
        terminal_output: (activeCanvas.terminal_output || '') + commandLog + result.output + (result.error ? `\n[ERROR] ${result.error}` : '') + '\n'
      }
    });

    dispatch({ type: 'SET_TERMINAL_EXECUTING', payload: false });

    // Auto-Peek: Collapse back after a delay if it was auto-expanded
    if (wasMinimized) {
      setTimeout(() => {
        dispatch({ type: 'TOGGLE_TERMINAL_MINIMIZED' });
      }, 1500);
    }

    return result;
  }, [activeCanvas, state.isTerminalMinimized]);

  const clearTerminal = useCallback(() => {
    if (!state.activeCanvasId || !activeCanvas) return;
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, terminal_output: '' } });
    _updateCanvasDatabase(state.activeCanvasId, { terminal_output: '' });
  }, [state.activeCanvasId, activeCanvas, _updateCanvasDatabase]);

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

  const sendChatMessage = useCallback(async (message: string, attachments: Attachment[] = []) => {
    if (!activeCanvas || state.isChatLoading) return;

    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    // Process attachments: Read content if not present
    const processedAttachments = await Promise.all(attachments.map(async attr => {
      if (!attr.content) {
        const content = await CodebaseService.readFileContent(attr.path);
        return { ...attr, content };
      }
      return attr;
    }));

    const userMessage: ChatMessage = { sender: 'user', text: message, attachments: processedAttachments };
    const currentHistory = activeCanvas.chat_history || [];
    const updatedHistory = [...currentHistory, userMessage];

    // Optimistically update UI
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: updatedHistory } });

    let botResponse = '';
    const botMessage: ChatMessage = { sender: 'bot', text: '' };
    const finalHistory = [...updatedHistory, botMessage];

    try {
      // Build Meta-Context
      const projectIndex = CodebaseService.getProjectIndex();
      const firstPartText = activeCanvas.content[0]?.type === 'text'
        ? (activeCanvas.content[0] as any).content
        : '';

      const currentProject = state.academicProjects.find(p =>
        Object.values(p.draft_content || {}).some(c => firstPartText && c.includes(firstPartText))
      );

      let metaContext = `\n\n--- PROJECT CONTEXT ---\nFILE INDEX:\n${projectIndex.substring(0, 1000)}`;
      if (currentProject) {
        metaContext += `\n\nTHESIS PROJECT: ${currentProject.name}\nOBJECTIVES: ${currentProject.wizard_state.objectives.aim}\nKEY SOURCES: ${currentProject.references.length} references found.`;
      }

      // Add full content of attachments to context
      if (processedAttachments.length > 0) {
        metaContext += `\n\n--- ATTACHED FILES ---\n`;
        processedAttachments.forEach(attr => {
          metaContext += `\nFILE: ${attr.name}\nCONTENT:\n${attr.content?.substring(0, 5000)}\n---`;
        });
      }

      const stream = runGroqConversationStream(activeCanvas.content, currentHistory, message, metaContext);
      for await (const event of stream) {
        if (event.textChunk) {
          botResponse += event.textChunk;

          // --- SAF-ISO PARSING LOGIC ---
          let displayResponse = botResponse;
          const safMatch = botResponse.match(/<SAF_ISO>(.*?)<\/SAF_ISO>/s);

          if (safMatch) {
            try {
              const safJson = JSON.parse(safMatch[1]);
              const newBlueprint = safJson;

              // Only update if it's new/different to avoid render thrashing
              const currentBlueprint = activeCanvas.saf_blueprint;
              if (JSON.stringify(newBlueprint) !== JSON.stringify(currentBlueprint)) {
                dispatch({
                  type: 'UPDATE_CANVAS',
                  payload: { ...activeCanvas, saf_blueprint: newBlueprint }
                });
                // Persist to DB immediately so it sticks on reload
                _updateCanvasDatabase(activeCanvas.id, { saf_blueprint: newBlueprint });
              }

              // Hide the JSON block from the chat UI
              displayResponse = botResponse.replace(safMatch[0], '').trim();
            } catch (jsonErr) {
              console.warn("Incomplete or invalid SAF JSON:", jsonErr);
            }
          }
          // -----------------------------

          botMessage.text = displayResponse;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
        }
        if (event.error) {
          botMessage.text = event.error;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
        }
      }
    } catch (e) {
      console.error("Chat failed:", e);
      botMessage.text = "Sorry, I encountered an error. The mental bridge seems slightly taxed.";
      dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      _updateCanvasDatabase(activeCanvas.id, { chat_history: finalHistory });
    }

  }, [activeCanvas, state.isChatLoading, state.academicProjects, _updateCanvasDatabase]);

  const acceptOutput = useCallback(() => {
    if (!activeCanvas || !activeCanvas.output) return;
    const newContent: CanvasPart[] = [{ type: 'text', content: activeCanvas.output }];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
    _updateCanvasDatabase(activeCanvas.id, { content: newContent });

    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
    MemoryService.createMemory(activeCanvas.output).finally(() => {
      dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
    });
  }, [activeCanvas, _updateCanvasDatabase]);

  const appendOutput = useCallback(() => {
    if (!activeCanvas || !activeCanvas.output) return;
    const newContent = [...activeCanvas.content, { type: 'text' as const, content: '\n\n' + activeCanvas.output }];
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, content: newContent } });
    _updateCanvasDatabase(activeCanvas.id, { content: newContent });

    dispatch({ type: 'SET_MEMORY_STATUS', payload: 'saving' });
    MemoryService.createMemory(activeCanvas.output).finally(() => {
      dispatch({ type: 'SET_MEMORY_STATUS', payload: 'idle' });
    });
  }, [activeCanvas, _updateCanvasDatabase]);

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
        await createCanvas(fileName, [{ type: 'text', content }]);
      }
    } catch (e) {
      console.error("Failed to open local file:", e);
    } finally {
      dispatch({ type: 'SET_LOADING', payload: false });
    }
  }, [createCanvas, state.canvases]);

  const performInlineAction = useCallback(async (action: InlineAction, selection: { text: string; start: number; end: number }, partIndex: number) => {
    if (!activeCanvas) return;

    dispatch({ type: 'SET_INLINE_LOADING', payload: true });

    try {
      const stream = runGroqInlineActionStream(activeCanvas.content, selection.text, action);
      let resultText = '';
      for await (const event of stream) {
        if (event.textChunk) resultText += event.textChunk;
      }

      const targetPart = activeCanvas.content[partIndex];
      if (targetPart.type !== 'text') return;

      if (action === 'refactor') {
        const newText = targetPart.content.substring(0, selection.start) + resultText + targetPart.content.substring(selection.end);
        updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
      } else if (action === 'continue') {
        const newText = targetPart.content.substring(0, selection.end) + resultText + targetPart.content.substring(selection.end);
        updateCanvasPart(activeCanvas.id, partIndex, { ...targetPart, content: newText });
      } else if (action === 'explain') {
        const newLogEntry: TaskLogEntry = { type: 'thought', content: `**Explanation for selected text:**\n\n${resultText}` };
        const newLog = [...(activeCanvas.task_log || []), newLogEntry];
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, task_log: newLog } });
        _updateCanvasDatabase(activeCanvas.id, { task_log: newLog });
      }
    } catch (e) {
      console.error("Inline action failed:", e);
    } finally {
      dispatch({ type: 'SET_INLINE_LOADING', payload: false });
    }
  }, [activeCanvas, updateCanvasPart, _updateCanvasDatabase]);

  const deleteAcademicProject = useCallback(async (id: string) => {
    dispatch({ type: 'DELETE_ACADEMIC_PROJECT', payload: id });
    await WorkspaceService.deleteAcademicProject(id);
  }, []);



  const updateGlobalSettings = useCallback((settings: Partial<any>) => {
    dispatch({ type: 'UPDATE_SETTINGS', payload: settings });
  }, []);

  const reIndexWorkspace = useCallback(async () => {
    dispatch({ type: 'TRIGGER_REINDEX_START' });
    try {
      await CodebaseService.indexProject();
      // Force refresh context if needed
      contextService.updateContext({
        // This forces a context update with the new index string
        activeFileName: activeCanvas?.name || 'Index Update',
        activeFileContent: 'Refreshed Index'
      });
      // We actually want the REAL index in the context service, which it likely pulls from CodebaseService directly 
      // when we call updateContext, or we pass it explicitly.
      // Looking at ContextService, it seems to hold state. 
      // Let's rely on the fact that CodebaseService.indexProject() updates the static index string.

    } catch (e) {
      console.error("Manual re-index failed", e);
    } finally {
      dispatch({ type: 'TRIGGER_REINDEX_COMPLETE' });
    }
  }, [activeCanvas]);



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

  const publishToAcademicHub = useCallback(async (projectId?: string, fileName?: string, content?: string) => {
    // If no arguments, use the active canvas content
    if (!activeCanvas) {
      console.warn('No active canvas to publish');
      return;
    }

    // Extract text content from the active canvas
    const textParts = activeCanvas.content
      ?.filter(part => part.type === 'text' && part.content?.trim())
      .map(part => (part as any).content)
      .join('\n\n') || '';

    if (!textParts.trim()) {
      console.warn('No text content to publish');
      return;
    }

    // If we have academic projects, add to the most recent one or create a new resource
    if (state.academicProjects.length > 0) {
      const targetProject = projectId
        ? state.academicProjects.find(p => p.id === projectId)
        : state.academicProjects[state.academicProjects.length - 1];

      if (targetProject) {
        const updatedProject = {
          ...targetProject,
          resources: [
            ...(targetProject.resources || []),
            {
              id: Date.now().toString(),
              name: fileName || activeCanvas.name || 'Published Content',
              type: 'note' as const,
              content: textParts,
              created_at: new Date().toISOString()
            }
          ]
        };
        dispatch({ type: 'UPDATE_ACADEMIC_PROJECT', payload: updatedProject });
        await WorkspaceService.updateAcademicProject(updatedProject.id, updatedProject);
        console.log('Published to Academic Hub:', updatedProject.name);
      }
    } else {
      console.warn('No academic projects found. Create a project in Academic Hub first.');
    }
  }, [activeCanvas, state.academicProjects]);


  return (
    <WorkspaceContext.Provider value={{
      ...state,
      activeCanvas,
      createCanvas,
      selectCanvas,
      deleteCanvas,
      initiateDelete,
      cancelDelete,
      renameCanvas,
      updateCanvasPart,
      addCanvasPart,
      removeCanvasPart,
      generate,
      sendChatMessage,
      acceptOutput,
      appendOutput,
      performInlineAction,
      clearTerminal,
      createFolder,
      toggleFolder,
      performProactiveAudit,
      toggleTerminal,
      toggleTerminalExpansion,
      toggleTerminalMinimized,
      runManualCommand,
      isTerminalExpanded: state.isTerminalExpanded,
      isTerminalMinimized: state.isTerminalMinimized,
      addAcademicProject: async (project: AcademicProject) => {
        dispatch({ type: 'ADD_ACADEMIC_PROJECT', payload: project });
        await WorkspaceService.createAcademicProject(project);
      },
      updateAcademicProject: (project: AcademicProject) => {
        dispatch({ type: 'UPDATE_ACADEMIC_PROJECT', payload: project });
        // Debounced cloud update
        if (updateTimeout.current) clearTimeout(updateTimeout.current);
        updateTimeout.current = setTimeout(() => {
          WorkspaceService.updateAcademicProject(project.id, project);
        }, 1000);
      },
      deleteAcademicProject,
      publishToAcademicHub,
      openLocalFile,
      completeOnboarding,
      setUserLevel,
      resetOnboarding,
      setLowPerfMode,
      updateGlobalSettings,
      reIndexWorkspace
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

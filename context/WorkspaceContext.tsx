import React, { createContext, useContext, useReducer, ReactNode, useCallback, useEffect, useRef } from 'react';
import { Canvas, Folder, Source, CanvasPart, TextPart, SAFStatus, TaskLogEntry, ChatMessage, InlineAction, AcademicProject } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import * as MemoryService from '../services/memoryService';
import { CodebaseService } from '../services/codebaseService';
import { runGroqGenerateStream, runGroqConversationStream, runGroqInlineActionStream, runGroqAuditStream } from '../services/groqService';
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
  academicProjects: AcademicProject[];
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
  | { type: 'ADD_ACADEMIC_PROJECT'; payload: AcademicProject }
  | { type: 'UPDATE_ACADEMIC_PROJECT'; payload: AcademicProject }
  | { type: 'LOAD_ACADEMIC_PROJECTS'; payload: AcademicProject[] }
  | { type: 'DELETE_ACADEMIC_PROJECT'; payload: string };

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
  academicProjects: [],
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
      return { ...state, isTerminalExpanded: action.payload };
    case 'ADD_ACADEMIC_PROJECT':
      return { ...state, academicProjects: [action.payload, ...state.academicProjects] };
    case 'UPDATE_ACADEMIC_PROJECT':
      return { ...state, academicProjects: state.academicProjects.map(p => p.id === action.payload.id ? action.payload : p) };
    case 'LOAD_ACADEMIC_PROJECTS':
      return { ...state, academicProjects: action.payload };
    case 'DELETE_ACADEMIC_PROJECT':
      return { ...state, academicProjects: state.academicProjects.filter(p => p.id !== action.payload) };
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
  runManualCommand: (command: string) => Promise<{ output: string; error: string | null }>;
  isTerminalExpanded: boolean;
  addAcademicProject: (project: AcademicProject) => void;
  updateAcademicProject: (project: AcademicProject) => void;
  deleteAcademicProject: (id: string) => void;
}

const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider = ({ children }: { children: ReactNode }) => {
  const [state, dispatch] = useReducer(workspaceReducer, initialState);
  const activeCanvas = state.canvases.find(c => c.id === state.activeCanvasId);
  const updateTimeout = useRef<NodeJS.Timeout | null>(null);
  const lastAuditedContentRef = useRef<string>('');

  const createCanvas = useCallback(async (name?: string, content?: CanvasPart[]): Promise<Canvas | null> => {
    const newName = name || `New Canvas ${state.canvases.length + 1}`;
    const newCanvas = await WorkspaceService.createCanvas(newName, content);
    if (newCanvas) {
      dispatch({ type: 'ADD_CANVAS', payload: newCanvas });
      dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newCanvas.id });
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
  }, [state.activeCanvasId, state.isTerminalVisible, state.academicProjects]);

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
      const newCanvas = await createCanvas(args.name, [{ type: 'text', content: args.content }]);
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
    // googleSearch is handled natively by the Gemini API.
    return { error: `Tool "${name}" is not implemented.` };
  }, [createCanvas]);

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
    dispatch({ type: 'SET_TERMINAL_VISIBLE', payload: !state.isTerminalVisible });
  }, [state.isTerminalVisible]);

  const toggleTerminalExpansion = useCallback(() => {
    dispatch({ type: 'SET_TERMINAL_EXPANDED', payload: !state.isTerminalExpanded });
  }, [state.isTerminalExpanded]);

  const runManualCommand = useCallback(async (command: string): Promise<{ output: string; error: string | null }> => {
    if (!activeCanvas) return { output: '', error: 'No active canvas' };

    const timestamp = new Date().toLocaleTimeString();
    const commandLog = `\n[${timestamp}] $ ${command}\n`;

    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, terminal_output: (activeCanvas.terminal_output || '') + commandLog } });

    const result = await WorkspaceService.runCommand(command);

    dispatch({
      type: 'UPDATE_CANVAS', payload: {
        ...activeCanvas,
        terminal_output: (activeCanvas.terminal_output || '') + commandLog + result.output + (result.error ? `\n[ERROR] ${result.error}` : '') + '\n'
      }
    });

    return result;
  }, [activeCanvas]);

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

  const sendChatMessage = useCallback(async (message: string) => {
    if (!activeCanvas || state.isChatLoading) return;

    dispatch({ type: 'SET_CHAT_LOADING', payload: true });

    const userMessage: ChatMessage = { sender: 'user', text: message };
    const currentHistory = activeCanvas.chat_history || [];
    const updatedHistory = [...currentHistory, userMessage];

    // Optimistically update UI
    dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: updatedHistory } });

    let botResponse = '';
    const botMessage: ChatMessage = { sender: 'bot', text: '' };
    const finalHistory = [...updatedHistory, botMessage];

    try {
      const stream = runGroqConversationStream(activeCanvas.content, currentHistory, message);
      for await (const event of stream) {
        if (event.textChunk) {
          botResponse += event.textChunk;
          botMessage.text = botResponse;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
        }
        if (event.error) {
          botMessage.text = event.error;
          dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
        }
      }
    } catch (e) {
      console.error("Chat failed:", e);
      botMessage.text = "Sorry, I encountered an error.";
      dispatch({ type: 'UPDATE_CANVAS', payload: { ...activeCanvas, chat_history: [...finalHistory] } });
    } finally {
      dispatch({ type: 'SET_CHAT_LOADING', payload: false });
      _updateCanvasDatabase(activeCanvas.id, { chat_history: finalHistory });
    }

  }, [activeCanvas, state.isChatLoading, _updateCanvasDatabase]);

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
      runManualCommand,
      isTerminalExpanded: state.isTerminalExpanded,
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
      deleteAcademicProject: async (id: string) => {
        dispatch({ type: 'DELETE_ACADEMIC_PROJECT', payload: id });
        await WorkspaceService.deleteAcademicProject(id);
      },
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

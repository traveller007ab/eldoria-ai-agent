import { useCallback, useRef } from 'react';
import { Canvas, CanvasPart } from '../types';
import * as WorkspaceService from '../services/workspaceService';
import { WorkspaceAction, WorkspaceState } from '../context/WorkspaceContext';
import { CodebaseService } from '../services/codebaseService';

interface UseCanvasOperationsProps {
    state: WorkspaceState;
    dispatch: React.Dispatch<WorkspaceAction>;
}

export const useCanvasOperations = ({ state, dispatch }: UseCanvasOperationsProps) => {
    const isRefreshing = useRef(false);
    const updateTimeout = useRef<NodeJS.Timeout | null>(null);
    const indexTimeout = useRef<NodeJS.Timeout | null>(null);

    const createCanvas = useCallback(async (name?: string, content?: CanvasPart[], shouldSwitch = true): Promise<Canvas | null> => {
        // Prevent creating multiple empty canvases if we already have some
        if (!name && state.canvases.some(c => c.name.startsWith('New Canvas') && c.content.length === 1 && (c.content[0] as any).content === '')) {
            return null;
        }

        const newName = name || `New Canvas ${state.canvases.length + 1}`;
        const newCanvas = await WorkspaceService.createCanvas(newName, content);
        if (newCanvas) {
            dispatch({ type: 'ADD_CANVAS', payload: newCanvas });
            if (shouldSwitch) {
                dispatch({ type: 'SET_ACTIVE_CANVAS', payload: newCanvas.id });
            }
        }
        return newCanvas;
    }, [state.canvases, dispatch]);

    const refreshCanvases = useCallback(async () => {
        if (isRefreshing.current) return;
        isRefreshing.current = true;

        try {
            const fetchedCanvases = await WorkspaceService.fetchCanvases();
            dispatch({ type: 'LOAD_CANVASES', payload: fetchedCanvases });

            if (fetchedCanvases.length > 0) {
                if (!state.activeCanvasId) {
                    dispatch({ type: 'SET_ACTIVE_CANVAS', payload: fetchedCanvases[0].id });
                }
            } else {
                // Only create if we are absolutely sure there are none
                await createCanvas();
            }
        } finally {
            isRefreshing.current = false;
        }
    }, [createCanvas, dispatch, state.activeCanvasId]);

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
    }, [dispatch]);

    const renameCanvas = useCallback(async (id: string, newName: string) => {
        const canvas = state.canvases.find(c => c.id === id);
        if (canvas) {
            dispatch({ type: 'UPDATE_CANVAS', payload: { ...canvas, name: newName } });
            _updateCanvasDatabase(id, { name: newName });
        }
    }, [state.canvases, dispatch, _updateCanvasDatabase]);

    const updateCanvasPart = useCallback((id: string, partIndex: number, part: CanvasPart) => {
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
    }, [state.canvases, state.isLowPerfMode, dispatch, _updateCanvasDatabase]);

    const addCanvasPart = useCallback((id: string, part: CanvasPart, index?: number) => {
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
    }, [state.canvases, dispatch, _updateCanvasDatabase]);

    const removeCanvasPart = useCallback((id: string, partIndex: number) => {
        const targetCanvas = state.canvases.find(c => c.id === id);
        if (!targetCanvas) return;
        const newContent = targetCanvas.content.filter((_, i) => i !== partIndex);
        dispatch({ type: 'UPDATE_CANVAS', payload: { ...targetCanvas, content: newContent } });
        _updateCanvasDatabase(id, { content: newContent });
    }, [state.canvases, dispatch, _updateCanvasDatabase]);

    const deleteCanvas = useCallback(async (id: string) => {
        dispatch({ type: 'SET_DELETING', payload: true });
        const success = await WorkspaceService.deleteCanvas(id);
        dispatch({ type: 'SET_DELETING', payload: false });
        dispatch({ type: 'CANCEL_DELETE' });

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
            alert("Failed to delete the canvas. Check RLS policies.");
        }
    }, [state.canvases, state.activeCanvasId, dispatch, createCanvas]);

    const selectCanvas = useCallback((id: string) => {
        dispatch({ type: 'SET_ACTIVE_CANVAS', payload: id });
    }, [dispatch]);

    const initiateDelete = useCallback((id: string) => {
        dispatch({ type: 'INITIATE_DELETE', payload: id });
    }, [dispatch]);

    const cancelDelete = useCallback(() => {
        dispatch({ type: 'CANCEL_DELETE' });
    }, [dispatch]);

    return {
        createCanvas,
        refreshCanvases,
        renameCanvas,
        updateCanvasPart,
        addCanvasPart,
        removeCanvasPart,
        deleteCanvas,
        selectCanvas,
        initiateDelete,
        cancelDelete,
        _updateCanvasDatabase // Exported for AI hook usage if needed
    };
};

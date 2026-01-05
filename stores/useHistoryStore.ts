/**
 * useHistoryStore: Undo/Redo System for SAF Lab
 * 
 * Implements Command Pattern for all blueprint mutations.
 * Stores snapshots for undo/redo functionality.
 */

import { create } from 'zustand';
import { DeepSAFBlueprint } from '../components/saf/types';

// ============================================
// TYPES
// ============================================

interface HistoryEntry {
    timestamp: number;
    description: string;
    snapshot: DeepSAFBlueprint;
}

interface HistoryState {
    // History stacks
    undoStack: HistoryEntry[];
    redoStack: HistoryEntry[];

    // Current blueprint reference (for comparison)
    currentSnapshot: DeepSAFBlueprint | null;

    // Max history size to prevent memory bloat
    maxHistorySize: number;

    // Actions
    pushState: (blueprint: DeepSAFBlueprint, description: string) => void;
    undo: () => DeepSAFBlueprint | null;
    redo: () => DeepSAFBlueprint | null;
    canUndo: () => boolean;
    canRedo: () => boolean;
    clearHistory: () => void;
    getLastDescription: () => string | null;
}

// ============================================
// THE STORE
// ============================================

export const useHistoryStore = create<HistoryState>((set, get) => ({
    undoStack: [],
    redoStack: [],
    currentSnapshot: null,
    maxHistorySize: 50,

    /**
     * Push a new state to history.
     * Called before any mutation to save the "before" state.
     */
    pushState: (blueprint: DeepSAFBlueprint, description: string) => {
        const state = get();

        // Don't push if blueprint is identical (no actual change)
        if (state.currentSnapshot &&
            JSON.stringify(state.currentSnapshot) === JSON.stringify(blueprint)) {
            return;
        }

        // Create snapshot entry
        const entry: HistoryEntry = {
            timestamp: Date.now(),
            description,
            snapshot: JSON.parse(JSON.stringify(blueprint)), // Deep clone
        };

        set(s => {
            // Add current state to undo stack (if exists)
            const newUndoStack = s.currentSnapshot
                ? [...s.undoStack, {
                    timestamp: Date.now(),
                    description: s.undoStack.length > 0 ? s.undoStack[s.undoStack.length - 1]?.description || 'Initial' : 'Initial',
                    snapshot: s.currentSnapshot
                }]
                : s.undoStack;

            // Trim to max size
            const trimmedUndo = newUndoStack.slice(-s.maxHistorySize);

            return {
                undoStack: trimmedUndo,
                redoStack: [], // Clear redo on new action
                currentSnapshot: entry.snapshot,
            };
        });

        console.log(`[History] Pushed: "${description}" (Undo stack: ${get().undoStack.length})`);
    },

    /**
     * Undo: Pop from undo stack, push current to redo.
     */
    undo: () => {
        const state = get();
        if (state.undoStack.length === 0) return null;

        const previousEntry = state.undoStack[state.undoStack.length - 1];

        set(s => ({
            undoStack: s.undoStack.slice(0, -1),
            redoStack: s.currentSnapshot
                ? [...s.redoStack, {
                    timestamp: Date.now(),
                    description: 'Redo',
                    snapshot: s.currentSnapshot
                }]
                : s.redoStack,
            currentSnapshot: previousEntry.snapshot,
        }));

        console.log(`[History] Undo: "${previousEntry.description}"`);
        return previousEntry.snapshot;
    },

    /**
     * Redo: Pop from redo stack, push current to undo.
     */
    redo: () => {
        const state = get();
        if (state.redoStack.length === 0) return null;

        const nextEntry = state.redoStack[state.redoStack.length - 1];

        set(s => ({
            redoStack: s.redoStack.slice(0, -1),
            undoStack: s.currentSnapshot
                ? [...s.undoStack, {
                    timestamp: Date.now(),
                    description: 'Before Redo',
                    snapshot: s.currentSnapshot
                }]
                : s.undoStack,
            currentSnapshot: nextEntry.snapshot,
        }));

        console.log(`[History] Redo`);
        return nextEntry.snapshot;
    },

    canUndo: () => get().undoStack.length > 0,
    canRedo: () => get().redoStack.length > 0,

    clearHistory: () => {
        set({ undoStack: [], redoStack: [], currentSnapshot: null });
        console.log('[History] Cleared');
    },

    getLastDescription: () => {
        const state = get();
        if (state.undoStack.length === 0) return null;
        return state.undoStack[state.undoStack.length - 1].description;
    },
}));

// ============================================
// KEYBOARD SHORTCUTS HOOK
// ============================================

/**
 * Call this hook in SAFLab to enable Ctrl+Z / Ctrl+Shift+Z
 */
export function useHistoryKeyboardShortcuts(
    onUndo: () => void,
    onRedo: () => void
) {
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
        // Ctrl+Z or Cmd+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && !e.shiftKey) {
            e.preventDefault();
            onUndo();
        }
        // Ctrl+Shift+Z or Cmd+Shift+Z
        if ((e.ctrlKey || e.metaKey) && e.key === 'z' && e.shiftKey) {
            e.preventDefault();
            onRedo();
        }
        // Ctrl+Y (Windows redo)
        if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
            e.preventDefault();
            onRedo();
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
}

export default useHistoryStore;

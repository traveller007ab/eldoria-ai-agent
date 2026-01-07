import { useEffect, useCallback } from 'react';

interface KeyboardShortcut {
    key: string;
    ctrl?: boolean;
    shift?: boolean;
    alt?: boolean;
    action: () => void;
    description: string;
}

export const useKeyboardShortcuts = (shortcuts: KeyboardShortcut[]) => {
    const handleKeyDown = useCallback((event: KeyboardEvent) => {
        // Don't trigger shortcuts when typing in inputs
        const target = event.target as HTMLElement;
        if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
            return;
        }

        for (const shortcut of shortcuts) {
            const ctrlMatch = shortcut.ctrl ? (event.ctrlKey || event.metaKey) : !event.ctrlKey && !event.metaKey;
            const shiftMatch = shortcut.shift ? event.shiftKey : !event.shiftKey;
            const altMatch = shortcut.alt ? event.altKey : !event.altKey;
            const keyMatch = event.key.toLowerCase() === shortcut.key.toLowerCase();

            if (ctrlMatch && shiftMatch && altMatch && keyMatch) {
                event.preventDefault();
                shortcut.action();
                return;
            }
        }
    }, [shortcuts]);

    useEffect(() => {
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);
};

export const KEYBOARD_SHORTCUTS = {
    RUN_SIMULATION: { key: 'Enter', ctrl: true, description: 'Run Simulation' },
    SAVE_PROJECT: { key: 's', ctrl: true, description: 'Save Project' },
    OPEN_PROJECT: { key: 'o', ctrl: true, description: 'Open Project' },
    EXPORT_JSON: { key: 'e', ctrl: true, description: 'Export as JSON' },
    DELETE_SELECTED: { key: 'Delete', description: 'Delete Selected' },
    DESELECT: { key: 'Escape', description: 'Deselect All' },
    TOGGLE_PANEL: { key: 'p', ctrl: true, description: 'Toggle Properties Panel' },
    FIT_VIEW: { key: 'f', ctrl: true, description: 'Fit View' },
    ZOOM_IN: { key: '+', ctrl: true, description: 'Zoom In' },
    ZOOM_OUT: { key: '-', ctrl: true, description: 'Zoom Out' },
};

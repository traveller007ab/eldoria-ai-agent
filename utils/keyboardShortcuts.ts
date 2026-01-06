/**
 * Shared Utilities - Keyboard Shortcuts
 * Centralized keyboard shortcut management
 */

import React from 'react';

export interface KeyboardShortcut {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
  description: string;
  handler: (event: KeyboardEvent) => void;
}

interface ShortcutKey {
  key: string;
  ctrl?: boolean;
  shift?: boolean;
  alt?: boolean;
  meta?: boolean;
}

export interface KeyboardShortcutConfig {
  shortcuts: KeyboardShortcut[];
  enabled?: boolean;
  preventDefault?: boolean;
}

class KeyboardShortcutManager {
  private shortcuts: Map<string, KeyboardShortcut> = new Map();
  private enabled: boolean = true;
  private preventDefault: boolean = true;
  
  constructor(config: KeyboardShortcutConfig) {
    this.shortcuts.clear();
    this.enabled = config.enabled ?? true;
    this.preventDefault = config.preventDefault ?? true;
    
    config.shortcuts.forEach(shortcut => {
      const key = this.getShortcutKey(shortcut);
      this.shortcuts.set(key, shortcut);
    });
    
    this.bindEvents();
  }
  
  private getShortcutKey(shortcut: ShortcutKey): string {
    const parts = [];
    if (shortcut.ctrl) parts.push('ctrl');
    if (shortcut.shift) parts.push('shift');
    if (shortcut.alt) parts.push('alt');
    if (shortcut.meta) parts.push('meta');
    parts.push(shortcut.key.toLowerCase());
    return parts.join('+');
  }
  
  private bindEvents(): void {
    document.addEventListener('keydown', this.handleKeyDown);
  }
  
  private unbindEvents(): void {
    document.removeEventListener('keydown', this.handleKeyDown);
  }
  
  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.enabled) return;
    
    // Ignore if typing in input, textarea, or contenteditable
    const target = event.target as HTMLElement;
    if (
      target.tagName === 'INPUT' ||
      target.tagName === 'TEXTAREA' ||
      target.isContentEditable
    ) {
      return;
    }
    
    const key = this.getShortcutKey({
      key: event.key,
      ctrl: event.ctrlKey,
      shift: event.shiftKey,
      alt: event.altKey,
      meta: event.metaKey
    } as ShortcutKey);
    
    const shortcut = this.shortcuts.get(key);
    if (shortcut) {
      if (this.preventDefault) {
        event.preventDefault();
      }
      shortcut.handler(event);
    }
  };
  
  public addShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.set(key, shortcut);
  }
  
  public removeShortcut(shortcut: KeyboardShortcut): void {
    const key = this.getShortcutKey(shortcut);
    this.shortcuts.delete(key);
  }
  
  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
  
  public destroy(): void {
    this.unbindEvents();
    this.shortcuts.clear();
  }
}

export function useKeyboardShortcuts(
  shortcuts: KeyboardShortcut[],
  enabled = true
): KeyboardShortcutManager {
  const managerRef = React.useRef<KeyboardShortcutManager | null>(null);
  
  React.useEffect(() => {
    const manager = new KeyboardShortcutManager({
      shortcuts,
      enabled,
    });
    managerRef.current = manager;
    
    return () => {
      manager.destroy();
    };
  }, [shortcuts, enabled]);
  
  return managerRef.current as KeyboardShortcutManager;
}

// Helper to check if a key event matches a shortcut
export function matchesShortcut(
  event: KeyboardEvent,
  shortcut: KeyboardShortcut
): boolean {
  return (
    event.key.toLowerCase() === shortcut.key.toLowerCase() &&
    !!event.ctrlKey === !!shortcut.ctrl &&
    !!event.shiftKey === !!shortcut.shift &&
    !!event.altKey === !!shortcut.alt &&
    !!event.metaKey === !!shortcut.meta
  );
}

// Format shortcut for display (e.g., "Ctrl+S")
export function formatShortcut(shortcut: ShortcutKey): string {
  const parts: string[] = [];
  if (shortcut.ctrl) parts.push('Ctrl');
  if (shortcut.shift) parts.push('Shift');
  if (shortcut.alt) parts.push('Alt');
  if (shortcut.meta) parts.push('Meta');
  parts.push(shortcut.key);
  return parts.join('+');
}

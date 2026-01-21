import { create } from 'zustand';
import { v4 as uuidv4 } from 'uuid';

export interface BrowserTab {
    id: string;
    url: string;
    title: string;
    favicon?: string;
    isLoading: boolean;
    history: string[];
    historyIndex: number;
    isPinned: boolean;
}

export type SearchEngine = 'google' | 'duckduckgo' | 'bing' | 'brave' | 'perplexity';

interface BrowserState {
    tabs: BrowserTab[];
    activeTabId: string | null;
    searchEngine: SearchEngine;

    // Actions
    addTab: (url?: string) => void;
    closeTab: (id: string) => void;
    setActiveTab: (id: string) => void;
    updateTab: (id: string, data: Partial<BrowserTab>) => void;
    setSearchEngine: (engine: SearchEngine) => void;

    // Navigation State Updates
    navigateTab: (id: string, url: string) => void;
    goBack: (id: string) => string | null; // Returns new URL
    goForward: (id: string) => string | null; // Returns new URL
    setLoading: (id: string, isLoading: boolean) => void;
    reorderTabs: (newOrder: BrowserTab[]) => void;
    pinTab: (id: string) => void;
    unpinTab: (id: string) => void;
    moveTab: (tabId: string, newIndex: number) => void;
    canGoBack: (id: string) => boolean;
    canGoForward: (id: string) => boolean;
}

export const useBrowserStore = create<BrowserState>((set, get) => ({
    tabs: [],
    activeTabId: null,
    searchEngine: 'google',

    setSearchEngine: (engine) => set({ searchEngine: engine }),

    addTab: (url = 'about:blank') => {
        const newTab: BrowserTab = {
            id: uuidv4(),
            url,
            title: 'New Tab',
            isLoading: false,
            history: [url],
            historyIndex: 0,
            isPinned: false,
        };

        set((state) => {
            // If it's the first tab, make it active
            const newTabs = [...state.tabs, newTab];
            return {
                tabs: newTabs,
                activeTabId: newTabs.length === 1 ? newTab.id : state.activeTabId
            };
        });

        // Auto-switch to new tab if it was an explicit add action (optional, usually UX preference)
        set({ activeTabId: newTab.id });
    },

    closeTab: (id) => {
        set((state) => {
            const tabIndex = state.tabs.findIndex((t) => t.id === id);
            const newTabs = state.tabs.filter((t) => t.id !== id);

            let newActiveId = state.activeTabId;

            // If we closed the active tab, switch to a neighbor
            if (id === state.activeTabId) {
                if (newTabs.length === 0) {
                    newActiveId = null;
                } else {
                    // Try to go to the left, else the right (which shifts to the same index)
                    const newIdx = Math.max(0, tabIndex - 1);
                    newActiveId = newTabs[newIdx].id;
                }
            }

            return { tabs: newTabs, activeTabId: newActiveId };
        });
    },

    setActiveTab: (id) => set({ activeTabId: id }),

    updateTab: (id, data) => {
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, ...data } : t)),
        }));
    },

    navigateTab: (id, url) => {
        set((state) => ({
            tabs: state.tabs.map((t) => {
                if (t.id !== id) return t;

                // Truncate future history if we were in the middle
                const newHistory = t.history.slice(0, t.historyIndex + 1);
                newHistory.push(url);

                return {
                    ...t,
                    url,
                    history: newHistory,
                    historyIndex: newHistory.length - 1,
                    isLoading: true, // Auto-set loading on nav
                };
            }),
        }));
    },

    goBack: (id) => {
        let newUrl: string | null = null;
        set((state) => ({
            tabs: state.tabs.map((t) => {
                if (t.id !== id || t.historyIndex <= 0) return t;

                const newIndex = t.historyIndex - 1;
                newUrl = t.history[newIndex];
                return {
                    ...t,
                    url: newUrl,
                    historyIndex: newIndex,
                    isLoading: true
                };
            }),
        }));
        return newUrl;
    },

    goForward: (id) => {
        let newUrl: string | null = null;
        set((state) => ({
            tabs: state.tabs.map((t) => {
                if (t.id !== id || t.historyIndex >= t.history.length - 1) return t;

                const newIndex = t.historyIndex + 1;
                newUrl = t.history[newIndex];
                return {
                    ...t,
                    url: newUrl,
                    historyIndex: newIndex,
                    isLoading: true
                };
            }),
        }));
        return newUrl;
    },

    setLoading: (id, isLoading) => {
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, isLoading } : t)),
        }));
    },

    reorderTabs: (newOrder) => set({ tabs: newOrder }),

    pinTab: (id) => {
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, isPinned: true } : t)),
        }));
    },

    unpinTab: (id) => {
        set((state) => ({
            tabs: state.tabs.map((t) => (t.id === id ? { ...t, isPinned: false } : t)),
        }));
    },

    moveTab: (tabId, newIndex) => {
        set((state) => {
            const tabs = [...state.tabs];
            const oldIndex = tabs.findIndex(t => t.id === tabId);
            if (oldIndex === -1) return state;

            const [removed] = tabs.splice(oldIndex, 1);
            tabs.splice(newIndex, 0, removed);
            return { tabs };
        });
    },

    canGoBack: (id) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === id);
        return tab ? tab.historyIndex > 0 : false;
    },

    canGoForward: (id) => {
        const state = get();
        const tab = state.tabs.find(t => t.id === id);
        return tab ? tab.historyIndex < tab.history.length - 1 : false;
    },
}));

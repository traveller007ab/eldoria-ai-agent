import { PageMetadata } from '../../components/observatory/WebFrame';

export interface BrowserState {
  currentUrl: string;
  currentTitle: string;
  currentMetadata: PageMetadata | null;
  isLoading: boolean;
  canGoBack: boolean;
  canGoForward: boolean;
  scrollPercent: number;
  selectedText: string;
}

export interface HistoryEntry {
  url: string;
  title: string;
  metadata: PageMetadata | null;
  timestamp: number;
  scrollPercent: number;
}

export interface Bookmark {
  id: string;
  url: string;
  title: string;
  favicon?: string;
  tags: string[];
  createdAt: number;
  notes?: string;
}

type StateListener = (state: BrowserState) => void;

class BrowserService {
  private state: BrowserState = {
    currentUrl: '',
    currentTitle: 'New Tab',
    currentMetadata: null,
    isLoading: false,
    canGoBack: false,
    canGoForward: false,
    scrollPercent: 0,
    selectedText: '',
  };

  private history: HistoryEntry[] = [];
  private historyIndex: number = -1;
  private listeners: Set<StateListener> = new Set();
  private bookmarks: Bookmark[] = [];

  private readonly MAX_HISTORY = 100;
  private readonly STORAGE_KEY_HISTORY = 'eldoria_browser_history';
  private readonly STORAGE_KEY_BOOKMARKS = 'eldoria_browser_bookmarks';

  constructor() {
    this.loadPersistedData();
  }

  navigate(url: string): void {
    if (!url || url.trim() === '') return;

    let normalized = url.trim();
    if (!normalized.startsWith('http')) {
      if (normalized.includes('.') && !normalized.includes(' ')) {
        normalized = `https://${normalized}`;
      } else {
        normalized = `https://www.google.com/search?q=${encodeURIComponent(normalized)}`;
      }
    }

    if (this.historyIndex < this.history.length - 1) {
      this.history = this.history.slice(0, this.historyIndex + 1);
    }

    const entry: HistoryEntry = {
      url: normalized,
      title: 'Loading...',
      metadata: null,
      timestamp: Date.now(),
      scrollPercent: 0,
    };

    this.history.push(entry);
    this.historyIndex++;

    if (this.history.length > this.MAX_HISTORY) {
      this.history.shift();
      this.historyIndex--;
    }

    this.updateState({
      currentUrl: normalized,
      currentTitle: 'Loading...',
      isLoading: true,
      canGoBack: this.historyIndex > 0,
      canGoForward: false,
    });

    this.persistHistory();
  }

  goBack(): boolean {
    if (!this.canGoBack()) return false;

    this.historyIndex--;
    const entry = this.history[this.historyIndex];

    this.updateState({
      currentUrl: entry.url,
      currentTitle: entry.title,
      currentMetadata: entry.metadata,
      isLoading: true,
      canGoBack: this.historyIndex > 0,
      canGoForward: true,
      scrollPercent: entry.scrollPercent,
    });

    return true;
  }

  goForward(): boolean {
    if (!this.canGoForward()) return false;

    this.historyIndex++;
    const entry = this.history[this.historyIndex];

    this.updateState({
      currentUrl: entry.url,
      currentTitle: entry.title,
      currentMetadata: entry.metadata,
      isLoading: true,
      canGoBack: true,
      canGoForward: this.historyIndex < this.history.length - 1,
      scrollPercent: entry.scrollPercent,
    });

    return true;
  }

  reload(): void {
    this.updateState({ isLoading: true });
  }

  updateMetadata(metadata: PageMetadata): void {
    this.updateState({
      currentTitle: metadata.title,
      currentMetadata: metadata,
      isLoading: false,
    });

    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      this.history[this.historyIndex].title = metadata.title;
      this.history[this.historyIndex].metadata = metadata;
      this.persistHistory();
    }
  }

  updateScroll(percent: number): void {
    this.updateState({ scrollPercent: percent });

    if (this.historyIndex >= 0 && this.historyIndex < this.history.length) {
      this.history[this.historyIndex].scrollPercent = percent;
    }
  }

  updateSelection(text: string): void {
    this.updateState({ selectedText: text });
  }

  setLoading(loading: boolean): void {
    this.updateState({ isLoading: loading });
  }

  addBookmark(url?: string, title?: string, tags: string[] = []): Bookmark {
    const bookmark: Bookmark = {
      id: `bookmark_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
      url: url || this.state.currentUrl,
      title: title || this.state.currentTitle,
      favicon: this.state.currentMetadata?.ogImage,
      tags,
      createdAt: Date.now(),
    };

    this.bookmarks.push(bookmark);
    this.persistBookmarks();

    return bookmark;
  }

  removeBookmark(id: string): boolean {
    const index = this.bookmarks.findIndex(b => b.id === id);
    if (index === -1) return false;

    this.bookmarks.splice(index, 1);
    this.persistBookmarks();
    return true;
  }

  isBookmarked(url?: string): boolean {
    const targetUrl = url || this.state.currentUrl;
    return this.bookmarks.some(b => b.url === targetUrl);
  }

  getBookmarks(): Bookmark[] {
    return [...this.bookmarks];
  }

  searchBookmarks(query: string): Bookmark[] {
    const q = query.toLowerCase();
    return this.bookmarks.filter(b =>
      b.title.toLowerCase().includes(q) ||
      b.url.toLowerCase().includes(q) ||
      b.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  getHistory(): HistoryEntry[] {
    return [...this.history];
  }

  clearHistory(): void {
    this.history = [];
    this.historyIndex = -1;
    this.updateState({
      canGoBack: false,
      canGoForward: false,
    });
    this.persistHistory();
  }

  searchHistory(query: string): HistoryEntry[] {
    const q = query.toLowerCase();
    return this.history.filter(h =>
      h.title.toLowerCase().includes(q) ||
      h.url.toLowerCase().includes(q)
    );
  }

  getState(): BrowserState {
    return { ...this.state };
  }

  subscribe(listener: StateListener): () => void {
    this.listeners.add(listener);
    listener(this.state);
    return () => {
      this.listeners.delete(listener);
    };
  }

  canGoBack(): boolean {
    return this.historyIndex > 0;
  }

  canGoForward(): boolean {
    return this.historyIndex < this.history.length - 1;
  }

  getAIContext(): string {
    if (!this.state.currentUrl) return '';

    let context = `ACTIVE BROWSER TAB: "${this.state.currentTitle}"\nURL: ${this.state.currentUrl}`;
    if (this.state.currentMetadata?.description) {
      context += `\nDESCRIPTION: ${this.state.currentMetadata.description}`;
    }

    if (this.state.selectedText) {
      context += `\nUSER SELECTED TEXT: "${this.state.selectedText}"`;
    }

    if (this.state.scrollPercent > 0) {
      context += `\nSCROLL POSITION: ${Math.round(this.state.scrollPercent)}%`;
    }

    return context;
  }

  private loadPersistedData(): void {
    try {
      const historyJson = localStorage.getItem(this.STORAGE_KEY_HISTORY);
      if (historyJson) {
        const data = JSON.parse(historyJson);
        this.history = data.history || [];
        this.historyIndex = data.index ?? -1;
      }

      const bookmarksJson = localStorage.getItem(this.STORAGE_KEY_BOOKMARKS);
      if (bookmarksJson) {
        this.bookmarks = JSON.parse(bookmarksJson);
      }
    } catch (error) {
      console.error('Failed to load browser data:', error);
    }
  }

  private persistHistory(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_HISTORY, JSON.stringify({
        history: this.history,
        index: this.historyIndex,
      }));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }

  private persistBookmarks(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY_BOOKMARKS, JSON.stringify(this.bookmarks));
    } catch (error) {
      console.error('Failed to save bookmarks:', error);
    }
  }

  private updateState(partial: Partial<BrowserState>): void {
    this.state = { ...this.state, ...partial };
    this.notifyListeners();
  }

  private notifyListeners(): void {
    for (const listener of this.listeners) {
      listener(this.state);
    }
  }
}

export const browserService = new BrowserService();

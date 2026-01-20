import { EventEmitter } from 'events';

export interface BrowserState {
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
}

export interface BrowserController extends EventEmitter {
    getState(): BrowserState;
    navigate(url: string): void;
    reload(): void;
    goBack(): void;
    goForward(): void;
    on(event: string, listener: (...args: any[]) => void): this;
    off(event: string, listener: (...args: any[]) => void): this;
}

class SharedBrowserController extends EventEmitter implements BrowserController {
    private state: BrowserState = {
        url: 'https://www.google.com',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
    };
    private subscribers: Set<(state: BrowserState) => void> = new Set();

    getState(): BrowserState {
        return { ...this.state };
    }

    navigate(url: string): void {
        this.state.url = url;
        this.state.title = 'Loading...';
        this.state.isLoading = true;
        this.emitChange();
    }

    reload(): void {
        this.state.isLoading = true;
        this.emitChange();
    }

    goBack(): void {
        this.emitChange();
    }

    goForward(): void {
        this.emitChange();
    }

    updateFromChild(update: Partial<BrowserState>): void {
        this.state = { ...this.state, ...update };
        this.emitChange();
    }

    private emitChange(): void {
        for (const sub of this.subscribers) {
            sub(this.state);
        }
        this.emit('change', this.state);
    }

    subscribe(callback: (state: BrowserState) => void): () => void {
        this.subscribers.add(callback);
        callback(this.state);
        return () => {
            this.subscribers.delete(callback);
        };
    }
}

export const sharedBrowser = new SharedBrowserController();

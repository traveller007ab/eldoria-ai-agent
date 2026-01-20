type Listener = (state: BrowserState) => void;

export interface BrowserState {
    url: string;
    title: string;
    isLoading: boolean;
    canGoBack: boolean;
    canGoForward: boolean;
}

class SharedBrowserController {
    private state: BrowserState = {
        url: 'https://www.google.com',
        title: 'New Tab',
        isLoading: false,
        canGoBack: false,
        canGoForward: false
    };
    private listeners: Set<Listener> = new Set();

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
        for (const listener of this.listeners) {
            listener(this.state);
        }
    }

    subscribe(listener: Listener): () => void {
        this.listeners.add(listener);
        listener(this.state);
        return () => {
            this.listeners.delete(listener);
        };
    }
}

export const sharedBrowser = new SharedBrowserController();

/**
 * Unified Bridge Client for Eldoria AI IDE
 * Targets Electron (IPC) and Capacitor/Web (Fetch)
 */

declare global {
    interface Window {
        eldoriaDesktop?: {
            executeCommand: (command: string) => Promise<{ success: boolean; output: string }>;
            openFolderDialog: () => Promise<string | null>;
            getAppVersion: () => Promise<string>;
            getBridgePort: () => Promise<number>;
            restartBridge: () => Promise<{ success: boolean }>;
            indexProject: (path?: string) => Promise<{ files: any[] }>;
            isElectron: boolean;
            platform: string;
        };
    }
}

export interface BridgeResult {
    output: string;
    error: string | null;
    success?: boolean;
}

const DEFAULT_BRIDGE_PORT = 3001;
const DEFAULT_BRIDGE_URL = `http://localhost:${DEFAULT_BRIDGE_PORT}`;

// Production Railway URL
const PRODUCTION_BRIDGE_URL = 'https://eldoria-ai-agent-production.up.railway.app';

// Detect if we're in production (Netlify or similar)
const isProduction = typeof window !== 'undefined' &&
    !window.eldoriaDesktop &&
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// Cache for the dynamic port in Electron
let cachedBridgeUrl: string | null = null;

export async function getBridgeUrl(): Promise<string> {
    if (cachedBridgeUrl) return cachedBridgeUrl;

    // Production web deployment - use Railway
    if (isProduction) {
        cachedBridgeUrl = PRODUCTION_BRIDGE_URL;
        return cachedBridgeUrl;
    }

    // Electron desktop app - get dynamic port
    if (window.eldoriaDesktop?.getBridgePort) {
        try {
            const port = await window.eldoriaDesktop.getBridgePort();
            cachedBridgeUrl = `http://localhost:${port}`;
            return cachedBridgeUrl;
        } catch (e) {
            console.warn('[BRIDGE] Failed to get dynamic port, falling back to default:', e);
        }
    }

    // Local development fallback
    return DEFAULT_BRIDGE_URL;
}

export const bridgeClient = {
    executeCommand: async (command: string): Promise<BridgeResult> => {
        // Electron Path
        if (window.eldoriaDesktop?.executeCommand) {
            const result = await window.eldoriaDesktop.executeCommand(command);
            return {
                output: result.output || '',
                error: result.success === false ? result.output : null,
                success: result.success
            };
        }

        // Capacitor/Web Fetch Fallback
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    command,
                    cwd: null // Optional: can be passed from caller
                })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { output: '', error: `Bridge error: ${errorText}`, success: false };
            }

            const data = await response.json();
            return {
                output: data.stdout || '',
                error: data.stderr || null,
                success: data.exitCode === 0
            };
        } catch (e: any) {
            return {
                output: '',
                error: `Local Bridge Unreachable. Ensure "python services/bridge.py" is running.`,
                success: false
            };
        }
    },

    openFolderDialog: async (): Promise<string | null> => {
        if (window.eldoriaDesktop?.openFolderDialog) {
            return await window.eldoriaDesktop.openFolderDialog();
        }
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/dialog/folder`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.path || null;
        } catch (e) {
            console.error('[BRIDGE] openFolderDialog failed:', e);
            return null;
        }
    },

    openFileDialog: async (): Promise<string | null> => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/dialog/file`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.path || null;
        } catch (e) {
            console.error('[BRIDGE] openFileDialog failed:', e);
            return null;
        }
    },

    getAppVersion: async (): Promise<string> => {
        if (window.eldoriaDesktop?.getAppVersion) {
            return await window.eldoriaDesktop.getAppVersion();
        }
        return '1.0.0-mobile';
    },

    getDefaultPath: async (): Promise<string | null> => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/system/default-path`);
            if (!response.ok) return null;
            const data = await response.json();
            return data.path || null;
        } catch (e) {
            console.error('[BRIDGE] getDefaultPath failed:', e);
            return null;
        }
    },


    isElectron: () => !!window.eldoriaDesktop?.isElectron,

    isMobile: () => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
    },

    archiveResearch: async (projectId: string, title: string, mapData: any, contributionLog: any = {}) => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/vault/archive`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    project_id: projectId,
                    title,
                    map_data: mapData,
                    contribution_log: contributionLog
                })
            });
            return await response.json();
        } catch (e) {
            console.error('Vault Archive failed:', e);
            return { success: false, error: 'Bridge unreachable' };
        }
    },

    listArchives: async (projectId: string) => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/vault/list/${projectId}`);
            return await response.json();
        } catch (e) {
            console.error('Vault List failed:', e);
            return { success: false, error: 'Bridge unreachable' };
        }
    },

    synthesizeThesis: async (projectId: string) => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/vault/synthesize`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ project_id: projectId })
            });
            return await response.json();
        } catch (e) {
            console.error('Thesis Synthesis failed:', e);
            return { success: false, error: 'Bridge unreachable' };
        }
    },

    checkBridgeHealth: async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 2000);

            const url = await getBridgeUrl();
            const response = await fetch(`${url}/health`, {
                signal: controller.signal
            });
            clearTimeout(id);
            return response.ok;
        } catch (e) {
            return false;
        }
    },

    restartBridge: async (): Promise<{ success: boolean }> => {
        // Desktop App: IPC Restart (More robust)
        if (window.eldoriaDesktop?.restartBridge) {
            return await window.eldoriaDesktop.restartBridge();
        }

        // Web/PWA: Soft Restart Endpoint
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/restart`, { method: 'POST' });
            return { success: response.ok };
        } catch (e) {
            console.error('[BRIDGE] restartBridge failed:', e);
            return { success: false };
        }
    },

    indexProject: async (path: string = "."): Promise<{ files: any[] }> => {
        if (window.eldoriaDesktop?.indexProject) {
            return await window.eldoriaDesktop.indexProject(path);
        }

        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/codebase/index?root=${encodeURIComponent(path)}`);
            if (!response.ok) return { files: [] };
            return await response.json();
        } catch (e) {
            console.error('[BRIDGE] indexProject failed:', e);
            return { files: [] };
        }
    }
};

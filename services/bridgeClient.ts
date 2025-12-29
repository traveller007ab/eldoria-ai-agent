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
            minimize: () => Promise<void>;
            maximize: () => Promise<void>;
            close: () => Promise<void>;
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

// Production Railway URL with Env Var override support
const PRODUCTION_BRIDGE_URL = ((import.meta as any).env && (import.meta as any).env.VITE_API_URL) || 'https://eldoria-ai-agent-production.up.railway.app';

// Detect if we're in production (Netlify or similar)
const isProduction = typeof window !== 'undefined' &&
    !window.eldoriaDesktop &&
    (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1');

// Cache for the dynamic port in Electron
let cachedBridgeUrl: string | null = null;

export async function getBridgeUrl(): Promise<string> {
    if (cachedBridgeUrl) {
        console.log('[BRIDGE] Using cached URL:', cachedBridgeUrl);
        return cachedBridgeUrl;
    }

    // 1. Env Var Override (Highest Priority - Works in Netlify/Vercel)
    const envUrl = (import.meta as any).env?.VITE_API_URL;
    if (envUrl && envUrl.trim() !== '') {
        console.log('[BRIDGE] Using configured VITE_API_URL:', envUrl);
        cachedBridgeUrl = envUrl.replace(/\/$/, ''); // Remove trailing slash
        return cachedBridgeUrl;
    }

    // 2. Production Environment (Netlify/Vercel) - Default Fallback
    if (isProduction) {
        console.log('[BRIDGE] Production detected, using default Railway URL');
        cachedBridgeUrl = 'https://eldoria-ai-agent-production.up.railway.app';
        return cachedBridgeUrl;
    }

    // 3. Electron desktop app - get dynamic port
    if (window.eldoriaDesktop?.getBridgePort) {
        try {
            const port = await window.eldoriaDesktop.getBridgePort();
            cachedBridgeUrl = `http://localhost:${port}`;
            console.log('[BRIDGE] Using Electron port:', cachedBridgeUrl);
            return cachedBridgeUrl;
        } catch (e) {
            console.warn('[BRIDGE] Failed to get dynamic port, falling back to default:', e);
        }
    }

    // 4. Local Development Default
    console.log('[BRIDGE] Using local default:', DEFAULT_BRIDGE_URL);
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

    synthesizeDirect: async (projectData: any): Promise<Blob | null> => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/vault/synthesize-direct`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(projectData)
            });
            if (!response.ok) return null;
            return await response.blob();
        } catch (e) {
            console.error('Direct Synthesis failed:', e);
            return null;
        }
    },

    exportToDocx: async (title: string, content: string): Promise<Blob | null> => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/vault/export-docx`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title, content })
            });
            if (!response.ok) return null;
            return await response.blob();
        } catch (e) {
            console.error('Word Export failed:', e);
            return null;
        }
    },

    checkBridgeHealth: async (): Promise<boolean> => {
        try {
            const controller = new AbortController();
            const id = setTimeout(() => controller.abort(), 10000); // Increased timeout for Railway

            const url = await getBridgeUrl();
            console.log('[BRIDGE] Health check URL:', url);
            
            const response = await fetch(`${url}/health`, {
                signal: controller.signal,
                method: 'GET',
                headers: {
                    'Accept': 'application/json',
                },
                mode: 'cors', // Explicit CORS mode
            });
            
            clearTimeout(id);
            
            if (!response.ok) {
                console.warn('[BRIDGE] Health check failed:', response.status, response.statusText);
                return false;
            }
            
            const data = await response.json();
            console.log('[BRIDGE] Health check OK:', data);
            return true;

        } catch (e: any) {
            console.error('[BRIDGE] Health check error:', e.message, e.name);
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
    },

    // ============ GENESIS ENGINE CLIENT ============

    genesisAnalyze: async (content: string, context: string = "general") => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/analyze/physics`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, context })
            });
            return await response.json();
        } catch (e) {
            console.error('Genesis Analysis failed:', e);
            return { success: false, message: 'Bridge Unreachable' };
        }
    },

    genesisSimulate: async (payload: any) => {
        try {
            const url = await getBridgeUrl();
            const response = await fetch(`${url}/simulation/run`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            if (!response.ok) {
                const err = await response.json();
                throw new Error(err.detail || "Simulation Failed");
            }
            return await response.json();
        } catch (e: any) {
            console.error('Genesis Simulation failed:', e);
            throw e;
        }
    },

    // Debug helper to see what URL is being used
    getCurrentBridgeUrl: async (): Promise<string> => {
        return await getBridgeUrl();
    }
};

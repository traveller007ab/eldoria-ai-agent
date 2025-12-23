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

const BRIDGE_URL = 'http://localhost:3001';

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
            const response = await fetch(`${BRIDGE_URL}/execute`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ command })
            });

            if (!response.ok) {
                const errorText = await response.text();
                return { output: '', error: `Bridge error: ${errorText}`, success: false };
            }

            const data = await response.json();
            return {
                output: data.output || '',
                error: data.error || null,
                success: true
            };
        } catch (e: any) {
            return {
                output: '',
                error: `Local Bridge Unreachable. Ensure "node services/bridge.js" is running.`,
                success: false
            };
        }
    },

    openFolderDialog: async (): Promise<string | null> => {
        if (window.eldoriaDesktop?.openFolderDialog) {
            return await window.eldoriaDesktop.openFolderDialog();
        }
        // Note: Android/iOS would use Capacitor Filesystem or native picker here
        console.warn('[BRIDGE] openFolderDialog not implemented for mobile/web');
        return null;
    },

    getAppVersion: async (): Promise<string> => {
        if (window.eldoriaDesktop?.getAppVersion) {
            return await window.eldoriaDesktop.getAppVersion();
        }
        return '1.0.0-mobile';
    },

    isElectron: () => !!window.eldoriaDesktop?.isElectron,

    isMobile: () => {
        const userAgent = navigator.userAgent || navigator.vendor || (window as any).opera;
        return /android|iphone|ipad|ipod/i.test(userAgent.toLowerCase());
    }
};

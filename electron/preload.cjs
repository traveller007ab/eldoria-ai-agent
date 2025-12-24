/**
 * Eldoria AI IDE - Electron Preload Script
 * 
 * Exposes secure IPC channels to the renderer process.
 * Uses contextBridge for safe communication between main and renderer.
 */

const { contextBridge, ipcRenderer } = require('electron');

// Expose Eldoria Bridge API to the renderer
contextBridge.exposeInMainWorld('eldoriaDesktop', {
    // Shell command execution (sandboxed)
    executeCommand: (command) => ipcRenderer.invoke('shell:execute', command),

    // Native dialog: Open folder
    openFolderDialog: () => ipcRenderer.invoke('dialog:openFolder'),

    // Get application version
    getAppVersion: () => ipcRenderer.invoke('app:getVersion'),

    // Get bridge server port
    getBridgePort: () => ipcRenderer.invoke('bridge:getPort'),

    // Restart bridge server
    restartBridge: () => ipcRenderer.invoke('bridge:restart'),

    // Platform info
    platform: process.platform,

    // Check if running in Electron
    isElectron: true
});

console.log('[Eldoria Preload] Desktop bridge initialized');

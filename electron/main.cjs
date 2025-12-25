/**
 * Eldoria AI IDE - Electron Main Process
 * 
 * Features:
 * - Strict security: contextIsolation, sandbox, no nodeIntegration
 * - Embedded bridge server for offline capability
 * - Optimized window configuration for holographic UI
 */

const { app, BrowserWindow, ipcMain, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
const path = require('path');
const { spawn, exec } = require('child_process');
const http = require('http');
const url = require('url');

// Environment detection
const isDev = process.env.NODE_ENV === 'development' || !app.isPackaged;
const VITE_DEV_SERVER_URL = 'http://localhost:5173';

// Bridge server configuration
let bridgeServer = null;
let bridgePort = 3001;

// Security: Allowed commands for shell execution
const ALLOWED_COMMANDS = [
    'echo', 'type', 'dir', 'ls', 'cat', 'pwd', 'cd', 'mkdir',
    'node', 'npm', 'python', 'pip', 'powershell', 'Get-ChildItem'
];

/**
 * Start the embedded bridge server
 */
function startEmbeddedBridge() {
    try {
        const bridgePath = path.join(__dirname, '..', 'services', 'bridge.py');
        bridgeServer = spawn('python', [bridgePath], {
            cwd: path.join(__dirname, '..'),
            env: { ...process.env, PORT: bridgePort.toString() },
            stdio: 'inherit'
        });

        bridgeServer.on('error', (err) => {
            console.error('[Eldoria Main] Bridge server error:', err);
        });

        bridgeServer.on('close', (code) => {
            console.log(`[Eldoria Main] Bridge server exited with code ${code}`);
        });

        console.log(`[Eldoria Main] Bridge server started on port ${bridgePort}`);
    } catch (error) {
        console.error('[Eldoria Main] Failed to start bridge server:', error);
    }
}

/**
 * Create the main application window
 */
function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1600,
        height: 900,
        minWidth: 1200,
        minHeight: 700,
        backgroundColor: '#0a0a0f',
        titleBarStyle: 'hiddenInset',
        show: false, // Show after ready-to-show
        icon: path.join(__dirname, 'assets', 'icon.png'),
        webPreferences: {
            preload: path.join(__dirname, 'preload.cjs'),
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
            webSecurity: true,
            allowRunningInsecureContent: false
        }
    });

    // Graceful show after content loads
    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
        if (isDev) {
            mainWindow.webContents.openDevTools();
        }
    });

    // Load the app
    if (isDev) {
        mainWindow.loadURL(VITE_DEV_SERVER_URL);
    } else {
        mainWindow.loadFile(path.join(__dirname, '..', 'dist', 'index.html'));
    }

    // Handle external links
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        shell.openExternal(url);
        return { action: 'deny' };
    });

    return mainWindow;
}

/**
 * IPC Handlers for secure renderer communication
 */
function setupIpcHandlers() {
    // Shell command execution with allow-list
    ipcMain.handle('shell:execute', async (event, command) => {
        return new Promise((resolve, reject) => {
            // Security check: Validate against allowed commands
            const cmdBase = command.split(/\s+/)[0].toLowerCase();
            const isAllowed = ALLOWED_COMMANDS.some(allowed =>
                cmdBase.includes(allowed.toLowerCase())
            );

            if (!isAllowed) {
                resolve({ success: false, output: `Command not permitted: ${cmdBase}` });
                return;
            }

            exec(command, { cwd: path.join(__dirname, '..') }, (error, stdout, stderr) => {
                if (error) {
                    resolve({ success: false, output: stderr || error.message });
                } else {
                    resolve({ success: true, output: stdout });
                }
            });
        });
    });

    // Native folder picker
    ipcMain.handle('dialog:openFolder', async () => {
        const result = await dialog.showOpenDialog({
            properties: ['openDirectory']
        });
        return result.filePaths[0] || null;
    });

    // App version
    ipcMain.handle('app:getVersion', () => {
        return app.getVersion();
    });

    // Bridge port info
    ipcMain.handle('bridge:getPort', () => {
        return bridgePort;
    });

    // Bridge restart
    ipcMain.handle('bridge:restart', async () => {
        console.log('[Eldoria Main] Manual bridge restart requested...');
        if (bridgeServer) {
            bridgeServer.kill();
        }
        startEmbeddedBridge();
        return { success: true };
    });

    // Project Indexing via Main Process (Proxy to Python)
    ipcMain.handle('bridge:indexProject', async (event, rootPath) => {
        // In the desktop app, we default to the CWD or a specific project path
        // For now, let's allow it to pass through to the Python bridge URL manually
        // OR better yet, let the renderer do the fetching if it knows the port.
        // BUT, bridgeClient prefers IPC if available.
        // So we must act as a proxy or execute the python script directly.

        // Simpler approach: return the Current Working Directory so the renderer knows where it is
        // and can then call the bridge URL with the correct absolute path.
        // However, bridgeClient.indexProject EXPECTS the actual file list if it calls IPC.

        // Let's implement a direct fetch here to the local bridge to ensure we bypass ANY renderer CORS/network issues
        // and return the data cleanly.
        try {
            const fetch = (await import('node-fetch')).default;
            const targetUrl = `http://localhost:${bridgePort}/codebase/index?root=${encodeURIComponent(rootPath || process.cwd())}`;
            const response = await fetch(targetUrl);
            if (!response.ok) return { files: [] };
            return await response.json();
        } catch (e) {
            console.error('[Eldoria Main] Indexing proxy failed:', e);
            return { files: [] };
        }
    });
    // Window Controls
    ipcMain.handle('window:minimize', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) win.minimize();
    });

    ipcMain.handle('window:maximize', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) {
            if (win.isMaximized()) {
                win.unmaximize();
            } else {
                win.maximize();
            }
        }
    });

    ipcMain.handle('window:close', () => {
        const win = BrowserWindow.getFocusedWindow();
        if (win) win.close();
    });
}

// App lifecycle
app.whenReady().then(() => {
    setupIpcHandlers();
    startEmbeddedBridge();
    createWindow();

    // Auto-update: Check for updates (only in production)
    if (!isDev) {
        autoUpdater.checkForUpdatesAndNotify();

        autoUpdater.on('update-available', () => {
            console.log('[Eldoria Updater] Update available, downloading...');
        });

        autoUpdater.on('update-downloaded', () => {
            console.log('[Eldoria Updater] Update downloaded. Will install on restart.');
        });

        autoUpdater.on('error', (err) => {
            console.error('[Eldoria Updater] Error checking for updates:', err);
        });
    }

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    // Kill bridge server on exit
    if (bridgeServer) {
        bridgeServer.kill();
    }

    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Security: Prevent new window creation
app.on('web-contents-created', (event, contents) => {
    contents.on('will-navigate', (event, url) => {
        if (!url.startsWith(VITE_DEV_SERVER_URL) && !url.startsWith('file://')) {
            event.preventDefault();
        }
    });
});

console.log('[Eldoria Main] Electron process initialized');

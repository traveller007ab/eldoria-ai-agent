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
        const bridgePath = path.join(__dirname, '..', 'services', 'bridge.js');
        bridgeServer = spawn('node', [bridgePath], {
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

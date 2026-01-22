# Desktop Browser (PyQt5)

Eldoria includes a full-featured desktop browser built with PyQt5 and QtWebEngine (Chromium-based). This browser is available as a companion to the PWA browser for sites that require full browser capabilities.

## Installation

### Prerequisites

- Python 3.8 or higher
- pip (Python package manager)

### Install Dependencies

```bash
pip install -r requirements-browser.txt
```

This installs:
- `PyQt5>=5.15.0` - Qt GUI framework
- `PyQtWebEngine>=5.15.0` - Chromium-based web engine

### Platform-Specific Notes

#### Windows
```bash
pip install PyQt5 PyQtWebEngine
```

#### macOS
```bash
pip install PyQt5 PyQtWebEngine
```
Note: You may need to install Qt via Homebrew first:
```bash
brew install qt@5
export PATH="/usr/local/opt/qt@5/bin:$PATH"
pip install PyQt5 PyQtWebEngine
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt-get install python3-pyqt5 python3-pyqt5.qtwebengine
```
or via pip:
```bash
pip install PyQt5 PyQtWebEngine
```

## Usage

### Standalone Mode

Launch the browser directly:

```bash
python browser/main.py
```

### From Electron Desktop App

The desktop browser is integrated with the Electron app. Click the "Open in Desktop Browser" button in the browser toolbar to launch it with the current page.

### From PWA

When running the PWA with the bridge server active, click the monitor icon in the browser toolbar to open the current page in the desktop browser.

## Features

- **Tabbed browsing** - Multiple tabs with drag-and-drop reordering
- **Navigation controls** - Back, forward, reload, stop
- **Address bar** - Smart URL detection and search
- **Progress bar** - Shows page load progress
- **JavaScript injection** - Enable/disable JavaScript
- **Text extraction** - Extract text from web pages
- **IPC communication** - Communicate with the main PWA app

## IPC Commands

The browser listens on port 19876 for JSON commands:

```json
// Navigate to URL
{"type": "navigate", "url": "https://example.com"}

// Open in new tab
{"type": "open_tab", "url": "https://example.com"}

// Get current URL
{"type": "get_url"}

// Close browser
{"type": "close"}
```

## Troubleshooting

### Qt Platform Plugin Error

If you see "This application failed to start because no Qt platform plugin could be initialized":

```bash
# Windows
pip install pyqt5-plugins

# Linux
sudo apt-get install python3-pyqt5.qtplugins
```

### WebEngine Process Crashed

If pages fail to load with "Render process crashed":

1. Try disabling hardware acceleration:
   ```python
   # In eldoria_browser.py, add before creating QApplication:
   from PyQt5.QtCore import Qt
   Qt.AA_DisableHighDpiScaling
   ```

2. Or update QtWebEngine:
   ```bash
   pip install --upgrade PyQtWebEngine
   ```

### Port Already in Use

If port 19876 is already in use, modify the `IPC_PORT` in `browser/main.py`:

```python
IPC_PORT = 19877  # Change to unused port
```

### Blank Pages

If pages appear blank:

1. Check if JavaScript is disabled
2. Verify network connectivity
3. Check console for errors:
   ```python
   # Enable debug logging
   import logging
   logging.basicConfig(level=logging.DEBUG)
   ```

## Architecture

```
browser/
├── __init__.py          # Package exports
├── main.py              # Application launcher + IPC server
└── eldoria_browser.py   # Main browser implementation
```

### Components

- **EldoriaBrowser** - Main window with tabbed interface
- **TabManager** - Handles tab creation/management
- **BrowserTab** - Individual tab with QWebEngineView
- **BrowserToolbar** - Navigation controls

## Integration with PWA

The desktop browser can be launched from the PWA in two ways:

### 1. Electron Desktop App
Uses IPC to spawn the PyQt5 process:
```javascript
// In electron/main.cjs
ipcMain.handle('browser:open', (event, url) => {
  startPyQtBrowser(url);
});
```

### 2. PWA with Bridge Server
Calls the bridge API endpoint:
```bash
POST /browser/launch
{"url": "https://example.com"}
```

## Performance

The PyQt5 browser uses ~100-200MB RAM per instance. Each tab adds ~20-50MB.

Cold start time: ~2-3 seconds
Page load: Similar to Chrome (uses same Chromium engine)

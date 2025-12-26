# Installation

Eldoria runs on multiple platforms. Choose the one that fits your workflow.

## Web App (Recommended)

The fastest way to use Eldoria — no installation required.

```
https://eldoria.netlify.app
```

::: tip PWA Installation
Click the **Install** prompt in your browser for an app-like experience with offline support.
:::

## Desktop App (Electron)

Full-featured desktop experience with local file access.

### Windows

1. Go to **Download Hub** in the app sidebar
2. Click **Download for Windows**
3. Run the installer (`Eldoria-Setup.exe`)
4. Launch from Start Menu or Desktop

### macOS / Linux

Desktop builds for macOS and Linux coming soon. Use the PWA for now.

## Python Bridge (For Full Features)

The Terminal and local file operations require the Python Bridge.

### Automatic (Bundled)

The Desktop app includes the bridge automatically.

### Manual Setup

```bash
# 1. Navigate to project folder
cd eldoria-ai-agent

# 2. Install Python dependencies
pip install -r requirements.txt

# 3. Start the bridge
python services/bridge.py
```

The bridge runs on `http://localhost:8000` by default.

::: warning Railway Deployment
For cloud deployments, the bridge runs on Railway. See [Deployment Guide](/guide/deployment) for configuration.
:::

## API Keys

Eldoria uses multiple AI providers. Configure in **Settings > API Keys**:

| Provider | Purpose | Get Key |
|----------|---------|---------|
| Groq | Primary AI (Llama 3.3) | [console.groq.com](https://console.groq.com) |
| Gemini | Fallback + Search | [aistudio.google.com](https://aistudio.google.com) |
| OpenRouter | Extended models | [openrouter.ai](https://openrouter.ai) |
| Tavily | Web search | [tavily.com](https://tavily.com) |

## Troubleshooting

### "Bridge Offline" in Status Bar

1. Ensure Python 3.9+ is installed
2. Run `pip install -r requirements.txt`
3. Start bridge: `python services/bridge.py`
4. Check port 8000 isn't blocked

### AI Not Responding

1. Verify API keys in Settings
2. Check your internet connection
3. Try a different AI provider (Groq → Gemini → OpenRouter)

### PWA Not Installing

1. Use Chrome, Edge, or Safari
2. Ensure HTTPS connection
3. Clear browser cache and retry

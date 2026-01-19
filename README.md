<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Eldoria AI Agent

> **Sentient Academic Co-Pilot** - An AI-powered IDE with physics simulation, academic research tools, and agentic capabilities.

## Quick Start

### Prerequisites
- Node.js 20+
- Python 3.11+ (for bridge service)

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/eldoria-ai-agent.git
cd eldoria-ai-agent

# Install frontend dependencies
npm install

# Install Python dependencies (for bridge)
pip install -r requirements.txt

# Configure environment variables
cp .env.local.example .env.local
# Edit .env.local and add your API keys
```

### Environment Variables

Create a `.env.local` file with the following keys:

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_API_KEY` | Google Gemini API Key | Yes* |
| `VITE_GROQ_API_KEY` | Groq API Key | Yes* |
| `VITE_OPENROUTER_API_KEY` | OpenRouter API Key | Optional |
| `VITE_TAVILY_API_KEY` | Tavily Search API Key | Optional |
| `VITE_WS_URL` | WebSocket URL for bridge | Optional |

*At least one AI provider key is required.

### Running the App

```bash
# Development mode (frontend only)
npm run dev

# Full stack (frontend + Python bridge)
npm run start

# Build for production
npm run build
```

## Features

- **🤖 AI Chat** - Powered by Gemini, Groq, and OpenRouter
- **🔬 SAF Lab** - Physics simulation for mechanical engineering
- **📚 Academic Hub** - Research and thesis management
- **🎨 Canvas Mode** - Visual node-based workspace
- **⚡ Agentic Mode** - Autonomous task execution

## Security Notes

- Never commit `.env.local` to version control
- All API keys should be rotated if exposed
- The bridge server uses CORS restrictions - add your production domain to `ALLOWED_ORIGINS` in `services/bridge.py`

## Documentation

See `README_COMPLETE.md` for comprehensive documentation.

## License

Private - All rights reserved.

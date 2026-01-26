# WARP.md

This file provides guidance to WARP (warp.dev) when working with code in this repository.

## Project Overview

Eldoria AI Agent is a multi-platform AI-powered IDE with physics simulation, academic research tools, and agentic capabilities. It runs as:
- **Web App (PWA)**: Vite + React frontend, deployed to Netlify
- **Desktop App**: Electron wrapper
- **Mobile**: Capacitor for Android/iOS

## Development Commands

```bash
# Install dependencies
npm install
pip install -r requirements.txt  # For Python bridge

# Development (frontend only)
npm run dev

# Full stack (frontend + Python bridge)
npm run start

# Production build
npm run build

# Electron development
npm run electron:dev

# Electron production build
npm run electron:build

# Run Python bridge separately
python services/bridge.py
```

## Testing

```bash
# Run Jest tests (physics/simulation tests)
npx jest

# Run a single test file
npx jest tests/ModelAnalyzer.test.ts

# Run TypeScript type checking
npx tsc --noEmit
```

Test files are in:
- `tests/` - Physics engine and model analysis tests
- `services/agentic/__tests__/` - Agentic mode tests

## Architecture

### Frontend (React + TypeScript)
- **Entry**: `index.tsx` → `App.tsx`
- **Routing**: React Router with routes for `/`, `/academic-hub`, `/saf-lab`, `/download-hub`
- **State Management**: Zustand stores in `stores/`
  - `useMechStore.ts` - Mechanical SAF Lab state (components, connections, simulation)
  - `useNexusStore.ts` - Canvas/mind map state (ReactFlow nodes/edges)
  - `browserStore.ts` - Browser/proxy state
  - `UnifiedWorkspaceStore.ts` - Workspace-level state

### Backend (Python FastAPI)
- **Entry**: `services/bridge.py` - Main FastAPI app running on port 3001
- **Key Routers**:
  - Academic/thesis vault: `services/academic_assistant/thesis_vault.py`
  - Simulation engine: `services/simulation/`
  - AI Architect: `services/architect.py`
  - Agent orchestrator: `services/agent_orchestrator.py`
- **API Proxies**: `/proxy/groq`, `/proxy/gemini`, `/proxy/openrouter`, `/proxy/tavily`

### Key Feature Areas
1. **SAF Lab** (`components/mech-saf-2.0/`): Physics simulation for mechanical engineering - pumps, heat exchangers, pipes, valves
2. **Academic Hub** (`academic-hub/`): Thesis management, APA compliance, citations, DOCX export
3. **Nexus Canvas** (`components/nexus/`): Visual node-based workspace using ReactFlow
4. **Agentic Mode** (`services/agentic/`): Background AI agents for research, writing coaching, deadlines

### Services Layer (`services/`)
- `UnifiedAIService.ts` - Abstraction over Gemini/Groq/OpenRouter
- `bridgeClient.ts` - Frontend client for Python bridge API
- `ContextService.ts` - Manages AI context from workspace state
- `ComponentRegistry.ts` - Registry for SAF Lab component types

## Environment Variables

Required in `.env.local`:
```
VITE_API_KEY=<Google Gemini API Key>      # At least one AI key required
VITE_GROQ_API_KEY=<Groq API Key>          # At least one AI key required
VITE_OPENROUTER_API_KEY=<OpenRouter Key>  # Optional
VITE_TAVILY_API_KEY=<Tavily Search Key>   # Optional for research
VITE_WS_URL=ws://localhost:3001           # WebSocket for bridge
```

For Python bridge (in Railway or local env):
```
GROQ_API_KEY, GEMINI_API_KEY, OPENROUTER_API_KEY, TAVILY_API_KEY
CONVEX_URL, CONVEX_ADMIN_KEY  # For database
JWT_SECRET                     # For auth
```

## Path Aliases

TypeScript uses `@/*` to reference project root:
```typescript
import { something } from '@/services/SomeService';
```

## Deployment

- **Frontend**: Netlify (see `netlify.toml`)
- **Backend**: Railway (FastAPI on port from `$PORT` env var)
- **Edge Functions**: `netlify/functions/` for browser proxy

## Key Conventions

- React components use `.tsx` extension
- Python uses type hints where possible
- State mutations go through Zustand store actions
- AI service calls should use `UnifiedAIService` or go through bridge proxies to avoid CORS
- Physics calculations in SAF Lab use mathjs for symbolic math

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Ctrl/Cmd + K` | Open Command Bar |
| `Alt + Shift + W` | Navigate to Workspace |
| `Alt + Shift + A` | Navigate to Academic Hub |
| `Escape` | Close modals / Command Bar |

## New Components (2026)

### CommandBar (`components/CommandBar.tsx`)
Unified command interface for Ask, Research, and Generate actions. Opens with `Ctrl+K`.
- Three modes: Search (cyan), Generate (purple), Research (emerald)
- Quick actions for common tasks
- Recent queries history
- Keyboard-first design

### SourceCards (`components/SourceCards.tsx`)
Beautiful, expandable source cards for displaying research citations.
- Favicon and domain detection
- Expandable details with actions (Open, Copy, Cite)
- Color-coded by source type (Wikipedia, GitHub, .edu, .gov, etc.)

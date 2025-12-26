# Deployment Guide

How to deploy Eldoria and its components.

## Frontend (Netlify)

The main Eldoria PWA is deployed on Netlify.

### Automatic Deployment

1. Push changes to GitHub `main` branch
2. Netlify auto-builds and deploys
3. Live at your Netlify URL

### Manual Deployment

```bash
npm run build
# Upload dist/ folder to Netlify
```

## Python Bridge (Railway)

The Python Bridge provides terminal access and local features.

### Railway Setup

1. Create new project on [railway.app](https://railway.app)
2. Connect your GitHub repository
3. Set start command: `python services/bridge.py`
4. Configure environment variables:
   - `PORT` (Railway sets automatically)
   - Any API keys needed

### Environment Variables

```
GROQ_API_KEY=your_key
GEMINI_API_KEY=your_key
```

## Documentation Site

This documentation site uses VitePress.

### Deploy to Netlify

1. Create new Netlify site
2. Set base directory: `docs`
3. Build command: `npm run build`
4. Publish directory: `docs/.vitepress/dist`

## Desktop App (Electron)

### Building for Distribution

```bash
npm run electron:build
```

This creates installers in the `release/` folder.

## Environment Configuration

### Production URLs

Update `config.ts` with your deployed URLs:

```typescript
export const BRIDGE_URL = 'https://your-bridge.railway.app';
```

### API Keys

Never commit API keys to git. Use:
- Environment variables on hosting platforms
- `.env` files locally (gitignored)

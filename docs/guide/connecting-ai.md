# Connecting AI

Eldoria uses multiple AI providers for resilience and flexibility.

## Supported Providers

| Provider | Model | Best For |
|----------|-------|----------|
| **Groq** | Llama 3.3 70B | Primary - Fast inference |
| **Gemini** | Gemini 2.0 Flash | Fallback + Grounding |
| **OpenRouter** | Multiple | Extended model access |

## Getting API Keys

### Groq (Recommended Primary)

1. Go to [console.groq.com](https://console.groq.com)
2. Sign up for a free account
3. Navigate to **API Keys**
4. Click **Create API Key**
5. Copy the key

### Google Gemini

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Sign in with Google account
3. Click **Get API Key**
4. Copy the generated key

### OpenRouter

1. Go to [openrouter.ai](https://openrouter.ai)
2. Create an account
3. Navigate to **API Keys**
4. Generate a new key

### Tavily (Web Search)

1. Go to [tavily.com](https://tavily.com)
2. Sign up for free tier
3. Get API key from dashboard

## Configuring in Eldoria

1. Click **Settings** (⚙️) in the sidebar
2. (Future) Navigate to API Keys section
3. Enter your keys for each provider

::: tip Current Configuration
API keys are currently configured via environment variables or the config file. Check `config.ts` in the project root.
:::

## Testing Connection

1. Open the Chat panel
2. Type "Hello, are you connected?"
3. If AI responds, you're set!

Check the **Status Bar** for:
- **"SAF Engine Active"** — AI is ready
- **"Sync Nominal"** — Database connected

## Fallback Chain

If the primary provider fails, Eldoria automatically tries:
1. Groq → 2. Gemini → 3. OpenRouter

You'll see status updates in the Status Bar during failover.

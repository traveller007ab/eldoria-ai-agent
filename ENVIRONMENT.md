# Eldoria AI Agent - Environment Configuration

# ============================================
# RAILWAY DEPLOYMENT VARIABLES
# ============================================

# --- Convex Database ---
CONVEX_URL=https://amicable-chinchilla-987.convex.cloud
CONVEX_ADMIN_KEY=dev:amicable-chinchilla-987|eyJ2MiI6IjIxYzg2MWUwNzhlNzQ2NTBiZDQ1ZmI0ZTliZjk1YzM1In0=

# --- Authentication ---
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN_DAYS=7

# --- AI Services (at least one required) ---
GROQ_API_KEY=gsk_xxxxxxxxxxxxxxxxxxxxxxxx
GEMINI_API_KEY=AIzaxxxxxxxxxxxxxxxxxxxxxxxx
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxxxxxxxxxxxxx

# --- Research/Web Search ---
TAVILY_API_KEY=tiv_xxxxxxxxxxxxxxxxxxxxxxxx

# --- Frontend ---
VITE_CONVEX_URL=https://amicable-chinchilla-987.convex.cloud
VITE_API_URL=https://eldoria-ai-agent-production.up.railway.app

# ============================================
# LOCAL DEVELOPMENT
# ============================================

# Copy this file to .env and fill in your keys
# npm run dev  # Starts frontend on localhost:5173
# python services/bridge.py  # Starts backend on localhost:3001

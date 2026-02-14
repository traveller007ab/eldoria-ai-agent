# API Key Management Guide

## Quick Overview

Your Eldoria AI IDE is designed to work in **demo mode** without API keys, but you can add real API keys at any time to enable full AI features. This guide shows you how.

---

## Current Status

### Check API Key Status

```bash
curl https://your-app.up.railway.app/admin/api-keys/status
```

**Response:**
```json
{
  "timestamp": "2026-02-14T10:30:00",
  "summary": {
    "total_providers": 4,
    "working_keys": 2,
    "missing_keys": 2,
    "all_configured": false
  },
  "providers": {
    "groq": {
      "status": "present",
      "message": "Key is present and format is valid (not tested)",
      "can_make_requests": true
    },
    "gemini": {
      "status": "present",
      "message": "Key is present and format is valid (not tested)",
      "can_make_requests": true
    },
    "openrouter": {
      "status": "missing",
      "message": "OPENROUTER_API_KEY not set",
      "can_make_requests": false
    },
    "tavily": {
      "status": "placeholder",
      "message": "Key appears to be a placeholder",
      "can_make_requests": false
    }
  }
}
```

---

## How to Add/Update API Keys

### Method 1: Railway Dashboard (Recommended)

**Step 1:** Go to Railway Dashboard
- Visit: https://railway.app/dashboard
- Log in to your account

**Step 2:** Select Your Project
- Click on your Eldoria AI Agent project

**Step 3:** Open Variables Tab
- Click on the "Variables" tab in the project menu

**Step 4:** Add Environment Variables

Click "New Variable" and add:

```
GROQ_API_KEY=gsk_your_actual_key_here
GEMINI_API_KEY=AIzaYourActualKeyHere
OPENROUTER_API_KEY=sk-or-your-actual-key
TAVILY_API_KEY=tvly-your-actual-key
```

**Step 5:** Deploy Changes
- Railway automatically detects variable changes
- Your service will restart automatically (takes ~30 seconds)

**Step 6:** Test the Keys

```bash
# Validate all keys with live API calls
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate

# Or validate a specific key
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/groq
```

---

### Method 2: Railway CLI

**Install Railway CLI:**
```bash
npm install -g @railway/cli
railway login
```

**Set Variables:**
```bash
# Navigate to your project directory
cd eldoria-ai-agent

# Set API keys
railway variables set GROQ_API_KEY=gsk_your_key
railway variables set GEMINI_API_KEY=AIzaYourKey

# Verify
railway variables
```

**Deploy:**
```bash
railway up
```

---

## Getting API Keys

### Groq (Recommended - Fast & Cheap)

1. Visit: https://console.groq.com/keys
2. Create account (free $5 credit)
3. Click "Create API Key"
4. Copy the key (starts with `gsk_`)
5. Cost: ~$0.10 per 1K tokens (very affordable)

### Google Gemini (Generous Free Tier)

1. Visit: https://makersuite.google.com/app/apikey
2. Sign in with Google
3. Click "Create API Key"
4. Copy the key (starts with `AIza`)
5. Cost: Free tier up to 60 requests/minute

### OpenRouter (Access to Claude/GPT-4)

1. Visit: https://openrouter.ai/keys
2. Create account
3. Add credits (minimum $5)
4. Create API key (starts with `sk-or-`)
5. Cost: Varies by model (~$0.03 per 1K tokens for Claude)

### Tavily (Research Search)

1. Visit: https://app.tavily.com/home
2. Sign up (free 1,000 requests/month)
3. Get API key (starts with `tvly-`)
4. Cost: Free tier 1K requests/month, then $0.025 per request

---

## Testing API Keys

### Check Status (Fast - No API Calls)

```bash
curl https://your-app.up.railway.app/admin/api-keys/status
```

This checks:
- ✅ Key is present in environment
- ✅ Key format is valid (correct prefix, length)
- ❌ Not a placeholder value

### Live Validation (Tests Actual API Calls)

```bash
# Test all keys
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate

# Test specific provider
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/groq
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/gemini
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/openrouter
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/tavily
```

**Response:**
```json
{
  "provider": "groq",
  "status": "valid",
  "message": "Key is valid and working",
  "can_make_requests": true,
  "last_validated": "2026-02-14T10:30:00",
  "details": {
    "response_time_ms": 245
  }
}
```

---

## Troubleshooting

### Key Shows as "Placeholder"

**Problem:** Key format detected as placeholder/demo value

**Solution:**
1. Get real API key from provider
2. Update in Railway dashboard
3. Wait for restart
4. Test again

### Key Shows as "Missing"

**Problem:** Environment variable not set

**Solution:**
```bash
# Check if variable exists
railway variables

# If missing, add it
railway variables set GROQ_API_KEY=your_key
```

### Key Validation Fails (401 Unauthorized)

**Problem:** Key is invalid or expired

**Solution:**
1. Go to provider dashboard
2. Check if key is active
3. Generate new key if needed
4. Update in Railway
5. Test again

### Demo Mode Won't Turn Off

**Problem:** App still in demo mode after adding keys

**Solution:**
1. Verify keys are saved in Railway
2. Check Railway logs for restart confirmation
3. Wait 30-60 seconds for restart
4. Test with: `curl /admin/api-keys/validate`
5. Clear cache: `curl -X POST /admin/api-keys/clear-cache`

---

## Cost Management

### Budget-Friendly Setup

**Recommended for $0-5/month:**
- ✅ **Groq**: Primary AI provider ($0.10/1K tokens)
- ✅ **Gemini**: Backup/secondary (free tier)
- ❌ **OpenRouter**: Skip unless needed (more expensive)
- ✅ **Tavily**: Research only when needed

**Rate Limits Protect You:**
- AI proxies: 3/minute (prevents runaway costs)
- Chat: 5/minute
- Research: 2/minute

**Estimated Costs:**
- Light usage (100 requests/day): ~$3/month
- Medium usage (500 requests/day): ~$15/month
- Heavy usage: Consider paid tier or caching

---

## Security Best Practices

### ✅ DO:
- Store keys in Railway environment variables
- Use separate keys for dev/staging/production
- Rotate keys every 90 days
- Monitor usage via provider dashboards
- Set up billing alerts

### ❌ DON'T:
- Never commit keys to git
- Never share keys in logs
- Never expose keys in frontend code
- Never use the same key for multiple apps

---

## Switching Back to Demo Mode

To disable AI features and use demo mode:

**Option 1: Remove Keys**
```bash
# In Railway dashboard
# Delete the API key variables
# Service will restart and use demo mode
```

**Option 2: Use Placeholder**
```bash
# Set to placeholder value
railway variables set GROQ_API_KEY=your_groq_api_key_here
```

**Verify:**
```bash
curl https://your-app.up.railway.app/health
# Should show: "demo_mode": true
```

---

## API Endpoints Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/admin/api-keys/status` | GET | Check key status (fast) |
| `/admin/api-keys/validate` | POST | Test all keys live |
| `/admin/api-keys/validate/{provider}` | POST | Test specific key |
| `/admin/api-keys/clear-cache` | POST | Clear validation cache |
| `/admin/api-keys/instructions` | GET | Get setup instructions |
| `/health` | GET | Check demo mode status |

---

## Quick Commands Cheatsheet

```bash
# Check current status
curl https://your-app.up.railway.app/admin/api-keys/status | jq

# Test all keys
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate | jq

# Test Groq specifically
curl -X POST https://your-app.up.railway.app/admin/api-keys/validate/groq | jq

# Clear cache
curl -X POST https://your-app.up.railway.app/admin/api-keys/clear-cache

# Get instructions
curl https://your-app.up.railway.app/admin/api-keys/instructions | jq
```

---

## Support

**Provider Dashboards:**
- Groq: https://console.groq.com/keys
- Gemini: https://makersuite.google.com/app/apikey
- OpenRouter: https://openrouter.ai/keys
- Tavily: https://app.tavily.com/home

**Railway Help:**
- Variables: https://docs.railway.app/develop/variables
- CLI: https://docs.railway.app/develop/cli

---

## Summary

✅ **Demo mode works without keys**  
✅ **Add keys anytime via Railway dashboard**  
✅ **Test keys with `/admin/api-keys/validate`**  
✅ **Rate limiting prevents cost overruns**  
✅ **Switch back to demo mode anytime**

**Your app is flexible - use demo mode for testing, add keys for production!** 🎉

import asyncio
import os
import sys

# Add project root to path
sys.path.append(os.getcwd())

from services.architect import router, get_templates
from fastapi.testclient import TestClient
from fastapi import FastAPI

app = FastAPI()
app.include_router(router)
client = TestClient(app)

print("--- GENESIS ARCHITECT VERIFICATION ---")

# 1. Test Template Loading
print("\n[TEST 1] Loading System Templates...")
try:
    response = client.get("/architect/templates")
    if response.status_code == 200:
        data = response.json()
        print("[SUCCESS]: Retrieved templates")
        for t in data["templates"]:
            print(f"   - {t['name']} ({t['domain']})")
    else:
        print(f"[FAILED]: Status {response.status_code}")
except Exception as e:
    print(f"[CRITICAL ERROR]: {e}")

# 2. Test LLM Configuration
print("\n[TEST 2] Checking LLM Connectivity...")
groq_key = os.environ.get("GROQ_API_KEY") or os.environ.get("VITE_GROQ_API_KEY")
openrouter_key = os.environ.get("OPENROUTER_API_KEY") or os.environ.get("VITE_OPENROUTER_API_KEY")

if groq_key:
    print(f"[DETECTED]: GROQ_API_KEY (Length: {len(groq_key)})")
elif openrouter_key:
    print(f"[DETECTED]: OPENROUTER_API_KEY (Length: {len(openrouter_key)})")
else:
    print("[WARNING]: No LLM API Keys found. The 'Generate' button will fail without keys.")

# 3. Test Router Mounting
print("\n[TEST 3] Verifying Endpoint Structure...")
routes = [route.path for route in app.routes]
if "/architect/generate" in routes:
     print("[SUCCESS]: /architect/generate endpoint is mounted")
else:
     print("[FAILED]: /architect/generate not found")

print("\n--- VERIFICATION COMPLETE ---")

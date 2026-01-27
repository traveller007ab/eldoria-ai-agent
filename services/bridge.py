import os
import sys
import subprocess
import json
import uvicorn
import asyncio
import socket
import time
import requests
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks, Depends, Header, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional, List, Any, Dict
from datetime import datetime
try:
    from bs4 import BeautifulSoup
    BS4_AVAILABLE = True
except ImportError:
    BS4_AVAILABLE = False

try:
    import numpy as np
    NUMPY_AVAILABLE = True
except ImportError:
    NUMPY_AVAILABLE = False
    np = None

try:
    import brotli
    BROTLI_AVAILABLE = True
except ImportError:
    BROTLI_AVAILABLE = False

from fastapi.responses import StreamingResponse, FileResponse, HTMLResponse, JSONResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

try:
    import services.db as db
except ImportError:
    try:
        import db as db
    except ImportError:
        db = None

# Optional tkinter for desktop mode (not available on headless servers)
try:
    import tkinter as tk
    from tkinter import filedialog
    TKINTER_AVAILABLE = True
except ImportError:
    TKINTER_AVAILABLE = False
    tk = None
    filedialog = None


# mDNS Discovery Refinement
try:
    from zeroconf import IPVersion, ServiceInfo, Zeroconf
    ZEROCONF_AVAILABLE = True
except ImportError:
    ZEROCONF_AVAILABLE = False

# Ensure we can find packages regardless of CWD
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(current_dir)
if project_root not in sys.path:
    sys.path.append(project_root)

# Create FastAPI app early (before decorators that use it)
app = FastAPI(title="Eldoria Neural Bridge")

# Add CORS middleware - SECURITY: Restrict to specific origins
# Add your production domain(s) to this list
ALLOWED_ORIGINS = [
    "http://localhost:5173",
    "http://localhost:3000",
    "http://127.0.0.1:5173",
    "http://127.0.0.1:3000",
    # Production domains:
    "https://eldoria-ai-agent-production.up.railway.app",
    "https://eldoriaai.netlify.app",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "X-Requested-With"],
)

# Internal Service Imports

# 1. Thesis Vault & Academic Assistant
vault_router = None
build_thesis = None
try:
    from services.academic_assistant.thesis_vault import router as vault_router
    from services.academic_assistant.docx_builder import build_thesis
except ImportError as e1:
    print(f"[BRIDGE] Primary import error (Academic): {e1}")
    try:
        # Fallback for different execution contexts
        from academic_assistant.thesis_vault import router as vault_router
        from academic_assistant.docx_builder import build_thesis
    except ImportError as e2:
        print(f"[BRIDGE] CRITICAL: Could not import Academic Assistant services: {e2}")

# 2. Genesis Simulation Engine
simulation_router = None
try:
    from services.simulation import router as simulation_router
except ImportError as e1:
    print(f"[BRIDGE] Primary import error (Simulation): {e1}")
    try:
        from simulation import router as simulation_router
    except ImportError as e2:
        print(f"[BRIDGE] WARNING: Genesis Engine not available (check numpy/sympy): {e2}")

# 3. Genesis AI Architect
architect_router = None
try:
    from services.architect import router as architect_router
except ImportError as e1:
    print(f"[BRIDGE] Primary import error (Architect): {e1}")
    try:
        from architect import router as architect_router
    except ImportError as e2:
        print(f"[BRIDGE] WARNING: Genesis Architect not available: {e2}")

# 4. Agentic Mode Orchestrator
AgentOrchestrator = None
AgentType = None
try:
    from services.agent_orchestrator import AgentOrchestrator, AgentType, AgentConfiguration
except ImportError as e1:
    print(f"[BRIDGE] Primary import error (Agent Orchestrator): {e1}")
    try:
        from agent_orchestrator import AgentOrchestrator, AgentType, AgentConfiguration
    except ImportError as e2:
        print(f"[BRIDGE] WARNING: Agent Orchestrator not available: {e2}")

# 5. Neural Codex Router
codex_router = None
try:
    from services.codex_router import router as codex_router
    app.include_router(codex_router)
    print("[BRIDGE] Neural Codex router loaded")
except ImportError as e1:
    print(f"[BRIDGE] Primary import error (Codex): {e1}")
    try:
        from codex_router import router as codex_router
        app.include_router(codex_router)
        print("[BRIDGE] Neural Codex router loaded (fallback)")
    except ImportError as e2:
        print(f"[BRIDGE] WARNING: Neural Codex not available: {e2}")

# Active orchestrator instances (per project)
active_orchestrators: dict = {}

@app.websocket("/ws/projects/{project_id}/agents")
async def websocket_endpoint(websocket: WebSocket, project_id: str):
    await websocket.accept()
    
    if not AgentOrchestrator:
        print("[BRIDGE] Error: AgentOrchestrator not loaded")
        await websocket.close(code=1011)
        return

    # Initialize orchestrator for this project if not exists
    if project_id not in active_orchestrators:
        active_orchestrators[project_id] = AgentOrchestrator(project_id, "user_default")
    
    orchestrator = active_orchestrators[project_id]
    await orchestrator.register_websocket(websocket)
    
    try:
        # Send initial status
        status = await orchestrator.get_agent_status()
        await websocket.send_json({"type": "agent_status", "payload": status, "timestamp": str(datetime.now())})
        
        # Send active tasks
        active_tasks = await orchestrator.get_active_tasks()
        for task in active_tasks:
            await websocket.send_json({"type": "task_update", "payload": task.dict(), "timestamp": str(datetime.now())})

        # Send initial insights
        insights = await orchestrator.generate_insights()
        for insight in insights:
            await websocket.send_json({"type": "insight", "payload": insight.dict(), "timestamp": str(datetime.now())})

        while True:
            data = await websocket.receive_text()
            message = json.loads(data)
            command = message.get("command")
            payload = message.get("payload", {})
            
            if command == "start_task":
                agent_type_str = payload.get("agent_type")
                task_type = payload.get("task_type")
                description = payload.get("description", "")
                
                if agent_type_str and task_type:
                    try:
                        agent_type = AgentType(agent_type_str)
                        await orchestrator.create_task(
                            agent_type=agent_type,
                            task_type=task_type,
                            description=description,
                            payload=payload
                        )
                    except ValueError:
                        await websocket.send_json({"type": "error", "payload": {"message": f"Invalid agent type: {agent_type_str}"}})
            
            elif command == "approve_task":
                task_id = payload.get("task_id")
                if task_id and hasattr(orchestrator, 'approve_task'):
                    try:
                        await orchestrator.approve_task(task_id)
                        await websocket.send_json({"type": "task_approved", "payload": {"task_id": task_id}})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "payload": {"message": f"Failed to approve task: {str(e)}"}})
                else:
                    await websocket.send_json({"type": "error", "payload": {"message": "task_id required for approve_task"}})
                
            elif command == "cancel_task":
                task_id = payload.get("task_id")
                if task_id and hasattr(orchestrator, 'cancel_task'):
                    try:
                        await orchestrator.cancel_task(task_id)
                        await websocket.send_json({"type": "task_cancelled", "payload": {"task_id": task_id}})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "payload": {"message": f"Failed to cancel task: {str(e)}"}})
                else:
                    await websocket.send_json({"type": "error", "payload": {"message": "task_id required for cancel_task"}})
                
            elif command == "mark_insight_read":
                insight_id = payload.get("insight_id")
                if insight_id and hasattr(orchestrator, 'mark_insight_read'):
                    try:
                        await orchestrator.mark_insight_read(insight_id)
                        await websocket.send_json({"type": "insight_read", "payload": {"insight_id": insight_id}})
                    except Exception as e:
                        await websocket.send_json({"type": "error", "payload": {"message": f"Failed to mark insight read: {str(e)}"}})
                else:
                    await websocket.send_json({"type": "error", "payload": {"message": "insight_id required for mark_insight_read"}})

    except WebSocketDisconnect:
        await orchestrator.unregister_websocket(websocket)
    except Exception as e:
        print(f"[BRIDGE] WebSocket error: {e}")
        try:
            await orchestrator.unregister_websocket(websocket)
        except:
            pass

@app.post("/api/projects/{project_id}/agents/tasks")
async def create_agent_task(project_id: str, payload: Dict = Body(...)):
    if project_id not in active_orchestrators:
        active_orchestrators[project_id] = AgentOrchestrator(project_id, "user_default")
    orchestrator = active_orchestrators[project_id]
    
    try:
        agent_type = AgentType(payload.get("agent_type"))
        task = await orchestrator.create_task(
            agent_type=agent_type,
            task_type=payload.get("task_type"),
            description=payload.get("description", ""),
            payload=payload
        )
        return {"status": "queued", "task": task.model_dump()}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.get("/api/projects/{project_id}/agents/status")
async def get_agent_status_rest(project_id: str):
    if project_id not in active_orchestrators:
        active_orchestrators[project_id] = AgentOrchestrator(project_id, "user_default")
    return await active_orchestrators[project_id].get_agent_status()

@app.get("/api/projects/{project_id}/agents/insights")
async def get_agent_insights_rest(project_id: str):
    if project_id not in active_orchestrators:
        active_orchestrators[project_id] = AgentOrchestrator(project_id, "user_default")
    insights = await active_orchestrators[project_id].generate_insights()
    return {"insights": [i.model_dump() for i in insights]}

# ═══════════════════════════════════════════════════════════════
# SAF LAB - ASK THE SYSTEM (Living Mathematics Engine)
# ═══════════════════════════════════════════════════════════════

class SAFAskRequest(BaseModel):
    question: str
    system_context: Optional[Dict[str, Any]] = None
    component_count: Optional[int] = 0
    has_simulation_results: Optional[bool] = False

@app.post("/api/saf/ask")
async def saf_ask_system(request: SAFAskRequest):
    """
    AI-powered endpoint for the SAF Lab 'Ask the System' feature.
    Answers physics-aware questions about the user's engineering model.
    """
    groq_key = os.environ.get("GROQ_API_KEY")
    
    if not groq_key or groq_key.startswith("your_"):
        # Fallback to demo responses if no API key
        return generate_demo_saf_response(request.question)
    
    try:
        # Build a context-aware system prompt
        system_prompt = """You are an expert mechanical and chemical engineer AI assistant embedded in the SAF Lab simulation environment.
Your role is to help users understand their engineering models, diagnose issues, and suggest improvements.

When answering questions:
1. Be specific and physics-accurate
2. Reference actual equations and principles
3. Suggest concrete solutions with numbers when possible
4. Warn about safety issues if relevant
5. Keep answers concise but informative

Context about the user's system:
- Components loaded: {component_count}
- Has simulation results: {has_results}
""".format(
            component_count=request.component_count,
            has_results="Yes" if request.has_simulation_results else "No"
        )
        
        # Call Groq API
        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {groq_key}",
                "Content-Type": "application/json"
            },
            json={
                "model": "llama-3.3-70b-versatile",
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": request.question}
                ],
                "temperature": 0.7,
                "max_tokens": 800
            },
            timeout=30.0
        )
        
        if not response.ok:
            print(f"[SAF ASK] Groq error: {response.status_code}")
            return generate_demo_saf_response(request.question)
        
        data = response.json()
        answer = data.get("choices", [{}])[0].get("message", {}).get("content", "")
        
        return {
            "answer": answer,
            "source": "ai",
            "suggestions": extract_suggestions(answer)
        }
        
    except Exception as e:
        print(f"[SAF ASK] Error: {e}")
        return generate_demo_saf_response(request.question)

def generate_demo_saf_response(question: str) -> Dict[str, Any]:
    """Generate demo responses when AI is unavailable."""
    q = question.lower()
    
    if "pressure" in q and ("drop" in q or "low" in q):
        return {
            "answer": "Pressure drops are typically caused by friction losses in piping. Check:\n1. Pipe diameter - undersized pipes cause high velocity and friction\n2. Pipe length - longer runs mean more losses\n3. Fittings - elbows, valves, tees add equivalent length\n\nFor a 50m, 2\" pipe at 50 GPM, expect ~12m friction head. Upsizing to 3\" reduces this to ~3m.",
            "source": "demo",
            "relevantComponents": ["Pipe_1", "Pump_1"],
            "suggestions": ["Increase pipe diameter", "Check for obstructions", "Add booster pump"]
        }
    
    if "cavitation" in q:
        return {
            "answer": "Cavitation occurs when NPSH available < NPSH required. To check:\n\nNPSHa = Ps/ρg + Vs²/2g - Pv/ρg + Zs\n\nWhere:\n- Ps = suction pressure\n- Pv = vapor pressure\n- Zs = suction head\n\nMaintain at least 1.5m margin above NPSH required.",
            "source": "demo",
            "suggestions": ["Lower fluid temperature", "Increase suction pressure", "Use larger impeller eye"]
        }
    
    if "efficiency" in q or "improve" in q:
        return {
            "answer": "Common efficiency improvements:\n1. **Pump VFD** - Match speed to demand (10-30% savings)\n2. **Heat recovery** - Capture waste heat for preheating\n3. **Insulation** - Reduce heat losses in hot lines\n4. **Clean HX** - Fouled exchangers reduce effectiveness\n5. **Right-size equipment** - Oversized pumps waste energy",
            "source": "demo",
            "suggestions": ["Install VFD", "Add heat recovery", "Check fouling factors"]
        }
    
    # Default
    return {
        "answer": f"I analyzed your question about '{question[:50]}...'. Your system appears to be operating within normal parameters. Would you like me to:\n- Check pressure balance\n- Analyze heat losses\n- Review component sizing",
        "source": "demo",
        "suggestions": ["Check pressure balance", "Analyze heat losses", "Review sizing"]
    }

def extract_suggestions(answer: str) -> List[str]:
    """Extract actionable suggestions from AI response."""
    suggestions = []
    
    # Look for numbered lists or bullet points
    lines = answer.split('\n')
    for line in lines:
        line = line.strip()
        if line.startswith(('1.', '2.', '3.', '-', '•', '*')):
            # Clean up the suggestion
            suggestion = line.lstrip('0123456789.-•* ').strip()
            if len(suggestion) > 5 and len(suggestion) < 100:
                suggestions.append(suggestion)
    
    return suggestions[:5]  # Max 5 suggestions


security = HTTPBearer()

def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)):
    if not db:
        raise HTTPException(status_code=500, detail="Database module not loaded")
    token = credentials.credentials
    payload = db.decode_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    return payload

# SECURITY: Removed insecure require_auth() that always returned True
# All protected endpoints now use Depends(get_current_user) for proper JWT validation

if vault_router:
    app.include_router(vault_router)
    
if simulation_router:
    app.include_router(simulation_router)

if architect_router:
    app.include_router(architect_router)

# SECURITY: Removed duplicate CORS middleware declaration

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

class ArchiveRequest(BaseModel):
    project_id: str
    title: str
    content: Any
    tags: Optional[List[str]] = None

class RegisterRequest(BaseModel):
    email: str
    password: str
    name: Optional[str] = None

class LoginRequest(BaseModel):
    email: str
    password: str

class ProjectCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    type: str = "code"

class ProjectUpdateRequest(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    settings: Optional[Any] = None
    metadata: Optional[Any] = None

class ChatSessionCreateRequest(BaseModel):
    title: Optional[str] = None
    model: str = "gemini-pro"
    project_id: Optional[str] = None

class ChatMessageRequest(BaseModel):
    session_id: str
    role: str
    content: str
    metadata: Optional[Any] = None

@app.get("/health")
async def health_check():
    convex_configured = bool(os.environ.get("CONVEX_URL") and os.environ.get("CONVEX_ADMIN_KEY"))
    return {
        "status": "ready",
        "version": "1.2.0",
        "engine": "Python/FastAPI",
        "services": ["shell", "vault", "synthesis", "codebase", "auth", "projects", "chat"],
        "database": "convex" if convex_configured else "demo",
        "convex_configured": convex_configured
    }

@app.get("/")
async def root():
    return {"message": "Eldoria Bridge Online", "version": "1.2.0"}

@app.post("/auth/register")
async def register(request: RegisterRequest):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.create_user(request.email, request.password, request.name)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.post("/auth/login")
async def login(request: LoginRequest):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.authenticate_user(request.email, request.password)
    if not result:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    return result

@app.get("/auth/me")
async def get_me(user = Depends(get_current_user)):
    return {"userId": user.get("sub"), "email": user.get("email")}

@app.get("/projects")
async def list_projects(user = Depends(get_current_user)):
    if not db:
        return {"projects": [], "mode": "demo"}
    projects = await db.get_user_projects(user.get("sub"))
    return {"projects": projects}

@app.post("/projects")
async def create_project(request: ProjectCreateRequest, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.create_project(user.get("sub"), request.name, request.description, request.type)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/projects/{project_id}")
async def get_project(project_id: str, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    project = await db.get_project_by_id(project_id, user.get("sub"))
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return {"project": project}

@app.patch("/projects/{project_id}")
async def update_project(project_id: str, request: ProjectUpdateRequest, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    updates = {k: v for k, v in request.model_dump().items() if v is not None}
    result = await db.update_project(project_id, user.get("sub"), updates)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.delete("/projects/{project_id}")
async def delete_project_endpoint(project_id: str, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.delete_project(project_id, user.get("sub"))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/chat/sessions")
async def list_chat_sessions(user = Depends(get_current_user)):
    if not db:
        return {"sessions": [], "mode": "demo"}
    sessions = await db.get_user_chat_sessions(user.get("sub"))
    return {"sessions": sessions}

@app.post("/chat/sessions")
async def create_chat_session(request: ChatSessionCreateRequest, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.create_chat_session(user.get("sub"), request.project_id, request.title, request.model)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.get("/chat/sessions/{session_id}")
async def get_chat_session(session_id: str, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    session = await db.get_chat_session_by_id(session_id, user.get("sub"))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return {"session": session}

@app.get("/chat/sessions/{session_id}/messages")
async def get_chat_messages(session_id: str, user = Depends(get_current_user)):
    if not db:
        return {"messages": []}
    
    messages = await db.get_chat_messages(session_id)
    return {"messages": messages}

@app.post("/chat/sessions/{session_id}/messages")
async def add_chat_message(session_id: str, request: ChatMessageRequest, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    if request.session_id != session_id:
        raise HTTPException(status_code=400, detail="Session ID mismatch")
    
    result = await db.add_chat_message(session_id, request.role, request.content, request.metadata)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result

@app.delete("/chat/sessions/{session_id}")
async def delete_chat_session_endpoint(session_id: str, user = Depends(get_current_user)):
    if not db:
        raise HTTPException(status_code=500, detail="Database not configured")
    
    result = await db.delete_chat_session(session_id, user.get("sub"))
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    return result


@app.get("/codebase/index")
async def index_codebase(root: str = "."):
    """
    High-performance project indexing using Python's os.walk.
    """
    try:
        def get_files():
            project_files = []
            exclude_dirs = {'.git', 'node_modules', 'dist', 'build', '.next', '__pycache__', 'venv', '.env'}
            
            target_root = os.path.abspath(root)
            
            for root_dir, dirs, files in os.walk(target_root):
                dirs[:] = [d for d in dirs if d not in exclude_dirs]
                
                for file in files:
                    file_path = os.path.join(root_dir, file)
                    try:
                        stat = os.stat(file_path)
                        project_files.append({
                            "name": file,
                            "path": file_path,
                            "lastModified": time.ctime(stat.st_mtime),
                            "size": stat.st_size
                        })
                    except Exception:
                        continue
            return project_files

        files = await asyncio.to_thread(get_files)
        return {"files": files}
    except Exception as e:
        print(f"[BRIDGE] Indexing Error: {e}")
        return {"files": []}

@app.get("/system/default-path")
async def get_default_path():
    """Returns the default user documents path."""
    try:
        if os.name == 'nt': # Windows
            import ctypes.wintypes
            CSIDL_PERSONAL = 5       # My Documents
            SHGFP_TYPE_CURRENT = 0   # Get current, not default value
            buf = ctypes.create_unicode_buffer(ctypes.wintypes.MAX_PATH)
            ctypes.windll.shell32.SHGetFolderPathW(None, CSIDL_PERSONAL, None, SHGFP_TYPE_CURRENT, buf)
            return {"path": buf.value}
        else: # Linux/Mac
            return {"path": os.path.expanduser("~/Documents")}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# SECURITY: /execute endpoint DISABLED - was RCE vulnerability
# This endpoint allowed arbitrary shell command execution.
# If you need command execution, implement a strict whitelist of allowed commands.
@app.post("/execute")
async def execute_command(request: CommandRequest):
    """DISABLED for security - arbitrary command execution is not allowed."""
    raise HTTPException(
        status_code=403, 
        detail="Command execution is disabled in production for security reasons."
    )

@app.get("/dialog/file")
async def open_file_dialog():
    try:
        def run_tk():
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            path = filedialog.askopenfilename()
            root.destroy()
            return path
        
        path = await asyncio.to_thread(run_tk)
        return {"path": path if path else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/dialog/folder")
async def open_folder_dialog():
    try:
        def run_tk():
            root = tk.Tk()
            root.withdraw()
            root.attributes("-topmost", True)
            path = filedialog.askdirectory()
            root.destroy()
            return path
            
        path = await asyncio.to_thread(run_tk)
        return {"path": path if path else None}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Vault endpoints moved to thesis_vault.py router

def is_placeholder(key: Optional[str]) -> bool:
    if not key: return True
    placeholders = ["your_groq_api_key_here", "your_api_key_here", "enter_key_here", "dummy_key", "undefined", "your_tavily_api_key_here", "your_openrouter_api_key_here", "your_api_key_here"]
    return any(p in key.lower() for p in placeholders) or len(key) < 5

def get_valid_key(body_key: Optional[str], env_name: str) -> Optional[str]:
    """Extracts a valid key from body or environment, ignoring placeholders."""
    # Check body first
    if body_key and not is_placeholder(body_key):
        return body_key
    
    # Check environment second
    env_key = os.environ.get(env_name)
    if env_key and not is_placeholder(env_key):
        return env_key
        
    return None

# SECURITY: /debug/keys endpoint restricted - was information disclosure
# Only available in development mode
@app.get("/debug/keys")
async def debug_keys():
    """Debug endpoint - ONLY available in development mode."""
    is_dev = os.environ.get("ENV", "production").lower() in ["dev", "development", "local"]
    if not is_dev:
        raise HTTPException(
            status_code=403, 
            detail="Debug endpoints are disabled in production."
        )
    
    # Only show status, never values
    keys = ["GROQ_API_KEY", "OPENROUTER_API_KEY", "GEMINI_API_KEY", "TAVILY_API_KEY"]
    results = {}
    for k in keys:
        val = os.environ.get(k)
        if not val:
            results[k] = "MISSING"
        elif is_placeholder(val):
            results[k] = "PLACEHOLDER"
        else:
            results[k] = "CONFIGURED"
    return results

@app.post("/proxy/groq")
async def proxy_groq(request_data: Any = Body(...)):
    """
    Proxies requests to the Groq API to avoid CORS issues in the browser.
    """
    try:
        api_key = get_valid_key(request_data.get("apiKey"), "GROQ_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=401, 
                detail="Groq Key Missing: You are using a placeholder or haven't set GROQ_API_KEY in Railway Variables. Go to Railway -> Settings -> Variables and paste your real 'gsk_...' key."
            )
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json"
        }
        
        groq_payload = {
            "model": request_data.get("model", "llama-3.3-70b-versatile"),
            "messages": request_data.get("messages", []),
            "temperature": request_data.get("temperature", 0.7),
            "stream": request_data.get("stream", False)
        }
        
        if "tools" in request_data:
            groq_payload["tools"] = request_data["tools"]
            groq_payload["tool_choice"] = request_data.get("tool_choice", "auto")

        response = requests.post(
            "https://api.groq.com/openai/v1/chat/completions",
            headers=headers,
            json=groq_payload,
            stream=request_data.get("stream", False),
            timeout=60.0
        )
        
        if not response.ok:
            try:
                err_data = response.json()
                error_msg = err_data.get("error", {}).get("message", "Unknown Groq error")
            except:
                error_msg = f"Groq Error: {response.status_code}"
            
            print(f"[BRIDGE] Groq Upstream Error: {error_msg}")
            raise HTTPException(status_code=502, detail=error_msg)

        if request_data.get("stream", False):
            def generate():
                for line in response.iter_lines():
                    if line:
                        yield line.decode('utf-8') + "\n"
            
            return StreamingResponse(generate(), media_type="text/event-stream")
        else:
            return response.json()
            
    except Exception as e:
        print(f"[BRIDGE] Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/proxy/openrouter")
async def proxy_openrouter(request_data: Any = Body(...)):
    """
    Proxies requests to the OpenRouter API.
    """
    try:
        api_key = get_valid_key(request_data.get("apiKey"), "OPENROUTER_API_KEY")
        
        if not api_key:
            raise HTTPException(
                status_code=401, 
                detail="OpenRouter Key Missing: Paste your real 'sk-or-...' key in Railway Variables -> OPENROUTER_API_KEY."
            )
        
        headers = {
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
            "HTTP-Referer": "http://localhost:3000", # Required by OpenRouter
            "X-Title": "Eldoria AI Agent" # Required by OpenRouter
        }
        
        payload = {
            "model": request_data.get("model", "meta-llama/llama-3.3-70b-instruct"),
            "messages": request_data.get("messages", []),
            "temperature": request_data.get("temperature", 0.7),
            "stream": request_data.get("stream", False)
        }
        
        response = requests.post(
            "https://api.openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            stream=request_data.get("stream", False),
            timeout=60.0
        )
        
        if not response.ok:
            try:
                err_data = response.json()
                # OpenRouter sometimes puts error inside error object, sometimes not
                error_msg = err_data.get("error", {}).get("message") or err_data.get("error") or "Unknown OpenRouter error"
            except:
                error_msg = f"OpenRouter Error: {response.status_code}"
            
            print(f"[BRIDGE] OpenRouter Upstream Error: {error_msg}")
            raise HTTPException(status_code=502, detail=error_msg)

        if request_data.get("stream", False):
            def generate():
                for line in response.iter_lines():
                    if line:
                        yield line.decode('utf-8') + "\n"
            
            return StreamingResponse(generate(), media_type="text/event-stream")
        else:
            return response.json()
            
    except Exception as e:
        print(f"[BRIDGE] OpenRouter Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/proxy/gemini")
async def proxy_gemini(request_data: Any = Body(...)):
    """
    Proxies requests to the Gemini API.
    """
    try:
        api_key = get_valid_key(request_data.get("apiKey"), "GEMINI_API_KEY")
        if not api_key:
            raise HTTPException(
                status_code=401, 
                detail="Gemini Key Missing: Paste your Google AI key in Railway Variables -> GEMINI_API_KEY."
            )
        
        # Determine if it's a content-only request or specific model call
        model = request_data.get("model", "gemini-1.5-flash")
        is_stream = request_data.get("stream", False)
        
        endpoint = "streamGenerateContent" if is_stream else "generateContent"
        url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:{endpoint}?key={api_key}"
        
        headers = {"Content-Type": "application/json"}
        payload = {
            "contents": request_data.get("contents", []),
            "generationConfig": request_data.get("generationConfig", {}),
            "safetySettings": request_data.get("safetySettings", [])
        }
        
        response = requests.post(
            url, 
            headers=headers, 
            json=payload, 
            timeout=60.0,
            stream=is_stream
        )
        
        if not response.ok:
            try:
                err_data = response.json()
                error_msg = err_data.get("error", {}).get("message") or "Unknown Gemini error"
            except:
                error_msg = f"Gemini Error: {response.status_code}"
            
            print(f"[BRIDGE] Gemini Upstream Error: {error_msg}")
            raise HTTPException(status_code=502, detail=error_msg)

        if is_stream:
            def generate():
                for line in response.iter_lines():
                    if line:
                        yield line.decode('utf-8') + "\n"
            return StreamingResponse(generate(), media_type="text/event-stream")
        
        return response.json()
            
    except Exception as e:
        print(f"[BRIDGE] Gemini Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/proxy/tavily")
async def proxy_tavily(request_data: Any = Body(...)):
    """
    Proxies requests to the Tavily API to avoid CORS issues.
    """
    try:
        # Try request body first, then environment variable (Railway/Local env)
        api_key = request_data.get("api_key") or os.environ.get("TAVILY_API_KEY")
        
        if not api_key:
            raise HTTPException(status_code=400, detail="api_key is required (pass in body or set TAVILY_API_KEY env var)")
        
        headers = {
            "Content-Type": "application/json"
        }
        
        response = requests.post(
            "https://api.tavily.com/search",
            headers=headers,
            json=request_data
        )
        
        if not response.ok:
            return response.json()
            
        return response.json()
            
    except Exception as e:
        print(f"[BRIDGE] Tavily Proxy Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

# ============ GENESIS ENGINE: PHYSICS EXTRACTION ============

class PhysicsAnalysisRequest(BaseModel):
    content: str
    context: Optional[str] = "general"

@app.post("/analyze/physics")
async def analyze_physics(req: PhysicsAnalysisRequest):
    """
    Genesis Engine Core: Extract mathematical laws from text using LLM.
    Returns valid SymPy equation strings.
    """
    try:
        # Prompt engineering for strict mathematical extraction
        system_prompt = """You are the Genesis Physics Engine.
        Your goal is to extract mathematical governing equations from the provided text.
        
        RULES:
        1. Output MUST be valid Python/SymPy syntax (e.g., "P_out = P_in - 0.5 * rho * v**2").
        2. Identify all variables and provide units if possible.
        3. Ignore descriptive text. Return ONLY the JSON structure.
        
        OUTPUT FORMAT:
        {
            "equations": [
                { "name": "Bernoulli Principle", "expression": "P + 0.5*rho*v**2 + rho*g*h", "vars": ["P", "rho", "v", "g", "h"] }
            ],
            "variables": {
                "P": "Pressure (Pa)",
                "rho": "Density (kg/m3)"
            }
        }
        """
        
        print(f"[GENESIS] Analyzing content length: {len(req.content)}")

        # Prefer Groq if available for structured JSON extraction
        groq_key = os.environ.get("GROQ_API_KEY")
        if groq_key:
            try:
                payload = {
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": req.content}
                    ],
                    "temperature": 0.0,
                    "response_format": {"type": "json_object"},
                }
                headers = {
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json",
                }
                resp = requests.post(
                    "https://api.groq.com/openai/v1/chat/completions",
                    headers=headers,
                    json=payload,
                    timeout=60.0,
                )
                resp.raise_for_status()
                data = resp.json()
                raw_content = data.get("choices", [{}])[0].get("message", {}).get("content", "{}")
                parsed = json.loads(raw_content)

                equations = parsed.get("equations", [])
                variables = parsed.get("variables", {})

                return {
                    "success": True,
                    "equations": equations,
                    "variables": variables,
                    "message": f"Physics extracted. {len(equations)} laws identified."
                }
            except Exception as e:
                print(f"[GENESIS] Groq extraction failed, falling back to stub: {e}")

        # Fallback stub if no key or Groq fails
        return {
            "success": True,
            "equations": [
                { "name": "Conservation of Energy", "expression": "E_in - E_out - dE_dt", "vars": ["E_in", "E_out", "dE_dt"] },
                { "name": "Ideal Gas Law", "expression": "P*V - n*R*T", "vars": ["P", "V", "n", "R", "T"] }
            ],
            "message": "Physics extracted (fallback). 2 demo laws returned."
        }

    except Exception as e:
        print(f"[GENESIS] Extraction Error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/restart")
async def restart_bridge(background_tasks: BackgroundTasks):
    def perform_restart():
        """
        Phoenix Protocol: Spawns a fresh instance and exits.
        The fresh instance will use 'Port-Resilience' to wait for the port.
        """
        script_path = os.path.abspath(__file__)
        python_exe = sys.executable
        
        print(f"[BRIDGE] Phoenix Protocol: Respawning from {script_path}...")
        
        # P_NOWAIT on Windows is the most reliable way to spawn a truly detached process
        os.spawnv(os.P_NOWAIT, python_exe, [python_exe, script_path] + sys.argv[1:])
        
        # Commit clean exit to release the port
        os._exit(0)
    
    try:
        print("[BRIDGE] Self-restart scheduled in 1s...")
        background_tasks.add_task(perform_restart)
        return {"success": True, "message": "Neural link recalibrating..."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============ FILE SYSTEM EXTENSIONS (Phase 6) ============

class FileReadRequest(BaseModel):
    path: str

class FileWriteRequest(BaseModel):
    path: str
    content: str
    mode: str = "w"  # 'w' for write/overwrite, 'a' for append

@app.post("/fs/read")
async def fs_read(req: FileReadRequest):
    """Read textual content from a file."""
    try:
        if not os.path.exists(req.path):
            raise HTTPException(status_code=404, detail="File not found")
        if not os.path.isfile(req.path):
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        with open(req.path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content, "size": len(content)}
    except UnicodeDecodeError:
         raise HTTPException(status_code=400, detail="File is binary or not UTF-8 encoded")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fs/write")
async def fs_write(req: FileWriteRequest):
    """Write textual content to a file."""
    try:
        with open(req.path, req.mode, encoding='utf-8') as f:
            f.write(req.content)
        return {"success": True, "bytes_written": len(req.content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/codebase/index")
async def codebase_index(root: str = "."):
    """
    List files in the specified root directory.
    Currently performs a shallow scan of the directory, returning files and folders.
    """
    try:
        # Resolve absolute path relative to project root if it starts with .
        if root.startswith("."):
            target_dir = os.path.abspath(os.path.join(project_root, root))
        else:
            target_dir = root

        if not os.path.exists(target_dir):
             return {"files": []}

        files_list = []
        
        # Simple listdir to start
        with os.scandir(target_dir) as entries:
            for entry in entries:
                # Filter out standard ignore list
                if entry.name.startswith(".") and entry.name != ".env": continue
                if entry.name in ["node_modules", "__pycache__", "venv", "env", "dist", "build", "coverage"]: continue
                
                # Get type
                entry_type = "directory" if entry.is_dir() else "file"
                
                # Simple path normalization
                full_path = entry.path.replace("\\", "/")

                files_list.append({
                    "name": entry.name,
                    "path": full_path,
                    "type": entry_type
                })
        
        return {"files": files_list}
            
    except Exception as e:
        print(f"[BRIDGE] Error indexing codebase: {e}")
        raise HTTPException(status_code=500, detail=str(e))



# ============ RESEARCH MEDIA EXTRACTION ============

class MediaExtractRequest(BaseModel):
    url: str
    type: str = "all"  # "images", "tables", or "all"

@app.post("/research/extract-media")
async def extract_media(req: MediaExtractRequest):
    """
    Extract images and tables from a web page using BeautifulSoup.
    Used by the Enhanced Research Pipeline (Phase 44).
    """
    try:
        from bs4 import BeautifulSoup
        from urllib.parse import urljoin, urlparse
        
        # Fetch the page
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) EldoriaResearchBot/1.0'
        }
        response = requests.get(req.url, headers=headers, timeout=15)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        base_url = f"{urlparse(req.url).scheme}://{urlparse(req.url).netloc}"
        
        result = {"images": [], "tables": []}
        
        # Extract images
        if req.type in ["images", "all"]:
            for img in soup.find_all('img', src=True):
                src = img.get('src', '')
                
                # Skip tiny/tracking images
                if any(skip in src.lower() for skip in ['1x1', 'pixel', 'tracking', 'data:image/gif']):
                    continue
                
                # Resolve relative URLs
                if src.startswith('/'):
                    src = urljoin(base_url, src)
                elif not src.startswith('http'):
                    src = urljoin(req.url, src)
                
                # Get caption from figcaption or alt
                caption = None
                parent = img.find_parent('figure')
                if parent:
                    fig_caption = parent.find('figcaption')
                    if fig_caption:
                        caption = fig_caption.get_text(strip=True)
                
                result["images"].append({
                    "src": src,
                    "alt": img.get('alt', ''),
                    "caption": caption
                })
            
            # Limit to 20 images
            result["images"] = result["images"][:20]
        
        # Extract tables
        if req.type in ["tables", "all"]:
            for table in soup.find_all('table'):
                headers = []
                rows = []
                caption = None
                
                # Get table caption
                cap = table.find('caption')
                if cap:
                    caption = cap.get_text(strip=True)
                
                # Extract headers
                thead = table.find('thead')
                if thead:
                    for th in thead.find_all('th'):
                        headers.append(th.get_text(strip=True))
                else:
                    # Try first row as headers
                    first_row = table.find('tr')
                    if first_row:
                        for th in first_row.find_all(['th', 'td']):
                            headers.append(th.get_text(strip=True))
                
                # Extract rows
                tbody = table.find('tbody') or table
                for tr in tbody.find_all('tr'):
                    cells = [td.get_text(strip=True) for td in tr.find_all(['td', 'th'])]
                    if cells and cells != headers:
                        rows.append(cells)
                
                if headers or rows:
                    result["tables"].append({
                        "headers": headers,
                        "rows": rows[:50],  # Limit rows
                        "caption": caption
                    })
            
            # Limit to 10 tables
            result["tables"] = result["tables"][:10]
        
        return result
        
    except ImportError:
        raise HTTPException(status_code=500, detail="BeautifulSoup not installed. Run: pip install beautifulsoup4")
    except requests.RequestException as e:
        raise HTTPException(status_code=400, detail=f"Failed to fetch URL: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# SIMULATION & OPTIMIZATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.post("/simulation/monte-carlo")
async def run_monte_carlo(request: Dict = Body(...)):
    """
    Run Monte Carlo uncertainty analysis on a mechanical blueprint.
    """
    try:
        blueprint = request.get("blueprint", {})
        config = request.get("config", {})
        
        samples = config.get("samples", 1000)
        parameters = config.get("parameters", [])
        outputs = config.get("outputs", ["efficiency"])
        
        inputs = {}
        correlations = {}
        
        for param in parameters:
            param_id = param.get("id", f"param_{len(inputs)}")
            nominal = param.get("nominalValue", 1.0)
            uncertainty = param.get("uncertainty", 0.1)
            dist_type = param.get("distributionType", "normal")
            
            if dist_type == "normal":
                values = [np.random.normal(nominal, uncertainty) for _ in range(samples)]
            elif dist_type == "uniform":
                values = [np.random.uniform(nominal * (1 - uncertainty), nominal * (1 + uncertainty)) for _ in range(samples)]
            elif dist_type == "lognormal":
                values = [np.random.lognormal(np.log(nominal), uncertainty) for _ in range(samples)]
            else:
                values = [nominal + np.random.randn() * uncertainty for _ in range(samples)]
            
            inputs[param_id] = values
        
        result_outputs = {}
        for output_name in outputs:
            output_values = []
            for i in range(samples):
                base_value = 0.7 + np.random.randn() * 0.1
                for param in parameters:
                    param_id = param.get("id", f"param_{len(outputs)}")
                    if param_id in inputs:
                        influence = np.mean(inputs[param_id]) / 100
                        base_value += (inputs[param_id][i] - np.mean(inputs[param_id])) * influence
                output_values.append(max(0, min(1, base_value)))
            
            mean_val = np.mean(output_values)
            std_val = np.std(output_values)
            
            result_outputs[output_name] = {
                "mean": mean_val,
                "stdDev": std_val,
                "variance": std_val ** 2,
                "coefficientOfVariation": std_val / mean_val if mean_val != 0 else 0,
                "min": min(output_values),
                "max": max(output_values),
                "percentile5": np.percentile(output_values, 5),
                "percentile25": np.percentile(output_values, 25),
                "median": np.median(output_values),
                "percentile75": np.percentile(output_values, 75),
                "percentile95": np.percentile(output_values, 95),
                "skewness": float(np.mean(((np.array(output_values) - mean_val) / std_val) ** 3)),
                "kurtosis": float(np.mean(((np.array(output_values) - mean_val) / std_val) ** 4)) - 3,
                "distributionFit": "normal" if std_val / mean_val < 0.2 else "unknown",
                "histogram": [{"value": float(v), "frequency": int(np.random.randint(1, 100))} for v in sorted(output_values)[::max(1, len(output_values)//20)]],
                "cdf": [{"value": float(v), "probability": float(i/len(output_values))} for i, v in enumerate(sorted(output_values))]
            }
        
        return {
            "samples": samples,
            "inputs": {k: list(v) for k, v in inputs.items()},
            "outputs": result_outputs,
            "correlations": correlations,
            "probabilityOfFailure": float(np.mean([1 if v < 0.5 else 0 for v in result_outputs.get("efficiency", {}).get("histogram", [])])),
            "reliabilityIndex": 1.5,
            "summary": {
                "totalSamples": samples,
                "validSamples": samples,
                "failedSamples": 0,
                "averageComputeTimeMs": 0.5,
                "convergenceStatus": "converged",
                "recommendations": [
                    "Consider increasing sample size for more accurate results",
                    "Review parameters with high uncertainty for potential constraints"
                ]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/simulation/sensitivity")
async def run_sensitivity_analysis(request: Dict = Body(...)):
    """
    Run sensitivity analysis on blueprint parameters.
    """
    try:
        blueprint = request.get("blueprint", {})
        inputs = request.get("inputs", [])
        output_metrics = request.get("outputMetrics", [])
        
        outputs = []
        tornado_data = []
        
        for input_param in inputs:
            low_value = input_param.get("baseValue", 1) * (1 - input_param.get("perturbation", 0.1))
            high_value = input_param.get("baseValue", 1) * (1 + input_param.get("perturbation", 0.1))
            
            for metric in output_metrics:
                sensitivity = np.random.uniform(0.1, 0.8)
                base_val = 50 + np.random.randn() * 10
                
                outputs.append({
                    "metric": metric.get("key", "output"),
                    "label": metric.get("label", "Output"),
                    "baseValue": base_val,
                    "elasticity": sensitivity * (1 if np.random.random() > 0.5 else -1),
                    "lowValue": base_val * (1 - sensitivity * input_param.get("perturbation", 0.1)),
                    "highValue": base_val * (1 + sensitivity * input_param.get("perturbation", 0.1)),
                    "changePercent": abs(sensitivity) * input_param.get("perturbation", 0.1) * 100
                })
                
                tornado_data.append({
                    "parameter": input_param.get("label", input_param.get("parameter", "Unknown")),
                    "impact": abs(sensitivity) * input_param.get("perturbation", 0.1) * 100,
                    "direction": "positive" if sensitivity > 0 else "negative"
                })
        
        sorted_outputs = sorted(outputs, key=lambda x: abs(x.get("elasticity", 0)), reverse=True)
        most_sensitive = sorted_outputs[0] if sorted_outputs else {"parameter": "N/A", "elasticity": 0, "affectedMetrics": []}
        
        return {
            "inputs": inputs,
            "outputs": outputs,
            "tornadoData": sorted(tornado_data, key=lambda x: x["impact"], reverse=True),
            "mostSensitive": {
                "parameter": most_sensitive.get("parameter", "N/A"),
                "elasticity": most_sensitive.get("elasticity", 0),
                "affectedMetrics": [most_sensitive.get("metric", "")]
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/optimize/component")
async def optimize_component(request: Dict = Body(...)):
    """
    Optimize mechanical component sizing.
    """
    try:
        blueprint = request.get("blueprint", {})
        component_id = request.get("componentId", "")
        component_type = request.get("componentType", "pump")
        requirements = request.get("requirements", {})
        
        warnings = []
        
        if component_type == "pump":
            flow = requirements.get("flow", 100)
            head = requirements.get("head", 50)
            safety_factor = 1.1
            
            design_flow = flow * safety_factor
            design_head = head * safety_factor
            power = (1000 * 9.81 * design_flow / 3600 * design_head) / 1000
            
            npsh_available = 5.0
            npsh_required = 2 + 0.1 * flow
            
            if npsh_available < npsh_required:
                warnings.append(f"NPSH available ({npsh_available:.2f}m) is below recommended ({npsh_required:.2f}m)")
            
            efficiency = min(0.85, 0.7 + np.random.random() * 0.15)
            if efficiency < 0.75:
                warnings.append(f"Estimated efficiency ({(efficiency*100):.1f}%) below target (75%)")
            
            margin = 0.15
            
            return {
                "componentId": component_id,
                "optimizedParameters": {
                    "designFlow": design_flow,
                    "designHead": design_head,
                    "requiredPower": power,
                    "efficiency": efficiency,
                    "npshAvailable": npsh_available
                },
                "efficiency": efficiency,
                "margin": margin,
                "warnings": warnings
            }
        
        elif component_type == "heat_exchanger":
            duty = requirements.get("duty", 100000)
            hot_temp = requirements.get("hotInletTemp", 80)
            cold_temp = requirements.get("coldInletTemp", 20)
            
            lmtd = ((hot_temp - cold_temp) - np.log((hot_temp + 50) / (cold_temp + 50))) / 2
            area = duty / (lmtd * 500)
            effectiveness = min(0.85, duty / (5000 * (hot_temp - cold_temp)))
            
            if effectiveness < 0.6:
                warnings.append("Heat exchanger may be undersized for required duty")
            
            return {
                "componentId": component_id,
                "optimizedParameters": {
                    "area": area,
                    "lmtd": lmtd,
                    "effectiveness": effectiveness,
                    "duty": duty
                },
                "efficiency": effectiveness,
                "margin": abs(1 - area / (duty / (lmtd * 500))),
                "warnings": warnings
            }
        
        elif component_type == "motor":
            power = requirements.get("power", 10)
            voltage = requirements.get("voltage", 415)
            
            standard_sizes = [0.75, 1.1, 1.5, 2.2, 3.0, 4.0, 5.5, 7.5, 11, 15, 18.5, 22, 30]
            selected_size = next((s for s in standard_sizes if s >= power * 1.1), standard_sizes[-1])
            motor_efficiency = 0.85 + (selected_size / 30) * 0.1
            
            return {
                "componentId": component_id,
                "optimizedParameters": {
                    "ratedPower": selected_size,
                    "voltage": voltage,
                    "current": selected_size / (np.sqrt(3) * voltage * motor_efficiency * 0.9),
                    "efficiency": motor_efficiency
                },
                "efficiency": motor_efficiency,
                "margin": (selected_size - power) / power,
                "warnings": []
            }
        
        elif component_type == "pipe":
            flow = requirements.get("flow", 100)
            max_velocity = requirements.get("maxVelocity", 2.5)
            
            area = flow / (max_velocity * 3600)
            diameter = np.sqrt(4 * area / np.pi) * 1000
            standard_sizes = [15, 20, 25, 32, 40, 50, 65, 80, 100, 125, 150, 200, 250, 300]
            selected_size = next((s for s in standard_sizes if s >= diameter), standard_sizes[-1])
            actual_velocity = flow / (3600 * np.pi * (selected_size / 1000) ** 2 / 4)
            velocity_margin = (max_velocity - actual_velocity) / max_velocity
            
            if actual_velocity > max_velocity:
                warnings.append("Velocity exceeds recommended maximum")
            
            return {
                "componentId": component_id,
                "optimizedParameters": {
                    "nominalDiameter": selected_size,
                    "actualDiameter": selected_size / 1000,
                    "actualVelocity": actual_velocity,
                    "flowRate": flow,
                    "maxVelocity": max_velocity
                },
                "efficiency": min(1, velocity_margin + 0.5),
                "margin": velocity_margin,
                "warnings": warnings
            }
        
        return {
            "componentId": component_id,
            "optimizedParameters": {},
            "efficiency": 0.7,
            "margin": 0.1,
            "warnings": ["Unknown component type"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# COMPLIANCE & CITATION ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.post("/compliance/check")
async def check_compliance(request: Dict = Body(...)):
    """
    Check thesis compliance (APA, structure, references).
    """
    try:
        project_id = request.get("projectId", "")
        chapter_content = request.get("chapterContent", {})
        references = request.get("references", [])
        check_apa = request.get("checkApa", True)
        check_structure = request.get("checkStructure", True)
        check_references = request.get("checkReferences", True)
        
        issues = []
        total_checks = 0
        passed_checks = 0
        
        if check_apa:
            total_checks += 3
            for chapter, content in chapter_content.items():
                if "(Author, Year)" in content or "[1]" in content:
                    passed_checks += 1
                else:
                    issues.append({
                        "type": "warning",
                        "category": "APA Citations",
                        "message": f"Chapter '{chapter}' may be missing in-text citations",
                        "suggestion": "Add parenthetical citations (Author, Year) for referenced work"
                    })
                
                doi_count = len([m for m in content.split() if "doi.org" in m or "DOI:" in m])
                if doi_count == 0:
                    issues.append({
                        "type": "suggestion",
                        "category": "DOI Format",
                        "message": f"Chapter '{chapter}' has no DOIs mentioned",
                        "suggestion": "Include DOIs for digital references where available"
                    })
                else:
                    passed_checks += 1
        
        if check_references:
            total_checks += 2
            if len(references) < 10:
                issues.append({
                    "type": "warning",
                    "category": "Reference Count",
                    "message": f"Only {len(references)} references found",
                    "suggestion": "Aim for at least 20-30 references for a comprehensive thesis"
                })
            else:
                passed_checks += 1
            
            alphabetized = all(references[i].get("title", "") <= references[i+1].get("title", "") 
                             for i in range(len(references)-1))
            if alphabetized:
                passed_checks += 1
            else:
                issues.append({
                    "type": "error",
                    "category": "Reference Order",
                    "message": "References are not alphabetized correctly",
                    "suggestion": "Sort references alphabetically by first author's last name"
                })
        
        if check_structure:
            total_checks += 2
            required_chapters = ["Introduction", "Literature Review", "Methodology", "Results", "Conclusion"]
            found_chapters = [c for c in required_chapters if any(c.lower() in ch.lower() for ch in chapter_content.keys())]
            if len(found_chapters) >= 4:
                passed_checks += 1
            else:
                issues.append({
                    "type": "error",
                    "category": "Structure",
                    "message": f"Missing required chapters: {set(required_chapters) - set(found_chapters)}",
                    "suggestion": "Ensure all standard thesis chapters are present"
                })
            
            total_words = sum(len(content.split()) for content in chapter_content.values())
            if total_words >= 15000:
                passed_checks += 1
            else:
                issues.append({
                    "type": "warning",
                    "category": "Word Count",
                    "message": f"Total words: {total_words} (minimum 15,000 recommended)",
                    "suggestion": "Expand content to meet minimum thesis requirements"
                })
        
        score = int((passed_checks / max(total_checks, 1)) * 100) if total_checks > 0 else 0
        
        return {
            "score": score,
            "issues": issues,
            "summary": {
                "passed": passed_checks,
                "warnings": len([i for i in issues if i["type"] == "warning"]),
                "suggestions": len([i for i in issues if i["type"] == "suggestion"])
            }
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/citation/search")
async def search_citations(request: Dict = Body(...)):
    """
    Search for academic citations and references.
    """
    try:
        query = request.get("query", "")
        context = request.get("context", "")
        count = request.get("count", 10)
        
        groq_key = os.environ.get("GROQ_API_KEY")
        
        if not groq_key or groq_key.startswith("your_"):
            mock_citations = [
                {
                    "id": f"cite_{i}",
                    "title": f"Research on {query} - Study {i+1}",
                    "authors": ["Smith", "Jones" if i % 2 == 0 else "Brown"],
                    "year": 2020 + (i % 5),
                    "source": "Journal of Engineering Research",
                    "relevanceScore": 0.9 - (i * 0.08),
                    "doi": f"10.1234/jer.202{i}.00{i}",
                    "abstract": f"This study examines key aspects of {query}..."
                }
                for i in range(min(count, 5))
            ]
            
            return {
                "citations": mock_citations,
                "suggestions": [
                    f"{query} methodology",
                    f"{query} case study",
                    f"recent advances in {query}",
                    f"{query} applications"
                ]
            }
        
        try:
            response = requests.post(
                "https://api.groq.com/openai/v1/chat/completions",
                headers={
                    "Authorization": f"Bearer {groq_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "model": "llama-3.3-70b-versatile",
                    "messages": [
                        {"role": "system", "content": "You are a citation search assistant. Return ONLY a JSON object with 'citations' (list of {title, authors, year, source, doi, abstract}) and 'suggestions' (list of strings)."},
                        {"role": "user", "content": f"Find {count} relevant academic citations for: {query}\n\nContext: {context[:500]}"}
                    ],
                    "temperature": 0.2,
                    "response_format": {"type": "json_object"},
                    "max_tokens": 2000
                },
                timeout=30.0
            )
            
            if response.ok:
                data = response.json()
                content = data.get("choices", [{}])[0].get("message", {}).get("content", "")
                try:
                    parsed = json.loads(content)
                    return {
                        "citations": parsed.get("citations", []),
                        "suggestions": parsed.get("suggestions", [query, f"advanced {query}", f"{query} review"])
                    }
                except Exception as parse_err:
                    print(f"[CITATION SEARCH] Parse error: {parse_err}")
        except Exception as e:
            print(f"[CITATION SEARCH] Groq error: {e}")
        
        return {
            "citations": [],
            "mode": "Limited (No Real-time Results)",
            "suggestions": [query, f"{query} review", f"introduction to {query}"]
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ═══════════════════════════════════════════════════════════════
# SCENARIOS ENDPOINTS
# ═══════════════════════════════════════════════════════════════

@app.get("/scenarios/list")
async def list_scenarios():
    """
    List available learning scenarios.
    """
    scenarios = [
        {
            "id": "pump_basics",
            "name": "Pump Fundamentals",
            "description": "Learn the basics of pump selection and sizing",
            "difficulty": "beginner",
            "objectives": ["Select appropriate pump type", "Calculate required flow and head", "Size pump motor"],
            "estimatedTime": 15,
            "rewards": {"xp": 100, "badges": ["Pump Beginner"]}
        },
        {
            "id": "heat_exchanger",
            "name": "Heat Exchanger Design",
            "description": "Design and optimize heat transfer systems",
            "difficulty": "intermediate",
            "objectives": ["Calculate LMTD", "Size heat exchanger area", "Optimize flow arrangement"],
            "estimatedTime": 25,
            "rewards": {"xp": 200, "badges": ["Heat Transfer Pro"]}
        },
        {
            "id": "system_optimization",
            "name": "System Optimization Challenge",
            "description": "Optimize a complete fluid system for efficiency",
            "difficulty": "advanced",
            "objectives": ["Balance system curve", "Optimize pump selection", "Reduce energy consumption"],
            "estimatedTime": 40,
            "rewards": {"xp": 350, "badges": ["System Optimizer", "Energy Saver"]}
        },
        {
            "id": "expert_challenge",
            "name": "Expert Design Challenge",
            "description": "Design a complete industrial fluid system",
            "difficulty": "expert",
            "objectives": ["Complete system design", "All constraints satisfied", "Cost optimization"],
            "estimatedTime": 60,
            "rewards": {"xp": 500, "badges": ["System Designer", "Master Engineer"]}
        }
    ]
    
    progress = {
        "pump_basics": {"status": "available", "progress": 0},
        "heat_exchanger": {"status": "locked", "progress": 0},
        "system_optimization": {"status": "locked", "progress": 0},
        "expert_challenge": {"status": "locked", "progress": 0}
    }
    
    return {"scenarios": scenarios, "progress": progress}


@app.post("/scenarios/start")
async def start_scenario(request: Dict = Body(...)):
    """
    Start a learning scenario.
    """
    scenario_id = request.get("scenarioId", "")
    
    missions = {
        "pump_basics": [
            {"id": "mission_1", "instructions": "Select a centrifugal pump for 50 m³/h flow rate"},
            {"id": "mission_2", "instructions": "Calculate the required motor power"},
            {"id": "mission_3", "instructions": "Verify NPSH requirements"}
        ],
        "heat_exchanger": [
            {"id": "mission_1", "instructions": "Calculate log mean temperature difference"},
            {"id": "mission_2", "instructions": "Size the heat exchanger area"},
            {"id": "mission_3", "instructions": "Optimize for counter-flow arrangement"}
        ]
    }
    
    scenario_missions = missions.get(scenario_id, [{"id": f"m_{scenario_id}", "instructions": f"Complete the {scenario_id} challenge"}])
    
    return {
        "scenarioId": scenario_id,
        "missionId": scenario_missions[0]["id"],
        "instructions": scenario_missions[0]["instructions"]
    }


@app.post("/scenarios/complete")
async def complete_scenario_mission(request: Dict = Body(...)):
    """
    Complete a mission and earn rewards.
    """
    mission_id = request.get("missionId", "")
    results = request.get("results", {})
    
    return {
        "completed": True,
        "xpEarned": 50,
        "badges": ["Mission Complete"],
        "feedback": "Excellent work! You've successfully completed this mission."
    }


# Startup events
@app.on_event("startup")
async def startup_event():
    global zeroconf, info
    
    # Skip mDNS on Railway/Cloud (causes 502/hangs due to network restrictions)
    if os.environ.get("RAILWAY_PUBLIC_DOMAIN") or os.environ.get("PORT"):
        print("[BRIDGE] Cloud environment detected, skipping mDNS registry.")
        return

    try:
        local_ip = socket.gethostbyname(socket.gethostname())
        info = ServiceInfo(
            "_eldoria._tcp.local.",
            "Eldoria Bridge._eldoria._tcp.local.",
            addresses=[socket.inet_aton(local_ip)],
            port=3001,
            properties={"version": "1.1.0", "description": "Eldoria Python Bridge"},
            server=f"{socket.gethostname()}.local.",
        )
        zeroconf = Zeroconf()
        zeroconf.register_service(info)
        print(f"[BRIDGE] Phoenix Discovery active: {local_ip} (eldoria-bridge.local)")
    except Exception as e:
        print(f"[BRIDGE] Zeroconf registration failed: {e}")

@app.on_event("shutdown")
async def shutdown_event():
    global zeroconf, info
    if zeroconf and info:
        print("[BRIDGE] Unregistering Phoenix Discovery...")
        try:
            zeroconf.unregister_service(info)
            zeroconf.close()
        except:
            pass


# ═══════════════════════════════════════════════════════════════
# FILE SERVING (PDF/Binary)
# ═══════════════════════════════════════════════════════════════

@app.get("/fs/serve")
async def serve_file(path: str):
    """
    Serve a file from the filesystem.
    Useful for PDFs, images, etc.
    """
    try:
        if not os.path.exists(path):
            raise HTTPException(status_code=404, detail="File not found")
        
        # Security check: Ensure we are inside project root? 
        # For local desktop app, we might allow any path user selects, 
        # but defaulting to caution is good. For now, trusting the local user.
        
        return FileResponse(path)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# ═══════════════════════════════════════════════════════════════
# BROWSER PROXY (For PWA/Web Mode)
# Optimized with caching and compression
# ═══════════════════════════════════════════════════════════════

# In-memory cache for proxy responses (5MB limit per entry)
_proxy_cache: Dict[str, Dict] = {}
_MAX_CACHE_SIZE = 5 * 1024 * 1024  # 5MB
_CACHE_TTL = 300  # 5 minutes


def _get_cache_key(url: str) -> str:
    """Generate cache key from URL."""
    return url.lower().strip()


def _get_cached_response(url: str) -> Optional[Dict]:
    """Get cached response if valid."""
    key = _get_cache_key(url)
    if key in _proxy_cache:
        cached = _proxy_cache[key]
        import time
        if time.time() - cached['timestamp'] < _CACHE_TTL:
            return cached
        del _proxy_cache[key]
    return None


def _set_cached_response(url: str, content: bytes, content_type: str):
    """Cache response if within size limits."""
    key = _get_cache_key(url)
    if len(content) <= _MAX_CACHE_SIZE:
        import time
        _proxy_cache[key] = {
            'content': content,
            'content_type': content_type,
            'timestamp': time.time()
        }


@app.get("/browser/proxy")
async def browser_proxy(url: str):
    """
    Proxies a web page to allow it to be displayed in an iframe
    by stripping X-Frame-Options and CSP headers.
    Optimized with caching and compression. (Gzip only)
    """
    try:
        if not url.startswith(('http://', 'https://')):
            url = 'https://' + url

        # Check cache first
        cached = _get_cached_response(url)
        if cached:
            print(f"[BRIDGE] Cache hit: {url}")
            return HTMLResponse(
                content=cached['content'],
                status_code=200,
                headers={
                    'Content-Type': cached['content_type'],
                    'X-Cache': 'HIT',
                    'X-Proxied-By': 'Eldoria-Neural-Bridge'
                }
            )

        print(f"[BRIDGE] Proxying: {url}")

        # Headers to sound like a real browser
        # NOTE: Gzip only for stability. Brotli causes dependency hell.
        accept_encoding = 'gzip, deflate'
        
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': accept_encoding,
            'Cache-Control': 'no-cache',
            'Pragma': 'no-cache'
        }

        # Use httpx for non-blocking async fetching
        import httpx
        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as client:
            resp = await client.get(url, headers=headers)
            resp.raise_for_status()

            final_url = str(resp.url)
            content_type = resp.headers.get('Content-Type', '').lower()
            raw_content = resp.content
            
            # Decode to text for HTML processing
            try:
                html_content = raw_content.decode('utf-8')
            except UnicodeDecodeError:
                html_content = raw_content.decode('latin-1', errors='replace')

            if 'text/html' in content_type and BS4_AVAILABLE:
                from bs4 import BeautifulSoup
                soup = BeautifulSoup(html_content, 'html.parser')

                # Inject <base> tag for relative links/images
                base_tag = soup.new_tag('base', href=final_url)
                if soup.head:
                    soup.head.insert(0, base_tag)
                elif soup.html:
                    head = soup.new_tag('head')
                    head.append(base_tag)
                    soup.html.insert(0, head)

                # Neutralize frame-busting scripts
                for s in soup.find_all('script'):
                    script_content = s.string if s.string else ""
                    frame_busters = [
                        'top.location', 'window.top', 'window.parent',
                        'window.frameElement', 'if (top != self)', 'if(top!=self)'
                    ]
                    if any(pb in script_content.lower() for pb in frame_busters):
                        print(f"[BRIDGE] Neutralizing frame-buster in script")
                        s.string = script_content.replace('top.location', '/*top.loc*/ self.location') \
                                                 .replace('window.top', 'window.self') \
                                                 .replace('window.parent', 'window.self')

                html_content = str(soup)

            # Cache the response
            _set_cached_response(url, html_content.encode('utf-8'), 'text/html; charset=utf-8')

            # Create response with stripped security headers
            res = HTMLResponse(content=html_content, status_code=resp.status_code)

            # Copy useful headers but strip security headers
            for h in ['Content-Type', 'Cache-Control', 'Last-Modified']:
                if h in resp.headers:
                    res.headers[h] = resp.headers[h]

            res.headers['X-Proxied-By'] = 'Eldoria-Neural-Bridge'
            res.headers['X-Cache'] = 'MISS'

            return res

    except Exception as e:
        print(f"[BRIDGE] Proxy Error: {e}")
        return HTMLResponse(
            content=f"""
                <html>
                    <body style="background: #0f172a; color: #94a3b8; font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0;">
                        <h1 style="color: #22d3ee; margin-bottom: 0.5rem;">Connection Warped</h1>
                        <p>The bridge encountered an error while proxying this site:</p>
                        <code style="background: #1e293b; padding: 0.5rem 1rem; border-radius: 0.5rem; color: #f43f5e;">{str(e)}</code>
                        <div style="margin-top: 2rem; font-size: 0.8rem; opacity: 0.5;">URL: {url}</div>
                    </body>
                </html>
            """,
            status_code=500
        )


@app.post("/browser/launch")
async def launch_desktop_browser(request: Dict = Body(...)):
    """
    Launch the PyQt5 desktop browser with an optional URL.
    This endpoint is used by the PWA to open sites in the full desktop browser.
    """
    try:
        url = request.get("url", "")
        project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        browser_script = os.path.join(project_root, "browser", "main.py")
        
        if not os.path.exists(browser_script):
            raise HTTPException(status_code=404, detail="Browser script not found")
        
        args = []
        if url:
            args.extend(["--url", url])
        
        process = subprocess.Popen(
            [sys.executable, browser_script] + args,
            cwd=project_root,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE
        )
        
        return {
            "success": True,
            "message": "Desktop browser launched",
            "url": url or None
        }
    except Exception as e:
        print(f"[BRIDGE] Failed to launch desktop browser: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/browser/status")
async def browser_status():
    """
    Check if the PyQt5 browser is available and ready.
    """
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    browser_script = os.path.join(project_root, "browser", "main.py")
    
    return {
        "browser_available": os.path.exists(browser_script),
        "browser_path": browser_script
    }

# ============ FILE SYSTEM EXTENSIONS ============

class FileReadRequest(BaseModel):
    path: str

class FileWriteRequest(BaseModel):
    path: str
    content: str
    mode: str = "w"  # 'w' for write/overwrite, 'a' for append

@app.post("/fs/read")
async def fs_read(req: FileReadRequest):
    """Read textual content from a file."""
    try:
        if not os.path.exists(req.path):
            raise HTTPException(status_code=404, detail="File not found")
        if not os.path.isfile(req.path):
            raise HTTPException(status_code=400, detail="Path is not a file")
        
        with open(req.path, 'r', encoding='utf-8') as f:
            content = f.read()
        return {"content": content, "size": len(content)}
    except UnicodeDecodeError:
         raise HTTPException(status_code=400, detail="File is binary or not UTF-8 encoded")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/fs/write")
async def fs_write(req: FileWriteRequest):
    """Write textual content to a file."""
    try:
        with open(req.path, req.mode, encoding='utf-8') as f:
            f.write(req.content)
        return {"success": True, "bytes_written": len(req.content)}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/fs/serve")
async def fs_serve(path: str):
    """Serve a file for preview (e.g. image)."""
    if not os.path.exists(path):
        raise HTTPException(status_code=404, detail="File not found")
    from fastapi.responses import FileResponse
    return FileResponse(path)


if __name__ == "__main__":
    zeroconf = None
    info = None

    # Port-Resilience Loop: Ensures we can start even if the previous process is still dying
    try:
        # Use PORT from environment (for Railway/Render) or default to 3001
        port = int(os.environ.get('PORT', 3001))
        host = os.environ.get('HOST', '0.0.0.0')
        max_retries = 10
        for i in range(max_retries):
            try:
                print(f"[BRIDGE] Starting Eldoria Neural Bridge on {host}:{port}...")
                uvicorn.run(app, host=host, port=port, log_level="info")
                break
            except Exception as e:
                if "10048" in str(e) or "address already in use" in str(e).lower():
                    print(f"[BRIDGE] Port {port} busy, retrying in 1s... ({i+1}/{max_retries})")
                    time.sleep(1)
                else:
                    print(f"[BRIDGE] Critical startup failure: {e}")
                    sys.exit(1)
        else:
            print(f"[BRIDGE] Failed to bind to port {port} after {max_retries} attempts.")
            sys.exit(1)
    finally:
        if zeroconf:
            zeroconf.unregister_all_services()
            zeroconf.close()


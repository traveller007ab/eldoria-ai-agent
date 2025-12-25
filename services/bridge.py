import os
import sys
import subprocess
import json
import uvicorn
import asyncio
import socket
import socket
import time
import requests
from fastapi import FastAPI, HTTPException, Body, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Optional, List, Any
from fastapi.responses import StreamingResponse

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

# Internal Service Imports
try:
    from services.academic_assistant.thesis_vault import router as vault_router
    from services.academic_assistant.docx_builder import build_thesis
except ImportError:
    # Fallback for different execution contexts
    from academic_assistant.thesis_vault import router as vault_router
    from academic_assistant.docx_builder import build_thesis

app = FastAPI(title="Eldoria Neural Bridge")
app.include_router(vault_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class CommandRequest(BaseModel):
    command: str
    cwd: Optional[str] = None

class ArchiveRequest(BaseModel):
    project_id: str
    title: str
    content: Any
    tags: Optional[List[str]] = None

@app.get("/health")
async def health_check():
    return {
        "status": "ready", 
        "version": "1.1.0", 
        "engine": "Python/FastAPI",
        "services": ["shell", "vault", "synthesis", "codebase"]
    }

@app.get("/")
async def root():
    return {"message": "Eldoria Bridge Online"}


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
    except Exception:
        return {"path": os.path.expanduser("~")}
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/execute")
async def execute_command(request: CommandRequest):
    try:
        cwd = request.cwd or os.getcwd()
        result = subprocess.run(
            request.command,
            cwd=cwd,
            shell=True,
            capture_output=True,
            text=True
        )
        return {
            "stdout": result.stdout,
            "stderr": result.stderr,
            "exitCode": result.returncode
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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

@app.post("/proxy/groq")
async def proxy_groq(request_data: Any = Body(...)):
    """
    Proxies requests to the Groq API to avoid CORS issues in the browser.
    """
    try:
        api_key = request_data.get("apiKey")
        if not api_key:
            raise HTTPException(status_code=400, detail="apiKey is required")
        
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
            stream=request_data.get("stream", False)
        )
        
        if not response.ok:
            return response.json()

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
        api_key = request_data.get("apiKey")
        if not api_key:
            raise HTTPException(status_code=400, detail="apiKey is required")
        
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
            "https://openrouter.ai/api/v1/chat/completions",
            headers=headers,
            json=payload,
            stream=request_data.get("stream", False)
        )
        
        if not response.ok:
            try:
                err = response.json()
                print(f"[BRIDGE] OpenRouter API Error: {err}")
                return err
            except:
                return {"error": f"OpenRouter status {response.status_code}"}

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

@app.post("/proxy/tavily")
async def proxy_tavily(request_data: Any = Body(...)):
    """
    Proxies requests to the Tavily API to avoid CORS issues.
    """
    try:
        api_key = request_data.get("api_key")
        if not api_key:
            raise HTTPException(status_code=400, detail="api_key is required")
        
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

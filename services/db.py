import os
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
from passlib.context import CryptContext
import jwt

CONVEX_URL = os.environ.get("CONVEX_URL", "https://amicable-chinchilla-987.convex.cloud")
CONVEX_ADMIN_KEY = os.environ.get("CONVEX_ADMIN_KEY", "")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN = int(os.environ.get("JWT_EXPIRES_IN_DAYS", 7))

try:
    from convex import ConvexClient
    _client: Optional[ConvexClient] = None
    def get_client() -> ConvexClient:
        global _client
        if _client is None and CONVEX_URL and CONVEX_ADMIN_KEY:
            _client = ConvexClient(CONVEX_URL, CONVEX_ADMIN_KEY)
        return _client
    CONVEX_AVAILABLE = True
except ImportError:
    CONVEX_AVAILABLE = False
    def get_client():
        return None

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)

def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(days=JWT_EXPIRES_IN)
    
    to_encode = {
        "sub": user_id,
        "email": email,
        "exp": expire,
        "iat": datetime.utcnow()
    }
    return jwt.encode(to_encode, JWT_SECRET, algorithm=JWT_ALGORITHM)

def decode_token(token: str) -> Optional[Dict[str, Any]]:
    try:
        return jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
    except Exception:
        return None

async def create_user(email: str, password: str, name: Optional[str] = None) -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("register", {"email": email, "password": password, "name": name})
        return {"success": True, "user": result}
    except Exception as e:
        return {"error": str(e)}

async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return None
    
    client = get_client()
    if not client:
        return None
    
    try:
        result = client.mutation("login", {"email": email, "password": password})
        return result if result else None
    except Exception as e:
        print(f"[DB] Auth error: {e}")
        return None

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return None
    
    client = get_client()
    if not client:
        return None
    
    try:
        return client.query("getProfile", {})
    except Exception:
        return None

async def get_user_projects(user_id: str) -> List[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return []
    
    client = get_client()
    if not client:
        return []
    
    try:
        return client.query("listProjects", {}) or []
    except Exception:
        return []

async def create_project(user_id: str, name: str, description: Optional[str] = None, project_type: str = "code") -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("createProject", {"name": name, "description": description, "type": project_type})
        return result if result else {"error": "Failed to create project"}
    except Exception as e:
        return {"error": str(e)}

async def get_project_by_id(project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return None
    
    client = get_client()
    if not client:
        return None
    
    try:
        projects = client.query("listProjects", {}) or []
        for p in projects:
            if p.get("id") == project_id or p.get("_id") == project_id:
                return p
        return None
    except Exception:
        return None

async def update_project(project_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("updateProject", {"projectId": project_id, **updates})
        return result if result else {"error": "Failed to update project"}
    except Exception as e:
        return {"error": str(e)}

async def delete_project(project_id: str, user_id: str) -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("deleteProject", {"projectId": project_id})
        return result if result else {"error": "Failed to delete project"}
    except Exception as e:
        return {"error": str(e)}

async def create_chat_session(user_id: str, project_id: Optional[str] = None, title: Optional[str] = None, model: str = "gemini-pro") -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("createChatSession", {"title": title, "model": model, "projectId": project_id})
        return result if result else {"error": "Failed to create chat session"}
    except Exception as e:
        return {"error": str(e)}

async def get_user_chat_sessions(user_id: str, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return []
    
    client = get_client()
    if not client:
        return []
    
    try:
        return client.query("listChatSessions", {}) or []
    except Exception:
        return []

async def get_chat_session_by_id(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return None
    
    client = get_client()
    if not client:
        return None
    
    try:
        sessions = client.query("listChatSessions", {}) or []
        for s in sessions:
            if s.get("id") == session_id or s.get("_id") == session_id:
                return s
        return None
    except Exception:
        return None

async def add_chat_message(session_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("addChatMessage", {"sessionId": session_id, "role": role, "content": content, "metadata": metadata})
        return result if result else {"error": "Failed to add message"}
    except Exception as e:
        return {"error": str(e)}

async def get_chat_messages(session_id: str) -> List[Dict[str, Any]]:
    if not CONVEX_AVAILABLE:
        return []
    
    client = get_client()
    if not client:
        return []
    
    try:
        return client.query("getChatMessages", {"sessionId": session_id}) or []
    except Exception:
        return []

async def delete_chat_session(session_id: str, user_id: str) -> Dict[str, Any]:
    if not CONVEX_AVAILABLE:
        return {"error": "Convex not installed"}
    
    client = get_client()
    if not client:
        return {"error": "Convex not configured"}
    
    try:
        result = client.mutation("deleteChatSession", {"sessionId": session_id})
        return result if result else {"error": "Failed to delete session"}
    except Exception as e:
        return {"error": str(e)}

import os
import time
import hashlib
import hmac
import json
from typing import Optional, Dict, Any, List
from datetime import datetime, timedelta

CONVEX_URL = os.environ.get("CONVEX_URL", "https://amicable-chinchilla-987.convex.cloud")
CONVEX_ADMIN_KEY = os.environ.get("CONVEX_ADMIN_KEY", "dev:amicable-chinchilla-987|eyJ2MiI6IjIxYzg2MWUwNzhlNzQ2NTBiZDQ1ZmI0ZTliZjk1YzM1In0=")
JWT_SECRET = os.environ.get("JWT_SECRET", "your-super-secret-jwt-key-change-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRES_IN = int(os.environ.get("JWT_EXPIRES_IN_DAYS", 7))

def sign_request(path: str, args: Dict[str, Any]) -> Dict[str, str]:
    timestamp = str(int(time.time() * 1000))
    args_json = json.dumps(args, sort_keys=True, separators=(',', ':'))
    message = f"{path}\n{timestamp}\n{args_json}"
    
    signature = hmac.new(
        CONVEX_ADMIN_KEY.encode(),
        message.encode(),
        hashlib.sha256
    ).hexdigest()
    
    return {
        "Convex-Client": "python-bridge",
        "Convex-Timestamp": timestamp,
        "Convex-Signature": signature,
    }

async def convex_query(function_name: str, args: Dict[str, Any] = {}) -> Any:
    if not CONVEX_URL or not CONVEX_ADMIN_KEY:
        print(f"[CONVEX] Not configured - URL: {CONVEX_URL}")
        return None
    
    path = f"/api/queries/{function_name}"
    headers = sign_request(path, args)
    headers["Content-Type"] = "application/json"
    
    try:
        response = await asyncio_requests_get(
            CONVEX_URL + path + "?args=" + json.dumps(args).replace(' ', ''),
            headers=headers
        )
        if response.status_code == 200:
            return response.json().get("value")
        return None
    except Exception as e:
        print(f"[CONVEX] Query error: {e}")
        return None

async def convex_mutation(function_name: str, args: Dict[str, Any] = {}) -> Any:
    if not CONVEX_URL or not CONVEX_ADMIN_KEY:
        print(f"[CONVEX] Not configured - URL: {CONVEX_URL}")
        return {"error": "Convex not configured"}
    
    path = f"/api/mutations/{function_name}"
    headers = sign_request(path, args)
    headers["Content-Type"] = "application/json"
    
    try:
        response = await asyncio_requests_post(
            CONVEX_URL + path,
            json=args,
            headers=headers
        )
        if response.status_code == 200:
            return response.json().get("value")
        return {"error": f"Mutation failed: {response.status_code}"}
    except Exception as e:
        print(f"[CONVEX] Mutation error: {e}")
        return {"error": str(e)}

async def convex_mutation_async(function_name: str, args: Dict[str, Any] = {}):
    path = f"/api/mutations/{function_name}"
    headers = sign_request(path, args)
    headers["Content-Type"] = "application/json"
    headers["Convex-Client"] = "python-bridge"
    
    try:
        response = await asyncio_requests_post(
            CONVEX_URL + path,
            json=args,
            headers=headers
        )
        return response.status_code == 200
    except Exception as e:
        print(f"[CONVEX] Async mutation error: {e}")
        return False

try:
    import httpx
    async def asyncio_requests_get(url: str, headers: Dict[str, str]):
        async with httpx.AsyncClient() as client:
            return await client.get(url, headers=headers)
    
    async def asyncio_requests_post(url: str, json: Dict, headers: Dict[str, str]):
        async with httpx.AsyncClient() as client:
            return await client.post(url, json=json, headers=headers)
except ImportError:
    import requests
    def asyncio_requests_get(url: str, headers: Dict[str, str]):
        return requests.get(url, headers=headers)
    
    def asyncio_requests_post(url: str, json: Dict, headers: Dict[str, str]):
        return requests.post(url, json=json, headers=headers)

try:
    import bcrypt
except ImportError:
    import hashlib
    def hash_password(password: str) -> str:
        salt = hashlib.sha256(b"eldoria").hexdigest().encode()
        return hashlib.pbkdf2_hmac('sha256', password.encode(), salt, 100000).hex()
    
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return hash_password(plain_password) == hashed_password
else:
    def hash_password(password: str) -> str:
        return bcrypt.hashpw(password.encode(), bcrypt.gensalt(12)).decode()
    
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        return bcrypt.checkpw(plain_password.encode(), hashed_password.encode())

try:
    import jwt
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
        except:
            return None
except ImportError:
    import base64
    import json
    def create_access_token(user_id: str, email: str, expires_delta: Optional[timedelta] = None) -> str:
        if expires_delta:
            expire = int((datetime.utcnow() + expires_delta).timestamp())
        else:
            expire = int((datetime.utcnow() + timedelta(days=JWT_EXPIRES_IN)).timestamp())
        
        payload = {
            "sub": user_id,
            "email": email,
            "exp": expire,
            "iat": int(datetime.utcnow().timestamp())
        }
        return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    
    def decode_token(token: str) -> Optional[Dict[str, Any]]:
        try:
            return json.loads(base64.urlsafe_b64decode(token.encode()))
        except:
            return None

async def create_user(email: str, password: str, name: Optional[str] = None) -> Dict[str, Any]:
    result = await convex_mutation("register", {"email": email, "password": password, "name": name})
    return result if result else {"error": "Failed to create user - Convex not configured"}

async def authenticate_user(email: str, password: str) -> Optional[Dict[str, Any]]:
    result = await convex_mutation("login", {"email": email, "password": password})
    if result and "user" in result:
        return result
    return None

async def get_user_by_id(user_id: str) -> Optional[Dict[str, Any]]:
    return await convex_query("getProfile", {})

async def get_user_projects(user_id: str) -> List[Dict[str, Any]]:
    return await convex_query("listProjects", {}) or []

async def create_project(user_id: str, name: str, description: Optional[str] = None, project_type: str = "code") -> Dict[str, Any]:
    result = await convex_mutation("createProject", {"name": name, "description": description, "type": project_type})
    return result if result else {"error": "Failed to create project"}

async def get_project_by_id(project_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    projects = await get_user_projects(user_id)
    for p in projects:
        if p.get("id") == project_id or p.get("_id") == project_id:
            return p
    return None

async def update_project(project_id: str, user_id: str, updates: Dict[str, Any]) -> Dict[str, Any]:
    result = await convex_mutation("updateProject", {"projectId": project_id, **updates})
    return result if result else {"error": "Failed to update project"}

async def delete_project(project_id: str, user_id: str) -> Dict[str, Any]:
    result = await convex_mutation("deleteProject", {"projectId": project_id})
    return result if result else {"error": "Failed to delete project"}

async def create_chat_session(user_id: str, project_id: Optional[str] = None, title: Optional[str] = None, model: str = "gemini-pro") -> Dict[str, Any]:
    result = await convex_mutation("createChatSession", {"title": title, "model": model})
    return result if result else {"error": "Failed to create chat session"}

async def get_user_chat_sessions(user_id: str, project_id: Optional[str] = None) -> List[Dict[str, Any]]:
    return await convex_query("listChatSessions", {}) or []

async def get_chat_session_by_id(session_id: str, user_id: str) -> Optional[Dict[str, Any]]:
    sessions = await get_user_chat_sessions(user_id)
    for s in sessions:
        if s.get("id") == session_id or s.get("_id") == session_id:
            return s
    return None

async def add_chat_message(session_id: str, role: str, content: str, metadata: Optional[Dict] = None) -> Dict[str, Any]:
    result = await convex_mutation("addChatMessage", {"sessionId": session_id, "role": role, "content": content, "metadata": metadata})
    return result if result else {"error": "Failed to add message"}

async def get_chat_messages(session_id: str) -> List[Dict[str, Any]]:
    return await convex_query("getChatMessages", {"sessionId": session_id}) or []

async def delete_chat_session(session_id: str, user_id: str) -> Dict[str, Any]:
    result = await convex_mutation("deleteChatSession", {"sessionId": session_id})
    return result if result else {"error": "Failed to delete session"}

"""
Neural Codex API Router

REST API endpoints for the Neural Codex persistent conversation system.
Connects to Convex database for storage.
"""

import os
from datetime import datetime
from typing import Optional, List
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel

# Convex client
CONVEX_URL = os.environ.get("CONVEX_URL", "https://amicable-chinchilla-987.convex.cloud")
CONVEX_AVAILABLE = False
convex_client = None

try:
    from convex import ConvexClient
    if CONVEX_URL:
        convex_client = ConvexClient(CONVEX_URL)
        CONVEX_AVAILABLE = True
        print(f"[CODEX] Connected to Convex: {CONVEX_URL[:50]}...")
except ImportError:
    print("[CODEX] Convex client not available, using local storage fallback")

router = APIRouter(prefix="/api/codex", tags=["Neural Codex"])

# ============================================
# PYDANTIC MODELS
# ============================================

class CreateThreadRequest(BaseModel):
    title: str
    projectId: Optional[str] = None
    tags: Optional[List[str]] = []

class UpdateThreadRequest(BaseModel):
    title: Optional[str] = None
    tags: Optional[List[str]] = None
    pinned: Optional[bool] = None
    archived: Optional[bool] = None

class AddMessageRequest(BaseModel):
    role: str  # 'user' | 'assistant' | 'system'
    content: str
    metadata: Optional[dict] = None

class AddAttachmentRequest(BaseModel):
    type: str  # 'code' | 'file' | 'screenshot' | 'voice' | 'link'
    content: Optional[str] = None
    fileUrl: Optional[str] = None
    fileName: Optional[str] = None
    language: Optional[str] = None

# ============================================
# LOCAL STORAGE FALLBACK
# ============================================

# In-memory storage for when Convex is unavailable
_local_threads: dict = {}
_local_messages: dict = {}
_local_attachments: dict = {}
_thread_counter = 0
_message_counter = 0

def _get_user_id():
    """Get current user ID - placeholder for auth integration"""
    return "local_user"

# ============================================
# THREAD ENDPOINTS
# ============================================

@router.get("/threads")
async def list_threads(
    includeArchived: bool = Query(False),
    tag: Optional[str] = Query(None),
    limit: Optional[int] = Query(None)
):
    """List all threads for the current user"""
    user_id = _get_user_id()
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            threads = convex_client.query("codex:listThreads", {
                "userId": user_id,
                "includeArchived": includeArchived,
                "tag": tag,
                "limit": limit
            })
            return threads or []
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    threads = list(_local_threads.values())
    if not includeArchived:
        threads = [t for t in threads if not t.get('archived')]
    if tag:
        threads = [t for t in threads if tag in t.get('tags', [])]
    threads.sort(key=lambda t: (-t.get('pinned', 0), -t.get('lastMessageAt', 0)))
    if limit:
        threads = threads[:limit]
    return threads

@router.get("/threads/{thread_id}")
async def get_thread(thread_id: str):
    """Get a single thread by ID"""
    if CONVEX_AVAILABLE and convex_client:
        try:
            thread = convex_client.query("codex:getThread", {"threadId": thread_id})
            if thread:
                return thread
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    if thread_id in _local_threads:
        return _local_threads[thread_id]
    raise HTTPException(status_code=404, detail="Thread not found")

@router.post("/threads")
async def create_thread(request: CreateThreadRequest):
    """Create a new thread"""
    global _thread_counter
    user_id = _get_user_id()
    now = int(datetime.now().timestamp() * 1000)
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            thread_id = convex_client.mutation("codex:createThread", {
                "userId": user_id,
                "title": request.title,
                "projectId": request.projectId,
                "tags": request.tags or []
            })
            return {"_id": thread_id, "title": request.title}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    _thread_counter += 1
    thread_id = f"local_{_thread_counter}"
    thread = {
        "_id": thread_id,
        "userId": user_id,
        "title": request.title,
        "projectId": request.projectId,
        "tags": request.tags or [],
        "pinned": False,
        "archived": False,
        "lastMessageAt": now,
        "messageCount": 0,
        "createdAt": now,
        "updatedAt": now
    }
    _local_threads[thread_id] = thread
    _local_messages[thread_id] = []
    return thread

@router.patch("/threads/{thread_id}")
async def update_thread(thread_id: str, request: UpdateThreadRequest):
    """Update thread metadata"""
    if CONVEX_AVAILABLE and convex_client:
        try:
            update_data = {"threadId": thread_id}
            if request.title is not None:
                update_data["title"] = request.title
            if request.tags is not None:
                update_data["tags"] = request.tags
            if request.pinned is not None:
                update_data["pinned"] = request.pinned
            if request.archived is not None:
                update_data["archived"] = request.archived
            
            convex_client.mutation("codex:updateThread", update_data)
            return {"success": True}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    if thread_id not in _local_threads:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    thread = _local_threads[thread_id]
    if request.title is not None:
        thread["title"] = request.title
    if request.tags is not None:
        thread["tags"] = request.tags
    if request.pinned is not None:
        thread["pinned"] = request.pinned
    if request.archived is not None:
        thread["archived"] = request.archived
    thread["updatedAt"] = int(datetime.now().timestamp() * 1000)
    return {"success": True}

@router.delete("/threads/{thread_id}")
async def delete_thread(thread_id: str):
    """Delete a thread and all its messages"""
    if CONVEX_AVAILABLE and convex_client:
        try:
            convex_client.mutation("codex:deleteThread", {"threadId": thread_id})
            return {"success": True}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    if thread_id in _local_threads:
        del _local_threads[thread_id]
        if thread_id in _local_messages:
            del _local_messages[thread_id]
        return {"success": True}
    raise HTTPException(status_code=404, detail="Thread not found")

@router.get("/threads/search")
async def search_threads(q: str = Query(...)):
    """Search threads by query"""
    user_id = _get_user_id()
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            results = convex_client.query("codex:searchThreads", {
                "userId": user_id,
                "query": q
            })
            return results or []
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    q_lower = q.lower()
    results = [
        t for t in _local_threads.values()
        if q_lower in t.get('title', '').lower() or
           any(q_lower in tag.lower() for tag in t.get('tags', []))
    ]
    return results

# ============================================
# MESSAGE ENDPOINTS
# ============================================

@router.get("/threads/{thread_id}/messages")
async def list_messages(thread_id: str, limit: Optional[int] = Query(None)):
    """List messages in a thread"""
    if CONVEX_AVAILABLE and convex_client:
        try:
            messages = convex_client.query("codex:listMessages", {
                "threadId": thread_id,
                "limit": limit
            })
            return messages or []
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    messages = _local_messages.get(thread_id, [])
    if limit:
        messages = messages[-limit:]
    return messages

@router.post("/threads/{thread_id}/messages")
async def add_message(thread_id: str, request: AddMessageRequest):
    """Add a message to a thread"""
    global _message_counter
    now = int(datetime.now().timestamp() * 1000)
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            message_id = convex_client.mutation("codex:addMessage", {
                "threadId": thread_id,
                "role": request.role,
                "content": request.content,
                "metadata": request.metadata
            })
            return {"_id": message_id, "content": request.content}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    if thread_id not in _local_threads:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    _message_counter += 1
    message_id = f"msg_{_message_counter}"
    message = {
        "_id": message_id,
        "threadId": thread_id,
        "role": request.role,
        "content": request.content,
        "metadata": request.metadata,
        "createdAt": now,
        "attachments": []
    }
    
    if thread_id not in _local_messages:
        _local_messages[thread_id] = []
    _local_messages[thread_id].append(message)
    
    # Update thread stats
    thread = _local_threads[thread_id]
    thread["lastMessageAt"] = now
    thread["messageCount"] = len(_local_messages[thread_id])
    thread["preview"] = request.content[:100]
    
    return message

# ============================================
# ATTACHMENT ENDPOINTS
# ============================================

@router.post("/messages/{message_id}/attachments")
async def add_attachment(message_id: str, request: AddAttachmentRequest):
    """Add an attachment to a message"""
    now = int(datetime.now().timestamp() * 1000)
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            attachment_id = convex_client.mutation("codex:addAttachment", {
                "messageId": message_id,
                "type": request.type,
                "content": request.content,
                "fileUrl": request.fileUrl,
                "fileName": request.fileName,
                "language": request.language
            })
            return {"_id": attachment_id}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback - find message and add attachment
    for thread_messages in _local_messages.values():
        for msg in thread_messages:
            if msg["_id"] == message_id:
                attachment = {
                    "_id": f"att_{now}",
                    "messageId": message_id,
                    "type": request.type,
                    "content": request.content,
                    "fileUrl": request.fileUrl,
                    "fileName": request.fileName,
                    "language": request.language,
                    "createdAt": now
                }
                if "attachments" not in msg:
                    msg["attachments"] = []
                msg["attachments"].append(attachment)
                return attachment
    
    raise HTTPException(status_code=404, detail="Message not found")

# ============================================
# STATS & INSIGHTS
# ============================================

@router.get("/stats")
async def get_stats():
    """Get user's Codex statistics"""
    user_id = _get_user_id()
    
    if CONVEX_AVAILABLE and convex_client:
        try:
            stats = convex_client.query("codex:getStats", {"userId": user_id})
            return stats or {}
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback
    threads = list(_local_threads.values())
    total_messages = sum(len(_local_messages.get(t["_id"], [])) for t in threads)
    
    # Collect tags
    all_tags = []
    for t in threads:
        all_tags.extend(t.get("tags", []))
    unique_tags = list(set(all_tags))
    
    return {
        "totalThreads": len(threads),
        "activeThreads": len([t for t in threads if not t.get("archived")]),
        "pinnedThreads": len([t for t in threads if t.get("pinned")]),
        "archivedThreads": len([t for t in threads if t.get("archived")]),
        "totalMessages": total_messages,
        "uniqueTags": len(unique_tags),
        "topTags": unique_tags[:10]
    }

@router.get("/threads/{thread_id}/related")
async def get_related_threads(thread_id: str):
    """Get threads related to the given thread"""
    if CONVEX_AVAILABLE and convex_client:
        try:
            related = convex_client.query("codex:getRelatedThreads", {"threadId": thread_id})
            return related or []
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
    
    # Local fallback - find threads with overlapping tags
    if thread_id not in _local_threads:
        return []
    
    thread = _local_threads[thread_id]
    thread_tags = set(thread.get("tags", []))
    
    related = []
    for t in _local_threads.values():
        if t["_id"] != thread_id:
            t_tags = set(t.get("tags", []))
            if thread_tags & t_tags:  # Intersection
                related.append(t)
    
    return related[:5]

# ============================================
# EXPORT
# ============================================

@router.get("/threads/{thread_id}/export")
async def export_thread(thread_id: str, format: str = Query("markdown")):
    """Export a thread in various formats"""
    # Get thread and messages
    if CONVEX_AVAILABLE and convex_client:
        try:
            thread = convex_client.query("codex:getThread", {"threadId": thread_id})
            messages = convex_client.query("codex:listMessages", {"threadId": thread_id})
        except Exception as e:
            print(f"[CODEX] Convex error: {e}")
            thread = _local_threads.get(thread_id)
            messages = _local_messages.get(thread_id, [])
    else:
        thread = _local_threads.get(thread_id)
        messages = _local_messages.get(thread_id, [])
    
    if not thread:
        raise HTTPException(status_code=404, detail="Thread not found")
    
    if format == "json":
        return {"thread": thread, "messages": messages}
    
    # Markdown export
    md_lines = [
        f"# {thread.get('title', 'Untitled Thread')}",
        "",
        f"**Tags:** {', '.join(f'#{t}' for t in thread.get('tags', []))}",
        f"**Created:** {datetime.fromtimestamp(thread.get('createdAt', 0) / 1000).strftime('%Y-%m-%d %H:%M')}",
        f"**Messages:** {thread.get('messageCount', len(messages))}",
        "",
        "---",
        ""
    ]
    
    for msg in messages:
        role = msg.get("role", "user").upper()
        content = msg.get("content", "")
        timestamp = datetime.fromtimestamp(msg.get("createdAt", 0) / 1000).strftime('%H:%M:%S')
        
        md_lines.append(f"### [{timestamp}] {role}")
        md_lines.append("")
        md_lines.append(content)
        md_lines.append("")
        
        # Attachments
        for att in msg.get("attachments", []):
            md_lines.append(f"> 📎 {att.get('fileName', att.get('type', 'Attachment'))}")
        
        md_lines.append("")
    
    return {"content": "\n".join(md_lines), "format": "markdown"}

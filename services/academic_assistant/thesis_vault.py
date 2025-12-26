from fastapi import APIRouter, HTTPException, Body
from pydantic import BaseModel, Field
from pathlib import Path
import sqlite3
import json
from datetime import datetime
from typing import Optional, List, Dict, Any

# Import your docx builder
try:
    from .docx_builder import build_thesis, build_simple_doc
except ImportError:
    from docx_builder import build_thesis, build_simple_doc

from fastapi.responses import FileResponse
import os

router = APIRouter(prefix="/vault")

VAULT_DIR = Path("academic_vault")
VAULT_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = VAULT_DIR / "research.db"

def get_connection():
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

# Initialize DB with refined schema
def init_db():
    with get_connection() as conn:
        conn.execute("""
        CREATE TABLE IF NOT EXISTS projects (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS research_maps (
            project_id TEXT PRIMARY KEY,
            title TEXT,
            map_data JSON,
            contribution_log JSON DEFAULT '{}',
            timestamp TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )
        """)
        conn.execute("""
        CREATE TABLE IF NOT EXISTS expert_verdicts (
            id TEXT PRIMARY KEY,
            project_id TEXT,
            verdict_data JSON,
            timestamp TEXT,
            FOREIGN KEY(project_id) REFERENCES projects(id)
        )
        """)
        conn.commit()

init_db()

class ResearchArchive(BaseModel):
    project_id: str
    title: Optional[str] = "Untitled Map"
    map_data: Dict[str, Any]
    contribution_log: Optional[Dict[str, Any]] = Field(default_factory=dict)

@router.post("/archive")
async def archive_research(archive: ResearchArchive):
    """
    Saves or updates a Research Map with ethical contribution logging.
    """
    try:
        data = json.dumps(archive.map_data)
        log = json.dumps(archive.contribution_log)
        timestamp = datetime.now().isoformat()
        
        with get_connection() as conn:
            # Ensure project exists
            conn.execute(
                "INSERT OR IGNORE INTO projects (id, name) VALUES (?, ?)",
                (archive.project_id, archive.title or "Untitled Project")
            )
            
            conn.execute("""
            INSERT INTO research_maps (project_id, title, map_data, contribution_log, timestamp)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(project_id) DO UPDATE SET
                title = excluded.title,
                map_data = excluded.map_data,
                contribution_log = excluded.contribution_log,
                timestamp = excluded.timestamp
            """, (archive.project_id, archive.title, data, log, timestamp))
            conn.commit()
            
        return {"status": "archived", "project_id": archive.project_id, "timestamp": timestamp}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/list/{project_id}")
async def get_archive(project_id: str):
    """
    Retrieves the research map and contribution log for a project.
    """
    with get_connection() as conn:
        row = conn.execute(
            "SELECT title, map_data, contribution_log, timestamp FROM research_maps WHERE project_id = ?", 
            (project_id,)
        ).fetchone()
        
        if not row:
            # Return empty structure if not found
            return {"map_data": {}, "contribution_log": {}, "title": "New Project"}
            
        return {
            "title": row["title"],
            "map_data": json.loads(row["map_data"]), 
            "contribution_log": json.loads(row["contribution_log"]),
            "timestamp": row["timestamp"]
        }

@router.get("/projects")
async def list_projects():
    """
    Lists all active academic projects.
    """
    with get_connection() as conn:
        rows = conn.execute("SELECT id, name, created_at FROM projects").fetchall()
        return [dict(row) for row in rows]

@router.post("/synthesize")
async def synthesize_thesis(project_id: str = Body(embed=True)):
    """
    Triggers the DOCX builder using the latest Research Map.
    """
    with get_connection() as conn:
        row = conn.execute("SELECT map_data FROM research_maps WHERE project_id = ?", (project_id,)).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="No research map found for this project.")
        
        map_data = json.loads(row["map_data"])
        # Ensure project id is in the map for filename generation
        map_data['id'] = project_id
        
        try:
            output_path = build_thesis(map_data)
            return {
                "success": True, 
                "file": os.path.abspath(output_path),
                "filename": os.path.basename(output_path),
                "message": "Thesis DOCX synthesized successfully."
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Synthesis failed: {str(e)}")

class ExportRequest(BaseModel):
    title: str
    content: str

@router.post("/export-docx")
async def export_docx(req: ExportRequest):
    """
    Exports a simple title + markdown content string to a DOCX file.
    """
    try:
        filename, output_path = build_simple_doc(req.title, req.content)
        return FileResponse(
            path=output_path,
            filename=filename,
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Export failed: {str(e)}")

@router.post("/synthesize-direct")
async def synthesize_direct(req: Dict[str, Any]):
    """
    Synthesizes a thesis directly from the provided project JSON data.
    Used for live export from the UI.
    """
    try:
        # Ensure it's a dict
        data = req
        output_path = build_thesis(data)
        return FileResponse(
            path=os.path.abspath(output_path),
            filename=os.path.basename(output_path),
            media_type='application/vnd.openxmlformats-officedocument.wordprocessingml.document'
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Direct synthesis failed: {str(e)}")

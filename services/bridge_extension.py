
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

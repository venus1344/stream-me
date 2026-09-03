import asyncio
import json
import os
import re
import threading
import time
import urllib.request
import uuid
from contextlib import asynccontextmanager
from pathlib import Path

from fastapi import Depends, FastAPI, HTTPException, Query, Request, UploadFile, File, WebSocket, WebSocketDisconnect, status
from fastapi.responses import StreamingResponse
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from fastapi.middleware.cors import CORSMiddleware
from jose import JWTError, jwt
from pydantic import BaseModel

from manager import RestreamManager, DATA_DIR

JWT_SECRET = os.environ["JWT_SECRET"]
ALGORITHM = "HS256"
# Model B: this worker serves a single tenant. When TENANT_ID is set, only that
# tenant's users (plus platform superusers) may call this worker's API.
TENANT_ID = os.environ.get("TENANT_ID", "").strip()
API_URL = os.environ.get("API_URL", "").strip()
SERVER_ID = os.environ.get("SERVER_ID", "").strip()
SERVER_TOKEN = os.environ.get("SERVER_TOKEN", "").strip()
UPLOAD_MAX_BYTES = int(os.getenv("UPLOAD_MAX_BYTES", str(10 * 1024 ** 3)))  # 10 GB default


def _bootstrap_tenant():
    """Resolve this worker's tenant from the control plane (Model B)."""
    global TENANT_ID
    if not (API_URL and SERVER_ID and SERVER_TOKEN):
        return
    try:
        req = urllib.request.Request(
            f"{API_URL.rstrip('/')}/api/servers/bootstrap",
            data=json.dumps({"server_id": SERVER_ID, "token": SERVER_TOKEN}).encode("utf-8"),
            headers={"Content-Type": "application/json"},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = json.loads(resp.read().decode("utf-8") or "{}")
        tenant_id = data.get("tenant_id")
        if tenant_id:
            TENANT_ID = tenant_id
            print(f"[bootstrap] bound to tenant {tenant_id}")
        else:
            print("[bootstrap] server not yet assigned to a tenant")
        limits = data.get("limits") or {}
        if limits:
            manager.set_limits(limits)
            print(f"[bootstrap] plan limits: {limits}")
    except Exception as e:
        print(f"[bootstrap] failed: {e}")
CHUNK_SIZE = 256 * 1024  # 256 KB read buffer
CLIPS_DIR = DATA_DIR / "clips"

ALLOWED_EXTENSIONS = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".ts", ".avi"}

@asynccontextmanager
async def lifespan(app: FastAPI):
    _bootstrap_tenant()
    yield


app = FastAPI(lifespan=lifespan)
manager = RestreamManager()
bearer = HTTPBearer()

# CORS — the browser frontend calls the worker directly (Model B direct routing).
# Auth is via Authorization header (no cookies), so wildcard origins are safe.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# upload_sessions: { upload_id: { filename, path, total, received, done, error } }
_upload_sessions: dict = {}
_sessions_lock = threading.Lock()


# ── auth ─────────────────────────────────────────────────────────────────────

def _authorize_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="invalid token")
    if TENANT_ID and payload.get("role") != "superuser" and payload.get("tenant_id") != TENANT_ID:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="not allowed on this server")
    return payload


def require_auth(credentials: HTTPAuthorizationCredentials = Depends(bearer)) -> dict:
    return _authorize_token(credentials.credentials)


Auth = Depends(require_auth)


# ── health ────────────────────────────────────────────────────────────────────

@app.get("/healthz")
def healthz():
    return {"ok": True}


# ── live WebSocket ────────────────────────────────────────────────────────────

@app.websocket("/api/restream/ws")
async def ws_live(websocket: WebSocket, token: str = Query(...)):
    """Push destinations + logs every second. Auth via ?token= query param."""
    try:
        _authorize_token(token)
    except HTTPException as e:
        await websocket.close(code=4001, reason=str(e.detail))
        return

    await websocket.accept()
    try:
        while True:
            snap = manager.snapshot()
            await websocket.send_json({
                "destinations": snap.get("destinations", {}),
                "logs": snap.get("logs", {}),
                "runningTargets": snap.get("status", {}).get("runningTargets", []),
                "targets": snap.get("status", {}).get("targets", []),
            })
            await asyncio.sleep(1)
    except (WebSocketDisconnect, Exception):
        pass


# ── restream status ───────────────────────────────────────────────────────────

@app.get("/api/restream/status", dependencies=[Auth])
def get_status():
    return manager.snapshot()


@app.get("/api/restream/relay-health", dependencies=[Auth])
def relay_health():
    return manager.relay_health()


# ── offline scenes ────────────────────────────────────────────────────────────

@app.get("/api/restream/offline-scenes", dependencies=[Auth])
def list_offline_scenes():
    return manager.list_offline_scenes()


@app.post("/api/restream/offline-scenes/upload", dependencies=[Auth])
async def upload_offline_scene(file: UploadFile = File(...)):
    try:
        return manager.save_offline_scene_upload(file.filename, file.file)
    except ValueError as e:
        raise HTTPException(400, str(e))


class NameBody(BaseModel):
    name: str


@app.post("/api/restream/offline-scenes/select", dependencies=[Auth])
def select_offline_scene(body: NameBody):
    try:
        return manager.select_offline_scene(body.name)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/restream/offline-scenes/delete", dependencies=[Auth])
def delete_offline_scene(body: NameBody):
    try:
        return manager.delete_offline_scene(body.name)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── global restream config / start / stop ─────────────────────────────────────

@app.post("/api/restream/config", dependencies=[Auth])
def update_config(patch: dict):
    return manager.update_config(patch)


@app.post("/api/restream/start", dependencies=[Auth])
def start_all(patch: dict = {}):
    return manager.start_all(patch)


@app.post("/api/restream/stop", dependencies=[Auth])
def stop_all():
    return manager.stop_all()


# ── per-destination ───────────────────────────────────────────────────────────

@app.post("/api/restream/{destination}/config", dependencies=[Auth])
def update_destination_config(destination: str, patch: dict):
    try:
        return manager.update_destination(destination, patch)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/restream/{destination}/start", dependencies=[Auth])
def start_destination(destination: str, patch: dict = {}):
    try:
        return manager.start(destination, patch)
    except ValueError as e:
        raise HTTPException(400, str(e))


@app.post("/api/restream/{destination}/stop", dependencies=[Auth])
def stop_destination(destination: str):
    try:
        return manager.stop(destination)
    except ValueError as e:
        raise HTTPException(400, str(e))


# ── clip upload ───────────────────────────────────────────────────────────────

def _safe_clip_filename(filename: str) -> str:
    name = Path(str(filename or "")).name.strip()
    if not name:
        raise ValueError("filename is required")
    name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
    if Path(name).suffix.lower() not in ALLOWED_EXTENSIONS:
        raise ValueError(f"unsupported file type; allowed: {', '.join(sorted(ALLOWED_EXTENSIONS))}")
    return name


def _session(upload_id: str) -> dict:
    with _sessions_lock:
        s = _upload_sessions.get(upload_id)
    if not s:
        raise HTTPException(404, "upload session not found")
    return s


@app.post("/api/clips/upload/start", dependencies=[Auth])
def upload_start(body: NameBody):
    safe_name = _safe_clip_filename(body.name)
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    upload_id = str(uuid.uuid4())
    tmp_path = CLIPS_DIR / f".tmp.{upload_id}.{safe_name}"
    with _sessions_lock:
        _upload_sessions[upload_id] = {
            "filename": safe_name,
            "path": tmp_path,
            "final_path": CLIPS_DIR / safe_name,
            "total": None,
            "received": 0,
            "started_at": time.time(),
            "done": False,
            "error": None,
        }
    return {"uploadId": upload_id, "maxBytes": UPLOAD_MAX_BYTES}


@app.post("/api/clips/upload/{upload_id}/chunk", dependencies=[Auth])
async def upload_chunk(upload_id: str, request: Request):
    s = _session(upload_id)
    if s["done"] or s["error"]:
        raise HTTPException(400, "upload already finished")

    content_range = request.headers.get("Content-Range")  # bytes start-end/total
    if content_range:
        try:
            _, range_spec = content_range.split(" ", 1)
            byte_range, total_str = range_spec.rsplit("/", 1)
            total = int(total_str)
            if total > UPLOAD_MAX_BYTES:
                _fail_session(s, "file exceeds maximum allowed size")
                raise HTTPException(413, "file exceeds maximum allowed size")
            with _sessions_lock:
                s["total"] = total
        except (ValueError, AttributeError):
            pass

    try:
        with open(s["path"], "ab") as f:
            async for chunk in request.stream():
                f.write(chunk)
                with _sessions_lock:
                    s["received"] += len(chunk)
                    if s["total"] and s["received"] > s["total"]:
                        s["received"] = s["total"]
    except Exception as e:
        _fail_session(s, str(e))
        raise HTTPException(500, f"write error: {e}")

    received = s["received"]
    total = s["total"]
    percent = round(received / total * 100, 1) if total else None
    elapsed = time.time() - s["started_at"]
    speed_bps = received / elapsed if elapsed > 0 else 0

    return {
        "received": received,
        "total": total,
        "percent": percent,
        "speed": _fmt_speed(speed_bps),
    }


@app.post("/api/clips/upload/{upload_id}/complete", dependencies=[Auth])
def upload_complete(upload_id: str):
    s = _session(upload_id)
    if s["error"]:
        raise HTTPException(400, s["error"])
    try:
        Path(s["path"]).replace(s["final_path"])
    except Exception as e:
        _fail_session(s, str(e))
        raise HTTPException(500, f"could not finalize upload: {e}")
    with _sessions_lock:
        s["done"] = True
    stat = s["final_path"].stat()
    return {
        "filename": s["filename"],
        "size": stat.st_size,
        "path": str(s["final_path"]),
    }


@app.delete("/api/clips/upload/{upload_id}", dependencies=[Auth])
def upload_cancel(upload_id: str):
    s = _session(upload_id)
    _cleanup_session(upload_id, s)
    return {"ok": True}


@app.get("/api/clips/upload/{upload_id}/progress", dependencies=[Auth])
async def upload_progress(upload_id: str):
    """SSE stream — pushes progress events until done or error."""
    s = _session(upload_id)

    async def event_stream():
        while True:
            with _sessions_lock:
                received = s["received"]
                total = s["total"]
                done = s["done"]
                error = s["error"]

            elapsed = time.time() - s["started_at"]
            speed_bps = received / elapsed if elapsed > 0 else 0
            percent = round(received / total * 100, 1) if total else None

            event = {
                "uploadId": upload_id,
                "received": received,
                "total": total,
                "percent": percent,
                "speed": _fmt_speed(speed_bps),
                "done": done,
                "error": error,
            }
            yield f"data: {json.dumps(event)}\n\n"

            if done or error:
                break
            await asyncio.sleep(0.5)

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",  # disable nginx buffering for SSE
        },
    )


@app.get("/api/clips", dependencies=[Auth])
def list_clips():
    CLIPS_DIR.mkdir(parents=True, exist_ok=True)
    clips = []
    for path in sorted(CLIPS_DIR.iterdir(), key=lambda p: p.stat().st_mtime, reverse=True):
        if not path.is_file() or path.name.startswith("."):
            continue
        stat = path.stat()
        clips.append({
            "name": path.name,
            "size": stat.st_size,
            "modifiedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime)),
        })
    return {"clips": clips}


@app.delete("/api/clips/{filename}", dependencies=[Auth])
def delete_clip(filename: str):
    safe_name = _safe_clip_filename(filename)
    path = CLIPS_DIR / safe_name
    if not path.exists() or not path.is_file():
        raise HTTPException(404, "clip not found")
    path.unlink()
    return {"ok": True}


# ── helpers ───────────────────────────────────────────────────────────────────

def _fail_session(s: dict, error: str):
    with _sessions_lock:
        s["error"] = error
    try:
        Path(s["path"]).unlink(missing_ok=True)
    except OSError:
        pass


def _cleanup_session(upload_id: str, s: dict):
    with _sessions_lock:
        _upload_sessions.pop(upload_id, None)
    try:
        Path(s["path"]).unlink(missing_ok=True)
    except OSError:
        pass


def _fmt_speed(bps: float) -> str:
    if bps >= 1024 ** 2:
        return f"{bps / 1024 ** 2:.1f} MB/s"
    if bps >= 1024:
        return f"{bps / 1024:.1f} KB/s"
    return f"{bps:.0f} B/s"

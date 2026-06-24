import json
import os
import shlex
import signal
import subprocess
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path

DATA_DIR = Path("/data")
CONFIG_PATH = DATA_DIR / "restream-config.json"
LOG_PATH = DATA_DIR / "restream.log"
HOST = "0.0.0.0"
PORT = int(os.getenv("RESTREAM_CONTROL_PORT", "8099"))

def default_config():
    return {
        "inputUrl": f"rtmp://{os.getenv('RELAY_INPUT_HOST', '127.0.0.1:1936')}/{os.getenv('RELAY_INPUT_APP', 'stream')}/{os.getenv('RELAY_INPUT_STREAM_KEY', 'input')}",
        "omeUrl": f"rtmp://{os.getenv('OME_RTMP_HOST', '127.0.0.1:1935')}/{os.getenv('OME_RELAY_APP', 'app')}/{os.getenv('OME_RELAY_STREAM_KEY', 'key')}",
        "youtubeUrl": os.getenv("YOUTUBE_RTMPS_URL", "rtmps://a.rtmp.youtube.com/live2").rstrip("/"),
        "youtubeKey": os.getenv("YOUTUBE_STREAM_KEY", ""),
        "videoBitrateKbps": int(os.getenv("YOUTUBE_VIDEO_BITRATE_KBPS", "6000")),
        "audioBitrateKbps": int(os.getenv("YOUTUBE_AUDIO_BITRATE_KBPS", "160")),
        "maxrateKbps": int(os.getenv("YOUTUBE_MAXRATE_KBPS", "6000")),
        "bufsizeKbps": int(os.getenv("YOUTUBE_BUFSIZE_KBPS", "12000")),
        "fps": int(os.getenv("YOUTUBE_FPS", "30")),
        "gopSeconds": int(os.getenv("YOUTUBE_GOP_SECONDS", "2")),
        "preset": os.getenv("YOUTUBE_PRESET", "veryfast"),
        "scaleHeight": int(os.getenv("YOUTUBE_SCALE_HEIGHT", "1080")),
        "extraArgs": "",
    }

class RestreamManager:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.proc = None
        self.started_at = None
        self.last_exit_code = None
        self.config = self._load_config()

    def _load_config(self):
        if CONFIG_PATH.exists():
            loaded = json.loads(CONFIG_PATH.read_text(encoding="utf-8"))
            cfg = default_config()
            cfg.update(loaded)
            return cfg
        cfg = default_config()
        self._save_config(cfg)
        return cfg

    def _save_config(self, cfg):
        CONFIG_PATH.write_text(json.dumps(cfg, indent=2), encoding="utf-8")

    def update_config(self, patch):
        with self.lock:
            self.config.update(patch)
            self._save_config(self.config)
            return self.snapshot()

    def _youtube_target(self):
        key = self.config.get("youtubeKey", "").strip()
        url = self.config.get("youtubeUrl", "").strip().rstrip("/")
        return f"{url}/{key}" if key and url else None

    def _build_command(self):
        cfg = self.config
        cmd = ["ffmpeg", "-hide_banner", "-loglevel", "info", "-fflags", "+genpts", "-i", cfg["inputUrl"], "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy", "-f", "flv", cfg["omeUrl"]]
        target = self._youtube_target()
        if target:
            gop_frames = max(1, int(cfg["fps"]) * max(1, int(cfg["gopSeconds"])))
            cmd.extend(["-map", "0:v:0", "-map", "0:a:0?", "-c:v", "libx264", "-preset", cfg["preset"], "-pix_fmt", "yuv420p", "-r", str(cfg["fps"]), "-g", str(gop_frames), "-keyint_min", str(gop_frames), "-sc_threshold", "0", "-b:v", f"{cfg['videoBitrateKbps']}k", "-maxrate", f"{cfg['maxrateKbps']}k", "-bufsize", f"{cfg['bufsizeKbps']}k", "-c:a", "aac", "-ar", "48000", "-b:a", f"{cfg['audioBitrateKbps']}k"])
            if int(cfg.get("scaleHeight", 0) or 0) > 0:
                cmd.extend(["-vf", f"scale=-2:{int(cfg['scaleHeight'])}"])
            extra = cfg.get("extraArgs", "").strip()
            if extra:
                cmd.extend(shlex.split(extra))
            cmd.extend(["-f", "flv", target])
        return cmd

    def start(self, maybe_patch=None):
        with self.lock:
            if maybe_patch:
                self.config.update(maybe_patch)
                self._save_config(self.config)
            if self.proc and self.proc.poll() is None:
                return self.snapshot()
            with LOG_PATH.open("a", encoding="utf-8") as log:
                log.write(f"\\n=== start {time.strftime('%Y-%m-%d %H:%M:%S')} ===\\n")
            handle = LOG_PATH.open("a", encoding="utf-8")
            self.proc = subprocess.Popen(self._build_command(), stdout=handle, stderr=subprocess.STDOUT)
            self.started_at = time.strftime("%Y-%m-%d %H:%M:%S")
            self.last_exit_code = None
            return self.snapshot()

    def stop(self):
        with self.lock:
            if self.proc and self.proc.poll() is None:
                self.proc.terminate()
                try:
                    self.proc.wait(timeout=8)
                except subprocess.TimeoutExpired:
                    self.proc.kill()
                    self.proc.wait(timeout=3)
                self.last_exit_code = self.proc.returncode
            self.proc = None
            self.started_at = None
            return self.snapshot()

    def snapshot(self):
        running = self.proc is not None and self.proc.poll() is None
        if self.proc is not None and not running:
            self.last_exit_code = self.proc.returncode
        return {"config": self.config, "status": {"running": running, "pid": self.proc.pid if running else None, "startedAt": self.started_at, "lastExitCode": self.last_exit_code}, "logs": self.read_logs()}

    def read_logs(self, limit=16000):
        if not LOG_PATH.exists():
            return ""
        data = LOG_PATH.read_text(encoding="utf-8", errors="replace")
        return data[-limit:]

manager = RestreamManager()

class Handler(BaseHTTPRequestHandler):
    def _send(self, status, body, content_type):
        body_bytes = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(len(body_bytes)))
        self.end_headers()
        self.wfile.write(body_bytes)
    def _json(self, status, payload):
        self._send(status, json.dumps(payload), "application/json")
    def do_GET(self):
        if self.path == "/api/restream/status":
            return self._json(200, manager.snapshot())
        if self.path == "/healthz":
            return self._send(200, "ok\n", "text/plain")
        return self._send(404, "not found", "text/plain")
    def do_POST(self):
        length = int(self.headers.get("Content-Length", "0"))
        raw = self.rfile.read(length) if length else b"{}"
        try:
            payload = json.loads(raw.decode("utf-8"))
        except json.JSONDecodeError:
            return self._send(400, "invalid json", "text/plain")
        if self.path == "/api/restream/config":
            return self._json(200, manager.update_config(payload))
        if self.path == "/api/restream/start":
            return self._json(200, manager.start(payload))
        if self.path == "/api/restream/stop":
            return self._json(200, manager.stop())
        return self._send(404, "not found", "text/plain")
    def log_message(self, format, *args):
        return

def main():
    server = ThreadingHTTPServer((HOST, PORT), Handler)
    def shutdown(_sig, _frame):
        try:
            manager.stop()
        finally:
            server.shutdown()
    signal.signal(signal.SIGTERM, shutdown)
    signal.signal(signal.SIGINT, shutdown)
    server.serve_forever()

if __name__ == "__main__":
    main()

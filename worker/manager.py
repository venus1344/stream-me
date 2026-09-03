import json
import os
import re
import shlex
import subprocess
import threading
import time
from pathlib import Path
from urllib.parse import urlparse

from secretbox import decrypt, encrypt

DATA_DIR = Path("/data")
DB_PATH = DATA_DIR / "restream.db"
OFFLINE_SCENE_DIR = DATA_DIR / "offline-scenes"
OFFLINE_SCENE_CACHE_DIR = OFFLINE_SCENE_DIR / ".cache"

DESTINATIONS = ("youtube", "facebook", "instagram")

# Config fields that hold credentials and must be encrypted at rest.
SECRET_FIELDS = {f"{name}Key" for name in DESTINATIONS}


def obs_relay_health_url():
    host = os.getenv("OBS_RELAY_HEALTH_HOST", "127.0.0.1:1936")
    app = os.getenv("OBS_RELAY_HEALTH_APP", "restream")
    key = os.getenv("OBS_RELAY_HEALTH_STREAM_KEY", "input")
    return os.getenv("OBS_RELAY_HEALTH_URL", f"rtmp://{host}/{app}/{key}")


def common_input_url():
    host = os.getenv("RELAY_INPUT_HOST", "127.0.0.1:1936")
    app = os.getenv("RELAY_INPUT_APP", "restream")
    key = os.getenv("RELAY_INPUT_STREAM_KEY", "input")
    return f"rtmp://{host}/{app}/{key}"


def default_config():
    return {
        "inputUrl": common_input_url(),
        "youtubeUrl": os.getenv("YOUTUBE_RTMPS_URL", "rtmp://a.rtmp.youtube.com/live2").rstrip("/"),
        "youtubeKey": os.getenv("YOUTUBE_STREAM_KEY", ""),
        "youtubeVideoBitrateKbps": int(os.getenv("YOUTUBE_VIDEO_BITRATE_KBPS", "3500")),
        "youtubeAudioBitrateKbps": int(os.getenv("YOUTUBE_AUDIO_BITRATE_KBPS", "128")),
        "youtubeMaxrateKbps": int(os.getenv("YOUTUBE_MAXRATE_KBPS", "4500")),
        "youtubeBufsizeKbps": int(os.getenv("YOUTUBE_BUFSIZE_KBPS", "9000")),
        "youtubeFps": int(os.getenv("YOUTUBE_FPS", "30")),
        "youtubeGopSeconds": int(os.getenv("YOUTUBE_GOP_SECONDS", "2")),
        "youtubePreset": os.getenv("YOUTUBE_PRESET", "ultrafast"),
        "youtubeVideoFilter": os.getenv("YOUTUBE_VIDEO_FILTER", "scale=-2:720"),
        "youtubeExtraArgs": "",
        "youtubeCopyMode": int(os.getenv("YOUTUBE_COPY_MODE", "1")),
        "youtubeHoldOnStop": int(os.getenv("YOUTUBE_HOLD_ON_STOP", "1")),
        "youtubeHoldSeconds": int(os.getenv("YOUTUBE_HOLD_SECONDS", "30")),
        "youtubeHoldWidth": int(os.getenv("YOUTUBE_HOLD_WIDTH", "1280")),
        "youtubeHoldHeight": int(os.getenv("YOUTUBE_HOLD_HEIGHT", "720")),
        "youtubeHoldFps": int(os.getenv("YOUTUBE_HOLD_FPS", "30")),
        "youtubeHoldVideoBitrateKbps": int(os.getenv("YOUTUBE_HOLD_VIDEO_BITRATE_KBPS", "1500")),
        "youtubeHoldAudioBitrateKbps": int(os.getenv("YOUTUBE_HOLD_AUDIO_BITRATE_KBPS", "128")),
        "youtubeOfflineSceneEnabled": int(os.getenv("YOUTUBE_OFFLINE_SCENE_ENABLED", "1")),
        "youtubeOfflineSceneFile": os.getenv("YOUTUBE_OFFLINE_SCENE_FILE", ""),
        "youtubeOfflineSceneFadeSeconds": int(os.getenv("YOUTUBE_OFFLINE_SCENE_FADE_SECONDS", "2")),
        "youtubeOfflineScenePollSeconds": int(os.getenv("YOUTUBE_OFFLINE_SCENE_POLL_SECONDS", "5")),
        "youtubeOfflineSceneVideoBitrateKbps": int(os.getenv("YOUTUBE_OFFLINE_SCENE_VIDEO_BITRATE_KBPS", "2500")),
        "youtubeOfflineSceneAudioBitrateKbps": int(os.getenv("YOUTUBE_OFFLINE_SCENE_AUDIO_BITRATE_KBPS", "128")),
        "youtubeOfflineSceneLoopCrossfadeEnabled": int(os.getenv("YOUTUBE_OFFLINE_SCENE_LOOP_CROSSFADE_ENABLED", "1")),
        "youtubeOfflineSceneLoopCrossfadeSeconds": int(os.getenv("YOUTUBE_OFFLINE_SCENE_LOOP_CROSSFADE_SECONDS", "1")),
        "facebookUrl": os.getenv("FACEBOOK_RTMPS_URL", "rtmps://live-api-s.facebook.com:443/rtmp").rstrip("/"),
        "facebookKey": os.getenv("FACEBOOK_STREAM_KEY", ""),
        "facebookVideoBitrateKbps": int(os.getenv("FACEBOOK_VIDEO_BITRATE_KBPS", "2500")),
        "facebookAudioBitrateKbps": int(os.getenv("FACEBOOK_AUDIO_BITRATE_KBPS", "128")),
        "facebookMaxrateKbps": int(os.getenv("FACEBOOK_MAXRATE_KBPS", "3200")),
        "facebookBufsizeKbps": int(os.getenv("FACEBOOK_BUFSIZE_KBPS", "6400")),
        "facebookFps": int(os.getenv("FACEBOOK_FPS", "30")),
        "facebookGopSeconds": int(os.getenv("FACEBOOK_GOP_SECONDS", "2")),
        "facebookPreset": os.getenv("FACEBOOK_PRESET", "ultrafast"),
        "facebookVideoFilter": os.getenv("FACEBOOK_VIDEO_FILTER", "transpose=1,scale=-2:1280"),
        "facebookExtraArgs": "",
        "instagramUrl": os.getenv("INSTAGRAM_RTMPS_URL", "rtmps://live-upload.instagram.com:443/rtmp").rstrip("/"),
        "instagramKey": os.getenv("INSTAGRAM_STREAM_KEY", ""),
        "instagramVideoBitrateKbps": int(os.getenv("INSTAGRAM_VIDEO_BITRATE_KBPS", "2500")),
        "instagramAudioBitrateKbps": int(os.getenv("INSTAGRAM_AUDIO_BITRATE_KBPS", "128")),
        "instagramMaxrateKbps": int(os.getenv("INSTAGRAM_MAXRATE_KBPS", "3200")),
        "instagramBufsizeKbps": int(os.getenv("INSTAGRAM_BUFSIZE_KBPS", "6400")),
        "instagramFps": int(os.getenv("INSTAGRAM_FPS", "30")),
        "instagramGopSeconds": int(os.getenv("INSTAGRAM_GOP_SECONDS", "2")),
        "instagramPreset": os.getenv("INSTAGRAM_PRESET", "ultrafast"),
        "instagramVideoFilter": os.getenv("INSTAGRAM_VIDEO_FILTER", "transpose=1,scale=-2:1280"),
        "instagramExtraArgs": "",
    }


def legacy_aliases():
    return {
        "videoBitrateKbps": "youtubeVideoBitrateKbps",
        "audioBitrateKbps": "youtubeAudioBitrateKbps",
        "maxrateKbps": "youtubeMaxrateKbps",
        "bufsizeKbps": "youtubeBufsizeKbps",
        "fps": "youtubeFps",
        "gopSeconds": "youtubeGopSeconds",
        "preset": "youtubePreset",
        "extraArgs": "youtubeExtraArgs",
    }


def log_path(name):
    return DATA_DIR / f"restream-{name}.log"


class DestinationJob:
    def __init__(self, name):
        self.name = name
        self.proc = None
        self.started_at = None
        self.last_exit_code = None
        self.mode = None
        self.stop_requested = False
        self.offline_supervisor_active = False

    def running(self):
        return self.proc is not None and self.proc.poll() is None

    def stop(self):
        if self.running():
            self.proc.terminate()
            try:
                self.proc.wait(timeout=8)
            except subprocess.TimeoutExpired:
                self.proc.kill()
                self.proc.wait(timeout=3)
            self.last_exit_code = self.proc.returncode
        elif self.proc is not None:
            self.last_exit_code = self.proc.returncode
        self.proc = None
        self.started_at = None
        self.mode = None
        self.stop_requested = True
        self.offline_supervisor_active = False

    def snapshot(self):
        running = self.running()
        if self.proc is not None and not running:
            self.last_exit_code = self.proc.returncode
        return {
            "running": running,
            "pid": self.proc.pid if running else None,
            "startedAt": self.started_at,
            "lastExitCode": self.last_exit_code,
            "mode": self.mode if running else None,
        }


class RestreamManager:
    def __init__(self):
        DATA_DIR.mkdir(parents=True, exist_ok=True)
        self.lock = threading.Lock()
        self.relay_health_lock = threading.Lock()
        self.relay_health_cache = {
            "ok": False,
            "status": "unknown",
            "message": "Relay health has not been checked yet.",
            "source": obs_relay_health_url(),
            "checkedAt": None,
            "streams": [],
        }
        self.relay_health_ttl = float(os.getenv("OBS_RELAY_HEALTH_TTL_SECONDS", "5"))
        self.relay_loss_poll_seconds = max(1, float(os.getenv("OBS_RELAY_LOSS_POLL_SECONDS", "2")))
        self.relay_loss_grace_seconds = max(1, float(os.getenv("OBS_RELAY_LOSS_GRACE_SECONDS", "6")))
        self.jobs = {name: DestinationJob(name) for name in DESTINATIONS}
        self.limits = {}  # plan limits (max_destinations, max_video_bitrate_kbps)
        self._init_db()
        self.config = self._load_config()
        self._watch_relay_loss()

    def _init_db(self):
        import sqlite3
        conn = sqlite3.connect(str(DB_PATH))
        conn.execute("""
            CREATE TABLE IF NOT EXISTS config_settings (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            )
        """)
        conn.commit()
        conn.close()

    def _load_config(self):
        import sqlite3
        cfg = default_config()
        aliases = legacy_aliases()
        try:
            conn = sqlite3.connect(str(DB_PATH))
            cursor = conn.cursor()
            cursor.execute("SELECT key, value FROM config_settings")
            rows = cursor.fetchall()
            conn.close()
            for key, value in rows:
                mapped_key = aliases.get(key, key)
                if mapped_key in cfg:
                    try:
                        if mapped_key in SECRET_FIELDS:
                            cfg[mapped_key] = decrypt(value)
                        elif isinstance(cfg[mapped_key], int):
                            cfg[mapped_key] = int(value)
                        else:
                            cfg[mapped_key] = value
                    except (ValueError, TypeError):
                        pass
            if "scaleHeight" in {key for key, _value in rows} and not cfg.get("youtubeVideoFilter"):
                scale = self._legacy_scale_height(rows)
                if scale > 0:
                    cfg["youtubeVideoFilter"] = f"scale=-2:{scale}"
        except Exception as e:
            print(f"Error loading config from database: {e}")
        self._apply_limits(cfg)
        return cfg

    def _legacy_scale_height(self, rows):
        for key, value in rows:
            if key == "scaleHeight":
                try:
                    return int(value)
                except ValueError:
                    return 0
        return 0

    def _save_config(self):
        import sqlite3
        try:
            conn = sqlite3.connect(str(DB_PATH))
            cursor = conn.cursor()
            cursor.execute("DELETE FROM config_settings")
            for key, value in self.config.items():
                stored = encrypt(str(value)) if key in SECRET_FIELDS else str(value)
                cursor.execute("INSERT INTO config_settings (key, value) VALUES (?, ?)", (key, stored))
            conn.commit()
            conn.close()
        except Exception as e:
            print(f"Error saving config to database: {e}")

    def update_config(self, patch):
        with self.lock:
            self._merge_config(patch)
            self._save_config()
            return self.snapshot()

    def update_destination(self, name, patch):
        self._assert_destination(name)
        allowed = {key for key in self.config if key.startswith(name)}
        allowed.add("inputUrl")
        with self.lock:
            self._merge_config({key: value for key, value in patch.items() if key in allowed})
            self._save_config()
            return self.snapshot()

    def _merge_config(self, patch):
        aliases = legacy_aliases()
        for key, value in patch.items():
            mapped_key = aliases.get(key, key)
            if mapped_key not in self.config:
                continue
            if isinstance(self.config[mapped_key], int):
                try:
                    self.config[mapped_key] = int(value)
                except (ValueError, TypeError):
                    continue
            else:
                self.config[mapped_key] = str(value)
        self._apply_limits()

    def set_limits(self, limits: dict):
        self.limits = limits or {}
        self._apply_limits()

    def _running_count(self) -> int:
        return sum(1 for job in self.jobs.values() if job.running())

    def _apply_limits(self, cfg=None):
        cfg = cfg if cfg is not None else self.config
        cap = self.limits.get("max_video_bitrate_kbps")
        if not cap:
            return
        for name in DESTINATIONS:
            for field in ("VideoBitrateKbps", "MaxrateKbps"):
                key = f"{name}{field}"
                if key in cfg and isinstance(cfg[key], int) and cfg[key] > cap:
                    cfg[key] = cap

    def _target(self, name):
        key = self.config.get(f"{name}Key", "").strip()
        url = self.config.get(f"{name}Url", "").strip().rstrip("/")
        return f"{url}/{key}" if key and url else None

    def _build_command(self, name):
        target = self._target(name)
        if not target:
            return None
        cfg = self.config
        if name == "youtube" and int(cfg.get("youtubeCopyMode", 1)):
            return self._build_copy_command(name, target)
        fps = max(1, int(cfg[f"{name}Fps"]))
        gop_frames = fps * max(1, int(cfg[f"{name}GopSeconds"]))
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "info", "-fflags", "+genpts",
            "-i", cfg["inputUrl"],
            "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", cfg[f"{name}Preset"],
            "-pix_fmt", "yuv420p", "-tune", "zerolatency", "-profile:v", "main",
            "-r", str(fps), "-g", str(gop_frames), "-keyint_min", str(gop_frames),
            "-sc_threshold", "0",
            "-b:v", f"{cfg[f'{name}VideoBitrateKbps']}k",
            "-maxrate", f"{cfg[f'{name}MaxrateKbps']}k",
            "-bufsize", f"{cfg[f'{name}BufsizeKbps']}k",
            "-c:a", "aac", "-ar", "48000",
            "-b:a", f"{cfg[f'{name}AudioBitrateKbps']}k",
        ]
        video_filter = cfg.get(f"{name}VideoFilter", "").strip()
        if video_filter:
            cmd.extend(["-vf", video_filter])
        extra = cfg.get(f"{name}ExtraArgs", "").strip()
        if extra:
            cmd.extend(shlex.split(extra))
        cmd.extend(["-f", "flv", target])
        return cmd

    def _build_copy_command(self, name, target):
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "info", "-fflags", "+genpts",
            "-i", self.config["inputUrl"],
            "-map", "0:v:0", "-map", "0:a:0?", "-c", "copy",
        ]
        extra = self.config.get(f"{name}ExtraArgs", "").strip()
        if extra:
            cmd.extend(shlex.split(extra))
        cmd.extend(["-f", "flv", target])
        return cmd

    def _build_youtube_hold_command(self, target):
        cfg = self.config
        fps = max(1, int(cfg["youtubeHoldFps"]))
        hold_seconds = max(1, int(cfg["youtubeHoldSeconds"]))
        width = max(16, int(cfg["youtubeHoldWidth"]))
        height = max(16, int(cfg["youtubeHoldHeight"]))
        gop_frames = fps * max(1, int(cfg["youtubeGopSeconds"]))
        return [
            "ffmpeg", "-hide_banner", "-loglevel", "info",
            "-re", "-f", "lavfi", "-i", f"color=c=black:s={width}x{height}:r={fps}",
            "-f", "lavfi", "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-t", str(hold_seconds),
            "-map", "0:v:0", "-map", "1:a:0",
            "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
            "-pix_fmt", "yuv420p", "-r", str(fps), "-g", str(gop_frames),
            "-keyint_min", str(gop_frames), "-sc_threshold", "0",
            "-b:v", f"{cfg['youtubeHoldVideoBitrateKbps']}k",
            "-maxrate", f"{cfg['youtubeHoldVideoBitrateKbps']}k",
            "-bufsize", f"{int(cfg['youtubeHoldVideoBitrateKbps']) * 2}k",
            "-c:a", "aac", "-ar", "48000",
            "-b:a", f"{cfg['youtubeHoldAudioBitrateKbps']}k",
            "-f", "flv", target,
        ]

    def _offline_scene_path(self):
        filename = Path(self.config.get("youtubeOfflineSceneFile", "")).name
        if not filename:
            return None
        path = OFFLINE_SCENE_DIR / filename
        return path if path.exists() and path.is_file() else None

    def _offline_scene_stream_path(self):
        scene = self._offline_scene_path()
        if not scene:
            return None
        if not int(self.config.get("youtubeOfflineSceneLoopCrossfadeEnabled", 1)):
            return scene
        return self._ensure_crossfaded_offline_scene(scene)

    def _ensure_crossfaded_offline_scene(self, scene):
        fade_seconds = max(1, int(self.config.get("youtubeOfflineSceneLoopCrossfadeSeconds", 1)))
        metadata = self._probe_media(scene)
        duration = metadata.get("duration", 0)
        if duration <= fade_seconds * 2:
            return scene
        stat = scene.stat()
        OFFLINE_SCENE_CACHE_DIR.mkdir(parents=True, exist_ok=True)
        cache_name = f"{scene.stem}.{int(stat.st_mtime)}.{stat.st_size}.xfade{fade_seconds}.v2.mp4"
        cache_path = OFFLINE_SCENE_CACHE_DIR / cache_name
        if cache_path.exists() and cache_path.stat().st_size > 0:
            return cache_path
        tmp_path = cache_path.with_suffix(".tmp.mp4")
        offset = max(0.01, duration - (fade_seconds * 2))
        loop_fps = max(1, int(self.config.get("youtubeFps", 30)))
        video_filter = (
            f"[0:v]split=2[v0][v1];"
            f"[v0]trim=start={fade_seconds}:end={duration},setpts=PTS-STARTPTS,fps={loop_fps},settb=AVTB[vmain];"
            f"[v1]trim=start=0:end={fade_seconds},setpts=PTS-STARTPTS,fps={loop_fps},settb=AVTB[vhead];"
            f"[vmain][vhead]xfade=transition=fade:duration={fade_seconds}:offset={offset},format=yuv420p[v]"
        )
        loop_duration = max(1, duration - fade_seconds)
        cmd = [
            "ffmpeg", "-y", "-hide_banner", "-loglevel", "warning",
            "-i", str(scene),
            "-f", "lavfi", "-t", str(loop_duration), "-i", "anullsrc=channel_layout=stereo:sample_rate=48000",
            "-filter_complex", video_filter,
            "-map", "[v]", "-map", "1:a",
            "-c:a", "aac", "-b:a", f"{self.config['youtubeOfflineSceneAudioBitrateKbps']}k",
            "-c:v", "libx264", "-preset", "veryfast", "-crf", "20", str(tmp_path),
        ]
        try:
            subprocess.run(cmd, check=True, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=300)
            tmp_path.replace(cache_path)
            return cache_path
        except subprocess.CalledProcessError as e:
            print(f"Could not build crossfaded offline scene cache for {scene}: {e.stderr or e}")
        except Exception as e:
            print(f"Could not build crossfaded offline scene cache for {scene}: {e}")
        try:
            if tmp_path.exists():
                tmp_path.unlink()
        except OSError:
            pass
        return scene

    def _probe_media(self, path):
        try:
            result = subprocess.run(
                ["ffprobe", "-v", "error", "-print_format", "json",
                 "-show_entries", "format=duration:stream=codec_type", str(path)],
                stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, timeout=15, check=True,
            )
            payload = json.loads(result.stdout or "{}")
            duration = float(payload.get("format", {}).get("duration") or 0)
            has_audio = any(s.get("codec_type") == "audio" for s in payload.get("streams", []))
            return {"duration": duration, "has_audio": has_audio}
        except Exception as e:
            print(f"Could not probe offline scene {path}: {e}")
            return {"duration": 0, "has_audio": False}

    def _offline_scene_ready(self, name):
        return (
            int(self.config.get("youtubeOfflineSceneEnabled", 0))
            and self._offline_scene_path() is not None
            and self._target(name)
        )

    def _build_offline_scene_command(self, name, target, fade=False):
        cfg = self.config
        scene = self._offline_scene_stream_path()
        if not scene:
            return None
        fps = max(1, int(cfg[f"{name}Fps"]))
        gop_frames = fps * max(1, int(cfg[f"{name}GopSeconds"]))
        video_bitrate = max(100, int(cfg["youtubeOfflineSceneVideoBitrateKbps"]))
        audio_bitrate = max(64, int(cfg["youtubeOfflineSceneAudioBitrateKbps"]))
        cmd = [
            "ffmpeg", "-hide_banner", "-loglevel", "info",
            "-re", "-stream_loop", "-1", "-i", str(scene),
        ]
        if fade:
            fade_seconds = max(1, int(cfg["youtubeOfflineSceneFadeSeconds"]))
            cmd.extend(["-t", str(fade_seconds)])
        cmd.extend([
            "-map", "0:v:0", "-map", "0:a:0?",
            "-c:v", "libx264", "-preset", "ultrafast", "-tune", "zerolatency",
            "-pix_fmt", "yuv420p", "-r", str(fps), "-g", str(gop_frames),
            "-keyint_min", str(gop_frames), "-sc_threshold", "0",
            "-b:v", f"{video_bitrate}k", "-maxrate", f"{video_bitrate}k",
            "-bufsize", f"{video_bitrate * 2}k",
            "-c:a", "aac", "-ar", "48000", "-b:a", f"{audio_bitrate}k",
        ])
        video_filters = []
        destination_filter = cfg.get(f"{name}VideoFilter", "").strip()
        if destination_filter:
            video_filters.append(destination_filter)
        if fade:
            fade_seconds = max(1, int(cfg["youtubeOfflineSceneFadeSeconds"]))
            video_filters.append(f"fade=t=out:st=0:d={fade_seconds}")
        if video_filters:
            cmd.extend(["-vf", ",".join(video_filters)])
        cmd.extend(["-f", "flv", target])
        return cmd

    def _start_process(self, name, cmd, mode, log_message):
        job = self.jobs[name]
        path = log_path(name)
        with path.open("a", encoding="utf-8") as log:
            log.write(f"\n=== {name} {log_message} {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")
            log.write(f"command: {self._redact_command(cmd)}\n")
        handle = path.open("a", encoding="utf-8")
        job.proc = subprocess.Popen(cmd, stdout=handle, stderr=subprocess.STDOUT)
        job.started_at = time.strftime("%Y-%m-%d %H:%M:%S")
        job.last_exit_code = None
        job.mode = mode
        self._watch_process(name, job.proc, mode)

    def _append_log(self, name, message):
        path = log_path(name)
        with path.open("a", encoding="utf-8") as log:
            log.write(f"\n=== {name} {message} {time.strftime('%Y-%m-%d %H:%M:%S')} ===\n")

    def _watch_process(self, name, proc, mode):
        thread = threading.Thread(target=self._monitor_process, args=(name, proc, mode), daemon=True)
        thread.start()

    def _monitor_process(self, name, proc, mode):
        returncode = proc.wait()
        with self.lock:
            job = self.jobs[name]
            if job.proc is not proc:
                return
            job.last_exit_code = returncode
            job.proc = None
            job.started_at = None
            job.mode = None
            should_fallback = mode == "stream" and not job.stop_requested and self._target(name)
            should_restart_live = mode == "offline_fade" and not job.stop_requested and self._target(name)
            if should_restart_live:
                cmd = self._build_command(name)
                if cmd:
                    self._start_process(name, cmd, "stream", "restart after offline scene fade")
            elif should_fallback and self._offline_scene_ready(name):
                cmd = self._build_offline_scene_command(name, self._target(name))
                if cmd:
                    self._start_process(name, cmd, "offline_scene", f"offline scene after stream exit code {returncode}")
                    job.offline_supervisor_active = True
                    self._watch_offline_scene_return(name)
            elif name == "youtube" and should_fallback and int(self.config.get("youtubeHoldOnStop", 1)):
                cmd = self._build_youtube_hold_command(self._target(name))
                self._start_process(name, cmd, "hold", f"hold after stream exit code {returncode}")

    def _watch_offline_scene_return(self, name):
        thread = threading.Thread(target=self._monitor_offline_scene_return, args=(name,), daemon=True)
        thread.start()

    def _watch_relay_loss(self):
        thread = threading.Thread(target=self._monitor_relay_loss, daemon=True)
        thread.start()

    def _monitor_relay_loss(self):
        offline_since = None
        while True:
            time.sleep(self.relay_loss_poll_seconds)
            health = self._probe_relay_health()
            with self.relay_health_lock:
                self.relay_health_cache = health
                self.relay_health_cache["_checkedAtEpoch"] = time.time()
            if health.get("ok"):
                offline_since = None
                continue
            with self.lock:
                live_jobs = [
                    name for name, job in self.jobs.items()
                    if job.running() and job.mode == "stream" and not job.stop_requested
                ]
            if not live_jobs:
                offline_since = None
                continue
            if offline_since is None:
                offline_since = time.time()
                continue
            if time.time() - offline_since < self.relay_loss_grace_seconds:
                continue
            for name in live_jobs:
                self._switch_stream_to_offline_scene(name, health)
            offline_since = None

    def _switch_stream_to_offline_scene(self, name, health):
        with self.lock:
            job = self.jobs[name]
            if not job.running() or job.mode != "stream" or job.stop_requested:
                return
            if not self._offline_scene_ready(name):
                return
            cmd = self._build_offline_scene_command(name, self._target(name))
            if not cmd:
                return
            self._append_log(
                name,
                f"relay offline for {self.relay_loss_grace_seconds:g}s; switching to offline scene: {health.get('message', 'offline')}",
            )
            job.stop()
            job.stop_requested = False
            self._start_process(name, cmd, "offline_scene", "offline scene after relay loss")
            job.offline_supervisor_active = True
            self._watch_offline_scene_return(name)

    def _monitor_offline_scene_return(self, name):
        while True:
            poll_seconds = max(1, int(self.config.get("youtubeOfflineScenePollSeconds", 5)))
            time.sleep(poll_seconds)
            health = self._probe_relay_health()
            with self.lock:
                job = self.jobs[name]
                if not job.offline_supervisor_active or job.stop_requested or job.mode != "offline_scene" or not job.running():
                    return
                if not health.get("ok"):
                    continue
                job.offline_supervisor_active = False
                job.stop()
                job.stop_requested = False
                cmd = self._build_offline_scene_command(name, self._target(name), fade=True)
                if cmd:
                    self._start_process(name, cmd, "offline_fade", "offline scene fade out")
                else:
                    live_cmd = self._build_command(name)
                    if live_cmd:
                        self._start_process(name, live_cmd, "stream", "restart after offline scene")
                return

    def start(self, name, maybe_patch=None):
        self._assert_destination(name)
        with self.lock:
            if maybe_patch:
                self._merge_config(maybe_patch)
                self._save_config()
            job = self.jobs[name]
            if job.running():
                return self.snapshot()
            max_dest = self.limits.get("max_destinations")
            if max_dest and self._running_count() >= max_dest:
                raise ValueError(f"plan limit reached: max {max_dest} destination(s)")
            health = self._probe_relay_health()
            if not health.get("ok") and self._offline_scene_ready(name):
                cmd = self._build_offline_scene_command(name, self._target(name))
                if cmd:
                    job.stop_requested = False
                    self._start_process(name, cmd, "offline_scene", "start offline scene because relay is offline")
                    job.offline_supervisor_active = True
                    self._watch_offline_scene_return(name)
                    return self.snapshot()
            cmd = self._build_command(name)
            if not cmd:
                job.last_exit_code = 1
                return self.snapshot()
            job.stop_requested = False
            self._start_process(name, cmd, "stream", "start")
            return self.snapshot()

    def stop(self, name):
        self._assert_destination(name)
        with self.lock:
            job = self.jobs[name]
            if (
                name == "youtube"
                and job.running()
                and job.mode == "stream"
                and int(self.config.get("youtubeHoldOnStop", 1))
                and self._target("youtube")
            ):
                job.offline_supervisor_active = False
                job.stop()
                cmd = self._build_youtube_hold_command(self._target("youtube"))
                self._start_process("youtube", cmd, "hold", "graceful hold")
            else:
                job.offline_supervisor_active = False
                job.stop()
            return self.snapshot()

    def start_all(self, maybe_patch=None):
        with self.lock:
            if maybe_patch:
                self._merge_config(maybe_patch)
                self._save_config()
        max_dest = self.limits.get("max_destinations")
        for name in DESTINATIONS:
            if max_dest and self._running_count() >= max_dest:
                break
            if self._target(name):
                self.start(name)
        return self.snapshot()

    def stop_all(self):
        with self.lock:
            for job in self.jobs.values():
                job.stop()
            return self.snapshot()

    def snapshot(self):
        destination_status = {name: self.jobs[name].snapshot() for name in DESTINATIONS}
        running = [name for name, state in destination_status.items() if state["running"]]
        configured = [name for name in DESTINATIONS if self._target(name)]
        return {
            "config": self.config,
            "destinations": destination_status,
            "status": {
                "running": bool(running),
                "runningTargets": running,
                "targets": configured,
            },
            "logs": {name: self.read_logs(name) for name in DESTINATIONS},
        }

    def read_logs(self, name, limit=8000):
        path = log_path(name)
        if not path.exists():
            return ""
        data = path.read_text(encoding="utf-8", errors="replace")
        return data[-limit:]

    def list_offline_scenes(self):
        OFFLINE_SCENE_DIR.mkdir(parents=True, exist_ok=True)
        selected = self.config.get("youtubeOfflineSceneFile", "")
        files = []
        for path in sorted(OFFLINE_SCENE_DIR.iterdir(), key=lambda item: item.stat().st_mtime, reverse=True):
            if not path.is_file():
                continue
            stat = path.stat()
            files.append({
                "name": path.name,
                "size": stat.st_size,
                "modifiedAt": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime)),
                "selected": path.name == selected,
            })
        return {"selected": selected, "files": files}

    def select_offline_scene(self, filename):
        safe_name = self._safe_scene_filename(filename)
        if safe_name:
            path = OFFLINE_SCENE_DIR / safe_name
            if not path.exists() or not path.is_file():
                raise ValueError(f"offline scene does not exist: {safe_name}")
        with self.lock:
            self.config["youtubeOfflineSceneFile"] = safe_name
            self._save_config()
            return self.list_offline_scenes()

    def save_offline_scene_upload(self, filename, fileobj):
        OFFLINE_SCENE_DIR.mkdir(parents=True, exist_ok=True)
        safe_name = self._safe_scene_filename(filename)
        if not safe_name:
            raise ValueError("invalid offline scene filename")
        path = OFFLINE_SCENE_DIR / safe_name
        with path.open("wb") as out:
            while True:
                chunk = fileobj.read(1024 * 1024)
                if not chunk:
                    break
                out.write(chunk)
        with self.lock:
            if not self.config.get("youtubeOfflineSceneFile"):
                self.config["youtubeOfflineSceneFile"] = safe_name
                self._save_config()
        return self.list_offline_scenes()

    def delete_offline_scene(self, filename):
        safe_name = self._safe_scene_filename(filename)
        if not safe_name:
            raise ValueError("invalid offline scene filename")
        path = OFFLINE_SCENE_DIR / safe_name
        if path.exists() and path.is_file():
            path.unlink()
        with self.lock:
            if self.config.get("youtubeOfflineSceneFile") == safe_name:
                self.config["youtubeOfflineSceneFile"] = ""
                self._save_config()
        return self.list_offline_scenes()

    def _safe_scene_filename(self, filename):
        name = Path(str(filename or "")).name.strip()
        if not name:
            return ""
        name = re.sub(r"[^A-Za-z0-9._-]+", "_", name)
        allowed_suffixes = {".mp4", ".mov", ".m4v", ".webm", ".mkv", ".ts"}
        if Path(name).suffix.lower() not in allowed_suffixes:
            raise ValueError("offline scene must be a video file: mp4, mov, m4v, webm, mkv, or ts")
        return name

    def relay_health(self):
        now = time.time()
        cached_at = self.relay_health_cache.get("_checkedAtEpoch")
        if cached_at and now - cached_at < self.relay_health_ttl:
            return self._relay_health_public()
        if not self.relay_health_lock.acquire(blocking=False):
            payload = self._relay_health_public()
            payload["checking"] = True
            return payload
        try:
            self.relay_health_cache = self._probe_relay_health()
            self.relay_health_cache["_checkedAtEpoch"] = time.time()
            return self._relay_health_public()
        finally:
            self.relay_health_lock.release()

    def _relay_health_public(self):
        return {key: value for key, value in self.relay_health_cache.items() if not key.startswith("_")}

    def _probe_url(self):
        # Prefer the exact URL the ffmpeg jobs consume so live-detection always
        # reflects what the restream actually reads (the relay's `restream` app).
        configured = self.config.get("inputUrl", "").strip()
        return configured or obs_relay_health_url()

    def _probe_relay_health(self):
        source = self._probe_url()
        checked_at = time.strftime("%Y-%m-%d %H:%M:%S")
        cmd = [
            "ffprobe", "-v", "error", "-rw_timeout", "3000000",
            "-show_entries", "stream=codec_type,width,height,r_frame_rate,sample_rate,channels",
            "-of", "json", source,
        ]
        try:
            result = subprocess.run(cmd, capture_output=True, text=True, timeout=6)
            if result.returncode != 0:
                message = (result.stderr or result.stdout or "ffprobe could not read the OBS relay stream.").strip()
                return {"ok": False, "status": "offline", "message": message[-500:], "source": source, "checkedAt": checked_at, "streams": []}
            payload = json.loads(result.stdout or "{}")
            streams = payload.get("streams", [])
            has_video = any(s.get("codec_type") == "video" for s in streams)
            return {
                "ok": has_video,
                "status": "live" if has_video else "offline",
                "message": "OBS relay ingest is live." if has_video else "Relay answered, but no video stream was found.",
                "source": source, "checkedAt": checked_at, "streams": streams,
            }
        except subprocess.TimeoutExpired:
            return {"ok": False, "status": "offline", "message": "Timed out probing OBS relay ingest.", "source": source, "checkedAt": checked_at, "streams": []}
        except Exception as e:
            return {"ok": False, "status": "error", "message": str(e), "source": source, "checkedAt": checked_at, "streams": []}

    def _assert_destination(self, name):
        if name not in DESTINATIONS:
            raise ValueError(f"unknown destination: {name}")

    def _redact_command(self, cmd):
        redacted = []
        for item in cmd:
            parsed = urlparse(item)
            if parsed.scheme in {"rtmp", "rtmps"} and "/" in parsed.path.strip("/"):
                base = item.rsplit("/", 1)[0]
                redacted.append(f"{base}/***")
            else:
                redacted.append(item)
        return " ".join(shlex.quote(part) for part in redacted)

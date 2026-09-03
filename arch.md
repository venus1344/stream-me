# Architecture

This document describes the runtime architecture of the OME restream engine, both as designed and as deployed on the VPS.

> **Multi-tenant roadmap:** the plan for multi-user streaming (Model B: per-tenant streaming servers, phased rollout) lives in [`docs/multi-tenant-design.md`](multi-tenant-design.md).

## Canonical data flow

```
                    ┌──────────────────────────────────────────────────────────────┐
                    │                          RELAY (nginx-rtmp)                  │
                    │                        host :1936 → container :1935          │
                    │                                                              │
  OBS ──RTMP──▶ app "stream" ──push──▶ ome:1935/app/key   (site playback)          │
  (key: input)        │                                                              │
                      └──push──▶ app "restream" (127.0.0.1:1935/restream/input)    │
                    └──────────────────────────┬───────────────────────────────────┘
                                               │  worker pulls
                                               ▼
                                    ┌──────────────────────┐
                                    │  WORKER (restream)   │
                                    │  ffmpeg fan-out      │
                                    └──────┬───────┬───────┘
                                           │       │
                      YouTube ◀─────────────┘       │
                      Facebook ◀────────────────────┘
                      Instagram ◀──────────────────────
```

**The single ingress is the relay.** OBS always ends on the relay. Every restream destination picks from the relay (through the worker, which pulls once per destination from the same relay URL). Nothing else is ever used as the restream source.

## Components

| Container | Profile | Role | Key ports |
|-----------|---------|------|-----------|
| `ome` | `worker` | OvenMediaEngine **origin** — the player's media server (RTMP ingest, LL-HLS + WebRTC out) | 1935 (RTMP in), 3333 (LL-HLS + WebRTC sig), 3478 (WebRTC TCP relay), 10000-10010 (ICE) |
| `ome-relay-rtmp` | `worker` | **nginx-rtmp relay** — OBS ingress + fan-out to OME and the worker | host 1936 → container 1935 |
| `ome-worker` | `worker` | **Restream control API + ffmpeg fan-out** to YouTube/Facebook/Instagram; live/offline logic | 8099 (HTTP), host networking |
| `ome-nginx` | `frontend` | Static frontend + reverse proxy (API, worker, OME HLS) | 8081 (host networking) |
| `ome-api` | `server` | FastAPI **platform API** (auth: login/signup, users, tenants, servers) | host 8001 → container 8000 |
| `ome-postgres` | `server` | User accounts + hashed passwords (`users.password_hash`, Argon2) | 5432 (internal) |
| `ome-redis` | `server` | JWT session store (`session:<jti>`) | internal |
| `ome-ingester` | `ingest-copy` | **Optional** ffmpeg relay→OME copy (not part of the restream path) | — |

## Relay config (`relay/nginx.conf`)

nginx-rtmp listens on container port 1935 (published as host 1936). It defines two RTMP apps:

- **`stream`** — where OBS publishes (`rtmp://HOST:1936/stream`, stream key `input`). Two `push` targets:
  - `rtmp://ome:1935/app/key` → OME, so the site player works.
  - `rtmp://127.0.0.1:1935/restream/input` → the relay's own `restream` app (loopback, inside the relay container).
- **`restream`** — the republished copy that the worker consumes. `live on; record off;` with no push of its own.

The stream key OBS uses on the relay is not meaningful — the relay normalizes everything to `app/key` (OME) and `restream/input` (worker).

## Worker restream (`worker/app.py` + `worker/manager.py`)

- Runs on **host networking**, so it reaches the relay at `127.0.0.1:1936`.
- **Input URL** (configurable, stored in `worker/data/restream.db` as `inputUrl`): `rtmp://127.0.0.1:1936/restream/input`.
- One ffmpeg process **per destination** (not a tee muxer), each pulling the same relay URL and publishing to its own RTMPS target:
  - **YouTube** — default **copy mode** (`youtubeCopyMode=1`): `-c copy` straight from relay to `rtmps://a.rtmp.youtube.com/live2/<KEY>`.
  - **Facebook / Instagram** — re-encode to vertical (`transpose=1,scale=-2:1280`, 30 fps, libx264).
- **Live detection** (`_probe_relay_health`) runs `ffprobe` against **the exact `inputUrl`** the ffmpeg jobs consume (`_probe_url()`). If the probe succeeds there is a live stream; if it fails the worker treats the relay as offline.
- **Modes** (`job.mode`): `stream` (live), `offline_scene` (looping offline clip), `offline_fade` (fade back to live), `hold` (YouTube black-screen hold on stop).
- On relay loss > grace window (~6s), running `stream` jobs switch to `offline_scene`; a supervisor polls and **fades back to live** automatically when the relay returns.

> ⚠️ **Do not point `inputUrl` at OME's LL-HLS** (`http://127.0.0.1:3333/app/key/llhls.m3u8`). OME rotates LL-HLS sessions and the ffmpeg HLS demuxer stalls on the old session — this produces exactly the "YouTube buffering / not enough data" symptom. The relay RTMP path is the only supported stable input.

## OBS settings (required)

- Service: **Custom**
- Server: `rtmp://YOUR_HOST:1936/stream`
- Stream key: `input`

Publishing directly to OME (`rtmp://YOUR_HOST:1935/app`, key `key`) gives the player a stream but **bypasses the relay**, so the restream engine sees nothing and falls back to the offline clip. For restream to work, OBS must end on the relay.

## Platform & auth

- `ome-api` exposes `/api/auth/*` (signup, **login**, logout, me, superuser), `/api/users`, `/api/tenants`, `/api/servers`.
- Passwords are hashed with **Argon2** (`pwdlib`), stored in `users.password_hash`. JWT (`HS256`, `JWT_SECRET` shared by API and worker) is minted on login and kept in Redis (`session:<jti>`).
- The worker's `/api/restream/*` endpoints and `/api/restream/ws` require the same JWT. The frontend stores the token in `localStorage` (`beamcast_token`).
- `/settings` and `/admin` are behind `PrivateRoute`; unauthenticated users are redirected to `/login`.

## Frontend reverse proxy (`nginx/default.conf`)

nginx on host 8081 proxies:
- `/api/auth/`, `/api/servers` → `127.0.0.1:8001` (API)
- `/api/restream/`, `/api/restream/ws`, `/api/clips/` → `127.0.0.1:8099` (worker)
- `/app/` → `127.0.0.1:3333` (OME LL-HLS)

## Ports (public)

| Port | Protocol | Purpose |
|------|----------|---------|
| 1935/tcp | RTMP | OME ingest (optionally direct, not used for restream) |
| 1936/tcp | RTMP | **OBS → relay ingress** (required) |
| 3333/tcp | HTTP/WS | LL-HLS + WebRTC signalling |
| 3478/tcp+udp | — | WebRTC TCP relay / STUN-ish |
| 10000/tcp + 10000-10010/udp | — | WebRTC ICE candidates |
| 8001/tcp | HTTP | Platform API (host) |
| 8099/tcp | HTTP | Worker restream API |
| 8081/tcp | HTTP | Frontend |

## Deployment

```bash
# local: build the frontend first
cd player && nvm use 22 && npm run build

# VPS: build images (host-network override works around provider TLS interception)
docker compose -f docker-compose.yml -f docker-compose.build.yml build api worker

# VPS: start the full stack
docker compose --profile server --profile worker --profile frontend up -d --remove-orphans
```

- `server` profile = postgres + redis + api
- `worker` profile = ome + relay-rtmp + worker
- `frontend` profile = nginx
- After an rsync deploy, force-recreate nginx so single-file bind mounts pick up new inodes:
  `docker compose --profile server --profile worker --profile frontend up -d --force-recreate nginx`

### Per-server deployment (Model B — multi-tenant)

Each tenant gets its own streaming server (`relay` + `ome` + `worker` + edge nginx). See `docs/multi-tenant-design.md` (Phase 4).

```bash
# On a fresh streaming VPS, after registering the server in the control plane:
scripts/provision-server.sh <server_id> <server_token> <api_url> <jwt_secret>
```

- `worker` bootstraps its tenant from the control plane at startup (`SERVER_ID`/`SERVER_TOKEN`/`API_URL`; falls back to a static `TENANT_ID`).
- `nginx/server-edge.conf` is the per-server TLS template (worker API + OME playback only).
- `JWT_SECRET` must match the control plane (users' tokens are verified by the worker).

## VPS-specific notes

- `conf/Server.xml` hardcodes the public IP in `IceCandidates` (UDP `10000-10010`, `TcpRelay` `3478`). Update if the IP changes.
- The provider TLS-inspects Docker bridge egress; `docker-compose.build.yml` builds with `network: host` to avoid pip `CERTIFICATE_VERIFY_FAILED`.
- Host port `8000` is occupied by Coolify → the API uses host port `8001`.

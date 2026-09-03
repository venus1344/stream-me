# Multi-Tenant Streaming — Design Spec (Model B)

> Status: **Draft / canonical source of truth for multi-tenant work**
> Date: 2026-09-03

This document captures the design for turning the single-tenant restream engine into a multi-user product: each user logs in and restreams their own OBS feed to their own destinations. It supersedes ad-hoc discussion; phases below should be updated as work progresses.

---

## 1. Context

The app today has two halves at different maturity levels:

| Layer | What it is | Multi-tenant? |
|-------|-----------|---------------|
| **Control plane** (`api/`) | FastAPI + Postgres + Redis: auth (Argon2 + JWT), roles (`superuser`/`manager`/`user`), tenants, users, servers, plans | ✅ already multi-tenant |
| **Data plane** (`worker/`, `relay/`, `ome/`) | Restream engine: one relay ingest → one OME origin → one worker fanning out to YouTube/Facebook/Instagram | ❌ single-tenant |

The work is to make the **data plane** tenant-aware. The control plane is the foundation and stays central.

---

## 2. Goal & non-goals

**Goal:** each user logs in and restreams their own OBS feed to their own destinations, isolated from other users.

**Non-goals (defer):**
- Oversubscribing many tenants onto one worker (revisit only when unit economics demand it).

**In scope (added 2026-09-03):**
- Billing / plan enforcement (Phase 5).
- Encryption-at-rest of destination keys (Option 2, §10).

---

## 3. Decision log

| # | Decision | Chosen | Rationale |
|---|----------|--------|-----------|
| 1 | Topology | **Model B — per-tenant streaming server** (not Model A shared worker) | Matches existing `servers` table; reuses the proven single-tenant worker; horizontal by adding servers; Model A is a cost optimization you'd still shard into later |
| 2 | Worker:tenant ratio | **1 worker = 1 tenant** | Simplest isolation; no per-tenant session registry in the worker |
| 3 | Tenant identity source | **Deployment property**, not request property | The worker is physically wired to one relay/OME/stream; "which tenant does this box serve" is a fact of deployment |
| 4 | Caller identity | **JWT `tenant_id` claim** | Identifies *who is calling* |
| 5 | Isolation check | `jwt.tenant_id == worker.tenant_id` (superusers bypass) | Rejects tenant A controlling tenant B |
| 6 | Worker→API trust | **`SERVER_TOKEN`** (machine credential), bootstrapped | Lets the worker discover its tenant + report health; servers can be reassigned without redeploy |
| 7 | Frontend→worker routing | **Direct worker URL** returned by the API (initial) | Keeps media/status/clip traffic off the central API; per-server TLS subdomain. Gateway is a possible later alternative |
| 8 | Ingest routing | **Per-server relay, unchanged config** | Each tenant's OBS points at their own server's `rtmp://<server>:1936/stream`; no relay code change |

---

## 4. Architecture

### 4.1 Topology

```
               ┌─────────────────────────────────────┐
               │   Control plane (central, single)    │
               │   nginx :443 (SPA + /api/*)          │
               │   api (FastAPI) :8001                │
               │   postgres + redis                   │
               └─────────────────┬───────────────────┘
                                 │  tenants / users / servers / assignments
       ┌─────────────────────────┼──────────────────────────┐
       ▼                         ▼                          ▼
 Server A (tenant X)      Server B (tenant Y)         Server C ...
 edge nginx (TLS subdomain)
 worker :8099  (TENANT=X)   worker :8099 (TENANT=Y)
 relay :1936 (ingest)       relay :1936 (ingest)
 OME :3333 (playback)       OME :3333 (playback)
```

### 4.2 Components

| Component | Role | Notes |
|-----------|------|-------|
| `api` + `postgres` + `redis` | Control plane: auth, tenants, users, servers, assignments, routing info | Central, single instance |
| `nginx` (control) | Serves SPA; proxies `/api/*` to the API | One per deployment |
| **server** = `relay` + `ome` + `worker` + edge nginx | Data plane unit, one per tenant | Deployed via `worker` profile |
| `worker` | Restream engine for that tenant; serves `/api/restream/*`, `/api/clips/*` | Bound to one tenant |
| `relay` (nginx-rtmp) | OBS ingest `:1936/stream` → OME `app/key` + `restream/input` | Unchanged per server |
| `ome` (OvenMediaEngine) | Playback origin (LL-HLS/WebRTC) | `Server.xml` per server (ICE IP) |

### 4.3 Trust relationships

| Direction | Credential | Purpose |
|-----------|------------|---------|
| Frontend → worker | user JWT | Control the caller's tenant restream. Worker checks `tenant_id == worker.tenant_id` |
| Worker → API | `SERVER_TOKEN` | Bootstrap tenant identity + report health |

The user JWT identifies a *person*; the server token identifies a *machine*.

---

## 5. Phases

### Phase 1 — Worker tenant scoping ✅ (done)

Make the worker serve exactly one tenant and reject others.

- `worker/app.py`: add `TENANT_ID`; `_authorize_token()` decodes JWT and enforces `tenant_id == TENANT_ID` (superuser bypass). WebSocket uses the same check.
- `docker-compose.yml`: pass `TENANT_ID` into the worker env.
- `.env.example`: document `TENANT_ID`.
- Backward compatible: empty `TENANT_ID` → legacy "any valid token" behavior.

### Phase 2 — API: server routing + machine auth ✅ (done)

- Extend `servers` schema: `worker_url`, `ingest_host`, `ingest_port`, `ome_url`, `status`, `server_token_hash`.
- New endpoints:
  - `POST /api/servers/bootstrap` (server token) → returns `{ tenant_id, ingest/playback config }`
  - `GET  /api/servers/{id}/assignment` (server token) → worker polls for reassignment
  - `POST /api/servers/{id}/heartbeat` (server token) → health/load
  - `GET  /api/servers/current` (user JWT) → the caller's tenant routing info (`worker_url`, `ingest_url`, `stream_key`, `ome_url`)
- `GET /api/tenants` (exists) gains per-server `status`.

### Phase 3 — Frontend tenant-aware ✅ (done)

- On login, fetch routing info (`/api/servers/current`) and store the tenant's `worker_url` + `ome_url`.
- `Settings` calls `worker_url/api/restream/*` (not same-origin proxy) and shows the user's OBS ingest URL + key.
- `Home` player uses the tenant's `ome_url`.
- `Admin` (superuser) shows tenants → servers → live status.

### Phase 4 — Per-server provisioning & edge ✅ (done)

- Worker bootstraps its tenant from the API at startup (`SERVER_ID` + `SERVER_TOKEN` + `API_URL` env; falls back to static `TENANT_ID`).
- Per-server TLS edge template: `nginx/server-edge.conf` (worker API + OME playback; no central-platform routes).
- Provisioning script: `scripts/provision-server.sh <server_id> <server_token> <api_url> <jwt_secret>` starts the `worker` profile.
- `JWT_SECRET` must match the control plane.

### Phase 5 — Billing / plan enforcement

- Use `tenants.subscription_plan` to enforce per-tenant limits: destinations count, concurrent streams, bitrate caps.
- Enforce in the worker (reject configs/starts beyond limits) and expose limits via the API.
- Super-admin can set/change a tenant's plan (extends `api/routes/tenants.py`).

---

## 6. Deployment pipeline

```
provision server → register in API → assign tenant → worker bootstrap → serve → heartbeat
```

1. **Provision** a VPS: run `deploy.sh` (worker profile) with `SERVER_ID` + `SERVER_TOKEN`.
2. **Register**: `POST /api/servers {server_id, worker_url, ingest_host, ingest_port, ome_url}`.
3. **Bootstrap**: worker calls the API with its server token → gets `tenant_id`.
4. **Assign**: super admin `POST /api/servers/{id}/assign?tenant_id=X`; worker polls and hot-swaps its tenant.
5. **Serve**: tenant OBS → that server's relay; frontend → that server's worker/OME.
6. **Heartbeat**: worker reports status to the API.

---

## 7. Super-admin console

The admin interface (`player/src/pages/Admin.tsx`) provides:

- **Tenants** — `GET /api/tenants` (exists): every tenant with nested users + servers.
- **Servers** — `GET /api/servers` (exists, extended with `status`/`load`): every streaming node.
- **Health** — aggregated from worker heartbeats.

View: tenant → assigned server → live status (up/down, current stream, load).

---

## 8. API contract (implemented in Phase 2)

```http
# machine auth — server token (generated once at POST /api/servers, stored hashed)
POST   /api/servers/bootstrap                    body { server_id, token }            → { server_id, tenant_id, ingest_url, stream_key, worker_url, ome_url, status }
GET    /api/servers/{server_id}/assignment      header X-Server-Token                → { server_id, tenant_id }
POST   /api/servers/{server_id}/heartbeat       header X-Server-Token, body { status, load? } → { ok }

# user auth — JWT
GET    /api/servers/current                       → [ ServerResponse... ]  (caller's tenant servers)
```

---

## 9. Decisions on open questions (2026-09-03)

- **Oversubscription:** **No.** Every client gets their own server (one worker = one tenant).
- **Routing:** **Direct `worker_url`.** Workers are public under per-server TLS subdomains; no API gateway for now.
- **Billing / plan enforcement:** **Yes.** Added as Phase 5.

## 10. Secret storage (destination keys)

Destination keys (`youtubeKey`, `facebookKey`, `instagramKey`) are currently plaintext in `worker/data/restream.db`.

Options for local encrypted storage:

| Option | What it does | Protects against | Cost |
|---|---|---|---|
| 1. Full-volume encryption | LUKS/dm-crypt or cloud encrypted volume | physical theft, disk/backup copy | zero code |
| 2. Field encryption (AES-256-GCM) | encrypt only secret columns before sqlite write; key from `SECRET_ENCRYPTION_KEY` env/file | DB file exfiltration, backups | small code change (`cryptography`) |
| 3. Envelope encryption (KMS) | DEK wrapped by cloud/self-hosted KMS | above + rotation/audit | more infra |
| 4. Secret manager (Vault / cloud) | don't store locally; fetch at runtime | centralized rotation/audit | runtime dependency |

**Decision: Option 2 now (field encryption), layered on Option 1 where the host offers encrypted volumes.** Upgrade to 3/4 when compliance/audit demands (tied to billing going live).

> At-rest only: the tenant still sees their own keys in Settings — the worker decrypts on read. This protects the DB file/backups, not the authorized reader.

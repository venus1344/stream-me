# Development vs Production Setup

This project uses separate Docker Compose configurations for development and production.

## Development (`docker-compose.dev.yml`)

**Use on:** macOS, Windows, or Linux development machines

**Features:**
- Vite dev server with hot reload
- Simplified networking (no `network_mode: host`)
- Proper port mappings for all services
- Works with local frontend development

**Setup:**
```bash
# Start services
docker compose -f docker-compose.dev.yml --profile server --profile worker up

# In another terminal, start Vite dev server
cd player
nvm use 22
npm run dev
```

**Access:**
- Vite dev server: `http://localhost:5173`
- API: `http://localhost:8000`
- Worker API: `http://localhost:8099`
- OME WebRTC: `http://localhost:3333`

**Environment:** Use `.env.dev` or `.env`

---

## Production (`docker-compose.yml`)

**Use on:** Linux servers (VPS, cloud instances)

**Features:**
- `network_mode: host` for optimal performance
- Pre-built frontend served by nginx
- Production-optimized settings
- Direct network access for streaming

**Setup:**
```bash
# Build frontend
cd player
npm run build

# Start all services
docker compose --profile server --profile worker --profile frontend up -d
```

**Access:**
- Frontend: `http://localhost:8081` (via nginx)
- API: `http://localhost:8001` (host port — 8000 is reserved on some VPSs, e.g. Coolify)
- Worker API: `http://localhost:8099`
- RTMP: `rtmp://server-ip:1935`

**Environment:** Use `.env` (production credentials)

---

## Key Differences

| Aspect | Dev | Prod |
|--------|-----|------|
| Network mode | Bridge (port mappings) | Host mode |
| Frontend | Vite dev server | Built + nginx |
| Network isolation | Isolated (bridge) | Direct host access |
| Performance | Good (dev) | Optimal (streaming) |
| Platforms | macOS/Windows/Linux | Linux only |

---

## Running Frontend in Development

```bash
cd player

# Install dependencies
nvm use 22
npm install

# Start dev server (uses vite.config.ts proxy)
npm run dev

# Build for production
npm run build
```

The Vite proxy in `vite.config.ts` routes API calls to `localhost:8001`, `localhost:8099`, and `localhost:3333`.

---

## Environment Variables

- **`.env`** — Production environment (used by `docker-compose.yml`)
- **`.env.dev`** — Development environment (used by `docker-compose.dev.yml`)
- **`.env.example`** — Template with all required variables

> ⚠️ Never commit real credentials. Use `.env.example` as a template.

---

## Common Tasks

### Start development stack
```bash
docker compose -f docker-compose.dev.yml --profile server --profile worker up
cd player && npm run dev
```

### Start production stack
```bash
cd player && npm run build
docker compose --profile server --profile worker --profile frontend up -d
```

### View logs
```bash
# Dev
docker compose -f docker-compose.dev.yml logs -f worker

# Prod
docker compose logs -f worker
```

### Stop services
```bash
# Dev
docker compose -f docker-compose.dev.yml down

# Prod
docker compose down
```

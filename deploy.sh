#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# ── 1. Build frontend ────────────────────────────────────────────────────────
echo "==> Building frontend..."
cd player
export NVM_DIR="${NVM_DIR:-$HOME/.nvm}"
[ -s "$NVM_DIR/nvm.sh" ] && source "$NVM_DIR/nvm.sh"
nvm use 22
npm run build
cd "$SCRIPT_DIR"
echo "    Frontend built → player/dist/"

# ── 2. Build Docker images ───────────────────────────────────────────────────
# Note: on the VPS the hosting provider TLS-inspects Docker bridge egress, which
# breaks pip inside build containers. The docker-compose.build.yml override makes
# builds use host networking (see that file for details).
echo "==> Building API image..."
docker compose -f docker-compose.yml -f docker-compose.build.yml build api

echo "==> Building worker image..."
docker compose -f docker-compose.yml -f docker-compose.build.yml build worker

# ── 3. Start stack ───────────────────────────────────────────────────────────
echo "==> Starting stack..."
docker compose --profile server --profile worker --profile frontend up -d --remove-orphans

echo ""
echo "✓ Done. Services:"
docker compose ps

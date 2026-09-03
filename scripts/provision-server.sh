#!/usr/bin/env bash
set -euo pipefail

# Provision a per-tenant streaming server (Model B, Phase 4).
#
# Usage:
#   scripts/provision-server.sh <server_id> <server_token> <api_url> <jwt_secret>
#
#   server_id    — slug registered in the control plane (POST /api/servers)
#   server_token — one-time token returned by that registration (shown once)
#   api_url      — public URL of the control plane API (e.g. https://control.stream.example.com)
#   jwt_secret   — MUST match the control plane's JWT_SECRET (users' tokens are
#                  verified by this worker)
#
# This starts the `worker` profile (relay + OME + worker). TLS edge deployment
# uses nginx/server-edge.conf (see the printed next steps).

SERVER_ID="${1:?server_id required}"
SERVER_TOKEN="${2:?server_token required}"
API_URL="${3:?api_url required}"
JWT_SECRET="${4:?jwt_secret required (must match the control plane)}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.."

if ! grep -q '^JWT_SECRET=' .env 2>/dev/null; then
  echo "JWT_SECRET=$JWT_SECRET" >> .env
fi
# Idempotent: replace existing Model B identity lines rather than duplicating.
grep -q '^SERVER_ID=' .env || echo "SERVER_ID=$SERVER_ID" >> .env
grep -q '^SERVER_TOKEN=' .env || echo "SERVER_TOKEN=$SERVER_TOKEN" >> .env
grep -q '^API_URL=' .env || echo "API_URL=$API_URL" >> .env

# Build the worker image (host-network build override works around the provider's
# TLS interception on Docker bridge egress).
docker compose -f docker-compose.yml -f docker-compose.build.yml build worker

# Start only the streaming stack (relay + OME + worker).
docker compose --profile worker up -d

echo ""
echo "✓ Streaming server '$SERVER_ID' started (worker profile)."
echo "  Worker will bootstrap its tenant from: $API_URL"
echo ""
echo "Next:"
echo "  1. Register the server in the control plane (if not already):"
echo "     POST /api/servers  { name, server_id, worker_url, ingest_host, ingest_port, ome_url }"
echo "  2. Assign a tenant:"
echo "     POST /api/servers/$SERVER_ID/assign?tenant_id=<tenant-uuid>"
echo "  3. Deploy the TLS edge (nginx/server-edge.conf) for $SERVER_ID and set"
echo "     worker_url / ome_url to https://<server-name> accordingly."

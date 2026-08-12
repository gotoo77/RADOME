#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SERVER_ADDR="${RADOME_ADDR:-127.0.0.1:8787}"
HTTP_ADDR="${RADOME_HTTP_ADDR:-127.0.0.1}"
HTTP_PORT="${RADOME_HTTP_PORT:-8000}"

server_pid=""
http_pid=""

cleanup() {
  if [[ -n "$http_pid" ]]; then kill "$http_pid" 2>/dev/null || true; fi
  if [[ -n "$server_pid" ]]; then kill "$server_pid" 2>/dev/null || true; fi
}
trap cleanup EXIT INT TERM

cd "$ROOT_DIR"
RADOME_ADDR="$SERVER_ADDR" RADOME_TELEMETRY_SOURCE="${RADOME_TELEMETRY_SOURCE:-demo}" \
  cargo run -p radome-server &
server_pid=$!

cd "$ROOT_DIR/clients"
python3 -m http.server "$HTTP_PORT" --bind "$HTTP_ADDR" &
http_pid=$!

cat <<EOF

RADOME live demo
----------------
Server WebSocket : ws://$SERVER_ADDR
Cockpit          : http://$HTTP_ADDR:$HTTP_PORT/dashboard/
Diagnostic       : http://$HTTP_ADDR:$HTTP_PORT/dashboard/?diagnostic

Le cockpit découvre automatiquement les commandes du serveur.
Ctrl-C arrête le serveur RADOME et le serveur HTTP.
EOF

wait "$server_pid" "$http_pid"

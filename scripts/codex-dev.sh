#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

read_env_value() {
  local file="$1"
  local key="$2"
  [[ -f "$file" ]] || return 1

  awk -F= -v key="$key" '
    $0 ~ "^[[:space:]]*" key "[[:space:]]*=" {
      value = substr($0, index($0, "=") + 1)
      gsub(/^[[:space:]]+|[[:space:]]+$/, "", value)
      gsub(/^"|"$/, "", value)
      gsub(/^'\''|'\''$/, "", value)
      print value
      exit
    }
  ' "$file"
}

port_open() {
  node - <<'NODE'
const net = require("node:net")
const socket = net.createConnection({ host: "127.0.0.1", port: 7000 })
const done = (code) => {
  socket.destroy()
  process.exit(code)
}
socket.setTimeout(500)
socket.once("connect", () => done(0))
socket.once("timeout", () => done(1))
socket.once("error", () => done(1))
NODE
}

if port_open; then
  echo "[dev:codex] Port 7000 is already in use." >&2
  echo "[dev:codex] Auth0 callbacks are configured for http://localhost:7000, so stop the other server before starting this worktree." >&2
  exit 1
fi

scripts/codex-worktree-setup.sh --no-sync

database_url="$(read_env_value apps/worker/.env DATABASE_URL)"
if [[ -z "$database_url" ]]; then
  echo "[dev:codex] apps/worker/.env does not define DATABASE_URL." >&2
  exit 1
fi

APP_BASE_URL="http://localhost:7000" DATABASE_URL="$database_url" SKIP_INITIAL_SYNC=1 pnpm dev

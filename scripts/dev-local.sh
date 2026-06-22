#!/usr/bin/env bash
set -euo pipefail

root="$(git rev-parse --show-toplevel)"
cd "$root"

s3_pid=""

port_open() {
  local port="$1"
  node - "$port" <<'NODE'
const net = require("node:net")
const port = Number(process.argv[2])
const socket = net.createConnection({ host: "127.0.0.1", port })
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

ensure_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  [[ -f "$file" ]] || return 0

  node - "$file" "$key" "$value" <<'NODE'
const fs = require("node:fs")
const [file, key, value] = process.argv.slice(2)
const line = `${key}="${value}"`
let text = fs.readFileSync(file, "utf8")
const pattern = new RegExp(`^${key}=.*$`, "m")
const match = text.match(pattern)

if (!match) {
  text = `${text.replace(/\s*$/, "")}\n${line}\n`
} else if (/^[-A-Z0-9_]+=(["']{0,1})\1$/.test(match[0])) {
  text = text.replace(pattern, line)
}

fs.writeFileSync(file, text)
NODE
}

ensure_local_s3_env() {
  for env_file in apps/web/.env packages/api/.env; do
    ensure_env_value "$env_file" S3_ENDPOINT "http://127.0.0.1:4568"
    ensure_env_value "$env_file" S3_REGION "us-east-1"
    ensure_env_value "$env_file" S3_BUCKET "my-team-local"
    ensure_env_value "$env_file" S3_ACCESS_KEY_ID "S3RVER"
    ensure_env_value "$env_file" S3_SECRET_ACCESS_KEY "S3RVER"
    ensure_env_value "$env_file" S3_PUBLIC_URL "http://127.0.0.1:4568/my-team-local"
  done
}

cleanup() {
  if [[ -n "$s3_pid" ]]; then
    kill "$s3_pid" 2>/dev/null || true
    wait "$s3_pid" 2>/dev/null || true
  fi
}

trap cleanup EXIT INT TERM

ensure_local_s3_env

if port_open 4568; then
  echo "[dev] Local S3 is already running on http://127.0.0.1:4568"
else
  echo "[dev] Starting local S3 on http://127.0.0.1:4568"
  pnpm dev:s3 &
  s3_pid="$!"
  sleep 1
fi

pnpm dev:app

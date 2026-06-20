#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/codex-worktree-setup.sh [--sync|--no-sync] [--force-env] [--reset-db]

Bootstraps a Codex git worktree from the base non-Codex worktree:
  - copies service .env files from the base worktree
  - points this worktree at its own cloned database
  - keeps Auth0 callback config pinned to http://localhost:7000
  - installs pnpm dependencies
  - generates Prisma client and applies migrations
  - clones the base database when this worktree database is missing or empty

Options:
  --sync       Run a one-shot PCO + Rock API sync after migrations.
  --no-sync    Do not run the one-shot API sync.
  --force-env  Overwrite existing worktree .env files from the base worktree.
  --reset-db   Drop and recreate this worktree database from the base database.
EOF
}

sync_mode="never"
force_env=0
reset_db=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --)
      ;;
    --sync)
      sync_mode="always"
      ;;
    --no-sync)
      sync_mode="never"
      ;;
    --force-env)
      force_env=1
      ;;
    --reset-db)
      reset_db=1
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "[setup:codex] Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
  shift
done

root="$(git rev-parse --show-toplevel)"
cd "$root"

log() {
  printf '[setup:codex] %s\n' "$*"
}

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

set_env_value() {
  local file="$1"
  local key="$2"
  local value="$3"

  if grep -q "^${key}=" "$file"; then
    ENV_KEY="$key" ENV_VALUE="$value" perl -0pi -e \
      'BEGIN { $key = $ENV{ENV_KEY}; $value = $ENV{ENV_VALUE}; } s/^\Q$key\E=.*$/$key . "=\"" . $value . "\""/mge' \
      "$file"
  else
    printf '\n%s="%s"\n' "$key" "$value" >> "$file"
  fi
}

host_port_open() {
  local host="$1"
  local port="$2"

  node - "$host" "$port" <<'NODE'
const net = require("node:net")
const host = process.argv[2]
const port = Number(process.argv[3])
const socket = net.createConnection({ host, port })
const done = (code) => {
  socket.destroy()
  process.exit(code)
}
socket.setTimeout(1000)
socket.once("connect", () => done(0))
socket.once("timeout", () => done(1))
socket.once("error", () => done(1))
NODE
}

database_part() {
  local url="$1"
  local part="$2"

  node - "$url" "$part" <<'NODE'
try {
  const url = new URL(process.argv[2])
  const part = process.argv[3]
  if (part === "host") console.log(url.hostname)
  else if (part === "port") console.log(url.port || "5432")
  else if (part === "database") console.log(url.pathname.replace(/^\//, ""))
  else process.exit(1)
} catch {
  process.exit(1)
}
NODE
}

database_url_with() {
  local url="$1"
  local database="$2"
  local host="${3:-}"

  node - "$url" "$database" "$host" <<'NODE'
try {
  const url = new URL(process.argv[2])
  const database = process.argv[3]
  const host = process.argv[4]
  url.pathname = `/${database}`
  if (host) url.hostname = host
  console.log(url.toString())
} catch {
  process.exit(1)
}
NODE
}

worktree_database_name() {
  if [[ -n "${CODEX_WORKTREE_DB_NAME:-}" ]]; then
    printf '%s\n' "$CODEX_WORKTREE_DB_NAME"
    return
  fi

  local parent
  parent="$(basename "$(dirname "$root")")"
  printf 'myteam_%s\n' "$parent" |
    tr '[:upper:]-' '[:lower:]_' |
    tr -cd 'a-z0-9_' |
    cut -c 1-63
}

find_base_worktree() {
  if [[ -n "${CODEX_BASE_WORKTREE:-}" ]]; then
    printf '%s\n' "$CODEX_BASE_WORKTREE"
    return
  fi

  git worktree list --porcelain | awk -v current="$root" -v home="$HOME" '
    /^worktree / {
      path = substr($0, 10)
      if (path != current && path !~ home "/.codex/worktrees/") {
        print path
        exit
      }
    }
  '
}

psql_scalar() {
  local url="$1"
  local sql="$2"
  psql "$url" --no-psqlrc --tuples-only --no-align --quiet -c "$sql"
}

database_exists() {
  local admin_url="$1"
  local database="$2"
  [[ "$(psql_scalar "$admin_url" "select 1 from pg_database where datname = '${database}';")" == "1" ]]
}

person_count() {
  local database_url="$1"
  if [[ -z "$(psql_scalar "$database_url" "select to_regclass('public.\"Person\"');")" ]]; then
    printf '0\n'
  else
    psql_scalar "$database_url" "select count(*) from \"Person\";"
  fi
}

require_pg_tools() {
  if command -v psql >/dev/null 2>&1; then
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    log "Installing postgresql-client for sidecar database setup"
    sudo -n apt-get update
    sudo -n apt-get install -y postgresql-client
    return
  fi

  echo "[setup:codex] Missing psql. Install postgresql-client, then rerun setup." >&2
  exit 1
}

terminate_database_connections() {
  local admin_url="$1"
  local database="$2"

  psql "$admin_url" --no-psqlrc --quiet -c \
    "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${database}' and pid <> pg_backend_pid();" \
    >/dev/null
}

drop_database_if_exists() {
  local admin_url="$1"
  local database="$2"

  terminate_database_connections "$admin_url" "$database"
  psql "$admin_url" --no-psqlrc --quiet -c "drop database if exists \"${database}\";"
}

clone_database_from_template() {
  local admin_url="$1"
  local source_database="$2"
  local target_database="$3"

  if [[ "$target_database" == "$source_database" ]]; then
    echo "[setup:codex] Refusing to clone source database into itself." >&2
    exit 1
  fi

  log "Temporarily disconnecting sessions from $source_database for server-side clone"
  terminate_database_connections "$admin_url" "$source_database"
  psql "$admin_url" --no-psqlrc --quiet -c \
    "create database \"${target_database}\" with template \"${source_database}\";"
}

base_root="$(find_base_worktree)"
if [[ -z "$base_root" || ! -d "$base_root" ]]; then
  echo "[setup:codex] Could not find the base non-Codex worktree. Set CODEX_BASE_WORKTREE=/path/to/base." >&2
  exit 1
fi

env_files=(
  "packages/api/.env"
  "apps/web/.env"
  "apps/worker/.env"
)

log "Using base worktree: $base_root"

for env_file in "${env_files[@]}"; do
  source_file="$base_root/$env_file"
  if [[ ! -f "$source_file" ]]; then
    echo "[setup:codex] Missing source env file: $source_file" >&2
    exit 1
  fi

  if [[ ! -f "$env_file" || "$force_env" -eq 1 ]]; then
    mkdir -p "$(dirname "$env_file")"
    cp "$source_file" "$env_file"
    log "Copied $env_file"
  else
    log "Keeping existing $env_file"
  fi
done

source_database_url="$(read_env_value "$base_root/apps/worker/.env" DATABASE_URL)"
if [[ -z "$source_database_url" ]]; then
  echo "[setup:codex] $base_root/apps/worker/.env does not define DATABASE_URL." >&2
  exit 1
fi

source_host="$(database_part "$source_database_url" host)"
source_port="$(database_part "$source_database_url" port)"

if ! host_port_open "$source_host" "$source_port"; then
  if [[ "$source_host" == "db" ]] && host_port_open "localhost" "$source_port"; then
    log "Database host db is unavailable; using localhost:$source_port."
    source_database_url="$(database_url_with "$source_database_url" "$(database_part "$source_database_url" database)" "localhost")"
    source_host="localhost"
  else
    echo "[setup:codex] Base database is not reachable at $source_host:$source_port." >&2
    echo "[setup:codex] Start the devcontainer Postgres service, or update the base .env files." >&2
    exit 1
  fi
fi

target_database="$(worktree_database_name)"
if [[ ! "$target_database" =~ ^[a-z][a-z0-9_]{0,62}$ ]]; then
  echo "[setup:codex] Invalid worktree database name: $target_database" >&2
  echo "[setup:codex] Set CODEX_WORKTREE_DB_NAME to a lowercase PostgreSQL identifier." >&2
  exit 1
fi

source_database="$(database_part "$source_database_url" database)"
admin_database_url="$(database_url_with "$source_database_url" "postgres")"
target_database_url="$(database_url_with "$source_database_url" "$target_database")"

for env_file in "${env_files[@]}"; do
  set_env_value "$env_file" DATABASE_URL "$target_database_url"
done
set_env_value "apps/web/.env" APP_BASE_URL "http://localhost:7000"
set_env_value "apps/worker/.env" SKIP_INITIAL_SYNC "1"

require_pg_tools

if [[ "$reset_db" -eq 1 ]] && database_exists "$admin_database_url" "$target_database"; then
  if [[ "$target_database" == "$source_database" ]]; then
    echo "[setup:codex] Refusing to reset source database $source_database." >&2
    exit 1
  fi
  log "Dropping existing worktree database $target_database"
  drop_database_if_exists "$admin_database_url" "$target_database"
fi

if ! database_exists "$admin_database_url" "$target_database"; then
  log "Cloning $source_database into new worktree database $target_database"
  clone_database_from_template "$admin_database_url" "$source_database" "$target_database"
fi

target_person_count="$(person_count "$target_database_url")"
if [[ "$target_person_count" == "0" ]]; then
  log "Recreating empty worktree database $target_database from $source_database"
  drop_database_if_exists "$admin_database_url" "$target_database"
  clone_database_from_template "$admin_database_url" "$source_database" "$target_database"
else
  log "Using existing worktree database $target_database with $target_person_count people"
fi

log "Installing dependencies"
pnpm install

log "Generating Prisma client"
DATABASE_URL="$target_database_url" pnpm --filter @mt/api exec prisma generate

log "Applying database migrations"
DATABASE_URL="$target_database_url" pnpm --filter @mt/api exec prisma migrate deploy

target_person_count="$(person_count "$target_database_url")"

if [[ "$sync_mode" == "always" ]]; then
  log "Running one-shot API sync"
  DATABASE_URL="$target_database_url" pnpm --filter worker sync:once
else
  log "Skipping API sync; database has $target_person_count people from the cloned base DB"
fi

log "Ready. Start the app with: pnpm dev:codex"

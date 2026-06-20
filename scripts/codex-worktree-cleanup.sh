#!/usr/bin/env bash
set -euo pipefail

usage() {
  cat <<'EOF'
Usage: scripts/codex-worktree-cleanup.sh

Drops this Codex worktree's cloned sidecar PostgreSQL database.
The command refuses to drop the base database and only drops databases named
like myteam_<worktree>.
EOF
}

if [[ "${1:-}" == "-h" || "${1:-}" == "--help" ]]; then
  usage
  exit 0
fi

root="$(git rev-parse --show-toplevel)"
cd "$root"

log() {
  printf '[cleanup:codex] %s\n' "$*"
}

require_psql() {
  if command -v psql >/dev/null 2>&1; then
    return
  fi

  if command -v sudo >/dev/null 2>&1 && sudo -n true 2>/dev/null; then
    log "Installing postgresql-client for sidecar database cleanup"
    sudo -n apt-get update
    sudo -n apt-get install -y postgresql-client
    return
  fi

  echo "[cleanup:codex] Missing psql. Install postgresql-client, then rerun cleanup." >&2
  exit 1
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

database_part() {
  local url="$1"
  local part="$2"

  node - "$url" "$part" <<'NODE'
try {
  const url = new URL(process.argv[2])
  const part = process.argv[3]
  if (part === "database") console.log(url.pathname.replace(/^\//, ""))
  else if (part === "admin") {
    url.pathname = "/postgres"
    console.log(url.toString())
  } else {
    process.exit(1)
  }
} catch {
  process.exit(1)
}
NODE
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

database_url="$(read_env_value apps/worker/.env DATABASE_URL)"
if [[ -z "$database_url" ]]; then
  echo "[cleanup:codex] apps/worker/.env does not define DATABASE_URL." >&2
  exit 1
fi

require_psql

target_database="$(database_part "$database_url" database)"
admin_database_url="$(database_part "$database_url" admin)"

if [[ ! "$target_database" =~ ^myteam_[a-z0-9_]+$ ]]; then
  echo "[cleanup:codex] Refusing to drop non-worktree database: $target_database" >&2
  exit 1
fi

base_root="$(find_base_worktree)"
if [[ -n "$base_root" && -f "$base_root/apps/worker/.env" ]]; then
  source_database_url="$(read_env_value "$base_root/apps/worker/.env" DATABASE_URL)"
  source_database="$(database_part "$source_database_url" database)"
  if [[ "$target_database" == "$source_database" ]]; then
    echo "[cleanup:codex] Refusing to drop base database: $source_database" >&2
    exit 1
  fi
fi

log "Dropping sidecar database $target_database"
psql "$admin_database_url" --no-psqlrc --quiet -c \
  "select pg_terminate_backend(pid) from pg_stat_activity where datname = '${target_database}' and pid <> pg_backend_pid();" \
  >/dev/null
psql "$admin_database_url" --no-psqlrc --quiet -c "drop database if exists \"${target_database}\";"
log "Done"

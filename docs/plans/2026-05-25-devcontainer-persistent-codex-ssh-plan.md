---
status: active
created: 2026-05-25
---

# Devcontainer Persistent Codex And SSH Plan

## Problem Frame

The development container should remain usable as a stable local VM after VS Code disconnects, allow local SSH access using the developer's GitHub public keys, and include Codex CLI and VS Code extension support with persisted Codex configuration. The change must preserve the current devcontainer service name (`app`), remote user (`vscode`), existing named volume conventions, and current post-create setup behavior.

## Scope

- Keep the `app` devcontainer running after VS Code closes.
- Add local-only SSH server support with password authentication disabled and access limited to `vscode`.
- Persist GitHub CLI authentication, SSH state, and Codex configuration with named Docker volumes.
- Install Codex CLI in the devcontainer image using the existing Node/fnm setup.
- Configure Codex trust settings idempotently during post-create setup.
- Install the official OpenAI VS Code extension in the devcontainer.
- Document how to authenticate GitHub CLI, verify SSH, and understand the Codex trust boundary.

## Key Decisions

- Use `shutdownAction: "none"` in `.devcontainer/devcontainer.json` so VS Code disconnects do not stop the container.
- Continue using the existing GitHub CLI devcontainer feature instead of adding a separate apt install path.
- Add `openssh-server` to `.devcontainer/Dockerfile` and configure sshd at build time so runtime startup can be simple.
- Put the GitHub authorized keys sync helper in `/usr/local/bin/sync-github-authorized-keys` and call it from the `app` service command before launching sshd.
- Bind SSH to `127.0.0.1:2297:22` so access remains local-only and avoids the existing local `2222` conflict.
- Reuse the repo's `claude-code-*` volume naming style for GitHub and SSH state, and add `codex-config` for Codex home.
- Set `CODEX_HOME` to `/home/vscode/.codex` and mount it as a named volume so config survives rebuilds and restarts.
- Configure Codex with `approval_policy = "never"` and `sandbox_mode = "danger-full-access"` only inside the devcontainer VM trust boundary.

## Implementation Units

### 1. Devcontainer JSON

Files:
- `.devcontainer/devcontainer.json`

Work:
- Add or update `shutdownAction` to `none`.
- Merge `CODEX_HOME` into `containerEnv`.
- Append `openai.chatgpt` to the VS Code extensions list without removing `anthropic.claude-code`.

Validation:
- Parse the JSON with a standard JSON parser.
- Confirm existing service, workspace, remote user, feature, and environment settings remain present.

### 2. Devcontainer Image

Files:
- `.devcontainer/Dockerfile`

Work:
- Install `openssh-server` alongside existing system packages.
- Add sshd config that disables password and keyboard-interactive authentication, disables root login, enables public key auth, and allows only `vscode`.
- Install `/usr/local/bin/sync-github-authorized-keys` as an executable helper.
- Install `@openai/codex@latest` after Node is installed and active via fnm.

Validation:
- Build the `app` image when Docker is available.
- Run `codex --version` inside the devcontainer image.
- Run `sync-github-authorized-keys` inside a throwaway container and confirm unauthenticated GitHub CLI exits successfully with a warning.

### 3. Compose Runtime

Files:
- `.devcontainer/docker-compose.yml`

Work:
- Add named volume mounts for `/home/vscode/.ssh` and `/home/vscode/.codex`.
- Keep the existing `/home/vscode/.config/gh` persisted volume.
- Expose SSH on `127.0.0.1:2222:22`.
- Add an `app` command that prepares host keys, fixes `.ssh` ownership, syncs GitHub public keys, starts sshd, and then sleeps forever.
- Declare any new named volumes.

Validation:
- Run `docker compose -f .devcontainer/docker-compose.yml config`.
- If Docker is available, start the service and verify local SSH with `ssh -p 2222 vscode@127.0.0.1 true`.

### 4. Post-Create Codex Settings

Files:
- `.devcontainer/post_install.py`

Work:
- Add an idempotent `setup_codex_settings()` function.
- Ensure top-level `approval_policy` and `sandbox_mode` lines are removed before writing the desired values once.
- Preserve other existing Codex config lines.
- Include Codex config ownership repair in the existing mounted-volume ownership fix path.

Validation:
- Run the post-install script inside the container when Docker is available.
- Confirm `$CODEX_HOME/config.toml` contains the expected two top-level settings exactly once.

### 5. Documentation

Files:
- `docs/devcontainer-codex-ssh.md`

Work:
- Document persistent shutdown behavior, local-only SSH access, GitHub CLI authentication, verification commands, Codex installation, persisted `CODEX_HOME`, and the trust-boundary assumption.

Validation:
- Review the documentation commands for consistency with the actual service name, user, port, and volume paths.

## Test Scenarios

- Devcontainer JSON parses and keeps existing settings while adding persistent shutdown, Codex home, and OpenAI extension support.
- Docker Compose config renders successfully with the `app` service, `db` service, and declared named volumes.
- A fresh `app` container starts sshd before sleeping forever.
- The authorized-keys helper creates or repairs `~/.ssh/authorized_keys`, preserves manual keys, replaces only the managed GitHub keys block, and exits successfully when GitHub CLI is missing, unauthenticated, or has no public keys.
- Codex CLI is on `PATH` for `vscode`.
- Codex config is written to persisted `CODEX_HOME` with full trust settings exactly once.

## Risks

- Installing `@openai/codex@latest` means rebuilds can pick up newer CLI behavior. This follows the requested install target.
- SSH verification depends on the developer having authenticated GitHub CLI inside the container and having public keys on GitHub.
- Port `2297` could be occupied on some machines; binding to loopback minimizes exposure, and the docs call out where to change it if needed.

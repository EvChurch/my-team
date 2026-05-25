# Devcontainer Codex And Local SSH

This repo's devcontainer is configured to behave like a persistent local development VM.

## Persistence

`.devcontainer/devcontainer.json` sets:

```json
"shutdownAction": "none"
```

Closing Visual Studio Code disconnects from the container without stopping it. The `app` service command starts SSH and then runs `sleep infinity`, so the service stays alive until you stop it with Docker.

## Local SSH Access

The devcontainer image includes `openssh-server`, and `.devcontainer/docker-compose.yml` binds SSH to loopback only:

```yaml
ports:
  - "127.0.0.1:2297:22"
```

Password and keyboard-interactive authentication are disabled, root login is disabled, and sshd allows only the `vscode` user. This keeps access local to the host machine and backed by public keys.

On startup, the `app` service runs:

```bash
sync-github-authorized-keys
```

That helper discovers the authenticated GitHub user with `gh auth status --hostname github.com`, fetches public keys from `https://github.com/<user>.keys`, and writes them to `/home/vscode/.ssh/authorized_keys` inside this managed block:

```text
# BEGIN github.com public keys
# END github.com public keys
```

Manual keys outside that block are preserved.

## GitHub Authentication

GitHub CLI auth is persisted on the existing named Docker volume mounted at `/home/vscode/.config/gh`. SSH state is persisted on `devcontainer-ssh` mounted at `/home/vscode/.ssh`.

To enable automatic SSH key sync, open a shell inside the devcontainer and run:

```bash
gh auth login
```

Restart the devcontainer after authenticating so startup can refresh `authorized_keys`.

To verify the managed key block:

```bash
docker compose -f .devcontainer/docker-compose.yml exec app \
  sed -n '/BEGIN github.com public keys/,/END github.com public keys/p' ~/.ssh/authorized_keys
```

To verify local SSH access:

```bash
ssh -p 2297 vscode@127.0.0.1 true
```

If your SSH agent offers many keys, specify the GitHub private key explicitly:

```bash
ssh -p 2297 -o IdentitiesOnly=yes -i ~/.ssh/<github-private-key> vscode@127.0.0.1 true
```

If port `2297` conflicts on your machine, change the host-side port in `.devcontainer/docker-compose.yml`.

## Codex

The devcontainer image installs Codex CLI with:

```bash
npm install -g @openai/codex@latest
```

`.devcontainer/devcontainer.json` sets:

```json
"CODEX_HOME": "/home/vscode/.codex"
```

Docker Compose persists that directory on the `codex-config` named volume, so Codex configuration survives container rebuilds and restarts.

The post-create setup writes these top-level settings to `${CODEX_HOME}/config.toml` idempotently:

```toml
approval_policy = "never"
sandbox_mode = "danger-full-access"
```

This permission model assumes the devcontainer VM is the trust boundary.

To verify Codex inside the devcontainer:

```bash
docker compose -f .devcontainer/docker-compose.yml run --rm --no-deps app codex --version
docker compose -f .devcontainer/docker-compose.yml run --rm --no-deps app \
  bash -lc 'echo "$CODEX_HOME" && grep -E "^(approval_policy|sandbox_mode) = " "$CODEX_HOME/config.toml"'
```

## VS Code Extension

The devcontainer installs the official OpenAI Codex VS Code extension:

```json
"openai.chatgpt"
```

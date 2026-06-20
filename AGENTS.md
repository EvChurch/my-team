# AGENTS.md

## Codex Worktrees

- In a Codex-managed worktree, run `pnpm setup:codex` before app/database work.
- To run the app locally from a Codex worktree, use `pnpm dev:codex`; Auth0 callbacks require `http://localhost:7000`.
- Do not start the web app on a fallback port.
- The setup script copies env files from the base worktree, clones the sidecar `myteam` database into a per-worktree database, runs Prisma generation/migrations, and skips API sync by default.
- Use `pnpm sync:all` only when an explicit fresh PCO/Rock sync is needed.
- Use `pnpm cleanup:codex` before discarding a Codex worktree if you need to drop its cloned sidecar database.


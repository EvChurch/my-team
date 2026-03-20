# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**My Team** is a church volunteer team management app that integrates with Planning Center Online (PCO) for team/member data and adds Goals, Feedback, and Guides features that PCO doesn't provide. The full spec and design reference is in `design/MEGA_PROMPT.md`.

## Tech Stack

- **Framework**: Next.js (App Router) with TypeScript
- **Database**: PostgreSQL via Prisma ORM
- **API**: GraphQL (extend existing schema as needed)
- **Auth**: Planning Center OAuth SSO
- **Styling**: Tailwind CSS with custom design tokens (CSS custom properties)
- **Icons**: Lucide React
- **Font**: Outfit (400, 500, 600, 700) via Google Fonts

## Development Environment

Uses a devcontainer with:
- Node 24 via fnm (`~/.fnm`)
- Python 3.13 via uv
- GitHub CLI (`gh`)

## Package Manager

Uses **pnpm** (not npm/yarn). All commands use `pnpm` or `pnpm exec`.

## Common Commands

```bash
# Node (after fnm setup)
eval "$(fnm env)" && fnm use default
pnpm install
pnpm dev             # Start dev server (Turbopack)
pnpm build           # Production build
pnpm lint            # Lint

# Database
pnpm exec prisma generate    # Generate Prisma client
pnpm exec prisma migrate dev # Run migrations
pnpm exec prisma db push     # Push schema changes (dev)
```

## Architecture

### Data Model Split
- **PCO-synced (read-only)**: Team, Person, TeamMember, Role, serving schedules, campus info. Sync already exists — do NOT build team membership management UI.
- **App-native (full CRUD)**: Goal, Feedback, Guide — stored in PostgreSQL, managed via GraphQL mutations.

### Role-Based Access
- **All members**: View teams, their own goals/feedback, guides, settings
- **Team leaders**: Write feedback, approve/decline goals, create/edit/publish guides. Leader status comes from PCO team position/role data.

### Responsive Layout
- **Mobile (<768px)**: Full-width content, bottom tab bar (pill-shaped, 62px height, 4 tabs: My Teams, Goals, Guides, Settings)
- **Desktop (>=768px)**: 260px left sidebar + main content area (padding 40px 48px)

### Route Structure
```
(auth)/login           — PCO OAuth login
(app)/teams            — My Teams list
(app)/teams/[teamId]   — Team View (leader actions if applicable)
(app)/teams/[teamId]/roles/[roleId]      — Role View
(app)/teams/[teamId]/feedback/new        — Write Feedback (leader)
(app)/teams/[teamId]/goals/review        — Approve Goals (leader)
(app)/teams/[teamId]/guides/new          — Guide Editor (leader)
(app)/goals            — Goals & Feedback (segment tabs, ?tab=feedback)
(app)/guides           — Guides list
(app)/guides/[guideId] — Guide Detail
(app)/guides/[guideId]/edit              — Guide Editor (leader)
(app)/settings         — Settings
(app)/profile          — Profile
```

## Design Reference

- Full spec: `design/MEGA_PROMPT.md`
- All screens PDF: `design/design-exports/export.pdf`
- Individual screen PNGs: `design/design-exports/screens/`
- Source design file: `design/my-team.pen`
- 36 screens total (18 sections × mobile + desktop), including empty states

### Key Design Tokens
```
--accent: #3D8A5A    --bg-page: #F5F4F1    --text-primary: #1A1918
--accent-dark: #4D9B6A   --bg-card: #FFFFFF    --text-secondary: #6D6C6A
--accent-light: #C8F0D8  --bg-muted: #EDECEA   --coral: #D89575
--border: #E5E4E1        --error: #D08068
```

Cards: 16px radius, subtle shadow. Primary buttons: `--accent` bg, 10-12px radius. Pill badges: 10-12px radius.

## Workflow

Uses the **compound-engineering** Claude Code plugin for workflow management:
- `/ce:brainstorm` — explore requirements and approaches before building
- `/ce:plan` — transform feature descriptions into structured project plans
- `/ce:work` — execute work plans efficiently
- `/ce:review` — multi-agent code review
- `/ce:compound` — document solved problems for team knowledge
- `/simplify` — review changed code for reuse, quality, efficiency

## Implementation Priority

1. Core Shell: Layout (sidebar + tab bar), auth, My Teams, Team View
2. Read Screens: Role View, Settings, Profile, empty states
3. Goals & Feedback: Lists, segment control, cards
4. Guides: List, detail, role badges, search
5. Leader Management: Feedback form, goal approval, guide editor with rich text
6. Polish: Scroll fades, animations, loading/error states

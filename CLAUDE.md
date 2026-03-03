# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

> **Project-specific rules and current focus:** see [AGENTS.md](./AGENTS.md).

---

## What Is Pawvy?

**The task layer for human-agent teams.** Pawvy is an open-source task and project management tool built for developers who work alongside AI agents. It gives agents the context to start work and brings their output back to the human at exactly the right moment.

> *"Give agents context without heavy prompting, give humans insight without reading logs."*

---

## Tech Stack

| Layer | Technology |
|-------|------------|
| Backend | Node.js + Express + SQLite (`better-sqlite3`) + WebSocket (`ws`) |
| Frontend | React 19 + TypeScript + Vite + Tailwind CSS 4 |
| Drag-and-drop | @dnd-kit |
| Icons | lucide-react |
| Testing | Vitest (backend unit) + Playwright (E2E) |

---

## Commands

```bash
pnpm run dev              # Backend + Frontend concurrently
pnpm run dev:backend      # Backend only (port 3001)
pnpm run dev:frontend     # Frontend only (port 5173)
pnpm run build            # Build frontend

# Backend unit tests (Vitest)
pnpm -C backend test:run                                   # All unit tests
pnpm -C backend test:run src/services/taskService.test.ts  # Single test file
```

---

## Environment

Copy `.env.example` to `.env` in the project root. Key variables:

| Variable | Default | Purpose |
|----------|---------|---------|
| `PAWVY_API_KEY` | — | Bearer token for API auth (required) |
| `PAWVY_DB_PATH` | `~/.local/share/pawvy/pawvy.db` | SQLite path |
| `PAWVY_PROJECTS_DIR` | — | Directory to scan for projects |
| `PORT` / `HOST` | `3001` / `0.0.0.0` | Server bind |

Frontend reads `API_BASE`, `WS_BASE`, and `PAWVY_API_KEY` from `frontend/.env.local` (dev) or build args (Docker).

---

## Backend Architecture

```
backend/
├── server.ts                      # Entry point: wires Express, SQLite, WebSocket
├── src/
│   ├── config.ts                  # DB path, schema path, Pawvy config resolution
│   ├── domain/                    # Canonical TypeScript types (Task, Project, Activity)
│   ├── repositories/              # Raw SQLite access (better-sqlite3)
│   ├── services/                  # Business logic; tested with Vitest
│   ├── presentation/http/
│   │   ├── routes/                # Express routers (injected with db + broadcast)
│   │   ├── middleware/            # CORS, JSON, auth, logging, error handler
│   │   └── errors/httpError.ts   # Typed HTTP errors
│   └── infra/
│       ├── database/dbConnection.ts   # Opens/migrates SQLite DB
│       └── realtime/websocketHub.ts  # WebSocket server + broadcast fn
└── db/
    ├── schema.sql                 # Table definitions (source of truth)
    └── migrate.js                 # Migration runner
```

**Data flow:** `Route → Service → Repository → SQLite`

Routes receive `{ db, broadcast }` at startup. After mutations, routes call `broadcast({ type, data })` to push real-time events to WebSocket clients.

**WebSocket event types:** `task_created`, `task_updated`, `task_deleted`, `tasks_reordered`, `agent_status_updated`, `projects_updated`

---

## Frontend Architecture

```
frontend/src/
├── App.tsx                        # Router + WebSocket; routes: /, /project/:id, /activity, /inbox, /docs, /settings
├── pages/
│   ├── Kanban/                    # Board view (KanbanPage → KanbanBoard + TaskModals)
│   ├── Activity/                  # Agent activity feed
│   ├── Inbox/                     # Non-agent task checklist (InboxPage)
│   ├── Docs/                      # Workspace document tracker
│   └── Settings/                  # App settings
├── components/
│   ├── layout/                    # AppShell, IconRail, Topbar, Sidebar, AgentArcadePanel
│   └── ui/                        # Primitives: Button, Input, Select, Chip, Menu, Toast, Modal
├── hooks/                         # useWebSocket, useProjects, useHealth, useAgents
└── lib/
    ├── api.ts                     # All API calls + frontend type definitions
    └── toast.ts                   # Imperative toast system
```

Design tokens are CSS variables in `index.css`. Use `clsx` for conditional classes.

---

## API Endpoints

- `GET/POST/PATCH/DELETE /api/tasks` — Task CRUD; `POST /api/tasks/reorder`, `POST /api/tasks/archive_done`, `POST /api/tasks/bulk/assignee`
- `GET/POST /api/projects` — Project management; `POST /api/projects/discover` (auto-discover), `POST /api/projects` (manual registration with explicit `path`)
- `GET/POST /api/activities` — Activity timeline
- `GET/PATCH /api/settings` — App settings
- `GET /api/tags` — All tags in use
- `POST /api/webhook/pawvy` — OpenClaw plugin webhook (no API key required)
- `ws://localhost:3001/ws` — Real-time updates

---

## Data Model

| Entity | Key Fields |
|--------|------------|
| Task | `id`, `title`, `description`, `status`, `priority`, `tags` (JSON string → `string[]`), `assigned_to_type`, `assigned_to_id`, `non_agent`, `anchor`, `blocked_reason`, `project_id`, `is_someday` |
| Status | `backlog` \| `in_progress` \| `review` \| `done` |
| Priority | `low` \| `medium` \| `high` \| `urgent` \| null |
| Assignee | `assigned_to_type`: `'agent' \| 'human' \| null`; `assigned_to_id`: agent id or user id |
| Non-agent | `non_agent: 1` — inbox/reminder tasks; cannot be assigned to an agent |
| Anchor | `anchor`: explicit filesystem path override for agent context resolution |

**Anchor resolution priority:** task anchor → project root → category default → scratch workspace → blocked.

---

## Schema Changes

All schema changes go through `backend/db/schema.sql` (source of truth) and `backend/db/migrate.js`. Never modify the database directly. Run `node backend/db/migrate.js` after schema changes.

---

## OpenClaw Integration

The `extensions/pawvy/` plugin hooks into OpenClaw's agent lifecycle and POSTs status events to `/api/webhook/pawvy`. Configure via `openclaw.json` — see [docs/openclaw-integration.md](docs/openclaw-integration.md).

---

## See Also

- [AGENTS.md](./AGENTS.md) — Coding conventions, project structure, commit style
- [ROADMAP.md](./ROADMAP.md) — Feature roadmap
- [README.md](./README.md) — User documentation
- [docs/](./docs/) — Workflow guide, OpenClaw integration, context anchors, inbox, Docker setup

# AGENTS.md — Clawboard Development Guide

*Development rules and workflow for Clawboard. Read this every session.*

---

## Project Vision

**Clawboard** is a local-first command center for OpenClaw users. It Just Works™ with your existing OpenClaw setup.

The goal: **Zero-config integration** — OpenClaw users should be able to drop in Clawboard and have it work seamlessly.

---

## Current Focus

**Phase 11: OpenClaw Integration**

High priority:
1. Auto-Discovery — Clawboard provides setup script
2. Activity Reporting — CLI helper for agents to report activity

See ROADMAP.md for full plan.

---

## Docs Structure

| Path | Purpose | Committed? |
|------|---------|-------------|
| `docs/` | Implementation docs | ✅ Yes |
| `docs/internal/` | Personal notes | ❌ No |

---

## Workflow Rules

### Autopilot Mode
- **Default: OFF** — Explain first, don't execute without permission
- **Commit freely** — Don't push until approved

### Task Management
1. Check backlog: `curl -s http://127.0.0.1:3001/api/tasks?status=backlog`
2. Set task to `in_progress` before coding
3. Update `blocked_reason` if blocked
4. Mark `done` when complete

---

## Commands

```bash
pnpm run dev              # Backend + Frontend
pnpm run dev:backend     # Backend only (port 3001)
pnpm run dev:frontend    # Frontend only (port 5173)
pnpm run build           # Build frontend
pnpm run test:e2e        # Playwright tests
```

---

## Key Conventions

- **Backend:** Clean Architecture (Routes → Services → Repositories)
- **Frontend:** Page-centered, v2 components in `components/v2/`
- **Database:** SQLite — use API, not direct SQL
- **Tasks:** Via API, not direct DB writes

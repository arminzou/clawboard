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

---

## Database Audit Notes (2026-02-24)

Before dropping columns, fix schema/query mismatches first:

1. `activities.project_id` is queried in TS repository code but does not exist in schema.
2. `documents.project_id` is queried in legacy docs route but does not exist in schema.

Potential low-value columns to clean up later (after dependency removal + migration plan):

- `tasks.position` (legacy ordering field; currently still wired in backend/frontend contracts)
- `documents.first_seen` (present in schema/domain, no active product usage)
- `tags.created_at` (present in schema, tag API only uses `name`)

Rule: prefer staged deprecation (remove runtime usage first, then DB migration), not direct column drops.

Additional guardrails for DB changes:

1. Schema/query parity check: for every new API filter/sort field, verify the underlying column exists in `schema.sql` and current local DB (`PRAGMA table_info(...)`) before merge.
2. Legacy route caution: `/api/docs` still runs through `backend/routes/docs.js` (CommonJS). Validate DB changes against both TS routes and legacy routes.
3. DB change checklist (required for column removal):
   - Run usage audit with `rg` across backend/frontend/tests/docs.
   - Provide migration strategy for existing databases (not just fresh schema).
   - Update or add tests that cover the changed fields/queries.
   - Add a short backward-compat note if API payload shape changes.

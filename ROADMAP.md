# Roadmap — Clawboard

This document is the living plan. It’s expected to change as we implement and learn.

## Principles

- **README stays stable** (setup/architecture/API). This file churns.
- **Ship thin slices**: make one screen useful end-to-end before polishing.
- **Prefer boring tech**: keep dependencies low unless they buy real UX.
- **Kanban is the daily driver**: optimize the task loop first; docs/activities can lag.

---

## Current State

- Backend: Node.js + Express + SQLite + WebSocket
- API endpoints: tasks, activities, docs (+ stats)
- WebSocket: `ws://localhost:3001/ws`
- Frontend: React + TypeScript + Vite

---

## Phase 2 — Frontend MVP (make it usable)

### Milestone A — App skeleton + data wiring

**Goal:** The UI loads, hits the backend, and shows real data with basic UX states.

- [x] Layout shell (nav + main content + header)
- [x] Connection indicators
  - [x] Backend reachable (`/api/health`)
  - [x] WS connected / reconnecting
- [x] Typed API client wrappers (tasks/activities/docs)
- [x] Pages (read-only is fine at first)
  - [x] Tasks (Kanban)
  - [x] Activities feed (with ingest + filters)
  - [x] Docs list + stats (with resync)
- [x] Error/loading/empty states (no blank screens)

**Done when:** I can open the app and see tasks/activities/docs populated from the API.

### Milestone B — Tasks Kanban (core value)

**Goal:** Tasks can be managed visually and persisted.

- [x] Kanban columns by `status` (current set: `backlog | in_progress | review | done`)
- [x] Task card component (title, priority, assigned_to)
- [x] Create task UI (modal) → `POST /api/tasks`
- [x] Edit task UI → `PATCH /api/tasks/:id`
- [x] Delete task UI (modal) → `DELETE /api/tasks/:id`
- [x] Drag-and-drop between columns updates:
  - [x] `status`
  - [x] ordering (`position`)
  - [x] persistence fix: don’t skip PATCH due to optimistic drag-over state

**Done when:** I can create a task and drag it across columns and it stays after refresh.

### Milestone C — Realtime UX (feels “live”)

**Goal:** Updates propagate without manual refresh.

- [x] WS client subscribes to server events
- [x] Apply updates to in-memory state (tasks/activities/docs)
- [x] “Last updated” / subtle toast for incoming updates (optional)

**Done when:** Creating/editing tasks in one tab updates another tab in near real-time.

---

## Phase 3 — Kanban as a daily driver (focus now)

### Milestone D — Task model upgrades (so it can represent real work)

**Goal:** Add the minimum fields needed to track real-life work without inventing process.

- [ ] Add `due_date` (nullable) + UI display / filter
- [ ] Add `tags` (simple CSV or separate table) + filter chips
- [ ] Add `blocked` workflow support
  - [ ] Decide: new status (`blocked`) vs `blocked_reason` field + visual badge
  - [ ] Add `blocked_reason` (nullable)
- [ ] Add `estimate` (optional, points or minutes) and show on card

### Milestone E — Fast editing (minimize clicks)

**Goal:** Most changes should be possible without opening a big modal.

- [ ] Inline edits on card (priority / assignee / status)
- [ ] “Quick add” task input per column (Enter to create)
- [ ] Keyboard shortcuts:
  - [ ] Move selected task left/right (status)
  - [ ] Assign to tee/fay/armin quickly
  - [ ] Set priority quickly
- [ ] Editable status from modal already exists; expand modal to show more metadata when added

### Milestone F — Power views (so you can trust it as your todo system)

**Goal:** You can always find “what should I do next?”

- [ ] Saved views (e.g. “Today”, “This week”, “Backlog triage”, “Blocked”)
- [ ] Filter bar improvements (status, assignee, priority, tags, due date)
- [ ] Sort options per column (manual position vs priority vs due date)

### Milestone G — Bulk ops + safety

**Goal:** Make big reorganizations easy and prevent mistakes.

- [ ] Multi-select tasks + bulk change (status/assignee/priority/tags)
- [ ] Undo for destructive actions (at least delete → soft-delete/trash)
- [ ] Archive / hide done tasks (keep DB small + board clean)

---

## Phase 4 — Secondary surfaces (docs / activities)

(These can wait until Kanban is solid.)

- [x] Docs page improvements
- [x] Activities timeline improvements

---

## Phase 5 — Polish / hardening

- [x] Search everywhere (tasks/docs/activities)
- [x] Persist UI state (filters, last view)
- [x] Deployment packaging (single command; optional Docker)
- [ ] Auth (only if ever exposed beyond localhost)

---

## Open Questions / Decisions (parking lot)

- Status columns: `backlog | in_progress | review | done` vs adding `blocked`
- Ordering model: keep integer `position` vs fractional ordering / reorder endpoint
- Tags storage: CSV-in-column vs normalized table
- Soft delete vs hard delete (trash/restore?)

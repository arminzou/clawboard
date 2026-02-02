# Roadmap — Project Manager Dashboard

This document is the living plan. It’s expected to change as we implement and learn.

## Principles

- **README stays stable** (setup/architecture/API). This file churns.
- **Ship thin slices**: make one screen useful end-to-end before polishing.
- **Prefer boring tech**: keep dependencies low unless they buy real UX.

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

- [ ] Layout shell (nav + main content + header)
- [ ] Connection indicators
  - [ ] Backend reachable (`/api/health`)
  - [ ] WS connected / reconnecting
- [ ] Typed API client wrappers (tasks/activities/docs)
- [ ] Pages (read-only is fine at first)
  - [ ] Tasks list
  - [ ] Activities feed
  - [ ] Docs list + stats
- [ ] Error/loading/empty states (no blank screens)

**Done when:** I can open the app and see tasks/activities/docs populated from the API.

### Milestone B — Tasks Kanban (core value)

**Goal:** Tasks can be managed visually and persisted.

- [ ] Kanban columns by `status` (finalize the exact set)
- [ ] Task card component (title, priority, assigned_to, updated)
- [ ] Create task UI (modal or side panel) → `POST /api/tasks`
- [ ] Edit task UI → `PATCH /api/tasks/:id`
- [ ] Drag-and-drop between columns updates:
  - [ ] `status`
  - [ ] ordering (`position`)

**Done when:** I can create a task and drag it across columns and it stays after refresh.

### Milestone C — Realtime UX (feels “live”)

**Goal:** Updates propagate without manual refresh.

- [ ] WS client subscribes to server events
- [ ] Apply updates to in-memory state (tasks/activities/docs)
- [ ] “Last updated” / subtle toast for incoming updates (optional)

**Done when:** Creating/editing tasks in one tab updates another tab in near real-time.

---

## Phase 3 — Document tracker + activity timeline

- [ ] Docs page improvements
  - [ ] Sorting/filtering (recently modified, git dirty, type)
  - [ ] Better metadata display
- [ ] Activities timeline
  - [ ] Group by day
  - [ ] Filter by agent / type
  - [ ] Link activity → related task when `related_task_id` exists

---

## Phase 4 — Polish / hardening

- [ ] Search everywhere (tasks/docs/activities)
- [ ] Keyboard shortcuts / quick-add task
- [ ] Persist UI state (filters, last view)
- [ ] Deployment packaging (single command; optional Docker)
- [ ] Auth (only if ever exposed beyond localhost)

---

## Open Questions / Decisions (parking lot)

- Status columns: `backlog | in_progress | blocked | done` (or something else?)
- Drag-and-drop library choice (or native HTML5)
- How WS events are shaped (do we push full records or deltas?)

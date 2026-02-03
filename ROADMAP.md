# Roadmap — Clawboard

This document is the living plan. It’s expected to change as we implement and learn.

## Principles

- **README stays stable** (setup/architecture/API). This file churns.
- **Ship thin slices**: get feedback early, iterate fast.
- **Prefer boring tech** unless UX demands otherwise.
- **Kanban is the daily driver**: optimize the task loop first; docs/activities can lag.
- **Course-correct aggressively**: if the UI direction feels wrong, stop and pivot.

---

## Current State

- Backend: Node.js + Express + SQLite + WebSocket
- API endpoints: tasks, activities, docs (+ stats)
- WebSocket: `ws://localhost:3001/ws`
- Frontend: React + TypeScript + Vite + Tailwind

---

## Phase 2 — Frontend MVP (functional baseline)

### Milestone A — App skeleton + data wiring

- [x] Layout shell (nav + main content + header)
- [x] Backend connectivity indicator (`/api/health`) + WS status
- [x] Typed API client wrappers (tasks/activities/docs)
- [x] Pages wired to real data: Kanban, Activity, Docs
- [x] Error/loading/empty states

### Milestone B — Tasks Kanban (core CRUD + persistence)

- [x] Columns by `status` (`backlog | in_progress | review | done`)
- [x] Create/Edit/Delete task
- [x] Drag-and-drop across columns + ordering persistence

### Milestone C — Realtime UX

- [x] WS updates for tasks/activities/docs

---

## Phase 3 — UI Redesign (Reference v2: Asana-ish board)

**Motivation:** The current look-and-feel doesn’t naturally converge toward the preferred reference UI.

**Strategy:** Build a *new* UI shell + Kanban board presentation inspired by the reference, then migrate features onto it.

### Milestone D — Design system + UI foundations (1–2 sessions)

- [ ] Decide component strategy:
  - Option A (recommended): keep React+Tailwind, add **shadcn/ui (Radix primitives)** + **lucide-react** icons
  - Option B: adopt a full component library (Mantine/Chakra/MUI) if we can’t reach the desired polish quickly
- [ ] Establish design tokens (CSS vars + Tailwind config):
  - [ ] surfaces, borders, shadows, radius, typography scale
  - [ ] consistent chip styles (status/priority/tags)
- [ ] Build “UI kit” primitives used everywhere:
  - [ ] Button / IconButton
  - [ ] Input / Select
  - [ ] Badge/Chip
  - [ ] Card container

**Done when:** We can build screens that look cohesive without bespoke styling each time.

### Milestone E — App shell v2 (matches reference layout)

- [ ] Left icon rail (already close) — keep
- [ ] Add **secondary sidebar** (Kanban-only for now):
  - [ ] Views list (All / Backlog / In Progress / Review / Done)
  - [ ] Filters (Hide done, assignee)
  - [ ] Collapsible sections
- [ ] Top toolbar:
  - [ ] Board title + workspace/project label
  - [ ] Search (global within Kanban)
  - [ ] “Add” primary action
  - [ ] Optional: Board/Table toggle (Table can be stubbed)

**Done when:** The layout reads like a modern project tool even before card polish.

### Milestone F — Kanban board v2 (card + column polish)

- [ ] Column header design:
  - [ ] title + count bubble
  - [ ] per-column quick-add button
  - [ ] column menu placeholder (…)
- [ ] Card redesign to match reference *without noise*:
  - [ ] Full title (multi-line)
  - [ ] Small structured metadata rows (no avatars required):
    - [ ] task id
    - [ ] status chip (optional if redundant)
    - [ ] created date
    - [ ] priority chip
  - [ ] Remove description from card (modal-only)
- [ ] Drag/drop affordances:
  - [ ] insertion indicator/placeholder (so user knows where it will land)
  - [ ] smoother transitions (but keep fast)

**Done when:** The board is pleasant to skim and feels “premium”.

### Milestone G — Kanban UX power features (still Kanban-only)

- [ ] Saved views (persisted filters)
- [ ] Hide/archive done tasks (board stays clean)
- [ ] Quick-add improvements (enter-to-create, focus management)
- [ ] Keyboard shortcuts for power use (optional)

---

## Phase 4 — Data model upgrades (only as UI needs them)

Add fields only when the UI has a clear place for them.

- [ ] `due_date` (nullable) + show on card + filter
- [ ] `tags` + filter chips
- [ ] `blocked_reason` (or a `blocked` status)

---

## Phase 5 — Secondary surfaces (docs / activities)

(Deprioritized until Kanban v2 feels right.)

---

## Phase 6 — Hardening

- [ ] Auth (only if ever exposed beyond localhost)

---

## Open Questions / Decisions

- Status model: keep 4 columns vs introduce `blocked`
- Ordering model: integer `position` vs fractional ordering / reorder endpoint
- Component strategy: shadcn/ui vs full UI framework

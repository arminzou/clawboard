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

> **Working branch:** `v2/board-redesign` (commits local; push only after review)

**Motivation:** The current look-and-feel doesn’t naturally converge toward the preferred reference UI.

**Strategy:** Build a *new* UI shell + Kanban board presentation inspired by the reference, then migrate features onto it.

### Milestone D — Design system + UI foundations (1–2 sessions)

- [ ] Decision: **stay on React + Tailwind** for v2 (fastest iteration)
  - [ ] Optional: add shadcn/ui + lucide-react later if needed
- [ ] Establish design tokens (CSS vars + Tailwind-friendly classes):
  - [ ] surfaces, borders, shadows, radius, typography scale
  - [ ] consistent chip styles (status/priority)
- [ ] Build a tiny internal “UI kit” (local components):
  - [ ] `Button` / `IconButton`
  - [ ] `Input`
  - [ ] `Chip`
  - [ ] `Panel`

**Done when:** Screens look cohesive and the reference style can be expressed quickly.

### Milestone E — App shell v2 (matches reference layout)

- [ ] Introduce **v2 layout components** (no external lib required):
  - [ ] `AppShellV2` (layout grid)
  - [ ] `IconRail` (pinnable)
  - [ ] `SidebarV2` (secondary sidebar)
  - [ ] `TopbarV2` (toolbar)
- [ ] Left icon rail (keep; refine styling to match reference)
- [ ] Secondary sidebar (Kanban-only):
  - [ ] Project/board selector header (static for now)
  - [ ] Views list (All / Backlog / In Progress / Review / Done)
  - [ ] Filters section (Hide done, assignee)
  - [ ] Collapsible sections + persisted expanded state
- [ ] Top toolbar:
  - [ ] Board title + workspace/project label
  - [ ] Primary “Add” button
  - [ ] Search input (global within Kanban)
  - [ ] Board/Table toggle (Table stubbed)

**Done when:** The layout reads like the reference UI and the board has maximum usable width.

### Milestone F — Kanban board v2 (card + column polish)

- [ ] Replace current Kanban UI with **`KanbanBoardV2`**:
  - [ ] Columns: calmer spacing, soft containers, consistent headers
  - [ ] Column header actions: + add, … menu (stub)
- [ ] Card redesign (reference-inspired, low noise):
  - [ ] Title (multi-line) as the primary element
  - [ ] Metadata rows (simple text + tiny icons; no avatars):
    - [ ] Task ID
    - [ ] Assignee
    - [ ] Created date
    - [ ] Priority badge
  - [ ] Description hidden on card (modal only)
- [ ] Interaction polish:
  - [ ] Drop indicator/placeholder (show insertion point)
  - [ ] Hover/focus states consistent with v2 design system
  - [ ] Reduce layout shift while dragging

**Done when:** The board matches the reference vibe, is skimmable, and drag/drop feels obvious.

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

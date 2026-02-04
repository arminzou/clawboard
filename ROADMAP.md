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

> **Working branch:** `v2/board-redesign` (**commits local; do NOT push** until review)

**Motivation:** The current look-and-feel doesn’t naturally converge toward the preferred reference UI.

**Strategy:** Build a *new* UI shell + Kanban board presentation inspired by the reference, then migrate features onto it.

### Milestone D — Design system + UI foundations (1–2 sessions)

- [x] Decision: **stay on React + Tailwind** for v2 (fastest iteration)
  - [ ] Optional: add shadcn/ui + lucide-react later if needed
- [x] Establish design tokens (CSS vars + Tailwind-friendly classes):
  - [x] surfaces, borders, shadows, radius, typography scale
  - [x] consistent chip styles (status/priority)
- [x] Build a tiny internal “UI kit” (local components):
  - [x] `Button` / `IconButton`
  - [x] `Input`
  - [x] `Chip`
  - [x] `Panel`

**Done when:** Screens look cohesive and the reference style can be expressed quickly.

### Milestone E — App shell v2 (matches reference layout)

- [x] Introduce **v2 layout components** (no external lib required):
  - [x] `AppShellV2` (layout grid)
  - [x] `IconRail` (pinnable)
  - [x] `SidebarV2` (secondary sidebar)
  - [x] `TopbarV2` (toolbar)
- [x] Left icon rail (refined to match reference vibe)
- [x] Secondary sidebar (Kanban-only):
  - [x] Project/board selector header (static for now)
  - [x] Views list (All / Backlog / In Progress / Review / Done)
  - [x] Filters section (Hide done, assignee)
  - [x] Collapsible sections + persisted expanded state
- [x] Top toolbar:
  - [x] Board title + workspace/project label
  - [x] Primary “Add” button
  - [x] Search input (global within Kanban)
  - [x] Board/Table toggle (Table stubbed)

**Done when:** The layout reads like the reference UI and the board has maximum usable width.

### Milestone F — Kanban board v2 (card + column polish)

- [x] Replace current Kanban UI with **`KanbanBoardV2`**
  - [x] Columns: calmer spacing, soft containers, consistent headers
  - [x] Column header actions: + add, … menu (stub)
- [x] Card redesign (reference-inspired, low noise):
  - [x] Title (multi-line) as the primary element
  - [x] Metadata rows (simple text + tiny icons; no avatars):
    - [x] Task ID
    - [x] Assignee
    - [x] Created date
    - [x] Priority badge
  - [x] Description hidden on card (modal only)
- [x] Interaction polish:
  - [x] Drop indicator/placeholder (show insertion point)
  - [x] Hover/focus states consistent with v2 design system
  - [x] Reduce layout shift while dragging

**Done when:** The board matches the reference vibe, is skimmable, and drag/drop feels obvious.

### Milestone G — Kanban UX power features (still Kanban-only)

- [x] Saved views (persisted filters)
- [x] Hide/archive done tasks (board stays clean)
- [x] Quick-add improvements (enter-to-create, focus management)
- [x] Keyboard shortcuts for power use (N = new task, / = search)

---

## Phase 4 — Data model upgrades (only as UI needs them)

Add fields only when the UI has a clear place for them.

- [x] `due_date` (nullable) + show on card + filter
- [x] `tags` (JSON array) stored + editable + shown on cards
- [x] Tag filtering UI (sidebar select)
- [x] `blocked_reason` (nullable text) + shown in v2 UI

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

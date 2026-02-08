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
  - [x] Optional: shadcn/ui **deferred** (revisit only if local UI kit slows us down)
  - [x] Add lucide-react (icons)
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
  - [x] Column header actions: + add, … menu
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

(Deprioritized until Kanban v2 feels right — but keep small UX alignment wins here.)

- [x] Wrap Activity + Docs tabs in the v2 shell (topbar + consistent surfaces)
- [ ] Migrate Activity UI styling to v2 tokens (reduce slate hard-coding)
- [ ] Migrate Docs UI styling to v2 tokens (reduce slate hard-coding)

---

## Phase 6 — Hardening

- [x] Auth (optional API key; only enforce when `CLAWBOARD_API_KEY` is set)

---

## Phase 7 — UI Polish & Workflow (2025-02 review)

### Critical Fixes

- [x] Modal focus trap (accessibility: can't tab outside modal)
- [x] Modal overlay click to dismiss
- [x] Task title overflow — add `line-clamp-2` to prevent hiding metadata
- [x] Error state retry button (currently dead end)

### Workflow Improvements

- [x] Bulk operations (multi-select + bulk assign/status/delete)
- [x] Task duplication / clone
- [x] Due date visible on cards (not just in modal)
- [x] Filter by blocked status
- [x] Overdue tasks warning banner
- [x] Table view sorting (click headers)
- [x] Keyboard shortcut help modal (`?` key)

### UI Kit Completion

- [x] Extract `<Select>` component (currently inconsistent across files)
- [x] Extract `<Checkbox>` component (native checkbox doesn't match design)
- [x] Toast variants (success/error/warning colors)
- [x] Date format utility (inconsistent across views)

### Saved Views Polish

- [x] Toast confirmation when view saved
- [x] Edit saved view name/filters after saving
- [x] Show active filters summary in sidebar

### Mobile / Responsive

- [x] Responsive grid breakpoints (1col → 2col at md, 4col at xl) for portrait monitors
- [x] Collapsible sidebar toggle for more board space
- [x] Sidebar slide-in drawer for mobile (currently hidden and broken)

### Code Quality

- [x] Extract `useLocalStorage` hook (dedupe ~15 try-catch blocks)
- [x] Group filter state (10+ useState → single object)
- [x] Memoize `TaskCardV2` with `React.memo()`

---

## Phase 8 — Multi-Project Hub

Transform Clawboard into a central dashboard for all workspace projects.

### Milestone H — Project Discovery & Backend Migration

- [x] Project discovery logic (scan `/projects/*` directory)
- [x] Database schema migration:
    - [x] Create `projects` table (metadata: name, path, icon, color)
    - [x] Add `project_id` to `tasks`, `activities`, and `documents` tables
    - [x] Populate initial `clawboard` project and link existing records
- [x] API updates:
    - [x] `GET /api/projects` (list all discovered projects)
    - [x] `POST /api/projects/discover` (scan workspace and sync)
    - [x] `GET /api/projects/:id` + `PATCH /api/projects/:id`
    - [x] Filter `tasks`/`activities`/`docs` by `project_id`

### Milestone I — Frontend Project Switcher

- [x] Project switcher in sidebar (functional dropdown with project list)
- [x] Filter tasks by selected project
- [x] "All Projects" view (cross-project aggregation)
- [x] Global "My Tasks" quick-access view (cross-project, shows count)
- [ ] URL routing: `/project/:id/kanban` (requires React Router)
- [ ] Project-specific stats/activities summary

---

## Open Questions / Decisions

- Status model: keep 4 columns vs introduce `blocked` (currently using `blocked_reason` field instead)
- Ordering model: integer `position` vs fractional ordering / reorder endpoint
- Component strategy: shadcn/ui deferred; revisit if local UI kit slows down
- Pagination: not needed yet, but will matter at 1000+ tasks
- Advanced search operators: `assignee:tee status:done` syntax for power users

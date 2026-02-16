# Roadmap — Clawboard 🗺

This document is the living plan for Clawboard. It tracks where we've been and where we're going.

## ✅ Completed Phases

- **Phase 1: Project Foundation** (Core backend with Node/Express/SQLite)
- **Phase 2: Frontend MVP** (Basic React dashboard + Kanban board)
- **Phase 3: UI Redesign** (New "Asana-ish" board design with Tailwind)
- **Phase 4-7: UI Polish** (Bulk actions, keyboard shortcuts, saved views, responsive design)
- **Phase 8: Multi-Project Hub** (Automatic project discovery, cross-project views)
- **Phase 9: Backend Clean Architecture** (Completed refactor + TypeScript + testing foundation)
- **Phase 10: Frontend Clean Architecture** (Completed page-centered refactor)

---

## 🚧 Current Phase: Project & Views UX Polish (In Progress)

- [x] Standardize modal shell (PromptModal/ConfirmModal via ModalShell)
- [x] Views UI refresh (current view dropdown + saved views menu + Save As modal)
- [x] Project discovery: honor PROJECTS_ROOT + always show project dropdown
- [x] Add “Assign unassigned tasks” action (API + UI)
- [x] Make All Projects selection deterministic (URL → project state sync)
- [ ] Define project assignment strategy for legacy tasks (auto-assign vs manual)
- [ ] Decide default project behavior when only one exists

---

## 🚧 Current Phase: CI/CD (In Progress)

- [x] Create initial CI workflow for Forgejo Actions (builds and tests on push)
- [x] Configure CD to deploy the application to the homelab Docker environment
- [ ] Add Forgejo secret `TEE_SSH_KEY` to enable SSH access for deployment

---

## 🧪 Validation Track — Testing & Debugging (Deferred)

Make sure all current functionality works end-to-end before real-time collaboration.

### Goals

- Validate backend APIs + WebSocket flows
- Run unit tests + smoke tests
- Verify VS Code debugging works for backend + frontend
- Manual UI regression checklist

### Checklist

- [ ] Expand backend unit tests (Vitest): tasks, projects, activities, docs, auth
- [ ] Run backend smoke test + API health
- [ ] Add Playwright E2E (drag/drop + key board flows)
- [ ] Manual UI regression: board load, drag/drop, create/edit task, project switch, activity feed
- [ ] Verify VS Code debugging configs (backend + frontend)
- [ ] Fix any regressions found

---

## ✅ Phase 9 — Backend Clean Architecture (Completed)

Refactor backend for maintainability as codebase grows. Enable unit testing, separate concerns, migrate to TypeScript.

### Principles

- **Explain as we go**: Document architectural decisions and fundamentals in `docs/learning/`.
- **Pragmatic layering**: Clear separation without over-engineering.
- **Incremental migration**: `.js` and `.ts` can coexist during the move.
- **Legacy layout note**: backend currently has `routes/`, `utils/`, `db/` at the top-level (pre-migration). As part of Phase 9, we will progressively move HTTP wiring/controllers under `backend/src/` (keeping `src/domain`, `src/repositories`, `src/services`, etc.) and delete the legacy folders once fully migrated.

### Milestone O — TypeScript, Testing & Core Abstractions (High Priority)

- [x] **Add TypeScript to backend (#74)**: Set up the compiler and type definitions.
- [x] **Setup Vitest framework (#85)**: Add the tools needed for automated testing.
- [x] **Extract models/types layer (#75)**: Define the "shape" of our data in code.
- [x] **Extract TaskRepository (#76)**: Move SQL queries into a dedicated "Data Layer."
- [x] **Extract TaskService (#77)**: Move business logic into a dedicated "Brain Layer."
- [x] **Add unit tests for TaskService (#84)**: Verify the "Brain" works correctly.
- [x] **Refactor routes to thin handlers (#78)**: Make controllers focus only on HTTP.
- [x] **Add centralized error handling middleware (#79)**: One place to format errors + map domain errors → HTTP.
- [x] **Extract WebSocket manager (#80)**: Separate real-time broadcast concerns from server wiring.
- [x] **Extract ProjectRepository + ProjectService (#81)**: Clean separation for project discovery + metadata.
- [x] **Extract ActivityRepository + ActivityService (#82)**: Clean separation for activity timeline.
- [x] **Slim down server.ts to pure wiring (#83)**: Server should just compose dependencies + register routes.

---

## ✅ Phase 10 — Frontend Clean Architecture (Completed)

Page-centered structure with shared UI and cross-page hooks.

---

## 🎯 Future Phases

### Phase 11 — Real-time Collaboration (Planning)

Enable multiple agents (Tee, Fay, Armin) to work on the same board with awareness of each other's activity.

- **Milestone K**: Presence System (See who is online)
- **Milestone L**: Task Locking (Avoid editing the same task at once)
- **Milestone M**: Enhanced Sync (Optimistic updates + conflict handling)

---

## 📚 Jargon Buster

If you're new to these terms, here's the "Quick & Dirty" explanation:

- **TypeScript**: JavaScript with "guardrails." It catches errors before you even run the code.
- **Vitest**: A high-speed testing tool. It runs your "unit tests" to make sure code logic is correct.
- **Clean Architecture**: A way of organizing code so that different parts (Database, Logic, UI) don't get tangled together.
- **Repository Pattern**: A piece of code that acts as a librarian—it's the only part that knows how to talk to the database.
- **Service Layer**: The "Brain" of the application. It makes decisions (e.g., "Is this task overdue?") but doesn't care how data is stored.
- **Middleware**: Code that runs "in the middle" of a request (e.g., checking if you have a valid API key).

---

## Open Questions / Decisions

- Status model: keep 4 columns vs introduce `blocked` (currently using `blocked_reason` field instead)
- Ordering model: integer `position` vs fractional ordering / reorder endpoint
- Component strategy: shadcn/ui deferred; revisit if local UI kit slows down
- Pagination: not needed yet, but will matter at 1000+ tasks
- Advanced search operators: `assignee:tee status:done` syntax for power users

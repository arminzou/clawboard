# Roadmap — Clawboard 🗺

This document is the living plan for Clawboard. It tracks where we've been and where we're going.

## ✅ Completed Phases

- **Phase 1: Project Foundation** (Core backend with Node/Express/SQLite)
- **Phase 2: Frontend MVP** (Basic React dashboard + Kanban board)
- **Phase 3: UI Redesign** (New "Asana-ish" board design with Tailwind)
- **Phase 4-7: UI Polish** (Bulk actions, keyboard shortcuts, saved views, responsive design)
- **Phase 8: Multi-Project Hub** (Automatic project discovery, cross-project views)

---

## 🚧 Current Phase: Phase 10 — Backend Clean Architecture

Refactor backend for maintainability as codebase grows. Enable unit testing, separate concerns, migrate to TypeScript.

### Principles

- **Explain as we go**: Document architectural decisions and fundamentals in `docs/learning/`.
- **Pragmatic layering**: Clear separation without over-engineering.
- **Incremental migration**: `.js` and `.ts` can coexist during the move.

### Milestone O — TypeScript, Testing & Core Abstractions (High Priority)

- [ ] **Add TypeScript to backend (#74)**: Set up the compiler and type definitions.
- [ ] **Setup Vitest framework (#85)**: Add the tools needed for automated testing.
- [ ] **Extract models/types layer (#75)**: Define the "shape" of our data in code.
- [ ] **Extract TaskRepository (#76)**: Move SQL queries into a dedicated "Data Layer."
- [ ] **Extract TaskService (#77)**: Move business logic into a dedicated "Brain Layer."
- [ ] **Add unit tests for TaskService (#84)**: Verify the "Brain" works correctly.
- [ ] **Refactor routes to thin handlers (#78)**: Make controllers focus only on HTTP.

---

## 🎯 Future Phases

### Phase 9 — Real-time Collaboration (Planning)

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

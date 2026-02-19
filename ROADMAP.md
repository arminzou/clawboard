# Roadmap — Clawboard 🗺

This document is the living plan for Clawboard. It tracks where we've been and where we're going.

## ✅ Completed Phases (Archived)

| Phase | Focus |
|-------|-------|
| Phase 1 | Project Foundation (Node/Express/SQLite) |
| Phase 2 | Frontend MVP (React + Kanban) |
| Phase 3 | UI Redesign (Tailwind, Asana-ish) |
| Phase 4-7 | UI Polish (bulk actions, shortcuts, saved views, responsive) |
| Phase 8 | Multi-Project Hub (auto-discovery, cross-project) |
| Phase 9 | Backend Clean Architecture (TypeScript, services, repos) |
| Phase 10 | Frontend Clean Architecture (page-centered structure) |

---

## 🚧 Phase 11: OpenClaw Integration (Completed ✅)

*Making Clawboard "Just Work" with OpenClaw.*

### Documentation

See `docs/` for detailed guides:
- [`docs/openclaw-integration.md`](docs/openclaw-integration.md) — WebSocket, webhook system, Tamagotchi component
- [`docs/openclaw-auto-detect.md`](docs/openclaw-auto-detect.md) — Auto-detect workspace, agent discovery
- [`docs/auto-generate-api-key.md`](docs/auto-generate-api-key.md) — Auto-generated API key mechanism

### Features Delivered

| Feature | Status |
|---------|--------|
| Auto-detect OpenClaw workspace | ✅ |
| Auto-generate and store API key | ✅ |
| Activity-reporting skill | ✅ |
| Real-time session stream (WebSocket) | ✅ |
| Agent presence display (Tamagotchi) | ✅ |

---

## 🚧 Phase 12: Real-Time Awareness (Medium Priority)

*See what agents are doing, as they do it.*

### Checklist

#### 3. Real-Time Session Stream
- [ ] OpenClaw emits events as agents work
- [ ] Clawboard listens (WebSocket or polling)
- [ ] Activity appears instantly

#### 4. Context Awareness
- [ ] Show "Tee is working on task #75"
- [ ] Link sessions to tasks automatically
- [ ] Branch/worktree context in activity feed

---

## 🎯 Phase 13: Active Docs (Lower Priority)

*Transform Docs from passive file list to active participant.*

### Checklist

#### 5. Task-Doc Linkage
- [ ] Attach "Reference Docs" to a Task

#### 6. Doc Intelligence
- [ ] Agent-generated summaries (TL;DR)
- [ ] Stale Doc Alerts: flag outdated docs vs recent code changes
- [ ] Milestone Events: promote Vision/Roadmap updates to high-priority activity

---

## 🧪 Validation Track (Deferred)

Testing and debugging — deferred until Phase 11 stabilizes.

- [ ] Expand backend unit tests (Vitest): tasks, projects, activities, docs
- [ ] Run backend smoke test + API health
- [ ] Add Playwright E2E (drag/drop + keyboard flows)
- [ ] Manual UI regression: board load, drag/drop, create/edit task, project switch, activity feed
- [ ] Verify VS Code debugging configs (backend + frontend)
- [ ] Fix any regressions found

---

## Open Questions

- Advanced search operators: `assignee:tee status:done` syntax
- Deploy sync strategy: `git pull` vs `reset --hard`

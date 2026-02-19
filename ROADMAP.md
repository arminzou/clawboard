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

## 🚧 Phase 11: OpenClaw Integration (High Priority)

*Making Clawboard "Just Work" with OpenClaw.*

### Why This Matters

Current friction: Users must manually configure API keys, run scripts, and set up connections. The goal is **zero-config**.

### Checklist

#### 1. Auto-Discovery
- [ ] Clawboard detects OpenClaw workspace from environment/config
- [ ] Clawboard provides setup script (`curl Clawboard/setup | bash`)
- [ ] One command configures OpenClaw to talk to Clawboard

#### 2. Built-in Activity Reporting
- [ ] Add activity-reporting helper to OpenClaw (skill or core)
- [ ] Simple CLI: `clawboard report "working on X"`
- [ ] Agents report activity without manual API calls

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

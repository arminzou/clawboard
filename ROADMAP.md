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

## 🚧 Current Phase: Real-time Collaboration

*Making Clawboard work seamlessly with OpenClaw agents.*

### Goals

- Enable multiple agents (Tee, Fay, Armin) to work on the same board
- Add proper authentication (replace API key with cookies/tokens)
- Make agent activity visible in real-time

### Checklist

#### Authentication
- [ ] **Auth with cookies/tokens** — Replace shared API key with proper auth

#### Agent Integration
- [ ] **Activity reporting CLI** — Simple `clawboard report` command agents can call to log activity
- [ ] **Real-time session ingestion** — Poll session logs more frequently (cron) or stream live
- [ ] **Agent presence** — Show which agents are online and what they're working on
- [ ] **Task context** — Allow agents to auto-create tasks from conversations

#### Collaboration Features
- [ ] Task locking — Avoid editing the same task at once
- [ ] Enhanced sync — Optimistic updates + conflict handling

---

## 🧪 Validation Track (Deferred)

Testing and debugging — deferred until auth is stable.

- [ ] Expand backend unit tests (Vitest): tasks, projects, activities, docs, auth
- [ ] Run backend smoke test + API health
- [ ] Add Playwright E2E (drag/drop + keyboard flows)
- [ ] Manual UI regression: board load, drag/drop, create/edit task, project switch, activity feed
- [ ] Verify VS Code debugging configs (backend + frontend)
- [ ] Fix any regressions found

---

## 🎯 Future Phases

### Phase 12 — Docs: Passive to Active

- Task-Doc Linkage: Attach reference docs directly to Kanban tasks
- Agent Summaries: Automated "TL;DR" for workspace docs
- Stale Doc Alerts: Flag outdated documentation
- Milestone Docs: Promote Roadmap/Vision changes to activity events

---

## Open Questions

- Advanced search operators: `assignee:tee status:done` syntax
- Deploy sync strategy: `git pull` vs `reset --hard`

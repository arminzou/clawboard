# Clawboard

**A local-first command center for OpenClaw users.**

Clawboard gives you a real-time Kanban board that tracks what you—and your OpenClaw agents—are working on across your entire workspace. It Just Works™ with your existing OpenClaw setup.

*For OpenClaw users who want visibility into what your agents are doing.*

---

## ✨ What You Get

- **Seamless OpenClaw Integration** — Just works with your existing OpenClaw setup
- **Local-First** — Your data stays on your machine (SQLite)
- **Kanban Board** — Drag-and-drop tasks, filter by project/branch/status
- **Activity Feed** — See who did what, when, and where
- **Multi-Project Discovery** — Auto-finds git projects in your workspace
- **Real-Time Updates** — Changes appear instantly via WebSocket

---

## 🚀 Quick Start (Docker)

```bash
docker run -d \
  --name clawboard \
  -p 3001:3001 \
  -p 5173:5173 \
  -v ./data:/app/data \
  -e CLAWBOARD_API_KEY=secret \
  zoulogic/clawboard:latest
```

Dashboard: **http://localhost:5173**

---

## 🚀 Local Development

```bash
# Clone and go
cd clawboard

# Install deps
pnpm install
pnpm -C backend init-db

# Start both backend + frontend
pnpm run dev
```

Open **http://localhost:5173** — API runs on port 3001.

---

## 🧩 Why Clawboard?

OpenClaw agents work around your workspace, but their activity can be hard to track. You have no visibility into what they're doing until something breaks or gets committed.

Clawboard watches your OpenClaw agents and projects together, so you get:
- **Visibility** into agent activity (tasks, sessions, commits)
- **Context-aware views** (filter by branch or worktree)
- **One board for everything** — no more jumping between project folders

---

## 🛠 Tech Stack

- **Backend:** Node.js + Express + SQLite + WebSocket
- **Frontend:** React + TypeScript + Tailwind CSS + @dnd-kit

---

## 🤝 Contributing

PRs welcome! See [CONTRIBUTING.md](./CONTRIBUTING.md) for details.

---

## 📦 Roadmap

See [ROADMAP.md](./ROADMAP.md) for what's next.

**Current focus:** Phase 11 — Real-time collaboration with OpenClaw agents

---

## 📜 License

MIT — see [LICENSE](./LICENSE)

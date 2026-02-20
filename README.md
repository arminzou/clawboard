# Clawboard

**A local-first command center for OpenClaw users.**

Clawboard gives you a real-time Kanban board that tracks what you and your OpenClaw agents are working on across your workspace.

*For OpenClaw users who want visibility into what their agents are doing.*

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
# Clone and configure
git clone https://github.com/zoulogic/clawboard.git
cd clawboard

# Copy environment template
cp .env.example .env
# Optional: edit .env (API key, non-standard paths, port)

# Start with Docker Compose
docker compose up -d --build
```

Dashboard: **http://localhost:3001**

`compose.yaml` is local-first and works without Traefik or extra Docker networks.
By default it reads OpenClaw from `$HOME/.openclaw` and projects from `$HOME/.clawboard/projects`.

### Reverse Proxy (Traefik)

Use the optional override file when you already run Traefik:

```bash
# one-time (if missing)
docker network create proxy

# start with Traefik labels + external proxy network
docker compose -f compose.yaml -f compose.traefik.yaml up -d --build
```

Set `CLAWBOARD_HOST` and optional `TRAEFIK_*` variables in `.env` for your environment.

---

## 🚀 Local Development

```bash
# Clone and go
git clone https://github.com/zoulogic/clawboard.git
cd clawboard

# Install all deps and initialize DB
pnpm run init

# Start both backend + frontend
pnpm run dev
```

Open **http://localhost:5173** — API runs on port 3001.

### Mobile / LAN Dev

If desktop works but mobile gets stuck in `reconnecting`, point frontend directly to backend with your LAN IP.

In `frontend/.env.local`:

```env
API_BASE=http://<your-lan-ip>:3001
WS_BASE=ws://<your-lan-ip>:3001/ws
CLAWBOARD_API_KEY=<same as backend>
```

Example:

```env
API_BASE=http://192.168.20.10:3001
WS_BASE=ws://192.168.20.10:3001/ws
CLAWBOARD_API_KEY=mysecretkey
```

Then restart frontend dev server.

### Agent Include Filter

If you want Clawboard to show only specific agents (Arcade + real-time status events), set:

```env
CLAWBOARD_AGENTS_INCLUDE=tee,fay
```

You can also configure this in `~/.clawboard/config.json`:

```json
{
  "agents": {
    "include": ["tee", "fay"]
  }
}
```

Environment variable takes precedence over config file.

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

---

## 📜 License

MIT — see [LICENSE](./LICENSE)

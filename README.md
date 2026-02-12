# Clawboard 📋

Clawboard is your self-hosted engineering dashboard and multi-project task hub. It’s designed to give you (and your AI agents) a single place to track work, activities, and documentation across your entire workspace.

*Note: You are currently looking at the "Clean Architecture" refactor phase (Phase 10).*

---

## 🏗 The Big Picture

Think of Clawboard as the "Command Center" for your homelab or workspace. Instead of having tasks scattered across separate projects, Clawboard:
1.  **Discovers Projects**: Automatically scans your workspace folders for git projects.
2.  **Unifies Tasks**: Provides a single Kanban board that can filter by project, branch, or worktree.
3.  **Tracks History**: Logs what you and your agents are doing in real-time.
4.  **Monitors Docs**: Keeps an eye on your workspace documentation files.

## 🛠 Tech Stack (The "How")

### Current (Transitioning)
- **Backend**: Node.js + Express (The web server)
- **Database**: SQLite (A simple, file-based database—no complex setup required)
- **Real-time**: WebSockets (Allows the UI to update instantly when a task changes)
- **Frontend**: React + TypeScript + Tailwind CSS (The visual dashboard)

### Moving Toward (Phase 10)
- **Full TypeScript**: Adding "guardrails" to the backend for better safety.
- **Clean Architecture**: Separating the "brain" (logic) from the "hands" (database) to make the code easier to maintain and test.

---

## 🚀 Getting Started

If this is your first time setting up Clawboard:

### 1. Initial Setup (One-time)
This installs all the dependencies and sets up your database.
```bash
npm run init
```

### 2. Start Development
This starts both the backend server and the frontend dashboard.
```bash
npm run dev
```
*Access the dashboard at: `http://localhost:5173` (or whatever Vite tells you!)*

---

## 📁 Folder Structure (The "Where")

```
clawboard/
├── backend/           # The Server (The "Engine")
│   ├── routes/       # Handlers for web requests (Tasks, Projects, etc.)
│   ├── db/           # Database setup and migrations
│   └── server.js     # Entry point (being refactored to server.ts)
├── frontend/         # The User Interface (The "Dashboard")
│   ├── src/
│   │   ├── components/ # Reusable UI pieces (Buttons, Cards, Boards)
│   │   ├── hooks/      # Shared logic (WebSocket connection, Project listing)
│   │   └── lib/        # API clients and utilities
├── data/             # Your actual data (clawboard.db)
├── docs/             # Documentation and Learning Guides
└── README.md         # You are here!
```

---

## 🔐 Security (API Keys)

By default, Clawboard is open for local use. If you want to secure it, you can set an API key in your environment:

- **Backend**: `CLAWBOARD_API_KEY="your-secret-key"`
- **Frontend**: `VITE_CLAWBOARD_API_KEY="your-secret-key"`

---

## 🗺 Roadmap

We track our progress and future plans in [ROADMAP.md](./ROADMAP.md). 

Currently, we are focusing on **Phase 10: Backend Clean Architecture**, moving the server logic into a more structured, testable, and robust system.

---

## 💡 Learning More

If you are new to Node.js, TypeScript, or modern web architecture, check out our **Learning Guides** in `docs/learning/`. We're building this project "Explain-as-we-go" style!

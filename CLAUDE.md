# CLAUDE.md

This file provides guidance to Claude Code when working with this codebase.

## What This Is

Clawboard is a personal task/workflow management dashboard for OpenClaw agents. It provides a Kanban board, activity timeline, and document tracking — designed to help Armin monitor and coordinate work with Fay and Tee.

**Purpose:** UI for managing agent tasks, not a general-purpose project management tool.

## Tech Stack

- **Backend:** Node.js + Express + SQLite + WebSocket (port 3001)
- **Frontend:** React 19 + TypeScript + Vite + Tailwind CSS 4
- **Drag-and-drop:** @dnd-kit
- **Icons:** lucide-react

## Project Structure

```
clawboard/
├── backend/
│   ├── server.js         # Express + WebSocket server
│   ├── routes/           # API endpoints (tasks, activities, docs)
│   ├── db/               # SQLite schema + init
│   └── utils/
├── frontend/
│   └── src/
│       ├── App.tsx
│       ├── lib/api.ts    # Typed API client
│       ├── hooks/        # Custom React hooks
│       └── components/
│           ├── v2/       # Current UI (v2 redesign)
│           │   ├── layout/   # AppShellV2, IconRail, Sidebar, Topbar
│           │   ├── ui/       # Button, Chip, Input, Menu, Panel
│           │   ├── KanbanBoardV2.tsx
│           │   ├── KanbanPageV2.tsx
│           │   ├── TaskModals.tsx
│           │   └── TaskTableV2.tsx
│           └── [legacy v1 components]
├── data/                 # SQLite database
├── ROADMAP.md            # Living plan (check for current priorities)
└── README.md             # Setup + API reference
```

## Commands

```bash
npm run dev          # Run backend + frontend concurrently
npm run dev:frontend # Frontend only (if backend already running)
npm run dev:backend  # Backend only
npm run init         # First-time setup (install deps + init DB)
npm run build        # Build frontend for production
```

## Current State

**Branch:** `v2/board-redesign` — UI redesign in progress

**What's done (see ROADMAP.md):**
- Kanban board v2 with drag-and-drop
- App shell (icon rail, sidebar with filters, topbar)
- Design system tokens + local UI kit
- Task CRUD, saved views, keyboard shortcuts

**What's next:**
- Migrate Activity/Docs styling to v2 tokens
- Consider table view improvements

## API Endpoints

- `GET/POST/PATCH/DELETE /api/tasks` — Task CRUD
- `GET/POST /api/activities` — Activity log
- `GET/POST /api/docs` — Document tracking
- `ws://localhost:3001/ws` — Real-time updates

## Conventions

- **v2 components** are in `components/v2/` — this is the active UI
- **Design tokens** are CSS variables in `index.css` (surfaces, borders, shadows)
- **UI primitives** live in `components/v2/ui/` — keep them small and composable
- Use `clsx` for conditional class names
- Prefer Tailwind utilities; extract to design tokens only when reused 3+ times

## Data Model

**Tasks:** id, title, description, status, priority, due_date, tags (JSON), blocked_reason, assigned_to, position, timestamps

**Status values:** `backlog | in_progress | review | done`

**Priority values:** `low | medium | high | urgent`

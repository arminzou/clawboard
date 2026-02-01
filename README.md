# Project Manager Dashboard

A live web application for managing agent tasks, tracking activities, and monitoring workspace documents.

## Architecture

**Backend:** Node.js + Express + SQLite + WebSocket  
**Frontend:** React + TypeScript + Tailwind (coming in Phase 2)

## Project Structure

```
project-manager/
├── backend/           # API server
│   ├── server.js     # Main Express server
│   ├── db/           # Database schema & initialization
│   ├── routes/       # API endpoints (tasks, activities, docs)
│   └── utils/        # Helper functions
├── frontend/         # React dashboard (Phase 2)
├── data/             # SQLite database
└── README.md
```

## Phase 1: Data Layer (Current)

### Setup

```bash
cd project-manager/backend
npm install
npm run init-db   # Initialize database with sample data
npm run dev       # Start server with auto-reload
```

### API Endpoints

**Tasks** (`/api/tasks`)
- `GET /api/tasks` - List all tasks (query: `?status=backlog&assigned_to=tee`)
- `GET /api/tasks/:id` - Get single task
- `POST /api/tasks` - Create task
- `PATCH /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task

**Activities** (`/api/activities`)
- `GET /api/activities` - List activities (query: `?agent=tee&limit=50&since=2024-01-01`)
- `POST /api/activities` - Log activity
- `GET /api/activities/agent/:agent` - Activities for specific agent
- `GET /api/activities/stats` - Activity statistics

**Documents** (`/api/docs`)
- `GET /api/docs` - List tracked documents
- `POST /api/docs/sync` - Update/insert document record
- `GET /api/docs/stats` - Document statistics

**WebSocket** (`ws://localhost:3001/ws`)
- Real-time updates for tasks, activities, and documents

### Database Schema

**Tasks:** `id, title, description, status, priority, assigned_to, timestamps, position`  
**Activities:** `id, agent, activity_type, description, details, session_key, related_task_id, timestamp`  
**Documents:** `id, file_path, file_type, last_modified, last_modified_by, size_bytes, git_status`

## Next Steps (Phase 2)

- [ ] React frontend with Kanban board
- [ ] Activity timeline component
- [ ] Document tracker component
- [ ] WebSocket integration for real-time updates
- [ ] Drag-and-drop task management

## Development

**Test API:**
```bash
# Health check
curl http://localhost:3001/api/health

# Get all tasks
curl http://localhost:3001/api/tasks

# Create a task
curl -X POST http://localhost:3001/api/tasks \
  -H "Content-Type: application/json" \
  -d '{"title":"Test task","status":"backlog","assigned_to":"tee"}'
```

**Log an activity:**
```bash
curl -X POST http://localhost:3001/api/activities \
  -H "Content-Type: application/json" \
  -d '{
    "agent":"tee",
    "activity_type":"file_edit",
    "description":"Updated README.md"
  }'
```

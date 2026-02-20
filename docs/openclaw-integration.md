# OpenClaw + Clawboard Integration

This document describes the real-time integration between OpenClaw and Clawboard.

## Overview

The integration enables Clawboard to display real-time agent presence and activity from OpenClaw via webhooks and WebSockets.

## Architecture

```
OpenClaw                    Clawboard                    Frontend
    │                           │                            │
    │  sessions.reset           │                            │
    │ ──────────────────────>  │                            │
    │  chat:start              │  POST /api/webhook/clawboard│
    │ ──────────────────────>  │ ───────────────────────>   │
    │                          │     broadcast(             │
    │                          │       agent_status_updated)│
    │                          │ ───────────────────────>   │
    │                          │      WebSocket            │
    │                          │                            │
```

## Components

### 1. OpenClaw Webhook System (`src/webhook.ts`)

Sends events to configured webhooks when agent activity occurs:

- `session:start` - When a session is created/reset
- `session:end` - When a session ends
- `agent:thinking` / `agent:idle` / `agent:offline` - Agent lifecycle state changes

Configuration in `openclaw.json`:
```json
{
  "webhook": {
    "urls": ["http://localhost:3001/api/webhook/clawboard"],
    "secret": "optional-shared-secret"
  }
}
```

### 2. Clawboard Webhook Endpoint (`/api/webhook/clawboard`)

Receives events from OpenClaw and broadcasts to WebSocket clients.

**Endpoint:** `POST /api/webhook/clawboard`

**Request Body:**
```json
{
  "event": "agent:thinking" | "agent:idle" | "agent:offline" | "gateway:online" | "gateway:offline",
  "agentId": "<agent-id>" | "*",
  "timestamp": "2026-02-19T09:00:00Z",
  "thought": "Working on auth implementation"
}
```

**Response:**
```json
{
  "success": true
}
```

**Features:**
- No API key required (auth bypassed for webhook endpoints)
- Broadcasts `agent_status_updated` events to all connected WebSocket clients
- Supports prefix matching for webhook paths (e.g., `/webhook/clawboard`)

### 3. Auth Bypass Configuration

Webhook endpoints are exempt from API key authentication:

```typescript
// backend/src/presentation/http/middleware/commonMiddleware.ts
app.use('/api', requireApiKey({ allowPaths: ['/health', '/webhook'] }));
```

This allows OpenClaw to send events without managing API keys.

### 4. Agent Tamagotchi Component

React component in sidebar showing agent status with a fun, Tamagotchi-like UI.

**Location:** `frontend/src/components/layout/AgentTamagotchi.tsx`

**Features:**
- Deterministic avatar/personality fallback for any `agentId`
- Optional profile overrides from config/plugin metadata
- Optional include filter to only surface selected agents (`CLAWBOARD_AGENTS_INCLUDE` or `~/.clawboard/config.json`)
- Status indicator with color coding:
  - `thinking` - 🤔 Yellow (processing)
  - `idle` - 😴 Gray (waiting)
  - `offline` - 💤 Dark gray (disconnected)
- Thought bubble with real thought + persona fallback quote
- Last activity timestamp

**Profile Source Priority:**
1. `~/.clawboard/agent-profiles.json` (or `CLAWBOARD_AGENT_PROFILES_PATH`)
2. `<openclaw-home>/agent-profiles.json` (or `OPENCLAW_AGENT_PROFILES_PATH`)
3. Deterministic defaults generated from `agentId`

### 5. Webhook Router (`backend/src/presentation/http/routes/webhookRouter.ts`)

Handles incoming webhook events from OpenClaw.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhook/clawboard` | Receive OpenClaw events |
| GET | `/api/webhook/config` | Get webhook configuration |

**Event Types Processed:**
- `agent:thinking` → Status: `thinking`
- `agent:idle` → Status: `idle`
- `agent:offline` → Status: `offline`
- `gateway:online` → Status: `idle` (broadcast to `*`)
- `gateway:offline` → Status: `offline` (broadcast to `*`)

## Events Flow

1. **Agent Run Start**: plugin emits `agent:thinking`
2. **Agent Run End**: plugin emits `agent:idle` (after idle timeout)
3. **Gateway Changes**: plugin emits `gateway:online` / `gateway:offline` with `agentId: "*"`
4. **Broadcast**: webhook router maps event → `agent_status_updated` → WebSocket → frontend

## Frontend WebSocket Events

```typescript
{
  type: 'agent_status_updated',
  data: {
    agentId: '<agent-id>' | '*',
    status: 'thinking' | 'idle' | 'offline',
    lastActivity: '2026-02-19T09:00:00Z',
    thought: 'Working on Phase 11!'
  }
}
```

## Webhook Configuration Discovery

OpenClaw can query the webhook configuration:

```bash
GET /api/webhook/config

Response:
{
  "enabled": true,
  "url": "http://localhost:3001/api/webhook/clawboard",
  "events": ["agent:thinking", "agent:idle", "agent:offline", "gateway:online", "gateway:offline"]
}
```

## Sidebar Integration

The AgentTamagotchi component is displayed in the sidebar:

```tsx
// frontend/src/components/layout/Sidebar.tsx
<div className="border-t border-slate-200 p-3">
  <div className="text-xs font-medium text-slate-500 mb-2">Agent Arcade</div>
  <AgentArcadePanel />
</div>
```

## Future Enhancements

- Show current task being worked on
- Display session context (branch/worktree)
- Add "blocked" status when agent reports blocked
- Show agent's recent commits/activity
- Task completion events (`task:completed`)
- Agent-specific thought customization

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
- `agent:turn` - When an agent starts thinking or becomes active

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
  "type": "session:start" | "session:end" | "agent:turn",
  "agent": "tee" | "fay" | "armin",
  "timestamp": "2026-02-19T09:00:00Z",
  "data": {
    "thought": "Working on auth implementation"
  }
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
- Avatar with agent-specific emoji (🐱 for tee/fay, 👤 for armin)
- Status indicator with color coding:
  - `active` - 😊 Green (working)
  - `thinking` - 🤔 Yellow (processing)
  - `idle` - 😴 Gray (waiting)
  - `blocked` - 😰 Red (needs help)
  - `offline` - 💤 Dark gray (disconnected)
- Thought bubble with motivational quotes
- Energy bar (decorative, shows activity level)
- Last activity timestamp

**Agent Emojis:**
```typescript
const AGENT_EMOJIS = {
  tee: '🐱',
  fay: '🐱',
  armin: '👤',
};
```

**Motivational Thoughts:**
- "Just finished a feature! 🎉"
- "Debugging is like being a detective..."
- "Writing tests is a love letter to your future self"
- "Clean code is happy code"
- "Ship it! 🚀"
- "One bug at a time"
- "Coffee + Code = ❤️"
- "Making things work, one commit at a time"

### 5. Webhook Router (`backend/src/presentation/http/routes/webhookRouter.ts`)

Handles incoming webhook events from OpenClaw.

**Endpoints:**

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhook/clawboard` | Receive OpenClaw events |
| GET | `/api/webhook/config` | Get webhook configuration |

**Event Types Processed:**
- `session:start` → Status: `active`, thought: "I am awake!"
- `session:end` → Status: `idle`
- `agent:turn` → Status: `thinking`

## Events Flow

1. **Session Start**: `sessions.reset` → `sendSessionStartEvent()` → POST to webhook
2. **Agent Thinking**: `chat.ts` `onAgentRunStart` → `sendAgentTurnEvent("thinking")`
3. **Agent Active**: `chat.ts` `.then()` → `sendAgentTurnEvent("active")`
4. **Broadcast**: Webhook router → `broadcast()` → WebSocket → Frontend

## Frontend WebSocket Events

```typescript
{
  type: 'agent_status_updated',
  data: {
    agentId: 'tee',
    status: 'active' | 'thinking' | 'idle' | 'blocked' | 'offline',
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
  "events": ["session:start", "session:end", "agent:turn", "task:completed"]
}
```

## Sidebar Integration

The AgentTamagotchi component is displayed in the sidebar:

```tsx
// frontend/src/components/layout/Sidebar.tsx
<div className="border-t border-slate-200 p-3">
  <div className="text-xs font-medium text-slate-500 mb-2">Agents</div>
  <div className="flex gap-2 justify-center">
    <AgentTamagotchi agentId="tee" />
    <AgentTamagotchi agentId="fay" />
  </div>
</div>
```

## Future Enhancements

- Show current task being worked on
- Display session context (branch/worktree)
- Add "blocked" status when agent reports blocked
- Show agent's recent commits/activity
- Task completion events (`task:completed`)
- Agent-specific thought customization

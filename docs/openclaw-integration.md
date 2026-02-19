# OpenClaw + Clawboard Integration

This document describes the real-time integration between OpenClaw and Clawboard.

## Overview

The integration enables Clawboard to display real-time agent presence and activity from OpenClaw.

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

- No API key required (uses shared secret for verification)
- Broadcasts `agent_status_updated` events to all connected clients

### 3. Agent Tamagotchi Component

React component in sidebar showing agent status:
- Avatar (🐱 for tee/fay)
- Status indicator (Active/Thinking/Idle/Blocked/Offline)
- Thought bubble with motivational quotes
- Energy bar
- Last activity timestamp

## Events Flow

1. **Session Start**: `sessions.reset` → `sendSessionStartEvent()` → POST to webhook
2. **Agent Thinking**: `chat.ts` `onAgentRunStart` → `sendAgentTurnEvent("thinking")`
3. **Agent Active**: `chat.ts` `.then()` → `sendAgentTurnEvent("active")`

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

## Future Enhancements

- Show current task being worked on
- Display session context (branch/worktree)
- Add "blocked" status when agent reports blocked
- Show agent's recent commits/activity

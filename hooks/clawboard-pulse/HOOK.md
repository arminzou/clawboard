---
name: clawboard-pulse
description: "Sends heartbeat events to Clawboard for real-time agent presence tracking"
homepage: https://github.com/zoulogic/clawboard
metadata:
  openclaw:
    emoji: "💓"
    events:
      - "command:new"
      - "command:reset"
      - "command:stop"
      - "gateway:startup"
      - "message:received"
      - "message:sent"
---

# Clawboard Pulse

Reports agent events to Clawboard for real-time presence tracking and activity display.

## What It Does

- Sends webhook notifications to Clawboard when agent events occur
- Enables the agent presence display in Clawboard
- Tracks agent status (active, thinking, idle, offline)

## Requirements

- Clawboard must be running and accessible
- `CLAWBOARD_WEBHOOK_URL` environment variable must be set

## Configuration

Set the webhook URL via environment variable:

```bash
# In your shell profile
export CLAWBOARD_WEBHOOK_URL=http://localhost:3001/api/webhook/clawboard
```

Or configure in OpenClaw config:

```json
{
  "hooks": {
    "internal": {
      "entries": {
        "clawboard-pulse": {
          "enabled": true,
          "env": {
            "CLAWBOARD_WEBHOOK_URL": "http://localhost:3001/api/webhook/clawboard"
          }
        }
      }
    }
  }
}
```

## Events Reported

| Event | Description |
|-------|-------------|
| `command:new` | Agent started a new session |
| `command:reset` | Agent reset (new session) |
| `command:stop` | Agent stopped |
| `gateway:startup` | Gateway started |

## Webhook Payload

```json
{
  "event": "command:new",
  "agentId": "tee",
  "sessionKey": "agent:tee:main",
  "timestamp": "2026-02-19T12:00:00Z"
}
```

# OpenClaw Integration

Pawvy integrates with [OpenClaw](https://github.com/openclaw/openclaw) via the Pawvy plugin. The plugin tracks agent lifecycle events and reports real-time status to Pawvy — no manual webhook configuration required.

---

## How It Works

The Pawvy plugin hooks into OpenClaw's agent lifecycle and reports status to Pawvy automatically:

| Hook | What happens |
|------|-------------|
| `before_agent_start` | Agent → `thinking` (Planning response...) |
| `before_tool_call` | Agent → `thinking` (Reading files... / Editing code... / etc.) |
| `agent_end` | Agent → `idle` after `idleTimeoutMs` |
| `session_start` | Agent → `idle` if not mid-run |
| `gateway_start` | All agents → `idle` |
| `gateway_stop` | All agents → `offline` |

---

## Setup

### 1. Configure the Plugin

Add to `openclaw.json`:

```json
{
  "plugins": {
    "load": {
      "paths": ["/path/to/pawvy/extensions"]
    },
    "entries": {
      "pawvy": {
        "enabled": true,
        "config": {
          "webhookUrl": "http://localhost:3001/api/webhook/pawvy",
          "idleTimeoutMs": 5000
        }
      }
    }
  }
}
```

| Option | Description | Default |
|--------|-------------|---------|
| `webhookUrl` | Pawvy server URL | required |
| `idleTimeoutMs` | Delay before flipping agent to `idle` after a run ends | `30000` |

Restart the gateway:

```bash
openclaw gateway restart
```

Verify the plugin loaded:

```bash
openclaw plugins list
# pawvy   active   v0.1.0
```

### 2. Install the Pawvy Skill

The skill lets agents create tasks, update status, and list their queue directly from a session.

Copy or symlink `extensions/pawvy/` into your agent's skills directory, then reference it in the agent's workspace (`AGENTS.md` or `TOOLS.md`).

---

## Filtering Agent Display

Show only specific agents in the sidebar:

```bash
# .env
PAWVY_AGENTS_INCLUDE=fay,tee
```

Or in `~/.pawvy/config.json`:

```json
{
  "agentsInclude": ["fay", "tee"]
}
```

---

## Agent Profiles (Optional)

Customize agent display — name, avatar, personality.

**`~/.pawvy/agent-profiles.json`:**

```json
{
  "fay": {
    "displayName": "Fay",
    "avatar": "🐱",
    "personality": "playful"
  },
  "tee": {
    "displayName": "Tee",
    "avatar": "🐶",
    "personality": "methodical"
  }
}
```

If no profile is set, Pawvy generates a deterministic avatar and personality from the agent ID.

---

## Troubleshooting

**Agents not appearing in sidebar**
- Check `openclaw plugins list` — `pawvy` should be `active`
- Verify `webhookUrl` is reachable from the gateway host: `curl http://localhost:3001/api/health`
- Check OpenClaw gateway logs for plugin errors

**Plugin shows `error` in plugins list**
- Verify `plugins.load.paths` points to the correct `extensions/` directory
- Check the config matches the schema in `extensions/pawvy/openclaw.plugin.json`

**Agent stuck on `thinking`**
- Increase `idleTimeoutMs` — multi-turn agents may pause between turns
- Check that `agent_end` events are firing in gateway logs

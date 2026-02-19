# Auto-Detect OpenClaw Workspace

Clawboard automatically detects if OpenClaw is installed and identifies available agents.

## How It Works

### 1. Detection Locations

Clawboard scans these locations in order:

1. `OPENCLAW_HOME` environment variable (explicit override)
2. `~/.openclaw` (default)
3. `~/.config/openclaw` (alternative)

```typescript
// config.ts
const OPENCLAW_DIRS = [
  process.env.OPENCLAW_HOME,
  path.join(os.homedir(), '.openclaw'),
  path.join(os.homedir(), '.config', 'openclaw'),
];
```

### 2. Agent Discovery

Once OpenClaw is detected, Clawboard finds agents by scanning for `workspace-*` directories:

```
~/.openclaw/
├── workspace-fay/    → agent: "fay"
├── workspace-main/  → agent: "main"
└── workspace-tee/   → agent: "tee"
```

### 3. Configuration

**Environment Variables:**

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLAW_HOME` | `~/.openclaw` | OpenClaw installation path |
| `CLAWBOARD_PROJECTS_DIR` | `~/.clawboard/projects` | Projects directory |
| `CLAWBOARD_API_KEY` | auto-generated | API authentication |

### 4. API Endpoint

Clawboard exposes detected information via:

```
GET /api/openclaw/status
```

Response:
```json
{
  "detected": true,
  "home": "/home/armin/.openclaw",
  "agents": ["fay", "main", "tee"],
  "projectsDir": "/home/armin/projects"
}
```

## Default Projects Directory

Unlike OpenClaw workspaces (which are agent-specific), Clawboard uses a shared projects directory:

- **Default:** `~/.clawboard/projects`
- **Purpose:** All agents share access to the same projects
- **Override:** Set `CLAWBOARD_PROJECTS_DIR` environment variable

This separation ensures:
- Projects are not tied to specific agents
- Multiple agents can work on the same projects
- Clean separation between agent workspace and project workspace

## Files Involved

| File | Purpose |
|------|---------|
| `backend/src/config.ts` | Detection logic, paths resolution |
| `backend/src/presentation/http/routes/openclawRouter.ts` | `/api/openclaw/status` endpoint |
| `backend/src/presentation/http/routes/webhookRouter.ts` | Webhook receiver for events |

## Startup Logs

When Clawboard starts, it logs detection results:

```
🚀 Clawboard Backend running on http://0.0.0.0:3001
📊 WebSocket endpoint: ws://0.0.0.0:3001/ws
💾 Database: /app/data/clawboard.db
🔑 API Key: mysecretkey
📁 Projects: /app/workspace-projects
🤖 OpenClaw: detected at /home/armin/.openclaw
```

If OpenClaw is not found:
```
🤖 OpenClaw: not detected (install at ~/.openclaw)
```

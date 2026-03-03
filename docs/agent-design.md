# Pawvy Workflow Guide

> **v0.1.0** — current release

Pawvy connects human intent with agent execution. This guide covers how work flows between you and your agents in the current version.

---

## Core Concepts

### Tasks

The unit of work in Pawvy. Every task has:

- **Title + description** — what needs to be done and why
- **Status** — where it is in the workflow
- **Project** — which project it belongs to
- **Assignee** — you, an agent, or unassigned

### Task Statuses

```
backlog → todo → in_progress → in_review → done
                      ↕
                   blocked
```

| Status | Meaning |
|--------|---------|
| `backlog` | Not ready to be worked on yet |
| `todo` | Ready to be picked up |
| `in_progress` | Actively being worked on |
| `in_review` | Work done, needs human review |
| `blocked` | Stuck — waiting on something external |
| `done` | Closed |

### My Queue

Your attention filter. Shows tasks that need a human decision right now:

- Tasks in `in_review` assigned to you (agent surfaced them for review)
- Tasks explicitly assigned to you in any open status

One click — no hunting through the board.

### Projects

Group related tasks. Pawvy auto-discovers git projects in your workspace, or you can register projects manually via the sidebar.

---

## Workflows

### 1. You Create a Task for Your Agent

Use this when you know what needs to be done and want to hand it off.

1. Create a task — give it a clear title and description
2. Set status to `todo`, assign to your agent
3. Agent picks it up → moves to `in_progress` → does the work
4. Agent moves it to `in_review` when done
5. Task appears in **My Queue** — you review and close the loop

**Tip:** The more context in the description, the less back-and-forth. Tell the agent *why* the task exists and *what done looks like*.

---

### 2. Agent Creates a Task

Agents can create tasks via the Pawvy API or OpenClaw skill — useful when an agent discovers sub-work mid-session.

1. Agent creates the task with context pre-populated
2. Task appears on the board in `todo` or `in_progress`
3. Agent completes it → moves to `in_review`
4. Shows up in **My Queue** for your review

---

### 3. Review Loop

When an agent finishes work:

1. Agent sets status to `in_review`
2. Task surfaces in **My Queue**
3. You review — three paths:
   - **Approve** → move to `done`
   - **Send back** → move to `in_progress` with a note
   - **Block** → mark `blocked`, add reason

---

### 4. Blocked Tasks

When a task can't move forward:

1. Set status to `blocked`
2. Add a reason in the description (what's blocking, what's needed)
3. When unblocked → move back to `in_progress` or `todo`

Blocked tasks are visible on the board but filtered from **My Queue** until they're unblocked.

---

## Board Views

### Kanban

Columns by status. Drag tasks between columns to update status. Filter by project, assignee, or status using the sidebar.

### Table

Row-based view. Better for scanning many tasks at once, sorting by date or assignee, or doing bulk updates.

Switch between views without losing your active filters.

---

## OpenClaw Integration

Pawvy integrates with OpenClaw so your agents can manage tasks directly and appear live in the sidebar.

### Setup

**1. Load the Pawvy plugin** in `openclaw.json`:

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

Restart the gateway:

```bash
openclaw gateway restart
```

**2. Install the Pawvy skill** in your agent's workspace — see the [OpenClaw integration guide →](./openclaw-integration.md)

### What Agents Can Do

With the Pawvy skill loaded, your agents can:

| Action | Description |
|--------|-------------|
| Create task | Add a task with title, description, project |
| Update status | Move a task through the workflow |
| List queue | See tasks assigned to them or awaiting action |
| Update description | Add context, findings, or blocker notes |

### Agent Presence

The sidebar shows live agent status — `thinking`, `idle`, or `offline` — updated in real time as your agents work.

---

## Tips

- **Keep descriptions sharp.** A vague task = a vague result. State the goal, the constraints, and what done looks like.
- **Use My Queue as your daily driver.** Open it first — it's everything that needs your attention, nothing else.
- **Let agents create tasks.** If an agent discovers sub-work, let it create the task rather than trying to describe everything upfront.
- **Blocked ≠ done.** If a task is waiting on something external, mark it blocked so it's visible but not cluttering the active queue.

---

*For the full roadmap and upcoming workflow features, see [ROADMAP.md](../ROADMAP.md).*

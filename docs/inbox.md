# Inbox

The Inbox is Pawvy's home for personal reminders and non-agent tasks — shopping lists, quick to-dos, anything that doesn't need an AI agent to execute it.

---

## Inbox vs Kanban

| | Inbox | Kanban |
|---|-------|--------|
| Purpose | Human-only reminders | Agent-executable work |
| Requires a project | No | Recommended |
| Agent can pick it up | No | Yes |
| Needs a context anchor | No | Yes |

**Rule of thumb:** if an agent could reasonably do it, it's a Kanban task. If it's just for you — put it in Inbox.

---

## Creating an Inbox Task

In the task creation form, check **Personal reminder**. This marks the task as `non_agent` and routes it to the Inbox instead of the Kanban board.

Inbox tasks can have:
- Title and description
- Due date
- Tags

They cannot be assigned to an agent.

---

## Using the Inbox

The Inbox page (`/inbox`) shows all your non-agent tasks as a flat checklist.

- **Check off** a task to mark it done
- **Click** a task to edit details
- **Quick-add** at the top — type and hit enter to create a task instantly

Inbox tasks don't appear on the Kanban board and don't show up in My Queue.

---

## Converting an Inbox Task

If you decide a task needs agent work after all:

1. Open the task
2. Uncheck **Personal reminder**
3. Assign a project and optionally an agent
4. Task moves to the Kanban board

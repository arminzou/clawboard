# Context Anchors

A context anchor is the filesystem path where an agent does its work. Every agent-executable task must resolve to at least one anchor — without it, the agent has no grounded environment to reason from.

---

## Why Anchors Matter

When an agent picks up a task, it needs to know *where* to operate: which directory to explore, which git history to read, which files to edit. The anchor provides that. A task without an anchor is a checklist item — not something an agent can act on.

---

## How Anchors Are Resolved

Pawvy resolves a task's anchor through a priority chain at the time an agent picks it up:

| Priority | Source | When it applies |
|----------|--------|----------------|
| 1 | **Task anchor** | Explicit path set on the task itself |
| 2 | **Project root** | The registered directory of the task's project |
| 3 | **Category default** | Config maps the task's category to a path |
| 4 | **Scratch workspace** | Fallback if `allow_scratch_fallback: true` |
| — | **Blocked** | If no anchor resolved and scratch fallback is off |

The resolved anchor and its source (`task`, `project`, `category`, `scratch`) are shown on the task card so you know what context the agent will get.

---

## Setting a Task Anchor

In the task form, expand **Advanced** and enter a path in the **Anchor** field.

This overrides everything else — the agent will always start from that path, regardless of which project the task belongs to.

Use this for tasks that live in a specific directory outside your standard projects (e.g., `~/.openclaw/workspace-fay`).

---

## Category Defaults

Map task categories to filesystem paths in `~/.pawvy/config.json`:

```json
{
  "category_defaults": {
    "openclaw": "~/.openclaw/workspace-fay",
    "personal": "~/obsidian"
  }
}
```

Any task with a matching category will automatically resolve to that path if no task-level anchor or project root is found first.

---

## Scratch Workspace

When no specific anchor resolves, Pawvy can fall back to a shared scratch directory — a general-purpose space where agents can write notes and context files.

Configure in `~/.pawvy/config.json`:

```json
{
  "scratch_root": "~/.local/share/pawvy/_misc",
  "allow_scratch_fallback": true
}
```

Set `allow_scratch_fallback: false` to block agent dispatch entirely when no anchor resolves. Use this if you want strict control over where agents operate.

---

## Manual Project Registration

Projects outside your workspace directory can be registered manually via the sidebar or API so their path is available for anchor resolution:

```bash
POST /api/projects
{
  "name": "Homelab",
  "path": "/home/armin/homelab",
  "description": "Infrastructure configs"
}
```

Once registered, tasks assigned to this project will resolve to its path.

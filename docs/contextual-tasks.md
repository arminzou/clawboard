# Clawboard: Contextual Task Management (Worktrees & Branches)

## Overview
As projects grow, Armin uses **Git Worktrees** and **Branches** to isolate work. Clawboard should not treat these as separate "Projects," but as **Contexts** within a single Project.

## Architecture

### 1. Project vs. Context
- **Project**: The root repository (e.g., `projects/clawboard`). This is the source of truth for the Kanban board and roadmap.
- **Context**: A specific work environment within that project.
  - **Type: Worktree**: A separate folder (e.g., `projects/clawboard-ui-polish`).
  - **Type: Branch**: A git branch (e.g., `feature/api-v2`).

### 2. Database Schema
The `tasks` table includes:
- `project_id`: Links the task to the main project.
- `context_key`: The identifier for the context (e.g., the worktree path or branch name).
- `context_type`: Either `'worktree'` or `'branch'`.

### 3. Resolution Logic

#### Discovery
The project discovery logic (`POST /api/projects/discover`) ignores folders containing a `.git` **file** (identifying them as worktrees) to prevent them from appearing as standalone projects in the sidebar.

#### Task Context Association
When a task is created or updated, the system infers context:
1.  **Worktree Detection**: If the current directory is a worktree of a known project, set `context_type = 'worktree'` and `context_key = <path>`.
2.  **Branch Detection**: Fetch the current git branch. Set `context_type = 'branch'` and `context_key = <branch_name>`.

### 4. UI Implementation
- **Context Filter**: In the project view, a dropdown/toggle allows switching between:
  - **Global**: All tasks for the project.
  - **Current Context**: Only tasks associated with the active worktree/branch.
- **Badges**: Tasks on the board display their context (e.g., `[ui]`) if they are not in the current active context.

## Roadmap
- [x] Schema Migration (v6)
- [x] Refine Project Discovery (Ignore worktree folders)
- [ ] Backend: Update Task API to accept and return context fields
- [ ] Backend: Implement Context Discovery helper (Git integration)
- [ ] Frontend: Add Context filter to Project View
- [ ] Frontend: Display context badges on Task Cards

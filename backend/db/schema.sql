-- Clawboard Database Schema

-- Projects table (workspace discovery + grouping)
CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    slug TEXT UNIQUE NOT NULL,
    path TEXT NOT NULL,
    description TEXT,
    icon TEXT,
    color TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects(slug);

-- Tasks table (for Kanban board)
CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL CHECK(status IN ('backlog', 'in_progress', 'review', 'done')),
    priority TEXT CHECK(priority IN ('low', 'medium', 'high', 'urgent')),
    due_date TEXT, -- ISO date (YYYY-MM-DD) or ISO datetime; nullable
    tags TEXT, -- JSON array of strings; nullable
    blocked_reason TEXT, -- nullable freeform text (why this task is blocked)
    assigned_to TEXT, -- 'tee', 'fay', 'armin', or null
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    position INTEGER DEFAULT 0, -- for ordering within columns
    archived_at DATETIME,
    project_id INTEGER,
    context_key TEXT, -- e.g., 'projects/clawboard-ui-polish' or 'feature/branch-name'
    context_type TEXT, -- 'worktree' or 'branch'
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);

-- Tags table (global tag registry)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Agent activities table (timeline tracking)
CREATE TABLE IF NOT EXISTS activities (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    agent TEXT NOT NULL CHECK(agent IN ('tee', 'fay')),
    activity_type TEXT NOT NULL, -- 'file_edit', 'tool_call', 'task_complete', 'message', etc.
    description TEXT NOT NULL,
    details TEXT, -- JSON blob for extra data
    session_key TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    related_task_id INTEGER,
    source_id TEXT, -- unique id for ingested events (e.g., session file + line)
    FOREIGN KEY (related_task_id) REFERENCES tasks(id)
);

-- Document tracking table
CREATE TABLE IF NOT EXISTS documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    file_path TEXT UNIQUE NOT NULL,
    file_type TEXT, -- extension or category
    last_modified DATETIME,
    last_modified_by TEXT, -- 'tee', 'fay', 'armin', 'system'
    size_bytes INTEGER,
    git_status TEXT, -- 'modified', 'added', 'deleted', 'untracked', 'clean'
    first_seen DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agent);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activities_task ON activities(related_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_source_id ON activities(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);

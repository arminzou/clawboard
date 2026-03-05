-- Pawvy Database Schema

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
    assigned_to_type TEXT CHECK(assigned_to_type IN ('agent', 'human') OR assigned_to_type IS NULL),
    assigned_to_id TEXT,
    non_agent INTEGER NOT NULL DEFAULT 0 CHECK(non_agent IN (0, 1)),
    anchor TEXT, -- explicit task-level context anchor path
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    completed_at DATETIME,
    archived_at DATETIME,
    project_id INTEGER,
    context_key TEXT, -- e.g., 'projects/pawvy-ui-polish' or 'feature/branch-name'
    context_type TEXT, -- 'worktree' or 'branch'
    is_someday INTEGER DEFAULT 0, -- saved for later / someday/maybe flag
    CHECK (NOT (non_agent = 1 AND assigned_to_type = 'agent')),
    FOREIGN KEY (project_id) REFERENCES projects(id)
);

CREATE INDEX IF NOT EXISTS idx_tasks_archived_at ON tasks(archived_at);

-- Tags table (global tag registry)
CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE
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
    doc_type_tag TEXT, -- optional semantic type: spec, runbook, reference, decision
    last_modified DATETIME,
    last_modified_by TEXT, -- 'tee', 'fay', 'armin', 'system'
    last_accessed_at DATETIME, -- when an agent/human last opened/read this doc via Pawvy
    size_bytes INTEGER,
    git_status TEXT -- 'modified', 'added', 'deleted', 'untracked', 'clean'
);

-- Document <-> Task links
CREATE TABLE IF NOT EXISTS document_task_links (
    document_id INTEGER NOT NULL,
    task_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (document_id, task_id),
    FOREIGN KEY (document_id) REFERENCES documents(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Task dependency relationships (task_id depends on depends_on_task_id)
CREATE TABLE IF NOT EXISTS task_dependencies (
    task_id INTEGER NOT NULL,
    depends_on_task_id INTEGER NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (task_id, depends_on_task_id),
    CHECK (task_id != depends_on_task_id),
    FOREIGN KEY (task_id) REFERENCES tasks(id),
    FOREIGN KEY (depends_on_task_id) REFERENCES tasks(id)
);

-- v1.0 Thread-First collaboration tables
CREATE TABLE IF NOT EXISTS question_threads (
    id TEXT PRIMARY KEY,
    workspace_id TEXT NOT NULL,
    title TEXT NOT NULL,
    problem_statement TEXT NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('open', 'clarifying', 'ready_to_plan', 'pending_approval', 'promoted', 'archived')),
    priority TEXT NOT NULL DEFAULT 'medium' CHECK(priority IN ('low', 'medium', 'high')),
    owner_human_id TEXT NOT NULL,
    created_by_type TEXT NOT NULL CHECK(created_by_type IN ('human', 'agent')),
    created_by_id TEXT NOT NULL,
    current_state_summary TEXT,
    consensus_state TEXT NOT NULL DEFAULT 'aligned' CHECK(consensus_state IN ('aligned', 'mixed', 'blocked')),
    open_disagreements_count INTEGER NOT NULL DEFAULT 0 CHECK(open_disagreements_count >= 0),
    decision_deadline DATETIME,
    last_human_ping_at DATETIME,
    cloned_from_thread_id TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (cloned_from_thread_id) REFERENCES question_threads(id)
);

CREATE TABLE IF NOT EXISTS thread_events (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    event_type TEXT NOT NULL CHECK(event_type IN (
        'question_opened',
        'clarification_requested',
        'clarification_provided',
        'work_log',
        'proposal_posted',
        'objection_posted',
        'decision_requested',
        'decision_recorded',
        'promoted_to_task',
        'thread_cloned',
        'archived'
    )),
    actor_type TEXT NOT NULL CHECK(actor_type IN ('human', 'agent', 'system')),
    actor_id TEXT NOT NULL,
    body_md TEXT,
    stance TEXT CHECK(stance IN ('agree', 'object', 'needs_info') OR stance IS NULL),
    mention_human INTEGER NOT NULL DEFAULT 0 CHECK(mention_human IN (0, 1)),
    mention_payload TEXT,
    metadata TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES question_threads(id)
);

CREATE TABLE IF NOT EXISTS promotion_packets (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL UNIQUE,
    problem TEXT,
    desired_outcome TEXT,
    scope_in TEXT,
    scope_out TEXT,
    constraints TEXT,
    decision_owner_id TEXT,
    acceptance_criteria TEXT,
    first_executable_slice TEXT,
    dependencies TEXT,
    risks TEXT,
    context_links TEXT,
    is_complete INTEGER NOT NULL DEFAULT 0 CHECK(is_complete IN (0, 1)),
    validated_at DATETIME,
    updated_by_type TEXT NOT NULL CHECK(updated_by_type IN ('human', 'agent', 'system')),
    updated_by_id TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (thread_id) REFERENCES question_threads(id)
);

CREATE TABLE IF NOT EXISTS thread_task_links (
    id TEXT PRIMARY KEY,
    thread_id TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    link_type TEXT NOT NULL CHECK(link_type IN ('spawned_from_thread', 'context_link')),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (thread_id, task_id),
    FOREIGN KEY (thread_id) REFERENCES question_threads(id),
    FOREIGN KEY (task_id) REFERENCES tasks(id)
);

-- Prevent dependency cycles (A -> ... -> B and B -> A).
CREATE TRIGGER IF NOT EXISTS trg_task_dependencies_prevent_cycle_insert
BEFORE INSERT ON task_dependencies
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Dependency cycle detected')
  WHERE NEW.task_id = NEW.depends_on_task_id
    OR EXISTS (
      WITH RECURSIVE dependency_path(depends_on_task_id) AS (
        SELECT depends_on_task_id
        FROM task_dependencies
        WHERE task_id = NEW.depends_on_task_id
        UNION
        SELECT td.depends_on_task_id
        FROM task_dependencies td
        JOIN dependency_path dp ON td.task_id = dp.depends_on_task_id
      )
      SELECT 1
      FROM dependency_path
      WHERE depends_on_task_id = NEW.task_id
      LIMIT 1
    );
END;

CREATE TRIGGER IF NOT EXISTS trg_task_dependencies_prevent_cycle_update
BEFORE UPDATE OF task_id, depends_on_task_id ON task_dependencies
FOR EACH ROW
BEGIN
  SELECT RAISE(ABORT, 'Dependency cycle detected')
  WHERE NEW.task_id = NEW.depends_on_task_id
    OR EXISTS (
      WITH RECURSIVE dependency_path(depends_on_task_id) AS (
        SELECT depends_on_task_id
        FROM task_dependencies
        WHERE task_id = NEW.depends_on_task_id
          AND NOT (task_id = OLD.task_id AND depends_on_task_id = OLD.depends_on_task_id)
        UNION
        SELECT td.depends_on_task_id
        FROM task_dependencies td
        JOIN dependency_path dp ON td.task_id = dp.depends_on_task_id
      )
      SELECT 1
      FROM dependency_path
      WHERE depends_on_task_id = NEW.task_id
      LIMIT 1
    );
END;

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to_id);
CREATE INDEX IF NOT EXISTS idx_tasks_non_agent ON tasks(non_agent);
CREATE INDEX IF NOT EXISTS idx_activities_agent ON activities(agent);
CREATE INDEX IF NOT EXISTS idx_activities_timestamp ON activities(timestamp);
CREATE INDEX IF NOT EXISTS idx_activities_task ON activities(related_task_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_activities_source_id ON activities(source_id);
CREATE INDEX IF NOT EXISTS idx_documents_path ON documents(file_path);
CREATE INDEX IF NOT EXISTS idx_documents_doc_type_tag ON documents(doc_type_tag);
CREATE INDEX IF NOT EXISTS idx_documents_last_accessed_at ON documents(last_accessed_at);
CREATE INDEX IF NOT EXISTS idx_document_task_links_document ON document_task_links(document_id);
CREATE INDEX IF NOT EXISTS idx_document_task_links_task ON document_task_links(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_task ON task_dependencies(task_id);
CREATE INDEX IF NOT EXISTS idx_task_dependencies_depends_on ON task_dependencies(depends_on_task_id);
CREATE INDEX IF NOT EXISTS idx_question_threads_workspace_status_owner ON question_threads(workspace_id, status, owner_human_id);
CREATE INDEX IF NOT EXISTS idx_question_threads_workspace_updated_at ON question_threads(workspace_id, updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_thread_events_thread_id ON thread_events(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_events_event_type ON thread_events(event_type);
CREATE INDEX IF NOT EXISTS idx_promotion_packets_thread_id ON promotion_packets(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_task_links_thread_id ON thread_task_links(thread_id);
CREATE INDEX IF NOT EXISTS idx_thread_task_links_task_id ON thread_task_links(task_id);

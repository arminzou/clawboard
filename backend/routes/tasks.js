const express = require('express');
const router = express.Router();

function normalizeTags(input) {
    if (input === undefined) return undefined;
    if (input === null) return [];

    if (Array.isArray(input)) {
        return input.map(String).map((t) => t.trim()).filter(Boolean);
    }

    if (typeof input === 'string') {
        const trimmed = input.trim();
        if (!trimmed) return [];

        // Accept JSON array string.
        if (trimmed.startsWith('[')) {
            try {
                const parsed = JSON.parse(trimmed);
                if (Array.isArray(parsed)) return parsed.map(String).map((t) => t.trim()).filter(Boolean);
            } catch {
                // fall through
            }
        }

        // Accept comma-separated.
        return trimmed
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
    }

    return [];
}

function parseTagsFromRow(row) {
    if (!row) return row;
    const raw = row.tags;
    if (!raw) return { ...row, tags: [] };

    if (Array.isArray(raw)) return { ...row, tags: raw };

    if (typeof raw === 'string') {
        const trimmed = raw.trim();
        if (!trimmed) return { ...row, tags: [] };
        try {
            const parsed = JSON.parse(trimmed);
            if (Array.isArray(parsed)) return { ...row, tags: parsed.map(String) };
        } catch {
            // ignore
        }
    }

    return { ...row, tags: [] };
}

// Get all tasks
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const { status, assigned_to, include_archived, project_id } = req.query;

    let query = 'SELECT * FROM tasks';
    const conditions = [];
    const params = [];

    // Default: hide archived tasks.
    const includeArchived = include_archived === '1' || include_archived === 'true';
    if (!includeArchived) {
        conditions.push('archived_at IS NULL');
    }

    if (status) {
        conditions.push('status = ?');
        params.push(status);
    }
    if (assigned_to) {
        conditions.push('assigned_to = ?');
        params.push(assigned_to);
    }
    if (project_id) {
        conditions.push('project_id = ?');
        params.push(project_id);
    }

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY position ASC, created_at DESC';

    try {
        const tasks = db.prepare(query).all(...params).map(parseTagsFromRow);
        res.json(tasks);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get single task
router.get('/:id', (req, res) => {
    const db = req.app.locals.db;
    try {
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
        if (!task) {
            return res.status(404).json({ error: 'Task not found' });
        }
        res.json(parseTagsFromRow(task));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create task
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { title, description, status = 'backlog', priority, due_date, assigned_to, position, tags, blocked_reason, project_id } = req.body;

    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }

    try {
        // If no explicit position, append to end of column for stable ordering.
        const resolvedPosition =
            position !== undefined && position !== null
                ? position
                : db
                      .prepare(
                          'SELECT COALESCE(MAX(position), -1) + 1 as next FROM tasks WHERE status = ? AND archived_at IS NULL',
                      )
                      .get(status).next;

        const normalizedDueDate = typeof due_date === 'string' && due_date.trim() ? due_date.trim() : null;
        const normalizedTags = normalizeTags(tags);
        const tagsJson = normalizedTags === undefined ? null : JSON.stringify(normalizedTags);
        const normalizedBlockedReason = typeof blocked_reason === 'string' && blocked_reason.trim() ? blocked_reason.trim() : null;
        const resolvedProjectId = project_id != null ? Number(project_id) : null;

        const result = db
            .prepare(
                `
            INSERT INTO tasks (title, description, status, priority, due_date, tags, blocked_reason, assigned_to, position, project_id)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
            )
            .run(title, description, status, priority, normalizedDueDate, tagsJson, normalizedBlockedReason, assigned_to, resolvedPosition, resolvedProjectId);

        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);

        // Broadcast to WebSocket clients
        req.app.locals.broadcast({ type: 'task_created', data: parseTagsFromRow(task) });

        res.status(201).json(parseTagsFromRow(task));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task
router.patch('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { title, description, status, priority, due_date, assigned_to, position, archived_at, tags, blocked_reason } = req.body;

    const updates = [];
    const params = [];

    if (title !== undefined) {
        updates.push('title = ?');
        params.push(title);
    }
    if (description !== undefined) {
        updates.push('description = ?');
        params.push(description);
    }
    if (status !== undefined) {
        updates.push('status = ?');
        params.push(status);
        if (status === 'done') {
            updates.push('completed_at = ?');
            params.push(new Date().toISOString());
        }
    }
    if (priority !== undefined) {
        updates.push('priority = ?');
        params.push(priority);
    }
    if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(typeof due_date === 'string' && due_date.trim() ? due_date.trim() : null);
    }
    if (tags !== undefined) {
        const normalizedTags = normalizeTags(tags);
        updates.push('tags = ?');
        params.push(JSON.stringify(normalizedTags ?? []));
    }
    if (blocked_reason !== undefined) {
        updates.push('blocked_reason = ?');
        params.push(typeof blocked_reason === 'string' && blocked_reason.trim() ? blocked_reason.trim() : null);
    }
    if (assigned_to !== undefined) {
        updates.push('assigned_to = ?');
        params.push(assigned_to);
    }
    if (position !== undefined) {
        updates.push('position = ?');
        params.push(position);
    }
    if (archived_at !== undefined) {
        updates.push('archived_at = ?');
        params.push(archived_at);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }

    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);

    try {
        db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);

        const hydrated = parseTagsFromRow(task);
        req.app.locals.broadcast({ type: 'task_updated', data: hydrated });

        res.json(hydrated);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Delete task
router.delete('/:id', (req, res) => {
    const db = req.app.locals.db;
    try {
        const result = db.prepare('DELETE FROM tasks WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Task not found' });
        }

        req.app.locals.broadcast({ type: 'task_deleted', data: { id: req.params.id } });

        res.status(204).send();
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

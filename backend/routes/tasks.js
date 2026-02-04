const express = require('express');
const router = express.Router();

// Get all tasks
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const { status, assigned_to, include_archived } = req.query;

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

    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ' ORDER BY position ASC, created_at DESC';
    
    try {
        const tasks = db.prepare(query).all(...params);
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
        res.json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create task
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { title, description, status = 'backlog', priority, due_date, assigned_to, position } = req.body;
    
    if (!title) {
        return res.status(400).json({ error: 'Title is required' });
    }
    
    try {
        // If no explicit position, append to end of column for stable ordering.
        const resolvedPosition =
            position !== undefined && position !== null
                ? position
                : db
                      .prepare('SELECT COALESCE(MAX(position), -1) + 1 as next FROM tasks WHERE status = ? AND archived_at IS NULL')
                      .get(status).next;

        const normalizedDueDate = typeof due_date === 'string' && due_date.trim() ? due_date.trim() : null;

        const result = db.prepare(`
            INSERT INTO tasks (title, description, status, priority, due_date, assigned_to, position)
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `).run(title, description, status, priority, normalizedDueDate, assigned_to, resolvedPosition);
        
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(result.lastInsertRowid);
        
        // Broadcast to WebSocket clients
        req.app.locals.broadcast({ type: 'task_created', data: task });
        
        res.status(201).json(task);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update task
router.patch('/:id', (req, res) => {
    const db = req.app.locals.db;
    const { title, description, status, priority, due_date, assigned_to, position, archived_at } = req.body;
    
    const updates = [];
    const params = [];
    
    if (title !== undefined) { updates.push('title = ?'); params.push(title); }
    if (description !== undefined) { updates.push('description = ?'); params.push(description); }
    if (status !== undefined) { 
        updates.push('status = ?'); 
        params.push(status);
        if (status === 'done') {
            updates.push('completed_at = ?');
            params.push(new Date().toISOString());
        }
    }
    if (priority !== undefined) { updates.push('priority = ?'); params.push(priority); }
    if (due_date !== undefined) {
        updates.push('due_date = ?');
        params.push(typeof due_date === 'string' && due_date.trim() ? due_date.trim() : null);
    }
    if (assigned_to !== undefined) { updates.push('assigned_to = ?'); params.push(assigned_to); }
    if (position !== undefined) { updates.push('position = ?'); params.push(position); }
    if (archived_at !== undefined) { updates.push('archived_at = ?'); params.push(archived_at); }
    
    if (updates.length === 0) {
        return res.status(400).json({ error: 'No fields to update' });
    }
    
    updates.push('updated_at = ?');
    params.push(new Date().toISOString());
    params.push(req.params.id);
    
    try {
        db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ?`).run(...params);
        const task = db.prepare('SELECT * FROM tasks WHERE id = ?').get(req.params.id);
        
        req.app.locals.broadcast({ type: 'task_updated', data: task });
        
        res.json(task);
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

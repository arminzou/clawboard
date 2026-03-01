const express = require('express');
const router = express.Router();

const { syncDocs } = require('../utils/syncDocs');

const DOC_TYPE_TAGS = new Set(['spec', 'runbook', 'reference', 'decision']);

function normalizeDocTypeTag(raw) {
    if (raw == null) return null;
    const tag = String(raw).trim().toLowerCase();
    if (!tag) return null;
    return DOC_TYPE_TAGS.has(tag) ? tag : null;
}

function attachLinkedTasks(db, docs) {
    if (!Array.isArray(docs) || docs.length === 0) return docs;
    const ids = docs.map((d) => Number(d.id)).filter((id) => Number.isFinite(id));
    if (!ids.length) {
        return docs.map((doc) => ({ ...doc, linked_tasks: [] }));
    }

    const placeholders = ids.map(() => '?').join(', ');
    const rows = db.prepare(`
        SELECT
            l.document_id,
            t.id AS task_id,
            t.title AS task_title,
            t.status AS task_status
        FROM document_task_links l
        JOIN tasks t ON t.id = l.task_id
        WHERE l.document_id IN (${placeholders})
        ORDER BY t.id ASC
    `).all(...ids);

    const linksByDoc = new Map();
    for (const row of rows) {
        const existing = linksByDoc.get(row.document_id) || [];
        existing.push({
            id: row.task_id,
            title: row.task_title,
            status: row.task_status,
        });
        linksByDoc.set(row.document_id, existing);
    }

    return docs.map((doc) => ({
        ...doc,
        linked_tasks: linksByDoc.get(doc.id) || [],
    }));
}

// Get all tracked documents
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const { git_status, limit = 100, doc_type_tag } = req.query;
    
    let query = 'SELECT * FROM documents';
    const conditions = [];
    const params = [];
    
    if (git_status) {
        conditions.push('git_status = ?');
        params.push(git_status);
    }
    if (doc_type_tag) {
        conditions.push('doc_type_tag = ?');
        params.push(String(doc_type_tag).trim().toLowerCase());
    }
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY last_modified DESC LIMIT ?';
    params.push(parseInt(limit));
    
    try {
        const docs = db.prepare(query).all(...params);
        res.json(attachLinkedTasks(db, docs));
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update or insert document
router.post('/sync', (req, res) => {
    const db = req.app.locals.db;
    const { file_path, file_type, last_modified, last_modified_by, size_bytes, git_status } = req.body;
    
    if (!file_path) {
        return res.status(400).json({ error: 'file_path is required' });
    }
    
    try {
        const existing = db.prepare('SELECT * FROM documents WHERE file_path = ?').get(file_path);
        
        if (existing) {
            db.prepare(`
                UPDATE documents 
                SET file_type = ?, last_modified = ?, last_modified_by = ?, 
                    size_bytes = ?, git_status = ?
                WHERE file_path = ?
            `).run(file_type, last_modified, last_modified_by, size_bytes, git_status, file_path);
        } else {
            db.prepare(`
                INSERT INTO documents (file_path, file_type, last_modified, last_modified_by, size_bytes, git_status)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(file_path, file_type, last_modified, last_modified_by, size_bytes, git_status);
        }
        
        const doc = db.prepare('SELECT * FROM documents WHERE file_path = ?').get(file_path);
        const enriched = { ...doc, linked_tasks: attachLinkedTasks(db, [doc])[0]?.linked_tasks || [] };

        req.app.locals.broadcast({ type: 'document_updated', data: enriched });

        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Mark document as accessed/read
router.post('/:id/accessed', (req, res) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid document id' });

    try {
        const now = new Date().toISOString();
        const result = db
            .prepare('UPDATE documents SET last_accessed_at = ? WHERE id = ?')
            .run(now, id);
        if (!result.changes) return res.status(404).json({ error: 'document not found' });

        const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
        const enriched = { ...doc, linked_tasks: attachLinkedTasks(db, [doc])[0]?.linked_tasks || [] };
        req.app.locals.broadcast({ type: 'document_updated', data: enriched });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Update document metadata (currently doc_type_tag)
router.patch('/:id', (req, res) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid document id' });

    const hasDocType = Object.prototype.hasOwnProperty.call(req.body || {}, 'doc_type_tag');
    if (!hasDocType) return res.status(400).json({ error: 'no fields to update' });
    const tag = normalizeDocTypeTag(req.body.doc_type_tag);
    if (req.body.doc_type_tag != null && !tag) {
        return res.status(400).json({ error: 'invalid doc_type_tag (spec, runbook, reference, decision)' });
    }

    try {
        const result = db
            .prepare('UPDATE documents SET doc_type_tag = ? WHERE id = ?')
            .run(tag, id);
        if (!result.changes) return res.status(404).json({ error: 'document not found' });

        const doc = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
        const enriched = { ...doc, linked_tasks: attachLinkedTasks(db, [doc])[0]?.linked_tasks || [] };
        req.app.locals.broadcast({ type: 'document_updated', data: enriched });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Attach a document to a task
router.post('/:id/attach-task', (req, res) => {
    const db = req.app.locals.db;
    const id = Number(req.params.id);
    const taskId = Number(req.body?.task_id);
    if (!Number.isFinite(id)) return res.status(400).json({ error: 'invalid document id' });
    if (!Number.isFinite(taskId)) return res.status(400).json({ error: 'task_id is required' });

    try {
        const doc = db.prepare('SELECT id FROM documents WHERE id = ?').get(id);
        if (!doc) return res.status(404).json({ error: 'document not found' });
        const task = db.prepare('SELECT id FROM tasks WHERE id = ?').get(taskId);
        if (!task) return res.status(404).json({ error: 'task not found' });

        db.prepare(
            'INSERT OR IGNORE INTO document_task_links (document_id, task_id) VALUES (?, ?)',
        ).run(id, taskId);

        const updated = db.prepare('SELECT * FROM documents WHERE id = ?').get(id);
        const enriched = { ...updated, linked_tasks: attachLinkedTasks(db, [updated])[0]?.linked_tasks || [] };
        req.app.locals.broadcast({ type: 'document_updated', data: enriched });
        res.json(enriched);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rescan workspace docs (runs syncDocs utility)
router.post('/resync', (req, res) => {
    try {
        const workspaceRoot = req.body?.workspace_root || process.env.WORKSPACE_ROOT || undefined;
        const syncDocsFn = req.app?.locals?.syncDocs || syncDocs;
        const r = syncDocsFn({ workspaceRoot });

        req.app.locals.broadcast({ type: 'document_resynced', data: r });
        res.json(r);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get document statistics
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;
    
    try {
        const stats = {
            total: db.prepare('SELECT COUNT(*) as count FROM documents').get().count,
            by_type: db.prepare(`
                SELECT file_type, COUNT(*) as count 
                FROM documents 
                GROUP BY file_type
                ORDER BY count DESC
            `).all(),
            by_doc_type_tag: db.prepare(`
                SELECT doc_type_tag, COUNT(*) as count
                FROM documents
                GROUP BY doc_type_tag
                ORDER BY count DESC
            `).all(),
            by_status: db.prepare(`
                SELECT git_status, COUNT(*) as count 
                FROM documents 
                GROUP BY git_status
            `).all(),
            by_author: db.prepare(`
                SELECT last_modified_by, COUNT(*) as count 
                FROM documents 
                WHERE last_modified_by IS NOT NULL
                GROUP BY last_modified_by
            `).all()
        };
        
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

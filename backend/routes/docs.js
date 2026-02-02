const express = require('express');
const router = express.Router();

const { syncDocs } = require('../utils/syncDocs');

// Get all tracked documents
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const { git_status, limit = 100 } = req.query;
    
    let query = 'SELECT * FROM documents';
    const params = [];
    
    if (git_status) {
        query += ' WHERE git_status = ?';
        params.push(git_status);
    }
    
    query += ' ORDER BY last_modified DESC LIMIT ?';
    params.push(parseInt(limit));
    
    try {
        const docs = db.prepare(query).all(...params);
        res.json(docs);
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
        
        req.app.locals.broadcast({ type: 'document_updated', data: doc });
        
        res.json(doc);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Rescan workspace docs (runs syncDocs utility)
router.post('/resync', (req, res) => {
    try {
        const workspaceRoot = req.body?.workspace_root || process.env.WORKSPACE_ROOT || undefined;
        const r = syncDocs({ workspaceRoot });

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

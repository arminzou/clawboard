const express = require('express');
const router = express.Router();

const { ingestSessions } = require('../utils/ingestSessions');

// Get all activities (with pagination and filtering)
router.get('/', (req, res) => {
    const db = req.app.locals.db;
    const { agent, limit = 50, offset = 0, since } = req.query;
    
    let query = 'SELECT * FROM activities';
    const conditions = [];
    const params = [];
    
    if (agent) {
        conditions.push('agent = ?');
        params.push(agent);
    }
    if (since) {
        conditions.push('timestamp >= ?');
        params.push(since);
    }
    
    if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
    }
    
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit), parseInt(offset));
    
    try {
        const activities = db.prepare(query).all(...params);
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Create activity
router.post('/', (req, res) => {
    const db = req.app.locals.db;
    const { agent, activity_type, description, details, session_key, related_task_id } = req.body;
    
    if (!agent || !activity_type || !description) {
        return res.status(400).json({ error: 'agent, activity_type, and description are required' });
    }
    
    try {
        const result = db.prepare(`
            INSERT INTO activities (agent, activity_type, description, details, session_key, related_task_id)
            VALUES (?, ?, ?, ?, ?, ?)
        `).run(agent, activity_type, description, details, session_key, related_task_id);
        
        const activity = db.prepare('SELECT * FROM activities WHERE id = ?').get(result.lastInsertRowid);
        
        req.app.locals.broadcast({ type: 'activity_created', data: activity });
        
        res.status(201).json(activity);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get activities for specific agent
router.get('/agent/:agent', (req, res) => {
    const db = req.app.locals.db;
    const { limit = 50 } = req.query;
    
    try {
        const activities = db.prepare(`
            SELECT * FROM activities 
            WHERE agent = ? 
            ORDER BY timestamp DESC 
            LIMIT ?
        `).all(req.params.agent, parseInt(limit));
        
        res.json(activities);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Ingest OpenClaw session JSONL logs into activities
router.post('/ingest-sessions', (req, res) => {
    try {
        const agents = Array.isArray(req.body?.agents) ? req.body.agents : undefined;
        const r = ingestSessions({ agents });
        req.app.locals.broadcast({ type: 'activity_ingested', data: r });
        res.json(r);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Get statistics
router.get('/stats', (req, res) => {
    const db = req.app.locals.db;
    
    try {
        const stats = {
            total: db.prepare('SELECT COUNT(*) as count FROM activities').get().count,
            by_agent: db.prepare(`
                SELECT agent, COUNT(*) as count 
                FROM activities 
                GROUP BY agent
            `).all(),
            by_type: db.prepare(`
                SELECT activity_type, COUNT(*) as count 
                FROM activities 
                GROUP BY activity_type
                ORDER BY count DESC
                LIMIT 10
            `).all(),
            recent_24h: db.prepare(`
                SELECT COUNT(*) as count 
                FROM activities 
                WHERE timestamp >= datetime('now', '-1 day')
            `).get().count
        };
        
        res.json(stats);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

module.exports = router;

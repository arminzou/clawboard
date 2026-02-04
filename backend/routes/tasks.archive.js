const express = require('express');
const router = express.Router();

// Bulk archive done tasks (optionally by assignee)
router.post('/archive_done', (req, res) => {
  const db = req.app.locals.db;
  const { assigned_to } = req.body ?? {};

  const conditions = ["status = 'done'", 'archived_at IS NULL'];
  const params = [];

  // assigned_to semantics:
  // - undefined => all
  // - null => unassigned
  // - string => that assignee
  if (assigned_to === null) {
    conditions.push('assigned_to IS NULL');
  } else if (assigned_to !== undefined && assigned_to !== 'all' && assigned_to !== '') {
    conditions.push('assigned_to = ?');
    params.push(assigned_to);
  }

  const now = new Date().toISOString();

  try {
    const sql = `UPDATE tasks SET archived_at = ?, updated_at = ? WHERE ${conditions.join(' AND ')}`;
    const result = db.prepare(sql).run(now, now, ...params);

    // Tell clients to refresh. (We don't emit per-task updates for bulk ops.)
    req.app.locals.broadcast({ type: 'tasks_bulk_updated', data: { archived_done: result.changes } });

    res.json({ archived: result.changes });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;

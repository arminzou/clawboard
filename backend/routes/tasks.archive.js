const express = require('express');
const router = express.Router();

// Bulk archive done tasks (optionally by assignee)
router.post('/archive_done', (req, res) => {
  const db = req.app.locals.db;
  const { assigned_to_id, assigned_to_type, assigned_to } = req.body ?? {};

  const conditions = ["status = 'done'", 'archived_at IS NULL'];
  const params = [];

  // assignee id semantics:
  // - undefined => all
  // - null => unassigned
  // - string => that assignee
  const assigneeId = assigned_to_id !== undefined ? assigned_to_id : assigned_to;
  if (assigneeId === null) {
    conditions.push('assigned_to_id IS NULL');
  } else if (assigneeId !== undefined && assigneeId !== 'all' && assigneeId !== '') {
    conditions.push('assigned_to_id = ?');
    params.push(String(assigneeId).trim());
  }

  if (assigned_to_type === null) {
    conditions.push('assigned_to_type IS NULL');
  } else if (assigned_to_type !== undefined && assigned_to_type !== 'all' && assigned_to_type !== '') {
    conditions.push('assigned_to_type = ?');
    params.push(String(assigned_to_type).trim());
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

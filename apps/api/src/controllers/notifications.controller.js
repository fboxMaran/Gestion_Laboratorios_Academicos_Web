// apps/api/src/controllers/notifications.controller.js
const { pool } = require('../db/pool');

function uid(req) {
  return req.user?.id || req.auth?.user?.id || null;
}

// GET /api/notifications?since=YYYY-MM-DD
exports.list = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const since = req.query.since ? new Date(req.query.since) : null;
  const { rows } = await pool.query(
    `SELECT id, title, body, meta, queued_at, sent_at
       FROM notifications
      WHERE user_id=$1 AND ($2::timestamp IS NULL OR queued_at >= $2)
      ORDER BY queued_at DESC`,
    [userId, since]
  );
  res.json(rows);
};

// POST /api/notifications/:id/seen
exports.markSeen = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const id = Number(req.params.id);
  const { rowCount } = await pool.query(
    `UPDATE notifications SET sent_at = NOW()
      WHERE id=$1 AND user_id=$2 AND sent_at IS NULL`,
    [id, userId]
  );
  if (!rowCount) return res.status(404).json({ error: 'No encontrada' });
  res.json({ ok: true });
};

// POST /api/notifications/mark-all-seen
exports.markAllSeen = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  await pool.query(
    `UPDATE notifications SET sent_at = NOW()
      WHERE user_id=$1 AND sent_at IS NULL`,
    [userId]
  );
  res.json({ ok: true });
};

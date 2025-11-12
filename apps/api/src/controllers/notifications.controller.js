// apps/api/src/controllers/notifications.controller.js
const { pool } = require('../db/pool');

function uid(req) {
  return req.user?.id || req.auth?.user?.id || null;
}

// GET /api/notifications?since=YYYY-MM-DD
exports.list = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  console.log('[Notifications] Listando notificaciones para usuario:', userId);

  const since = req.query.since ? new Date(req.query.since) : null;
  const { rows } = await pool.query(
    `SELECT 
      id, 
      subject as title, 
      body as message, 
      topic as type, 
      sent_at as created_at, 
      read_at,
      (read_at IS NOT NULL) as read
     FROM notification
     WHERE user_id=$1 AND ($2::timestamp IS NULL OR sent_at >= $2)
     ORDER BY sent_at DESC`,
    [userId, since]
  );
  
  console.log('[Notifications] Devolviendo', rows.length, 'notificaciones');
  res.json(rows);
};

// POST /api/notifications/:id/seen
exports.markSeen = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const id = Number(req.params.id);
  const { rowCount } = await pool.query(
    `UPDATE notification SET read_at = NOW()
      WHERE id=$1 AND user_id=$2 AND read_at IS NULL`,
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
    `UPDATE notification SET read_at = NOW()
      WHERE user_id=$1 AND read_at IS NULL`,
    [userId]
  );
  res.json({ ok: true });
};

// DELETE /api/notifications/:id
exports.deleteNotification = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const id = Number(req.params.id);
  console.log('[Notifications] Eliminando notificación', id, 'para usuario', userId);
  
  const { rowCount } = await pool.query(
    `DELETE FROM notification WHERE id=$1 AND user_id=$2`,
    [id, userId]
  );
  
  if (!rowCount) return res.status(404).json({ error: 'Notificación no encontrada' });
  
  console.log('[Notifications] Notificación eliminada exitosamente');
  res.json({ ok: true });
};

// apps/api/src/utils/notifications.js
const { pool } = require('../db/pool');

async function notify(userId, title, body, meta = {}) {
  await pool.query(
    `INSERT INTO notifications (user_id, title, body, meta)
     VALUES ($1,$2,$3,$4::jsonb)`,
    [userId, title, body, JSON.stringify(meta)]
  );
}

async function notifyRequestStatus({ requestId }) {
  const { rows } = await pool.query(
    `SELECT r.id, r.status, r.requester_email, r.requester_name, r.user_id
       FROM requests r
      WHERE r.id = $1`,
    [requestId]
  );
  if (!rows.length) return;
  const r = rows[0];
  if (!r.user_id) return;
  await notify(
    r.user_id,
    `Solicitud #${r.id}: ${r.status}`,
    `Tu solicitud #${r.id} cambió a estado ${r.status}.`,
    { request_id: r.id, status: r.status }
  );
}

// (opcional) ticker horaria para vencimientos próximos
async function notifyDueSoon() {
  await pool.query(`
    WITH due AS (
      SELECT id, user_id, request_id, due_at
        FROM resource_assignments
       WHERE status='ASIGNADO' AND due_at IS NOT NULL
         AND due_at BETWEEN NOW() AND NOW() + INTERVAL '24 hours'
    )
    INSERT INTO notifications (user_id, title, body, meta)
    SELECT COALESCE(user_id, (SELECT user_id FROM requests WHERE id = request_id)),
           'Recordatorio de devolución',
           'Tienes una devolución próxima en menos de 24 horas.',
           jsonb_build_object('request_id', request_id, 'due_at', due_at)
      FROM due
  `);
}

module.exports = { notify, notifyRequestStatus, notifyDueSoon };

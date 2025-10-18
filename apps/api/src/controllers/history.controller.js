// apps/api/src/controllers/history.controller.js
const { pool } = require('../db/pool');
const { Parser } = require('json2csv');

function uid(req) {
  return req.user?.id || req.auth?.user?.id || Number(req.query.user_id) || null;
}

// GET /api/users/me/history?format=json|csv
exports.userHistory = async (req, res) => {
  const userId = uid(req);
  if (!userId) return res.status(401).json({ error: 'No autenticado' });

  const q = `
    WITH
    reqs AS (
      SELECT 'RESERVA'::text AS kind, r.id as ref_id, r.lab_id, r.requested_from as at,
             r.status as state, r.purpose, NULL::int as resource_id, NULL::numeric as qty,
             NULL::numeric as hours, NULL::numeric as credits
        FROM requests r
       WHERE r.user_id = $1
    ),
    assigns AS (
      SELECT 'ASIGNACION'::text AS kind, ra.request_id as ref_id, ra.lab_id,
             ra.assigned_at as at, ra.status as state, ra.notes as purpose,
             COALESCE(ra.resource_id, ra.fixed_id) as resource_id, ra.qty,
             NULL::numeric as hours, NULL::numeric as credits
        FROM resource_assignments ra
       WHERE COALESCE(ra.user_id, (SELECT user_id FROM requests WHERE id=ra.request_id)) = $1
    ),
    consum AS (
      SELECT 'CONSUMO'::text AS kind, mc.request_id as ref_id, mc.lab_id,
             mc.used_at as at, NULL::text as state, mc.notes as purpose,
             mc.consumable_id as resource_id, mc.qty,
             NULL::numeric as hours, NULL::numeric as credits
        FROM material_consumptions mc
       WHERE mc.used_by = $1 OR mc.request_id IN (SELECT id FROM requests WHERE user_id=$1)
    ),
    benefits AS (
      SELECT 'BENEFICIO'::text AS kind, ab.request_id as ref_id, ab.lab_id,
             ab.created_at as at, NULL::text as state, ab.notes as purpose,
             NULL::int as resource_id, NULL::numeric as qty,
             ab.hours, ab.credits
        FROM academic_benefits ab
       WHERE ab.user_id = $1
    ),
    trainings AS (
      SELECT 'CAPACITACION'::text AS kind, ut.training_id as ref_id, NULL::int as lab_id,
             ut.completed_at as at, NULL::text as state, NULL::text as purpose,
             NULL::int as resource_id, NULL::numeric as qty,
             NULL::numeric as hours, NULL::numeric as credits
        FROM user_trainings ut
       WHERE ut.user_id = $1
    )
    SELECT * FROM (
      SELECT * FROM reqs
      UNION ALL SELECT * FROM assigns
      UNION ALL SELECT * FROM consum
      UNION ALL SELECT * FROM benefits
      UNION ALL SELECT * FROM trainings
    ) x
    ORDER BY at DESC NULLS LAST
  `;

  const { rows } = await pool.query(q, [userId]);

  const format = (req.query.format || 'json').toLowerCase();
  if (format === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="historial.csv"');
    return res.send(csv);
  }

  res.json(rows);
};

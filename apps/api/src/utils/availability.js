// apps/api/src/utils/availability.js
const { pool } = require('../db/pool');

async function checkAvailability({ labId, resourceIds = [], from, to }) {
  const conflicts = [];

  // Slots del laboratorio que se traslapan
  const slotsLab = await pool.query(
    `SELECT id, resource_id, status, starts_at, ends_at
       FROM calendar_slot
      WHERE lab_id = $3
        AND status IN ('RESERVADO','BLOQUEADO','EXCLUSIVO','MANTENIMIENTO')
        AND starts_at < $2 AND $1 < ends_at`,
    [from, to, labId]
  );
  if (slotsLab.rowCount) conflicts.push({ type: 'slot', scope: 'lab', rows: slotsLab.rows });

  if (resourceIds.length) {
    const slotsRes = await pool.query(
      `SELECT id, resource_id, status, starts_at, ends_at
         FROM calendar_slot
        WHERE resource_id = ANY($3)
          AND status IN ('RESERVADO','BLOQUEADO','EXCLUSIVO','MANTENIMIENTO')
          AND starts_at < $2 AND $1 < ends_at`,
      [from, to, resourceIds]
    );
    if (slotsRes.rowCount) conflicts.push({ type: 'slot', scope: 'resource', rows: slotsRes.rows });

    const resBad = await pool.query(
      `SELECT id, name, state as status
         FROM resource
        WHERE id = ANY($1) AND state <> 'DISPONIBLE'`,
      [resourceIds]
    );
    if (resBad.rowCount) conflicts.push({ type: 'resource', scope: 'status', rows: resBad.rows });
  }

  return { ok: conflicts.length === 0, conflicts };
}

module.exports = { checkAvailability };

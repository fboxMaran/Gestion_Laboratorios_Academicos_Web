// apps/api/src/utils/requirements.js
const { pool } = require('../db/pool');

async function requirementsOk({ labId, userId }) {
  // TODO: Implementar verificación de requisitos cuando existan las tablas
  // Por ahora, siempre permitimos el acceso
  return { ok: true, missing: [] };
  
  /* Código original comentado hasta que existan las tablas necesarias:
  const reqs = await pool.query(
    `SELECT lr.training_id, tc.code, tc.name
       FROM lab_training_requirements lr
       JOIN trainings_catalog tc ON tc.id = lr.training_id
      WHERE lr.lab_id = $1`,
    [labId]
  );

  if (reqs.rows.length === 0) return { ok: true, missing: [] };

  const done = await pool.query(
    `SELECT ut.training_id
       FROM user_trainings ut
      WHERE ut.user_id = $1
        AND (ut.expires_at IS NULL OR ut.expires_at > NOW())`,
    [userId]
  );
  const doneSet = new Set(done.rows.map(r => r.training_id));

  const missing = reqs.rows
    .filter(r => !doneSet.has(r.training_id))
    .map(r => ({ id: r.training_id, code: r.code, name: r.name }));

  return { ok: missing.length === 0, missing };
  */
}

module.exports = { requirementsOk };

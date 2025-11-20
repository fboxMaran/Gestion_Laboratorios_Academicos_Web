const { pool } = require('../db/pool');
const { Parser } = require('json2csv');

// GET /api/admin/audit?user_id=&entity_type=&action=&from=&to=&limit=&offset=&format=csv
exports.search = async (req, res) => {
  const {
    user_id,
    entity_type,
    action,
    from,
    to,
    limit = 100,
    offset = 0,
    format
  } = req.query;

  const params = [];
  const where = [];

  // Filtro por usuario que realizó la acción (actor_user_id)
  if (user_id) {
    params.push(Number(user_id));
    where.push(`al.actor_user_id = $${params.length}`);
  }

  // Filtro por entidad / módulo lógico (columna entity en audit_log)
  if (entity_type) {
    params.push(String(entity_type));
    where.push(`al.entity = $${params.length}`);
  }

  // Filtro por acción (CREATE, UPDATE, DELETE, LOGIN, etc.)
  if (action) {
    params.push(String(action));
    where.push(`al.action = $${params.length}`);
  }

  // Rango de fechas
  if (from) {
    params.push(new Date(from));
    where.push(`al.created_at >= $${params.length}`);
  }

  if (to) {
    params.push(new Date(to));
    where.push(`al.created_at <= $${params.length}`);
  }

  // limit y offset
  params.push(Number(limit));
  const limIdx = params.length;

  params.push(Number(offset));
  const offIdx = params.length;

  const sql = `
    SELECT
      al.id,
      al.module,                             -- módulo donde ocurrió la acción
      al.entity,                             -- entidad afectada (ej: app_user, lab, request)
      al.entity_id,
      al.actor_user_id       AS user_id,     -- id del usuario que hizo la acción
      u.full_name            AS user_name,   -- nombre del usuario (si existe)
      u.email                AS user_email,  -- por si querés mostrarlo también
      al.action,
      al.after_snapshot      AS detail,      -- "detalle" para el frontend
      al.created_at
    FROM audit_log al
    LEFT JOIN app_user u
           ON u.id = al.actor_user_id
    ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
    ORDER BY al.created_at DESC
    LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const { rows } = await pool.query(sql, params);

  // Exportación a CSV
  if (String(format).toLowerCase() === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
    return res.send(csv);
  }

  // Respuesta JSON para el frontend
  res.json(rows);
};

exports.insertAuditLog = async (data) => {
  try {
    console.log('Inserting audit log:', data.body);
    await pool.query(
      `INSERT INTO audit_log (module, entity, entity_id, actor_user_id, action, after_snapshot)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [data.body.module, data.body.entity, data.body.entity_id, data.body.actor_user_id || null, data.body.action, data.body.after_snapshot ? JSON.stringify(data.body.after_snapshot) : null]
    );
  } catch (error) {
    console.error('Error inserting audit log:', error);
  }
};
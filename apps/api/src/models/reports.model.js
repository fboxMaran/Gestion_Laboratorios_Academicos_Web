const { pool } = require('../db/pool');

const ReportsModel = {
  // 1) Uso de recursos y usuarios frecuentes (desde resource_assignments + requests)
  async usage({ lab_id, from, to, limit = 20 }) {
    const args = [lab_id, from, to, limit];

    // Recursos más usados
    const qRes = `
      SELECT
        r.id           AS resource_id,
        r.name         AS resource_name,
        COUNT(a.id)    AS assignments_count,
        COALESCE(SUM(a.qty),0) AS qty_assigned
      FROM resource_assignments a
      JOIN resources r ON r.id = a.resource_id
      WHERE a.lab_id = $1
        AND a.assigned_at >= $2
        AND a.assigned_at <= $3
      GROUP BY r.id, r.name
      ORDER BY assignments_count DESC, qty_assigned DESC
      LIMIT $4
    `;
    const resRes = await pool.query(qRes, args);

    // Usuarios más frecuentes (si a.user_id no existe, caemos al requester de la solicitud)
    const qUsers = `
      SELECT
        COALESCE(a.user_id, NULL) AS user_id,
        COALESCE(req.requester_email, '') AS email,
        COALESCE(req.requester_name,  '') AS name,
        COUNT(a.id)    AS assignments_count,
        COALESCE(SUM(a.qty),0) AS qty_assigned
      FROM resource_assignments a
      LEFT JOIN requests req ON req.id = a.request_id
      WHERE a.lab_id = $1
        AND a.assigned_at >= $2
        AND a.assigned_at <= $3
      GROUP BY user_id, email, name
      ORDER BY assignments_count DESC, qty_assigned DESC
      LIMIT $4
    `;
    const resUsers = await pool.query(qUsers, args);

    return {
      window: { from, to },
      resources_top: resRes.rows,
      users_top: resUsers.rows
    };
  },

  // 2) Inventario: estado, críticos y consumo por periodo
  async inventory({ lab_id, from, to }) {
    // Conteo por estado de recursos
    const resStatus = await pool.query(
      `SELECT status, COUNT(*) AS count
       FROM resources
       WHERE lab_id = $1
       GROUP BY status
       ORDER BY status ASC`,
      [lab_id]
    );

    // Consumibles críticos (qty <= reorder)
    const resCritical = await pool.query(
      `SELECT id, name, unit, qty_available, reorder_point,
              (qty_available - reorder_point) AS delta
       FROM consumables
       WHERE lab_id = $1
         AND qty_available <= reorder_point
       ORDER BY delta ASC, name ASC`,
      [lab_id]
    );

    // Consumo en el periodo
    const resCons = await pool.query(
      `SELECT
         c.id   AS consumable_id,
         c.name AS consumable_name,
         SUM(m.qty) AS qty_consumed
       FROM material_consumptions m
       JOIN consumables c ON c.id = m.consumable_id
       WHERE m.lab_id = $1
         AND m.used_at >= $2
         AND m.used_at <= $3
       GROUP BY c.id, c.name
       ORDER BY qty_consumed DESC, consumable_name ASC`,
      [lab_id, from, to]
    );

    return {
      window: { from, to },
      resources_status: resStatus.rows,
      consumables_critical: resCritical.rows,
      consumptions_period: resCons.rows
    };
  },

  // 3) Mantenimiento: frecuencia y downtime promedio (usando calendar_slots con status = 'MANTENIMIENTO')
  async maintenance({ lab_id, from, to }) {
    const resByRes = await pool.query(
      `SELECT
         COALESCE(resource_id, 0) AS resource_id,
         COUNT(*)                  AS events_count,
         AVG(EXTRACT(EPOCH FROM (ends_at - starts_at)))  AS avg_seconds,
         SUM(EXTRACT(EPOCH FROM (ends_at - starts_at)))  AS total_seconds
       FROM calendar_slots
       WHERE lab_id = $1
         AND status = 'MANTENIMIENTO'
         AND starts_at >= $2
         AND starts_at <= $3
       GROUP BY resource_id
       ORDER BY events_count DESC, total_seconds DESC`,
      [lab_id, from, to]
    );

    const resGlobal = await pool.query(
      `SELECT
         COUNT(*) AS events_count,
         AVG(EXTRACT(EPOCH FROM (ends_at - starts_at))) AS avg_seconds,
         SUM(EXTRACT(EPOCH FROM (ends_at - starts_at))) AS total_seconds
       FROM calendar_slots
       WHERE lab_id = $1
         AND status = 'MANTENIMIENTO'
         AND starts_at >= $2
         AND starts_at <= $3`,
      [lab_id, from, to]
    );

    const g = resGlobal.rows[0] || { events_count: 0, avg_seconds: 0, total_seconds: 0 };

    return {
      window: { from, to },
      maintenance_by_resource: resByRes.rows,
      summary: {
        events_count: Number(g.events_count || 0),
        avg_seconds:  Number(g.avg_seconds  || 0),
        total_seconds:Number(g.total_seconds|| 0)
      }
    };
  },
};

module.exports = ReportsModel;

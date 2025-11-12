// apps/api/src/models/maintenance.model.js
const { pool } = require('../db/pool');

/**
 * (Opcional) Aviso simple cuando un recurso pase a DISPONIBLE.
 * Inserta notificación en la tabla notifications. No depende de subscriptions aquí.
 */
async function notifyIfDisponible({ lab_id, resource_id, title }) {
  if (!resource_id) return;
  try {
    await pool.query(
      `INSERT INTO notification (user_id, title, body, meta)
       VALUES ($1,$2,$3,$4)`,
      [
        0, // user_id 0 => bandeja global / por implementar
        'Recurso disponible',
        title || 'Un recurso volvió a estado DISPONIBLE',
        JSON.stringify({ lab_id, resource_id })
      ]
    );
  } catch (_e) { /* no bloquear mantenimiento si falla notificación */ }
}

const MaintenanceModel = {
  async createOrder(payload) {
    const {
      lab_id, resource_id, fixed_id, type,
      scheduled_at, technician_id, technician_name,
      description, notify_on_disponible = true
    } = payload;

    if (!lab_id || (!resource_id && !fixed_id) || !type) {
      const err = new Error('lab_id, type y (resource_id o fixed_id) son obligatorios'); err.status = 400; throw err;
    }

    const { rows } = await pool.query(
      `INSERT INTO maintenance_orders
         (lab_id, resource_id, fixed_id, type, scheduled_at, technician_id, technician_name, description, notify_on_disponible)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
       RETURNING *`,
      [lab_id, resource_id || null, fixed_id || null, type, scheduled_at || null,
       technician_id || null, technician_name || null, description || null, !!notify_on_disponible]
    );
    return rows[0];
  },

  async listOrders({ lab_id, status, resource_id, fixed_id }) {
    const args = [];
    const cond = [];
    if (lab_id) { args.push(lab_id); cond.push(`lab_id = $${args.length}`); }
    if (status) { args.push(status); cond.push(`status = $${args.length}`); }
    if (resource_id) { args.push(resource_id); cond.push(`resource_id = $${args.length}`); }
    if (fixed_id) { args.push(fixed_id); cond.push(`fixed_id = $${args.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const { rows } = await pool.query(
      `SELECT * FROM maintenance_orders
       ${where}
       ORDER BY COALESCE(scheduled_at, created_at) DESC, id DESC`
    );
    return rows;
  },

  async getOrder(id) {
    const { rows } = await pool.query(`SELECT * FROM maintenance_orders WHERE id = $1`, [id]);
    return rows[0] || null;
  },

  async startOrder(id, { started_at }) {
    const { rows } = await pool.query(
      `UPDATE maintenance_orders
       SET status = 'EN_PROCESO',
           started_at = COALESCE($2, NOW()),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, started_at || null]
    );
    return rows[0] || null;
  },

  async cancelOrder(id, { reason }) {
    const { rows } = await pool.query(
      `UPDATE maintenance_orders
       SET status = 'CANCELADO',
           canceled_at = NOW(),
           updated_at = NOW(),
           description = CASE WHEN $2 IS NULL THEN description ELSE CONCAT(COALESCE(description,''), E'\nCANCELACIÓN: ', $2) END
       WHERE id = $1
       RETURNING *`,
      [id, reason || null]
    );
    return rows[0] || null;
  },

  /**
   * Completar mantenimiento:
   * - status COMPLETADO
   * - completed_at
   * - result_status => aplicarlo al equipo (resources o resources_fixed)
   * - used_parts, notes append a description
   * - Si queda en DISPONIBLE y notify_on_disponible = TRUE: avisa
   */
  async completeOrder(id, { result_status, used_parts, notes }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const cur = await client.query(`SELECT * FROM maintenance_orders WHERE id = $1 FOR UPDATE`, [id]);
      const mo = cur.rows[0];
      if (!mo) { const err = new Error('Orden no encontrada'); err.status = 404; throw err; }

      const mergedDesc = notes
        ? (mo.description ? `${mo.description}\n${notes}` : notes)
        : mo.description;

      const upd = await client.query(
        `UPDATE maintenance_orders
         SET status = 'COMPLETADO',
             completed_at = NOW(),
             updated_at = NOW(),
             used_parts = COALESCE($2, used_parts),
             description = $3,
             result_status = COALESCE($4, result_status)
         WHERE id = $1
         RETURNING *`,
        [id, used_parts || null, mergedDesc || null, result_status || null]
      );
      const done = upd.rows[0];

      // Aplicar estado al equipo si corresponde
      const newStatus = result_status || mo.result_status;
      if (newStatus) {
        if (mo.resource_id) {
          await client.query(`UPDATE resource SET status = $2, updated_at = NOW() WHERE id = $1`, [mo.resource_id, newStatus]);
        } else if (mo.fixed_id) {
          await client.query(`UPDATE resource_fixed SET status = $2 WHERE id = $1`, [mo.fixed_id, newStatus]);
        }
      }

      await client.query('COMMIT');

      // Notificar si volvió a DISPONIBLE
      if (done.notify_on_disponible && newStatus === 'DISPONIBLE' && done.resource_id) {
        await notifyIfDisponible({ lab_id: done.lab_id, resource_id: done.resource_id, title: 'Mantenimiento completado' });
      }

      return done;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },
};

module.exports = MaintenanceModel;

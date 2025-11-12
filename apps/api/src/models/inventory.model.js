// apps/api/src/models/inventory.model.js
const { pool } = require('../db/pool');

const InventoryModel = {
  // ====== CONSUMIBLES ======
  async listConsumables({ lab_id }) {
    const args = [];
    let where = '';
    if (lab_id) { args.push(lab_id); where = 'WHERE lab_id = $1'; }
    const { rows } = await pool.query(
      `SELECT id, lab_id, name, unit, reorder_point, qty_available
       FROM consumables
       ${where}
       ORDER BY name ASC`,
      args
    );
    return rows;
  },

  /**
   * Registra movimiento y actualiza stock de consumible.
   * type: 'IN' | 'OUT' | 'ADJUST'
   */
  async moveConsumable({ consumable_id, lab_id, user_id, type, qty, reason, notes }) {
    if (!consumable_id || !lab_id || !type) {
      const err = new Error('consumable_id, lab_id y type son obligatorios'); err.status = 400; throw err;
    }
    if (['IN','OUT','ADJUST'].indexOf(type) === -1) {
      const err = new Error('type inválido'); err.status = 400; throw err;
    }
    const q = Number(qty ?? 0);
    if ((type === 'IN' || type === 'OUT') && (!q || q <= 0)) {
      const err = new Error('qty > 0 es requerido para IN/OUT'); err.status = 400; throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Verificar consumible
      const cur = await client.query(`SELECT id, lab_id, qty_available FROM consumables WHERE id = $1`, [consumable_id]);
      if (!cur.rows.length) {
        const err = new Error('Consumible no encontrado'); err.status = 404; throw err;
      }
      const row = cur.rows[0];
      if (Number(row.lab_id) !== Number(lab_id)) {
        const err = new Error('consumable_id no pertenece al lab_id indicado'); err.status = 400; throw err;
      }

      let newQty = Number(row.qty_available);
      if (type === 'IN') newQty += q;
      else if (type === 'OUT') newQty -= q;
      else if (type === 'ADJUST') newQty = q; // ADJUST: qty es la nueva existencia absoluta

      if (newQty < 0) {
        const err = new Error('Stock insuficiente'); err.status = 400; throw err;
      }

      await client.query(
        `UPDATE consumables SET qty_available = $2 WHERE id = $1`,
        [consumable_id, newQty]
      );

      const mv = await client.query(
        `INSERT INTO inventory_movements (lab_id, user_id, consumable_id, type, qty, reason, notes)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         RETURNING *`,
        [lab_id, user_id || null, consumable_id, type, (type === 'ADJUST' ? null : q), reason || null, notes || null]
      );

      await client.query('COMMIT');
      return { movement: mv.rows[0], qty_available: newQty };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  // ====== EQUIPOS FIJOS ======
  /**
   * Cambio de estado/ubicación informativo (no modifica tablas externas salvo resources_fixed),
   * y registra un movimiento INFO en inventory_movements.
   */
  async updateFixedStatus({ fixed_id, lab_id, status, notes, reason, user_id }) {
    if (!fixed_id || !lab_id || !status) {
      const err = new Error('fixed_id, lab_id y status son obligatorios'); err.status = 400; throw err;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Validar fixed belong to lab
      const cur = await client.query(`SELECT id, lab_id FROM resource WHERE id = $1`, [fixed_id]);
      if (!cur.rows.length) {
        const err = new Error('Recurso fijo no encontrado'); err.status = 404; throw err;
      }
      const rf = cur.rows[0];
      if (Number(rf.lab_id) !== Number(lab_id)) {
        const err = new Error('fixed_id no pertenece al lab_id indicado'); err.status = 400; throw err;
      }

      // Actualizar estado en resources_fixed
      await client.query(
        `UPDATE resource_fixed SET status = $2 WHERE id = $1`,
        [fixed_id, status]
      );

      // Registrar movimiento informativo
      const mv = await client.query(
        `INSERT INTO inventory_movements (lab_id, user_id, fixed_id, type, qty, reason, notes)
         VALUES ($1,$2,$3,'INFO',NULL,$4,$5)
         RETURNING *`,
        [lab_id, user_id || null, fixed_id, reason || null, notes || null]
      );

      await client.query('COMMIT');
      return mv.rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async listMovements({ lab_id, fixed_id, consumable_id, limit = 100 }) {
    const args = [];
    const cond = [];
    if (lab_id) { args.push(lab_id); cond.push(`lab_id = $${args.length}`); }
    if (fixed_id) { args.push(fixed_id); cond.push(`fixed_id = $${args.length}`); }
    if (consumable_id) { args.push(consumable_id); cond.push(`consumable_id = $${args.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    args.push(limit);

    const { rows } = await pool.query(
      `SELECT *
       FROM inventory_movements
       ${where}
       ORDER BY created_at DESC
       LIMIT $${args.length}`,
      args
    );
    return rows;
  },
};

module.exports = InventoryModel;

// apps/api/src/models/control.model.js
const { pool } = require('../db/pool');

async function getRequestBasic(reqId) {
  const { rows } = await pool.query(
    `SELECT id, lab_id, requester_name, requester_email FROM requests WHERE id = $1`,
    [reqId]
  );
  return rows[0] || null;
}

const ControlModel = {
  // =========================
  // ASIGNACIONES (equipos)
  // =========================
  async assignItems(request_id, items = [], assigned_by) {
    // items: [{ resource_id?, fixed_id?, qty?, user_id?, due_at?, notes? }]
    if (!request_id || !Array.isArray(items) || !items.length) {
      const err = new Error('request_id e items son obligatorios'); err.status = 400; throw err;
    }
    const req = await getRequestBasic(request_id);
    if (!req) { const e = new Error('La solicitud no existe'); e.status = 404; throw e; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const created = [];

      for (const it of items) {
        const qty = Number(it.qty || 1);
        if (!it.resource_id && !it.fixed_id) {
          const e = new Error('Debe indicar resource_id o fixed_id'); e.status = 400; throw e;
        }
        if (it.resource_id && it.fixed_id) {
          const e = new Error('No puede asignar resource_id y fixed_id a la vez'); e.status = 400; throw e;
        }

        // Si es resource (catalogado con qty_available), validar stock
        if (it.resource_id) {
          const r = (await client.query(
            `SELECT id, qty_available FROM resources WHERE id = $1 AND lab_id = $2 FOR UPDATE`,
            [it.resource_id, req.lab_id]
          )).rows[0];
          if (!r) { const e = new Error(`resource_id ${it.resource_id} no existe o no pertenece al lab`); e.status = 400; throw e; }
          if (Number(r.qty_available) < qty) {
            const e = new Error(`Stock insuficiente: disponible ${r.qty_available}, solicitado ${qty}`);
            e.status = 400; throw e;
          }
          await client.query(
            `UPDATE resources SET qty_available = qty_available - $2 WHERE id = $1`,
            [it.resource_id, qty]
          );
        } else {
          // fixed_id: no tiene qty en tabla, solo registramos la asignación
          const f = (await client.query(
            `SELECT id FROM resources_fixed WHERE id = $1 AND lab_id = $2`,
            [it.fixed_id, req.lab_id]
          )).rows[0];
          if (!f) { const e = new Error(`fixed_id ${it.fixed_id} no existe o no pertenece al lab`); e.status = 400; throw e; }
        }

        const ins = await client.query(
          `INSERT INTO resource_assignments
            (request_id, lab_id, user_id, resource_id, fixed_id, qty, status, due_at, notes)
           VALUES ($1,$2,$3,$4,$5,$6,'ASIGNADO',$7,$8)
           RETURNING *`,
          [request_id, req.lab_id, it.user_id || null, it.resource_id || null, it.fixed_id || null, qty, it.due_at || null, it.notes || null]
        );
        created.push(ins.rows[0]);
      }

      // bitácora opcional
      await client.query(
        `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
         VALUES ('request', $1, $2, 'ASSIGN_ITEMS', $3)`,
        [request_id, assigned_by || null, JSON.stringify({ items })]
      );

      await client.query('COMMIT');
      return created;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
  },

  async listAssignmentsByRequest(request_id) {
    const { rows } = await pool.query(
      `SELECT a.*, r.name AS resource_name, f.name AS fixed_name
         FROM resource_assignments a
         LEFT JOIN resources r ON r.id = a.resource_id
         LEFT JOIN resources_fixed f ON f.id = a.fixed_id
       WHERE a.request_id = $1
       ORDER BY a.assigned_at DESC, a.id DESC`,
      [request_id]
    );
    return rows;
  },

  async returnAssignment(assignment_id, { returned_at, status, notes }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const a = (await client.query(
        `SELECT * FROM resource_assignments WHERE id = $1 FOR UPDATE`, [assignment_id]
      )).rows[0];
      if (!a) { const e = new Error('Assignment no encontrado'); e.status = 404; throw e; }
      if (a.status === 'DEVUELTO') { await client.query('COMMIT'); return a; }

      // Si es resource, devolver stock
      if (a.resource_id) {
        await client.query(
          `UPDATE resources SET qty_available = qty_available + $2 WHERE id = $1`,
          [a.resource_id, a.qty]
        );
      }

      const upd = await client.query(
        `UPDATE resource_assignments
            SET status = COALESCE($2,'DEVUELTO'),
                returned_at = COALESCE($3, NOW()),
                notes = COALESCE($4, notes)
         WHERE id = $1
         RETURNING *`,
        [assignment_id, status || 'DEVUELTO', returned_at || null, notes || null]
      );

      await client.query('COMMIT');
      return upd.rows[0];
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
  },

  // =========================
  // CONSUMOS (consumables)
  // =========================
  async registerConsumption(request_id, { consumable_id, qty, used_at, used_by, notes }) {
    if (!request_id || !consumable_id || !qty) {
      const e = new Error('request_id, consumable_id y qty son obligatorios'); e.status = 400; throw e;
    }
    const req = await getRequestBasic(request_id);
    if (!req) { const e = new Error('La solicitud no existe'); e.status = 404; throw e; }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const c = (await client.query(
        `SELECT id, qty_available FROM consumables WHERE id = $1 AND lab_id = $2 FOR UPDATE`,
        [consumable_id, req.lab_id]
      )).rows[0];
      if (!c) { const e = new Error('Consumible no existe o no pertenece al lab'); e.status = 400; throw e; }
      if (Number(c.qty_available) < Number(qty)) {
        const e = new Error(`Stock consumible insuficiente (disp. ${c.qty_available})`); e.status = 400; throw e;
      }

      await client.query(
        `UPDATE consumables SET qty_available = qty_available - $2 WHERE id = $1`,
        [consumable_id, qty]
      );

      const ins = await client.query(
        `INSERT INTO material_consumptions (request_id, lab_id, consumable_id, qty, used_at, used_by, notes)
         VALUES ($1,$2,$3,$4,COALESCE($5,NOW()),$6,$7)
         RETURNING *`,
        [request_id, req.lab_id, consumable_id, qty, used_at || null, used_by || null, notes || null]
      );

      await client.query('COMMIT');
      return ins.rows[0];
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally { client.release(); }
  },

  async listConsumptionsByRequest(request_id) {
    const { rows } = await pool.query(
      `SELECT mc.*, co.name AS consumable_name, co.unit
         FROM material_consumptions mc
         JOIN consumables co ON co.id = mc.consumable_id
       WHERE mc.request_id = $1
       ORDER BY mc.used_at DESC, mc.id DESC`,
      [request_id]
    );
    return rows;
  },

  // =========================
  // BENEFICIOS ACADÉMICOS
  // =========================
  async addBenefit(request_id, { user_id, hours, credits, certificate_url, notes }) {
    if (!request_id || !user_id) {
      const e = new Error('request_id y user_id son obligatorios'); e.status = 400; throw e;
    }
    const req = await getRequestBasic(request_id);
    if (!req) { const e = new Error('La solicitud no existe'); e.status = 404; throw e; }

    const { rows } = await pool.query(
      `INSERT INTO academic_benefits (request_id, lab_id, user_id, hours, credits, certificate_url, notes)
       VALUES ($1,$2,$3,$4,$5,$6,$7)
       RETURNING *`,
      [request_id, req.lab_id, user_id, hours || 0, credits || 0, certificate_url || null, notes || null]
    );
    return rows[0];
  },

  async listBenefitsByRequest(request_id) {
    const { rows } = await pool.query(
      `SELECT * FROM academic_benefits
        WHERE request_id = $1
        ORDER BY created_at DESC, id DESC`, [request_id]
    );
    return rows;
  },

  // =========================
  // REPORTES
  // =========================
  async reportUsage({ lab_id, from, to }) {
    // Equipos prestados/devueltos
    const a = (await pool.query(
      `SELECT
         'resources' AS kind,
         COALESCE(r.name, f.name, '(equipo)') AS item_name,
         SUM(a.qty)::numeric AS total_qty
       FROM resource_assignments a
       LEFT JOIN resources r ON r.id = a.resource_id
       LEFT JOIN resources_fixed f ON f.id = a.fixed_id
       WHERE a.lab_id = $1
         AND a.assigned_at >= $2
         AND a.assigned_at <= $3
       GROUP BY item_name
       ORDER BY total_qty DESC
       LIMIT 100`,
      [lab_id, from, to]
    )).rows;

    // Consumos de materiales
    const c = (await pool.query(
      `SELECT
         'consumables' AS kind,
         co.name AS item_name,
         SUM(mc.qty)::numeric AS total_qty
       FROM material_consumptions mc
       JOIN consumables co ON co.id = mc.consumable_id
       WHERE mc.lab_id = $1
         AND mc.used_at >= $2
         AND mc.used_at <= $3
       GROUP BY item_name
       ORDER BY total_qty DESC
       LIMIT 100`,
      [lab_id, from, to]
    )).rows;

    return { assignments: a, consumptions: c };
  }
};

module.exports = ControlModel;

// apps/api/src/models/tech.model.js
const { pool } = require('../db/pool');

const TechModel = {
  /**
   * Lista solicitudes APROBADAS (con items) filtrables por lab y fecha.
   * Opcional: overdue=true para marcar vencidas por rango (requested_to < now).
   */
  async listApprovedRequests({ lab_id, from, to, overdue }) {
    const args = [];
    const cond = [`r.status = 'APROBADA'`];
    if (lab_id) { args.push(lab_id); cond.push(`r.lab_id = $${args.length}`); }
    if (from)   { args.push(from);   cond.push(`r.requested_from >= $${args.length}`); }
    if (to)     { args.push(to);     cond.push(`r.requested_to   <= $${args.length}`); }

    const where = `WHERE ${cond.join(' AND ')}`;
    const { rows } = await pool.query(
      `
      SELECT
        r.*,
        COALESCE(
          json_agg(
            json_build_object(
              'id', i.id,
              'resource_id', i.resource_id,
              'qty', i.qty
            )
          ) FILTER (WHERE i.id IS NOT NULL),
          '[]'
        ) AS items,
        CASE
          WHEN $${args.length + 1}::bool = true AND r.requested_to < NOW() THEN true
          ELSE false
        END AS is_overdue
      FROM request r
      LEFT JOIN request_item i ON i.request_id = r.id
      ${where}
      GROUP BY r.id
      ORDER BY r.requested_from ASC
      `,
      [...args, !!overdue]
    );
    return rows;
  },

  /**
   * Pre-check antes de la entrega:
   * - solicitud aprobada
   * - requisitos_ok
   * - disponibilidad por cada item (resources.qty_available >= qty)
   */
  async precheckRequest(request_id) {
    // carga solicitud + items
    const reqQ = await pool.query(`SELECT * FROM request WHERE id = $1`, [request_id]);
    const req = reqQ.rows[0] || null;
    if (!req) return { exists: false };

    const itemsQ = await pool.query(
      `SELECT id, resource_id, qty FROM request_item WHERE request_id = $1 ORDER BY id ASC`,
      [request_id]
    );
    const items = itemsQ.rows;

    // validar disponibilidad
    const availability = [];
    for (const it of items) {
      if (!it.resource_id) {
        availability.push({ item_id: it.id, ok: true, reason: 'ESPACIO_LAB' });
        continue;
      }
      const rQ = await pool.query(
        `SELECT id, name, qty_available, status FROM resource WHERE id = $1`,
        [it.resource_id]
      );
      const r = rQ.rows[0] || null;
      if (!r) {
        availability.push({ item_id: it.id, ok: false, reason: 'RESOURCE_NOT_FOUND' });
        continue;
      }
      if (r.status === 'INACTIVO' || r.status === 'MANTENIMIENTO') {
        availability.push({ item_id: it.id, ok: false, reason: `STATUS_${r.status}` });
        continue;
      }
      const ok = Number(r.qty_available) >= Number(it.qty);
      availability.push({
        item_id: it.id,
        ok,
        reason: ok ? 'OK' : 'NO_STOCK',
        resource: { id: r.id, name: r.name, qty_available: r.qty_available }
      });
    }

    return {
      exists: true,
      request_ok: req.status === 'APROBADA',
      requirements_ok: !!req.requirements_ok,
      availability
    };
  },

  /**
   * Crear una ASIGNACIÓN (entrega). Soporta resource_id (catalogado) o fixed_id (equipo fijo).
   * - Debita qty_available en resource si aplica.
   * - Marca resource a 'RESERVADO' si aplica.
   */
  async createAssignment({
    request_id, lab_id, user_id, resource_id, fixed_id, qty = 1, due_at, notes, actor_user_id
  }) {
    if (!request_id || !lab_id) {
      const e = new Error('request_id y lab_id son requeridos'); e.status = 400; throw e;
    }
    if (!resource_id && !fixed_id) {
      const e = new Error('resource_id o fixed_id es requerido'); e.status = 400; throw e;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // verificar que solicitud esté aprobada
      const rq = await client.query(`SELECT status FROM request WHERE id = $1`, [request_id]);
      if (!rq.rows.length) { const e = new Error('Solicitud no existe'); e.status = 404; throw e; }
      if (rq.rows[0].status !== 'APROBADA') {
        const e = new Error('La solicitud no está APROBADA'); e.status = 409; throw e;
      }

      // recursos catalogados: verificar stock y debitar
      if (resource_id) {
        const rQ = await client.query(`SELECT id, qty_available, status FROM resource WHERE id = $1 FOR UPDATE`, [resource_id]);
        const r = rQ.rows[0];
        if (!r) { const e = new Error('Recurso no existe'); e.status = 404; throw e; }
        if (r.status === 'INACTIVO' || r.status === 'MANTENIMIENTO') {
          const e = new Error(`Recurso en estado ${r.status}`); e.status = 409; throw e;
        }
        const newQty = Number(r.qty_available) - Number(qty || 1);
        if (newQty < 0) { const e = new Error('Stock insuficiente'); e.status = 409; throw e; }
        await client.query(`UPDATE resource SET qty_available = $2, updated_at = NOW() WHERE id = $1`, [resource_id, newQty]);
      }

      // equipos fijos: marcar como reservado
      if (fixed_id) {
        const fQ = await client.query(`SELECT id, status FROM resource WHERE id = $1 FOR UPDATE`, [fixed_id]);
        const f = fQ.rows[0];
        if (!f) { const e = new Error('Equipo fijo no existe'); e.status = 404; throw e; }
        if (f.status === 'INACTIVO' || f.status === 'MANTENIMIENTO') {
          const e = new Error(`Equipo fijo en estado ${f.status}`); e.status = 409; throw e;
        }
        await client.query(`UPDATE resource_fixed SET status = 'RESERVADO' WHERE id = $1`, [fixed_id]);
      }

      // crear asignación
      const ins = await client.query(
        `INSERT INTO resource_assignments
         (request_id, lab_id, user_id, resource_id, fixed_id, qty, status, assigned_at, due_at, notes)
         VALUES ($1,$2,$3,$4,$5,$6,'ASIGNADO', NOW(), $7, $8)
         RETURNING *`,
        [request_id, lab_id, user_id || null, resource_id || null, fixed_id || null, qty || 1, due_at || null, notes || null]
      );
      const row = ins.rows[0];

      // historial del lab
      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [lab_id, actor_user_id || null, 'ASSIGN_RESOURCE', JSON.stringify(row)]
      );

      await client.query('COMMIT');
      return row;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  },

  /**
   * Devolución: pone assignment.status='DEVUELTO', repone stock o libera equipo fijo.
   * Si hay atraso (due_at && now > due_at) puedes notificar (opcional notify_user_id).
   */
  async returnAssignment(id, { notes, actor_user_id, notify_user_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const q = await client.query(`SELECT * FROM resource_assignments WHERE id = $1 FOR UPDATE`, [id]);
      const a = q.rows[0];
      if (!a) { const e = new Error('Asignación no existe'); e.status = 404; throw e; }
      if (a.status !== 'ASIGNADO') {
        const e = new Error('La asignación no está activa'); e.status = 409; throw e;
      }

      // reponer stock / liberar fijo
      if (a.resource_id) {
        const rQ = await client.query(`SELECT id, qty_available FROM resource WHERE id = $1 FOR UPDATE`, [a.resource_id]);
        if (rQ.rows.length) {
          const newQty = Number(rQ.rows[0].qty_available) + Number(a.qty || 1);
          await client.query(`UPDATE resource SET qty_available = $2, updated_at = NOW() WHERE id = $1`, [a.resource_id, newQty]);
        }
      }
      if (a.fixed_id) {
        await client.query(`UPDATE resource_fixed SET status = 'DISPONIBLE' WHERE id = $1`, [a.fixed_id]);
      }

      const upd = await client.query(
        `UPDATE resource_assignments
         SET status = 'DEVUELTO', returned_at = NOW(), notes = COALESCE($2, notes)
         WHERE id = $1
         RETURNING *`,
        [id, notes || null]
      );
      const row = upd.rows[0];

      // historial
      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [row.lab_id, actor_user_id || null, 'RETURN_RESOURCE', JSON.stringify(row)]
      );

      // notificación por atraso (opcional)
      if (notify_user_id && row.due_at && new Date(row.returned_at) > new Date(row.due_at)) {
        await client.query(
          `INSERT INTO notification (user_id, title, body, meta)
           VALUES ($1,$2,$3,$4)`,
          [
            Number(notify_user_id),
            'Devolución atrasada',
            'Un recurso fue devuelto después de la fecha prevista.',
            JSON.stringify({ assignment_id: row.id, request_id: row.request_id })
          ]
        );
      }

      await client.query('COMMIT');
      return row;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  },

  async markLost(id, { notes, actor_user_id, notify_user_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const q = await client.query(`SELECT * FROM resource_assignments WHERE id = $1 FOR UPDATE`, [id]);
      const a = q.rows[0];
      if (!a) { const e = new Error('Asignación no existe'); e.status = 404; throw e; }
      if (a.status !== 'ASIGNADO') {
        const e = new Error('La asignación no está activa'); e.status = 409; throw e;
      }

      // No reponemos stock; dejamos como es, pero podrías marcar resource como INACTIVO si aplica.
      const upd = await client.query(
        `UPDATE resource_assignments SET status = 'PERDIDO', notes = COALESCE($2, notes) WHERE id = $1 RETURNING *`,
        [id, notes || null]
      );
      const row = upd.rows[0];

      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [row.lab_id, actor_user_id || null, 'MARK_LOST', JSON.stringify(row)]
      );

      if (notify_user_id) {
        await client.query(
          `INSERT INTO notification (user_id, title, body, meta)
           VALUES ($1,$2,$3,$4)`,
          [
            Number(notify_user_id),
            'Recurso marcado como PERDIDO',
            'Se reportó pérdida de un recurso asignado.',
            JSON.stringify({ assignment_id: row.id, request_id: row.request_id })
          ]
        );
      }

      await client.query('COMMIT');
      return row;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  },

  async markDamaged(id, { notes, actor_user_id, notify_user_id }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const q = await client.query(`SELECT * FROM resource_assignments WHERE id = $1 FOR UPDATE`, [id]);
      const a = q.rows[0];
      if (!a) { const e = new Error('Asignación no existe'); e.status = 404; throw e; }
      if (a.status !== 'ASIGNADO') {
        const e = new Error('La asignación no está activa'); e.status = 409; throw e;
      }

      const upd = await client.query(
        `UPDATE resource_assignments SET status = 'DANADO', notes = COALESCE($2, notes) WHERE id = $1 RETURNING *`,
        [id, notes || null]
      );
      const row = upd.rows[0];

      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [row.lab_id, actor_user_id || null, 'MARK_DAMAGED', JSON.stringify(row)]
      );

      if (notify_user_id) {
        await client.query(
          `INSERT INTO notification (user_id, title, body, meta)
           VALUES ($1,$2,$3,$4)`,
          [
            Number(notify_user_id),
            'Recurso marcado como DAÑADO',
            'Se reportó daño en un recurso asignado.',
            JSON.stringify({ assignment_id: row.id, request_id: row.request_id })
          ]
        );
      }

      await client.query('COMMIT');
      return row;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  },

  async listAssignments({ request_id, lab_id }) {
    const args = [];
    const cond = [];
    if (request_id) { args.push(request_id); cond.push(`a.request_id = $${args.length}`); }
    if (lab_id)     { args.push(lab_id);     cond.push(`a.lab_id     = $${args.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `
      SELECT a.*,
             r.name AS resource_name,
             rf.name AS fixed_name
      FROM resource_assignments a
      LEFT JOIN resource r      ON r.id  = a.resource_id
      LEFT JOIN resource rf ON rf.id = a.fixed_id
      ${where}
      ORDER BY a.assigned_at DESC
      `,
      args
    );
    return rows;
  },
};

module.exports = TechModel;

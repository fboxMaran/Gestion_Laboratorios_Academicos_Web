// apps/api/src/models/requests.model.js
const { pool } = require('../db/pool');

/** Chequea políticas mínimas */
async function validatePolicies(lab_id, { headcount = 1 }) {
  // Si no hay políticas, se considera OK
  const pol = (await pool.query(`SELECT capacity_max, academic_requirements, safety_requirements
                                 FROM lab_policy WHERE lab_id = $1`, [lab_id])).rows[0] || null;

  let ok = true;
  let reasons = [];

  if (pol?.capacity_max && headcount > pol.capacity_max) {
    ok = false; reasons.push(`Capacidad máxima ${pol.capacity_max} superada (${headcount}).`);
  }
  // Aquí podrías hacer validaciones reales contra el perfil del usuario.
  // Por ahora, si existen requisitos de texto, marcamos como "se requiere validar".
  if (pol?.academic_requirements) reasons.push('Requisitos académicos definidos (validación requerida).');
  if (pol?.safety_requirements) reasons.push('Requisitos de seguridad definidos (validación requerida).');

  return { ok, reasons };
}

/** Chequea disponibilidad de calendario para lab y cada recurso */
async function verifyAvailability({ lab_id, items, from, to }) {
  // Conflictos a nivel de LAB (si algún slot del lab bloquea el uso general)
  const clashLab = (await pool.query(
    `SELECT id FROM calendar_slots
     WHERE lab_id = $1
       AND (status IN ('RESERVADO','MANTENIMIENTO','INACTIVO','BLOQUEADO','EXCLUSIVO'))
       AND starts_at < $3 AND ends_at > $2`,
    [lab_id, from, to]
  )).rows.length > 0;

  if (clashLab) {
    return { ok: false, reason: 'El laboratorio está no disponible en ese rango.' };
  }

  // Por cada recurso, validar que no haya reserva superpuesta
  for (const it of items) {
    if (!it.resource_id) continue; // item "solo espacio"
    const clashRes = (await pool.query(
      `SELECT id FROM calendar_slots
       WHERE resource_id = $1
         AND (status IN ('RESERVADO','MANTENIMIENTO','INACTIVO','BLOQUEADO','EXCLUSIVO'))
         AND starts_at < $3 AND ends_at > $2`,
      [it.resource_id, from, to]
    )).rows.length > 0;

    if (clashRes) {
      return { ok: false, reason: `Recurso ${it.resource_id} no disponible en ese rango.` };
    }
  }

  return { ok: true };
}

const RequestsModel = {
  async createRequest({
    lab_id,
    requester_name, requester_email, requester_role, requester_program,
    purpose, priority = 'NORMAL',
    requested_from, requested_to,
    items = [],         // [{resource_id?, qty}]
    headcount = 1       // para validar capacidad
  }) {
    // Validación de disponibilidad y políticas
    const policies = await validatePolicies(lab_id, { headcount });
    const availability = await verifyAvailability({
      lab_id, items, from: requested_from, to: requested_to
    });

    const requirements_ok = policies.ok && availability.ok;

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const { rows: reqRows } = await client.query(
        `INSERT INTO request
         (lab_id, requester_name, requester_email, requester_role, requester_program,
          purpose, priority, requested_from, requested_to, requirements_ok)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
         RETURNING *`,
        [
          lab_id, requester_name, requester_email, requester_role, requester_program || null,
          purpose, priority, requested_from, requested_to, requirements_ok
        ]
      );
      const request = reqRows[0];

      // Insertar ítems
      for (const it of items) {
        await client.query(
          `INSERT INTO request_item (request_id, resource_id, qty)
           VALUES ($1,$2,$3)`,
          [request.id, it.resource_id || null, it.qty || 1]
        );
      }

      // Historial de lab
      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [lab_id, null, 'REQUEST_CREATE', JSON.stringify({ request, items, policies, availability })]
      );

      await client.query('COMMIT');
      return { ...request, items, policies, availability };
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async list({ lab_id, from, to, type_id, status, requirements_ok }) {
    const args = [];
    const cond = [];
    if (lab_id) { args.push(lab_id); cond.push(`r.lab_id = $${args.length}`); }
    if (from)   { args.push(from);   cond.push(`r.requested_to >= $${args.length}`); }
    if (to)     { args.push(to);     cond.push(`r.requested_from <= $${args.length}`); }
    if (status) { args.push(status); cond.push(`r.status = $${args.length}`); }
    if (typeof requirements_ok === 'boolean') {
      args.push(requirements_ok); cond.push(`r.requirements_ok = $${args.length}`);
    }

    // Filtro por tipo de recurso (join a items -> resource -> resource_types)
    const joinType = type_id
      ? `JOIN request_item ri ON ri.request_id = r.id
         JOIN resource res ON res.id = ri.resource_id
         WHERE res.type_id = ${Number(type_id)}`
      : '';

    const where = cond.length
      ? `${joinType ? ' AND ' : ' WHERE '}${cond.join(' AND ')}`
      : (joinType ? '' : '');

    const { rows } = await pool.query(
      `
      SELECT r.*, 
             l.name as lab_name,
             u.full_name as requester_name,
             r.created_at as date_from,
             (SELECT res.name 
              FROM request_item ri 
              LEFT JOIN resource res ON res.id = ri.resource_id 
              WHERE ri.request_id = r.id 
              LIMIT 1) as resource_name
      FROM request r
      LEFT JOIN lab l ON l.id = r.lab_id
      LEFT JOIN app_user u ON u.id = r.requester_id
      ${joinType}
      ${where}
      ORDER BY r.created_at DESC
      `,
      args
    );
    return rows;
  },

  async get(id) {
    const req = (await pool.query(`SELECT * FROM request WHERE id = $1`, [id])).rows[0] || null;
    if (!req) return null;
    
    // Obtener información del laboratorio
    const labInfo = (await pool.query(
      `SELECT name FROM lab WHERE id = $1`, [req.lab_id]
    )).rows[0];
    
    const items = (await pool.query(
      `SELECT ri.*, res.name AS resource_name, res.type
       FROM request_item ri
       LEFT JOIN resource res ON res.id = ri.resource_id
       WHERE ri.request_id = $1
       ORDER BY ri.id ASC`, [id]
    )).rows;
    
    // Obtener mensajes a través de message_thread
    const msgs = (await pool.query(
      `SELECT m.* 
       FROM message m
       JOIN message_thread mt ON mt.id = m.thread_id
       WHERE mt.request_id = $1 
       ORDER BY m.created_at ASC`, [id]
    )).rows;
    
    return { ...req, items, messages: msgs, lab_name: labInfo?.name || null };
  },

  async _setStatus(id, { status, reviewer_id = null, reviewer_note = null }) {
    const { rows } = await pool.query(
      `UPDATE request
       SET status = $2, reviewer_id = $3, reviewer_note = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status, reviewer_id, reviewer_note]
    );
    return rows[0] || null;
  },

  async approve(id, { reviewer_id = null, reviewer_note = null }) {
    const req = await this.get(id);
    if (!req) return null;

    // Verificación final de disponibilidad inmediatamente antes de aprobar
    const okAvail = await verifyAvailability({
      lab_id: req.lab_id,
      items: req.items,
      from: req.requested_from,
      to: req.requested_to
    });
    if (!okAvail.ok) {
      const e = new Error(okAvail.reason || 'No disponible');
      e.status = 409; throw e;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Crear slots RESERVADO por cada item (y uno a nivel de LAB si no hay recursos)
      const baseSlot = {
        lab_id: req.lab_id,
        starts_at: req.requested_from,
        ends_at: req.requested_to,
        status: 'RESERVADO',
        title: `Reserva #${req.id}: ${req.purpose}`,
        reason: reviewer_note || null,
        created_by: reviewer_id || null
      };

      let hadResource = false;
      for (const it of req.items) {
        if (it.resource_id) {
          hadResource = true;
          await client.query(
            `INSERT INTO calendar_slots
             (lab_id, resource_id, starts_at, ends_at, status, title, reason, created_by)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
            [baseSlot.lab_id, it.resource_id, baseSlot.starts_at, baseSlot.ends_at,
             baseSlot.status, baseSlot.title, baseSlot.reason, baseSlot.created_by]
          );
        }
      }
      // Si no hubo recursos, bloquea el LAB en general
      if (!hadResource) {
        await client.query(
          `INSERT INTO calendar_slots
           (lab_id, starts_at, ends_at, status, title, reason, created_by)
           VALUES ($1,$2,$3,$4,$5,$6,$7)`,
          [baseSlot.lab_id, baseSlot.starts_at, baseSlot.ends_at,
           baseSlot.status, baseSlot.title, baseSlot.reason, baseSlot.created_by]
        );
      }

      const updated = await this._setStatus(id, { status: 'APROBADA', reviewer_id, reviewer_note });

      // Historial de lab
      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [req.lab_id, reviewer_id || null, 'REQUEST_APPROVE', JSON.stringify({ request_id: id, reviewer_note })]
      );

      await client.query('COMMIT');
      return updated;
    } catch (e) {
      await client.query('ROLLBACK'); throw e;
    } finally {
      client.release();
    }
  },

  async reject(id, { reviewer_id = null, reviewer_note = null }) {
    const req = await this._setStatus(id, { status: 'RECHAZADA', reviewer_id, reviewer_note });
    if (!req) return null;
    await pool.query(
      `INSERT INTO lab_history (lab_id, user_id, action, detail)
       VALUES ($1,$2,$3,$4)`,
      [req.lab_id, reviewer_id || null, 'REQUEST_REJECT', JSON.stringify({ request_id: id, reviewer_note })]
    );
    return req;
  },

  async needInfo(id, { reviewer_id = null, reviewer_note = null, message }) {
    const req = await this._setStatus(id, { status: 'NECESITA_INFO', reviewer_id, reviewer_note });
    if (!req) return null;

    if (message) {
      await pool.query(
        `INSERT INTO message (request_id, sender, message)
         VALUES ($1,'ENCARGADO',$2)`,
        [id, message]
      );
    }
    await pool.query(
      `INSERT INTO lab_history (lab_id, user_id, action, detail)
       VALUES ($1,$2,$3,$4)`,
      [req.lab_id, reviewer_id || null, 'REQUEST_NEED_INFO', JSON.stringify({ request_id: id, reviewer_note, message })]
    );
    return req;
  },

  async addMessage(id, { sender, message }) {
    const req = (await pool.query(`SELECT id FROM request WHERE id = $1`, [id])).rows[0] || null;
    if (!req) return null;
    const { rows } = await pool.query(
      `INSERT INTO message (request_id, sender, message)
       VALUES ($1,$2,$3) RETURNING *`,
      [id, sender, message]
    );
    return rows[0];
  },

  async cancel(id) {
    const req = await this.get(id);
    if (!req) return null;

    // Solo se pueden cancelar solicitudes PENDIENTE o EN_REVISION
    if (!['PENDIENTE', 'EN_REVISION', 'NECESITA_INFO'].includes(req.status)) {
      const e = new Error('Solo se pueden cancelar solicitudes pendientes');
      e.status = 400;
      throw e;
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Actualizar el estado de la solicitud
      const { rows } = await client.query(
        `UPDATE request
         SET status = 'CANCELADA', updated_at = NOW()
         WHERE id = $1
         RETURNING *`,
        [id]
      );

      // Registrar en el historial
      await client.query(
        `INSERT INTO lab_history (lab_id, user_id, action, detail)
         VALUES ($1,$2,$3,$4)`,
        [req.lab_id, req.requester_id, 'REQUEST_CANCEL', JSON.stringify({ request_id: id })]
      );

      await client.query('COMMIT');
      return rows[0];
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }
};

module.exports = RequestsModel;

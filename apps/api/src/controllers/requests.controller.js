// apps/api/src/controllers/requests.controller.js
const Requests = require('../models/requests.model');
const { pool } = require('../db/pool');               // ← usa tu pool real
const { requirementsOk } = require('../utils/requirements');
const { checkAvailability } = require('../utils/availability');
const { notifyRequestStatus } = require('../utils/notifications');

function userIdFrom(req) {
  return req.user?.id || req.auth?.user?.id || req.body?.user_id || null;
}

const RequestsController = {
  async list(req, res, next) {
    try {
      const { lab_id, from, to, type_id, status, requirements_ok } = req.query;
      const rows = await Requests.list({
        lab_id: lab_id ? Number(lab_id) : undefined,
        from,
        to,
        type_id: type_id ? Number(type_id) : undefined,
        status,
        requirements_ok:
          typeof requirements_ok === 'string' ? requirements_ok === 'true' : undefined,
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const r = await Requests.get(Number(req.params.id));
      if (!r) return res.status(404).json({ error: 'Request not found' });
      res.json(r);
    } catch (e) { next(e); }
  },

  async approve(req, res, next) {
    try {
      const r = await Requests.approve(Number(req.params.id), {
        reviewer_id: req.body.reviewer_id || null,
        reviewer_note: req.body.reviewer_note || null,
      });
      if (!r) return res.status(404).json({ error: 'Request not found' });
      res.json(r);
    } catch (e) {
      if (e.status) return res.status(e.status).json({ error: e.message });
      next(e);
    }
  },

  async reject(req, res, next) {
    try {
      const r = await Requests.reject(Number(req.params.id), {
        reviewer_id: req.body.reviewer_id || null,
        reviewer_note: req.body.reviewer_note || null,
      });
      if (!r) return res.status(404).json({ error: 'Request not found' });
      res.json(r);
    } catch (e) { next(e); }
  },

  async needInfo(req, res, next) {
    try {
      const r = await Requests.needInfo(Number(req.params.id), {
        reviewer_id: req.body.reviewer_id || null,
        reviewer_note: req.body.reviewer_note || null,
        message: req.body.message || null,
      });
      if (!r) return res.status(404).json({ error: 'Request not found' });
      res.json(r);
    } catch (e) { next(e); }
  },
};

// ---------- 3.3 Preview ----------
async function preview(req, res) {
  try {
    const { lab_id, items = [], from, to } = req.body;
    const uid = userIdFrom(req);
    if (!lab_id || !from || !to) return res.status(400).json({ error: 'Faltan campos' });

    const resourceIds = items.filter(i => i.resource_id).map(i => i.resource_id);

    const [avail, reqs] = await Promise.all([
      checkAvailability({ labId: lab_id, resourceIds, from, to }),
      uid ? requirementsOk({ labId: lab_id, userId: uid }) : Promise.resolve({ ok: true, missing: [] }),
    ]);

    res.json({
      availability_ok: avail.ok,
      availability_conflicts: avail.conflicts,
      requirements_ok: reqs.ok,
      missing_requirements: reqs.missing,
    });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error en preview' });
  }
}

// ---------- 3.3 Crear solicitud ----------
async function create(req, res) {
  const client = await pool.connect();
  try {
    const {
      lab_id, requested_from, requested_to, purpose, priority = 'NORMAL',
      items = [], requester_name, requester_email, requester_role, requester_program, user_id,
    } = req.body;

    const uid = user_id || userIdFrom(req);

    if (!lab_id || !requested_from || !requested_to || !purpose) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    if (!requester_name || !requester_email || !requester_role) {
      return res.status(400).json({ error: 'Datos del solicitante incompletos' });
    }

    const resourceIds = items.filter(i => i.resource_id).map(i => i.resource_id);

    const [avail, reqs] = await Promise.all([
      checkAvailability({ labId: lab_id, resourceIds, from: requested_from, to: requested_to }),
      uid ? requirementsOk({ labId: lab_id, userId: uid }) : Promise.resolve({ ok: true, missing: [] }),
    ]);

    await client.query('BEGIN');

    const ins = await client.query(
      `INSERT INTO requests
         (lab_id, requester_name, requester_email, requester_role, requester_program,
          purpose, priority, requested_from, requested_to, requirements_ok, status, user_id)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'PENDIENTE',$11)
       RETURNING *`,
      [lab_id, requester_name, requester_email, requester_role, requester_program || null,
       purpose, priority, requested_from, requested_to, reqs.ok, uid]
    );

    const requestId = ins.rows[0].id;

    for (const it of items) {
      await client.query(
        `INSERT INTO request_items (request_id, resource_id, qty)
         VALUES ($1, $2, $3)`,
        [requestId, it.resource_id || null, it.qty || 1]
      );
    }

    await client.query('COMMIT');

    res.status(201).json({
      request: ins.rows[0],
      validation: {
        availability_ok: avail.ok,
        availability_conflicts: avail.conflicts,
        requirements_ok: reqs.ok,
        missing_requirements: reqs.missing,
      },
    });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(e);
    res.status(500).json({ error: 'Error creando solicitud' });
  } finally {
    client.release();
  }
}

// ---------- 3.3 Cambiar estado ----------
async function setStatus(req, res) {
  const id = Number(req.params.id);
  const { status, reviewer_note } = req.body;
  if (!['APROBADA','RECHAZADA','NECESITA_INFO'].includes(status)) {
    return res.status(400).json({ error: 'Estado no permitido' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(`SELECT * FROM requests WHERE id=$1 FOR UPDATE`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no existe' });
    const r = rows[0];

    const up = await client.query(
      `UPDATE requests
          SET status=$2, reviewer_note=COALESCE($3, reviewer_note), updated_at=NOW()
        WHERE id=$1
        RETURNING *`,
      [id, status, reviewer_note || null]
    );

    if (status === 'APROBADA') {
      await client.query(
        `INSERT INTO calendar_slots
           (lab_id, starts_at, ends_at, status, title, reason, created_by)
         VALUES ($1,$2,$3,'RESERVADO',$4,$5,$6)`,
        [r.lab_id, r.requested_from, r.requested_to,
         `Reserva #${id}`, 'Reserva aprobada', req.user?.id || null]
      );
      const its = await client.query(`SELECT resource_id, qty FROM request_items WHERE request_id=$1`, [id]);
      for (const it of its.rows) {
        if (!it.resource_id) continue;
        await client.query(
          `INSERT INTO calendar_slots
             (lab_id, resource_id, starts_at, ends_at, status, title, reason, created_by)
           VALUES ($1,$2,$3,$4,'RESERVADO',$5,$6,$7)`,
          [r.lab_id, it.resource_id, r.requested_from, r.requested_to,
           `Reserva #${id}`, 'Recurso reservado', req.user?.id || null]
        );
      }
    }

    await client.query('COMMIT');
    await notifyRequestStatus({ requestId: id });

    res.json(up.rows[0]);
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    console.error(e);
    res.status(500).json({ error: 'Error al cambiar estado' });
  } finally {
    client.release();
  }
}

// ---------- 3.3 Cancelar ----------
async function cancel(req, res) {
  const id = Number(req.params.id);
  const uid = userIdFrom(req);
  try {
    const { rows } = await pool.query(`SELECT * FROM requests WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no existe' });
    const r = rows[0];
    if (r.user_id && uid && r.user_id !== uid) {
      return res.status(403).json({ error: 'No puede cancelar esta solicitud' });
    }
    if (r.status !== 'PENDIENTE') {
      return res.status(400).json({ error: 'Solo se puede cancelar si está PENDIENTE' });
    }
    if (new Date(r.requested_from) <= new Date()) {
      return res.status(400).json({ error: 'La reserva ya inició o está por iniciar' });
    }

    const up = await pool.query(
      `UPDATE requests SET status='CANCELADA', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );

    await notifyRequestStatus({ requestId: id });

    res.json(up.rows[0]);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Error al cancelar' });
  }
}

// ---------- 3.5 Mensajería ----------
async function listMessages(req, res) {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `SELECT id, sender, message, created_at
       FROM request_messages
      WHERE request_id=$1
      ORDER BY created_at ASC`,
    [id]
  );
  res.json(rows);
}

async function addMessage(req, res) {
  const id = Number(req.params.id);
  const { sender, message } = req.body || {};
  if (!['USUARIO','ENCARGADO'].includes(sender) || !message?.trim()) {
    return res.status(400).json({ error: 'Datos inválidos' });
  }
  const { rows } = await pool.query(
    `INSERT INTO request_messages (request_id, sender, message)
     VALUES ($1,$2,$3) RETURNING *`,
    [id, sender, message.trim()]
  );
  res.status(201).json(rows[0]);
}

module.exports = {
  ...RequestsController,
  preview,
  create,
  setStatus,
  cancel,
  listMessages,
  addMessage,
};

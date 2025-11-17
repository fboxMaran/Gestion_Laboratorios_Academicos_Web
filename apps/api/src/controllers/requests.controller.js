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

    // Validar fechas
    const startDate = new Date(from);
    const endDate = new Date(to);
    const now = new Date();

    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }

    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (startDate < fiveMinutesAgo) {
      return res.status(400).json({ error: 'No se pueden crear solicitudes con fechas pasadas' });
    }

    if (startDate >= endDate) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

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
      lab_id, purpose, items = [], requester_role, user_id,
      starts_at, ends_at, reason
    } = req.body;

    const uid = user_id || userIdFrom(req);

    if (!lab_id || !purpose) {
      return res.status(400).json({ error: 'Campos obligatorios faltantes' });
    }
    if (!requester_role) {
      return res.status(400).json({ error: 'Datos del solicitante incompletos' });
    }
    if (!starts_at || !ends_at) {
      return res.status(400).json({ error: 'Las fechas de inicio y fin son obligatorias' });
    }

    // Validar formato y lógica de fechas
    const startDate = new Date(starts_at);
    const endDate = new Date(ends_at);
    const now = new Date();

    // Validación: fechas válidas
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
      return res.status(400).json({ error: 'Formato de fecha inválido' });
    }

    // Validación: no permitir fechas en el pasado (con margen de 5 minutos)
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
    if (startDate < fiveMinutesAgo) {
      return res.status(400).json({ error: 'No se pueden crear solicitudes con fechas pasadas' });
    }

    // Validación: fecha de inicio debe ser antes que fecha de fin
    if (startDate >= endDate) {
      return res.status(400).json({ error: 'La fecha de inicio debe ser anterior a la fecha de fin' });
    }

    // Validación: duración máxima de 30 días (720 horas)
    const durationHours = (endDate - startDate) / (1000 * 60 * 60);
    if (durationHours > 720) {
      return res.status(400).json({ error: 'La duración máxima de una reserva es de 30 días' });
    }

    // Validación: duración mínima de 30 minutos
    if (durationHours < 0.5) {
      return res.status(400).json({ error: 'La duración mínima de una reserva es de 30 minutos' });
    }

    const resourceIds = items.filter(i => i.resource_id).map(i => i.resource_id);

    // Validación: verificar que el laboratorio existe y está activo
    const labCheck = await pool.query(
      `SELECT id, name, is_active FROM lab WHERE id = $1`,
      [lab_id]
    );
    if (labCheck.rows.length === 0) {
      return res.status(404).json({ error: 'El laboratorio especificado no existe' });
    }
    if (!labCheck.rows[0].is_active) {
      return res.status(400).json({ error: 'El laboratorio no está activo actualmente' });
    }

    // Validación: verificar que los recursos existen y están disponibles
    if (resourceIds.length > 0) {
      const resourceCheck = await pool.query(
        `SELECT id, name, state FROM resource WHERE id = ANY($1)`,
        [resourceIds]
      );
      if (resourceCheck.rows.length !== resourceIds.length) {
        return res.status(404).json({ error: 'Uno o más recursos especificados no existen' });
      }
      const unavailableResources = resourceCheck.rows.filter(r => r.state !== 'DISPONIBLE');
      if (unavailableResources.length > 0) {
        return res.status(400).json({ 
          error: 'Uno o más recursos no están disponibles',
          unavailable: unavailableResources.map(r => ({ id: r.id, name: r.name, state: r.state }))
        });
      }
    }

    // Si hay fechas, verificar disponibilidad
    let avail = { ok: true, conflicts: [] };
    if (starts_at && ends_at) {
      avail = await checkAvailability({ 
        labId: lab_id, 
        resourceIds, 
        from: starts_at, 
        to: ends_at 
      });
    }

    const reqs = uid ? 
      await requirementsOk({ labId: lab_id, userId: uid }) : 
      { ok: true, missing: [] };

    // Si hay conflictos de disponibilidad, rechazar la creación
    if (!avail.ok && avail.conflicts.length > 0) {
      return res.status(409).json({ 
        error: 'Conflicto de disponibilidad. El laboratorio o recursos solicitados no están disponibles en el horario especificado.',
        conflicts: avail.conflicts,
        availability_ok: false
      });
    }

    await client.query('BEGIN');

    // Crear la solicitud
    const ins = await client.query(
      `INSERT INTO request
         (requester_id, role_snapshot, lab_id, objective, requirements_ok, status)
       VALUES ($1, $2, $3, $4, $5, 'PENDIENTE')
       RETURNING *`,
      [uid, requester_role, lab_id, purpose, reqs.ok]
    );

    const requestId = ins.rows[0].id;

    // Agregar items a la solicitud
    for (const it of items) {
      // Obtener el tipo del recurso
      let itemType = 'LAB_SPACE'; // Por defecto si no hay resource_id
      if (it.resource_id) {
        const resType = await client.query(
          `SELECT type FROM resource WHERE id = $1`,
          [it.resource_id]
        );
        if (resType.rows.length > 0) {
          itemType = resType.rows[0].type;
        }
      }

      await client.query(
        `INSERT INTO request_item (request_id, resource_id, type, qty, use_start, use_end)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [requestId, it.resource_id || null, itemType, it.qty || 1, starts_at, ends_at]
      );
    }

    // Si hay fechas, crear calendar_slot para reservar
    if (starts_at && ends_at) {
      // Reservar el laboratorio
      await client.query(
        `INSERT INTO calendar_slot 
          (lab_id, resource_id, starts_at, ends_at, status, reason, created_by)
         VALUES ($1, NULL, $2, $3, 'RESERVADO', $4, $5)`,
        [lab_id, starts_at, ends_at, reason || purpose, uid]
      );

      // Reservar cada recurso
      for (const it of items) {
        if (it.resource_id) {
          await client.query(
            `INSERT INTO calendar_slot 
              (lab_id, resource_id, starts_at, ends_at, status, reason, created_by)
             VALUES ($1, $2, $3, $4, 'RESERVADO', $5, $6)`,
            [lab_id, it.resource_id, starts_at, ends_at, reason || purpose, uid]
          );
        }
      }
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

    const { rows } = await client.query(`SELECT * FROM request WHERE id=$1 FOR UPDATE`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no existe' });
    const r = rows[0];

    const up = await client.query(
      `UPDATE request
          SET status=$2, reviewer_note=COALESCE($3, reviewer_note), updated_at=NOW()
        WHERE id=$1
        RETURNING *`,
      [id, status, reviewer_note || null]
    );

    if (status === 'APROBADA') {
      await client.query(
        `INSERT INTO calendar_slot
           (lab_id, starts_at, ends_at, status, title, reason, created_by)
         VALUES ($1,$2,$3,'RESERVADO',$4,$5,$6)`,
        [r.lab_id, r.requested_from, r.requested_to,
         `Reserva #${id}`, 'Reserva aprobada', req.user?.id || null]
      );
      const its = await client.query(`SELECT resource_id, qty FROM request_item WHERE request_id=$1`, [id]);
      for (const it of its.rows) {
        if (!it.resource_id) continue;
        await client.query(
          `INSERT INTO calendar_slot
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
    const { rows } = await pool.query(`SELECT * FROM request WHERE id=$1`, [id]);
    if (!rows.length) return res.status(404).json({ error: 'Solicitud no existe' });
    const r = rows[0];
    
    // Verificar que el usuario sea el dueño de la solicitud
    if (r.requester_id && uid && r.requester_id !== uid) {
      return res.status(403).json({ error: 'No puede cancelar esta solicitud' });
    }
    
    // Solo se pueden cancelar solicitudes PENDIENTE, EN_REVISION o NECESITA_INFO
    if (!['PENDIENTE', 'EN_REVISION', 'NECESITA_INFO'].includes(r.status)) {
      return res.status(400).json({ error: 'Solo se pueden cancelar solicitudes pendientes' });
    }

    const up = await pool.query(
      `UPDATE request SET status='CANCELADA', updated_at=NOW() WHERE id=$1 RETURNING *`,
      [id]
    );

    // Registrar en historial
    await pool.query(
      `INSERT INTO lab_history (lab_id, actor_user_id, action_type, detail)
       VALUES ($1, $2, $3, $4)`,
      [r.lab_id, uid, 'REQUEST_CANCEL', JSON.stringify({ request_id: id })]
    );

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
       FROM message
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
    `INSERT INTO message (request_id, sender, message)
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

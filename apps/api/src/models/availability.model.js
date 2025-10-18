const { pool } = require('../db/pool');

async function enqueueNotifications({ lab_id, resource_id, title }) {
  // Busca subscripciones al laboratorio o al recurso para trigger DISPONIBLE
  const params = [];
  let where = `trigger_status = 'DISPONIBLE' AND (`;
  if (resource_id) { params.push(resource_id); where += `resource_id = $${params.length} OR `; }
  params.push(lab_id); where += `lab_id = $${params.length})`;

  const subs = (await pool.query(`SELECT * FROM availability_subscriptions WHERE ${where}`, params)).rows;
  if (!subs.length) return;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const s of subs) {
      await client.query(
        `INSERT INTO notifications (user_id, title, body, meta)
         VALUES ($1,$2,$3,$4)`,
        [s.user_id, 'Recurso disponible',
         title || 'Un recurso/espacio pasó a DISPONIBLE',
         JSON.stringify({ lab_id, resource_id })]
      );
    }
    await client.query('COMMIT');
  } catch (e) {
    await client.query('ROLLBACK'); throw e;
  } finally { client.release(); }
}

const AvailabilityModel = {
  // Slots
  async createSlot(payload) {
    const { lab_id, resource_id, starts_at, ends_at, status, title, reason, created_by } = payload;
    const { rows } = await pool.query(
      `INSERT INTO calendar_slots (lab_id, resource_id, starts_at, ends_at, status, title, reason, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING *`,
      [lab_id, resource_id || null, starts_at, ends_at, status, title || null, reason || null, created_by || null]
    );
    const slot = rows[0];
    await pool.query(
      `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
       VALUES ('slot',$1,$2,'CREATE', $3)`,
      [slot.id, created_by || null, JSON.stringify(slot)]
    );
    return slot;
  },

  async listSlots({ lab_id, resource_id, from, to }) {
    const params = [];
    const cond = [];
    if (lab_id) { params.push(lab_id); cond.push(`lab_id = $${params.length}`); }
    if (resource_id) { params.push(resource_id); cond.push(`resource_id = $${params.length}`); }
    if (from) { params.push(from); cond.push(`ends_at >= $${params.length}`); }
    if (to)   { params.push(to);   cond.push(`starts_at <= $${params.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT * FROM calendar_slots ${where} ORDER BY starts_at ASC`,
      params
    );
    return rows;
  },

  async updateSlotStatus(id, { status, user_id }) {
    const { rows } = await pool.query(
      `UPDATE calendar_slots
       SET status = $2, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, status]
    );
    const slot = rows[0] || null;
    if (!slot) return null;

    await pool.query(
      `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
       VALUES ('slot',$1,$2,'STATUS_CHANGE',$3)`,
      [id, user_id || null, JSON.stringify({ status })]
    );

    // Si pasó a DISPONIBLE, encola notificaciones
    if (status === 'DISPONIBLE') {
      await enqueueNotifications({
        lab_id: slot.lab_id, resource_id: slot.resource_id, title: slot.title
      });
    }
    return slot;
  },

  async deleteSlot(id, user_id) {
    const { rows } = await pool.query(`DELETE FROM calendar_slots WHERE id = $1 RETURNING *`, [id]);
    const slot = rows[0] || null;
    if (slot) {
      await pool.query(
        `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
         VALUES ('slot',$1,$2,'DELETE',$3)`,
        [id, user_id || null, JSON.stringify(slot)]
      );
    }
    return !!slot;
  },

  // Subscriptions
  async subscribe(payload) {
    const { user_id, lab_id, resource_id } = payload;
    const { rows } = await pool.query(
      `INSERT INTO availability_subscriptions (user_id, lab_id, resource_id)
       VALUES ($1,$2,$3) RETURNING *`,
      [user_id, lab_id || null, resource_id || null]
    );
    return rows[0];
  },
  async listSubscriptions({ user_id }) {
    const { rows } = await pool.query(
      `SELECT * FROM availability_subscriptions WHERE user_id = $1 ORDER BY created_at DESC`,
      [user_id]
    );
    return rows;
  },

  // Changelog
  async listChangelog({ entity_type, entity_id }) {
    const params = [entity_type, entity_id];
    const { rows } = await pool.query(
      `SELECT * FROM changelog WHERE entity_type = $1 AND entity_id = $2 ORDER BY created_at DESC`,
      params
    );
    return rows;
  }
};

module.exports = AvailabilityModel;

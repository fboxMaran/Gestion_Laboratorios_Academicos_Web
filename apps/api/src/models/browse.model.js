const { pool } = require('../db/pool');

/**
 * Elegibilidad simple: usuario debe cumplir TODOS los trainings requeridos por el lab y que no estén vencidos.
 * Reutilizamos consultas similares a UsersModel.labRequirements.
 */
async function userEligibleForLab(lab_id, user_id) {
  const reqQ = await pool.query(
    `SELECT training_id FROM lab_training_requirements WHERE lab_id = $1`, [lab_id]
  );
  const reqIds = reqQ.rows.map(r => r.training_id);
  if (!reqIds.length) return true;

  const mineQ = await pool.query(
    `SELECT training_id, expires_at FROM user_trainings WHERE user_id = $1 AND training_id = ANY($2::int[])`,
    [user_id, reqIds]
  );
  const have = new Map(mineQ.rows.map(r => [r.training_id, r]));
  return reqIds.every(tid => {
    const r = have.get(tid);
    if (!r) return false;
    if (r.expires_at && new Date(r.expires_at) <= new Date()) return false;
    return true;
  });
}

const BrowseModel = {
  /**
   * Buscar LABS por criterios básicos y marcar elegibilidad del usuario.
   */
  async searchLabs({ q, location, user_id }) {
    const args = []; const cond = [];
    if (q) { args.push(`%${q.toLowerCase()}%`); cond.push(`(LOWER(l.name) LIKE $${args.length} OR LOWER(l.description) LIKE $${args.length})`); }
    if (location) { args.push(`%${location.toLowerCase()}%`); cond.push(`LOWER(l.location) LIKE $${args.length}`); }
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';
    const { rows } = await pool.query(
      `SELECT l.id, l.name, l.code, l.location, l.description
         FROM labs l
         ${where}
         ORDER BY l.name ASC
         LIMIT 100`,
      args
    );
    if (!user_id) return rows.map(r => ({ ...r, eligible: true }));
    const withEl = [];
    for (const r of rows) {
      const eligible = await userEligibleForLab(r.id, user_id);
      withEl.push({ ...r, eligible });
    }
    return withEl;
  },

  /**
   * Buscar RESOURCES con filtros; incluir "next_available_slot" (si hay) dentro de ventana dada.
   * status: filtramos por DISPONIBLE por defecto, a menos que show_all=true.
   */
  async searchResources({ lab_id, type_id, q, date_from, date_to, show_all = false, user_id, only_eligible = true }) {
    const args = []; const cond = [];
    if (lab_id) { args.push(lab_id); cond.push(`r.lab_id = $${args.length}`); }
    if (type_id) { args.push(type_id); cond.push(`r.type_id = $${args.length}`); }
    if (q) { args.push(`%${q.toLowerCase()}%`); cond.push(`(LOWER(r.name) LIKE $${args.length} OR LOWER(COALESCE(r.description,'')) LIKE $${args.length})`); }
    if (!show_all) cond.push(`r.status = 'DISPONIBLE'`);
    const where = cond.length ? `WHERE ${cond.join(' AND ')}` : '';

    const base = await pool.query(
      `SELECT r.id, r.lab_id, r.type_id, r.name, r.description, r.status, r.qty_available
         FROM resources r
         ${where}
         ORDER BY r.name ASC
         LIMIT 200`,
      args
    );

    // next_available_slot (dentro de ventana)
    let slotsArgs = []; let slotsWhere = [`status='DISPONIBLE'`];
    if (date_from) { slotsArgs.push(date_from); slotsWhere.push(`starts_at >= $${slotsArgs.length}`); }
    if (date_to)   { slotsArgs.push(date_to);   slotsWhere.push(`ends_at   <= $${slotsArgs.length}`); }
    const slotWhereSql = slotsWhere.length ? `WHERE ${slotsWhere.join(' AND ')}` : '';

    const byId = new Map();
    for (const r of base.rows) byId.set(r.id, r);

    if (byId.size) {
      const ids = Array.from(byId.keys());
      const { rows: slots } = await pool.query(
        `SELECT resource_id, MIN(starts_at) AS next_start, MIN(ends_at) FILTER (WHERE starts_at = MIN(starts_at)) AS next_end
           FROM calendar_slots
          ${slotWhereSql} AND resource_id = ANY($${slotsArgs.length+1}::int[])
          GROUP BY resource_id`,
        [...slotsArgs, ids]
      );
      for (const s of slots) {
        const r = byId.get(s.resource_id);
        if (r) r.next_available_slot = s.next_start ? { starts_at: s.next_start, ends_at: s.next_end } : null;
      }
    }

    // elegibilidad por lab
    if (user_id && only_eligible) {
      const eligibleCache = new Map(); // lab_id -> bool
      const out = [];
      for (const r of byId.values()) {
        let ok = eligibleCache.get(r.lab_id);
        if (ok === undefined) {
          ok = await userEligibleForLab(r.lab_id, user_id);
          eligibleCache.set(r.lab_id, ok);
        }
        if (ok) out.push({ ...r, eligible: true });
      }
      return out;
    }

    return Array.from(byId.values()).map(r => ({ ...r, eligible: user_id ? true : undefined }));
  },

  /**
   * Calendario simple por lab/recurso y rango (semana/mes lo maneja el front).
   */
  async calendar({ lab_id, resource_id, date_from, date_to }) {
    if (!lab_id) { const e = new Error('lab_id requerido'); e.status=400; throw e; }
    const args = [lab_id]; const cond = [`lab_id = $1`];
    if (resource_id) { args.push(resource_id); cond.push(`resource_id = $${args.length}`); }
    if (date_from)   { args.push(date_from);   cond.push(`starts_at >= $${args.length}`); }
    if (date_to)     { args.push(date_to);     cond.push(`ends_at   <= $${args.length}`); }
    const where = `WHERE ${cond.join(' AND ')}`;

    const { rows } = await pool.query(
      `SELECT id, lab_id, resource_id, starts_at, ends_at, status, title, reason
         FROM calendar_slots
         ${where}
         ORDER BY starts_at ASC`,
      args
    );
    return rows;
  },
};

module.exports = BrowseModel;

const { pool } = require('../db/pool');
const bcrypt = require('bcryptjs');

const ALLOWED = (process.env.ALLOWED_EMAIL_DOMAINS || 'estudiantec.cr,itcr.ac.cr,tec.ac.cr')
  .split(',').map(s => s.trim()).filter(Boolean);

function emailDomainOk(email) {
  const m = String(email || '').toLowerCase().match(/@([^@]+)$/);
  if (!m) return false;
  const dom = m[1];
  return ALLOWED.some(d => dom.endsWith(d));
}
function actorId(req) { return req.user?.id || req.auth?.user?.id || null; }
async function logChange({ entity_type, entity_id, user_id, action, detail }) {
  try {
    await pool.query(
      `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [entity_type, entity_id, user_id || null, action, detail ? JSON.stringify(detail) : null]
    );
  } catch { /* noop */ }
}

exports.list = async (req, res) => {
  const { q, role, active, limit = 50, offset = 0 } = req.query;
  const params = [];
  const where = [];

  if (q) {
    params.push(`%${q.toLowerCase()}%`);
    where.push(`(LOWER(full_name) LIKE $${params.length} OR LOWER(email) LIKE $${params.length})`);
  }
  if (role) {
    params.push(role);
    where.push(`role = $${params.length}`);
  }
  if (typeof active !== 'undefined') {
    params.push(String(active) === 'true');
    where.push(`is_active = $${params.length}`);
  }
  params.push(Number(limit)); const limIdx = params.length;
  params.push(Number(offset)); const offIdx = params.length;

  const sql = `
    SELECT id, role, email, full_name, student_id, teacher_code,
           program_department, phone, is_active, created_at, updated_at
      FROM users
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC
     LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
};

exports.get = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `SELECT id, role, email, full_name, student_id, teacher_code,
            program_department, phone, is_active, created_at, updated_at
       FROM users WHERE id=$1`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  try {
    const { role, email, password, full_name, student_id, teacher_code, program_department, phone } = req.body || {};
    if (!role || !email || !password || !full_name) {
      return res.status(400).json({ error: 'role, email, password y full_name son obligatorios' });
    }
    if (!emailDomainOk(email)) {
      return res.status(400).json({ error: 'Correo debe ser institucional' });
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (role, email, password_hash, full_name, student_id, teacher_code, program_department, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, role, email, full_name, student_id, teacher_code, program_department, phone, is_active, created_at`,
      [role, String(email).toLowerCase(), hash, full_name, student_id || null, teacher_code || null, program_department || null, phone || null]
    );
    await logChange({ entity_type: 'user', entity_id: rows[0].id, user_id: actorId(req), action: 'CREATE', detail: { role, email } });
    res.status(201).json(rows[0]);
  } catch (e) {
    if (e.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    throw e;
  }
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  const allowed = ['full_name','student_id','teacher_code','program_department','phone','is_active'];
  const sets = [];
  const params = [];
  allowed.forEach((k) => {
    if (Object.prototype.hasOwnProperty.call(payload, k)) {
      params.push(payload[k]);
      sets.push(`${k} = $${params.length}`);
    }
  });
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });

  params.push(id);

  const { rows } = await pool.query(
    `UPDATE users SET ${sets.join(', ')}, updated_at=NOW() WHERE id=$${params.length} RETURNING id, role, email, full_name, student_id, teacher_code, program_department, phone, is_active, updated_at`,
    params
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'UPDATE', detail: payload });
  res.json(rows[0]);
};

exports.setRole = async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  if (!['ESTUDIANTE','DOCENTE','TECNICO','ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const { rows } = await pool.query(
    `UPDATE users SET role=$1, updated_at=NOW() WHERE id=$2
     RETURNING id, role, email, full_name, is_active, updated_at`,
    [role, id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'SET_ROLE', detail: { role } });
  res.json(rows[0]);
};

exports.activate = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET is_active=true, updated_at=NOW() WHERE id=$1
     RETURNING id, role, email, full_name, is_active, updated_at`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'ACTIVATE' });
  res.json(rows[0]);
};

exports.deactivate = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `UPDATE users SET is_active=false, updated_at=NOW() WHERE id=$1
     RETURNING id, role, email, full_name, is_active, updated_at`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'DEACTIVATE' });
  res.json(rows[0]);
};

exports.rolesList = async (_req, res) => {
  const roles = ['ADMIN','TECNICO','DOCENTE','ESTUDIANTE'];
  const { rows } = await pool.query(
    `SELECT role, array_agg(permission ORDER BY permission) AS permissions
       FROM role_permissions
      GROUP BY role`
  );
  // devolver todos los roles aunque no tengan permisos seteados todavía
  const map = new Map(rows.map(r => [r.role, r.permissions]));
  const result = roles.map(r => ({ role: r, permissions: map.get(r) || [] }));
  res.json(result);
};

exports.setRolePermissions = async (req, res) => {
  const role = String(req.params.role || '').toUpperCase();
  if (!['ESTUDIANTE','DOCENTE','TECNICO','ADMIN'].includes(role)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const { permissions } = req.body || {};
  if (!Array.isArray(permissions)) {
    return res.status(400).json({ error: 'permissions debe ser array de strings' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    await client.query(`DELETE FROM role_permissions WHERE role=$1`, [role]);
    for (const p of permissions) {
      if (!p || typeof p !== 'string') continue;
      await client.query(
        `INSERT INTO role_permissions (role, permission) VALUES ($1,$2)`,
        [role, p]
      );
    }
    await client.query('COMMIT');

    await logChange({ entity_type: 'role', entity_id: 0, user_id: actorId(req), action: 'SET_PERMISSIONS', detail: { role, permissions } });

    const { rows } = await pool.query(
      `SELECT role, array_agg(permission ORDER BY permission) AS permissions
         FROM role_permissions
        WHERE role=$1
        GROUP BY role`, [role]
    );
    res.json(rows[0] || { role, permissions: [] });
  } catch (e) {
    try { await client.query('ROLLBACK'); } catch {}
    throw e;
  } finally {
    client.release();
  }
};

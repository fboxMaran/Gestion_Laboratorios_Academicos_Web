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
    SELECT u.id, r.name as role, u.email, u.full_name, 
           u.id_code as student_id, u.id_code as teacher_code,
           u.career_or_dept as program_department, u.phone, 
           u.is_active, u.created_at, u.updated_at
      FROM app_user u
      LEFT JOIN role r ON u.role_id = r.id
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY u.created_at DESC
     LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const { rows } = await pool.query(sql, params);
  res.json(rows);
};

exports.get = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `SELECT u.id, r.name as role, u.email, u.full_name, 
            u.id_code as student_id, u.id_code as teacher_code,
            u.career_or_dept as program_department, u.phone, 
            u.is_active, u.created_at, u.updated_at
       FROM app_user u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.id=$1`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  res.json(rows[0]);
};

exports.create = async (req, res) => {
  const client = await pool.connect();
  try {
    const { role, email, password, full_name, student_id, teacher_code, program_department, phone } = req.body || {};
    if (!role || !email || !password || !full_name) {
      return res.status(400).json({ error: 'role, email, password y full_name son obligatorios' });
    }
    if (!emailDomainOk(email)) {
      return res.status(400).json({ error: 'Correo debe ser institucional' });
    }
    
    await client.query('BEGIN');
    
    // Obtener role_id
    const roleQuery = await client.query('SELECT id FROM role WHERE name = $1', [role]);
    const role_id = roleQuery.rows[0]?.id || 1;
    
    const hash = await bcrypt.hash(password, 10);
    
    // Insertar en app_user
    const userResult = await client.query(
      `INSERT INTO app_user (role_id, email, full_name, id_code, career_or_dept, phone, institutional, email_verified, is_active)
       VALUES ($1,$2,$3,$4,$5,$6, TRUE, TRUE, TRUE)
       RETURNING id, role_id, email, full_name, id_code, career_or_dept, phone, is_active, created_at`,
      [role_id, String(email).toLowerCase(), full_name, student_id || teacher_code || null, program_department || null, phone || null]
    );
    
    const user = userResult.rows[0];
    
    // Insertar password
    await client.query(
      'INSERT INTO app_user_auth (user_id, password_hash) VALUES ($1, $2)',
      [user.id, hash]
    );
    
    await client.query('COMMIT');
    
    await logChange({ entity_type: 'user', entity_id: user.id, user_id: actorId(req), action: 'CREATE', detail: { role, email } });
    
    // Formatear respuesta
    const response = {
      id: user.id,
      role: role,
      email: user.email,
      full_name: user.full_name,
      student_id: user.id_code,
      teacher_code: user.id_code,
      program_department: user.career_or_dept,
      phone: user.phone,
      is_active: user.is_active,
      created_at: user.created_at
    };
    
    res.status(201).json(response);
  } catch (e) {
    await client.query('ROLLBACK');
    if (e.code === '23505') return res.status(400).json({ error: 'Email ya registrado' });
    throw e;
  } finally {
    client.release();
  }
};

exports.update = async (req, res) => {
  const id = Number(req.params.id);
  const payload = req.body || {};
  
  // Mapeo de campos
  const fieldMap = {
    'full_name': 'full_name',
    'student_id': 'id_code',
    'teacher_code': 'id_code',
    'program_department': 'career_or_dept',
    'phone': 'phone',
    'is_active': 'is_active'
  };
  
  const sets = [];
  const params = [];
  
  Object.keys(payload).forEach((k) => {
    const dbField = fieldMap[k];
    if (dbField && Object.prototype.hasOwnProperty.call(payload, k)) {
      params.push(payload[k]);
      sets.push(`${dbField} = $${params.length}`);
    }
  });
  
  if (!sets.length) return res.status(400).json({ error: 'Nada para actualizar' });

  params.push(id);

  const { rows } = await pool.query(
    `UPDATE app_user SET ${sets.join(', ')}, updated_at=NOW() 
     WHERE id=$${params.length} 
     RETURNING id, role_id, email, full_name, id_code, career_or_dept, phone, is_active, updated_at`,
    params
  );
  
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });

  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'UPDATE', detail: payload });
  
  // Obtener role name
  const roleQuery = await pool.query('SELECT name FROM role WHERE id = $1', [rows[0].role_id]);
  
  const response = {
    id: rows[0].id,
    role: roleQuery.rows[0]?.name || 'Estudiante',
    email: rows[0].email,
    full_name: rows[0].full_name,
    student_id: rows[0].id_code,
    teacher_code: rows[0].id_code,
    program_department: rows[0].career_or_dept,
    phone: rows[0].phone,
    is_active: rows[0].is_active,
    updated_at: rows[0].updated_at
  };
  
  res.json(response);
};

exports.setRole = async (req, res) => {
  const id = Number(req.params.id);
  const { role } = req.body || {};
  
  // Obtener role_id
  const roleQuery = await pool.query('SELECT id FROM role WHERE name = $1', [role]);
  if (!roleQuery.rows.length) {
    return res.status(400).json({ error: 'Rol inválido' });
  }
  const role_id = roleQuery.rows[0].id;
  
  const { rows } = await pool.query(
    `UPDATE app_user SET role_id=$1, updated_at=NOW() WHERE id=$2
     RETURNING id, role_id, email, full_name, is_active, updated_at`,
    [role_id, id]
  );
  
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  
  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'SET_ROLE', detail: { role } });
  
  const response = {
    id: rows[0].id,
    role: role,
    email: rows[0].email,
    full_name: rows[0].full_name,
    is_active: rows[0].is_active,
    updated_at: rows[0].updated_at
  };
  
  res.json(response);
};

exports.activate = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `UPDATE app_user u SET is_active=true, updated_at=NOW() 
     FROM role r
     WHERE u.id=$1 AND u.role_id = r.id
     RETURNING u.id, r.name as role, u.email, u.full_name, u.is_active, u.updated_at`,
    [id]
  );
  if (!rows.length) return res.status(404).json({ error: 'Usuario no encontrado' });
  await logChange({ entity_type: 'user', entity_id: id, user_id: actorId(req), action: 'ACTIVATE' });
  res.json(rows[0]);
};

exports.deactivate = async (req, res) => {
  const id = Number(req.params.id);
  const { rows } = await pool.query(
    `UPDATE app_user u SET is_active=false, updated_at=NOW() 
     FROM role r
     WHERE u.id=$1 AND u.role_id = r.id
     RETURNING u.id, r.name as role, u.email, u.full_name, u.is_active, u.updated_at`,
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

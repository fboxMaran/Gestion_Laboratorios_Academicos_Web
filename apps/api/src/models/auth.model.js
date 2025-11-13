const { pool } = require('../db/pool');
const bcrypt = require('bcryptjs');

const ALLOWED_DOMAINS = ['estudiantec.cr', 'tec.ac.cr', 'itcr.ac.cr'];

function emailDomainOk(email) {
  const m = String(email || '').toLowerCase().match(/@([^@]+)$/);
  if (!m) return false;
  const dom = m[1];
  return ALLOWED_DOMAINS.some(d => dom.endsWith(d));
}

const AuthModel = {
  async register({ role, email, password, full_name, student_id, teacher_code, program_department, phone }) {
    if (!role || !email || !password || !full_name) {
      const e = new Error('role, email, password y full_name son obligatorios'); e.status = 400; throw e;
    }
    if (!emailDomainOk(email)) {
      const e = new Error('Correo debe ser institucional (@estudiantec.cr, @tec.ac.cr o @itcr.ac.cr)'); e.status = 400; throw e;
    }
    
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // Buscar role_id basado en el nombre del rol
      const roleQuery = await client.query('SELECT id FROM role WHERE name = $1', [role]);
      const role_id = roleQuery.rows[0]?.id || 1; // Default: Estudiante
      
      // Hash de la contraseña
      const hash = await bcrypt.hash(password, 10);
      
      // Insertar usuario en app_user
      const userResult = await client.query(
        `INSERT INTO app_user (role_id, email, full_name, id_code, career_or_dept, phone, institutional, email_verified, is_active)
         VALUES ($1, $2, $3, $4, $5, $6, TRUE, TRUE, TRUE)
         RETURNING id, role_id, email, full_name, id_code, career_or_dept, phone, is_active, created_at`,
        [role_id, email.toLowerCase(), full_name, student_id || teacher_code || null, program_department || null, phone || null]
      );
      
      const user = userResult.rows[0];
      
      // Insertar contraseña en app_user_auth
      await client.query(
        'INSERT INTO app_user_auth (user_id, password_hash) VALUES ($1, $2)',
        [user.id, hash]
      );
      
      await client.query('COMMIT');
      
      // Formatear respuesta para mantener compatibilidad con frontend
      return {
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
      
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  },

  async findByEmail(email) {
    const { rows } = await pool.query(
      `SELECT 
        u.id,
        u.full_name,
        u.email,
        u.role_id,
        r.name as role,
        u.id_code as student_id,
        u.id_code as teacher_code,
        u.career_or_dept as program_department,
        u.phone,
        u.is_active,
        u.created_at,
        u.updated_at,
        a.password_hash
      FROM app_user u
      INNER JOIN app_user_auth a ON u.id = a.user_id
      LEFT JOIN role r ON u.role_id = r.id
      WHERE u.email = $1 AND u.is_active = TRUE`,
      [String(email).toLowerCase()]
    );
    return rows[0] || null;
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  },
};

module.exports = AuthModel;

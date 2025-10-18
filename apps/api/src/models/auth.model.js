const { pool } = require('../db/pool');
const bcrypt = require('bcryptjs');

const ALLOWED_DOMAINS = ['estudiantec.cr', 'itcr.ac.cr'];

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
      const e = new Error('Correo debe ser institucional (@estudiantec.cr o @itcr.ac.cr)'); e.status = 400; throw e;
    }
    const hash = await bcrypt.hash(password, 10);
    const { rows } = await pool.query(
      `INSERT INTO users (role, email, password_hash, full_name, student_id, teacher_code, program_department, phone)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
       RETURNING id, role, email, full_name, student_id, teacher_code, program_department, phone, is_active, created_at`,
      [role, email.toLowerCase(), hash, full_name, student_id || null, teacher_code || null, program_department || null, phone || null]
    );
    return rows[0];
  },

  async findByEmail(email) {
    const { rows } = await pool.query(`SELECT * FROM users WHERE email = $1`, [String(email).toLowerCase()]);
    return rows[0] || null;
  },

  async verifyPassword(user, password) {
    return bcrypt.compare(password, user.password_hash);
  },
};

module.exports = AuthModel;

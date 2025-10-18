const jwt = require('jsonwebtoken');
const Auth = require('../models/auth.model');
const { JWT_SECRET } = require('../utils/config'); // <-- AHORA de utils/config

function signUser(u) {
  return jwt.sign(
    { id: u.id, role: u.role, email: u.email, full_name: u.full_name },
    JWT_SECRET,
    { expiresIn: '12h' }
  );
}

const AuthController = {
  async register(req, res, next) {
    try {
      const u = await Auth.register(req.body || {});
      const token = signUser(u);
      res.status(201).json({ token, user: u });
    } catch (e) { next(e); }
  },

  async login(req, res, next) {
    try {
      const { email, password } = req.body || {};
      const u = await Auth.findByEmail(email);
      if (!u) return res.status(401).json({ error: 'Credenciales inválidas' });
      const ok = await Auth.verifyPassword(u, password || '');
      if (!ok) return res.status(401).json({ error: 'Credenciales inválidas' });

      const safe = {
        id: u.id, role: u.role, email: u.email, full_name: u.full_name,
        student_id: u.student_id, teacher_code: u.teacher_code,
        program_department: u.program_department, phone: u.phone, is_active: u.is_active
      };
      const token = signUser(safe);
      res.json({ token, user: safe });
    } catch (e) { next(e); }
  },
};

module.exports = AuthController;

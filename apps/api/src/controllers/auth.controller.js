const jwt = require('jsonwebtoken');
const Auth = require('../models/auth.model');
const { JWT_SECRET } = require('../utils/config'); // <-- AHORA de utils/config
const { insertAuditLog } = require('./admin.audit.controller');

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

      // ===== LOGIN FAILED: usuario no existe =====
      if (!u) {
        insertAuditLog({body:{
          module: 'AUTH',
          entity: 'app_user',
          entity_id: null,
          actor_user_id: null, // no sabemos quién es aún
          action: 'LOGIN_FAILED',
          after_snapshot: {
            email: email || null,
            reason: 'USER_NOT_FOUND',
            ip: req.ip,
            user_agent: req.headers['user-agent'] || null,
          },
        }});

        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      const ok = await Auth.verifyPassword(u, password || '');

      // ===== LOGIN FAILED: contraseña incorrecta =====
      if (!ok) {
        await insertAuditLog({body:{
          module: 'AUTH',
          entity: 'app_user',
          entity_id: u.id,
          actor_user_id: u.id,
          action: 'LOGIN_FAILED',
          after_snapshot: {
            email: u.email,
            reason: 'WRONG_PASSWORD',
            ip: req.ip,
            user_agent: req.headers['user-agent'] || null,
          },
        }});

        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // ===== LOGIN OK =====
      const safe = {
        id: u.id,
        role: u.role,
        email: u.email,
        full_name: u.full_name,
        student_id: u.student_id,
        teacher_code: u.teacher_code,
        program_department: u.program_department,
        phone: u.phone,
        is_active: u.is_active,
      };

      const token = signUser(safe);

      // Registrar en audit_log el inicio de sesión exitoso
      insertAuditLog({body:{
        module: 'AUTH',
        entity: 'app_user',
        entity_id: u.id,
        actor_user_id: u.id,
        action: 'LOGIN',
        after_snapshot: {
          email: u.email,
          success: true,
          ip: req.ip,
          user_agent: req.headers['user-agent'] || null,
        },
      }});

      res.json({ token, user: safe });
    } catch (e) {
      next(e);
    }
  },
};

module.exports = AuthController;

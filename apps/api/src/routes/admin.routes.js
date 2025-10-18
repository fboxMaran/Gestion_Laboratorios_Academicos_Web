const express = require('express');
const usersCtrl = require('../controllers/admin.users.controller');
const settingsCtrl = require('../controllers/admin.settings.controller');
const auditCtrl = require('../controllers/admin.audit.controller');
// const { requireAuth } = require('../middlewares/auth.middleware');
// const { requireAdmin } = require('../middlewares/roles.middleware'); // si lo tienes

const r = express.Router();

// Helper opcional si aún no conectas middleware de auth
// const adminOnly = (req, res, next) => (req.user?.role === 'ADMIN' ? next() : res.status(403).json({ error: 'Solo ADMIN' }));

// ==== 4.1 Usuarios & Roles ====
// Listado y CRUD básico
r.get('/users', /*requireAuth, requireAdmin,*/ usersCtrl.list);
r.post('/users', /*requireAuth, requireAdmin,*/ usersCtrl.create);
r.get('/users/:id', /*requireAuth, requireAdmin,*/ usersCtrl.get);
r.put('/users/:id', /*requireAuth, requireAdmin,*/ usersCtrl.update);

// Activación / Desactivación y rol
r.put('/users/:id/activate', /*requireAuth, requireAdmin,*/ usersCtrl.activate);
r.put('/users/:id/deactivate', /*requireAuth, requireAdmin,*/ usersCtrl.deactivate);
r.put('/users/:id/role', /*requireAuth, requireAdmin,*/ usersCtrl.setRole);

// Roles & permisos
r.get('/roles', /*requireAuth, requireAdmin,*/ usersCtrl.rolesList);
r.put('/roles/:role/permissions', /*requireAuth, requireAdmin,*/ usersCtrl.setRolePermissions);

// ==== 4.2 Configuración Global ====
// key/value JSON
r.get('/settings', /*requireAuth, requireAdmin,*/ settingsCtrl.list);
r.get('/settings/:key', /*requireAuth, requireAdmin,*/ settingsCtrl.get);
r.put('/settings/:key', /*requireAuth, requireAdmin,*/ settingsCtrl.upsert);

// ==== 4.3 Supervisión / Auditoría ====
// Consulta changelog con filtros y export CSV
r.get('/audit', /*requireAuth, requireAdmin,*/ auditCtrl.search);

module.exports = r;

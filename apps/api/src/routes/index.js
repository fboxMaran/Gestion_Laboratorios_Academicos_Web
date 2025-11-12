// apps/api/src/routes/index.js
const express = require('express');

// Dominios principales
const departments   = require('./departments.routes');
const labs          = require('./labs.routes');
const resourceTypes = require('./resource_types.routes');
const resources     = require('./resources.routes');

// Módulos ya existentes
const availability  = require('./availability.routes'); // /labs/:labId/slots, /subscriptions, /changelog
const requests      = require('./requests.routes');     // /requests/...
const control       = require('./control.routes');      // /control/... (si define prefijos internos)
const tech          = require('./tech.routes');         // /tech/...   (si define prefijos internos)

// ✅ Nuevos módulos del 2.2 y 2.3
const inventory     = require('./inventory.routes');    // /inventory/...
const maintenance   = require('./maintenance.routes');  // /maintenance/...
const reports       = require('./reports.routes');

// === MÓDULO 4 (Admin) ===
const admin         = require('./admin.routes');
// 4.4 Admin Reports (nuevo)
const adminReports  = require('./admin_reports.routes');

// NUEVO (Módulo 3)
const auth          = require('./auth.routes');
const users         = require('./users.routes');
const browse        = require('./browse.routes');
const notifications = require('./notifications.routes');

// 👇 Adaptadores para /labs/:id/resources usando el controlador existente
const ResourcesController = require('../controllers/resources.controller');

const router = express.Router();

// Ping raíz para el app (evita 404 al cargar /api)
router.get('/', (_req, res) => {
  res.json({ ok: true, name: 'LabTEC API', version: 1 });
});

// Montaje por prefijos “limpios”
router.use('/departments',    departments);
router.use('/labs',           labs);
router.use('/resource-types', resourceTypes);
router.use('/resources',      resources);
router.use('/requests',       requests);

// Nuevos prefijos
router.use('/inventory',      inventory);
router.use('/maintenance',    maintenance);

// === MÓDULO 4 ===
router.use('/admin',          admin);
// 4.4 bajo /admin/reports/*
router.use('/admin/reports',  adminReports);

// ---- Adaptadores REST para catálogo anidado por lab ----
// GET /labs/:id/resources -> lista de resource filtrados por lab_id
router.get('/labs/:id/resources', (req, res, next) => {
  req.query.lab_id = req.params.id;
  return ResourcesController.list(req, res, next);
});

// POST /labs/:id/resources -> crea resource con lab_id = :id
router.post('/labs/:id/resources', (req, res, next) => {
  req.body = { ...(req.body || {}), lab_id: Number(req.params.id) };
  return ResourcesController.create(req, res, next);
});
// --------------------------------------------------------

// Routers que exponen paths en raíz (mantener al final para evitar sombras)
router.use('/', availability);
router.use('/', control);
router.use('/', tech);
router.use('/reports',        reports);
router.use('/',               notifications);  // /notifications, /notifications/:id/seen, etc.

// === MÓDULO 3 ===
router.use('/auth',           auth);
router.use('/users',          users);   // /users/me, /users/me/trainings, etc.
router.use('/browse',         browse);

module.exports = router;

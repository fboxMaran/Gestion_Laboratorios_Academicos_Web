// apps/api/src/routes/admin_reports.routes.js
const express = require('express');
const { requireAuth } = require('../middlewares/auth.middleware');
const ctrl = require('../controllers/admin_reports.controller');

const router = express.Router();

// Middleware simple para asegurar rol ADMIN
function ensureAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'ADMIN') {
    return res.status(403).json({ error: 'Solo ADMIN' });
  }
  return next();
}

// Todas requieren auth + rol admin
router.get('/usage-global',      requireAuth, ensureAdmin, ctrl.usageGlobal);
router.get('/inventory-institutional', requireAuth, ensureAdmin, ctrl.inventoryInstitutional);
router.get('/consumption',       requireAuth, ensureAdmin, ctrl.consumption);
router.get('/performance',       requireAuth, ensureAdmin, ctrl.performance);

module.exports = router;

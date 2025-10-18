// apps/api/src/routes/maintenance.routes.js
const express = require('express');
const MaintenanceController = require('../controllers/maintenance.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// CRUD básico de órdenes de mantenimiento
router.post('/orders',           w((req,res,next) => MaintenanceController.create(req,res,next)));
router.get('/orders',            w((req,res,next) => MaintenanceController.list(req,res,next)));
router.get('/orders/:id',        w((req,res,next) => MaintenanceController.get(req,res,next)));

// Acciones
router.put('/orders/:id/start',    w((req,res,next) => MaintenanceController.start(req,res,next)));
router.put('/orders/:id/cancel',   w((req,res,next) => MaintenanceController.cancel(req,res,next)));
router.put('/orders/:id/complete', w((req,res,next) => MaintenanceController.complete(req,res,next)));

module.exports = router;

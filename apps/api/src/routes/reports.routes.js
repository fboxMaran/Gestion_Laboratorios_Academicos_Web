const express = require('express');
const ReportsController = require('../controllers/reports.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Uso de recursos y usuarios frecuentes
router.get('/usage',        w((req,res,next) => ReportsController.usage(req,res,next)));

// Inventario: estado, críticos y consumo por periodo
router.get('/inventory',    w((req,res,next) => ReportsController.inventory(req,res,next)));

// Mantenimiento: downtime promedio y frecuencia
router.get('/maintenance',  w((req,res,next) => ReportsController.maintenance(req,res,next)));

module.exports = router;
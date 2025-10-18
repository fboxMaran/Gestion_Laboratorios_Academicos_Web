// apps/api/src/routes/control.routes.js
const express = require('express');
const ControlController = require('../controllers/control.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Asignaciones (equipos)
router.post('/requests/:requestId/assignments', w((req,res,next)=>ControlController.createAssignments(req,res,next)));
router.get('/requests/:requestId/assignments',  w((req,res,next)=>ControlController.listAssignments(req,res,next)));
router.put('/assignments/:id/return',           w((req,res,next)=>ControlController.returnAssignment(req,res,next)));

// Consumos (materiales)
router.post('/requests/:requestId/consumptions', w((req,res,next)=>ControlController.createConsumption(req,res,next)));
router.get('/requests/:requestId/consumptions',  w((req,res,next)=>ControlController.listConsumptions(req,res,next)));

// Beneficios académicos
router.post('/requests/:requestId/benefits', w((req,res,next)=>ControlController.addBenefit(req,res,next)));
router.get('/requests/:requestId/benefits',  w((req,res,next)=>ControlController.listBenefits(req,res,next)));

// Reportes
router.get('/reports/usage', w((req,res,next)=>ControlController.reportUsage(req,res,next)));

module.exports = router;

// apps/api/src/routes/tech.routes.js
const express = require('express');
const TechController = require('../controllers/tech.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// 2.1 Solicitudes aprobadas
router.get('/requests/approved', w((req,res,next) => TechController.listApproved(req,res,next)));
router.get('/requests/:id/precheck', w((req,res,next) => TechController.precheck(req,res,next)));

// Asignaciones (entregas / devoluciones / estados)
router.get('/assignments', w((req,res,next) => TechController.listAssignments(req,res,next)));
router.post('/assignments', w((req,res,next) => TechController.createAssignment(req,res,next)));
router.put('/assignments/:id/return', w((req,res,next) => TechController.returnAssignment(req,res,next)));
router.put('/assignments/:id/lost', w((req,res,next) => TechController.markLost(req,res,next)));
router.put('/assignments/:id/damaged', w((req,res,next) => TechController.markDamaged(req,res,next)));

module.exports = router;

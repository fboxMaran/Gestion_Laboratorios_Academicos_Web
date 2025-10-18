const express = require('express');
const AvailabilityController = require('../controllers/availability.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Slots de calendario por laboratorio
router.post('/labs/:labId/slots', w((req,res,next) => AvailabilityController.createSlot(req,res,next)));
router.get('/labs/:labId/slots',  w((req,res,next) => AvailabilityController.listSlots(req,res,next)));

// Cambiar estado / eliminar slot
router.put('/slots/:id/status', w((req,res,next) => AvailabilityController.updateSlotStatus(req,res,next)));
router.delete('/slots/:id',       w((req,res,next) => AvailabilityController.deleteSlot(req,res,next)));

// Suscripciones
router.post('/subscriptions', w((req,res,next) => AvailabilityController.subscribe(req,res,next)));
router.get('/subscriptions',  w((req,res,next) => AvailabilityController.listSubscriptions(req,res,next)));

// Bitácora
router.get('/changelog', w((req,res,next) => AvailabilityController.changelog(req,res,next)));

module.exports = router;

// Usa la forma compatible con Express 4/5
const express = require('express');
const LabsController = require('../controllers/labs.controller');

const router = express.Router();

// helpers para asegurar que siempre pasamos una función
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// /api/labs
router.post('/',          w((req,res,next) => LabsController.create(req,res,next)));
router.get('/',           w((req,res,next) => LabsController.list(req,res,next)));
router.get('/:id',        w((req,res,next) => LabsController.get(req,res,next)));
router.put('/:id',        w((req,res,next) => LabsController.update(req,res,next)));
router.delete('/:id',     w((req,res,next) => LabsController.remove(req,res,next)));

// contacts
router.post('/:id/contacts',  w((req,res,next) => LabsController.addContact(req,res,next)));
router.get('/:id/contacts',   w((req,res,next) => LabsController.listContacts(req,res,next)));

// policies
router.put('/:id/policies',   w((req,res,next) => LabsController.upsertPolicies(req,res,next)));
router.get('/:id/policies',   w((req,res,next) => LabsController.getPolicies(req,res,next)));

// hours
router.put('/:id/hours',      w((req,res,next) => LabsController.setHours(req,res,next)));
router.get('/:id/hours',      w((req,res,next) => LabsController.getHours(req,res,next)));

// fixed resources
router.post('/:id/resources-fixed', w((req,res,next) => LabsController.addFixedResource(req,res,next)));
router.get('/:id/resources-fixed',  w((req,res,next) => LabsController.listFixedResources(req,res,next)));

// consumables
router.post('/:id/consumables',     w((req,res,next) => LabsController.addConsumable(req,res,next)));
router.get('/:id/consumables',      w((req,res,next) => LabsController.listConsumables(req,res,next)));

// history
router.get('/:id/history',          w((req,res,next) => LabsController.history(req,res,next)));

module.exports = router;

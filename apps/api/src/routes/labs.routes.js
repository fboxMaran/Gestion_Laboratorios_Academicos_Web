// Usa la forma compatible con Express 4/5
const express = require('express');
const LabsController = require('../controllers/labs.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();

// helpers para asegurar que siempre pasamos una función
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// /api/labs
router.post('/',          requireAuth, w((req,res,next) => LabsController.create(req,res,next)));
router.get('/',           requireAuth, w((req,res,next) => LabsController.list(req,res,next)));
router.get('/:id',        requireAuth, w((req,res,next) => LabsController.get(req,res,next)));
router.put('/:id',        requireAuth, w((req,res,next) => LabsController.update(req,res,next)));
router.delete('/:id',     requireAuth, w((req,res,next) => LabsController.remove(req,res,next)));

// contacts
router.post('/:id/contacts',        requireAuth, w((req,res,next) => LabsController.addContact(req,res,next)));
router.get('/:id/contacts',         requireAuth, w((req,res,next) => LabsController.listContacts(req,res,next)));
router.put('/:id/contacts/:contactId',    requireAuth, w((req,res,next) => LabsController.updateContact(req,res,next)));
router.delete('/:id/contacts/:contactId', requireAuth, w((req,res,next) => LabsController.deleteContact(req,res,next)));

// policies
router.put('/:id/policies',   requireAuth, w((req,res,next) => LabsController.upsertPolicies(req,res,next)));
router.get('/:id/policies',   requireAuth, w((req,res,next) => LabsController.getPolicies(req,res,next)));

// hours
router.put('/:id/hours',      requireAuth, w((req,res,next) => LabsController.setHours(req,res,next)));
router.get('/:id/hours',      requireAuth, w((req,res,next) => LabsController.getHours(req,res,next)));

// fixed resources
router.post('/:id/resources-fixed',           requireAuth, w((req,res,next) => LabsController.addFixedResource(req,res,next)));
router.get('/:id/resources-fixed',            requireAuth, w((req,res,next) => LabsController.listFixedResources(req,res,next)));
router.put('/:id/resources-fixed/:resourceId',    requireAuth, w((req,res,next) => LabsController.updateFixedResource(req,res,next)));
router.delete('/:id/resources-fixed/:resourceId', requireAuth, w((req,res,next) => LabsController.deleteFixedResource(req,res,next)));

// consumables
router.post('/:id/consumables',            requireAuth, w((req,res,next) => LabsController.addConsumable(req,res,next)));
router.get('/:id/consumables',             requireAuth, w((req,res,next) => LabsController.listConsumables(req,res,next)));
router.put('/:id/consumables/:consumableId',    requireAuth, w((req,res,next) => LabsController.updateConsumable(req,res,next)));
router.delete('/:id/consumables/:consumableId', requireAuth, w((req,res,next) => LabsController.deleteConsumable(req,res,next)));

// history
router.get('/:id/history',          requireAuth, w((req,res,next) => LabsController.history(req,res,next)));
router.get('/:id/history/export/pdf',  requireAuth, w((req,res,next) => LabsController.exportHistoryPDF(req,res,next)));
router.get('/:id/history/export/excel', requireAuth, w((req,res,next) => LabsController.exportHistoryExcel(req,res,next)));

module.exports = router;

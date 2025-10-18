// apps/api/src/routes/resources.routes.js
const express = require('express');
const ResourcesController = require('../controllers/resources.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// CRUD básico + helpers
router.get('/', w((req,res,next) => ResourcesController.list(req,res,next)));
router.post('/', w((req,res,next) => ResourcesController.create(req,res,next)));
router.get('/:id', w((req,res,next) => ResourcesController.get(req,res,next)));
router.put('/:id', w((req,res,next) => ResourcesController.update(req,res,next)));
router.delete('/:id', w((req,res,next) => ResourcesController.remove(req,res,next)));

// Fotos
router.get('/:id/photos', w((req,res,next) => ResourcesController.listPhotos(req,res,next)));
router.post('/:id/photos', w((req,res,next) => ResourcesController.addPhoto(req,res,next)));

// Enlace directo a solicitud
router.put('/:id/request-url', w((req,res,next) => ResourcesController.setRequestUrl(req,res,next)));

module.exports = router;

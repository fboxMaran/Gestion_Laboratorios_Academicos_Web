const express = require('express');
const ResourceTypesController = require('../controllers/resource_types.controller');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Crear tipo
router.post('/', w((req,res,next) => ResourceTypesController.create(req,res,next)));
// Listar tipos
router.get('/',  w((req,res,next) => ResourceTypesController.list(req,res,next)));

module.exports = router;

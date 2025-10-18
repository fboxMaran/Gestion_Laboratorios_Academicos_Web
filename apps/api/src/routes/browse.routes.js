const express = require('express');
const BrowseController = require('../controllers/browse.controller');
const { authRequired } = require('../middlewares/auth.middleware');

const router = express.Router();
const w = (fn)=> (req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);

/**
 * Nota: Permito acceso público a /browse/labs y /browse/resources (modo catálogo),
 * pero si el usuario va autenticado se añade el campo "eligible" y se filtra
 * por requisitos cuando only_eligible=true (default).
 */
router.get('/labs',      w((req,res,n)=>BrowseController.labs(req,res,n)));
router.get('/resources', w((req,res,n)=>BrowseController.resources(req,res,n)));

/** Calendario puede ser público también (mostrar slots). */
router.get('/calendar',  w((req,res,n)=>BrowseController.calendar(req,res,n)));

module.exports = router;

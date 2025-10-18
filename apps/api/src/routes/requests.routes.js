// apps/api/src/routes/requests.routes.js
const express = require('express');
const ctrl = require('../controllers/requests.controller');
// const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// ---------- Preview/Creación/Listado/Detalle ----------
router.post('/preview', /*requireAuth,*/ w(ctrl.preview));
router.post('/',        /*requireAuth,*/ w(ctrl.create));
router.get('/',         /*requireAuth,*/ w(ctrl.list));
router.get('/:id',      /*requireAuth,*/ w(ctrl.get));

// ---------- Transiciones de estado ----------
router.put('/:id/status', /*requireAuth,*/ w(ctrl.setStatus));
router.put('/:id/cancel', /*requireAuth,*/ w(ctrl.cancel));

// Compatibilidad con tus endpoints previos:
router.post('/:id/approve',   /*requireAuth,*/ w(ctrl.approve));
router.post('/:id/reject',    /*requireAuth,*/ w(ctrl.reject));
router.post('/:id/need-info', /*requireAuth,*/ w(ctrl.needInfo));

// ---------- Mensajería por solicitud ----------
router.get('/:id/messages',  /*requireAuth,*/ w(ctrl.listMessages));
router.post('/:id/messages', /*requireAuth,*/ w(ctrl.addMessage));

module.exports = router;

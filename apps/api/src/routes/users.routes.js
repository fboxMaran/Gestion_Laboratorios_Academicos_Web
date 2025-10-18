// apps/api/src/routes/users.routes.js
const express = require('express');
const UsersController = require('../controllers/users.controller');
const historyCtrl = require('../controllers/history.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

const router = express.Router();
const w = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

// Nota: en index.js montas con `router.use('/users', router)`,
// aquí los paths son relativos: '/me', no '/users/me'

router.get('/me', requireAuth, w(UsersController.me));
router.put('/me', requireAuth, w(UsersController.updateMe));

router.get('/me/trainings', requireAuth, w(UsersController.myTrainings));
router.post('/me/trainings', requireAuth, w(UsersController.upsertTraining));

router.get('/me/lab-requirements', requireAuth, w(UsersController.labRequirements));

// 🔹 Historial unificado (3.4) con exportación CSV si se pasa ?format=csv
router.get('/me/history', requireAuth, w(historyCtrl.userHistory));

module.exports = router;

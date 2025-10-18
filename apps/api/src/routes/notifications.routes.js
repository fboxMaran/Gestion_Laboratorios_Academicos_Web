const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/notifications.controller');
// const { requireAuth } = require('../middlewares/auth');

r.get('/notifications', /*requireAuth,*/ ctrl.list);
r.post('/notifications/:id/seen', /*requireAuth,*/ ctrl.markSeen);
r.post('/notifications/mark-all-seen', /*requireAuth,*/ ctrl.markAllSeen);

module.exports = r;

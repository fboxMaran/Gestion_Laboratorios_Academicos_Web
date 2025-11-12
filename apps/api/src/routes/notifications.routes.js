const express = require('express');
const r = express.Router();
const ctrl = require('../controllers/notifications.controller');
const { requireAuth } = require('../middlewares/auth.middleware');

r.get('/notifications', requireAuth, ctrl.list);
r.post('/notifications/:id/seen', requireAuth, ctrl.markSeen);
r.post('/notifications/mark-all-seen', requireAuth, ctrl.markAllSeen);
r.delete('/notifications/:id', requireAuth, ctrl.deleteNotification);

module.exports = r;

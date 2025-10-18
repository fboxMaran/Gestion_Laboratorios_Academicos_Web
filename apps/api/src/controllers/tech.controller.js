// apps/api/src/controllers/tech.controller.js
const Tech = require('../models/tech.model');

const TechController = {
  async listApproved(req, res, next) {
    try {
      const { lab_id, from, to, overdue } = req.query;
      const rows = await Tech.listApprovedRequests({
        lab_id: lab_id ? Number(lab_id) : undefined,
        from, to,
        overdue: overdue === 'true'
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async precheck(req, res, next) {
    try {
      const r = await Tech.precheckRequest(Number(req.params.id));
      if (!r.exists) return res.status(404).json({ error: 'Solicitud no encontrada' });
      res.json(r);
    } catch (e) { next(e); }
  },

  async createAssignment(req, res, next) {
    try {
      const row = await Tech.createAssignment({
        request_id: req.body.request_id,
        lab_id: req.body.lab_id,
        user_id: req.body.user_id,
        resource_id: req.body.resource_id,
        fixed_id: req.body.fixed_id,
        qty: req.body.qty,
        due_at: req.body.due_at,
        notes: req.body.notes,
        actor_user_id: req.body.actor_user_id || null,
      });
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async returnAssignment(req, res, next) {
    try {
      const row = await Tech.returnAssignment(Number(req.params.id), {
        notes: req.body.notes,
        actor_user_id: req.body.actor_user_id || null,
        notify_user_id: req.body.notify_user_id || null,
      });
      res.json(row);
    } catch (e) { next(e); }
  },

  async markLost(req, res, next) {
    try {
      const row = await Tech.markLost(Number(req.params.id), {
        notes: req.body.notes,
        actor_user_id: req.body.actor_user_id || null,
        notify_user_id: req.body.notify_user_id || null,
      });
      res.json(row);
    } catch (e) { next(e); }
  },

  async markDamaged(req, res, next) {
    try {
      const row = await Tech.markDamaged(Number(req.params.id), {
        notes: req.body.notes,
        actor_user_id: req.body.actor_user_id || null,
        notify_user_id: req.body.notify_user_id || null,
      });
      res.json(row);
    } catch (e) { next(e); }
  },

  async listAssignments(req, res, next) {
    try {
      const { request_id, lab_id } = req.query;
      const rows = await Tech.listAssignments({
        request_id: request_id ? Number(request_id) : undefined,
        lab_id:     lab_id ? Number(lab_id) : undefined,
      });
      res.json(rows);
    } catch (e) { next(e); }
  },
};

module.exports = TechController;

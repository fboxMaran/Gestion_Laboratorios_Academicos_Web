// apps/api/src/controllers/control.controller.js
const Control = require('../models/control.model');

function handle(res, fn) {
  return fn().catch((e) => {
    const status = e.status || (e.code === '23503' ? 400 : 500);
    res.status(status).json({ error: e.message || 'Server error', code: e.code });
  });
}

const ControlController = {
  // ASIGNACIONES
  createAssignments(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      const items = Array.isArray(req.body?.items) ? req.body.items : [];
      const created = await Control.assignItems(request_id, items, req.body?.assigned_by || null);
      res.status(201).json(created);
    });
  },
  listAssignments(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      res.json(await Control.listAssignmentsByRequest(request_id));
    });
  },
  returnAssignment(req, res) {
    return handle(res, async () => {
      const id = Number(req.params.id);
      const upd = await Control.returnAssignment(id, {
        returned_at: req.body?.returned_at || null,
        status: req.body?.status || 'DEVUELTO',
        notes: req.body?.notes || null
      });
      res.json(upd);
    });
  },

  // CONSUMOS
  createConsumption(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      const row = await Control.registerConsumption(request_id, req.body || {});
      res.status(201).json(row);
    });
  },
  listConsumptions(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      res.json(await Control.listConsumptionsByRequest(request_id));
    });
  },

  // BENEFICIOS
  addBenefit(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      const row = await Control.addBenefit(request_id, req.body || {});
      res.status(201).json(row);
    });
  },
  listBenefits(req, res) {
    return handle(res, async () => {
      const request_id = Number(req.params.requestId);
      res.json(await Control.listBenefitsByRequest(request_id));
    });
  },

  // REPORTES
  reportUsage(req, res) {
    return handle(res, async () => {
      const lab_id = Number(req.query.lab_id);
      const from = req.query.from; // ISO
      const to = req.query.to;     // ISO
      if (!lab_id || !from || !to) {
        return res.status(400).json({ error: 'lab_id, from, to son obligatorios (ISO)' });
      }
      res.json(await Control.reportUsage({ lab_id, from, to }));
    });
  },
};

module.exports = ControlController;

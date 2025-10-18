
// apps/api/src/controllers/maintenance.controller.js
const Maintenance = require('../models/maintenance.model');

const MaintenanceController = {
  async create(req, res, next) {
    try {
      const row = await Maintenance.createOrder(req.body || {});
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async list(req, res, next) {
    try {
      const { lab_id, status, resource_id, fixed_id } = req.query;
      const rows = await Maintenance.listOrders({
        lab_id: lab_id ? Number(lab_id) : undefined,
        status: status || undefined,
        resource_id: resource_id ? Number(resource_id) : undefined,
        fixed_id: fixed_id ? Number(fixed_id) : undefined
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const row = await Maintenance.getOrder(Number(req.params.id));
      if (!row) return res.status(404).json({ error: 'Orden no encontrada' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async start(req, res, next) {
    try {
      const row = await Maintenance.startOrder(Number(req.params.id), { started_at: req.body?.started_at });
      if (!row) return res.status(404).json({ error: 'Orden no encontrada' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async cancel(req, res, next) {
    try {
      const row = await Maintenance.cancelOrder(Number(req.params.id), { reason: req.body?.reason });
      if (!row) return res.status(404).json({ error: 'Orden no encontrada' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async complete(req, res, next) {
    try {
      const row = await Maintenance.completeOrder(Number(req.params.id), {
        result_status: req.body?.result_status,
        used_parts: req.body?.used_parts,
        notes: req.body?.notes
      });
      if (!row) return res.status(404).json({ error: 'Orden no encontrada' });
      res.json(row);
    } catch (e) { next(e); }
  },
};

module.exports = MaintenanceController;

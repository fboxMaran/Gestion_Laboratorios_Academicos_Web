// apps/api/src/controllers/resource_types.controller.js
const ResourceTypes = require('../models/resource_types.model');

const ResourceTypesController = {
  async list(_req, res, next) {
    try {
      const rows = await ResourceTypes.list();
      res.json(rows);
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const { name } = req.body || {};
      if (!name) return res.status(400).json({ error: 'name es requerido' });
      const row = await ResourceTypes.create({ name });
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      await ResourceTypes.remove(Number(req.params.id));
      res.status(204).end();
    } catch (e) { next(e); }
  },
};

module.exports = ResourceTypesController;

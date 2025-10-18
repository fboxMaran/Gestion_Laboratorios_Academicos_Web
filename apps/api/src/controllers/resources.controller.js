// apps/api/src/controllers/resources.controller.js
const Resources = require('../models/resources.model');

const ResourcesController = {
  async list(req, res, next) {
    try {
      const { lab_id, type_id } = req.query;
      const rows = await Resources.list({
        lab_id: lab_id ? Number(lab_id) : undefined,
        type_id: type_id ? Number(type_id) : undefined,
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async create(req, res, next) {
    try {
      const body = req.body || {};
      if (!body.lab_id || !body.type_id || !body.name) {
        return res.status(400).json({ error: 'lab_id, type_id y name son obligatorios' });
      }
      const row = await Resources.createResource(body);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async get(req, res, next) {
    try {
      const id = Number(req.params.id);
      const row = await Resources.get(id);
      if (!row) return res.status(404).json({ error: 'Resource not found' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const row = await Resources.updateResource(id, req.body || {});
      if (!row) return res.status(404).json({ error: 'Resource not found' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await Resources.deleteResource(id);
      res.status(204).end();
    } catch (e) { next(e); }
  },

  // Fotos
  async addPhoto(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { url } = req.body || {};
      if (!url) return res.status(400).json({ error: 'url requerida' });
      const row = await Resources.addPhoto(id, url);
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async listPhotos(req, res, next) {
    try {
      const id = Number(req.params.id);
      const rows = await Resources.listPhotos(id);
      res.json(rows);
    } catch (e) { next(e); }
  },

  // request_url (enlace a solicitud desde ficha)
  async setRequestUrl(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { request_url } = req.body || {};
      const row = await Resources.updateResource(id, { request_url });
      if (!row) return res.status(404).json({ error: 'Resource not found' });
      res.json(row);
    } catch (e) { next(e); }
  },
};

module.exports = ResourcesController;

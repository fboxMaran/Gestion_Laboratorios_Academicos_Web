// apps/api/src/controllers/users.controller.js
const Users = require('../models/users.model');

const UsersController = {
  async me(req, res, next) {
    try {
      const row = await Users.getById(req.user.id);
      if (!row) return res.status(404).json({ error: 'Usuario no encontrado' });
      res.json(row);
    } catch (e) { next(e); }
  },

  async updateMe(req, res, next) {
    try {
      // ✅ usar el nombre real del método del model
      const row = await Users.updateProfile(req.user.id, req.body || {});
      // opcional pero recomendado: propagar a requests
      if (row) await Users.propagateToRequests(req.user.id);
      res.json(row);
    } catch (e) { next(e); }
  },

  async myTrainings(req, res, next) {
    try {
      // ✅ nombre correcto en el model
      const rows = await Users.listTrainings(req.user.id);
      res.json(rows);
    } catch (e) { next(e); }
  },

  async upsertTraining(req, res, next) {
    try {
      const row = await Users.upsertTraining(req.user.id, req.body || {});
      res.status(201).json(row);
    } catch (e) { next(e); }
  },

  async labRequirements(req, res, next) {
    try {
      const lab_id = Number(req.query.lab_id);
      if (!lab_id) return res.status(400).json({ error: 'lab_id es requerido' });
      // ✅ nombre y orden de parámetros correctos
      const r = await Users.labRequirements(lab_id, req.user.id);
      res.json(r);
    } catch (e) { next(e); }
  },
};

module.exports = UsersController;

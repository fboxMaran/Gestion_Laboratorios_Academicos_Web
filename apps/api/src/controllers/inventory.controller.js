// apps/api/src/controllers/inventory.controller.js
const Inventory = require('../models/inventory.model');

const InventoryController = {
  // Consumibles
  async listConsumables(req, res, next) {
    try {
      const rows = await Inventory.listConsumables({ lab_id: req.query.lab_id ? Number(req.query.lab_id) : undefined });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async moveConsumable(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { lab_id, user_id, type, qty, reason, notes } = req.body || {};
      const r = await Inventory.moveConsumable({ consumable_id: id, lab_id, user_id, type, qty, reason, notes });
      res.status(201).json(r);
    } catch (e) { next(e); }
  },

  // Equipos fijos (cambio de estado como movimiento INFO)
  async updateFixedStatus(req, res, next) {
    try {
      const id = Number(req.params.id);
      const { lab_id, status, notes, reason, user_id } = req.body || {};
      const mv = await Inventory.updateFixedStatus({ fixed_id: id, lab_id, status, notes, reason, user_id });
      res.json(mv);
    } catch (e) { next(e); }
  },

  // Movimientos (listado)
  async listMovements(req, res, next) {
    try {
      const { lab_id, fixed_id, consumable_id, limit } = req.query;
      const rows = await Inventory.listMovements({
        lab_id: lab_id ? Number(lab_id) : undefined,
        fixed_id: fixed_id ? Number(fixed_id) : undefined,
        consumable_id: consumable_id ? Number(consumable_id) : undefined,
        limit: limit ? Number(limit) : 100
      });
      res.json(rows);
    } catch (e) { next(e); }
  },
};

module.exports = InventoryController;

const Availability = require('../models/availability.model');

const AvailabilityController = {
  async createSlot(req, res, next) {
    try {
      const slot = await Availability.createSlot({
        lab_id: Number(req.params.labId),
        resource_id: req.body.resource_id || null,
        starts_at: req.body.starts_at,
        ends_at: req.body.ends_at,
        status: req.body.status,           // 'DISPONIBLE','RESERVADO','MANTENIMIENTO','INACTIVO','BLOQUEADO','EXCLUSIVO'
        title: req.body.title,
        reason: req.body.reason,
        created_by: req.body.user_id || null
      });
      res.status(201).json(slot);
    } catch (e) { next(e); }
  },

  async listSlots(req, res, next) {
    try {
      const { from, to, resource_id } = req.query;
      const rows = await Availability.listSlots({
        lab_id: Number(req.params.labId),
        resource_id: resource_id ? Number(resource_id) : undefined,
        from, to
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async updateSlotStatus(req, res, next) {
    try {
      const slot = await Availability.updateSlotStatus(Number(req.params.id), {
        status: req.body.status,
        user_id: req.body.user_id || null
      });
      if (!slot) return res.status(404).json({ error: 'Slot not found' });
      res.json(slot);
    } catch (e) { next(e); }
  },

  async deleteSlot(req, res, next) {
    try {
      const ok = await Availability.deleteSlot(Number(req.params.id), req.body.user_id || null);
      res.status(ok ? 204 : 404).end();
    } catch (e) { next(e); }
  },

  // Subscriptions
  async subscribe(req, res, next) {
    try { res.status(201).json(await Availability.subscribe(req.body)); }
    catch (e) { next(e); }
  },
  async listSubscriptions(req, res, next) {
    try { res.json(await Availability.listSubscriptions({ user_id: Number(req.query.user_id) })); }
    catch (e) { next(e); }
  },

  // Changelog
  async changelog(req, res, next) {
    try {
      res.json(await Availability.listChangelog({
        entity_type: req.query.entity_type, entity_id: Number(req.query.entity_id)
      }));
    } catch (e) { next(e); }
  }
};

module.exports = AvailabilityController;

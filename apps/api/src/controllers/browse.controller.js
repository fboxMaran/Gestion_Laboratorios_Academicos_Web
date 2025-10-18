const Browse = require('../models/browse.model');

const BrowseController = {
  async labs(req, res, next) {
    try {
      const { q, location } = req.query;
      const user_id = req.user?.id || null;
      const rows = await Browse.searchLabs({ q, location, user_id });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async resources(req, res, next) {
    try {
      const { lab_id, type_id, q, from, to, show_all, only_eligible } = req.query;
      const user_id = req.user?.id || null;
      const rows = await Browse.searchResources({
        lab_id: lab_id ? Number(lab_id) : undefined,
        type_id: type_id ? Number(type_id) : undefined,
        q,
        date_from: from,
        date_to: to,
        show_all: String(show_all||'').toLowerCase()==='true',
        user_id,
        only_eligible: String(only_eligible||'true').toLowerCase()!=='false'
      });
      res.json(rows);
    } catch (e) { next(e); }
  },

  async calendar(req, res, next) {
    try {
      const { lab_id, resource_id, from, to } = req.query;
      const rows = await Browse.calendar({
        lab_id: Number(lab_id),
        resource_id: resource_id ? Number(resource_id) : undefined,
        date_from: from,
        date_to: to
      });
      res.json(rows);
    } catch (e) { next(e); }
  },
};

module.exports = BrowseController;

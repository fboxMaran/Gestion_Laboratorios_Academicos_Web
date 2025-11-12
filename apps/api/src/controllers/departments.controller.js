// apps/api/src/controllers/departments.controller.js
const school_department = require('../models/departments.model');

const DepartmentsController = {
  async create(req, res, next) {
    try {
      const dept = await Departments.create(req.body);
      res.status(201).json(dept);
    } catch (e) { next(e); }
  },

  async list(_req, res, next) {
    try {
      const list = await Departments.list();
      res.json(list);
    } catch (e) { next(e); }
  }
};

module.exports = DepartmentsController;

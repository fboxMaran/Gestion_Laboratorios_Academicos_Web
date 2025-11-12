// apps/api/src/models/departments.model.js
const { pool } = require('../db/pool');

const DepartmentsModel = {
  async create({ name, email_domain }) {
    const q = `INSERT INTO school_department (name, email_domain)
               VALUES ($1,$2) RETURNING *`;
    const { rows } = await pool.query(q, [name, email_domain]);
    return rows[0];
  },

  async list() {
    const { rows } = await pool.query(`SELECT * FROM school_department ORDER BY name ASC`);
    return rows;
  }
};

module.exports = DepartmentsModel;

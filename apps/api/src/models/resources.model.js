// apps/api/src/models/resource_types.model.js
const { pool } = require('../db/pool');

const ResourceTypes = {
  async list() {
    // No referenciamos created_at/updated_at
    const { rows } = await pool.query(
      `SELECT id, name
       FROM resource_types
       ORDER BY name ASC`
    );
    return rows;
  },

  async create({ name }) {
    // No pedimos created_at en el RETURNING
    const { rows } = await pool.query(
      `INSERT INTO resource_types (name)
       VALUES ($1)
       RETURNING id, name`,
      [name]
    );
    return rows[0];
  },

  async getById(id) {
    const { rows } = await pool.query(
      `SELECT id, name
       FROM resource_types
       WHERE id = $1`,
      [id]
    );
    return rows[0] || null;
  },

  async remove(id) {
    await pool.query(`DELETE FROM resource_types WHERE id = $1`, [id]);
    return true;
  },
};

module.exports = ResourceTypes;

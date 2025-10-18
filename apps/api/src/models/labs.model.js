// apps/api/src/models/labs.model.js
const { pool } = require('../db/pool');

const LabsModel = {
  // LABS
  async createLab(data) {
    const { department_id, code, name, location, description } = data;
    const q = `INSERT INTO labs (department_id, code, name, location, description)
               VALUES ($1,$2,$3,$4,$5)
               RETURNING *`;
    const { rows } = await pool.query(q, [department_id, code, name, location, description || null]);
    return rows[0];
  },

  async listLabs() {
    const q = `SELECT l.*, d.name AS department_name
               FROM labs l
               JOIN departments d ON d.id = l.department_id
               ORDER BY l.name ASC`;
    const { rows } = await pool.query(q);
    return rows;
  },

  async getLab(id) {
    const q = `SELECT l.*, d.name AS department_name
               FROM labs l
               JOIN departments d ON d.id = l.department_id
               WHERE l.id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },

  async updateLab(id, data) {
    const { code, name, location, description, department_id } = data;
    const q = `UPDATE labs
               SET code = COALESCE($2, code),
                   name = COALESCE($3, name),
                   location = COALESCE($4, location),
                   description = COALESCE($5, description),
                   department_id = COALESCE($6, department_id),
                   updated_at = NOW()
               WHERE id = $1
               RETURNING *`;
    const { rows } = await pool.query(q, [id, code, name, location, description, department_id]);
    return rows[0];
  },

  async deleteLab(id) {
    await pool.query(`DELETE FROM labs WHERE id = $1`, [id]);
    return true;
  },

  // CONTACTS
  async addContact(lab_id, { name, role, phone, email }) {
    const q = `INSERT INTO lab_contacts (lab_id, name, role, phone, email)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, name, role, phone || null, email]);
    return rows[0];
  },

  async listContacts(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM lab_contacts WHERE lab_id = $1 ORDER BY created_at DESC`, [lab_id]);
    return rows;
  },

  async upsertPolicies(lab_id, { academic_requirements, safety_requirements, capacity_max }) {
    const q = `
      INSERT INTO lab_policies (lab_id, academic_requirements, safety_requirements, capacity_max)
      VALUES ($1,$2,$3,$4)
      ON CONFLICT (lab_id) DO UPDATE
      SET academic_requirements = EXCLUDED.academic_requirements,
          safety_requirements   = EXCLUDED.safety_requirements,
          capacity_max          = EXCLUDED.capacity_max,
          updated_at = NOW()
      RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, academic_requirements || null, safety_requirements || null, capacity_max || null]);
    return rows[0];
  },

  async getPolicies(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM lab_policies WHERE lab_id = $1`, [lab_id]);
    return rows[0] || null;
  },

  async setHours(lab_id, hoursArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (const h of hoursArray) {
        await client.query(`
          INSERT INTO lab_hours (lab_id, day_of_week, opens, closes)
          VALUES ($1,$2,$3,$4)
          ON CONFLICT (lab_id, day_of_week) DO UPDATE
          SET opens = EXCLUDED.opens, closes = EXCLUDED.closes
        `, [lab_id, h.day_of_week, h.opens, h.closes]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    const { rows } = await pool.query(`SELECT * FROM lab_hours WHERE lab_id = $1 ORDER BY day_of_week ASC`, [lab_id]);
    return rows;
  },

  async getHours(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM lab_hours WHERE lab_id = $1 ORDER BY day_of_week ASC`, [lab_id]);
    return rows;
  },

  async addFixedResource(lab_id, { name, inventory_code, status, last_maintenance_date }) {
    const q = `INSERT INTO resources_fixed (lab_id, name, inventory_code, status, last_maintenance_date)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, name, inventory_code, status || 'DISPONIBLE', last_maintenance_date || null]);
    return rows[0];
  },

  async listFixedResources(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM resources_fixed WHERE lab_id = $1 ORDER BY name ASC`, [lab_id]);
    return rows;
  },

  async addConsumable(lab_id, { name, unit, reorder_point, qty_available }) {
    const q = `INSERT INTO consumables (lab_id, name, unit, reorder_point, qty_available)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, name, unit, reorder_point ?? 0, qty_available ?? 0]);
    return rows[0];
  },

  async listConsumables(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM consumables WHERE lab_id = $1 ORDER BY name ASC`, [lab_id]);
    return rows;
  },

  async addHistory(lab_id, { user_id, action, detail }) {
    const q = `INSERT INTO lab_history (lab_id, user_id, action, detail)
               VALUES ($1,$2,$3,$4) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, user_id || null, action, detail ? JSON.stringify(detail) : null]);
    return rows[0];
  },

  async listHistory(lab_id) {
    const { rows } = await pool.query(`SELECT * FROM lab_history WHERE lab_id = $1 ORDER BY created_at DESC`, [lab_id]);
    return rows;
  },
};

module.exports = LabsModel;

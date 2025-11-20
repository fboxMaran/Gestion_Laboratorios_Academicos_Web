// apps/api/src/models/labs.model.js
const { pool } = require('../db/pool');

const LabsModel = {
  // LABS
  async createLab(data) {
    const { department_id, code, name, location, description } = data;
    // Mapear department_id a school_dept_id y code a internal_code según el schema
    const q = `INSERT INTO lab (school_dept_id, internal_code, name, location, description)
               VALUES ($1,$2,$3,$4,$5)
               RETURNING *`;
    const { rows } = await pool.query(q, [department_id, code, name, location, description || null]);
    return rows[0];
  },

  async listLabs() {
    const q = `SELECT 
                 l.id,
                 l.name,
                 l.internal_code as code,
                 l.school_dept_id as department_id,
                 l.email_contact,
                 l.location,
                 l.description,
                 l.capacity_max,
                 l.created_at,
                 l.updated_at,
                 d.name AS department_name
               FROM lab l
               JOIN school_department d ON d.id = l.school_dept_id
               ORDER BY l.name ASC`;
    const { rows } = await pool.query(q);
    return rows;
  },

  /**
   * Obtiene los laboratorios asociados a un usuario
   * Busca por:
   * 1. Email del usuario en lab_responsible
   * 2. Departamento del usuario (si tiene school_dept_id)
   * 3. Rol de administrador (acceso a todos)
   */
  async getUserLabs(userId, userEmail, userRole, userDeptId) {
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    // Si es administrador, devolver todos los laboratorios
    if (userRole === 'Administrador' || userRole === 'ADMIN') {
      return this.listLabs();
    }

    // 1. Buscar por email en lab_responsible
    if (userEmail) {
      conditions.push(`EXISTS (
        SELECT 1 FROM lab_responsible lr 
        WHERE lr.lab_id = l.id 
        AND LOWER(lr.email) = LOWER($${paramIndex})
      )`);
      params.push(userEmail);
      paramIndex++;
    }

    // 2. Buscar por departamento del usuario
    if (userDeptId) {
      conditions.push(`l.school_dept_id = $${paramIndex}`);
      params.push(userDeptId);
      paramIndex++;
    }

    // Si no hay condiciones, devolver array vacío
    if (conditions.length === 0) {
      return [];
    }

    const whereClause = conditions.join(' OR ');
    const q = `SELECT DISTINCT 
                 l.id,
                 l.name,
                 l.internal_code as code,
                 l.school_dept_id as department_id,
                 l.email_contact,
                 l.location,
                 l.description,
                 l.capacity_max,
                 l.created_at,
                 l.updated_at,
                 d.name AS department_name
               FROM lab l
               JOIN school_department d ON d.id = l.school_dept_id
               WHERE ${whereClause}
               ORDER BY l.name ASC`;

    const { rows } = await pool.query(q, params);
    return rows;
  },

  async getLab(id) {
    const q = `SELECT 
                 l.id,
                 l.name,
                 l.internal_code as code,
                 l.school_dept_id as department_id,
                 l.email_contact,
                 l.location,
                 l.description,
                 l.capacity_max,
                 l.created_at,
                 l.updated_at,
                 d.name AS department_name
               FROM lab l
               JOIN school_department d ON d.id = l.school_dept_id
               WHERE l.id = $1`;
    const { rows } = await pool.query(q, [id]);
    return rows[0] || null;
  },

  async updateLab(id, data) {
    const { code, name, location, description, department_id } = data;
    const q = `UPDATE lab
               SET internal_code = COALESCE($2, internal_code),
                   name = COALESCE($3, name),
                   location = COALESCE($4, location),
                   description = COALESCE($5, description),
                   school_dept_id = COALESCE($6, school_dept_id),
                   updated_at = NOW()
               WHERE id = $1
               RETURNING 
                 id,
                 name,
                 internal_code as code,
                 school_dept_id as department_id,
                 email_contact,
                 location,
                 description,
                 capacity_max,
                 created_at,
                 updated_at`;
    const { rows } = await pool.query(q, [id, code, name, location, description, department_id]);
    return rows[0];
  },

  async deleteLab(id) {
    await pool.query(`DELETE FROM lab WHERE id = $1`, [id]);
    return true;
  },

  // CONTACTS
  async addContact(lab_id, { name, role, phone, email }) {
    // Mapear role a position_title según el schema
    const q = `INSERT INTO lab_responsible (lab_id, full_name, position_title, phone, email)
               VALUES ($1,$2,$3,$4,$5) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, name, role, phone || null, email]);
    // Mapear de vuelta para compatibilidad
    return rows[0] ? {
      ...rows[0],
      name: rows[0].full_name,
      role: rows[0].position_title
    } : null;
  },

  async listContacts(lab_id) {
    const { rows } = await pool.query(
      `SELECT 
         id,
         lab_id,
         full_name as name,
         position_title as role,
         phone,
         email,
         is_primary,
         created_at
       FROM lab_responsible 
       WHERE lab_id = $1 
       ORDER BY created_at DESC`, 
      [lab_id]
    );
    return rows;
  },

  async updateContact(lab_id, contact_id, { name, role, phone, email }) {
    const q = `UPDATE lab_responsible
               SET full_name = COALESCE($3, full_name),
                   position_title = COALESCE($4, position_title),
                   phone = COALESCE($5, phone),
                   email = COALESCE($6, email)
               WHERE id = $2 AND lab_id = $1
               RETURNING 
                 id,
                 lab_id,
                 full_name,
                 position_title,
                 phone,
                 email,
                 is_primary,
                 created_at`;
    const { rows } = await pool.query(q, [lab_id, contact_id, name, role, phone, email]);
    // Mapear de vuelta para compatibilidad
    return rows[0] ? {
      ...rows[0],
      name: rows[0].full_name,
      role: rows[0].position_title
    } : null;
  },

  async deleteContact(lab_id, contact_id) {
    const { rowCount } = await pool.query(
      `DELETE FROM lab_responsible WHERE id = $2 AND lab_id = $1`,
      [lab_id, contact_id]
    );
    return rowCount > 0;
  },

  async upsertPolicies(lab_id, { academic_requirements, safety_requirements, capacity_max }) {
    const q = `
      INSERT INTO lab_policy (lab_id, academic_requirements, safety_requirements, capacity_max)
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
    const { rows } = await pool.query(`SELECT * FROM lab_policy WHERE lab_id = $1`, [lab_id]);
    return rows[0] || null;
  },

  async setHours(lab_id, hoursArray) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      // Eliminar horarios existentes primero
      await client.query(`DELETE FROM lab_open_hours WHERE lab_id = $1`, [lab_id]);
      
      for (const h of hoursArray) {
        // Mapear day_of_week a weekday, opens a time_start, closes a time_end
        await client.query(`
          INSERT INTO lab_open_hours (lab_id, weekday, time_start, time_end)
          VALUES ($1, $2, $3, $4)
        `, [lab_id, h.day_of_week || h.weekday, h.opens || h.time_start, h.closes || h.time_end]);
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
    // Retornar con mapeo para compatibilidad
    const { rows } = await pool.query(
      `SELECT 
         id,
         lab_id,
         weekday as day_of_week,
         time_start as opens,
         time_end as closes
       FROM lab_open_hours 
       WHERE lab_id = $1 
       ORDER BY weekday ASC`, 
      [lab_id]
    );
    return rows;
  },

  async getHours(lab_id) {
    const { rows } = await pool.query(
      `SELECT 
         id,
         lab_id,
         weekday as day_of_week,
         time_start as opens,
         time_end as closes
       FROM lab_open_hours 
       WHERE lab_id = $1 
       ORDER BY weekday ASC`, 
      [lab_id]
    );
    return rows;
  },

  async addFixedResource(lab_id, { name, inventory_code, status, last_maintenance_date, description }) {
    // Mapear status a state según el schema, y agregar type='EQUIPMENT'
    const state = status || 'DISPONIBLE';
    const q = `INSERT INTO resource (lab_id, type, name, inventory_code, state, last_maintenance, description)
               VALUES ($1, 'EQUIPMENT', $2, $3, $4, $5, $6) 
               RETURNING 
                 id,
                 lab_id,
                 type,
                 name,
                 inventory_code,
                 state,
                 location,
                 last_maintenance as last_maintenance_date,
                 tech_sheet,
                 description,
                 created_at,
                 updated_at`;
    const { rows } = await pool.query(q, [lab_id, name, inventory_code, state, last_maintenance_date || null, description || null]);
    // Mapear state a status para compatibilidad
    return rows[0] ? {
      ...rows[0],
      status: rows[0].state
    } : null;
  },

  async listFixedResources(lab_id) {
    const { rows } = await pool.query(
      `SELECT 
         id,
         lab_id,
         type,
         name,
         inventory_code,
         state,
         location,
         last_maintenance as last_maintenance_date,
         tech_sheet,
         description,
         created_at,
         updated_at
       FROM resource 
       WHERE lab_id = $1 AND type = 'EQUIPMENT'
       ORDER BY name ASC`, 
      [lab_id]
    );
    // Mapear state a status para compatibilidad
    return rows.map(row => ({
      ...row,
      status: row.state
    }));
  },

  async updateFixedResource(lab_id, resource_id, { name, inventory_code, status, last_maintenance_date, description }) {
    // Mapear status a state
    const q = `UPDATE resource
               SET name = COALESCE($3, name),
                   inventory_code = COALESCE($4, inventory_code),
                   state = COALESCE($5, state),
                   last_maintenance = COALESCE($6, last_maintenance),
                   description = COALESCE($7, description),
                   updated_at = NOW()
               WHERE id = $2 AND lab_id = $1 AND type = 'EQUIPMENT'
               RETURNING 
                 id,
                 lab_id,
                 type,
                 name,
                 inventory_code,
                 state,
                 location,
                 last_maintenance,
                 tech_sheet,
                 description,
                 created_at,
                 updated_at`;
    const { rows } = await pool.query(q, [lab_id, resource_id, name, inventory_code, status, last_maintenance_date, description]);
    // Mapear state a status para compatibilidad
    return rows[0] ? {
      ...rows[0],
      status: rows[0].state,
      last_maintenance_date: rows[0].last_maintenance
    } : null;
  },

  async deleteFixedResource(lab_id, resource_id) {
    const { rowCount } = await pool.query(
      `DELETE FROM resource WHERE id = $2 AND lab_id = $1`,
      [lab_id, resource_id]
    );
    return rowCount > 0;
  },

  async addConsumable(lab_id, { name, unit, reorder_point, qty_available, description }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Crear el recurso con type='CONSUMABLE'
      const resourceQ = `INSERT INTO resource (lab_id, type, name, description)
                         VALUES ($1, 'CONSUMABLE', $2, $3)
                         RETURNING id`;
      const { rows: resourceRows } = await client.query(resourceQ, [lab_id, name, description || null]);
      const resourceId = resourceRows[0].id;
      
      // 2. Crear el registro en consumable_stock
      const stockQ = `INSERT INTO consumable_stock (resource_id, unit, qty_available, reorder_point)
                      VALUES ($1, $2, $3, $4)
                      RETURNING *`;
      const { rows: stockRows } = await client.query(stockQ, [
        resourceId, 
        unit, 
        qty_available ?? 0, 
        reorder_point ?? 0
      ]);
      
      await client.query('COMMIT');
      
      // Obtener el recurso completo
      const { rows } = await pool.query(
        `SELECT 
           r.id,
           r.lab_id,
           r.type,
           r.name,
           r.description,
           cs.unit,
           cs.qty_available,
           cs.reorder_point,
           r.created_at,
           r.updated_at
         FROM resource r
         JOIN consumable_stock cs ON cs.resource_id = r.id
         WHERE r.id = $1`,
        [resourceId]
      );
      
      return rows[0] ? {
        ...rows[0],
        quantity: rows[0].qty_available
      } : null;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async listConsumables(lab_id) {
    const { rows } = await pool.query(
      `SELECT 
         r.id,
         r.lab_id,
         r.type,
         r.name,
         r.description,
         cs.unit,
         cs.qty_available,
         cs.reorder_point,
         r.created_at,
         r.updated_at
       FROM resource r
       JOIN consumable_stock cs ON cs.resource_id = r.id
       WHERE r.lab_id = $1 AND r.type = 'CONSUMABLE'
       ORDER BY r.name ASC`,
      [lab_id]
    );
    // Mapear qty_available a quantity para compatibilidad
    return rows.map(row => ({
      ...row,
      quantity: row.qty_available
    }));
  },

  async updateConsumable(lab_id, consumable_id, { name, unit, reorder_point, qty_available, description }) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      // 1. Actualizar el recurso
      if (name || description !== undefined) {
        await client.query(
          `UPDATE resource
           SET name = COALESCE($3, name),
               description = COALESCE($4, description),
               updated_at = NOW()
           WHERE id = $2 AND lab_id = $1 AND type = 'CONSUMABLE'`,
          [lab_id, consumable_id, name, description]
        );
      }
      
      // 2. Actualizar consumable_stock
      if (unit || reorder_point !== undefined || qty_available !== undefined) {
        await client.query(
          `UPDATE consumable_stock
           SET unit = COALESCE($3, unit),
               reorder_point = COALESCE($4, reorder_point),
               qty_available = COALESCE($5, qty_available)
           WHERE resource_id = $2`,
          [lab_id, consumable_id, unit, reorder_point, qty_available]
        );
      }
      
      await client.query('COMMIT');
      
      // Obtener el recurso actualizado
      const { rows } = await pool.query(
        `SELECT 
           r.id,
           r.lab_id,
           r.type,
           r.name,
           r.description,
           cs.unit,
           cs.qty_available,
           cs.reorder_point,
           r.created_at,
           r.updated_at
         FROM resource r
         JOIN consumable_stock cs ON cs.resource_id = r.id
         WHERE r.id = $1 AND r.lab_id = $2 AND r.type = 'CONSUMABLE'`,
        [consumable_id, lab_id]
      );
      
      return rows[0] ? {
        ...rows[0],
        quantity: rows[0].qty_available
      } : null;
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  },

  async deleteConsumable(lab_id, consumable_id) {
    // Al eliminar el resource, se elimina automáticamente el consumable_stock por CASCADE
    const { rowCount } = await pool.query(
      `DELETE FROM resource WHERE id = $2 AND lab_id = $1 AND type = 'CONSUMABLE'`,
      [lab_id, consumable_id]
    );
    return rowCount > 0;
  },

  async addHistory(lab_id, { user_id, action, detail }) {
    const q = `INSERT INTO lab_history (lab_id, actor_user_id, action_type, detail)
               VALUES ($1,$2,$3,$4) RETURNING *`;
    const { rows } = await pool.query(q, [lab_id, user_id || null, action, detail ? JSON.stringify(detail) : null]);
    return rows[0];
  },

  async listHistory(lab_id) {
    const q = `SELECT 
                 lh.*,
                 u.full_name as user_name,
                 u.email as user_email
               FROM lab_history lh
               LEFT JOIN app_user u ON u.id = lh.actor_user_id
               WHERE lh.lab_id = $1 
               ORDER BY lh.created_at DESC`;
    const { rows } = await pool.query(q, [lab_id]);
    // Mapear campos para compatibilidad
    return rows.map(row => ({
      id: row.id,
      lab_id: row.lab_id,
      user_id: row.actor_user_id,
      user_name: row.user_name,
      user_email: row.user_email,
      action: row.action_type,
      action_type: row.action_type,
      detail: row.detail,
      created_at: row.created_at,
      date: row.created_at
    }));
  },
};

module.exports = LabsModel;
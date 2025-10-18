// apps/api/src/controllers/labs.controller.js
const Labs = require('../models/labs.model');
const { pool } = require('../db/pool');

/**
 * Traduce errores de Postgres a respuestas HTTP legibles.
 */
function handlePgError(res, e) {
  // FK violada
  if (e.code === '23503') {
    const c = String(e.constraint || '');
    // labs.department_id -> departments.id
    if (c.includes('labs_department_id_fkey')) {
      return res.status(400).json({ error: 'department_id inválido: no existe en departments' });
    }
    // contactos/horarios/recursos/consumibles apuntando a lab inexistente
    if (
      c.includes('lab_contacts_lab_id_fkey') ||
      c.includes('lab_policies_lab_id_fkey') ||
      c.includes('lab_hours_lab_id_fkey') ||
      c.includes('resources_fixed_lab_id_fkey') ||
      c.includes('consumables_lab_id_fkey') ||
      c.includes('lab_history_lab_id_fkey')
    ) {
      return res.status(404).json({ error: 'Lab no encontrado (lab_id inválido)' });
    }
  }

  // Unique duplicado
  if (e.code === '23505') {
    // Por ejemplo: labs.code UNIQUE
    return res.status(409).json({
      error: 'Conflicto de duplicado',
      detail: e.detail || e.message,
      constraint: e.constraint || undefined,
    });
  }

  // Otro error -> lo maneja el error handler global
  throw e;
}

/**
 * Verifica que exista un department antes de crear/actualizar un lab.
 */
async function assertDepartmentExists(department_id) {
  if (!department_id) return false;
  const { rows } = await pool.query(`SELECT 1 FROM departments WHERE id = $1`, [department_id]);
  return rows.length > 0;
}

const LabsController = {
  // LABS
  async create(req, res, next) {
    try {
      const depId = req.body?.department_id;
      if (!depId) {
        return res.status(400).json({ error: 'department_id es requerido' });
      }
      const exists = await assertDepartmentExists(depId);
      if (!exists) {
        return res.status(400).json({ error: 'department_id inválido: no existe en departments' });
      }

      const lab = await Labs.createLab(req.body);
      await Labs.addHistory(lab.id, { action: 'CREATE_LAB', detail: lab });
      return res.status(201).json(lab);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async list(_req, res, next) {
    try {
      const rows = await Labs.listLabs();
      return res.json(rows);
    } catch (e) { return next(e); }
  },

  async get(req, res, next) {
    try {
      const lab = await Labs.getLab(req.params.id);
      if (!lab) return res.status(404).json({ error: 'Lab not found' });
      return res.json(lab);
    } catch (e) { return next(e); }
  },

  async update(req, res, next) {
    try {
      // Si viene department_id, validar
      if (req.body?.department_id) {
        const ok = await assertDepartmentExists(req.body.department_id);
        if (!ok) {
          return res.status(400).json({ error: 'department_id inválido: no existe en departments' });
        }
      }

      const lab = await Labs.updateLab(req.params.id, req.body);
      if (!lab) return res.status(404).json({ error: 'Lab not found' });
      await Labs.addHistory(lab.id, { action: 'UPDATE_LAB', detail: req.body });
      return res.json(lab);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async remove(req, res, next) {
    try {
      const id = Number(req.params.id);
      await Labs.deleteLab(id);
      await Labs.addHistory(id, { action: 'DELETE_LAB', detail: { id } });
      return res.status(204).end();
    } catch (e) { return next(e); }
  },

  // CONTACTS
  async addContact(req, res, next) {
    try {
      const row = await Labs.addContact(req.params.id, req.body);
      await Labs.addHistory(req.params.id, { action: 'ADD_CONTACT', detail: row });
      return res.status(201).json(row);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async listContacts(req, res, next) {
    try {
      const rows = await Labs.listContacts(req.params.id);
      return res.json(rows);
    } catch (e) { return next(e); }
  },

  // POLICIES
  async upsertPolicies(req, res, next) {
    try {
      const row = await Labs.upsertPolicies(req.params.id, req.body);
      await Labs.addHistory(req.params.id, { action: 'UPSERT_POLICIES', detail: row });
      return res.json(row);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async getPolicies(req, res, next) {
    try {
      const row = await Labs.getPolicies(req.params.id);
      return res.json(row || {});
    } catch (e) { return next(e); }
  },

  // HOURS
  async setHours(req, res, next) {
    try {
      const rows = await Labs.setHours(req.params.id, req.body?.hours || []);
      await Labs.addHistory(req.params.id, { action: 'SET_HOURS', detail: rows });
      return res.json(rows);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async getHours(req, res, next) {
    try {
      const rows = await Labs.getHours(req.params.id);
      return res.json(rows);
    } catch (e) { return next(e); }
  },

  // FIXED RESOURCES
  async addFixedResource(req, res, next) {
    try {
      const row = await Labs.addFixedResource(req.params.id, req.body);
      await Labs.addHistory(req.params.id, { action: 'ADD_FIXED_RESOURCE', detail: row });
      return res.status(201).json(row);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async listFixedResources(req, res, next) {
    try {
      const rows = await Labs.listFixedResources(req.params.id);
      return res.json(rows);
    } catch (e) { return next(e); }
  },

  // CONSUMABLES
  async addConsumable(req, res, next) {
    try {
      const row = await Labs.addConsumable(req.params.id, req.body);
      await Labs.addHistory(req.params.id, { action: 'ADD_CONSUMABLE', detail: row });
      return res.status(201).json(row);
    } catch (e) {
      try { return handlePgError(res, e); }
      catch (err) { return next(err); }
    }
  },

  async listConsumables(req, res, next) {
    try {
      const rows = await Labs.listConsumables(req.params.id);
      return res.json(rows);
    } catch (e) { return next(e); }
  },

  // HISTORY
  async history(req, res, next) {
    try {
      const rows = await Labs.listHistory(req.params.id);
      return res.json(rows);
    } catch (e) { return next(e); }
  },
};

module.exports = LabsController;

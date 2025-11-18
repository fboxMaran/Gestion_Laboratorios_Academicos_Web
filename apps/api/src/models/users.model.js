const { pool } = require('../db/pool');

const UsersModel = {
  async getById(id) {
    const { rows } = await pool.query(
      `SELECT 
        u.id, 
        r.name as role, 
        u.email, 
        u.full_name as name, 
        u.id_code as student_id,
        u.career_or_dept as department, 
        u.school_dept_id,
        u.phone, 
        u.is_active, 
        u.created_at, 
        u.updated_at
       FROM app_user u
       LEFT JOIN role r ON u.role_id = r.id
       WHERE u.id = $1`, [id]
    );
    return rows[0] || null;
  },

  async updateProfile(id, payload) {
    console.log('[Users Model] updateProfile - ID:', id, 'Payload:', payload);
    
    // Mapeo de campos del frontend a la base de datos
    const fieldMap = {
      'name': 'full_name',
      'phone': 'phone',
      'department': 'career_or_dept'
    };
    
    const sets = []; 
    const args = [];
    
    Object.keys(payload).forEach((k) => {
      const dbField = fieldMap[k];
      if (dbField && Object.prototype.hasOwnProperty.call(payload, k)) {
        args.push(payload[k] ?? null);
        sets.push(`${dbField} = $${args.length}`);
      }
    });
    
    if (!sets.length) {
      console.log('[Users Model] No hay campos para actualizar, devolviendo perfil actual');
      return this.getById(id);
    }

    args.push(id);
    console.log('[Users Model] Ejecutando UPDATE con:', { sets: sets.join(', '), args });
    
    const { rows } = await pool.query(
      `UPDATE app_user SET ${sets.join(', ')}, updated_at = NOW() WHERE id = $${args.length} RETURNING *`,
      args
    );
    
    console.log('[Users Model] Usuario actualizado:', rows[0]);
    
    // Devolver el perfil actualizado con los mismos campos que getById
    return this.getById(id);
  },

  // Requisitos de capacitación por laboratorio (+ estado del usuario)
  async labRequirements(lab_id, user_id) {
    const reqQ = await pool.query(
      `SELECT ltr.training_id, tc.code, tc.name, tc.expires_months
         FROM lab_training_requirements ltr
         JOIN trainings_catalog tc ON tc.id = ltr.training_id
        WHERE ltr.lab_id = $1
        ORDER BY tc.name ASC`,
      [lab_id]
    );
    const reqs = reqQ.rows;

    const mineQ = await pool.query(
      `SELECT ut.training_id, tc.code, tc.name, ut.completed_at, ut.expires_at
         FROM user_trainings ut
         JOIN trainings_catalog tc ON tc.id = ut.training_id
        WHERE ut.user_id = $1`,
      [user_id]
    );
    const mine = mineQ.rows;

    const mapMine = new Map(mine.map(r => [r.training_id, r]));
    const enriched = reqs.map(r => {
      const have = mapMine.get(r.training_id);
      const valid = !!have && (!have.expires_at || new Date(have.expires_at) > new Date());
      return {
        training_id: r.training_id,
        code: r.code,
        name: r.name,
        required: true,
        have: !!have,
        valid,
        completed_at: have?.completed_at || null,
        expires_at: have?.expires_at || null,
      };
    });

    const eligible = enriched.every(e => e.valid);
    return { lab_id, user_id, eligible, items: enriched };
  },

  async upsertTraining(user_id, { training_id, completed_at, expires_at }) {
    if (!training_id) { const e = new Error('training_id es requerido'); e.status=400; throw e; }
    const { rows } = await pool.query(
      `INSERT INTO user_trainings (user_id, training_id, completed_at, expires_at)
       VALUES ($1,$2,COALESCE($3, NOW()), $4)
       ON CONFLICT (user_id, training_id)
       DO UPDATE SET completed_at = EXCLUDED.completed_at, expires_at = EXCLUDED.expires_at
       RETURNING *`,
      [user_id, training_id, completed_at || null, expires_at || null]
    );
    return rows[0];
  },

  async listTrainings(user_id) {
    const { rows } = await pool.query(
      `SELECT ut.*, tc.code, tc.name FROM user_trainings ut
       JOIN trainings_catalog tc ON tc.id = ut.training_id
       WHERE ut.user_id = $1
       ORDER BY tc.name ASC`,
      [user_id]
    );
    return rows;
  },

  // "Actualización automática": propaga datos denormalizados a request si esas request están ligadas al usuario
  async propagateToRequests(user_id) {
    await pool.query(
      `UPDATE request r
          SET updated_at = NOW()
         FROM app_user u
        WHERE r.requester_id = u.id AND u.id = $1`,
      [user_id]
    );
  },
};

module.exports = UsersModel;

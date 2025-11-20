const { pool } = require('../db/pool');

function actorId(req) { return req.user?.id || req.auth?.user?.id || null; }
async function logChange({ entity_type, entity_id, user_id, action, detail }) {
  try {
    await pool.query(
      `INSERT INTO changelog (entity_type, entity_id, user_id, action, detail)
       VALUES ($1,$2,$3,$4,$5)`,
      [entity_type, entity_id, user_id || null, action, detail ? JSON.stringify(detail) : null]
    );
  } catch {}
}

exports.list = async (_req, res) => {
  const { rows } = await pool.query(
    `SELECT key, value, updated_at FROM system_setting ORDER BY key ASC`
  );
  res.json(rows);
};

exports.get = async (req, res) => {
  const key = String(req.params.key || '').trim();
  const { rows } = await pool.query(
    `SELECT key, value, updated_by, updated_at FROM system_settings WHERE key=$1`,
    [key]
  );
  if (!rows.length) return res.status(404).json({ error: 'Key no encontrada' });
  res.json(rows[0]);
};

exports.upsert = async (req, res) => {
  console.log('LLEGÓ A UPSETT');
  const key = String(req.params.key || '').trim();
  const value = req.body?.value;
  if (typeof value === 'undefined') {
    return res.status(400).json({ error: 'Se requiere body.value (JSON)' });
  }
  const actor = actorId(req);
  const { rows } = await pool.query(
    `INSERT INTO system_settings (key, value, updated_by)
     VALUES ($1,$2,$3)
     ON CONFLICT (key) DO UPDATE
       SET value = EXCLUDED.value,
           updated_by = EXCLUDED.updated_by,
           updated_at = NOW()
     RETURNING key, value, updated_by, updated_at`,
    [key, JSON.stringify(value), actor]
  );
  await logChange({ entity_type: 'setting', entity_id: 0, user_id: actor, action: 'UPSERT', detail: { key, value } });
  res.json(rows[0]);
};

exports.updateMany = async (req, res) => {
  const items = req.body;

  if (!Array.isArray(items)) {
    return res.status(400).json({ error: 'Se esperaba un arreglo de {key, value}' });
  }

  if (!items.length) {
    return res.status(400).json({ error: 'No hay parámetros para actualizar' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    for (const item of items) {
      if (!item || !item.key) continue;

      const key = String(item.key);
      const value = item.value != null ? String(item.value) : null;

      // Asumiendo una tabla "app_setting" con columnas (key text PK, value text, updated_at timestamp)
      await client.query(
        `
        INSERT INTO system_setting (key, value, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value = EXCLUDED.value, updated_at = NOW()
        `,
        [key, value]
      );
    }

    await client.query('COMMIT');

    // Volvemos a leer los settings y los mandamos actualizados
    const { rows } = await client.query(
      'SELECT key, value, updated_at FROM system_setting ORDER BY key'
    );

    res.json(rows);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('[Settings] Error en updateMany:', error);
    res.status(500).json({ error: 'Error al actualizar configuración' });
  } finally {
    client.release();
  }
};

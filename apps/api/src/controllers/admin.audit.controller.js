const { pool } = require('../db/pool');
const { Parser } = require('json2csv');

// GET /api/admin/audit?user_id?&entity_type?&action?&from?&to?&limit?&offset?&format=csv
exports.search = async (req, res) => {
  const { user_id, entity_type, action, from, to, limit = 100, offset = 0, format } = req.query;

  const params = [];
  const where = [];

  if (user_id) {
    params.push(Number(user_id));
    where.push(`user_id = $${params.length}`);
  }
  if (entity_type) {
    params.push(String(entity_type));
    where.push(`entity_type = $${params.length}`);
  }
  if (action) {
    params.push(String(action));
    where.push(`action = $${params.length}`);
  }
  if (from) {
    params.push(new Date(from));
    where.push(`created_at >= $${params.length}`);
  }
  if (to) {
    params.push(new Date(to));
    where.push(`created_at <= $${params.length}`);
  }

  params.push(Number(limit)); const limIdx = params.length;
  params.push(Number(offset)); const offIdx = params.length;

  const sql = `
    SELECT id, entity_type, entity_id, user_id, action, detail, created_at
      FROM changelog
     ${where.length ? 'WHERE ' + where.join(' AND ') : ''}
     ORDER BY created_at DESC
     LIMIT $${limIdx} OFFSET $${offIdx}
  `;

  const { rows } = await pool.query(sql, params);

  if (String(format).toLowerCase() === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', 'attachment; filename="audit.csv"');
    return res.send(csv);
  }

  res.json(rows);
};

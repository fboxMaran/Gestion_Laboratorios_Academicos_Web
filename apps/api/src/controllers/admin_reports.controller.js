// apps/api/src/controllers/admin_reports.controller.js
const { pool } = require('../db/pool');
const { Parser } = require('json2csv');

/** Helpers */
function isAdmin(req) {
  return req.user?.role === 'ADMIN';
}
function badRequest(res, msg) {
  return res.status(400).json({ error: msg });
}
function asCsvOrJson(res, rows, filename = 'report.csv', format = 'json') {
  if ((format || '').toLowerCase() === 'csv') {
    const parser = new Parser();
    const csv = parser.parse(rows);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csv);
  }
  return res.json(rows);
}
function parseRange(req) {
  const from = req.query.from ? new Date(req.query.from) : null;
  const to   = req.query.to   ? new Date(req.query.to)   : null;
  return { from, to };
}
function dateRangeSql(filterCol, from, to) {
  const conds = [];
  const params = [];
  if (from) { params.push(from); conds.push(`${filterCol} >= $${params.length}`); }
  if (to)   { params.push(to);   conds.push(`${filterCol} <  $${params.length}`); }
  return { where: conds.length ? ` AND ${conds.join(' AND ')}` : '', params };
}
function groupExpr(groupBy, tsCol = 'ts') {
  switch ((groupBy || '').toLowerCase()) {
    case 'day':  return { expr: `date_trunc('day', ${tsCol})`, label: 'day' };
    case 'week': return { expr: `date_trunc('week', ${tsCol})`, label: 'week' };
    case 'month':
    default:
      return { expr: `date_trunc('month', ${tsCol})`, label: 'month' };
  }
}

const AdminReportsController = {
  /**
   * GET /admin/reports/usage-global?from&to&group_by=day|week|month&lab_id?&department_id?&format=csv|json
   * Regresa conteos por período:
   *  - reservas (requests APROBADA),
   *  - préstamos (resource_assignments creadas),
   *  - mantenimientos (maintenance_orders COMPLETADO).
   */
  async usageGlobal(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo ADMIN' });

    const { from, to } = parseRange(req);
    const groupBy = req.query.group_by || 'month';
    const labId = req.query.lab_id ? Number(req.query.lab_id) : null;
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;

    const tsRequests = 'r.requested_from';
    const tsAssigns  = 'ra.assigned_at';
    const tsMaint    = 'mo.completed_at';

    const g1 = groupExpr(groupBy, 'bucket'); // usar "bucket" en el SELECT final

    // Filtros WHERE + params independientes por CTE
    const { where: wReq, params: pReq } = dateRangeSql(tsRequests, from, to);
    const { where: wAsg, params: pAsg } = dateRangeSql(tsAssigns,  from, to);
    const { where: wMt , params: pMt  } = dateRangeSql(tsMaint,    from, to);

    // Filtros por lab/dep
    const labFilterReq = labId ? ' AND r.lab_id = $REQ_LAB' : '';
    const deptFilterReq = deptId ? ' AND l1.department_id = $REQ_DEPT' : '';

    const labFilterAsg = labId ? ' AND ra.lab_id = $ASG_LAB' : '';
    const deptFilterAsg = deptId ? ' AND l2.department_id = $ASG_DEPT' : '';

    const labFilterMo = labId ? ' AND mo.lab_id = $MO_LAB' : '';
    const deptFilterMo = deptId ? ' AND l3.department_id = $MO_DEPT' : '';

    // armamos SQL
    const sql = `
      WITH reqs AS (
        SELECT ${groupExpr(groupBy, tsRequests).expr} AS bucket,
               COUNT(*)::int AS reservas
          FROM requests r
          JOIN labs l1 ON l1.id = r.lab_id
         WHERE r.status = 'APROBADA' ${wReq} ${labFilterReq} ${deptFilterReq}
         GROUP BY 1
      ),
      assigns AS (
        SELECT ${groupExpr(groupBy, tsAssigns).expr} AS bucket,
               COUNT(*)::int AS prestamos
          FROM resource_assignments ra
          JOIN labs l2 ON l2.id = ra.lab_id
         WHERE 1=1 ${wAsg} ${labFilterAsg} ${deptFilterAsg}
         GROUP BY 1
      ),
      maint AS (
        SELECT ${groupExpr(groupBy, tsMaint).expr} AS bucket,
               COUNT(*)::int AS mantenimientos
          FROM maintenance_orders mo
          JOIN labs l3 ON l3.id = mo.lab_id
         WHERE mo.status = 'COMPLETADO' ${wMt} ${labFilterMo} ${deptFilterMo}
         GROUP BY 1
      )
      SELECT bucket AS period_start,
             ${g1.expr} AS period_group,
             COALESCE(r.reservas,0) AS reservas,
             COALESCE(a.prestamos,0) AS prestamos,
             COALESCE(m.mantenimientos,0) AS mantenimientos
        FROM (
          SELECT COALESCE(r.bucket, a.bucket, m.bucket) AS bucket
            FROM reqs r
            FULL OUTER JOIN assigns a ON a.bucket = r.bucket
            FULL OUTER JOIN maint   m ON m.bucket = COALESCE(r.bucket, a.bucket)
        ) b
        LEFT JOIN reqs r   ON r.bucket = b.bucket
        LEFT JOIN assigns a ON a.bucket = b.bucket
        LEFT JOIN maint m   ON m.bucket = b.bucket
       ORDER BY 1 ASC
    `;

    // construir params en orden: pReq ... + lab+dept placeholders nominales
    const params = [
      ...pReq,
      ...(labId ? [labId] : []),
      ...(deptId ? [deptId] : []),
      ...pAsg,
      ...(labId ? [labId] : []),
      ...(deptId ? [deptId] : []),
      ...pMt,
      ...(labId ? [labId] : []),
      ...(deptId ? [deptId] : []),
    ];

    // Reemplazar nombres nominales por posiciones reales
    // Simplificamos: al construir wReq/wAsg/wMt ya son posicionales; los extras lab/dept se agregan al final.
    // Ajustamos los marcadores manualmente:
    let i = 0;
    const numbered = sql
      .replace(/\$REQ_LAB/g, () => `$${(i = pReq.length + (labId ? 1 : 0), pReq.length + 1)}`)
      .replace(/\$REQ_DEPT/g, () => `$${pReq.length + (labId ? 1 : 0) + 1}`)
      .replace(/\$ASG_LAB/g, () => `$${pReq.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pAsg.length + 1}`)
      .replace(/\$ASG_DEPT/g, () => `$${pReq.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pAsg.length + (labId ? 1 : 0) + 1}`)
      .replace(/\$MO_LAB/g,  () => `$${pReq.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pAsg.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pMt.length + 1}`)
      .replace(/\$MO_DEPT/g, () => `$${pReq.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pAsg.length + (labId ? 1 : 0) + (deptId ? 1 : 0) + pMt.length + (labId ? 1 : 0) + 1}`);

    const { rows } = await pool.query(numbered, params);
    return asCsvOrJson(res, rows, 'usage_global.csv', req.query.format);
  },

  /**
   * GET /admin/reports/inventory-institutional?lab_id?&department_id?&format=csv|json
   * Resumen de inventario (resources + resources_fixed) por lab y status.
   */
  async inventoryInstitutional(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo ADMIN' });

    const labId = req.query.lab_id ? Number(req.query.lab_id) : null;
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;

    const sql = `
      WITH inv AS (
        SELECT l.id AS lab_id, l.name AS lab_name, d.id AS department_id, d.name AS department_name,
               r.status, COUNT(*)::int AS total
          FROM resources r
          JOIN labs l ON l.id = r.lab_id
          JOIN departments d ON d.id = l.department_id
         WHERE 1=1
           ${labId ? ' AND l.id = $1' : ''}
           ${deptId ? (labId ? ' AND d.id = $2' : ' AND d.id = $1') : ''}
         GROUP BY 1,2,3,4,5
        UNION ALL
        SELECT l.id AS lab_id, l.name AS lab_name, d.id AS department_id, d.name AS department_name,
               rf.status, COUNT(*)::int AS total
          FROM resources_fixed rf
          JOIN labs l ON l.id = rf.lab_id
          JOIN departments d ON d.id = l.department_id
         WHERE 1=1
           ${labId ? ' AND l.id = $1' : ''}
           ${deptId ? (labId ? ' AND d.id = $2' : ' AND d.id = $1') : ''}
         GROUP BY 1,2,3,4,5
      )
      SELECT department_id, department_name, lab_id, lab_name, status, SUM(total)::int AS total
        FROM inv
       GROUP BY 1,2,3,4,5
       ORDER BY department_name, lab_name, status
    `;
    const params = labId && deptId ? [labId, deptId] : (labId ? [labId] : (deptId ? [deptId] : []));
    const { rows } = await pool.query(sql, params);
    return asCsvOrJson(res, rows, 'inventory_institutional.csv', req.query.format);
  },

  /**
   * GET /admin/reports/consumption?from&to&lab_id?&department_id?&format=csv|json
   * Totales de consumo por lab, depto, consumible y unidad.
   */
  async consumption(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo ADMIN' });

    const { from, to } = parseRange(req);
    const labId = req.query.lab_id ? Number(req.query.lab_id) : null;
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;

    const { where, params } = dateRangeSql('mc.used_at', from, to);
    const extra = [];
    if (labId)  extra.push(labId);
    if (deptId) extra.push(deptId);

    const sql = `
      SELECT d.id AS department_id, d.name AS department_name,
             l.id AS lab_id, l.name AS lab_name,
             c.id AS consumable_id, c.name AS consumable_name, c.unit,
             SUM(mc.qty)::numeric AS total_qty
        FROM material_consumptions mc
        JOIN labs l ON l.id = mc.lab_id
        JOIN departments d ON d.id = l.department_id
        JOIN consumables c ON c.id = mc.consumable_id
       WHERE 1=1 ${where}
         ${labId ? ` AND l.id = $${params.length + 1}` : ''}
         ${deptId ? ` AND d.id = $${params.length + 1 + (labId ? 1 : 0)}` : ''}
       GROUP BY 1,2,3,4,5,6,7
       ORDER BY d.name, l.name, c.name
    `;
    const { rows } = await pool.query(sql, [...params, ...extra]);
    return asCsvOrJson(res, rows, 'consumption.csv', req.query.format);
  },

  /**
   * GET /admin/reports/performance?from&to&lab_id?&department_id?&format=csv|json
   * Desempeño:
   *  - promedio respuesta (aprob/rechazo): updated_at - created_at
   *  - tasa aprobación/rechazo
   *  - disponibilidad (slots): % tiempo DISPONIBLE vs total tiempo en calendar_slots (del rango)
   */
  async performance(req, res) {
    if (!isAdmin(req)) return res.status(403).json({ error: 'Solo ADMIN' });

    const { from, to } = parseRange(req);
    const labId = req.query.lab_id ? Number(req.query.lab_id) : null;
    const deptId = req.query.department_id ? Number(req.query.department_id) : null;

    // 1) tiempos de respuesta y tasas
    const { where: wReq, params: pReq } = dateRangeSql('r.created_at', from, to);
    const sqlReq = `
      SELECT d.id AS department_id, d.name AS department_name,
             l.id AS lab_id, l.name AS lab_name,
             AVG(CASE WHEN r.status='APROBADA' THEN EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) END)::numeric AS avg_seconds_to_approve,
             AVG(CASE WHEN r.status='RECHAZADA' THEN EXTRACT(EPOCH FROM (r.updated_at - r.created_at)) END)::numeric AS avg_seconds_to_reject,
             SUM(CASE WHEN r.status='APROBADA' THEN 1 ELSE 0 END)::int AS approved,
             SUM(CASE WHEN r.status='RECHAZADA' THEN 1 ELSE 0 END)::int AS rejected,
             COUNT(*)::int AS total_processed
        FROM requests r
        JOIN labs l ON l.id = r.lab_id
        JOIN departments d ON d.id = l.department_id
       WHERE 1=1 ${wReq}
         ${labId ? ` AND l.id = $${pReq.length + 1}` : ''}
         ${deptId ? ` AND d.id = $${pReq.length + 1 + (labId ? 1 : 0)}` : ''}
       GROUP BY 1,2,3,4
       ORDER BY d.name, l.name
    `;
    const paramsReq = [...pReq, ...(labId ? [labId] : []), ...(deptId ? [deptId] : [])];

    // 2) disponibilidad de slots
    //   calculamos duración total en el rango, y duración con status='DISPONIBLE'
    //   Usamos intersección del rango con cada slot.
    const fromParamIdx = 1;
    const toParamIdx = 2;
    const slotExtra = [];
    let slotLabPh = '';
    let slotDeptPh = '';
    if (labId) { slotExtra.push(labId); slotLabPh = ` AND l.id = $${2 + slotExtra.length}`; }
    if (deptId) { slotExtra.push(deptId); slotDeptPh = ` AND d.id = $${2 + slotExtra.length}`; }

    const sqlSlots = `
      WITH rng AS (
        SELECT $${fromParamIdx}::timestamp AS from_ts, $${toParamIdx}::timestamp AS to_ts
      ),
      slots AS (
        SELECT cs.id, cs.lab_id, cs.status, cs.starts_at, cs.ends_at,
               l.id as lab_id2, l.name as lab_name, d.id as department_id, d.name as department_name
          FROM calendar_slots cs
          JOIN labs l ON l.id = cs.lab_id
          JOIN departments d ON d.id = l.department_id
          JOIN rng ON cs.ends_at > rng.from_ts AND cs.starts_at < rng.to_ts
         WHERE 1=1 ${slotLabPh} ${slotDeptPh}
      ),
      sliced AS (
        SELECT department_id, department_name, lab_id2 AS lab_id, lab_name,
               GREATEST(starts_at, (SELECT from_ts FROM rng)) AS a,
               LEAST(ends_at, (SELECT to_ts FROM rng)) AS b,
               status
          FROM slots
      )
      SELECT department_id, department_name, lab_id, lab_name,
             SUM(EXTRACT(EPOCH FROM (b - a)))::numeric AS seconds_total,
             SUM(CASE WHEN status='DISPONIBLE' THEN EXTRACT(EPOCH FROM (b - a)) ELSE 0 END)::numeric AS seconds_available
        FROM sliced
       GROUP BY 1,2,3,4
       ORDER BY department_name, lab_name
    `;

    const paramsSlots = [
      from || new Date('1970-01-01'),
      to   || new Date('2999-12-31'),
      ...slotExtra
    ];

    const [reqStats, slotStats] = await Promise.all([
      pool.query(sqlReq, paramsReq),
      pool.query(sqlSlots, paramsSlots),
    ]);

    // merge por dept/lab
    const key = (r) => `${r.department_id}:${r.lab_id}`;
    const map = new Map();

    for (const r of reqStats.rows) {
      map.set(key(r), {
        department_id: r.department_id,
        department_name: r.department_name,
        lab_id: r.lab_id,
        lab_name: r.lab_name,
        avg_seconds_to_approve: r.avg_seconds_to_approve ?? null,
        avg_seconds_to_reject: r.avg_seconds_to_reject ?? null,
        approved: r.approved || 0,
        rejected: r.rejected || 0,
        total_processed: r.total_processed || 0,
        seconds_total: 0,
        seconds_available: 0,
        availability_ratio: null,
      });
    }
    for (const s of slotStats.rows) {
      const k = `${s.department_id}:${s.lab_id}`;
      const curr = map.get(k) || {
        department_id: s.department_id,
        department_name: s.department_name,
        lab_id: s.lab_id,
        lab_name: s.lab_name,
        avg_seconds_to_approve: null,
        avg_seconds_to_reject: null,
        approved: 0,
        rejected: 0,
        total_processed: 0,
        seconds_total: 0,
        seconds_available: 0,
        availability_ratio: null,
      };
      curr.seconds_total = Number(s.seconds_total || 0);
      curr.seconds_available = Number(s.seconds_available || 0);
      curr.availability_ratio = curr.seconds_total > 0 ? (curr.seconds_available / curr.seconds_total) : null;
      map.set(k, curr);
    }

    const out = Array.from(map.values()).sort((a,b) => {
      if (a.department_name === b.department_name) return a.lab_name.localeCompare(b.lab_name);
      return a.department_name.localeCompare(b.department_name);
    });

    return asCsvOrJson(res, out, 'performance.csv', req.query.format);
  },
};

module.exports = AdminReportsController;

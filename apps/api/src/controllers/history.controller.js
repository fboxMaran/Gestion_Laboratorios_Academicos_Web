// apps/api/src/controllers/history.controller.js
const { pool } = require('../db/pool');
const { Parser } = require('json2csv');

function uid(req) {
  return req.user?.id || req.auth?.user?.id || Number(req.query.user_id) || null;
}

// GET /api/users/me/history?format=json|csv
exports.userHistory = async (req, res) => {
  try {
    const userId = uid(req);
    if (!userId) return res.status(401).json({ error: 'No autenticado' });

    // Consulta optimizada que obtiene solicitudes aprobadas con sus recursos y calendario
    const q = `
      SELECT 
        r.id,
        'reservation' as type,
        r.status,
        r.objective as purpose,
        r.created_at,
        l.name as lab_name,
        l.id as lab_id,
        res.name as resource_name,
        res.type as resource_type,
        ri.qty,
        ri.use_start as time_from,
        ri.use_end as time_to,
        ri.use_start as date
      FROM request r
      LEFT JOIN lab l ON l.id = r.lab_id
      LEFT JOIN request_item ri ON ri.request_id = r.id
      LEFT JOIN resource res ON res.id = ri.resource_id
      WHERE r.requester_id = $1
        AND r.status IN ('APROBADA', 'CANCELADA', 'RECHAZADA')
      ORDER BY r.created_at DESC
    `;

    const { rows } = await pool.query(q, [userId]);
    
    console.log(`[History] Usuario ${userId} - Encontradas ${rows.length} filas en BD`);

    // Agrupar por solicitud (request) para combinar múltiples recursos
    const groupedRequests = {};
    
    rows.forEach(row => {
      if (!groupedRequests[row.id]) {
        groupedRequests[row.id] = {
          id: row.id,
          type: row.type,
          status: row.status === 'APROBADA' ? 'completed' : 
                  row.status === 'CANCELADA' ? 'cancelled' : 'cancelled',
          lab_name: row.lab_name,
          lab_id: row.lab_id,
          purpose: row.purpose,
          created_at: row.created_at,
          date: row.date || row.created_at,
          time_from: row.time_from ? (row.time_from instanceof Date ? row.time_from.toTimeString().substring(0, 5) : String(row.time_from).substring(11, 16)) : null,
          time_to: row.time_to ? (row.time_to instanceof Date ? row.time_to.toTimeString().substring(0, 5) : String(row.time_to).substring(11, 16)) : null,
          resources: []
        };
      }
      
      // Agregar recurso si existe
      if (row.resource_name) {
        groupedRequests[row.id].resources.push({
          name: row.resource_name,
          type: row.resource_type,
          qty: row.qty
        });
      }
    });

    // Convertir a array y establecer resource_name principal
    const history = Object.values(groupedRequests).map(req => {
      // Si hay múltiples recursos, combinar sus nombres
      if (req.resources.length > 0) {
        req.resource_name = req.resources.length === 1 
          ? req.resources[0].name
          : `${req.resources[0].name} (+${req.resources.length - 1} más)`;
      } else {
        req.resource_name = req.lab_name; // Si no hay recursos específicos, usar el lab
      }
      
      return req;
    });

    console.log(`[History] Devolviendo ${history.length} actividades agrupadas`);

    const format = (req.query.format || 'json').toLowerCase();
    if (format === 'csv') {
      const parser = new Parser();
      const csv = parser.parse(history);
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', 'attachment; filename="historial.csv"');
      return res.send(csv);
    }

    res.json(history);
  } catch (error) {
    console.error('Error al obtener historial:', error);
    res.status(500).json({ error: 'Error al obtener historial' });
  }
};

const Reports = require('../models/reports.model');

function parseWindow(q) {
  // Ventana por defecto: últimos 90 días
  const to   = q.to   ? new Date(q.to)   : new Date();
  const from = q.from ? new Date(q.from) : new Date(to.getTime() - 90*24*60*60*1000);
  return { from, to };
}

function ensureLab(req, res) {
  const lab_id = Number(req.query.lab_id || req.params.lab_id);
  if (!lab_id) {
    res.status(400).json({ error: 'lab_id es requerido' });
    return null;
  }
  return lab_id;
}

function sendMaybeCSV(res, rowsOrObj, { filename, headers }) {
  // Si es un objeto con múltiples secciones, lo exportamos como CSV “wide” por sección.
  // Si es un array simple, exportamos el array.
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Type', 'text/csv; charset=utf-8');

  const toCSV = (rows) => {
    if (!rows || !rows.length) return '';
    const cols = Object.keys(rows[0]);
    const head = cols.join(',');
    const body = rows.map(r => cols.map(k => {
      const v = r[k];
      if (v == null) return '';
      const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
      // scape commas/quotes/newlines
      if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
      return s;
    }).join(',')).join('\n');
    return `${head}\n${body}\n`;
  };

  if (Array.isArray(rowsOrObj)) {
    res.send(toCSV(rowsOrObj));
    return;
  }

  // objeto con secciones: { resources_top, users_top, ... }
  const parts = [];
  for (const [key, rows] of Object.entries(rowsOrObj)) {
    parts.push(`# ${key}`);
    parts.push(toCSV(rows));
    parts.push(''); // blank line
  }
  res.send(parts.join('\n'));
}

const ReportsController = {
  async usage(req, res, next) {
    try {
      const lab_id = ensureLab(req, res);
      if (!lab_id) return;
      const { from, to } = parseWindow(req.query);
      const limit = Number(req.query.limit || 20);

      const data = await Reports.usage({ lab_id, from, to, limit });

      if ((req.query.format || '').toLowerCase() === 'csv') {
        // Exportar dos secciones: recursos y usuarios
        return sendMaybeCSV(res, {
          resources_top: data.resources_top,
          users_top: data.users_top,
        }, { filename: `usage_${lab_id}.csv` });
      }
      return res.json(data);
    } catch (e) { next(e); }
  },

  async inventory(req, res, next) {
    try {
      const lab_id = ensureLab(req, res);
      if (!lab_id) return;
      const { from, to } = parseWindow(req.query);

      const data = await Reports.inventory({ lab_id, from, to });

      if ((req.query.format || '').toLowerCase() === 'csv') {
        return sendMaybeCSV(res, {
          resources_status: data.resources_status,
          consumables_critical: data.consumables_critical,
          consumptions_period: data.consumptions_period,
        }, { filename: `inventory_${lab_id}.csv` });
      }
      return res.json(data);
    } catch (e) { next(e); }
  },

  async maintenance(req, res, next) {
    try {
      const lab_id = ensureLab(req, res);
      if (!lab_id) return;
      const { from, to } = parseWindow(req.query);

      const data = await Reports.maintenance({ lab_id, from, to });

      if ((req.query.format || '').toLowerCase() === 'csv') {
        return sendMaybeCSV(res, {
          maintenance_by_resource: data.maintenance_by_resource,
          summary: [data.summary], // como una fila
        }, { filename: `maintenance_${lab_id}.csv` });
      }
      return res.json(data);
    } catch (e) { next(e); }
  },
};

module.exports = ReportsController;

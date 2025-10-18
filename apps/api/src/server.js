const fs = require('fs');
const path = require('path');
const app = require('./app');
const { pool } = require('./db/pool');

const PORT = Number(process.env.PORT || 8080);

async function ensureSchema() {
  const sqlPath = path.join(__dirname, 'db', 'schema.sql');
  if (!fs.existsSync(sqlPath)) {
    throw new Error('schema.sql no encontrado en ' + sqlPath);
  }
  const raw = fs.readFileSync(sqlPath, 'utf8');
  // divide por ; pero respeta líneas vacías
  const statements = raw
    .split(/;\s*$/m)
    .map(s => s.trim())
    .filter(s => s.length);

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    for (const stmt of statements) {
      await client.query(stmt);
    }
    await client.query('COMMIT');
    console.log('[DB] schema applied (' + statements.length + ' statements)');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[DB] schema apply error:', err);
    throw err;
  } finally {
    client.release();
  }
}

async function main() {
  try {
    const { rows } = await pool.query('SELECT NOW() now');
    console.log('[DB] connected at', rows[0].now);

    await ensureSchema();

    app.listen(PORT, () => {
      console.log(`[API] listening on port ${PORT}`);
    });
  } catch (err) {
    console.error('[BOOT ERROR]', err);
    process.exit(1);
  }
}

main();

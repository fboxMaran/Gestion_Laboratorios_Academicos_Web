require('dotenv').config();
const { Pool } = require('pg');

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error('DATABASE_URL no está definido');
  process.exit(1);
}

const pool = new Pool({
  connectionString,
  ssl: false,
  // Asegurar que siempre use UTF-8
  client_encoding: 'UTF8'
});

pool.on('error', (err) => {
  console.error('PG Pool error:', err);
  process.exit(1);
});

module.exports = { pool };

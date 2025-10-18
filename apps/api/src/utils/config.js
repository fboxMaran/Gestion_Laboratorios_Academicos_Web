// Carga .env una sola vez y expone llaves requeridas
require('dotenv').config();

function required(name) {
  const v = process.env[name];
  // protegemos contra valores vacíos o literales no expandidos
  if (!v || v.trim() === "" || v.includes("$" + name)) {
    throw new Error(`[config] ${name} is not set`);
  }
  return v;
}

module.exports = {
  JWT_SECRET: required('JWT_SECRET'),
};

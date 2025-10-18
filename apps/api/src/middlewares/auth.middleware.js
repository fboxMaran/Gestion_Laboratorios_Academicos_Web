const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../utils/config');

function requireAuth(req, res, next) {
  const auth = req.headers.authorization || "";
  const [, token] = auth.split(" ");
  if (!token) return res.status(401).json({ error: 'Token requerido' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    req.user = payload;
    next();
  } catch {
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = { requireAuth };

// apps/api/src/middlewares/error.js
function notFound(req, res, next) {
  res.status(404).json({ error: 'Not found' });
}

function errorHandler(err, req, res, next) {
  console.error('[ERROR]', err);
  const status = err.status || 500;
  res.status(status).json({
    error: err.message || 'Internal Server Error'
  });
}

module.exports = { notFound, errorHandler };

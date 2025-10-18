// apps/api/src/app.js
const express = require('express');
const cors = require('cors');

const routes = require('./routes');
const { notFound, errorHandler } = require('./middlewares/error');

const app = express();

const allowed = (process.env.CORS_ORIGIN || '').split(',').map(s => s.trim()).filter(Boolean);
app.use(cors({ origin: allowed.length ? allowed : '*' }));
app.use(express.json({ limit: '1mb' }));

app.use('/api', routes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;

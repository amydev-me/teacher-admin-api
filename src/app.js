const express = require('express');
const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const apiRoutes = require('./routes/api');
const { notFound, errorHandler } = require('./middleware/errorHandler');

app.use('/api', apiRoutes);

// Health check
app.get('/health', (req, res) => res.status(200).json({ status: 'ok' }));

app.use(notFound);
app.use(errorHandler);

module.exports = app;
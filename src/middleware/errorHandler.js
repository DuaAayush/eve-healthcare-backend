const ApiError = require('../utils/ApiError');

// Single place that turns any thrown error into a consistent JSON shape.
// Handles our own ApiError, Prisma's known request errors (e.g. unique
// constraint violations), and falls back to a generic 500 for anything
// unexpected so we never leak stack traces to the client.
// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof ApiError) {
    return res.status(err.statusCode).json({
      error: err.message,
      details: err.details,
    });
  }

  // Sequelize unique constraint violation (e.g. duplicate email / eventId)
  // that wasn't already caught and handled as an idempotent no-op.
  if (err.name === 'SequelizeUniqueConstraintError') {
    const field = err.errors?.[0]?.path || 'field';
    return res.status(409).json({ error: `Duplicate value for field: ${field}` });
  }

  // Sequelize FK / validation errors
  if (err.name === 'SequelizeForeignKeyConstraintError') {
    return res.status(400).json({ error: 'Referenced resource does not exist' });
  }
  if (err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation failed',
      details: err.errors?.map((e) => ({ field: e.path, message: e.message })),
    });
  }

  console.error(err);
  return res.status(500).json({ error: 'Internal server error' });
};

const notFoundHandler = (req, res) => {
  res.status(404).json({ error: `Route not found: ${req.method} ${req.originalUrl}` });
};

module.exports = { errorHandler, notFoundHandler };

const ApiError = require('../utils/ApiError');

// Returns a middleware that parses req.body against `schema`. On failure it
// throws a 400 with per-field messages instead of letting a malformed
// request reach the controller / database layer.
const validate = (schema) => (req, res, next) => {
  const result = schema.safeParse(req.body);
  if (!result.success) {
    const details = result.error.issues.map((issue) => ({
      field: issue.path.join('.'),
      message: issue.message,
    }));
    return next(new ApiError(400, 'Validation failed', details));
  }
  req.body = result.data;
  next();
};

module.exports = validate;

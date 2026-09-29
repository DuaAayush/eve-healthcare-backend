// Wraps an async route handler so a rejected promise is forwarded to
// Express's error-handling middleware instead of crashing the process or
// hanging the request. Avoids a try/catch block in every controller.
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;

// Lets controllers throw `new ApiError(404, 'Booking not found')` and have
// the central error handler translate it into a consistent JSON response,
// instead of every route hand-rolling res.status(...).json(...) on failure.
class ApiError extends Error {
  constructor(statusCode, message, details = undefined) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
  }
}

module.exports = ApiError;

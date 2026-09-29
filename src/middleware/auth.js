const jwt = require('jsonwebtoken');
const ApiError = require('../utils/ApiError');

// Verifies the Bearer JWT on the request and attaches { id, email } to
// req.user. Every route that touches a user's own data (bookings, payments)
// sits behind this so we always know who is asking.
const authenticate = (req, res, next) => {
  const header = req.headers.authorization || '';
  const [scheme, token] = header.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return next(new ApiError(401, 'Missing or malformed Authorization header'));
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    req.user = { id: payload.sub, email: payload.email };
    next();
  } catch (err) {
    return next(new ApiError(401, 'Invalid or expired token'));
  }
};

module.exports = authenticate;

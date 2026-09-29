const ApiError = require('../utils/ApiError');

// The webhook endpoint isn't behind user JWT auth (the caller is a payment
// provider, not a logged-in user) but it still shouldn't be wide open --
// anyone who could hit it unauthenticated could confirm arbitrary bookings
// for free. We gate it with a shared secret header, standing in for HMAC
// signature verification a real provider (Stripe, Razorpay, etc.) would use.
const verifyWebhookSecret = (req, res, next) => {
  const provided = req.headers['x-webhook-secret'];
  if (!process.env.WEBHOOK_SECRET) {
    // Not configured -- allow through in dev/test so the assignment can be
    // exercised without extra setup, but this would be a hard failure in prod.
    return next();
  }
  if (provided !== process.env.WEBHOOK_SECRET) {
    return next(new ApiError(401, 'Invalid webhook signature'));
  }
  next();
};

module.exports = verifyWebhookSecret;

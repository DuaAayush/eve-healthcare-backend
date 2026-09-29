const { sequelize, Booking, Payment, WebhookEvent } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

// Simulates a payment gateway's outcome. Defaults to ~85% success so most
// test runs behave, but a caller (or our own tests) can force a specific
// outcome via `forceStatus` since a real gateway obviously has no such knob.
const simulateOutcome = (forceStatus) => {
  if (forceStatus) return forceStatus;
  return Math.random() < 0.85 ? 'SUCCESS' : 'FAILED';
};

// POST /payments/ -- initiates and (synchronously, since it's simulated)
// resolves a payment for a booking the caller owns.
const createPayment = asyncHandler(async (req, res) => {
  const { bookingId, forceStatus } = req.body;

  const booking = await Booking.findByPk(bookingId);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.userId !== req.user.id) throw new ApiError(404, 'Booking not found');

  if (booking.status !== 'PENDING') {
    throw new ApiError(400, `Booking is ${booking.status.toLowerCase()} and cannot be paid for again`);
  }

  const outcome = simulateOutcome(forceStatus);

  const result = await sequelize.transaction(async (t) => {
    const payment = await Payment.create(
      { bookingId: booking.id, amount: booking.amount, status: outcome },
      { transaction: t }
    );
    booking.status = outcome === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
    await booking.save({ transaction: t });
    return { payment, booking };
  });

  res.status(201).json(result);
});

// POST /payments/webhook/ -- simulates the payment provider pushing an
// async status update. Providers commonly redeliver the same event (at
// least once delivery), so this MUST be idempotent on `eventId`.
//
// Strategy: `eventId` has a unique DB constraint (see WebhookEvent model).
// We attempt to insert the event row and apply the booking/payment
// transition inside a single transaction. If the eventId already exists,
// Postgres rejects the insert (unique violation), the whole transaction
// rolls back, and we simply report the previously-recorded outcome -- no
// payment or booking mutation happens a second time.
const handleWebhook = asyncHandler(async (req, res) => {
  const { eventId, bookingId, status } = req.body;

  try {
    const result = await sequelize.transaction(async (t) => {
      await WebhookEvent.create(
        { eventId, bookingId, payload: req.body },
        { transaction: t }
      );

      const booking = await Booking.findByPk(bookingId, { transaction: t });
      if (!booking) throw new ApiError(404, 'Booking not found');
      if (booking.status === 'CANCELLED') {
        throw new ApiError(400, 'Cannot apply a payment to a cancelled booking');
      }

      const payment = await Payment.create(
        { bookingId: booking.id, amount: booking.amount, status },
        { transaction: t }
      );
      booking.status = status === 'SUCCESS' ? 'CONFIRMED' : 'FAILED';
      await booking.save({ transaction: t });

      return { payment, booking };
    });

    return res.status(200).json({ message: 'Webhook processed', ...result });
  } catch (err) {
    if (err.name === 'SequelizeUniqueConstraintError') {
      // Duplicate delivery of an event we've already handled -- idempotent
      // no-op. We still return 200 (the provider's retry should not see a
      // failure) along with the current booking state for visibility.
      const existingEvent = await WebhookEvent.findOne({ where: { eventId } });
      const booking = existingEvent?.bookingId
        ? await Booking.findByPk(existingEvent.bookingId)
        : null;
      return res.status(200).json({
        message: 'Event already processed; ignoring duplicate delivery',
        booking,
      });
    }
    throw err;
  }
});

module.exports = { createPayment, handleWebhook };

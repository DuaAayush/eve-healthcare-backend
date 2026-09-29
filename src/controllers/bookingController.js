const { Booking, DiagnosticTest, DiagnosticCentre, Payment } = require('../models');
const ApiError = require('../utils/ApiError');
const asyncHandler = require('../utils/asyncHandler');

const createBooking = asyncHandler(async (req, res) => {
  const { testId, appointmentAt } = req.body;

  const test = await DiagnosticTest.findByPk(testId);
  if (!test) throw new ApiError(404, 'Diagnostic test not found');

  const appointmentDate = new Date(appointmentAt);
  if (appointmentDate.getTime() <= Date.now()) {
    throw new ApiError(400, 'appointmentAt must be in the future');
  }

  // Snapshot the price at booking time so a later price change at the
  // centre doesn't retroactively change what an existing booking owes.
  const booking = await Booking.create({
    userId: req.user.id,
    testId: test.id,
    centreId: test.centreId,
    appointmentAt: appointmentDate,
    amount: test.price,
    status: 'PENDING',
  });

  const full = await Booking.findByPk(booking.id, {
    include: [{ model: DiagnosticTest }, { model: DiagnosticCentre }],
  });
  res.status(201).json(full);
});

const listMyBookings = asyncHandler(async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 100);

  const { rows: bookings, count: total } = await Booking.findAndCountAll({
    where: { userId: req.user.id },
    offset: (page - 1) * limit,
    limit,
    order: [['createdAt', 'DESC']],
    include: [{ model: DiagnosticTest }, { model: DiagnosticCentre }, { model: Payment }],
  });

  res.status(200).json({
    data: bookings,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  });
});

const getMyBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id, {
    include: [{ model: DiagnosticTest }, { model: DiagnosticCentre }, { model: Payment }],
  });
  if (!booking) throw new ApiError(404, 'Booking not found');
  // 404 rather than 403 on a mismatched owner: this avoids confirming to an
  // attacker that a given booking id exists at all.
  if (booking.userId !== req.user.id) throw new ApiError(404, 'Booking not found');

  res.status(200).json(booking);
});

const cancelMyBooking = asyncHandler(async (req, res) => {
  const booking = await Booking.findByPk(req.params.id);
  if (!booking) throw new ApiError(404, 'Booking not found');
  if (booking.userId !== req.user.id) throw new ApiError(404, 'Booking not found');

  if (booking.status === 'CONFIRMED') {
    throw new ApiError(400, 'A confirmed booking cannot be cancelled directly; contact support for refunds');
  }
  if (booking.status === 'CANCELLED') {
    throw new ApiError(400, 'Booking is already cancelled');
  }

  booking.status = 'CANCELLED';
  await booking.save();
  res.status(200).json(booking);
});

module.exports = { createBooking, listMyBookings, getMyBooking, cancelMyBooking };

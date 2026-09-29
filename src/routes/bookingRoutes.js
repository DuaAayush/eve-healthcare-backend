const express = require('express');
const {
  createBooking,
  listMyBookings,
  getMyBooking,
  cancelMyBooking,
} = require('../controllers/bookingController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const { createBookingSchema } = require('../utils/schemas');

const router = express.Router();

router.use(authenticate);

/**
 * @openapi
 * /bookings:
 *   post:
 *     tags: [Bookings]
 *     summary: Book a diagnostic test
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [testId, appointmentAt]
 *             properties:
 *               testId: { type: string }
 *               appointmentAt: { type: string, format: date-time }
 *     responses:
 *       201: { description: Booking created with status PENDING }
 *       404: { description: Test not found }
 *   get:
 *     tags: [Bookings]
 *     summary: List the authenticated user's bookings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *     responses:
 *       200: { description: Paginated list of the user's bookings }
 */
router.post('/', validate(createBookingSchema), createBooking);
router.get('/', listMyBookings);

/**
 * @openapi
 * /bookings/{id}:
 *   get:
 *     tags: [Bookings]
 *     summary: Get one of the authenticated user's bookings
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Booking found }
 *       404: { description: Booking not found (or not owned by caller) }
 */
router.get('/:id', getMyBooking);

/**
 * @openapi
 * /bookings/{id}/cancel:
 *   patch:
 *     tags: [Bookings]
 *     summary: Cancel a pending/failed booking
 *     security: [{ bearerAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: Booking cancelled }
 *       400: { description: Booking cannot be cancelled in its current state }
 *       404: { description: Booking not found }
 */
router.patch('/:id/cancel', cancelMyBooking);

module.exports = router;

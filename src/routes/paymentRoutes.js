const express = require('express');
const { createPayment, handleWebhook } = require('../controllers/paymentController');
const authenticate = require('../middleware/auth');
const validate = require('../middleware/validate');
const verifyWebhookSecret = require('../middleware/verifyWebhookSecret');
const { createPaymentSchema, webhookSchema } = require('../utils/schemas');

const router = express.Router();

/**
 * @openapi
 * /payments:
 *   post:
 *     tags: [Payments]
 *     summary: Simulate processing a payment for a booking
 *     security: [{ bearerAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [bookingId]
 *             properties:
 *               bookingId: { type: string }
 *               forceStatus:
 *                 type: string
 *                 enum: [SUCCESS, FAILED]
 *                 description: Optional -- forces a deterministic outcome (testing only)
 *     responses:
 *       201: { description: Payment simulated; booking updated to CONFIRMED or FAILED }
 *       400: { description: Booking is not in a payable state }
 *       404: { description: Booking not found }
 */
router.post('/', authenticate, validate(createPaymentSchema), createPayment);

/**
 * @openapi
 * /payments/webhook:
 *   post:
 *     tags: [Payments]
 *     summary: Receive an async payment status update from the (simulated) provider
 *     description: >
 *       Idempotent on `eventId` -- redelivering the same event is a safe no-op
 *       and will not create duplicate payments or corrupt booking state.
 *     parameters:
 *       - in: header
 *         name: x-webhook-secret
 *         schema: { type: string }
 *         required: false
 *         description: Shared secret, required only if WEBHOOK_SECRET is configured.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [eventId, bookingId, status]
 *             properties:
 *               eventId: { type: string, example: "evt_1a2b3c" }
 *               bookingId: { type: string }
 *               status: { type: string, enum: [SUCCESS, FAILED] }
 *     responses:
 *       200: { description: Webhook processed (or already-processed no-op) }
 *       401: { description: Invalid webhook secret }
 *       404: { description: Booking not found }
 */
router.post('/webhook', verifyWebhookSecret, validate(webhookSchema), handleWebhook);

module.exports = router;

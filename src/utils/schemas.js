const { z } = require('zod');

const signupSchema = z.object({
  name: z.string().min(1, 'name is required'),
  email: z.string().email('valid email is required'),
  password: z.string().min(6, 'password must be at least 6 characters'),
});

const loginSchema = z.object({
  email: z.string().email('valid email is required'),
  password: z.string().min(1, 'password is required'),
});

const createCentreSchema = z.object({
  name: z.string().min(1),
  location: z.string().min(1),
});

const createTestSchema = z.object({
  name: z.string().min(1),
  price: z.number().positive('price must be a positive number'),
});

const createBookingSchema = z.object({
  testId: z.string().uuid('testId must be a valid id'),
  appointmentAt: z.string().refine((val) => !Number.isNaN(Date.parse(val)), {
    message: 'appointmentAt must be a valid ISO date string',
  }),
});

const createPaymentSchema = z.object({
  bookingId: z.string().uuid('bookingId must be a valid id'),
  // Optional: lets tests / callers force a deterministic outcome instead of
  // relying on the random simulation. Real gateways obviously don't offer this.
  forceStatus: z.enum(['SUCCESS', 'FAILED']).optional(),
});

const webhookSchema = z.object({
  eventId: z.string().min(1, 'eventId is required for idempotency'),
  bookingId: z.string().uuid('bookingId must be a valid id'),
  status: z.enum(['SUCCESS', 'FAILED']),
});

module.exports = {
  signupSchema,
  loginSchema,
  createCentreSchema,
  createTestSchema,
  createBookingSchema,
  createPaymentSchema,
  webhookSchema,
};

const request = require('supertest');
const { app, registerUser, createCentreWithTest, futureDate } = require('./helpers');

const makeBooking = async (price = 500) => {
  const { token, user } = await registerUser();
  const { test } = await createCentreWithTest(token, price);
  const bookingRes = await request(app)
    .post('/api/bookings')
    .set('Authorization', `Bearer ${token}`)
    .send({ testId: test.id, appointmentAt: futureDate(1) });
  return { token, user, booking: bookingRes.body };
};

describe('Simulated Payments (POST /payments)', () => {
  it('confirms a booking on a forced SUCCESS payment', async () => {
    const { token, booking } = await makeBooking();
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.id, forceStatus: 'SUCCESS' });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('SUCCESS');
    expect(res.body.booking.status).toBe('CONFIRMED');
  });

  it('marks a booking FAILED on a forced FAILED payment', async () => {
    const { token, booking } = await makeBooking();
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.id, forceStatus: 'FAILED' });

    expect(res.status).toBe(201);
    expect(res.body.payment.status).toBe('FAILED');
    expect(res.body.booking.status).toBe('FAILED');
  });

  it('rejects paying for a booking that is not PENDING', async () => {
    const { token, booking } = await makeBooking();
    await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.id, forceStatus: 'SUCCESS' });

    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: booking.id, forceStatus: 'SUCCESS' });
    expect(res.status).toBe(400);
  });

  it("404s when paying for another user's booking", async () => {
    const { booking } = await makeBooking();
    const { token: otherToken } = await registerUser();
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${otherToken}`)
      .send({ bookingId: booking.id, forceStatus: 'SUCCESS' });
    expect(res.status).toBe(404);
  });

  it('404s when paying for a non-existent booking', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/payments')
      .set('Authorization', `Bearer ${token}`)
      .send({ bookingId: '00000000-0000-0000-0000-000000000000', forceStatus: 'SUCCESS' });
    expect(res.status).toBe(404);
  });

  it('rejects an unauthenticated payment request', async () => {
    const { booking } = await makeBooking();
    const res = await request(app).post('/api/payments').send({ bookingId: booking.id });
    expect(res.status).toBe(401);
  });
});

describe('Payment webhook (POST /payments/webhook) - idempotency & edge cases', () => {
  it('processes a webhook event and confirms the booking', async () => {
    const { booking } = await makeBooking();
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ eventId: `evt-${booking.id}-1`, bookingId: booking.id, status: 'SUCCESS' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('CONFIRMED');
    expect(res.body.payment.status).toBe('SUCCESS');
  });

  it('is idempotent: redelivering the same eventId does not create a duplicate payment or change state', async () => {
    const { booking } = await makeBooking();
    const eventId = `evt-${booking.id}-dup`;
    const payload = { eventId, bookingId: booking.id, status: 'SUCCESS' };

    const first = await request(app).post('/api/payments/webhook').send(payload);
    const second = await request(app).post('/api/payments/webhook').send(payload);
    const third = await request(app).post('/api/payments/webhook').send(payload);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(third.status).toBe(200);
    expect(second.body.message).toMatch(/already processed/i);
    expect(third.body.message).toMatch(/already processed/i);

    // Confirm only ONE payment row actually exists for this booking.
    const { sequelize, Payment } = require('../src/models');
    const payments = await Payment.findAll({ where: { bookingId: booking.id } });
    expect(payments).toHaveLength(1);
  });

  it('handles a FAILED webhook event by marking the booking FAILED', async () => {
    const { booking } = await makeBooking();
    const res = await request(app)
      .post('/api/payments/webhook')
      .send({ eventId: `evt-${booking.id}-fail`, bookingId: booking.id, status: 'FAILED' });

    expect(res.status).toBe(200);
    expect(res.body.booking.status).toBe('FAILED');
  });

  it('404s a webhook for a non-existent booking id', async () => {
    const res = await request(app).post('/api/payments/webhook').send({
      eventId: 'evt-nonexistent-booking',
      bookingId: '00000000-0000-0000-0000-000000000000',
      status: 'SUCCESS',
    });
    expect(res.status).toBe(404);
  });

  it('rejects a webhook with missing required fields', async () => {
    const res = await request(app).post('/api/payments/webhook').send({ eventId: 'evt-incomplete' });
    expect(res.status).toBe(400);
  });

  it('rejects a webhook with an invalid status value', async () => {
    const { booking } = await makeBooking();
    const res = await request(app).post('/api/payments/webhook').send({
      eventId: `evt-${booking.id}-badstatus`,
      bookingId: booking.id,
      status: 'NOT_A_REAL_STATUS',
    });
    expect(res.status).toBe(400);
  });

  it('refuses to apply a payment to a cancelled booking', async () => {
    const { token, booking } = await makeBooking();
    await request(app).patch(`/api/bookings/${booking.id}/cancel`).set('Authorization', `Bearer ${token}`);

    const res = await request(app).post('/api/payments/webhook').send({
      eventId: `evt-${booking.id}-cancelled`,
      bookingId: booking.id,
      status: 'SUCCESS',
    });
    expect(res.status).toBe(400);
  });
});

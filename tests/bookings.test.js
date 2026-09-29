const request = require('supertest');
const { app, registerUser, createCentreWithTest, futureDate } = require('./helpers');

describe('Bookings', () => {
  it('creates a booking for a valid test and future appointment', async () => {
    const { token } = await registerUser();
    const { test } = await createCentreWithTest(token, 750);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ testId: test.id, appointmentAt: futureDate(2) });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('PENDING');
    expect(res.body.amount).toBe('750.00');
  });

  it('404s when booking a non-existent test', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ testId: '00000000-0000-0000-0000-000000000000', appointmentAt: futureDate(1) });
    expect(res.status).toBe(404);
  });

  it('rejects a booking with an appointment in the past', async () => {
    const { token } = await registerUser();
    const { test } = await createCentreWithTest(token);
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ testId: test.id, appointmentAt: '2020-01-01T00:00:00.000Z' });
    expect(res.status).toBe(400);
  });

  it('rejects a booking with a malformed testId', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ testId: 'not-a-uuid', appointmentAt: futureDate(1) });
    expect(res.status).toBe(400);
  });

  it("prevents a user from viewing another user's booking (returns 404)", async () => {
    const { token: tokenA } = await registerUser();
    const { test } = await createCentreWithTest(tokenA);
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ testId: test.id, appointmentAt: futureDate(1) });

    const { token: tokenB } = await registerUser();
    const res = await request(app)
      .get(`/api/bookings/${bookingRes.body.id}`)
      .set('Authorization', `Bearer ${tokenB}`);

    expect(res.status).toBe(404);
  });

  it('lets the owner cancel a pending booking, but not twice', async () => {
    const { token } = await registerUser();
    const { test } = await createCentreWithTest(token);
    const bookingRes = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${token}`)
      .send({ testId: test.id, appointmentAt: futureDate(1) });

    const cancelRes = await request(app)
      .patch(`/api/bookings/${bookingRes.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(cancelRes.status).toBe(200);
    expect(cancelRes.body.status).toBe('CANCELLED');

    const secondCancel = await request(app)
      .patch(`/api/bookings/${bookingRes.body.id}/cancel`)
      .set('Authorization', `Bearer ${token}`);
    expect(secondCancel.status).toBe(400);
  });

  it('lists only the authenticated user\'s own bookings', async () => {
    const { token: tokenA } = await registerUser();
    const { test } = await createCentreWithTest(tokenA);
    await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${tokenA}`)
      .send({ testId: test.id, appointmentAt: futureDate(1) });

    const { token: tokenB } = await registerUser();

    const resA = await request(app).get('/api/bookings').set('Authorization', `Bearer ${tokenA}`);
    const resB = await request(app).get('/api/bookings').set('Authorization', `Bearer ${tokenB}`);

    expect(resA.body.data.length).toBeGreaterThanOrEqual(1);
    expect(resB.body.data.length).toBe(0);
  });
});

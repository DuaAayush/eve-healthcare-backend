const request = require('supertest');
const { app, registerUser } = require('./helpers');

describe('Auth', () => {
  it('signs up a new user and returns a JWT', async () => {
    const { response } = await registerUser();
    expect(response.status).toBe(201);
    expect(response.body.token).toEqual(expect.any(String));
    expect(response.body.user.email).toEqual(expect.any(String));
    expect(response.body.user.passwordHash).toBeUndefined();
  });

  it('rejects signup with an already-registered email', async () => {
    const { user } = await registerUser();
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'Dup', email: user.email, password: 'password123' });
    expect(res.status).toBe(409);
  });

  it('rejects signup with invalid input (bad email, short password)', async () => {
    const res = await request(app)
      .post('/api/auth/signup')
      .send({ name: 'X', email: 'not-an-email', password: '123' });
    expect(res.status).toBe(400);
    expect(res.body.details.length).toBeGreaterThan(0);
  });

  it('logs in with correct credentials', async () => {
    const { user } = await registerUser({ password: 'correcthorse' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'correcthorse' });
    expect(res.status).toBe(200);
    expect(res.body.token).toEqual(expect.any(String));
  });

  it('rejects login with wrong password', async () => {
    const { user } = await registerUser({ password: 'correcthorse' });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: user.email, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  it('rejects login for a non-existent email', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nobody@example.com', password: 'whatever123' });
    expect(res.status).toBe(401);
  });

  it('rejects an unauthenticated request to a protected route', async () => {
    const res = await request(app).get('/api/bookings');
    expect(res.status).toBe(401);
  });

  it('rejects a malformed/garbage bearer token', async () => {
    const res = await request(app)
      .get('/api/bookings')
      .set('Authorization', 'Bearer not.a.valid.jwt');
    expect(res.status).toBe(401);
  });
});

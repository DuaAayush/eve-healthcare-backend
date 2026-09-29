const request = require('supertest');
const { app, registerUser } = require('./helpers');

describe('Diagnostic Centres & Tests', () => {
  it('creates a centre and a test under it, then lists them', async () => {
    const { token } = await registerUser();

    const centreRes = await request(app)
      .post('/api/centres')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'City Diagnostics', location: 'Whitefield' });
    expect(centreRes.status).toBe(201);

    const testRes = await request(app)
      .post(`/api/centres/${centreRes.body.id}/tests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CBC', price: 499 });
    expect(testRes.status).toBe(201);
    expect(testRes.body.price).toBe('499.00');

    const listRes = await request(app).get(`/api/centres/${centreRes.body.id}/tests`);
    expect(listRes.status).toBe(200);
    expect(listRes.body).toHaveLength(1);
  });

  it('404s when adding a test to a non-existent centre', async () => {
    const { token } = await registerUser();
    const res = await request(app)
      .post('/api/centres/00000000-0000-0000-0000-000000000000/tests')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'CBC', price: 499 });
    expect(res.status).toBe(404);
  });

  it('rejects a negative or zero test price', async () => {
    const { token } = await registerUser();
    const centreRes = await request(app)
      .post('/api/centres')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Centre', location: 'Somewhere' });

    const res = await request(app)
      .post(`/api/centres/${centreRes.body.id}/tests`)
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Bad Test', price: -10 });
    expect(res.status).toBe(400);
  });

  it('paginates the centre list', async () => {
    const res = await request(app).get('/api/centres?page=1&limit=1');
    expect(res.status).toBe(200);
    expect(res.body.data.length).toBeLessThanOrEqual(1);
    expect(res.body.pagination.limit).toBe(1);
  });
});

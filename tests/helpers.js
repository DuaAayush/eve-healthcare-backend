const request = require('supertest');
const createApp = require('../src/app');

const app = createApp();

let counter = 0;
const uniqueEmail = () => `user${Date.now()}_${counter++}@example.com`;

const registerUser = async (overrides = {}) => {
  const email = overrides.email || uniqueEmail();
  const res = await request(app)
    .post('/api/auth/signup')
    .send({ name: overrides.name || 'Test User', email, password: overrides.password || 'password123' });
  return { token: res.body.token, user: res.body.user, response: res };
};

const createCentreWithTest = async (token, testPrice = 500) => {
  const centreRes = await request(app)
    .post('/api/centres')
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Centre', location: 'Test City' });

  const testRes = await request(app)
    .post(`/api/centres/${centreRes.body.id}/tests`)
    .set('Authorization', `Bearer ${token}`)
    .send({ name: 'Test Diagnostic', price: testPrice });

  return { centre: centreRes.body, test: testRes.body };
};

const futureDate = (daysAhead = 1) => new Date(Date.now() + daysAhead * 86400000).toISOString();

module.exports = { app, registerUser, createCentreWithTest, futureDate };

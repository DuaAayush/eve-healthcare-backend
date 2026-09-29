const path = require('path');
// Load .env.test explicitly (falling back to .env) BEFORE anything requires
// src/models, since that module builds its Sequelize instance from
// process.env.DATABASE_URL as soon as it's required.
require('dotenv').config({ path: path.resolve(__dirname, '../.env.test') });

const { sequelize } = require('../src/models');

// Uses `sync({ force: true })` against the dedicated test database rather
// than running migrations, so the suite is self-contained and doesn't
// depend on migration state. NODE_ENV=test points DATABASE_URL at
// eve_diagnostics_test (see .env.test / README) -- never point this at a
// database with real data.
beforeAll(async () => {
  await sequelize.sync({ force: true });
});

afterAll(async () => {
  await sequelize.close();
});

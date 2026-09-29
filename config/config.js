require('dotenv').config();

// sequelize-cli (migrations/seeders) reads this file directly; the app
// itself builds its own Sequelize instance from DATABASE_URL in
// src/models/index.js. Keeping both driven by the same env var avoids the
// two ever drifting apart.
const base = {
  use_env_variable: 'DATABASE_URL',
  dialect: 'postgres',
  logging: false,
};

module.exports = {
  development: { ...base },
  test: { ...base },
  production: { ...base, dialectOptions: { ssl: false } },
};

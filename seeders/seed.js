require('dotenv').config();
const bcrypt = require('bcryptjs');
const { sequelize, User, DiagnosticCentre, DiagnosticTest } = require('../src/models');

async function main() {
  const passwordHash = await bcrypt.hash('password123', 10);
  const [user] = await User.findOrCreate({
    where: { email: 'demo@eve.health' },
    defaults: { name: 'Demo User', email: 'demo@eve.health', passwordHash },
  });

  const [centre, created] = await DiagnosticCentre.findOrCreate({
    where: { name: 'Apollo Diagnostics', location: 'Koramangala, Bangalore' },
    defaults: { name: 'Apollo Diagnostics', location: 'Koramangala, Bangalore' },
  });

  if (created) {
    await DiagnosticTest.bulkCreate([
      { name: 'Complete Blood Count (CBC)', price: 499, centreId: centre.id },
      { name: 'Lipid Profile', price: 899, centreId: centre.id },
      { name: 'Thyroid Panel (TSH, T3, T4)', price: 1200, centreId: centre.id },
    ]);
  }

  console.log('Seeded user:', user.email, '(password: password123)');
  console.log('Seeded centre:', centre.name, created ? '(with 3 tests)' : '(already existed)');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await sequelize.close();
  });

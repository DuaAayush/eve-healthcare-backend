const { Sequelize } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL, {
  dialect: 'postgres',
  logging: false,
});

const User = require('./user')(sequelize);
const DiagnosticCentre = require('./diagnosticCentre')(sequelize);
const DiagnosticTest = require('./diagnosticTest')(sequelize);
const Booking = require('./booking')(sequelize);
const Payment = require('./payment')(sequelize);
const WebhookEvent = require('./webhookEvent')(sequelize);

// --- Associations ---
User.hasMany(Booking, { foreignKey: 'userId' });
Booking.belongsTo(User, { foreignKey: 'userId' });

DiagnosticCentre.hasMany(DiagnosticTest, { foreignKey: 'centreId', onDelete: 'CASCADE' });
DiagnosticTest.belongsTo(DiagnosticCentre, { foreignKey: 'centreId' });

DiagnosticCentre.hasMany(Booking, { foreignKey: 'centreId' });
Booking.belongsTo(DiagnosticCentre, { foreignKey: 'centreId' });

DiagnosticTest.hasMany(Booking, { foreignKey: 'testId' });
Booking.belongsTo(DiagnosticTest, { foreignKey: 'testId' });

// A booking can have more than one payment attempt (e.g. a FAILED attempt
// followed by a retry), so this is a log, not a strict 1:1.
Booking.hasMany(Payment, { foreignKey: 'bookingId', onDelete: 'CASCADE' });
Payment.belongsTo(Booking, { foreignKey: 'bookingId' });

module.exports = {
  sequelize,
  Sequelize,
  User,
  DiagnosticCentre,
  DiagnosticTest,
  Booking,
  Payment,
  WebhookEvent,
};

const { DataTypes } = require('sequelize');

// `status` is the single source of truth for a booking's lifecycle and is
// only ever mutated by the payment endpoints (POST /payments and the
// webhook) -- never written directly from a generic "update booking" route,
// since that's how bookings end up CONFIRMED without an actual payment.
module.exports = (sequelize) =>
  sequelize.define(
    'Booking',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      userId: { type: DataTypes.UUID, allowNull: false, field: 'user_id' },
      testId: { type: DataTypes.UUID, allowNull: false, field: 'test_id' },
      centreId: { type: DataTypes.UUID, allowNull: false, field: 'centre_id' },
      appointmentAt: { type: DataTypes.DATE, allowNull: false, field: 'appointment_at' },
      amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      status: {
        type: DataTypes.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
    },
    {
      tableName: 'bookings',
      underscored: true,
    }
  );

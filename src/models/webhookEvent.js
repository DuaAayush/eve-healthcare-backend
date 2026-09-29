const { DataTypes } = require('sequelize');

// Idempotency ledger for the payment webhook. `eventId` carries a unique DB
// constraint: the (simulated) payment provider's delivery id, including
// retries of the exact same event. A repeated eventId means a duplicate
// delivery, and inserting into this table is what makes that duplicate a
// safe no-op instead of re-applying a booking state transition.
module.exports = (sequelize) =>
  sequelize.define(
    'WebhookEvent',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      eventId: { type: DataTypes.STRING, allowNull: false, unique: true, field: 'event_id' },
      payload: { type: DataTypes.JSONB, allowNull: false },
      bookingId: { type: DataTypes.UUID, allowNull: true, field: 'booking_id' },
    },
    {
      tableName: 'webhook_events',
      underscored: true,
      updatedAt: false,
      createdAt: 'processed_at',
    }
  );

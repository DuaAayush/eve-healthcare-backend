'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('webhook_events', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      event_id: { type: Sequelize.STRING, allowNull: false, unique: true },
      payload: { type: Sequelize.JSONB, allowNull: false },
      booking_id: { type: Sequelize.UUID, allowNull: true },
      processed_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('webhook_events');
  },
};

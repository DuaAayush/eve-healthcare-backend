'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('bookings', {
      id: { type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4, primaryKey: true },
      user_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'users', key: 'id' },
        onDelete: 'CASCADE',
      },
      test_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'diagnostic_tests', key: 'id' },
      },
      centre_id: {
        type: Sequelize.UUID,
        allowNull: false,
        references: { model: 'diagnostic_centres', key: 'id' },
      },
      appointment_at: { type: Sequelize.DATE, allowNull: false },
      amount: { type: Sequelize.DECIMAL(10, 2), allowNull: false },
      status: {
        type: Sequelize.ENUM('PENDING', 'CONFIRMED', 'FAILED', 'CANCELLED'),
        allowNull: false,
        defaultValue: 'PENDING',
      },
      created_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
      updated_at: { type: Sequelize.DATE, allowNull: false, defaultValue: Sequelize.NOW },
    });
    await queryInterface.addIndex('bookings', ['user_id']);
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('bookings');
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_bookings_status";');
  },
};

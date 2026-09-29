const { DataTypes } = require('sequelize');

module.exports = (sequelize) =>
  sequelize.define(
    'DiagnosticTest',
    {
      id: { type: DataTypes.UUID, defaultValue: DataTypes.UUIDV4, primaryKey: true },
      name: { type: DataTypes.STRING, allowNull: false },
      price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
      centreId: { type: DataTypes.UUID, allowNull: false, field: 'centre_id' },
    },
    {
      tableName: 'diagnostic_tests',
      underscored: true,
    }
  );

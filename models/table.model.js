// models/table.model.js
// מודל "שולחן" (Table) — שולחן פיזי במסעדה.

const { DataTypes } = require('sequelize');

// הסטטוסים האפשריים של שולחן: פנוי / מוזמן / תפוס.
const TABLE_STATUSES = ['free', 'reserved', 'occupied'];

module.exports = (sequelize) => {
  const Table = sequelize.define(
    'Table',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      number: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true, // אין שני שולחנות עם אותו מספר
        validate: {
          min: { args: [1], msg: 'Table number must be at least 1' },
        },
      },
      seats: {
        type: DataTypes.INTEGER,
        allowNull: false,
        validate: {
          min: { args: [1], msg: 'A table must have at least 1 seat' },
        },
      },
      status: {
        type: DataTypes.ENUM(...TABLE_STATUSES),
        allowNull: false,
        defaultValue: 'free',
        validate: {
          isIn: {
            args: [TABLE_STATUSES],
            msg: `Status must be one of: ${TABLE_STATUSES.join(', ')}`,
          },
        },
      },
    },
    {
      tableName: 'tables',
      timestamps: true,
    }
  );

  return Table;
};

module.exports.TABLE_STATUSES = TABLE_STATUSES;

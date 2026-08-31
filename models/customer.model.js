// models/customer.model.js
// מודל "לקוח" (Customer) — לקוח שיושב במסעדה, משובץ לשולחן.
// השדה tableId (מפתח זר) יתווסף אוטומטית דרך ה-association ב-index.js.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Customer = sequelize.define(
    'Customer',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Customer name cannot be empty' },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true, // טלפון הוא שדה רשות
      },
    },
    {
      tableName: 'customers',
      timestamps: true,
    }
  );

  return Customer;
};

// models/reservation.model.js
// מודל "הזמנת שולחן" (Reservation) — הזמנה מראש של שולחן ע"י לקוח.
// לקוחות יכולים ליצור הזמנה מהאתר הציבורי (בלי התחברות).

const { DataTypes } = require('sequelize');

// סטטוסי הזמנה: ממתינה / הושבה / בוטלה.
const RESERVATION_STATUSES = ['pending', 'seated', 'cancelled'];

module.exports = (sequelize) => {
  const Reservation = sequelize.define(
    'Reservation',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      customerName: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: {
          notEmpty: { msg: 'Reservation name cannot be empty' },
        },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      partySize: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 2,
        validate: {
          min: { args: [1], msg: 'Party size must be at least 1' },
        },
      },
      reservationTime: {
        type: DataTypes.DATE,
        allowNull: false,
        validate: {
          isDate: { msg: 'A valid reservation date/time is required' },
        },
      },
      status: {
        type: DataTypes.ENUM(...RESERVATION_STATUSES),
        allowNull: false,
        defaultValue: 'pending',
        validate: {
          isIn: {
            args: [RESERVATION_STATUSES],
            msg: `Status must be one of: ${RESERVATION_STATUSES.join(', ')}`,
          },
        },
      },
    },
    {
      tableName: 'reservations',
      timestamps: true,
    }
  );

  return Reservation;
};

module.exports.RESERVATION_STATUSES = RESERVATION_STATUSES;

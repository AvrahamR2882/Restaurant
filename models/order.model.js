// models/order.model.js
// מודל "הזמנה" (Order) — הזמנת אוכל של שולחן (חשבון פתוח).
// מפתחות זרים: tableId (חובה), customerId (רשות) — יתווספו דרך associations.

const { DataTypes } = require('sequelize');

// סטטוסי הזמנה: פתוחה / סגורה (שולמה) / בוטלה.
const ORDER_STATUSES = ['open', 'closed', 'cancelled'];

module.exports = (sequelize) => {
  const Order = sequelize.define(
    'Order',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      status: {
        type: DataTypes.ENUM(...ORDER_STATUSES),
        allowNull: false,
        defaultValue: 'open',
        validate: {
          isIn: {
            args: [ORDER_STATUSES],
            msg: `Status must be one of: ${ORDER_STATUSES.join(', ')}`,
          },
        },
      },
      openedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW, // נקבע אוטומטית בזמן היצירה
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: true, // מתמלא רק כשההזמנה נסגרת
      },
    },
    {
      tableName: 'orders',
      timestamps: true,
    }
  );

  return Order;
};

module.exports.ORDER_STATUSES = ORDER_STATUSES;

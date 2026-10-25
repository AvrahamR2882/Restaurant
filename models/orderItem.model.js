// models/orderItem.model.js
// מודל "פריט בהזמנה" (OrderItem) — טבלת הקישור בין הזמנה למנה.
// זו טבלת "many-to-many" עם נתונים נוספים (כמות + מחיר בזמן ההזמנה).
// למה priceAtOrder? כדי לשמור "צילום" של המחיר — אם מחיר המנה ישתנה בעתיד,
// החשבון הישן לא ישתנה. זו פרקטיקה מקצועית.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OrderItem = sequelize.define(
    'OrderItem',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      quantity: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 1,
        validate: {
          min: { args: [1], msg: 'Quantity must be at least 1' },
        },
      },
      priceAtOrder: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          min: { args: [0], msg: 'Price cannot be negative' },
        },
      },
      notes: {
        // הערת הכנה למטבח: "בלי בצל", "מדיום", "ללא גלוטן".
        // ההערה היא חלק מזהות השורה — שתי מנות זהות עם הערות שונות
        // הן שתי שורות נפרדות בחשבון, ולא שורה אחת בכמות 2.
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      tableName: 'order_items',
      timestamps: true,
    }
  );

  return OrderItem;
};

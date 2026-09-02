// models/dayClosure.model.js
// "סגירת יום" — רשומת ארכיון אחת לכל יום עסקים שנסגר.
//
// הרעיון: במקום למחוק נתונים בסוף היום, כל הזמנה/לקוח/הזמנת-שולחן שהסתיימו
// מקבלים שיוך (dayClosureId) לרשומה הזו. מרגע השיוך הם כבר לא מוצגים בדשבורד —
// אבל נשארים ב-DB לחלוטין, ומשמשים לחישוב המאזן והסטטיסטיקה.
// זהו "ארכוב רך" (soft archive), לא מחיקה.

const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DayClosure = sequelize.define(
    'DayClosure',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      closedAt: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: DataTypes.NOW,
      },
      closedBy: {
        type: DataTypes.STRING, // שם המשתמש שביצע את הסגירה
        allowNull: true,
      },
      // סיכומי היום — נשמרים כ"צילום מצב" כדי שדוח היסטורי לא ישתנה בדיעבד.
      ordersCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      cancelledCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      itemsCount: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      revenue: {
        type: DataTypes.FLOAT,
        allowNull: false,
        defaultValue: 0,
      },
    },
    {
      tableName: 'day_closures',
      timestamps: true,
    }
  );

  return DayClosure;
};

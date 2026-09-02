// models/dish.model.js
// מודל "מנה" (Dish) — פריט בתפריט המסעדה.
// כל מודל מיוצא כפונקציה שמקבלת את מופע ה-sequelize ומגדירה את הטבלה.

const { DataTypes } = require('sequelize');

// הקטגוריות המותרות למנה. שמירה כמערך אחד מונעת כפילויות בקוד.
const DISH_CATEGORIES = ['starter', 'main', 'drink', 'dessert'];

module.exports = (sequelize) => {
  const Dish = sequelize.define(
    'Dish',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true, // אין שתי מנות עם אותו שם
        validate: {
          notEmpty: { msg: 'Dish name cannot be empty' },
        },
      },
      description: {
        type: DataTypes.TEXT, // תיאור המנה שמוצג בתפריט מתחת לשם
        allowNull: true,
      },
      price: {
        type: DataTypes.FLOAT,
        allowNull: false,
        validate: {
          isFloat: { msg: 'Price must be a number' },
          min: { args: [0], msg: 'Price cannot be negative' },
        },
      },
      category: {
        type: DataTypes.ENUM(...DISH_CATEGORIES),
        allowNull: false,
        validate: {
          isIn: {
            args: [DISH_CATEGORIES],
            msg: `Category must be one of: ${DISH_CATEGORIES.join(', ')}`,
          },
        },
      },
      available: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: true, // מנה זמינה כברירת מחדל
      },
    },
    {
      tableName: 'dishes',
      timestamps: true, // מוסיף אוטומטית createdAt / updatedAt
    }
  );

  return Dish;
};

// מייצאים גם את רשימת הקטגוריות לשימוש חוזר (למשל בוולידציה של הבקשה).
module.exports.DISH_CATEGORIES = DISH_CATEGORIES;

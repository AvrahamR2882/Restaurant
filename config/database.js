// config/database.js
// יוצר מופע יחיד (single instance) של Sequelize שמחובר לקובץ SQLite.
// כל המודלים והשאילתות בפרויקט משתמשים במופע הזה.

const { Sequelize } = require('sequelize');
require('dotenv').config();

// נתיב קובץ ה-DB נשלף מ-.env (עם ברירת מחדל אם לא הוגדר).
const storage = process.env.DB_STORAGE || './database.sqlite';

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage,
  // logging=false מבטל את הדפסת כל שאילתת SQL לקונסול (נקי יותר).
  // בזמן פיתוח אפשר לשנות ל-console.log כדי לראות את ה-SQL שנוצר.
  logging: false,
});

module.exports = sequelize;

// config/database.js
// יוצר מופע יחיד (single instance) של Sequelize. כל המודלים והשאילתות משתמשים בו.
//
// הפרויקט תומך בשני מסדי נתונים, והבחירה אוטומטית לפי הסביבה:
//
//   בענן    — אם מוגדר DATABASE_URL, מתחברים ל-PostgreSQL.
//             נדרש כי בשירותי אירוח הדיסק זמני, וקובץ SQLite היה נמחק בכל הפעלה.
//   מקומית  — אין DATABASE_URL, ולכן עובדים עם קובץ SQLite.
//             כך אפשר להריץ את הפרויקט מיד, בלי להתקין שום מסד נתונים.
//
// זהו היתרון המרכזי של ORM: המודלים, ה-controllers והשאילתות נשארים זהים —
// רק ההגדרה כאן משתנה.

const { Sequelize } = require('sequelize');
require('dotenv').config();

const sequelize = process.env.DATABASE_URL
  ? new Sequelize(process.env.DATABASE_URL, {
      dialect: 'postgres',
      logging: false,
      dialectOptions: {
        // ספקי ענן מחייבים חיבור מוצפן. rejectUnauthorized:false נדרש
        // כי התעודה שלהם חתומה פנימית ולא ע"י רשות אישורים ציבורית.
        ssl: { require: true, rejectUnauthorized: false },
      },
    })
  : new Sequelize({
      dialect: 'sqlite',
      storage: process.env.DB_STORAGE || './database.sqlite',
      // logging=false מבטל את הדפסת כל שאילתת SQL לקונסול (נקי יותר).
      // בזמן פיתוח אפשר לשנות ל-console.log כדי לראות את ה-SQL שנוצר.
      logging: false,
    });

module.exports = sequelize;

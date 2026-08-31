// models/user.model.js
// מודל "משתמש" (User) — עובד המערכת שמתחבר (מנהל או מלצר).
// כאן מתבצעת הצפנת הסיסמה עם bcrypt — הסיסמה עצמה לעולם לא נשמרת.

const { DataTypes } = require('sequelize');
const bcrypt = require('bcrypt');

// התפקידים המותרים במערכת.
const USER_ROLES = ['manager', 'waiter'];
// כמה "סבבי ערבול" bcrypt מבצע — 10 זה איזון טוב בין אבטחה למהירות.
const SALT_ROUNDS = 10;

module.exports = (sequelize) => {
  const User = sequelize.define(
    'User',
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      username: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          notEmpty: { msg: 'Username cannot be empty' },
        },
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
        validate: {
          isEmail: { msg: 'A valid email is required' },
        },
      },
      // שדה וירטואלי (VIRTUAL) — לא נשמר ב-DB. מקבל את הסיסמה הגולמית מהבקשה,
      // וה-hook למטה מערבל אותה אל passwordHash.
      password: {
        type: DataTypes.VIRTUAL,
        validate: {
          len: { args: [6, 100], msg: 'Password must be at least 6 characters' },
        },
      },
      // כאן נשמר ה-hash בלבד — לעולם לא הסיסמה עצמה.
      passwordHash: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      role: {
        type: DataTypes.ENUM(...USER_ROLES),
        allowNull: false,
        defaultValue: 'waiter',
        validate: {
          isIn: {
            args: [USER_ROLES],
            msg: `Role must be one of: ${USER_ROLES.join(', ')}`,
          },
        },
      },
    },
    {
      tableName: 'users',
      timestamps: true,
      hooks: {
        // רץ לפני הוולידציה — מערבל את הסיסמה כך ש-passwordHash יהיה מלא
        // בזמן שהוולידציה (allowNull:false) בודקת אותו.
        beforeValidate: async (user) => {
          if (user.password) {
            user.passwordHash = await bcrypt.hash(user.password, SALT_ROUNDS);
          }
        },
      },
    }
  );

  // מתודה על כל משתמש — משווה סיסמה גולמית ל-hash השמור. מחזירה true/false.
  User.prototype.validatePassword = function (plainPassword) {
    return bcrypt.compare(plainPassword, this.passwordHash);
  };

  // כשממירים משתמש ל-JSON (בתגובה ללקוח) — מסירים את ה-hash. אף פעם לא חושפים אותו.
  User.prototype.toJSON = function () {
    const values = { ...this.get() };
    delete values.passwordHash;
    delete values.password;
    return values;
  };

  return User;
};

module.exports.USER_ROLES = USER_ROLES;

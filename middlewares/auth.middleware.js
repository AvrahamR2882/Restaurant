// middlewares/auth.middleware.js
// שני שומרים (guards) לאבטחת נתיבים:
//   verifyToken — Authentication: "מי אתה?" — מוודא שיש טוקן JWT תקין.
//   authorize   — Authorization:  "מה מותר לך?" — מוודא שיש לך את התפקיד הנדרש.

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError, asyncHandler } = require('./errorHandler');

// ---- אימות (Authentication) ----
// בודק את הכותרת Authorization: "Bearer <token>", מאמת את הטוקן,
// טוען את המשתמש ומצרף אותו ל-req.user לשימוש בהמשך.
exports.verifyToken = asyncHandler(async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    throw new AppError(401, 'Authentication required: no token provided');
  }

  const token = authHeader.split(' ')[1];

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch (err) {
    // טוקן פגום / פג תוקף / חתימה לא תקינה
    throw new AppError(401, 'Invalid or expired token');
  }

  // מוודאים שהמשתמש עדיין קיים (אולי נמחק אחרי שהטוקן הונפק)
  const user = await User.findByPk(payload.id);
  if (!user) {
    throw new AppError(401, 'The user for this token no longer exists');
  }

  req.user = user; // זמין מעכשיו בכל controller בשרשרת
  next();
});

// ---- הרשאות (Authorization) ----
// פונקציה שמחזירה middleware. שימוש: authorize('manager') או authorize('manager','waiter').
exports.authorize = (...allowedRoles) => {
  return (req, res, next) => {
    // חייב לרוץ אחרי verifyToken (שמילא את req.user)
    if (!req.user) {
      return next(new AppError(401, 'Authentication required'));
    }
    if (!allowedRoles.includes(req.user.role)) {
      return next(
        new AppError(403, 'You do not have permission to perform this action')
      );
    }
    next();
  };
};

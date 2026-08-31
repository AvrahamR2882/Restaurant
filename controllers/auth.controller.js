// controllers/auth.controller.js
// לוגיקת האימות: הרשמה, התחברות, ושליפת המשתמש המחובר.

const jwt = require('jsonwebtoken');
const { User } = require('../models');
const { AppError, asyncHandler } = require('../middlewares/errorHandler');

// יוצר JWT חתום עם מזהה המשתמש והתפקיד שלו (payload).
// הטוקן נחתם עם הסוד מ-.env ופג אחרי הזמן שהוגדר.
const signToken = (user) =>
  jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '12h' }
  );

// POST /api/auth/register — יצירת משתמש חדש (מנהל בלבד — ההגנה תתווסף בשלב 5)
exports.register = asyncHandler(async (req, res) => {
  const { username, email, password, role } = req.body;

  // ה-hook במודל מערבל את הסיסמה אוטומטית; הוולידציות רצות ומחזירות 400/409 בשגיאה.
  const user = await User.create({ username, email, password, role });

  // toJSON מסיר את ה-hash אוטומטית מהתגובה.
  res.status(201).json({ success: true, data: user });
});

// POST /api/auth/login — התחברות; מחזיר טוקן
exports.login = asyncHandler(async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    throw new AppError(400, 'Username and password are required');
  }

  const user = await User.findOne({ where: { username } });

  // הודעה זהה למשתמש-לא-קיים ולסיסמה-שגויה — כדי לא לחשוף אילו שמות משתמש קיימים.
  if (!user || !(await user.validatePassword(password))) {
    throw new AppError(401, 'Invalid username or password');
  }

  res.status(200).json({
    success: true,
    data: user,
    token: signToken(user),
  });
});

// GET /api/auth/me — פרטי המשתמש המחובר (רץ אחרי verifyToken)
exports.me = asyncHandler(async (req, res) => {
  res.status(200).json({ success: true, data: req.user });
});

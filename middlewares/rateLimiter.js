// middlewares/rateLimiter.js
// הגנה מפני הצפת בקשות (DoS / brute-force) — מגביל כמה בקשות מותר מאותו IP בחלון זמן.

const rateLimit = require('express-rate-limit');

// מגביל כללי — לכל בקשות ה-API.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // חלון של 15 דקות
  max: 100, // עד 100 בקשות לכל IP בחלון
  standardHeaders: true, // מוסיף כותרות RateLimit-* לתגובה
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    }),
});

// מגביל מחמיר — לנתיבי התחברות/הרשמה, נגד ניחוש סיסמאות (brute-force).
const authLimiter = rateLimit({
  windowMs: 10 * 60 * 1000, // חלון של 10 דקות
  max: 10, // עד 10 ניסיונות בלבד
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many authentication attempts. Please try again later.',
    }),
});

module.exports = { apiLimiter, authLimiter };

// middlewares/rateLimiter.js
// הגנה מפני הצפת בקשות (DoS / brute-force) — מגביל כמה בקשות מותר מאותו IP בחלון זמן.

const rateLimit = require('express-rate-limit');

// מגביל כללי — לכל בקשות ה-API.
// המכסה מכוילת לשימוש אמיתי: פאנל הניהול מבצע כמה בקשות לכל פעולה (רענון
// הזמנות/שולחנות אחרי כל שינוי), ומשמרת מלאה יכולה להגיע למאות בקשות.
// 1000 בחלון של 15 דקות (~בקשה בשנייה) עדיין חוסם הצפה, בלי לפגוע בעבודה שוטפת.
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // חלון של 15 דקות
  max: 1000, // עד 1000 בקשות לכל IP בחלון
  standardHeaders: true, // מוסיף כותרות RateLimit-* לתגובה
  legacyHeaders: false,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many requests. Please try again later.',
    }),
});

// מגביל מחמיר — חל רק על ניסיונות התחברות (login), נגד ניחוש סיסמאות (brute-force).
// לא חל על /me או /users כדי לא לחסום שימוש רגיל בפאנל.
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // חלון של 15 דקות
  max: 20, // עד 20 ניסיונות התחברות בחלון
  standardHeaders: true,
  legacyHeaders: false,
  // סופר רק בקשות שנכשלו — התחברות מוצלחת לא נספרת (skipSuccessfulRequests).
  skipSuccessfulRequests: true,
  handler: (req, res) =>
    res.status(429).json({
      success: false,
      message: 'Too many login attempts. Please try again in a few minutes.',
    }),
});

module.exports = { apiLimiter, authLimiter };

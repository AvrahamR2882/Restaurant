// middlewares/errorHandler.js
// טיפול מרוכז בשגיאות — כדי שהשרת לעולם לא יקרוס, ותמיד יחזיר סטטוס HTTP מדויק.
// מכיל 4 כלים שכל הפרויקט משתמש בהם:
//   1. AppError      — מחלקת שגיאה "עסקית" עם קוד סטטוס (למשל 404, 409).
//   2. asyncHandler  — עוטף פונקציית controller ותופס שגיאות async אוטומטית.
//   3. notFound      — מטפל בנתיב שלא קיים (404).
//   4. errorHandler  — ה-middleware הסופי שממיר כל שגיאה לתגובת JSON מסודרת.

// ---- 1. מחלקת שגיאה עם קוד סטטוס ----
class AppError extends Error {
  constructor(statusCode, message) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true; // שגיאה "צפויה" (לא באג) — בטוח להציג את ההודעה
  }
}

// ---- 2. עוטף async — מעביר כל שגיאה ל-next() במקום try/catch בכל controller ----
const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

// ---- 3. נתיב לא קיים → 404 ----
const notFound = (req, res, next) => {
  next(new AppError(404, `Route not found: ${req.method} ${req.originalUrl}`));
};

// ---- 4. ה-middleware המרכזי לטיפול בשגיאות ----
// חייב 4 פרמטרים (err, req, res, next) כדי ש-Express יזהה אותו כ-error handler.
const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal server error';
  let details;

  // שגיאות ולידציה של Sequelize → 400 (בקשה שגויה)
  if (err.name === 'SequelizeValidationError') {
    statusCode = 400;
    message = 'Validation error';
    details = err.errors.map((e) => e.message);
  }

  // הפרת אילוץ ייחודיות (שם מנה שכבר קיים וכו') → 409 (קונפליקט)
  else if (err.name === 'SequelizeUniqueConstraintError') {
    statusCode = 409;
    message = 'Resource already exists';
    details = err.errors.map((e) => e.message);
  }

  // הפרת מפתח זר (הפניה לרשומה שלא קיימת) → 400
  else if (err.name === 'SequelizeForeignKeyConstraintError') {
    statusCode = 400;
    message = 'Invalid reference to a related resource';
  }

  // שגיאה לא צפויה (באג) — נרשום ללוג לצורך דיבוג, בלי לחשוף פרטים ללקוח
  if (statusCode === 500) {
    console.error('💥 Unexpected error:', err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(details && { details }),
  });
};

module.exports = { AppError, asyncHandler, notFound, errorHandler };
